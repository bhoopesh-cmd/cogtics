/**
 * Identity Resolution Integration Tests
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import type { Database } from '@cogtics/db';
import { identity } from '@cogtics/utils';
import {
  computeMatchScore,
  applyThresholds,
  DEFAULT_IDENTITY_CONFIG,
} from '@cogtics/schemas';

// Skip tests if DATABASE_URL not set
const SKIP_DB_TESTS = !process.env.DATABASE_URL;

describe('Identity Resolution Integration Tests', () => {
  let db: Kysely<Database>;
  let tenantId: string;
  let snapshotId: string;

  beforeAll(async () => {
    if (SKIP_DB_TESTS) {
      console.error('Skipping integration tests: DATABASE_URL not set');
      return;
    }

    // Setup database connection
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool }),
    });

    // Create test tenant
    tenantId = `test_tenant_${Date.now()}`;
    await db.insertInto('tenants').values({
      id: tenantId,
      name: 'Test Tenant',
      status: 'active',
    }).execute();

    // Set RLS context
    await sql`SELECT set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
  });

  afterAll(async () => {
    if (SKIP_DB_TESTS) return;
    // Cleanup
    try {
      await db.deleteFrom('identity_suppressions').where('tenant_id', '=', tenantId).execute();
      await db.deleteFrom('identity_decisions').where('tenant_id', '=', tenantId).execute();
      await db.deleteFrom('identity_tasks').where('tenant_id', '=', tenantId).execute();
      await db.deleteFrom('identity_candidates').where('tenant_id', '=', tenantId).execute();
      await db.deleteFrom('customer_identity_members').where('tenant_id', '=', tenantId).execute();
      await db.deleteFrom('customer_identities').where('tenant_id', '=', tenantId).execute();
      await db.deleteFrom('identity_runs').where('tenant_id', '=', tenantId).execute();
      await db.deleteFrom('customers').where('tenant_id', '=', tenantId).execute();
      await db.deleteFrom('snapshots').where('tenant_id', '=', tenantId).execute();
      await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
    await db.destroy();
  });

  beforeEach(async () => {
    if (SKIP_DB_TESTS) return;
    // Create test snapshot
    snapshotId = `snap_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
    await db.insertInto('snapshots').values({
      id: snapshotId,
      tenant_id: tenantId,
      status: 'complete',
      record_counts: {},
      quality_results: JSON.stringify([]),
    }).execute();
  });

  describe('Matching Utilities', () => {
    it('should normalize company names correctly', () => {
      expect(identity.normalizeCompanyName('Acme Inc.')).toBe('acme');
      expect(identity.normalizeCompanyName('Tech Solutions LLC')).toBe('tech solutions');
      // Note: 'global' is treated as a corporate suffix and removed
      expect(identity.normalizeCompanyName('Microsoft Corporation')).toBe('microsoft');
    });

    it('should extract domains from emails', () => {
      expect(identity.extractDomain('john@acme.com')).toBe('acme.com');
      expect(identity.extractDomain('jane@gmail.com')).toBeNull(); // Personal email excluded
      expect(identity.extractDomain('invalid')).toBeNull();
    });

    it('should compute Jaro-Winkler similarity', () => {
      expect(identity.jaroWinkler('acme', 'acme')).toBe(1);
      expect(identity.jaroWinkler('acme', 'acme corp')).toBeGreaterThan(0.7);
      expect(identity.jaroWinkler('acme', 'xyz')).toBeLessThan(0.5);
    });

    it('should generate blocking keys', () => {
      const customer = {
        id: 'cust_1',
        name: 'Acme Inc.',
        email: 'contact@acme.com',
        external_id: 'ext_1',
        source_system: 'stripe',
      };

      const keys = identity.generateBlockingKeys(customer, ['domain', 'normalized_name']);
      expect(keys.has('domain')).toBe(true);
      expect(keys.get('domain')).toBe('domain:acme.com');
    });

    it('should compute match features between customers', () => {
      const customerA = {
        id: 'cust_1',
        name: 'Acme Inc.',
        email: 'contact@acme.com',
        external_id: 'ext_1',
        source_system: 'stripe',
      };

      const customerB = {
        id: 'cust_2',
        name: 'Acme Corporation',
        email: 'sales@acme.com',
        external_id: 'ext_2',
        source_system: 'salesforce',
      };

      const features = identity.computeMatchFeatures(customerA, customerB);
      
      expect(features.name_similarity).toBeGreaterThan(0.7);
      expect(features.domain_match).toBe(true);
      expect(features.external_id_overlap).toBe(false);
    });
  });

  describe('Scoring and Thresholds', () => {
    it('should compute match scores correctly', () => {
      const highConfidenceFeatures = {
        name_similarity: 0.95,
        domain_match: true,
        tax_id_match: true,
        address_match: true,
        external_id_overlap: false,
      };

      const score = identity.computeMatchScore(highConfidenceFeatures);
      expect(score).toBeGreaterThanOrEqual(90);
    });

    it('should apply auto-merge threshold correctly', () => {
      const decision = identity.applyThresholds(95, DEFAULT_IDENTITY_CONFIG);
      expect(decision).toBe('auto_merge');
    });

    it('should apply review threshold correctly', () => {
      const decision = identity.applyThresholds(80, DEFAULT_IDENTITY_CONFIG);
      expect(decision).toBe('review');
    });

    it('should skip low-confidence pairs', () => {
      const decision = identity.applyThresholds(50, DEFAULT_IDENTITY_CONFIG);
      expect(decision).toBe('skip');
    });
  });

  describe('Candidate Generation', () => {
    it('should generate candidate pairs from customers', async () => {
      const customers = [
        {
          id: 'cust_1',
          name: 'Acme Inc.',
          email: 'contact@acme.com',
          external_id: 'ext_1',
          source_system: 'stripe',
        },
        {
          id: 'cust_2',
          name: 'Acme Corporation',
          email: 'sales@acme.com',
          external_id: 'ext_2',
          source_system: 'salesforce',
        },
        {
          id: 'cust_3',
          name: 'Totally Different Co',
          email: 'info@different.com',
          external_id: 'ext_3',
          source_system: 'stripe',
        },
      ];

      const pairs = identity.generateCandidatePairs(customers, ['domain', 'normalized_name']);
      
      // Should find pair between cust_1 and cust_2 (same domain)
      expect(pairs.length).toBeGreaterThanOrEqual(1);
      
      const acmePair = pairs.find(
        p => (p.idA === 'cust_1' && p.idB === 'cust_2') || (p.idA === 'cust_2' && p.idB === 'cust_1')
      );
      expect(acmePair).toBeDefined();
    });

    it('should respect suppression list', () => {
      const customers = [
        {
          id: 'cust_1',
          name: 'Acme Inc.',
          email: 'contact@acme.com',
          external_id: 'ext_1',
          source_system: 'stripe',
        },
        {
          id: 'cust_2',
          name: 'Acme Corporation',
          email: 'sales@acme.com',
          external_id: 'ext_2',
          source_system: 'salesforce',
        },
      ];

      // Suppress the pair
      const suppressedPairs = new Set(['cust_1:cust_2']);

      const pairs = identity.generateCandidatePairs(customers, ['domain'], suppressedPairs);
      expect(pairs.length).toBe(0);
    });
  });

  describe.skipIf(SKIP_DB_TESTS)('Database Operations', () => {
    it('should create identity run record', async () => {
      const runId = `irun_${Date.now()}`;

      await db.insertInto('identity_runs').values({
        id: runId,
        tenant_id: tenantId,
        snapshot_id: snapshotId,
        status: 'pending',
        rules_version: 'v1',
        config_json: { auto_merge_threshold: 90 },
        stats_json: {},
      }).execute();

      const run = await db
        .selectFrom('identity_runs')
        .selectAll()
        .where('id', '=', runId)
        .executeTakeFirst();

      expect(run).toBeDefined();
      expect(run?.status).toBe('pending');
    });

    it('should create and query identity candidates', async () => {
      // Insert test customers
      const custA = `cust_a_${Date.now()}`;
      const custB = `cust_b_${Date.now()}`;

      await db.insertInto('customers').values([
        {
          id: custA,
          tenant_id: tenantId,
          snapshot_id: snapshotId,
          name: 'Test Customer A',
          email: 'a@test.com',
          external_id: 'ext_a',
          source_system: 'stripe',
          status: 'active',
          metadata_json: {},
        },
        {
          id: custB,
          tenant_id: tenantId,
          snapshot_id: snapshotId,
          name: 'Test Customer B',
          email: 'b@test.com',
          external_id: 'ext_b',
          source_system: 'salesforce',
          status: 'active',
          metadata_json: {},
        },
      ]).execute();

      // Create candidate
      const candidateId = `icand_${Date.now()}`;
      await db.insertInto('identity_candidates').values({
        id: candidateId,
        tenant_id: tenantId,
        snapshot_id: snapshotId,
        customer_id_a: custA,
        customer_id_b: custB,
        score: 85,
        features_json: { name_similarity: 0.9, domain_match: true },
        blocking_keys: ['domain:test.com'],
        status: 'pending',
      }).execute();

      const candidate = await db
        .selectFrom('identity_candidates')
        .selectAll()
        .where('id', '=', candidateId)
        .executeTakeFirst();

      expect(candidate).toBeDefined();
      expect(Number(candidate?.score)).toBe(85);
    });

    it('should create identity and add members', async () => {
      // Insert test customer
      const custId = `cust_${Date.now()}`;
      await db.insertInto('customers').values({
        id: custId,
        tenant_id: tenantId,
        snapshot_id: snapshotId,
        name: 'Identity Test Customer',
        email: 'ident@test.com',
        external_id: 'ext_ident',
        source_system: 'stripe',
        status: 'active',
        metadata_json: {},
      }).execute();

      // Create identity
      const identityId = `ident_${Date.now()}`;
      await db.insertInto('customer_identities').values({
        id: identityId,
        tenant_id: tenantId,
        snapshot_id: snapshotId,
        primary_customer_id: custId,
        confidence: 95,
        method: 'auto',
        member_count: 1,
        source_systems: ['stripe'],
      }).execute();

      // Add member
      const memberId = `imem_${Date.now()}`;
      await db.insertInto('customer_identity_members').values({
        id: memberId,
        tenant_id: tenantId,
        snapshot_id: snapshotId,
        identity_id: identityId,
        customer_id: custId,
        source_system: 'stripe',
        external_id: 'ext_ident',
        confidence: 95,
        role: 'primary',
        added_method: 'auto',
      }).execute();

      // Query
      const members = await db
        .selectFrom('customer_identity_members')
        .selectAll()
        .where('identity_id', '=', identityId)
        .execute();

      expect(members.length).toBe(1);
      expect(members[0].role).toBe('primary');
    });

    it('should create suppression record', async () => {
      const suppId = `isup_${Date.now()}`;
      await db.insertInto('identity_suppressions').values({
        id: suppId,
        tenant_id: tenantId,
        customer_id_a: 'cust_x',
        customer_id_b: 'cust_y',
        reason: 'Test suppression',
      }).execute();

      const suppression = await db
        .selectFrom('identity_suppressions')
        .selectAll()
        .where('id', '=', suppId)
        .executeTakeFirst();

      expect(suppression).toBeDefined();
      expect(suppression?.reason).toBe('Test suppression');
    });
  });

  describe.skipIf(SKIP_DB_TESTS)('Decision Workflow', () => {
    it('should record decision and update task status', async () => {
      // Setup: create customer, candidate, and task
      const custA = `cust_dec_a_${Date.now()}`;
      const custB = `cust_dec_b_${Date.now()}`;

      await db.insertInto('customers').values([
        {
          id: custA,
          tenant_id: tenantId,
          snapshot_id: snapshotId,
          name: 'Decision Test A',
          email: 'deca@test.com',
          external_id: 'ext_deca',
          source_system: 'stripe',
          status: 'active',
          metadata_json: {},
        },
        {
          id: custB,
          tenant_id: tenantId,
          snapshot_id: snapshotId,
          name: 'Decision Test B',
          email: 'decb@test.com',
          external_id: 'ext_decb',
          source_system: 'salesforce',
          status: 'active',
          metadata_json: {},
        },
      ]).execute();

      const candidateId = `icand_dec_${Date.now()}`;
      await db.insertInto('identity_candidates').values({
        id: candidateId,
        tenant_id: tenantId,
        snapshot_id: snapshotId,
        customer_id_a: custA,
        customer_id_b: custB,
        score: 82,
        features_json: {},
        blocking_keys: [],
        status: 'pending',
      }).execute();

      const taskId = `itask_${Date.now()}`;
      await db.insertInto('identity_tasks').values({
        id: taskId,
        tenant_id: tenantId,
        snapshot_id: snapshotId,
        candidate_id: candidateId,
        status: 'pending',
        priority: 82,
      }).execute();

      // Record decision
      const decisionId = `idec_${Date.now()}`;
      await db.insertInto('identity_decisions').values({
        id: decisionId,
        tenant_id: tenantId,
        snapshot_id: snapshotId,
        task_id: taskId,
        candidate_id: candidateId,
        decision: 'confirm',
        notes: 'Test confirmation',
        metadata_json: {},
      }).execute();

      // Update task status
      await db.updateTable('identity_tasks')
        .set({ status: 'resolved', resolved_at: new Date() })
        .where('id', '=', taskId)
        .execute();

      // Verify
      const task = await db
        .selectFrom('identity_tasks')
        .selectAll()
        .where('id', '=', taskId)
        .executeTakeFirst();

      expect(task?.status).toBe('resolved');

      const decision = await db
        .selectFrom('identity_decisions')
        .selectAll()
        .where('id', '=', decisionId)
        .executeTakeFirst();

      expect(decision?.decision).toBe('confirm');
    });
  });
});
