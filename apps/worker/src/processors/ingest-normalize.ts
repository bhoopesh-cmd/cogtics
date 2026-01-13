/**
 * Ingest Normalize Processor
 * 
 * Reads staging_records and applies mapper functions to transform
 * raw provider data into normalized shapes.
 */
import type { Logger } from 'pino';
import type { Kysely, Database } from '@cogtics/db';
import type { IngestNormalizeJobPayload, JobResult } from '@cogtics/schemas';
import { createSyncRunId } from '@cogtics/schemas';
import {
  mapStripeRecord,
  STRIPE_TO_CANONICAL_TYPE,
  type StripeObjectType,
  mapSalesforceRecord,
  SALESFORCE_TO_CANONICAL_TYPE,
  type SalesforceObjectType,
} from '@cogtics/connectors';

interface IngestNormalizeContext {
  db: Kysely<Database>;
  logger: Logger;
}

/**
 * Process ingest.normalize job
 */
export async function processIngestNormalizeJob(
  payload: IngestNormalizeJobPayload,
  logger: Logger,
  db: Kysely<Database>
): Promise<JobResult> {
  const { tenantId, snapshotId, objectTypes, batchSize } = payload;
  const startTime = Date.now();

  logger.info({ snapshotId, objectTypes, batchSize }, 'Starting ingest normalize');

  const ctx: IngestNormalizeContext = { db, logger };

  // Create sync run record
  const syncRunId = createSyncRunId();
  await db
    .insertInto('sync_runs')
    .values({
      id: syncRunId,
      tenant_id: tenantId as string,
      snapshot_id: snapshotId,
      run_type: 'normalize',
      status: 'running',
      records_processed: 0,
      metadata_json: { objectTypes },
    })
    .execute();

  try {
    let totalProcessed = 0;
    let totalFailed = 0;
    let offset = 0;
    const limit = batchSize || 1000;

    // Process in batches
    while (true) {
      // Query pending staging records
      let query = db
        .selectFrom('staging_records')
        .selectAll()
        .where('snapshot_id', '=', snapshotId)
        .where('status', '=', 'pending')
        .orderBy('received_at', 'asc')
        .limit(limit)
        .offset(offset);

      if (objectTypes && objectTypes.length > 0) {
        query = query.where('object_type', 'in', objectTypes);
      }

      const records = await query.execute();

      if (records.length === 0) {
        break;
      }

      logger.debug({ count: records.length, offset }, 'Processing staging records batch');

      // Process each record
      for (const record of records) {
        try {
          // Get provider from connection
          const connection = await db
            .selectFrom('connections')
            .select('provider')
            .where('id', '=', record.connection_id)
            .executeTakeFirst();

          if (!connection) {
            throw new Error(`Connection not found: ${record.connection_id}`);
          }

          // Apply mapper based on provider
          const normalized = await normalizeRecord(
            ctx,
            connection.provider,
            record.object_type,
            record.raw_json,
            record.batch_id
          );

          // Store normalized data back to staging record
          await db
            .updateTable('staging_records')
            .set({
              status: 'normalized',
              raw_json: {
                _original: record.raw_json,
                _normalized: normalized,
                _canonicalType: getCanonicalType(connection.provider, record.object_type),
              },
            })
            .where('id', '=', record.id)
            .execute();

          totalProcessed++;
        } catch (error) {
          logger.warn(
            { recordId: record.id, objectType: record.object_type, error },
            'Failed to normalize record'
          );

          await db
            .updateTable('staging_records')
            .set({
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error',
            })
            .where('id', '=', record.id)
            .execute();

          totalFailed++;
        }
      }

      offset += records.length;

      // If we got fewer records than limit, we're done
      if (records.length < limit) {
        break;
      }
    }

    // Update sync run
    await db
      .updateTable('sync_runs')
      .set({
        status: 'completed',
        finished_at: new Date(),
        records_processed: totalProcessed,
        metadata_json: { objectTypes, totalFailed },
      })
      .where('id', '=', syncRunId)
      .execute();

    logger.info({ totalProcessed, totalFailed }, 'Ingest normalize completed');

    return {
      success: true,
      message: `Normalized ${totalProcessed} records`,
      data: {
        snapshotId,
        syncRunId,
        recordsNormalized: totalProcessed,
        recordsFailed: totalFailed,
      },
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    logger.error({ error }, 'Ingest normalize failed');

    await db
      .updateTable('sync_runs')
      .set({
        status: 'failed',
        finished_at: new Date(),
        error_code: 'NORMALIZE_FAILED',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .where('id', '=', syncRunId)
      .execute();

    throw error;
  }
}

/**
 * Normalize a record using the appropriate mapper
 */
async function normalizeRecord(
  ctx: IngestNormalizeContext,
  provider: string,
  objectType: string,
  rawData: unknown,
  batchId: string
): Promise<unknown> {
  switch (provider) {
    case 'stripe':
      return mapStripeRecord(objectType as StripeObjectType, rawData, batchId);
    case 'salesforce':
      return mapSalesforceRecord(objectType as SalesforceObjectType, rawData, batchId);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Get canonical type from provider object type
 */
function getCanonicalType(provider: string, objectType: string): string | null {
  switch (provider) {
    case 'stripe':
      return STRIPE_TO_CANONICAL_TYPE[objectType as StripeObjectType] || null;
    case 'salesforce':
      return SALESFORCE_TO_CANONICAL_TYPE[objectType as SalesforceObjectType] || null;
    default:
      return null;
  }
}

