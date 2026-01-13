import { randomUUID, createHash } from 'crypto';
import type { Logger } from 'pino';
import type { Kysely, Database } from '@cogtics/db';
import type { SyncJobPayload, JobResult, ConnectorSyncJobPayload } from '@cogtics/schemas';
import { 
  getConnector, 
  initializeEncryptor, 
  decryptToken,
  type ConnectorProvider,
  type Credentials,
  type RawBatch,
} from '@cogtics/connectors';
import { createStorageClient, type StorageClient } from '@cogtics/utils';

interface SyncContext {
  db: Kysely<Database>;
  logger: Logger;
  storage: StorageClient;
}

// Legacy sync payload type (Phase 0 - deprecated)
interface LegacySyncPayload {
  type: 'sync';
  tenantId: string;
  snapshotId: string;
  source?: string;
  fullSync?: boolean;
}

/**
 * Process sync job - Phase 1 connector-based implementation
 */
export async function processSyncJob(
  payload: SyncJobPayload,
  logger: Logger,
  db: Kysely<Database>
): Promise<JobResult> {
  // Check if this is a connector-based sync (Phase 1) or legacy sync
  if ('connectionId' in payload && payload.connectionId) {
    return processConnectorSync(payload as ConnectorSyncJobPayload, logger, db);
  }

  // Legacy Phase 0 stub for non-connector syncs
  const legacyPayload = payload as LegacySyncPayload;
  logger.info({ source: legacyPayload.source, fullSync: legacyPayload.fullSync }, 'Processing legacy sync job');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return {
    success: true,
    message: `Legacy sync completed for ${legacyPayload.source ?? 'unknown'}`,
    data: {
      source: legacyPayload.source,
      fullSync: legacyPayload.fullSync,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
    },
  };
}

/**
 * Process connector-based sync (Phase 1)
 */
