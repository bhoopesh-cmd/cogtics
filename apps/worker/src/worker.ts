import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { loadWorkerConfig, createLogger } from '@cogtics/utils';
import { getDatabase, closeDatabase } from '@cogtics/db';
import { JobPayloadSchema, type QueueName } from '@cogtics/schemas';
import { initializeConnectors, initializeEncryptor } from '@cogtics/connectors';

// Processors
import { processSyncJob } from './processors/sync.js';
import { processDetectJob } from './processors/detect.js';
import { processSimulateJob } from './processors/simulate.js';
import { processExportJob } from './processors/export.js';
// Phase 2 Ingestion Processors
import { processIngestLoadJob } from './processors/ingest-load.js';
import { processIngestNormalizeJob } from './processors/ingest-normalize.js';
import { processIngestUpsertJob } from './processors/ingest-upsert.js';
import { processIngestFinalizeJob } from './processors/ingest-finalize.js';
// Phase 3 Identity Processors
import { processIdentityResolveJob } from './processors/identity-resolve.js';
import { processIdentityApplyJob } from './processors/identity-apply.js';
// Phase 4 Upload Processors
import { processCsvParseJob } from './processors/upload-csv-parse.js';
import { processCsvFinalizeJob } from './processors/upload-csv-finalize.js';
import { processPdfParseJob } from './processors/upload-pdf-parse.js';
// Phase 5 Contract Intelligence Processors
import { processContractExtractJob } from './processors/contracts-extract.js';
import { processClauseSegmentJob } from './processors/contracts-segment.js';
import { processTermExtractJob } from './processors/contracts-terms.js';
import { processReadinessComputeJob } from './processors/contracts-readiness.js';
// Phase 6 Revenue Recognition Processors
import { processRevRecComputeJob } from './processors/revrec-compute.js';
import { processRevRecReconcileJob } from './processors/revrec-reconcile.js';
// Phase 7 Detection Engine Processors
import { processDetectRunJob } from './processors/detect-run.js';
import { processDetectReplayJob } from './processors/detect-replay.js';
// Storage client for file operations
import { createStorageClient } from '@cogtics/utils';
import { Queue } from 'bullmq';

const QUEUE_NAMES: QueueName[] = [
  'sync',
  'detect',
  'simulate',
  'export',
  'ingest.load',
  'ingest.normalize',
  'ingest.upsert',
  'ingest.finalize',
  'ingest.full',
  'identity.resolve',
  'identity.apply',
  'upload.csv.parse',
  'upload.csv.finalize',
  'upload.pdf.parse',
  // Phase 5 Contract Intelligence
  'contracts.pdf.extract',
  'contracts.clause.segment',
  'contracts.terms.extract',
  'contracts.readiness.compute',
  // Phase 6 Revenue Recognition
  'revrec.compute',
  'revrec.reconcile',
  // Phase 7 Detection Engine
  'detect.run',
  'detect.replay',
];

