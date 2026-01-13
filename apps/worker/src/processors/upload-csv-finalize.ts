/**
 * CSV Finalize Processor
 * 
 * Aggregates parse stats and optionally triggers ingestion pipeline.
 */
import type { Logger } from 'pino';
import type { Kysely } from 'kysely';
import type { Database } from '@cogtics/db';
import { type CsvFinalizeJobPayload } from '@cogtics/schemas';

interface JobResult {
  success: boolean;
  message: string;
  data?: unknown;
  processingTimeMs?: number;
}

interface JobQueue {
  add(name: string, data: unknown): Promise<void>;
}

/**
 * Process CSV finalize job
 */
export async function processCsvFinalizeJob(
  payload: CsvFinalizeJobPayload,
  logger: Logger,
  db: Kysely<Database>,
  jobQueue?: JobQueue
): Promise<JobResult> {
  const { tenantId, uploadId, parseRunId, triggerIngestion } = payload;
  const startTime = Date.now();

  logger.info({ uploadId, parseRunId }, 'Starting CSV finalize');

  try {
    // Get parse run
    const parseRun = await db
      .selectFrom('upload_parse_runs')
      .selectAll()
      .where('id', '=', parseRunId)
      .executeTakeFirst();

    if (!parseRun) {
      throw new Error(`Parse run not found: ${parseRunId}`);
    }

    // Get upload record
    const upload = await db
      .selectFrom('uploads')
      .selectAll()
      .where('id', '=', uploadId)
      .executeTakeFirst();

    if (!upload) {
      throw new Error(`Upload not found: ${uploadId}`);
    }

    // Get aggregate stats from all parse runs for this upload
    const parseRuns = await db
      .selectFrom('upload_parse_runs')
      .selectAll()
      .where('upload_id', '=', uploadId)
      .execute();

    let totalRows = 0;
    let totalValid = 0;
    let totalErrors = 0;

    for (const run of parseRuns) {
      const stats = run.stats_json as Record<string, number> | null;
      if (stats) {
        totalRows += stats.total_rows ?? 0;
        totalValid += stats.valid_rows ?? 0;
        totalErrors += stats.error_rows ?? 0;
      }
    }

    // Count actual parse errors
    const { count: errorCount } = await db
      .selectFrom('upload_parse_errors')
      .select(db.fn.count('id').as('count'))
      .where('upload_id', '=', uploadId)
      .executeTakeFirstOrThrow();

    // Determine final status
    const allFailed = totalValid === 0 && totalRows > 0;
    const hasErrors = totalErrors > 0;
    const finalStatus = allFailed ? 'failed' : 'completed';

    // Update upload with final stats
    await db
      .updateTable('uploads')
      .set({
        status: finalStatus,
        total_rows: totalRows,
        valid_rows: totalValid,
        error_count: Number(errorCount),
        completed_at: new Date(),
      })
      .where('id', '=', uploadId)
      .execute();

    // Trigger ingestion pipeline if requested and there are valid rows
    if (triggerIngestion && totalValid > 0 && jobQueue) {
      logger.info({ uploadId, validRows: totalValid }, 'Triggering ingestion pipeline');
      
      // Queue ingestion job for the raw_batches created
      await jobQueue.add('ingest.load', {
        type: 'ingest.load',
        tenantId,
        sourceSystem: 'manual_upload',
        runId: parseRunId,
      });
    }

    logger.info(
      { uploadId, finalStatus, totalRows, totalValid, totalErrors },
      'CSV finalize completed'
    );

    return {
      success: true,
      message: `Upload finalized: ${totalValid}/${totalRows} valid rows`,
      data: {
        status: finalStatus,
        totalRows,
        validRows: totalValid,
        errorCount: Number(errorCount),
        ingestionTriggered: triggerIngestion && totalValid > 0,
      },
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Update upload status on error
    await db
      .updateTable('uploads')
      .set({
        status: 'failed',
        error_code: 'FINALIZE_FAILED',
        error_message: message,
      })
      .where('id', '=', uploadId)
      .execute();

    logger.error({ err: error, uploadId, parseRunId }, 'CSV finalize failed');

    return {
      success: false,
      message,
      processingTimeMs: Date.now() - startTime,
    };
  }
}
