/**
 * Revenue Recognition Integration Tests
 * 
 * Tests the full rev-rec pipeline from contracts to schedules.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { v4 as uuid } from 'uuid';
import type { Database } from '@cogtics/db';

// Import processors from worker app
import { processRevRecComputeJob } from '../../../../apps/worker/src/processors/revrec-compute';
import { processRevRecReconcileJob } from '../../../../apps/worker/src/processors/revrec-reconcile';

// Test fixtures
const TENANT_ID = 'tenant_revrec_test';
const SNAPSHOT_ID = `snap_${uuid().replace(/-/g, '').substring(0, 20)}`;
const CONTRACT_ID = `cont_${uuid().replace(/-/g, '').substring(0, 20)}`;
const CONTRACT_VERSION_ID = `cver_${uuid().replace(/-/g, '').substring(0, 20)}`;
const CUSTOMER_ID = `cust_${uuid().replace(/-/g, '').substring(0, 20)}`;

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

describe('Revenue Recognition Integration Tests', () => {
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
      // Cleanup test data in correct order
      await db.deleteFrom('deferred_revenue_balances').where('tenant_id', '=', TENANT_ID).execute().catch(() => {});
      await db.deleteFrom('recognition_events').where('tenant_id', '=', TENANT_ID).execute().catch(() => {});
      await db.deleteFrom('revenue_schedules').where('tenant_id', '=', TENANT_ID).execute().catch(() => {});
      await db.deleteFrom('revenue_allocations').where('tenant_id', '=', TENANT_ID).execute().catch(() => {});
      await db.deleteFrom('revenue_obligations').where('tenant_id', '=', TENANT_ID).execute().catch(() => {});
      await db.deleteFrom('revrec_reconciliations').where('tenant_id', '=', TENANT_ID).execute().catch(() => {});
      await db.deleteFrom('contract_terms').where('tenant_id', '=', TENANT_ID).execute().catch(() => {});
      await db.deleteFrom('contract_versions').where('tenant_id', '=', TENANT_ID).execute().catch(() => {});
      await db.deleteFrom('invoices').where('tenant_id', '=', TENANT_ID).execute().catch(() => {});
      await db.deleteFrom('contracts').where('tenant_id', '=', TENANT_ID).execute().catch(() => {});
      await db.deleteFrom('customers').where('tenant_id', '=', TENANT_ID).execute().catch(() => {});
      await db.deleteFrom('snapshots').where('tenant_id', '=', TENANT_ID).execute().catch(() => {});
      
      await db.destroy();
    }
  });

  beforeEach(async () => {
    if (!db) return;

    await db
      .insertInto('tenants')
      .values({ id: TENANT_ID, name: 'RevRec Test Tenant', status: 'active' })
      .onConflict((oc) => oc.column('id').doNothing())
      .execute();

    // Setup test snapshot
    await db
      .insertInto('snapshots')
      .values({
        id: SNAPSHOT_ID,
        tenant_id: TENANT_ID,
        status: 'complete',
        metadata_json: {},
        record_counts: {},
        quality_results: JSON.stringify([]),
      })
      .onConflict((oc) => oc.column('id').doNothing())
      .execute();

    // Setup test customer
    await db
      .insertInto('customers')
      .values({
        id: CUSTOMER_ID,
        tenant_id: TENANT_ID,
        snapshot_id: SNAPSHOT_ID,
        name: 'Test Customer Inc',
        email: 'test@customer.com',
        source_system: 'test',
        external_id: 'test_cust_1',
        status: 'active',
        metadata_json: {},
      })
      .onConflict((oc) => oc.column('id').doNothing())
      .execute();
  });

  describe('Rev-Rec Compute Job', () => {
    it('should compute obligations from contract with ARR', async () => {
      if (!db) return;

      // Create test contract
      await db
        .insertInto('contracts')
        .values({
          id: CONTRACT_ID,
          tenant_id: TENANT_ID,
          snapshot_id: SNAPSHOT_ID,
          customer_id: CUSTOMER_ID,
          name: 'Annual Subscription',
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          arr: 120000,
          currency: 'USD',
          billing_frequency: 'monthly',
          status: 'active',
          source_system: 'test',
          external_id: 'test_contract_1',
          metadata_json: {},
        })
        .onConflict((oc) => oc.column('id').doNothing())
        .execute();

      await db
        .insertInto('contract_versions')
        .values({
          id: CONTRACT_VERSION_ID,
          tenant_id: TENANT_ID,
          snapshot_id: SNAPSHOT_ID,
          contract_id: CONTRACT_ID,
          version: 1,
          effective_date: '2024-01-01',
          changes_json: {},
        })
        .onConflict((oc) => oc.column('id').doNothing())
        .execute();

      // Run compute processor
      const result = await processRevRecComputeJob(
        {
          type: 'revrec.compute',
          tenantId: TENANT_ID,
          snapshotId: SNAPSHOT_ID,
          contractIds: [CONTRACT_ID],
          forceRecompute: false,
        },
        mockLogger,
        db
      );

      expect(result.success).toBe(true);

      // Verify obligation was created
      const obligations = await db
        .selectFrom('revenue_obligations')
        .selectAll()
        .where('contract_id', '=', CONTRACT_ID)
        .execute();

      expect(obligations.length).toBeGreaterThanOrEqual(1);
      expect(obligations[0].obligation_type).toBe('subscription');
      expect(Number(obligations[0].transaction_price)).toBe(120000);
    });

    it('should generate 12 monthly schedules for 1-year contract', async () => {
      if (!db) return;

      // Check for schedules
      const schedules = await db
        .selectFrom('revenue_schedules as rs')
        .innerJoin('revenue_obligations as ro', 'ro.id', 'rs.obligation_id')
        .selectAll('rs')
        .where('ro.contract_id', '=', CONTRACT_ID)
        .execute();

      expect(schedules.length).toBe(12);

      // Each month should have roughly $10k
      const totalScheduled = schedules.reduce((sum, s) => sum + Number(s.scheduled_amount), 0);
      expect(totalScheduled).toBeCloseTo(120000, 0);
    });

    it('should create allocation record', async () => {
      if (!db) return;

      const allocations = await db
        .selectFrom('revenue_allocations as ra')
        .innerJoin('revenue_obligations as ro', 'ro.id', 'ra.obligation_id')
        .selectAll('ra')
        .where('ro.contract_id', '=', CONTRACT_ID)
        .execute();

      expect(allocations.length).toBeGreaterThanOrEqual(1);
      expect(Number(allocations[0].allocation_pct)).toBe(100);
      expect(Number(allocations[0].allocated_amount)).toBe(120000);
    });

    it('should skip recompute when data exists and not forcing', async () => {
      if (!db) return;

      // Get current obligation count
      const before = await db
        .selectFrom('revenue_obligations')
        .select((eb) => eb.fn.count('id').as('count'))
        .where('contract_id', '=', CONTRACT_ID)
        .executeTakeFirst();

      // Run again without force
      await processRevRecComputeJob(
        {
          type: 'revrec.compute',
          tenantId: TENANT_ID,
          snapshotId: SNAPSHOT_ID,
          contractIds: [CONTRACT_ID],
          forceRecompute: false,
        },
        mockLogger,
        db
      );

      // Count should be the same
      const after = await db
        .selectFrom('revenue_obligations')
        .select((eb) => eb.fn.count('id').as('count'))
        .where('contract_id', '=', CONTRACT_ID)
        .executeTakeFirst();

      expect(after?.count).toBe(before?.count);
    });

    it('should recompute when force flag is set', async () => {
      if (!db) return;

      // Get current obligation ID
      const beforeObl = await db
        .selectFrom('revenue_obligations')
        .select('id')
        .where('contract_id', '=', CONTRACT_ID)
        .executeTakeFirst();

      // Run with force
      await processRevRecComputeJob(
        {
          type: 'revrec.compute',
          tenantId: TENANT_ID,
          snapshotId: SNAPSHOT_ID,
          contractIds: [CONTRACT_ID],
          forceRecompute: true,
        },
        mockLogger,
        db
      );

      // Should have a new obligation ID
      const afterObl = await db
        .selectFrom('revenue_obligations')
        .select('id')
        .where('contract_id', '=', CONTRACT_ID)
        .executeTakeFirst();

      expect(afterObl?.id).not.toBe(beforeObl?.id);
    });
  });

  describe('Rev-Rec Reconcile Job', () => {
    it('should reconcile schedules with invoices', async () => {
      if (!db) return;

      // Create test invoices matching the schedule
      const invoiceId = `inv_${uuid().replace(/-/g, '').substring(0, 20)}`;
      await db
        .insertInto('invoices')
        .values({
          id: invoiceId,
          tenant_id: TENANT_ID,
          snapshot_id: SNAPSHOT_ID,
          customer_id: CUSTOMER_ID,
          contract_id: CONTRACT_ID,
          invoice_number: 'INV-001',
          invoice_date: '2024-01-15',
          total: 10000,
          currency: 'USD',
          status: 'paid',
          period_start: '2024-01-01',
          period_end: '2024-01-31',
          source_system: 'test',
          external_id: 'test_inv_1',
          metadata_json: {},
        })
        .execute();

      // Run reconciliation
      const result = await processRevRecReconcileJob(
        {
          type: 'revrec.reconcile',
          tenantId: TENANT_ID,
          snapshotId: SNAPSHOT_ID,
          periodStart: '2024-01-01',
          periodEnd: '2024-01-31',
        },
        mockLogger,
        db
      );

      expect(result.success).toBe(true);

      // Check reconciliation results
      const reconciliations = await db
        .selectFrom('revrec_reconciliations')
        .selectAll()
        .where('contract_id', '=', CONTRACT_ID)
        .where('period_start', '>=', '2024-01-01')
        .where('period_end', '<=', '2024-01-31')
        .execute();

      expect(reconciliations.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect amount variance', async () => {
      if (!db) return;

      // Create invoice with different amount
      const invoiceId = `inv_${uuid().replace(/-/g, '').substring(0, 20)}`;
      await db
        .insertInto('invoices')
        .values({
          id: invoiceId,
          tenant_id: TENANT_ID,
          snapshot_id: SNAPSHOT_ID,
          customer_id: CUSTOMER_ID,
          contract_id: CONTRACT_ID,
          invoice_number: 'INV-002',
          invoice_date: '2024-02-15',
          total: 8000,  // $2k less than expected
          currency: 'USD',
          status: 'paid',
          period_start: '2024-02-01',
          period_end: '2024-02-29',
          source_system: 'test',
          external_id: 'test_inv_2',
          metadata_json: {},
        })
        .execute();

      // Run reconciliation for February
      await processRevRecReconcileJob(
        {
          type: 'revrec.reconcile',
          tenantId: TENANT_ID,
          snapshotId: SNAPSHOT_ID,
          periodStart: '2024-02-01',
          periodEnd: '2024-02-29',
        },
        mockLogger,
        db
      );

      // Check for variance
      const reconciliations = await db
        .selectFrom('revrec_reconciliations')
        .selectAll()
        .where('contract_id', '=', CONTRACT_ID)
        .where('period_start', '>=', '2024-02-01')
        .where('period_end', '<=', '2024-02-29')
        .execute();

      expect(reconciliations.some(r => 
        r.status === 'amount_variance' || Math.abs(Number(r.variance_amount)) > 100
      )).toBe(true);
    });

    it('should flag missing invoice', async () => {
      if (!db) return;

      // Run reconciliation for March (no invoice created)
      await processRevRecReconcileJob(
        {
          type: 'revrec.reconcile',
          tenantId: TENANT_ID,
          snapshotId: SNAPSHOT_ID,
          periodStart: '2024-03-01',
          periodEnd: '2024-03-31',
        },
        mockLogger,
        db
      );

      // Check for missing invoice status
      const reconciliations = await db
        .selectFrom('revrec_reconciliations')
        .selectAll()
        .where('contract_id', '=', CONTRACT_ID)
        .where('period_start', '>=', '2024-03-01')
        .where('period_end', '<=', '2024-03-31')
        .execute();

      expect(reconciliations.some(r => r.status === 'missing_invoice')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle contract with no terms', async () => {
      if (!db) return;

      const newContractId = `cont_noterms_${uuid().replace(/-/g, '').substring(0, 12)}`;
      const newVersionId = `cver_noterms_${uuid().replace(/-/g, '').substring(0, 12)}`;

      await db.insertInto('contracts').values({
        id: newContractId,
        tenant_id: TENANT_ID,
        snapshot_id: SNAPSHOT_ID,
        customer_id: CUSTOMER_ID,
        name: 'Simple Contract',
        start_date: '2024-01-01',
        end_date: '2024-06-30',
        arr: 60000,
        currency: 'USD',
        status: 'active',
        source_system: 'test',
        external_id: 'test_contract_noterms',
        metadata_json: {},
      }).execute();

      await db.insertInto('contract_versions').values({
        id: newVersionId,
        tenant_id: TENANT_ID,
        snapshot_id: SNAPSHOT_ID,
        contract_id: newContractId,
        version: 1,
        effective_date: '2024-01-01',
        changes_json: {},
      }).execute();

      // Should still create obligation from ARR
      const result = await processRevRecComputeJob(
        {
          type: 'revrec.compute',
          tenantId: TENANT_ID,
          snapshotId: SNAPSHOT_ID,
          contractIds: [newContractId],
          forceRecompute: false,
        },
        mockLogger,
        db
      );

      expect(result.success).toBe(true);

      const obligations = await db
        .selectFrom('revenue_obligations')
        .selectAll()
        .where('contract_id', '=', newContractId)
        .execute();

      expect(obligations.length).toBeGreaterThanOrEqual(1);
      expect(Number(obligations[0].transaction_price)).toBe(60000);
    });

    it('should handle contract with zero ARR', async () => {
      if (!db) return;

      const newContractId = `cont_zero_${uuid().replace(/-/g, '').substring(0, 14)}`;
      const newVersionId = `cver_zero_${uuid().replace(/-/g, '').substring(0, 14)}`;

      await db.insertInto('contracts').values({
        id: newContractId,
        tenant_id: TENANT_ID,
        snapshot_id: SNAPSHOT_ID,
        customer_id: CUSTOMER_ID,
        name: 'Free Contract',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        arr: 0,
        currency: 'USD',
        status: 'active',
        source_system: 'test',
        external_id: 'test_contract_zero',
        metadata_json: {},
      }).execute();

      await db.insertInto('contract_versions').values({
        id: newVersionId,
        tenant_id: TENANT_ID,
        snapshot_id: SNAPSHOT_ID,
        contract_id: newContractId,
        version: 1,
        effective_date: '2024-01-01',
        changes_json: {},
      }).execute();

      // Should not create obligations for zero value
      const result = await processRevRecComputeJob(
        {
          type: 'revrec.compute',
          tenantId: TENANT_ID,
          snapshotId: SNAPSHOT_ID,
          contractIds: [newContractId],
          forceRecompute: false,
        },
        mockLogger,
        db
      );

      expect(result.success).toBe(true);

      const obligations = await db
        .selectFrom('revenue_obligations')
        .selectAll()
        .where('contract_id', '=', newContractId)
        .execute();

      expect(obligations.length).toBe(0);
    });
  });
});
