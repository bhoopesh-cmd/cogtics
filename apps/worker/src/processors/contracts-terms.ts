/**
 * Contract Term Extraction Processor
 * 
 * Extracts terms from contract clauses.
 */
import type { Logger } from 'pino';
import type { Kysely } from 'kysely';
import type { Database } from '@cogtics/db';
import type { TermExtractJobPayload } from '@cogtics/schemas';
import { createContractTermId } from '@cogtics/schemas';
import { contracts } from '@cogtics/utils';
import { Queue } from 'bullmq';

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

    // Extract terms from clauses
    const terms = contracts.extractTerms(clauseSegments);

    logger.info({ documentId, termCount: terms.length }, 'Terms extracted');

    // Delete existing terms for this contract version (in case of reprocessing)
    // Note: Overrides are preserved via overridesByType map from earlier query
    await db
      .deleteFrom('contract_terms')
      .where('contract_version_id', '=', contractVersionId)
      .execute();

    // Insert term records (will reapply overrides)
    await insertTerms(db, tenantId, snapshotId, contractVersionId, terms, clauseIdMap, overridesByType, logger);

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
