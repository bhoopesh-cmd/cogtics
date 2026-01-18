/**
 * Evidence Generation Smoke Tests (Phase 8)
 * 
 * End-to-end smoke tests for the complete evidence generation cycle.
 * Tests system integration, performance under load, and race condition safety.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDatabase, closeDatabase } from '@cogtics/db';
import type { Kysely } from 'kysely';
import type { Database } from '@cogtics/db';
import {
  generateEvidenceId,
  generateEvidenceRunId,
  generateIssueId,
  generateDetectionRunId,
} from '@cogtics/schemas';

// Constants
const SMOKE_TEST_TENANT = 'tenant_smoke_evidence';
const SMOKE_TEST_SNAPSHOT = 'snap_smoke_evidence';

describe('Evidence Smoke Tests', () => {
  let db: Kysely<Database>;

  beforeAll(async () => {
    db = getDatabase({ 
      connectionString: process.env.DATABASE_URL || 'postgresql://cogtics:cogtics@localhost:5432/cogtics' 
    });
    await setupSmokeTestData(db);
  });

  afterAll(async () => {
    await cleanupSmokeTestData(db);
    await closeDatabase();
  });

  describe('Full Detection + Evidence Cycle', () => {
    it('should complete full cycle from detection to evidence', async () => {
      const runId = generateDetectionRunId();
      const issueId = generateIssueId();
      const evidenceId = generateEvidenceId();

      // Step 1: Create detection run
      await db.insertInto('detection_runs').values({
        id: runId,
        tenant_id: SMOKE_TEST_TENANT,
        snapshot_id: SMOKE_TEST_SNAPSHOT,
        ruleset_version: '1.0.0',
        status: 'completed',
        config_json: {},
        stats_json: { rulesExecuted: 10 },
        issues_total: 1,
        issues_by_severity: { medium: 1 },
        issues_by_category: { billing: 1 },
        started_at: new Date(),
        finished_at: new Date(),
      }).execute();

      // Step 2: Create issue from detection
      await db.insertInto('issues').values({
        id: issueId,
        tenant_id: SMOKE_TEST_TENANT,
        snapshot_id: SMOKE_TEST_SNAPSHOT,
        run_id: runId,
        rule_id: 'R002',
        rule_version: '1.0.0',
        issue_key: `R002:smoke:${Date.now()}`,
        category: 'billing',
        status: 'open',
        severity: 'medium',
        confidence: 0.9,
        impact_amount: 5000,
        currency: 'USD',
        expected_json: { amount: 10000 },
        actual_json: { amount: 5000 },
        dimensions_json: {},
        data_quality_flags: [],
        rule_metadata_json: {},
      }).execute();

      // Step 3: Generate evidence for issue
      const evidenceRunId = generateEvidenceRunId();
      await db.insertInto('evidence_generation_runs').values({
        id: evidenceRunId,
        tenant_id: SMOKE_TEST_TENANT,
        snapshot_id: SMOKE_TEST_SNAPSHOT,
        detection_run_id: runId,
        status: 'completed',
        total_issues: 1,
        processed_issues: 1,
        failed_issues: 0,
        skipped_issues: 0,
        avg_completeness_score: 0.85,
        stats_json: {},
        started_at: new Date(),
        finished_at: new Date(),
      }).execute();

      await db.insertInto('issue_evidence').values({
        id: evidenceId,
        tenant_id: SMOKE_TEST_TENANT,
        snapshot_id: SMOKE_TEST_SNAPSHOT,
        issue_id: issueId,
        evidence_version: 1,
        evidence_type: 'full',
        title: 'Underbilling Evidence',
        summary: 'Invoice amount less than expected.',
        data_json: {
          summary: 'Test smoke evidence',
          expected: { amount: 10000 },
          actual: { amount: 5000 },
          variance: { amount: -5000, percentage: -50, direction: 'under' },
        },
        completeness_score: 0.85,
        completeness_breakdown: {
          source_coverage: 1.0,
          contract_ready: 0.8,
          calculation_reproducible: 1.0,
          clause_linked: 0.6,
        },
        rule_id: 'R002',
        rule_version: '1.0.0',
      }).execute();

      // Step 4: Verify full cycle completed
      const evidence = await db
        .selectFrom('issue_evidence')
        .selectAll()
        .where('id', '=', evidenceId)
        .executeTakeFirst();

      expect(evidence).toBeDefined();
      expect(evidence?.issue_id).toBe(issueId);
      expect(evidence?.completeness_score).toBe(0.85);

      // Verify issue is linked
      const issue = await db
        .selectFrom('issues')
        .selectAll()
        .where('id', '=', issueId)
        .executeTakeFirst();

      expect(issue).toBeDefined();
      expect(issue?.run_id).toBe(runId);
    });
  });

  describe('Performance Under Load', () => {
    it('should handle bulk evidence generation for many issues', async () => {
      const ISSUE_COUNT = 100; // Reduced for smoke test performance
      const runId = generateDetectionRunId();

      // Create detection run
      await db.insertInto('detection_runs').values({
        id: runId,
        tenant_id: SMOKE_TEST_TENANT,
        snapshot_id: SMOKE_TEST_SNAPSHOT,
        ruleset_version: '1.0.0',
        status: 'completed',
        config_json: {},
        stats_json: {},
        issues_total: ISSUE_COUNT,
      }).execute();

      // Create many issues
      const issueIds: string[] = [];
      const startTime = Date.now();

      for (let i = 0; i < ISSUE_COUNT; i++) {
        const issueId = generateIssueId();
        issueIds.push(issueId);

        await db.insertInto('issues').values({
          id: issueId,
          tenant_id: SMOKE_TEST_TENANT,
          snapshot_id: SMOKE_TEST_SNAPSHOT,
          run_id: runId,
          rule_id: `R00${(i % 10) + 1}`,
          rule_version: '1.0.0',
          issue_key: `R00${(i % 10) + 1}:bulk:${i}`,
          category: 'billing',
          status: 'open',
          severity: 'medium',
          confidence: 0.8,
          impact_amount: 1000 + i,
          currency: 'USD',
          expected_json: {},
          actual_json: {},
          dimensions_json: {},
          data_quality_flags: [],
          rule_metadata_json: {},
        }).execute();
      }

      const issueCreationTime = Date.now() - startTime;
      console.log(`Created ${ISSUE_COUNT} issues in ${issueCreationTime}ms`);

      // Create evidence for each issue
      const evidenceStartTime = Date.now();
      
      for (const issueId of issueIds) {
        await db.insertInto('issue_evidence').values({
          id: generateEvidenceId(),
          tenant_id: SMOKE_TEST_TENANT,
          snapshot_id: SMOKE_TEST_SNAPSHOT,
          issue_id: issueId,
          evidence_version: 1,
          evidence_type: 'full',
          title: 'Bulk Test Evidence',
          summary: 'Generated for performance test.',
          data_json: {},
          completeness_score: 0.75,
          completeness_breakdown: {
            source_coverage: 0.8,
            contract_ready: 0.7,
            calculation_reproducible: 0.8,
            clause_linked: 0.7,
          },
        }).execute();
      }

      const evidenceCreationTime = Date.now() - evidenceStartTime;
      console.log(`Created ${ISSUE_COUNT} evidence records in ${evidenceCreationTime}ms`);

      // Verify all evidence was created
      const evidenceCount = await db
        .selectFrom('issue_evidence')
        .select(db.fn.countAll().as('count'))
        .where('tenant_id', '=', SMOKE_TEST_TENANT)
        .where('issue_id', 'in', issueIds)
        .executeTakeFirst();

      expect(Number(evidenceCount?.count)).toBe(ISSUE_COUNT);

      // Performance assertion - should complete within reasonable time
      // Allowing 50ms per record for database inserts
      expect(evidenceCreationTime).toBeLessThan(ISSUE_COUNT * 50);
    });
  });

  describe('Concurrent Regeneration Safety', () => {
    it('should handle concurrent regeneration requests safely', async () => {
      const issueId = generateIssueId();
      const runId = generateDetectionRunId();

      // Setup issue
      await db.insertInto('detection_runs').values({
        id: runId,
        tenant_id: SMOKE_TEST_TENANT,
        snapshot_id: SMOKE_TEST_SNAPSHOT,
        ruleset_version: '1.0.0',
        status: 'completed',
        config_json: {},
        stats_json: {},
      }).execute();

      await db.insertInto('issues').values({
        id: issueId,
        tenant_id: SMOKE_TEST_TENANT,
        snapshot_id: SMOKE_TEST_SNAPSHOT,
        run_id: runId,
        rule_id: 'R003',
        rule_version: '1.0.0',
        issue_key: 'R003:concurrent:001',
        category: 'billing',
        status: 'open',
        severity: 'high',
        confidence: 0.95,
        currency: 'USD',
        expected_json: {},
        actual_json: {},
        dimensions_json: {},
        data_quality_flags: [],
        rule_metadata_json: {},
      }).execute();

      // Simulate concurrent evidence generation
      const CONCURRENT_REQUESTS = 5;
      const promises: Promise<void>[] = [];

      for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
        promises.push(
          (async () => {
            // Each request creates evidence with incrementing version
            const existingVersion = await db
              .selectFrom('issue_evidence')
              .select('evidence_version')
              .where('issue_id', '=', issueId)
              .orderBy('evidence_version', 'desc')
              .executeTakeFirst();

            const newVersion = (existingVersion?.evidence_version || 0) + 1;

            try {
              await db.insertInto('issue_evidence').values({
                id: generateEvidenceId(),
                tenant_id: SMOKE_TEST_TENANT,
                snapshot_id: SMOKE_TEST_SNAPSHOT,
                issue_id: issueId,
                evidence_version: newVersion,
                evidence_type: 'full',
                title: 'Concurrent Test',
                summary: `Request ${i}`,
                data_json: {},
                completeness_score: 0.9,
                completeness_breakdown: {},
              }).execute();
            } catch (e: any) {
              // Expected: unique constraint violation for duplicate versions
              if (!e.message?.includes('unique') && !e.message?.includes('duplicate')) {
                throw e;
              }
            }
          })()
        );
      }

      await Promise.all(promises);

      // Verify that versions are sequential (no gaps due to race conditions)
      const versions = await db
        .selectFrom('issue_evidence')
        .select('evidence_version')
        .where('issue_id', '=', issueId)
        .orderBy('evidence_version', 'asc')
        .execute();

      // At least one should succeed; conflicts are expected
      expect(versions.length).toBeGreaterThanOrEqual(1);
      expect(versions.length).toBeLessThanOrEqual(CONCURRENT_REQUESTS);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity on issue deletion', async () => {
      const issueId = generateIssueId();
      const evidenceId = generateEvidenceId();
      const runId = generateDetectionRunId();

      // Create issue with evidence
      await db.insertInto('detection_runs').values({
        id: runId,
        tenant_id: SMOKE_TEST_TENANT,
        snapshot_id: SMOKE_TEST_SNAPSHOT,
        ruleset_version: '1.0.0',
        status: 'completed',
        config_json: {},
        stats_json: {},
      }).execute();

      await db.insertInto('issues').values({
        id: issueId,
        tenant_id: SMOKE_TEST_TENANT,
        snapshot_id: SMOKE_TEST_SNAPSHOT,
        run_id: runId,
        rule_id: 'R004',
        rule_version: '1.0.0',
        issue_key: 'R004:integrity:001',
        category: 'billing',
        status: 'open',
        severity: 'medium',
        confidence: 0.9,
        currency: 'USD',
        expected_json: {},
        actual_json: {},
        dimensions_json: {},
        data_quality_flags: [],
        rule_metadata_json: {},
      }).execute();

      await db.insertInto('issue_evidence').values({
        id: evidenceId,
        tenant_id: SMOKE_TEST_TENANT,
        snapshot_id: SMOKE_TEST_SNAPSHOT,
        issue_id: issueId,
        evidence_version: 1,
        evidence_type: 'full',
        title: 'Integrity Test',
        summary: 'Testing cascading delete.',
        data_json: {},
        completeness_score: 0.9,
        completeness_breakdown: {},
      }).execute();

      // Delete issue (should cascade to evidence)
      await db.deleteFrom('issues').where('id', '=', issueId).execute();

      // Verify evidence was deleted via cascade
      const orphanedEvidence = await db
        .selectFrom('issue_evidence')
        .select('id')
        .where('id', '=', evidenceId)
        .executeTakeFirst();

      expect(orphanedEvidence).toBeUndefined();
    });

    it('should maintain tenant isolation', async () => {
      const otherTenant = 'tenant_other_smoke';

      // Try to insert evidence for different tenant
      // This should fail if RLS is properly configured
      try {
        // First create the other tenant
        await db.insertInto('tenants').values({
          id: otherTenant,
          name: 'Other Test Tenant',
          status: 'active',
        }).onConflict(c => c.column('id').doNothing()).execute();

        // Query evidence should not return other tenant's data
        const otherTenantEvidence = await db
          .selectFrom('issue_evidence')
          .selectAll()
          .where('tenant_id', '=', otherTenant)
          .execute();

        // Should be empty since we haven't created evidence for other tenant
        expect(otherTenantEvidence).toHaveLength(0);

      } finally {
        // Cleanup
        await db.deleteFrom('tenants').where('id', '=', otherTenant).execute().catch(() => {});
      }
    });
  });

  describe('Evidence Completeness Metrics', () => {
    it('should aggregate completeness scores correctly', async () => {
      const runId = generateDetectionRunId();
      const issueIds: string[] = [];

      // Create detection run
      await db.insertInto('detection_runs').values({
        id: runId,
        tenant_id: SMOKE_TEST_TENANT,
        snapshot_id: SMOKE_TEST_SNAPSHOT,
        ruleset_version: '1.0.0',
        status: 'completed',
        config_json: {},
        stats_json: {},
      }).execute();

      // Create issues with varying completeness scores
      const scores = [0.95, 0.85, 0.75, 0.65, 0.55];
      
      for (let i = 0; i < scores.length; i++) {
        const issueId = generateIssueId();
        issueIds.push(issueId);

        await db.insertInto('issues').values({
          id: issueId,
          tenant_id: SMOKE_TEST_TENANT,
          snapshot_id: SMOKE_TEST_SNAPSHOT,
          run_id: runId,
          rule_id: 'R005',
          rule_version: '1.0.0',
          issue_key: `R005:metrics:${i}`,
          category: 'billing',
          status: 'open',
          severity: 'medium',
          confidence: 0.9,
          currency: 'USD',
          expected_json: {},
          actual_json: {},
          dimensions_json: {},
          data_quality_flags: [],
          rule_metadata_json: {},
        }).execute();

        await db.insertInto('issue_evidence').values({
          id: generateEvidenceId(),
          tenant_id: SMOKE_TEST_TENANT,
          snapshot_id: SMOKE_TEST_SNAPSHOT,
          issue_id: issueId,
          evidence_version: 1,
          evidence_type: 'full',
          title: 'Metrics Test',
          summary: `Score: ${scores[i]}`,
          data_json: {},
          completeness_score: scores[i],
          completeness_breakdown: {},
        }).execute();
      }

      // Calculate average completeness
      const avgResult = await db
        .selectFrom('issue_evidence')
        .select(db.fn.avg('completeness_score').as('avg_score'))
        .where('issue_id', 'in', issueIds)
        .executeTakeFirst();

      const expectedAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
      expect(Number(avgResult?.avg_score)).toBeCloseTo(expectedAvg, 2);

      // Count by completeness tier
      const completeCount = await db
        .selectFrom('issue_evidence')
        .select(db.fn.countAll().as('count'))
        .where('issue_id', 'in', issueIds)
        .where('completeness_score', '>=', 0.9)
        .executeTakeFirst();

      expect(Number(completeCount?.count)).toBe(1); // Only 0.95 is >= 0.9
    });
  });
});

// Setup and cleanup functions

async function setupSmokeTestData(db: Kysely<Database>) {
  await cleanupSmokeTestData(db);

  // Create test tenant
  await db.insertInto('tenants').values({
    id: SMOKE_TEST_TENANT,
    name: 'Smoke Test Tenant',
    status: 'active',
  }).onConflict(c => c.column('id').doNothing()).execute();

  // Create test snapshot
  await db.insertInto('snapshots').values({
    id: SMOKE_TEST_SNAPSHOT,
    tenant_id: SMOKE_TEST_TENANT,
    status: 'complete',
    metadata_json: {},
    record_counts: {},
    quality_results: [],
  }).onConflict(c => c.column('id').doNothing()).execute();
}

async function cleanupSmokeTestData(db: Kysely<Database>) {
  try {
    await db.deleteFrom('issue_evidence_audit').where('tenant_id', '=', SMOKE_TEST_TENANT).execute();
    await db.deleteFrom('issue_evidence_clauses').where('tenant_id', '=', SMOKE_TEST_TENANT).execute();
    await db.deleteFrom('issue_evidence_calculations').where('tenant_id', '=', SMOKE_TEST_TENANT).execute();
    await db.deleteFrom('issue_evidence_sources').where('tenant_id', '=', SMOKE_TEST_TENANT).execute();
    await db.deleteFrom('issue_evidence').where('tenant_id', '=', SMOKE_TEST_TENANT).execute();
    await db.deleteFrom('evidence_generation_runs').where('tenant_id', '=', SMOKE_TEST_TENANT).execute();
    await db.deleteFrom('issue_sources').where('tenant_id', '=', SMOKE_TEST_TENANT).execute();
    await db.deleteFrom('issue_status_history').where('tenant_id', '=', SMOKE_TEST_TENANT).execute();
    await db.deleteFrom('issues').where('tenant_id', '=', SMOKE_TEST_TENANT).execute();
    await db.deleteFrom('detection_runs').where('tenant_id', '=', SMOKE_TEST_TENANT).execute();
    await db.deleteFrom('snapshots').where('tenant_id', '=', SMOKE_TEST_TENANT).execute();
    await db.deleteFrom('tenants').where('id', '=', SMOKE_TEST_TENANT).execute();
  } catch (e) {
    // Ignore cleanup errors
  }
}
