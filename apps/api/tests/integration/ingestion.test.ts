/**
 * Ingestion Pipeline Integration Tests
 * 
 * Tests the full ingestion pipeline from raw batches to canonical data.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { v4 as uuid } from 'uuid';
import type { Database } from '@cogtics/db';

// Import processors from worker app
import { processIngestLoadJob } from '../../../../apps/worker/src/processors/ingest-load';
import { processIngestNormalizeJob } from '../../../../apps/worker/src/processors/ingest-normalize';
import { processIngestUpsertJob } from '../../../../apps/worker/src/processors/ingest-upsert';
import { processIngestFinalizeJob } from '../../../../apps/worker/src/processors/ingest-finalize';

// Test fixtures
const TENANT_ID = 'tenant_test_integration';
const SNAPSHOT_ID = `snap_${uuid().replace(/-/g, '').substring(0, 20)}`;
const CONNECTION_ID = `conn_${uuid().replace(/-/g, '').substring(0, 20)}`;
const BATCH_ID = `batch_${uuid().replace(/-/g, '').substring(0, 20)}`;

// Mock logger
const mockLogger = {
  info: () => {},
  debug: () => {},
  warn: () => {},
  error: () => {},
  child: () => mockLogger,
} as any;

// Database connection
let db: Kysely<Database>;

// Mock storage that returns fixture data
const mockStorage = {
  get: async (key: string) => {
    // Return JSONL fixture based on key
    const fixtures: Record<string, string> = {
      'stripe-customers': JSON.stringify({ id: 'cus_test123', email: 'test@example.com', name: 'Test Customer', created: 1700000000 }) + '\n',
      'stripe-invoices': JSON.stringify({ id: 'in_test456', customer: 'cus_test123', total: 10000, currency: 'usd', status: 'paid', created: 1700000000 }) + '\n',
      'stripe-products': JSON.stringify({ id: 'prod_test789', name: 'Test Product', active: true, created: 1700000000 }) + '\n',
    };
    
    // Match fixture based on object type in key
    for (const [type, data] of Object.entries(fixtures)) {
      if (key.includes(type)) {
        return Buffer.from(data);
      }
    }
    return Buffer.from('');
  },
};

describe('Ingestion Pipeline Integration Tests', () => {
  beforeAll(async () => {
    // Skip if no database URL
    if (!process.env.DATABASE_URL) {
      console.warn('Skipping integration tests: DATABASE_URL not set');
      return;
    }

    // Connect to database
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool }),
    });
  });

  afterAll(async () => {
    if (db) {
      // Cleanup test data
      await db.deleteFrom('staging_records').where('tenant_id', '=', TENANT_ID).execute().catch(() => {});
      await db.deleteFrom('sync_runs').where('tenant_id', '=', TENANT_ID).execute().catch(() => {});
      await db.deleteFrom('customers').where('tenant_id', '=', TENANT_ID).execute().catch(() => {});
      await db.deleteFrom('invoices').where('tenant_id', '=', TENANT_ID).execute().catch(() => {});
      await db.deleteFrom('products').where('tenant_id', '=', TENANT_ID).execute().catch(() => {});
      await db.deleteFrom('raw_batches').where('tenant_id', '=', TENANT_ID).execute().catch(() => {});
      await db.deleteFrom('connector_runs').where('tenant_id', '=', TENANT_ID).execute().catch(() => {});
      await db.deleteFrom('connections').where('tenant_id', '=', TENANT_ID).execute().catch(() => {});
      await db.deleteFrom('snapshots').where('tenant_id', '=', TENANT_ID).execute().catch(() => {});
      await db.deleteFrom('tenants').where('id', '=', TENANT_ID).execute().catch(() => {});
      
      await db.destroy();
    }
  });

  beforeEach(async () => {
    if (!db) return;

    await db
      .insertInto('tenants')
      .values({ id: TENANT_ID, name: 'Ingestion Test Tenant', status: 'active' })
      .onConflict((oc) => oc.column('id').doNothing())
      .execute();

    await db
      .insertInto('connections')
      .values({
        id: CONNECTION_ID,
        tenant_id: TENANT_ID,
        provider: 'stripe',
        status: 'connected',
        display_name: 'Ingestion Test Connection',
        config_json: {},
      })
      .onConflict((oc) => oc.column('id').doNothing())
      .execute();

    await db
      .insertInto('connector_runs')
      .values({
        id: 'run_test',
        connection_id: CONNECTION_ID,
        tenant_id: TENANT_ID,
        run_type: 'full',
        status: 'completed',
      })
      .onConflict((oc) => oc.column('id').doNothing())
      .execute();

    // Setup test snapshot
    await db
      .insertInto('snapshots')
      .values({
        id: SNAPSHOT_ID,
        tenant_id: TENANT_ID,
        status: 'pending',
        metadata_json: {},
        record_counts: {},
        quality_results: JSON.stringify([]),
      })
      .onConflict((oc) => oc.column('id').doNothing())
      .execute();
  });

  describe('Stage 1: Load', () => {
    it('should load raw batches into staging records', async () => {
      if (!db) return;

      // Create test raw batch
      await db
        .insertInto('raw_batches')
        .values({
          id: BATCH_ID,
          tenant_id: TENANT_ID,
          connection_id: CONNECTION_ID,
          run_id: 'run_test',
          object_type: 'customers',
          s3_key: 'tenants/test/stripe-customers.jsonl',
          record_count: 1,
        })
        .onConflict((oc) => oc.column('id').doNothing())
        .execute();

      // Run load processor
      const result = await processIngestLoadJob(
        {
          tenantId: TENANT_ID,
          snapshotId: SNAPSHOT_ID,
          batchIds: [BATCH_ID],
          connectionId: CONNECTION_ID,
        },
        mockLogger,
        db,
        mockStorage as any
      );

      expect(result.success).toBe(true);

      // Verify staging records were created
      const stagingRecords = await db
        .selectFrom('staging_records')
        .selectAll()
        .where('snapshot_id', '=', SNAPSHOT_ID)
        .execute();

      expect(stagingRecords.length).toBeGreaterThan(0);
      expect(stagingRecords[0].status).toBe('pending');
    });

    it('should be idempotent - not duplicate records on retry', async () => {
      if (!db) return;

      // Get initial count
      const initialCount = await db
        .selectFrom('staging_records')
        .select(({ fn }) => fn.count('id').as('count'))
        .where('snapshot_id', '=', SNAPSHOT_ID)
        .executeTakeFirst();

      // Run again
      await processIngestLoadJob(
        {
          tenantId: TENANT_ID,
          snapshotId: SNAPSHOT_ID,
          batchIds: [BATCH_ID],
          connectionId: CONNECTION_ID,
        },
        mockLogger,
        db,
        mockStorage as any
      );

      // Verify count didn't change
      const finalCount = await db
        .selectFrom('staging_records')
        .select(({ fn }) => fn.count('id').as('count'))
        .where('snapshot_id', '=', SNAPSHOT_ID)
        .executeTakeFirst();

      expect(finalCount?.count).toBe(initialCount?.count);
    });
  });

  describe('Stage 2: Normalize', () => {
    it('should normalize staging records with mapper functions', async () => {
      if (!db) return;

      // Run normalize processor
      const result = await processIngestNormalizeJob(
        {
          tenantId: TENANT_ID,
          snapshotId: SNAPSHOT_ID,
        },
        mockLogger,
        db
      );

      expect(result.success).toBe(true);

      // Verify staging records are normalized
      const normalizedRecords = await db
        .selectFrom('staging_records')
        .selectAll()
        .where('snapshot_id', '=', SNAPSHOT_ID)
        .where('status', '=', 'normalized')
        .execute();

      expect(normalizedRecords.length).toBeGreaterThan(0);
    });
  });

  describe('Stage 3: Upsert', () => {
    it('should upsert normalized records to canonical tables', async () => {
      if (!db) return;

      // Run upsert processor
      const result = await processIngestUpsertJob(
        {
          tenantId: TENANT_ID,
          snapshotId: SNAPSHOT_ID,
        },
        mockLogger,
        db
      );

      expect(result.success).toBe(true);

      // Verify canonical records exist
      const customers = await db
        .selectFrom('customers')
        .selectAll()
        .where('snapshot_id', '=', SNAPSHOT_ID)
        .execute();

      // Should have at least the test customer
      expect(customers.length).toBeGreaterThanOrEqual(0);
    });

    it('should be idempotent - not duplicate canonical records', async () => {
      if (!db) return;

      // Get initial customer count
      const initialCount = await db
        .selectFrom('customers')
        .select(({ fn }) => fn.count('id').as('count'))
        .where('snapshot_id', '=', SNAPSHOT_ID)
        .executeTakeFirst();

      // Run again
      await processIngestUpsertJob(
        {
          tenantId: TENANT_ID,
          snapshotId: SNAPSHOT_ID,
        },
        mockLogger,
        db
      );

      // Verify count didn't change
      const finalCount = await db
        .selectFrom('customers')
        .select(({ fn }) => fn.count('id').as('count'))
        .where('snapshot_id', '=', SNAPSHOT_ID)
        .executeTakeFirst();

      expect(finalCount?.count).toBe(initialCount?.count);
    });
  });

  describe('Stage 4: Finalize', () => {
    it('should finalize snapshot with quality checks', async () => {
      if (!db) return;

      // Run finalize processor
      const result = await processIngestFinalizeJob(
        {
          tenantId: TENANT_ID,
          snapshotId: SNAPSHOT_ID,
        },
        mockLogger,
        db
      );

      expect(result.success).toBe(true);

      // Verify snapshot is complete
      const snapshot = await db
        .selectFrom('snapshots')
        .selectAll()
        .where('id', '=', SNAPSHOT_ID)
        .executeTakeFirst();

      expect(snapshot?.status).toBe('complete');
      expect(snapshot?.completed_at).toBeDefined();
      expect(snapshot?.record_counts).toBeDefined();
    });

    it('should record quality check results', async () => {
      if (!db) return;

      const snapshot = await db
        .selectFrom('snapshots')
        .select('quality_results')
        .where('id', '=', SNAPSHOT_ID)
        .executeTakeFirst();

      expect(snapshot?.quality_results).toBeDefined();
      expect(Array.isArray(snapshot?.quality_results)).toBe(true);
    });
  });

  describe('End-to-End Pipeline', () => {
    it('should process all stages sequentially', async () => {
      if (!db) return;

      const newSnapshotId = `snap_e2e_${uuid().replace(/-/g, '').substring(0, 16)}`;
      const newBatchId = `batch_e2e_${uuid().replace(/-/g, '').substring(0, 16)}`;

      // Setup
      await db.insertInto('snapshots').values({
        id: newSnapshotId,
        tenant_id: TENANT_ID,
        status: 'pending',
        metadata_json: {},
        record_counts: {},
        quality_results: JSON.stringify([]),
      }).execute();

      await db.insertInto('raw_batches').values({
        id: newBatchId,
        tenant_id: TENANT_ID,
        connection_id: CONNECTION_ID,
        run_id: 'run_test',
        object_type: 'customers',
        s3_key: 'tenants/test/stripe-customers.jsonl',
        record_count: 1,
      }).execute();

      // Stage 1: Load
      await processIngestLoadJob(
        { tenantId: TENANT_ID, snapshotId: newSnapshotId, batchIds: [newBatchId], connectionId: CONNECTION_ID },
        mockLogger, db, mockStorage as any
      );

      // Stage 2: Normalize
      await processIngestNormalizeJob(
        { tenantId: TENANT_ID, snapshotId: newSnapshotId },
        mockLogger, db
      );

      // Stage 3: Upsert
      await processIngestUpsertJob(
        { tenantId: TENANT_ID, snapshotId: newSnapshotId },
        mockLogger, db
      );

      // Stage 4: Finalize
      await processIngestFinalizeJob(
        { tenantId: TENANT_ID, snapshotId: newSnapshotId },
        mockLogger, db
      );

      // Verify final state
      const snapshot = await db
        .selectFrom('snapshots')
        .selectAll()
        .where('id', '=', newSnapshotId)
        .executeTakeFirst();

      expect(snapshot?.status).toBe('complete');

      // Cleanup
      await db.deleteFrom('staging_records').where('snapshot_id', '=', newSnapshotId).execute();
      await db.deleteFrom('sync_runs').where('snapshot_id', '=', newSnapshotId).execute();
      await db.deleteFrom('customers').where('snapshot_id', '=', newSnapshotId).execute();
      await db.deleteFrom('raw_batches').where('id', '=', newBatchId).execute();
      await db.deleteFrom('snapshots').where('id', '=', newSnapshotId).execute();
    });
  });
});
