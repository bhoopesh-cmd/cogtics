import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDatabase, closeDatabase } from '@cogtics/db';
import type { Kysely, Database } from '@cogtics/db';

// Skip tests if DATABASE_URL is not set
const shouldSkip = !process.env.DATABASE_URL;

describe.skipIf(shouldSkip)('Phase 10: Exports API Integration Tests', () => {
  let db: Kysely<Database>;
  const TEST_TENANT_ID = 'tenant_test_exports';
  const TEST_USER_ID = 'user_test_exports';
  const TEST_SNAPSHOT_ID = 'snap_test_exports';
  const TEST_EXPORT_ID = 'exp_test_exports';

  beforeAll(async () => {
    db = getDatabase({ connectionString: process.env.DATABASE_URL! });
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await closeDatabase();
  });

  async function setupTestData() {
    // Create test tenant
    await db
      .insertInto('tenants')
      .values({
        id: TEST_TENANT_ID,
        name: 'Export Test Tenant',
        status: 'active',
      })
      .onConflict((oc) => oc.column('id').doNothing())
      .execute();

    // Create test user
    await db
      .insertInto('users')
      .values({
        id: TEST_USER_ID,
        email: 'export-test@example.com',
        name: 'Export Test User',
        status: 'active',
      })
      .onConflict((oc) => oc.column('id').doNothing())
      .execute();

    // Create test snapshot
    await db
      .insertInto('snapshots')
      .values({
        id: TEST_SNAPSHOT_ID,
        tenant_id: TEST_TENANT_ID,
        status: 'complete',
        metadata_json: {},
        record_counts: {},
        quality_results: {},
      })
      .onConflict((oc) => oc.column('id').doNothing())
      .execute();
  }

  async function cleanupTestData() {
    // Clean up in reverse order of dependencies
    await db.deleteFrom('export_audit').where('tenant_id', '=', TEST_TENANT_ID).execute();
    await db.deleteFrom('export_items').where('tenant_id', '=', TEST_TENANT_ID).execute();
    await db.deleteFrom('export_files').where('tenant_id', '=', TEST_TENANT_ID).execute();
    await db.deleteFrom('exports').where('tenant_id', '=', TEST_TENANT_ID).execute();
    await db.deleteFrom('snapshots').where('tenant_id', '=', TEST_TENANT_ID).execute();
    await db.deleteFrom('users').where('id', '=', TEST_USER_ID).execute();
    await db.deleteFrom('tenants').where('id', '=', TEST_TENANT_ID).execute();
  }

  describe('Exports Table Operations', () => {
    it('should create an export record', async () => {
      await db
        .insertInto('exports')
        .values({
          id: TEST_EXPORT_ID,
          tenant_id: TEST_TENANT_ID,
          snapshot_id: TEST_SNAPSHOT_ID,
          export_type: 'issues_csv',
          format: 'csv',
          status: 'pending',
          requested_by: TEST_USER_ID,
          options_json: { includeEvidence: false },
        })
        .execute();

      const exportRecord = await db
        .selectFrom('exports')
        .selectAll()
        .where('id', '=', TEST_EXPORT_ID)
        .executeTakeFirst();

      expect(exportRecord).toBeDefined();
      expect(exportRecord?.export_type).toBe('issues_csv');
      expect(exportRecord?.format).toBe('csv');
      expect(exportRecord?.status).toBe('pending');
    });

    it('should update export status', async () => {
      await db
        .updateTable('exports')
        .set({
          status: 'processing',
          processing_lock: new Date(),
        })
        .where('id', '=', TEST_EXPORT_ID)
        .execute();

      const exportRecord = await db
        .selectFrom('exports')
        .select(['status', 'processing_lock'])
        .where('id', '=', TEST_EXPORT_ID)
        .executeTakeFirst();

      expect(exportRecord?.status).toBe('processing');
      expect(exportRecord?.processing_lock).toBeDefined();
    });

    it('should create export file record', async () => {
      const fileId = 'expf_test_file';
      
      await db
        .insertInto('export_files')
        .values({
          id: fileId,
          tenant_id: TEST_TENANT_ID,
          export_id: TEST_EXPORT_ID,
          s3_key: 'exports/test/issues.csv',
          file_name: 'issues.csv',
          content_type: 'text/csv',
          size_bytes: 1024,
          checksum_sha256: 'abc123',
        })
        .execute();

      const file = await db
        .selectFrom('export_files')
        .selectAll()
        .where('id', '=', fileId)
        .executeTakeFirst();

      expect(file).toBeDefined();
      expect(file?.file_name).toBe('issues.csv');
      expect(Number(file?.size_bytes)).toBe(1024);
    });

    it('should create export audit record', async () => {
      const auditId = 'expa_test_audit';
      
      await db
        .insertInto('export_audit')
        .values({
          id: auditId,
          tenant_id: TEST_TENANT_ID,
          export_id: TEST_EXPORT_ID,
          action: 'requested',
          actor_user_id: TEST_USER_ID,
          details_json: { source: 'test' },
        })
        .execute();

      const audit = await db
        .selectFrom('export_audit')
        .selectAll()
        .where('id', '=', auditId)
        .executeTakeFirst();

      expect(audit).toBeDefined();
      expect(audit?.action).toBe('requested');
      expect(audit?.actor_user_id).toBe(TEST_USER_ID);
    });

    it('should complete export successfully', async () => {
      await db
        .updateTable('exports')
        .set({
          status: 'completed',
          completed_at: new Date(),
          processing_lock: null,
        })
        .where('id', '=', TEST_EXPORT_ID)
        .execute();

      const exportRecord = await db
        .selectFrom('exports')
        .select(['status', 'completed_at'])
        .where('id', '=', TEST_EXPORT_ID)
        .executeTakeFirst();

      expect(exportRecord?.status).toBe('completed');
      expect(exportRecord?.completed_at).toBeDefined();
    });
  });

  describe('Digest Tables Operations', () => {
    const TEST_SUBSCRIPTION_ID = 'digs_test_sub';
    const TEST_RUN_ID = 'digr_test_run';

    it('should create digest subscription', async () => {
      await db
        .insertInto('digest_subscriptions')
        .values({
          id: TEST_SUBSCRIPTION_ID,
          tenant_id: TEST_TENANT_ID,
          name: 'Weekly Issues Digest',
          cadence: 'weekly',
          scope_json: JSON.stringify({ issuesSeverity: ['high', 'critical'] }),
          recipients_json: JSON.stringify(['test@example.com']),
          is_active: true,
          created_by: TEST_USER_ID,
        })
        .execute();

      const subscription = await db
        .selectFrom('digest_subscriptions')
        .selectAll()
        .where('id', '=', TEST_SUBSCRIPTION_ID)
        .executeTakeFirst();

      expect(subscription).toBeDefined();
      expect(subscription?.name).toBe('Weekly Issues Digest');
      expect(subscription?.cadence).toBe('weekly');
      expect(subscription?.is_active).toBe(true);
    });

    it('should create digest run', async () => {
      await db
        .insertInto('digest_runs')
        .values({
          id: TEST_RUN_ID,
          tenant_id: TEST_TENANT_ID,
          subscription_id: TEST_SUBSCRIPTION_ID,
          status: 'completed',
          items_count: 5,
          recipients_count: 1,
          emails_sent: 1,
          emails_failed: 0,
          period_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          period_end: new Date(),
          started_at: new Date(Date.now() - 60000),
          finished_at: new Date(),
          content_json: { issuesSummary: { newIssues: 3, resolvedIssues: 2 } },
        })
        .execute();

      const run = await db
        .selectFrom('digest_runs')
        .selectAll()
        .where('id', '=', TEST_RUN_ID)
        .executeTakeFirst();

      expect(run).toBeDefined();
      expect(run?.status).toBe('completed');
      expect(run?.items_count).toBe(5);
      expect(run?.emails_sent).toBe(1);
    });

    it('should toggle subscription active status', async () => {
      await db
        .updateTable('digest_subscriptions')
        .set({ is_active: false, updated_at: new Date() })
        .where('id', '=', TEST_SUBSCRIPTION_ID)
        .execute();

      const subscription = await db
        .selectFrom('digest_subscriptions')
        .select(['is_active'])
        .where('id', '=', TEST_SUBSCRIPTION_ID)
        .executeTakeFirst();

      expect(subscription?.is_active).toBe(false);
    });

    // Cleanup digest data
    afterAll(async () => {
      await db.deleteFrom('digest_runs').where('subscription_id', '=', TEST_SUBSCRIPTION_ID).execute();
      await db.deleteFrom('digest_subscriptions').where('id', '=', TEST_SUBSCRIPTION_ID).execute();
    });
  });
});
