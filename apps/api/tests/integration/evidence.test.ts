/**
 * Evidence API Integration Tests (Phase 8)
 * 
 * Tests for evidence endpoints, including evidence retrieval,
 * summary, download, and regeneration.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { getDatabase, closeDatabase } from '@cogtics/db';
import type { Kysely } from 'kysely';
import type { Database } from '@cogtics/db';

// Mock data
const TEST_TENANT_ID = 'tenant_test_evidence';
const TEST_SNAPSHOT_ID = 'snap_test_evidence';
const TEST_RUN_ID = 'run_test_evidence';
const TEST_ISSUE_ID = 'iss_test_evidence_001';
const TEST_EVIDENCE_ID = 'evd_test_evidence_001';
const TEST_USER_ID = 'user_test_admin';

describe('Evidence API Integration Tests', () => {
  let app: FastifyInstance;
  let db: Kysely<Database>;
  let authToken: string;

  beforeAll(async () => {
    // Initialize database
    db = getDatabase({ connectionString: process.env.DATABASE_URL || 'postgresql://cogtics:cogtics@localhost:5432/cogtics' });
    
    // Create test tenant and user if needed
    await setupTestData(db);
    
    // Build Fastify app with routes
    app = Fastify({ logger: false });
    
    // Register minimal plugins for testing
    app.decorate('db', db);
    app.decorate('storage', null);
    app.decorate('queues', {
      'evidence.regenerate': {
        add: async () => ({ id: 'mock_job_id' }),
      },
    });
    
    // Add auth hook
    app.addHook('preHandler', async (request) => {
      request.tenantId = TEST_TENANT_ID;
      request.userId = TEST_USER_ID;
    });
    
    // Import and register issue routes
    const { default: issueRoutes } = await import('../../src/routes/issues/index.js');
    await app.register(issueRoutes, { prefix: '/issues' });
    
    await app.ready();
  });

  afterAll(async () => {
    await cleanupTestData(db);
    await app.close();
    await closeDatabase();
  });

  beforeEach(async () => {
    // Ensure test evidence exists for each test
    await ensureTestEvidence(db);
  });

  describe('GET /issues/:id/evidence', () => {
    it('should return evidence pack for valid issue', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/issues/${TEST_ISSUE_ID}/evidence`,
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty('evidence');
      expect(body.evidence.issueId).toBe(TEST_ISSUE_ID);
      expect(body.evidence.completenessScore).toBeGreaterThanOrEqual(0);
      expect(body.evidence.completenessScore).toBeLessThanOrEqual(1);
    });

    it('should include sources when requested', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/issues/${TEST_ISSUE_ID}/evidence?includeSources=true`,
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty('sources');
      expect(Array.isArray(body.sources)).toBe(true);
    });

    it('should include calculations when requested', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/issues/${TEST_ISSUE_ID}/evidence?includeCalculations=true`,
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty('calculations');
      expect(Array.isArray(body.calculations)).toBe(true);
    });

    it('should include clauses when requested', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/issues/${TEST_ISSUE_ID}/evidence?includeClauses=true`,
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty('clauses');
      expect(Array.isArray(body.clauses)).toBe(true);
    });

    it('should include audit trail when requested', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/issues/${TEST_ISSUE_ID}/evidence?includeAudit=true`,
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty('audit');
      expect(Array.isArray(body.audit)).toBe(true);
    });

    it('should return 404 for non-existent issue', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/issues/iss_nonexistent/evidence',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for issue without evidence', async () => {
      // Create issue without evidence
      const issueWithoutEvidence = 'iss_no_evidence_001';
      await createIssueWithoutEvidence(db, issueWithoutEvidence);

      const response = await app.inject({
        method: 'GET',
        url: `/issues/${issueWithoutEvidence}/evidence`,
      });

      expect(response.statusCode).toBe(404);
      
      // Cleanup
      await db.deleteFrom('issues').where('id', '=', issueWithoutEvidence).execute();
    });
  });

  describe('GET /issues/:id/evidence/summary', () => {
    it('should return evidence summary', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/issues/${TEST_ISSUE_ID}/evidence/summary`,
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty('issueId', TEST_ISSUE_ID);
      expect(body).toHaveProperty('evidenceVersion');
      expect(body).toHaveProperty('title');
      expect(body).toHaveProperty('summary');
      expect(body).toHaveProperty('completenessScore');
      expect(body).toHaveProperty('completenessBreakdown');
      expect(body).toHaveProperty('sourcesCount');
      expect(body).toHaveProperty('calculationsCount');
      expect(body).toHaveProperty('clausesCount');
    });

    it('should return 404 for non-existent evidence', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/issues/iss_nonexistent/evidence/summary',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /issues/:id/evidence/download', () => {
    it('should return 404 when no S3 artifact exists', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/issues/${TEST_ISSUE_ID}/evidence/download`,
      });

      // Our test evidence has no S3 key
      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /issues/:id/evidence/regenerate', () => {
    it('should trigger evidence regeneration', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/issues/${TEST_ISSUE_ID}/evidence/regenerate`,
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('jobId');
    });

    it('should accept force and reason parameters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/issues/${TEST_ISSUE_ID}/evidence/regenerate`,
        payload: {
          force: true,
          reason: 'Manual regeneration for audit',
        },
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
    });

    it('should return 404 for non-existent issue', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/issues/iss_nonexistent/evidence/regenerate',
        payload: {},
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Evidence Version Handling', () => {
    it('should return latest evidence version', async () => {
      // Create multiple versions
      await createMultipleEvidenceVersions(db);

      const response = await app.inject({
        method: 'GET',
        url: `/issues/${TEST_ISSUE_ID}/evidence`,
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.payload);
      // Should return the latest version
      expect(body.evidence.evidenceVersion).toBeGreaterThan(1);
    });
  });

  describe('Completeness Score Validation', () => {
    it('should have completeness score between 0 and 1', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/issues/${TEST_ISSUE_ID}/evidence`,
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.payload);
      const score = body.evidence.completenessScore;
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should have completeness breakdown with expected keys', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/issues/${TEST_ISSUE_ID}/evidence`,
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.payload);
      const breakdown = body.evidence.completenessBreakdown;
      
      expect(breakdown).toHaveProperty('source_coverage');
      expect(breakdown).toHaveProperty('contract_ready');
      expect(breakdown).toHaveProperty('calculation_reproducible');
      expect(breakdown).toHaveProperty('clause_linked');
    });
  });
});

// Helper functions for test data setup

async function setupTestData(db: Kysely<Database>) {
  // Clean up any existing test data first
  await cleanupTestData(db);

  // Create test tenant
  await db.insertInto('tenants').values({
    id: TEST_TENANT_ID,
    name: 'Test Tenant for Evidence',
    status: 'active',
  }).onConflict(c => c.column('id').doNothing()).execute();

  // Create test snapshot
  await db.insertInto('snapshots').values({
    id: TEST_SNAPSHOT_ID,
    tenant_id: TEST_TENANT_ID,
    status: 'complete',
    metadata_json: {},
    record_counts: {},
    quality_results: JSON.stringify([]),
  }).onConflict(c => c.column('id').doNothing()).execute();

  // Create test detection run
  await db.insertInto('detection_runs').values({
    id: TEST_RUN_ID,
    tenant_id: TEST_TENANT_ID,
    snapshot_id: TEST_SNAPSHOT_ID,
    ruleset_version: '1.0.0',
    status: 'completed',
    config_json: {},
    stats_json: {},
  }).onConflict(c => c.column('id').doNothing()).execute();

  // Create test issue
  await db.insertInto('issues').values({
    id: TEST_ISSUE_ID,
    tenant_id: TEST_TENANT_ID,
    snapshot_id: TEST_SNAPSHOT_ID,
    run_id: TEST_RUN_ID,
    rule_id: 'R001',
    rule_version: '1.0.0',
    issue_key: 'R001:test:001',
    category: 'billing',
    status: 'open',
    severity: 'medium',
    confidence: 0.85,
    impact_amount: 1000,
    currency: 'USD',
    expected_json: { amount: 10000 },
    actual_json: { amount: 9000 },
    dimensions_json: {},
    data_quality_flags: [],
    rule_metadata_json: {},
  }).onConflict(c => c.column('id').doNothing()).execute();
}

async function ensureTestEvidence(db: Kysely<Database>) {
  // Check if evidence exists
  const existing = await db
    .selectFrom('issue_evidence')
    .select('id')
    .where('id', '=', TEST_EVIDENCE_ID)
    .executeTakeFirst();

  if (existing) return;

  // Create test evidence
  await db.insertInto('issue_evidence').values({
    id: TEST_EVIDENCE_ID,
    tenant_id: TEST_TENANT_ID,
    snapshot_id: TEST_SNAPSHOT_ID,
    issue_id: TEST_ISSUE_ID,
    evidence_version: 1,
    evidence_type: 'full',
    title: 'Missing Invoice Evidence',
    summary: 'Invoice amount is less than expected based on contract terms.',
    data_json: {
      summary: 'Test evidence summary',
      expected: { amount: 10000 },
      actual: { amount: 9000 },
      variance: { amount: -1000, percentage: -10, direction: 'under', description: '-1000 USD under expected' },
    },
    completeness_score: 0.85,
    completeness_breakdown: {
      source_coverage: 1.0,
      contract_ready: 0.8,
      calculation_reproducible: 1.0,
      clause_linked: 0.6,
    },
    s3_key: null,
    rule_id: 'R001',
    rule_version: '1.0.0',
  }).execute();

  // Create test evidence sources
  await db.insertInto('issue_evidence_sources').values({
    id: 'evs_test_001',
    tenant_id: TEST_TENANT_ID,
    evidence_id: TEST_EVIDENCE_ID,
    issue_id: TEST_ISSUE_ID,
    source_type: 'contract',
    source_id: 'contract_001',
    source_system: 'salesforce',
    field_name: 'arr',
    field_value_json: { arr: 120000 },
  }).onConflict(c => c.column('id').doNothing()).execute();

  // Create test evidence calculation
  await db.insertInto('issue_evidence_calculations').values({
    id: 'evc_test_001',
    tenant_id: TEST_TENANT_ID,
    evidence_id: TEST_EVIDENCE_ID,
    issue_id: TEST_ISSUE_ID,
    calc_name: 'expected_amount',
    calc_type: 'expected_amount',
    formula: 'arr / 12',
    inputs_json: { arr: 120000, months: 12 },
    outputs_json: { expectedAmount: 10000 },
    rule_id: 'R001',
    rule_version: '1.0.0',
    sequence_number: 0,
    is_reproducible: true,
  }).onConflict(c => c.column('id').doNothing()).execute();

  // Create test evidence audit
  await db.insertInto('issue_evidence_audit').values({
    id: 'eva_test_001',
    tenant_id: TEST_TENANT_ID,
    issue_id: TEST_ISSUE_ID,
    evidence_id: TEST_EVIDENCE_ID,
    evidence_version: 1,
    action: 'generated',
    status: 'completed',
    trigger_type: 'auto',
    completeness_score: 0.85,
    processing_time_ms: 150,
    metadata_json: {},
    generated_at: new Date(),
  }).onConflict(c => c.column('id').doNothing()).execute();
}

async function createIssueWithoutEvidence(db: Kysely<Database>, issueId: string) {
  await db.insertInto('issues').values({
    id: issueId,
    tenant_id: TEST_TENANT_ID,
    snapshot_id: TEST_SNAPSHOT_ID,
    run_id: TEST_RUN_ID,
    rule_id: 'R002',
    rule_version: '1.0.0',
    issue_key: `R002:test:${issueId}`,
    category: 'billing',
    status: 'open',
    severity: 'low',
    confidence: 0.9,
    currency: 'USD',
    expected_json: {},
    actual_json: {},
    dimensions_json: {},
    data_quality_flags: [],
    rule_metadata_json: {},
  }).onConflict(c => c.column('id').doNothing()).execute();
}

async function createMultipleEvidenceVersions(db: Kysely<Database>) {
  // Create version 2
  await db.insertInto('issue_evidence').values({
    id: 'evd_test_evidence_v2',
    tenant_id: TEST_TENANT_ID,
    snapshot_id: TEST_SNAPSHOT_ID,
    issue_id: TEST_ISSUE_ID,
    evidence_version: 2,
    evidence_type: 'full',
    title: 'Missing Invoice Evidence (Updated)',
    summary: 'Updated evidence after regeneration.',
    data_json: {},
    completeness_score: 0.9,
    completeness_breakdown: {
      source_coverage: 1.0,
      contract_ready: 0.9,
      calculation_reproducible: 1.0,
      clause_linked: 0.8,
    },
    s3_key: null,
    rule_id: 'R001',
    rule_version: '1.0.0',
  }).onConflict(c => c.column('id').doNothing()).execute();
}

async function cleanupTestData(db: Kysely<Database>) {
  try {
    // Delete in reverse order of dependencies
    await db.deleteFrom('issue_evidence_audit').where('tenant_id', '=', TEST_TENANT_ID).execute();
    await db.deleteFrom('issue_evidence_clauses').where('tenant_id', '=', TEST_TENANT_ID).execute();
    await db.deleteFrom('issue_evidence_calculations').where('tenant_id', '=', TEST_TENANT_ID).execute();
    await db.deleteFrom('issue_evidence_sources').where('tenant_id', '=', TEST_TENANT_ID).execute();
    await db.deleteFrom('issue_evidence').where('tenant_id', '=', TEST_TENANT_ID).execute();
    await db.deleteFrom('evidence_generation_runs').where('tenant_id', '=', TEST_TENANT_ID).execute();
    await db.deleteFrom('issue_sources').where('tenant_id', '=', TEST_TENANT_ID).execute();
    await db.deleteFrom('issue_status_history').where('tenant_id', '=', TEST_TENANT_ID).execute();
    await db.deleteFrom('issues').where('tenant_id', '=', TEST_TENANT_ID).execute();
    await db.deleteFrom('detection_runs').where('tenant_id', '=', TEST_TENANT_ID).execute();
    await db.deleteFrom('snapshots').where('tenant_id', '=', TEST_TENANT_ID).execute();
    await db.deleteFrom('tenants').where('id', '=', TEST_TENANT_ID).execute();
  } catch (e) {
    // Ignore cleanup errors
  }
}