async function main() {
  const config = loadWorkerConfig();
  const logger = createLogger({
    name: 'cogtics-worker',
    level: config.LOG_LEVEL,
  });

  logger.info('Starting worker...');

  // Initialize connectors and encryption
  await initializeConnectors({});
  if (config.TOKEN_ENCRYPTION_KEY) {
    initializeEncryptor(config.TOKEN_ENCRYPTION_KEY);
    logger.info('Token encryptor initialized');
  }

  // Initialize database
  const db = getDatabase({ connectionString: config.DATABASE_URL });

  // Initialize storage client for uploads
  let storageClient: ReturnType<typeof createStorageClient> | null = null;
  function getStorageClient() {
    if (!storageClient) {
      storageClient = createStorageClient({
        endpoint: process.env.MINIO_ENDPOINT ?? 'http://localhost:9000',
        accessKeyId: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
        secretAccessKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
        bucket: process.env.MINIO_BUCKET ?? 'cogtics-uploads',
      });
    }
    return storageClient;
  }

  // Initialize Redis connection
  const redis = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  // Create queues map for inter-job communication
  const queues = new Map<string, Queue>();
  for (const queueName of QUEUE_NAMES) {
    queues.set(queueName, new Queue(queueName, { connection: redis }));
  }

  // Create workers for each queue
  const workers: Worker[] = [];

  for (const queueName of QUEUE_NAMES) {
    const worker = new Worker(
      queueName,
      async (job: Job) => {
        const jobLogger = logger.child({
          jobId: job.id,
          queue: queueName,
          tenantId: job.data.tenantId,
        });

        jobLogger.info({ payload: job.data.payload }, 'Processing job');

        try {
          // Validate job payload
          const parseResult = JobPayloadSchema.safeParse(job.data.payload);
          if (!parseResult.success) {
            throw new Error(`Invalid job payload: ${parseResult.error.message}`);
          }

          const payload = parseResult.data;
          const startTime = Date.now();

          // Update job status to processing
          await db
            .updateTable('jobs')
            .set({ status: 'processing', updated_at: new Date() })
            .where('id', '=', job.data.jobId)
            .execute();

          // Route to appropriate processor
          let result;
          switch (payload.type) {
            case 'sync':
              result = await processSyncJob(payload, jobLogger, db);
              break;
            case 'detect':
              result = await processDetectJob(payload, jobLogger, db);
              break;
            case 'simulate':
              result = await processSimulateJob(payload, jobLogger, db);
              break;
            case 'export':
              result = await processExportJob(payload, jobLogger, db);
              break;
            // Phase 2 Ingestion Jobs
            case 'ingest.load':
              result = await processIngestLoadJob(payload, jobLogger, db);
              break;
            case 'ingest.normalize':
              result = await processIngestNormalizeJob(payload, jobLogger, db);
              break;
            case 'ingest.upsert':
              result = await processIngestUpsertJob(payload, jobLogger, db);
              break;
            case 'ingest.finalize':
              result = await processIngestFinalizeJob(payload, jobLogger, db);
              break;
            case 'ingest.full':
              // Full ingestion orchestrates all steps
              result = await processFullIngestion(payload, jobLogger, db);
              break;
            // Phase 3 Identity Jobs
            case 'identity.resolve':
              result = await processIdentityResolveJob(payload, jobLogger, db);
              break;
            case 'identity.apply':
              result = await processIdentityApplyJob(payload, jobLogger, db);
              break;
            // Phase 4 Upload Jobs
            case 'upload.csv.parse':
              result = await processCsvParseJob(payload, jobLogger, db, getStorageClient());
              break;
            case 'upload.csv.finalize':
              result = await processCsvFinalizeJob(payload, jobLogger, db);
              break;
            case 'upload.pdf.parse':
              result = await processPdfParseJob(payload, jobLogger, db, getStorageClient());
              break;
            // Phase 5 Contract Intelligence Jobs
            case 'contracts.pdf.extract':
              result = await processContractExtractJob(payload, jobLogger, db, getStorageClient(), queues);
              break;
            case 'contracts.clause.segment':
              result = await processClauseSegmentJob(payload, jobLogger, db, queues);
              break;
            case 'contracts.terms.extract':
              result = await processTermExtractJob(payload, jobLogger, db, queues);
              break;
            case 'contracts.readiness.compute':
              result = await processReadinessComputeJob(payload, jobLogger, db);
              break;
            // Phase 6: Revenue Recognition
            case 'revrec.compute':
              result = await processRevRecComputeJob(payload, jobLogger, db);
              break;
            case 'revrec.reconcile':
              result = await processRevRecReconcileJob(payload, jobLogger, db);
              break;
            // Phase 7: Detection Engine
            case 'detect.run':
              result = await processDetectRunJob(payload, jobLogger, db);
              break;
            case 'detect.replay':
              result = await processDetectReplayJob(payload, jobLogger, db);
              break;
            default:
              throw new Error(`Unknown job type`);
          }

          const processingTimeMs = Date.now() - startTime;

          // Update job status to completed
          await db
            .updateTable('jobs')
            .set({
              status: 'completed',
              result_json: { ...result, processingTimeMs },
              updated_at: new Date(),
              completed_at: new Date(),
            })
            .where('id', '=', job.data.jobId)
            .execute();

          // Update idempotency key if present
          const jobRecord = await db
            .selectFrom('jobs')
            .select('idempotency_key_id')
            .where('id', '=', job.data.jobId)
            .executeTakeFirst();

          if (jobRecord?.idempotency_key_id) {
            await db
              .updateTable('idempotency_keys')
              .set({
                status: 'completed',
                response_json: { jobId: job.data.jobId, result },
              })
              .where('id', '=', jobRecord.idempotency_key_id)
              .execute();
          }

          jobLogger.info({ result, processingTimeMs }, 'Job completed');
          return result;
        } catch (err) {
          jobLogger.error({ err }, 'Job failed');

          // Update job status to failed
          await db
            .updateTable('jobs')
            .set({
              status: 'failed',
              result_json: {
                success: false,
                error: err instanceof Error ? err.message : 'Unknown error',
              },
              updated_at: new Date(),
            })
            .where('id', '=', job.data.jobId)
            .execute();

          throw err;
        }
      },
      {
        connection: redis,
        concurrency: config.WORKER_CONCURRENCY,
      }
    );

    worker.on('error', (err) => {
      logger.error({ err, queue: queueName }, 'Worker error');
    });

    workers.push(worker);
    logger.info(`Worker started for queue: ${queueName}`);
  }

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down workers...');
    
    await Promise.all(workers.map((w) => w.close()));
    await redis.quit();
    await closeDatabase();
    
    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  logger.info('All workers started and ready');
}

