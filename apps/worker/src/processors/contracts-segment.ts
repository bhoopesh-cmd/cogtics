/**
 * Contract Clause Segment Processor
 * 
 * Segments extracted text into clauses.
 */
import type { Logger } from 'pino';
import type { Kysely } from 'kysely';
import type { Database } from '@cogtics/db';
import type { ClauseSegmentJobPayload } from '@cogtics/schemas';
import { createClauseId } from '@cogtics/schemas';
import { contracts } from '@cogtics/utils';
import { Queue } from 'bullmq';

interface JobResult {
  success: boolean;
  message: string;
  data?: unknown;
  processingTimeMs?: number;
}

/**
 * Process clause segmentation job
 */
export async function processClauseSegmentJob(
  payload: ClauseSegmentJobPayload,
  logger: Logger,
  db: Kysely<Database>,
  queues: Map<string, Queue>
): Promise<JobResult> {
  const { tenantId, snapshotId, documentId, contractVersionId } = payload;
  const startTime = Date.now();

  logger.info({ documentId, contractVersionId }, 'Starting clause segmentation');

  try {
    // Load document with extracted text
    const document = await db
      .selectFrom('contract_documents')
      .selectAll()
      .where('id', '=', documentId)
      .executeTakeFirst();

    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    if (!document.extracted_text) {
      throw new Error(`Document has no extracted text: ${documentId}`);
    }

    // Find page breaks in the text
    const pageBreaks = contracts.findPageBreaks(document.extracted_text);

    // Segment the text into clauses
    const segments = contracts.segmentClauses(document.extracted_text, pageBreaks);

    logger.info({ documentId, clauseCount: segments.length }, 'Text segmented into clauses');

    // Delete existing clauses for this document (in case of reprocessing)
    await db
      .deleteFrom('contract_clauses')
      .where('document_id', '=', documentId)
      .execute();

    // Insert clause records
    if (segments.length > 0) {
      // Create a map for parent clause IDs
      const clauseIdMap = new Map<number, string>();
      
      for (const segment of segments) {
        const clauseId = createClauseId();
        clauseIdMap.set(segment.sequenceNumber, clauseId);
      }

      const clauseRecords = segments.map(segment => ({
        id: clauseIdMap.get(segment.sequenceNumber)!,
        tenant_id: tenantId,
        snapshot_id: snapshotId,
        contract_version_id: contractVersionId,
        document_id: documentId,
        clause_type: segment.type as 'heading' | 'section' | 'paragraph' | 'list_item',
        clause_label: segment.label,
        text: segment.text,
        start_offset: segment.startOffset,
        end_offset: segment.endOffset,
        page_number: segment.pageNumber,
        sequence_number: segment.sequenceNumber,
        parent_clause_id: segment.parentIndex !== null 
          ? clauseIdMap.get(segment.parentIndex) ?? null 
          : null,
      }));

      // Insert in batches to handle large documents
      const batchSize = 100;
      for (let i = 0; i < clauseRecords.length; i += batchSize) {
        const batch = clauseRecords.slice(i, i + batchSize);
        await db
          .insertInto('contract_clauses')
          .values(batch)
          .execute();
      }
    }

    // Enqueue term extraction job
    const termQueue = queues.get('contracts.terms.extract');
    if (termQueue) {
      await termQueue.add('extract', {
        payload: {
          type: 'contracts.terms.extract',
          tenantId,
          snapshotId,
          documentId,
          contractVersionId,
        },
      });
      logger.info({ documentId, contractVersionId }, 'Enqueued term extraction job');
    }

    logger.info(
      { documentId, clauseCount: segments.length },
      'Clause segmentation completed'
    );

    return {
      success: true,
      message: `Segmented into ${segments.length} clauses`,
      data: {
        clauseCount: segments.length,
        headingCount: segments.filter(s => s.type === 'heading').length,
        sectionCount: segments.filter(s => s.type === 'section').length,
        paragraphCount: segments.filter(s => s.type === 'paragraph').length,
        listItemCount: segments.filter(s => s.type === 'list_item').length,
      },
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ err: error, documentId }, 'Clause segmentation failed');

    return {
      success: false,
      message,
      processingTimeMs: Date.now() - startTime,
    };
  }
}
