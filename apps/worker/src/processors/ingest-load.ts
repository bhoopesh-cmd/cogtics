/**
 * Ingest Load Processor
 * 
 * Reads raw batches from S3 and writes records to staging_records table.
 * This is the first stage of the ingestion pipeline.
 */
import type { Logger } from 'pino';
import type { Kysely, Database } from '@cogtics/db';
import type { IngestLoadJobPayload, JobResult } from '@cogtics/schemas';
import { createStagingRecordId, createSyncRunId } from '@cogtics/schemas';
import { createStorageClient, type StorageClient } from '@cogtics/utils';

interface IngestLoadContext {
  db: Kysely<Database>;
  logger: Logger;
  storage: StorageClient;
}

/**
 * Process ingest.load job
 */
export async function processIngestLoadJob(
  payload: IngestLoadJobPayload,
  logger: Logger,
  db: Kysely<Database>,
  providedStorage?: StorageClient
): Promise<JobResult> {
  const { tenantId, snapshotId, batchIds, connectionId } = payload;
  const startTime = Date.now();

  logger.info({ snapshotId, batchIds: batchIds.length, connectionId }, 'Starting ingest load');

  // Initialize storage client
  const storage = providedStorage ?? createStorageClient({
    endpoint: process.env.S3_ENDPOINT!,
    accessKey: process.env.S3_ACCESS_KEY!,
    secretKey: process.env.S3_SECRET_KEY!,
    bucket: process.env.S3_BUCKET!,
    region: process.env.S3_REGION ?? 'us-east-1',
  });

  const ctx: IngestLoadContext = { db, logger, storage };

  // Create sync run record
  const syncRunId = createSyncRunId();
  await db
    .insertInto('sync_runs')
    .values({
      id: syncRunId,
      tenant_id: tenantId as string,
      snapshot_id: snapshotId,
      run_type: 'load',
      status: 'running',
      records_processed: 0,
      metadata_json: { batchIds, connectionId },
    })
    .execute();

  // Update snapshot status
  await db
    .updateTable('snapshots')
    .set({ status: 'building' })
    .where('id', '=', snapshotId)
    .execute();

  try {
    let totalRecords = 0;
    let failedRecords = 0;

    // Process each batch
    for (const batchId of batchIds) {
      try {
        const result = await processBatch(ctx, tenantId as string, snapshotId, batchId);
        totalRecords += result.recordCount;
        failedRecords += result.failedCount;
      } catch (error) {
        logger.error({ batchId, error }, 'Failed to process batch');
        // Continue with other batches
      }
    }

    // Update sync run
    await db
      .updateTable('sync_runs')
      .set({
        status: 'completed',
        finished_at: new Date(),
        records_processed: totalRecords,
        metadata_json: { batchIds, connectionId, failedRecords },
      })
      .where('id', '=', syncRunId)
      .execute();

    logger.info({ totalRecords, failedRecords }, 'Ingest load completed');

    return {
      success: true,
      message: `Loaded ${totalRecords} records from ${batchIds.length} batches`,
      data: {
        snapshotId,
        syncRunId,
        batchesProcessed: batchIds.length,
        recordsLoaded: totalRecords,
        failedRecords,
      },
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    logger.error({ error }, 'Ingest load failed');

    // Update sync run
    await db
      .updateTable('sync_runs')
      .set({
        status: 'failed',
        finished_at: new Date(),
        error_code: 'LOAD_FAILED',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .where('id', '=', syncRunId)
      .execute();

    throw error;
  }
}

/**
 * Process a single batch - download from S3 and insert to staging
 */
async function processBatch(
  ctx: IngestLoadContext,
  tenantId: string,
  snapshotId: string,
  batchId: string
): Promise<{ recordCount: number; failedCount: number }> {
  // Get batch metadata
  const batch = await ctx.db
    .selectFrom('raw_batches')
    .selectAll()
    .where('id', '=', batchId)
    .executeTakeFirst();

  if (!batch) {
    throw new Error(`Batch not found: ${batchId}`);
  }

  ctx.logger.debug({ batchId, objectType: batch.object_type, s3Key: batch.s3_key }, 'Processing batch');

  // Download from S3
  const content = await ctx.storage.get(batch.s3_key);
  if (!content) {
    throw new Error(`Batch content not found in S3: ${batch.s3_key}`);
  }

  // Parse JSONL
  const lines = content.toString('utf-8').split('\n').filter((line) => line.trim());
  const records: Array<{ id: string; data: unknown }> = [];

  for (const line of lines) {
    try {
      const data = JSON.parse(line);
      const externalId = extractExternalId(data, batch.object_type);
      if (externalId) {
        records.push({ id: externalId, data });
      }
    } catch (error) {
      ctx.logger.warn({ line, error }, 'Failed to parse record line');
    }
  }

  // Insert to staging in batches
  const BATCH_SIZE = 500;
  let recordCount = 0;
  let failedCount = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const chunk = records.slice(i, i + BATCH_SIZE);
    const values = chunk.map((record) => ({
      id: createStagingRecordId() as string,
      tenant_id: tenantId,
      snapshot_id: snapshotId,
      connection_id: batch.connection_id,
      batch_id: batchId,
      object_type: batch.object_type,
      external_id: record.id,
      raw_json: record.data,
      status: 'pending' as const,
    }));

    try {
      await ctx.db
        .insertInto('staging_records')
        .values(values)
        .onConflict((oc) =>
          oc.columns(['snapshot_id', 'object_type', 'external_id']).doNothing()
        )
        .execute();

      recordCount += chunk.length;
    } catch (error) {
      ctx.logger.error({ error, batchId, chunk: i }, 'Failed to insert staging records');
      failedCount += chunk.length;
    }
  }

  ctx.logger.debug({ batchId, recordCount, failedCount }, 'Batch processed');

  return { recordCount, failedCount };
}

/**
 * Extract external ID from raw record based on object type
 */
function extractExternalId(data: unknown, objectType: string): string | null {
  if (!data || typeof data !== 'object') return null;
  
  const record = data as Record<string, unknown>;

  // Standard ID field patterns
  if (typeof record.id === 'string') return record.id;
  if (typeof record.Id === 'string') return record.Id;
  if (typeof record.ID === 'string') return record.ID;

  // Salesforce-specific
  if (objectType.startsWith('sf_') || /^[A-Z]/.test(objectType)) {
    if (typeof record.Id === 'string') return record.Id;
  }

  return null;
}