/**
 * Process full ingestion - orchestrates all ingestion steps
 */
async function processFullIngestion(
  payload: any,
  logger: any,
  db: any
): Promise<any> {
  const { tenantId, snapshotId, connectionIds, runType } = payload;

  logger.info({ snapshotId, connectionIds }, 'Starting full ingestion pipeline');

  // Get all raw batches for the connections
  let batchQuery = db
    .selectFrom('raw_batches')
    .select(['id', 'connection_id'])
    .where('tenant_id', '=', tenantId);

  if (connectionIds && connectionIds.length > 0) {
    batchQuery = batchQuery.where('connection_id', 'in', connectionIds);
  }

  const batches = await batchQuery.execute();

  if (batches.length === 0) {
    logger.warn('No raw batches found for ingestion');
    return {
      success: true,
      message: 'No data to ingest',
      data: { snapshotId, batchesFound: 0 },
    };
  }

  // Group batches by connection
  const batchesByConnection = new Map<string, string[]>();
  for (const batch of batches) {
    const existing = batchesByConnection.get(batch.connection_id) || [];
    existing.push(batch.id);
    batchesByConnection.set(batch.connection_id, existing);
  }

  // Step 1: Load all batches
  for (const [connectionId, batchIds] of batchesByConnection) {
    await processIngestLoadJob(
      { type: 'ingest.load', tenantId, snapshotId, batchIds, connectionId },
      logger,
      db
    );
  }

  // Step 2: Normalize
  await processIngestNormalizeJob(
    { type: 'ingest.normalize', tenantId, snapshotId, batchSize: 1000 },
    logger,
    db
  );

  // Step 3: Upsert
  await processIngestUpsertJob(
    { type: 'ingest.upsert', tenantId, snapshotId, batchSize: 500 },
    logger,
    db
  );

  // Step 4: Finalize
  const result = await processIngestFinalizeJob(
    { type: 'ingest.finalize', tenantId, snapshotId, runQualityChecks: true },
    logger,
    db
  );

  return result;
}

main().catch((err) => {
  console.error('Worker startup failed:', err);
  process.exit(1);
});

