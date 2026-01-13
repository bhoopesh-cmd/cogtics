/**
 * Contract Readiness Compute Processor
 * 
 * Computes readiness status for a contract version.
 */
import type { Logger } from 'pino';
import type { Kysely } from 'kysely';
import type { Database } from '@cogtics/db';
import type { ReadinessComputeJobPayload } from '@cogtics/schemas';
import { createReadinessId } from '@cogtics/schemas';
import { contracts } from '@cogtics/utils';

interface JobResult {
  success: boolean;
  message: string;
  data?: unknown;
  processingTimeMs?: number;
}

/**
 * Process readiness computation job
 */
export async function processReadinessComputeJob(
  payload: ReadinessComputeJobPayload,
  logger: Logger,
  db: Kysely<Database>
): Promise<JobResult> {
  const { tenantId, snapshotId, contractVersionId } = payload;
  const startTime = Date.now();

  logger.info({ contractVersionId }, 'Starting readiness computation');

  try {
    // Load all terms for this contract version
    const terms = await db
      .selectFrom('contract_terms')
      .selectAll()
      .where('contract_version_id', '=', contractVersionId)
      .execute();

    // Get contract to determine type (if available)
    const contractVersion = await db
      .selectFrom('contract_versions')
      .innerJoin('contracts', 'contracts.id', 'contract_versions.contract_id')
      .select([
        'contract_versions.id',
        'contracts.metadata_json',
      ])
      .where('contract_versions.id', '=', contractVersionId)
      .executeTakeFirst();

    // Extract contract type from metadata if available
    let contractType: string | undefined;
    if (contractVersion?.metadata_json) {
      const metadata = contractVersion.metadata_json as Record<string, unknown>;
      contractType = metadata.type as string | undefined;
    }

    // Convert DB terms to ExtractedTerm format
    const extractedTerms: contracts.ExtractedTerm[] = terms.map(term => ({
      termType: term.term_type as contracts.TermType,
      value: term.value_json,
      confidence: (term.confidence || 0) / 100, // Convert from 0-100 to 0-1
      sourceClauseIndex: 0, // Not needed for readiness computation
      extractionMethod: (term.extraction_method || 'pattern') as contracts.ExtractionMethod,
      matchedText: term.matched_text || '',
      startOffset: term.start_offset || 0,
      endOffset: term.end_offset || 0,
    }));

    // Compute readiness
    const result = contracts.computeReadiness(extractedTerms, contractType);

    logger.info(
      { contractVersionId, status: result.status, confidence: result.confidenceScore },
      'Readiness computed'
    );

    // Check if readiness record exists
    const existingReadiness = await db
      .selectFrom('contract_readiness')
      .select('id')
      .where('contract_version_id', '=', contractVersionId)
      .executeTakeFirst();

    if (existingReadiness) {
      // Update existing record
      await db
        .updateTable('contract_readiness')
        .set({
          readiness_status: result.status,
          confidence_score: Math.round(result.confidenceScore * 100),
          required_terms_count: result.requiredTermsCount,
          extracted_terms_count: result.extractedTermsCount,
          missing_terms_json: result.missingTerms,
          low_confidence_terms_json: result.lowConfidenceTerms,
          updated_at: new Date(),
        })
        .where('id', '=', existingReadiness.id)
        .execute();
    } else {
      // Insert new record
      await db
        .insertInto('contract_readiness')
        .values({
          id: createReadinessId(),
          tenant_id: tenantId,
          snapshot_id: snapshotId,
          contract_version_id: contractVersionId,
          readiness_status: result.status,
          confidence_score: Math.round(result.confidenceScore * 100),
          required_terms_count: result.requiredTermsCount,
          extracted_terms_count: result.extractedTermsCount,
          missing_terms_json: result.missingTerms,
          low_confidence_terms_json: result.lowConfidenceTerms,
          reviewed_by: null,
          reviewed_at: null,
        })
        .execute();
    }

    // Log audit event
    await db
      .insertInto('audit_logs')
      .values({
        id: `aud_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`,
        tenant_id: tenantId,
        actor_user_id: null,
        action: 'contract.readiness.computed',
        resource: contractVersionId,
        metadata_json: {
          status: result.status,
          confidenceScore: result.confidenceScore,
          missingTerms: result.missingTerms,
          lowConfidenceTerms: result.lowConfidenceTerms.length,
        },
        request_id: null,
      })
      .execute();

    logger.info(
      { contractVersionId, status: result.status },
      'Readiness computation completed'
    );

    return {
      success: true,
      message: `Readiness status: ${result.status}`,
      data: {
        status: result.status,
        confidenceScore: result.confidenceScore,
        requiredTermsCount: result.requiredTermsCount,
        extractedTermsCount: result.extractedTermsCount,
        missingTerms: result.missingTerms,
        lowConfidenceCount: result.lowConfidenceTerms.length,
      },
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ err: error, contractVersionId }, 'Readiness computation failed');

    return {
      success: false,
      message,
      processingTimeMs: Date.now() - startTime,
    };
  }
}
