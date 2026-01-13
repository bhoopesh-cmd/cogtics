/**
 * Identity Resolution Processor
 * 
 * Runs deterministic matching on customers in a snapshot.
 */
import type { Logger } from 'pino';
import type { Kysely } from 'kysely';
import type { Database } from '@cogtics/db';
import {
  type IdentityResolveJobPayload,
  type MatchFeatures,
  DEFAULT_IDENTITY_CONFIG,
  createCustomerIdentityId,
  createIdentityMemberId,
  createIdentityCandidateId,
  createIdentityTaskId,
} from '@cogtics/schemas';
import {
  identity,
} from '@cogtics/utils';

interface JobResult {
  success: boolean;
  message: string;
  data?: unknown;
  processingTimeMs?: number;
}

/**
 * Process identity resolution job
 */
export async function processIdentityResolveJob(
  payload: IdentityResolveJobPayload,
  logger: Logger,
  db: Kysely<Database>
): Promise<JobResult> {
  const { tenantId, snapshotId, runId, config: inputConfig } = payload;
  const startTime = Date.now();
  const config = { ...DEFAULT_IDENTITY_CONFIG, ...inputConfig };

  logger.info({ snapshotId, runId }, 'Starting identity resolution');

  // Update run status to running
  await db
    .updateTable('identity_runs')
    .set({ status: 'running', config_json: config })
    .where('id', '=', runId)
    .execute();

  try {
    // Load customers for this snapshot
    const customers = await db
      .selectFrom('customers')
      .select(['id', 'name', 'email', 'external_id', 'source_system', 'metadata_json'])
      .where('snapshot_id', '=', snapshotId)
      .where('tenant_id', '=', tenantId)
      .execute();

    logger.info({ customerCount: customers.length }, 'Loaded customers');

    if (customers.length === 0) {
      await db
        .updateTable('identity_runs')
        .set({
          status: 'completed',
          finished_at: new Date(),
          stats_json: { total_customers: 0 },
        })
        .where('id', '=', runId)
        .execute();

      return {
        success: true,
        message: 'No customers to process',
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Load existing suppressions
    const suppressions = await db
      .selectFrom('identity_suppressions')
      .select(['customer_id_a', 'customer_id_b'])
      .where('tenant_id', '=', tenantId)
      .execute();

    const suppressedPairs = new Set(
      suppressions.map(s => 
        [s.customer_id_a, s.customer_id_b].sort().join(':')
      )
    );

    // Convert to matching format
    const customersForMatching: identity.CustomerForMatching[] = customers.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      external_id: c.external_id,
      source_system: c.source_system,
      metadata_json: c.metadata_json,
    }));

    // Generate candidate pairs using blocking keys
    const candidatePairs = identity.generateCandidatePairs(
      customersForMatching,
      config.blocking_keys as identity.BlockingKeyType[],
      suppressedPairs
    );

    logger.info({ candidateCount: candidatePairs.length }, 'Generated candidate pairs');

    // Build customer lookup map
    const customerMap = new Map(customersForMatching.map(c => [c.id, c]));

    // Process candidates
    let autoMerged = 0;
    let queuedForReview = 0;
    let skipped = 0;
    let suppressed = 0;

    const identitiesCreated: string[] = [];

    for (const pair of candidatePairs) {
      const customerA = customerMap.get(pair.idA);
      const customerB = customerMap.get(pair.idB);

      if (!customerA || !customerB) continue;

      // Compute match features
      const features = identity.computeMatchFeatures(customerA, customerB);
      const { score, decision } = identity.scoreAndDecide(features, config);

      if (decision === 'skip') {
        skipped++;
        continue;
      }

      // Create candidate record
      const candidateId = createIdentityCandidateId();
      await db
        .insertInto('identity_candidates')
        .values({
          id: candidateId,
          tenant_id: tenantId,
          snapshot_id: snapshotId,
          run_id: runId,
          customer_id_a: pair.idA,
          customer_id_b: pair.idB,
          score,
          features_json: features as unknown,
          blocking_keys: pair.blockingKeys,
          status: decision === 'auto_merge' ? 'auto_merged' : 'pending',
        })
        .onConflict((oc) => oc.columns(['snapshot_id', 'customer_id_a', 'customer_id_b']).doNothing())
        .execute();

      if (decision === 'auto_merge') {
        // Create identity with both customers
        const identityId = createCustomerIdentityId();
        const primaryCustomer = customerA; // First customer becomes primary

        await db
          .insertInto('customer_identities')
          .values({
            id: identityId,
            tenant_id: tenantId,
            snapshot_id: snapshotId,
            run_id: runId,
            primary_customer_id: primaryCustomer.id,
            confidence: score,
            method: 'auto',
            member_count: 2,
            source_systems: [customerA.source_system, customerB.source_system],
          })
          .execute();

        // Add members
        await db
          .insertInto('customer_identity_members')
          .values([
            {
              id: createIdentityMemberId(),
              tenant_id: tenantId,
              snapshot_id: snapshotId,
              identity_id: identityId,
              customer_id: customerA.id,
              source_system: customerA.source_system,
              external_id: customerA.external_id,
              confidence: score,
              role: 'primary',
              added_method: 'auto',
            },
            {
              id: createIdentityMemberId(),
              tenant_id: tenantId,
              snapshot_id: snapshotId,
              identity_id: identityId,
              customer_id: customerB.id,
              source_system: customerB.source_system,
              external_id: customerB.external_id,
              confidence: score,
              role: 'member',
              added_method: 'auto',
            },
          ])
          .execute();

        identitiesCreated.push(identityId);
        autoMerged++;
      } else if (decision === 'review') {
        // Create review task
        const taskId = createIdentityTaskId();
        await db
          .insertInto('identity_tasks')
          .values({
            id: taskId,
            tenant_id: tenantId,
            snapshot_id: snapshotId,
            run_id: runId,
            candidate_id: candidateId,
            status: 'pending',
            priority: Math.round(score),
          })
          .onConflict((oc) => oc.column('candidate_id').doNothing())
          .execute();

        queuedForReview++;
      }
    }

    // Update run with stats
    const stats = {
      total_customers: customers.length,
      candidates_generated: candidatePairs.length,
      auto_merged: autoMerged,
      queued_for_review: queuedForReview,
      skipped,
      suppressed,
      identities_created: identitiesCreated.length,
      duration_ms: Date.now() - startTime,
    };

    await db
      .updateTable('identity_runs')
      .set({
        status: 'completed',
        finished_at: new Date(),
        stats_json: stats,
      })
      .where('id', '=', runId)
      .execute();

    logger.info(stats, 'Identity resolution completed');

    return {
      success: true,
      message: `Processed ${customers.length} customers: ${autoMerged} auto-merged, ${queuedForReview} queued for review`,
      data: stats,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    logger.error({ error }, 'Identity resolution failed');

    await db
      .updateTable('identity_runs')
      .set({
        status: 'failed',
        finished_at: new Date(),
        error_code: 'RESOLVE_FAILED',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .where('id', '=', runId)
      .execute();

    throw error;
  }
}
