/**
 * Contract Term Extraction Processor
 * 
 * Extracts terms from contract clauses using:
 * 1. Rules engine (fast, deterministic) - primary
 * 2. LLM fallback (GPT-4.1) - for low-confidence or missing terms
 */
import type { Logger } from 'pino';
import type { Kysely } from 'kysely';
import type { Database } from '@cogtics/db';
import type { TermExtractJobPayload } from '@cogtics/schemas';
import { createContractTermId, createReviewQueueItemId } from '@cogtics/schemas';
import { contracts, llm } from '@cogtics/utils';
import { Queue } from 'bullmq';

// Confidence thresholds
const LOW_CONFIDENCE_THRESHOLD = 0.7;
const REVIEW_REQUIRED_THRESHOLD = 0.5;

// Required terms that trigger LLM fallback if missing
const REQUIRED_TERM_TYPES: contracts.TermType[] = [
  'pricing_model',
  'billing_cadence', 
  'contract_value',
  'start_date',
  'term_length',
];

interface JobResult {
  success: boolean;
  message: string;
  data?: unknown;
  processingTimeMs?: number;
}

/**
 * Process term extraction job
 */
export async function processTermExtractJob(
  payload: TermExtractJobPayload,
  logger: Logger,
  db: Kysely<Database>,
  queues: Map<string, Queue>
): Promise<JobResult> {
  const { tenantId, snapshotId, documentId, contractVersionId } = payload;
  const startTime = Date.now();

  logger.info({ documentId, contractVersionId }, 'Starting term extraction');

  try {
    // Get existing overrides to preserve them during reprocessing
    const existingOverrides = await db
      .selectFrom('contract_terms')
      .innerJoin('contract_term_overrides', 'contract_term_overrides.term_id', 'contract_terms.id')
      .select([
        'contract_terms.term_type',
        'contract_term_overrides.id as override_id',
        'contract_term_overrides.override_value_json',
        'contract_term_overrides.original_value_json',
        'contract_term_overrides.reason',
        'contract_term_overrides.actor_user_id',
      ])
      .where('contract_terms.contract_version_id', '=', contractVersionId)
      .execute();

    const overridesByType = new Map(existingOverrides.map(o => [o.term_type, o]));
    
    if (existingOverrides.length > 0) {
      logger.info(
        { documentId, overrideCount: existingOverrides.length },
        'Preserving existing term overrides during reprocessing'
      );
    }

    // Load clauses for this document
    const clauses = await db
      .selectFrom('contract_clauses')
      .selectAll()
      .where('document_id', '=', documentId)
      .where('contract_version_id', '=', contractVersionId)
      .orderBy('sequence_number', 'asc')
      .execute();

    if (clauses.length === 0) {
      logger.warn({ documentId }, 'No clauses found for term extraction');
      
      // Try extracting directly from document text
      const document = await db
        .selectFrom('contract_documents')
        .select(['extracted_text'])
        .where('id', '=', documentId)
        .executeTakeFirst();

      if (document?.extracted_text) {
        // Delete existing terms
        await db
          .deleteFrom('contract_terms')
          .where('contract_version_id', '=', contractVersionId)
          .execute();

        const terms = contracts.extractTermsFromText(document.extracted_text);
        await insertTerms(db, tenantId, snapshotId, contractVersionId, terms, null, overridesByType, logger);
        
        // Enqueue readiness computation
        await enqueueReadinessJob(queues, tenantId, snapshotId, contractVersionId, logger);

        return {
          success: true,
          message: `Extracted ${terms.length} terms from document text`,
          data: { termCount: terms.length },
          processingTimeMs: Date.now() - startTime,
        };
      }

      return {
        success: false,
        message: 'No clauses or text available for extraction',
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Convert database clauses to ClauseSegment format
    const clauseSegments: contracts.ClauseSegment[] = clauses.map((clause, index) => ({
      type: clause.clause_type,
      label: clause.clause_label,
      text: clause.text,
      startOffset: clause.start_offset,
      endOffset: clause.end_offset,
      pageNumber: clause.page_number,
      sequenceNumber: clause.sequence_number,
      parentIndex: null, // Not needed for extraction
    }));

    // Create a map of clause index to clause ID
    const clauseIdMap = new Map<number, string>();
    clauses.forEach((clause, index) => {
      clauseIdMap.set(index, clause.id);
    });

    // Step 1: Extract terms using rules engine (fast, deterministic)
    let terms = contracts.extractTerms(clauseSegments);
    logger.info({ documentId, termCount: terms.length }, 'Rules engine extracted terms');

    // Step 2: Identify low-confidence and missing terms
    const extractedTypes = new Set(terms.map(t => t.termType));
    const lowConfidenceTerms = terms.filter(t => t.confidence < LOW_CONFIDENCE_THRESHOLD);
    const missingRequiredTerms = REQUIRED_TERM_TYPES.filter(t => !extractedTypes.has(t));

    // Step 3: LLM fallback for enhancement (if configured)
    const llmClient = llm.createContractLLM();
    
    if (llmClient && (lowConfidenceTerms.length > 0 || missingRequiredTerms.length > 0)) {
      logger.info({
        documentId,
        lowConfidenceCount: lowConfidenceTerms.length,
        missingCount: missingRequiredTerms.length,
      }, 'Invoking LLM fallback for enhancement');

      try {
        // Get document text for context
        const document = await db
          .selectFrom('contract_documents' as any)
          .select(['extracted_text', 'document_type'] as any)
          .where('id', '=', documentId as any)
          .executeTakeFirst() as { extracted_text?: string; document_type?: string } | undefined;

        const textContext = document?.extracted_text?.substring(0, 10000) || '';
        const termTypesToExtract = [
          ...lowConfidenceTerms.map(t => t.termType),
          ...missingRequiredTerms,
        ];

        // Call LLM for extraction
        const llmExtractions = await llmClient.extractTerms(
          textContext,
          termTypesToExtract as contracts.TermType[],
          { documentType: document?.document_type || undefined }
        );

        logger.info({
          documentId,
          llmExtractionCount: llmExtractions.length,
        }, 'LLM extraction completed');

        // Merge LLM extractions with rules-based terms
        terms = mergeExtractions(terms, llmExtractions, logger);
      } catch (llmError) {
        logger.warn({ err: llmError, documentId }, 'LLM fallback failed, using rules-only extraction');
      }
    }

    // Delete existing terms for this contract version (in case of reprocessing)
    // Note: Overrides are preserved via overridesByType map from earlier query
    await db
      .deleteFrom('contract_terms')
      .where('contract_version_id', '=', contractVersionId)
      .execute();

    // Insert term records (will reapply overrides)
    await insertTerms(db, tenantId, snapshotId, contractVersionId, terms, clauseIdMap, overridesByType, logger);

    // Step 4: Create review queue items for low-confidence terms
    const reviewItems = terms.filter(t => t.confidence < REVIEW_REQUIRED_THRESHOLD);
    if (reviewItems.length > 0) {
      await createReviewQueueItems(db, tenantId, snapshotId, contractVersionId, reviewItems, logger);
    }

    // Enqueue readiness computation
    await enqueueReadinessJob(queues, tenantId, snapshotId, contractVersionId, logger);

    logger.info(
      { documentId, termCount: terms.length },
      'Term extraction completed'
    );

    // Group terms by type for summary
    const termsByType = new Map<string, number>();
    for (const term of terms) {
      termsByType.set(term.termType, (termsByType.get(term.termType) || 0) + 1);
    }

    return {
      success: true,
      message: `Extracted ${terms.length} terms`,
      data: {
        termCount: terms.length,
        termsByType: Object.fromEntries(termsByType),
        averageConfidence: terms.length > 0
          ? terms.reduce((sum, t) => sum + t.confidence, 0) / terms.length
          : 0,
      },
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ err: error, documentId }, 'Term extraction failed');

    return {
      success: false,
      message,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

interface PreservedOverride {
  term_type: string;
  override_id: string;
  override_value_json: unknown;
  original_value_json: unknown;
  reason: string | null;
  actor_user_id: string;
}

async function insertTerms(
  db: Kysely<Database>,
  tenantId: string,
  snapshotId: string,
  contractVersionId: string,
  terms: contracts.ExtractedTerm[],
  clauseIdMap: Map<number, string> | null,
  overridesByType: Map<string, PreservedOverride>,
  logger: Logger
): Promise<void> {
  if (terms.length === 0) return;

  const termRecords = terms.map(term => {
    const existingOverride = overridesByType.get(term.termType);
    const termId = createContractTermId();
    
    return {
      id: termId,
      tenant_id: tenantId,
      snapshot_id: snapshotId,
      contract_version_id: contractVersionId,
      term_type: term.termType,
      value_json: term.value,
      confidence: Math.round(term.confidence * 100), // Store as 0-100
      source_clause: term.matchedText,
      source_page: null,
      source_clause_id: clauseIdMap?.get(term.sourceClauseIndex) ?? null,
      extraction_method: term.extractionMethod as 'rule' | 'pattern' | 'llm',
      is_overridden: !!existingOverride,
      override_id: existingOverride?.override_id ?? null,
      matched_text: term.matchedText,
      start_offset: term.startOffset,
      end_offset: term.endOffset,
    };
  });

  await db
    .insertInto('contract_terms')
    .values(termRecords)
    .execute();

  // Update any existing overrides to point to the new term IDs
  for (const record of termRecords) {
    if (record.override_id) {
      await db
        .updateTable('contract_term_overrides')
        .set({ 
          term_id: record.id,
          original_value_json: record.value_json, // Update with newly extracted value
        })
        .where('id', '=', record.override_id)
        .execute();
    }
  }

  const reappliedCount = termRecords.filter(r => r.is_overridden).length;
  logger.info({ 
    termCount: termRecords.length, 
    reappliedOverrides: reappliedCount 
  }, 'Terms inserted into database');
}

async function enqueueReadinessJob(
  queues: Map<string, Queue>,
  tenantId: string,
  snapshotId: string,
  contractVersionId: string,
  logger: Logger
): Promise<void> {
  const readinessQueue = queues.get('contracts.readiness.compute');
  if (readinessQueue) {
    await readinessQueue.add('compute', {
      payload: {
        type: 'contracts.readiness.compute',
        tenantId,
        snapshotId,
        contractVersionId,
      },
    });
    logger.info({ contractVersionId }, 'Enqueued readiness computation job');
  }
}

/**
 * Merge LLM extractions with rules-based terms
 * LLM can boost confidence for existing terms or fill gaps for missing terms
 */
function mergeExtractions(
  rulesTerms: contracts.ExtractedTerm[],
  llmExtractions: llm.LLMExtraction[],
  logger: Logger
): contracts.ExtractedTerm[] {
  const merged = [...rulesTerms];
  const existingTypes = new Set(rulesTerms.map(t => t.termType));

  for (const llmTerm of llmExtractions) {
    if (existingTypes.has(llmTerm.termType)) {
      // Find existing term and potentially boost confidence
      const existingIndex = merged.findIndex(t => t.termType === llmTerm.termType);
      if (existingIndex !== -1) {
        const existing = merged[existingIndex];
        
        // If LLM has higher confidence and agrees with value, boost confidence
        if (llmTerm.confidence > existing.confidence) {
          merged[existingIndex] = {
            ...existing,
            confidence: Math.min((existing.confidence + llmTerm.confidence) / 2 + 0.1, 0.99),
            extractionMethod: 'llm' as contracts.ExtractionMethod,
          };
          logger.debug({
            termType: llmTerm.termType,
            oldConfidence: existing.confidence,
            newConfidence: merged[existingIndex].confidence,
          }, 'LLM boosted term confidence');
        }
      }
    } else {
      // New term from LLM - add it
      merged.push({
        termType: llmTerm.termType,
        value: llmTerm.value,
        confidence: llmTerm.confidence,
        sourceClauseIndex: 0,
        extractionMethod: 'llm' as contracts.ExtractionMethod,
        matchedText: llmTerm.matchedText,
        startOffset: llmTerm.startOffset ?? 0,
        endOffset: llmTerm.endOffset ?? 0,
      });
      logger.debug({
        termType: llmTerm.termType,
        confidence: llmTerm.confidence,
      }, 'LLM added new term');
    }
  }

  return merged;
}

/**
 * Create review queue items for low-confidence terms
 */
async function createReviewQueueItems(
  db: Kysely<Database>,
  tenantId: string,
  snapshotId: string,
  contractVersionId: string,
  terms: contracts.ExtractedTerm[],
  logger: Logger
): Promise<void> {
  const reviewItems = terms.map(term => ({
    id: createReviewQueueItemId(),
    tenant_id: tenantId,
    snapshot_id: snapshotId,
    item_type: term.extractionMethod === 'llm' ? 'llm_extraction' as const : 'low_confidence_term' as const,
    term_id: null, // Will be linked after term insertion
    conflict_id: null,
    document_id: null,
    contract_version_id: contractVersionId,
    bundle_id: null,
    priority: term.confidence < 0.3 ? 2 : 1, // Higher priority for very low confidence
    status: 'pending' as const,
    assigned_to: null,
    resolution_json: null,
    resolved_by: null,
    resolved_at: null,
  }));

  if (reviewItems.length > 0) {
    await db
      .insertInto('review_queue' as any)
      .values(reviewItems)
      .execute();

    logger.info({ count: reviewItems.length }, 'Created review queue items for low-confidence terms');
  }
}