async function processConnectorSync(
  payload: ConnectorSyncJobPayload,
  logger: Logger,
  db: Kysely<Database>
): Promise<JobResult> {
  const { connectionId, runId, runType, objectTypes } = payload;

  logger.info({ connectionId, runId, runType }, 'Processing connector sync job');

  // Initialize encryption from env
  const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (encryptionKey) {
    initializeEncryptor({
      mode: (process.env.TOKEN_ENCRYPTION_MODE as 'local' | 'kms') ?? 'local',
      key: encryptionKey,
    });
  }

  // Initialize storage client
  const storage = createStorageClient({
    endpoint: process.env.S3_ENDPOINT!,
    accessKey: process.env.S3_ACCESS_KEY!,
    secretKey: process.env.S3_SECRET_KEY!,
    bucket: process.env.S3_BUCKET!,
    region: process.env.S3_REGION ?? 'us-east-1',
  });

  const ctx: SyncContext = { db, logger, storage };

  try {
    // Load connection and credentials
    const connection = await db
      .selectFrom('connections')
      .selectAll()
      .where('id', '=', connectionId)
      .executeTakeFirst();

    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    const storedCreds = await db
      .selectFrom('connection_credentials')
      .selectAll()
      .where('connection_id', '=', connectionId)
      .executeTakeFirst();

    if (!storedCreds) {
      throw new Error(`Credentials not found for connection: ${connectionId}`);
    }

    // Decrypt credentials
    const credentials: Credentials = {
      accessToken: await decryptToken(storedCreds.access_token_enc),
      refreshToken: storedCreds.refresh_token_enc
        ? await decryptToken(storedCreds.refresh_token_enc)
        : undefined,
      expiresAt: storedCreds.expires_at ?? undefined,
      instanceUrl: storedCreds.instance_url ?? undefined,
      externalAccountId: storedCreds.external_account_id ?? undefined,
    };

    // Get connector
    const connector = getConnector(connection.provider as ConnectorProvider);

    // Determine which objects to sync
    let objectsToSync: string[] = [];
    if (objectTypes && objectTypes.length > 0) {
      objectsToSync = objectTypes;
    } else {
      // Get all discovered schemas for this connection
      const schemas = await db
        .selectFrom('connector_schemas')
        .select('object_type')
        .where('connection_id', '=', connectionId)
        .execute();

      objectsToSync = schemas.map((s) => s.object_type);

      // If no schemas discovered, use defaults based on provider
      if (objectsToSync.length === 0) {
        objectsToSync = getDefaultObjects(connection.provider as ConnectorProvider);
      }
    }

    logger.info({ objectsToSync }, 'Starting sync for objects');

    let totalRecords = 0;
    let totalObjects = 0;

    // Sync each object
    for (const objectType of objectsToSync) {
      try {
        // Load cursor if incremental sync
        let cursor: unknown = undefined;
        if (runType === 'incremental') {
          const savedCursor = await db
            .selectFrom('connector_cursors')
            .select('cursor_json')
            .where('connection_id', '=', connectionId)
            .where('object_type', '=', objectType)
            .executeTakeFirst();

          if (savedCursor) {
            cursor = savedCursor.cursor_json;
          }
        }

        logger.info({ objectType, cursor, runType }, 'Syncing object');

        // Start sync generator
        const syncGenerator = connector.syncObject({
          connectionId,
          objectType,
          cursor,
          fullSync: runType === 'full',
          credentials,
          batchSize: 100,
        });

        // Process batches
        for await (const batch of syncGenerator) {
          const batchResult = await processBatch(ctx, connection.tenant_id, connectionId, runId, batch);
          totalRecords += batchResult.recordCount;

          // Update cursor after each batch
          if (batch.cursor) {
            await upsertCursor(db, connectionId, objectType, batch.cursor);
          }
        }

        totalObjects++;
        logger.info({ objectType, totalRecords }, 'Object sync completed');
      } catch (error) {
        logger.error({ objectType, error }, 'Failed to sync object');
        // Continue with other objects
      }
    }

    // Update run status
    await db
      .updateTable('connector_runs')
      .set({
        status: 'completed',
        finished_at: new Date(),
        records_fetched: totalRecords,
        objects_fetched: totalObjects,
      })
      .where('id', '=', runId)
      .execute();

    // Update connection last sync
    await db
      .updateTable('connections')
      .set({
        last_sync_at: new Date(),
        last_success_at: new Date(),
        status: 'connected',
        last_error_message: null,
        updated_at: new Date(),
      })
      .where('id', '=', connectionId)
      .execute();

    logger.info({ totalRecords, totalObjects }, 'Connector sync completed');

    return {
      success: true,
      message: `Sync completed for ${connection.provider}`,
      data: {
        connectionId,
        runId,
        runType,
        recordsFetched: totalRecords,
        objectsFetched: totalObjects,
      },
    };
  } catch (error) {
    logger.error({ error }, 'Connector sync failed');

    // Update run status
    await db
      .updateTable('connector_runs')
      .set({
        status: 'failed',
        finished_at: new Date(),
        error_code: 'SYNC_FAILED',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .where('id', '=', runId)
      .execute();

    // Update connection status
    await db
      .updateTable('connections')
      .set({
        status: 'error',
        last_error_at: new Date(),
        last_error_code: 'SYNC_FAILED',
        last_error_message: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date(),
      })
      .where('id', '=', connectionId)
      .execute();

    throw error;
  }
}

/**
 * Process a batch of records - write to S3 and record in DB
 */
async function processBatch(
  ctx: SyncContext,
  tenantId: string,
  connectionId: string,
  runId: string,
  batch: RawBatch
): Promise<{ recordCount: number }> {
  const { objectType, records, fetchedAt } = batch;

  if (records.length === 0) {
    return { recordCount: 0 };
  }

  // Convert records to JSONL
  const jsonlContent = records.map((r) => JSON.stringify(r.data)).join('\n');
  const buffer = Buffer.from(jsonlContent, 'utf-8');

  // Calculate checksum
  const checksum = createHash('sha256').update(buffer).digest('hex');

  // Generate S3 key
  const batchId = `batch_${randomUUID().replace(/-/g, '')}`;
  const s3Key = `raw/${tenantId}/${connectionId}/${objectType}/${runId}/${batchId}.jsonl`;

  // Upload to S3
  await ctx.storage.put(s3Key, buffer, {
    contentType: 'application/x-ndjson',
    metadata: {
      tenantId,
      connectionId,
      runId,
      objectType,
      recordCount: String(records.length),
    },
  });

  // Find min/max updated_at
  let minUpdatedAt: Date | null = null;
  let maxUpdatedAt: Date | null = null;
  for (const record of records) {
    if (record.updatedAt) {
      if (!minUpdatedAt || record.updatedAt < minUpdatedAt) {
        minUpdatedAt = record.updatedAt;
      }
      if (!maxUpdatedAt || record.updatedAt > maxUpdatedAt) {
        maxUpdatedAt = record.updatedAt;
      }
    }
  }

  // Insert raw_batches record
  await ctx.db
    .insertInto('raw_batches')
    .values({
      id: batchId,
      tenant_id: tenantId,
      connection_id: connectionId,
      run_id: runId,
      object_type: objectType,
      s3_key: s3Key,
      record_count: records.length,
      min_updated_at: minUpdatedAt,
      max_updated_at: maxUpdatedAt,
      checksum,
    })
    .execute();

  ctx.logger.debug({ batchId, objectType, recordCount: records.length }, 'Batch processed');

  return { recordCount: records.length };
}

/**
 * Upsert cursor for incremental sync
 */
async function upsertCursor(
  db: Kysely<Database>,
  connectionId: string,
  objectType: string,
  cursor: unknown
): Promise<void> {
  const cursorId = `cursor_${connectionId}_${objectType}`;

  await db
    .insertInto('connector_cursors')
    .values({
      id: cursorId,
      connection_id: connectionId,
      object_type: objectType,
      cursor_json: cursor,
      last_seen_at: new Date(),
    })
    .onConflict((oc) =>
      oc.columns(['connection_id', 'object_type']).doUpdateSet({
        cursor_json: cursor,
        updated_at: new Date(),
        last_seen_at: new Date(),
      })
    )
    .execute();
}

/**
 * Get default objects for a provider
 */
function getDefaultObjects(provider: ConnectorProvider): string[] {
  switch (provider) {
    case 'stripe':
      return ['customers', 'subscriptions', 'invoices', 'charges', 'products', 'prices'];
    case 'salesforce':
      return ['Account', 'Contact', 'Opportunity', 'Lead', 'User'];
    default:
      return [];
  }
}
