/**
 * Identity Decision Apply Processor
 * 
 * Applies manual decisions to create or update identities.
 */
import type { Logger } from 'pino';
import type { Kysely } from 'kysely';
import type { Database } from '@cogtics/db';
import {
  type IdentityApplyJobPayload,
  createCustomerIdentityId,
  createIdentityMemberId,
  createIdentityDecisionId,
} from '@cogtics/schemas';

interface JobResult {
  success: boolean;
  message: string;
  data?: unknown;
  processingTimeMs?: number;
}

/**
 * Process identity apply job
 */
export async function processIdentityApplyJob(
  payload: IdentityApplyJobPayload,
  logger: Logger,
  db: Kysely<Database>
): Promise<JobResult> {
  const { tenantId, snapshotId, decisionIds } = payload;
  const startTime = Date.now();

  logger.info({ snapshotId, decisionCount: decisionIds?.length ?? 'all pending' }, 'Starting identity apply');

  try {
    // Find pending decisions
    let query = db
      .selectFrom('identity_decisions')
      .innerJoin('identity_tasks', 'identity_tasks.id', 'identity_decisions.task_id')
      .innerJoin('identity_candidates', 'identity_candidates.id', 'identity_decisions.candidate_id')
      .select([
        'identity_decisions.id as decision_id',
        'identity_decisions.task_id',
        'identity_decisions.candidate_id',
        'identity_decisions.decision',
        'identity_decisions.actor_user_id',
        'identity_decisions.notes',
        'identity_candidates.customer_id_a',
        'identity_candidates.customer_id_b',
        'identity_candidates.score',
        'identity_candidates.features_json',
      ])
      .where('identity_decisions.tenant_id', '=', tenantId)
      .where('identity_decisions.snapshot_id', '=', snapshotId)
      .where('identity_tasks.status', '!=', 'resolved');

    if (decisionIds && decisionIds.length > 0) {
      query = query.where('identity_decisions.id', 'in', decisionIds);
    }

    const decisions = await query.execute();

    if (decisions.length === 0) {
      return {
        success: true,
        message: 'No pending decisions to apply',
        processingTimeMs: Date.now() - startTime,
      };
    }

    logger.info({ decisionCount: decisions.length }, 'Processing decisions');

    let confirmed = 0;
    let rejected = 0;
    let merged = 0;
    let split = 0;

    for (const decision of decisions) {
      try {
        switch (decision.decision) {
          case 'confirm':
            await applyConfirmDecision(db, tenantId, snapshotId, decision);
            confirmed++;
            break;

          case 'reject':
            await applyRejectDecision(db, tenantId, decision);
            rejected++;
            break;

          case 'merge':
            await applyMergeDecision(db, tenantId, snapshotId, decision);
            merged++;
            break;

          case 'split':
            await applySplitDecision(db, tenantId, snapshotId, decision);
            split++;
            break;
        }

        // Mark task as resolved
        await db
          .updateTable('identity_tasks')
          .set({
            status: 'resolved',
            resolved_at: new Date(),
          })
          .where('id', '=', decision.task_id)
          .execute();

      } catch (error) {
        logger.error({ error, decisionId: decision.decision_id }, 'Failed to apply decision');
      }
    }

    const stats = {
      total: decisions.length,
      confirmed,
      rejected,
      merged,
      split,
      duration_ms: Date.now() - startTime,
    };

    logger.info(stats, 'Identity apply completed');

    return {
      success: true,
      message: `Applied ${decisions.length} decisions`,
      data: stats,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    logger.error({ error }, 'Identity apply failed');
    throw error;
  }
}

/**
 * Apply a confirm decision - create identity from candidate
 */
async function applyConfirmDecision(
  db: Kysely<Database>,
  tenantId: string,
  snapshotId: string,
  decision: {
    candidate_id: string;
    customer_id_a: string;
    customer_id_b: string;
    score: number;
  }
): Promise<void> {
  // Get customer details
  const customers = await db
    .selectFrom('customers')
    .select(['id', 'source_system', 'external_id'])
    .where('id', 'in', [decision.customer_id_a, decision.customer_id_b])
    .where('snapshot_id', '=', snapshotId)
    .execute();

  if (customers.length < 2) return;

  const customerA = customers.find(c => c.id === decision.customer_id_a)!;
  const customerB = customers.find(c => c.id === decision.customer_id_b)!;

  // Create identity
  const identityId = createCustomerIdentityId();

  await db
    .insertInto('customer_identities')
    .values({
      id: identityId,
      tenant_id: tenantId,
      snapshot_id: snapshotId,
      primary_customer_id: customerA.id,
      confidence: decision.score,
      method: 'manual',
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
        confidence: decision.score,
        role: 'primary',
        added_method: 'manual',
      },
      {
        id: createIdentityMemberId(),
        tenant_id: tenantId,
        snapshot_id: snapshotId,
        identity_id: identityId,
        customer_id: customerB.id,
        source_system: customerB.source_system,
        external_id: customerB.external_id,
        confidence: decision.score,
        role: 'member',
        added_method: 'manual',
      },
    ])
    .execute();

  // Update candidate status
  await db
    .updateTable('identity_candidates')
    .set({ status: 'confirmed', updated_at: new Date() })
    .where('id', '=', decision.candidate_id)
    .execute();
}

/**
 * Apply a reject decision - mark candidate as rejected and optionally suppress
 */
async function applyRejectDecision(
  db: Kysely<Database>,
  tenantId: string,
  decision: {
    candidate_id: string;
    customer_id_a: string;
    customer_id_b: string;
  }
): Promise<void> {
  // Update candidate status
  await db
    .updateTable('identity_candidates')
    .set({ status: 'rejected', updated_at: new Date() })
    .where('id', '=', decision.candidate_id)
    .execute();

  // Create suppression to prevent future matching
  const [idA, idB] = [decision.customer_id_a, decision.customer_id_b].sort();
  
  await db
    .insertInto('identity_suppressions')
    .values({
      id: `isup_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`,
      tenant_id: tenantId,
      customer_id_a: idA,
      customer_id_b: idB,
      reason: 'Rejected during review',
    })
    .onConflict((oc) => oc.columns(['tenant_id', 'customer_id_a', 'customer_id_b']).doNothing())
    .execute();
}

/**
 * Apply a merge decision - combine two existing identities
 */
async function applyMergeDecision(
  db: Kysely<Database>,
  tenantId: string,
  snapshotId: string,
  decision: {
    candidate_id: string;
    customer_id_a: string;
    customer_id_b: string;
  }
): Promise<void> {
  // Find existing identities for both customers
  const members = await db
    .selectFrom('customer_identity_members')
    .select(['identity_id', 'customer_id'])
    .where('snapshot_id', '=', snapshotId)
    .where('customer_id', 'in', [decision.customer_id_a, decision.customer_id_b])
    .execute();

  const identityIds = new Set(members.map(m => m.identity_id));

  if (identityIds.size === 2) {
    // Merge two identities - move all members from one to the other
    const [keepId, mergeId] = Array.from(identityIds);

    await db
      .updateTable('customer_identity_members')
      .set({ identity_id: keepId })
      .where('identity_id', '=', mergeId)
      .execute();

    // Update member count on kept identity
    const newCount = await db
      .selectFrom('customer_identity_members')
      .select(({ fn }) => fn.count('id').as('count'))
      .where('identity_id', '=', keepId)
      .executeTakeFirst();

    await db
      .updateTable('customer_identities')
      .set({ 
        member_count: Number(newCount?.count ?? 0),
        updated_at: new Date(),
      })
      .where('id', '=', keepId)
      .execute();

    // Delete merged identity
    await db
      .deleteFrom('customer_identities')
      .where('id', '=', mergeId)
      .execute();
  }

  // Update candidate status
  await db
    .updateTable('identity_candidates')
    .set({ status: 'confirmed', updated_at: new Date() })
    .where('id', '=', decision.candidate_id)
    .execute();
}

/**
 * Apply a split decision - remove a customer from an identity
 */
async function applySplitDecision(
  db: Kysely<Database>,
  tenantId: string,
  snapshotId: string,
  decision: {
    candidate_id: string;
    customer_id_a: string;
    customer_id_b: string;
  }
): Promise<void> {
  // Find identity membership for customer B
  const member = await db
    .selectFrom('customer_identity_members')
    .select(['id', 'identity_id'])
    .where('snapshot_id', '=', snapshotId)
    .where('customer_id', '=', decision.customer_id_b)
    .executeTakeFirst();

  if (member) {
    // Remove from identity
    await db
      .deleteFrom('customer_identity_members')
      .where('id', '=', member.id)
      .execute();

    // Update member count
    const newCount = await db
      .selectFrom('customer_identity_members')
      .select(({ fn }) => fn.count('id').as('count'))
      .where('identity_id', '=', member.identity_id)
      .executeTakeFirst();

    if (Number(newCount?.count ?? 0) <= 1) {
      // Delete identity if only one member left
      await db.deleteFrom('customer_identity_members').where('identity_id', '=', member.identity_id).execute();
      await db.deleteFrom('customer_identities').where('id', '=', member.identity_id).execute();
    } else {
      await db
        .updateTable('customer_identities')
        .set({ 
          member_count: Number(newCount?.count ?? 0),
          updated_at: new Date(),
        })
        .where('id', '=', member.identity_id)
        .execute();
    }
  }

  // Update candidate status
  await db
    .updateTable('identity_candidates')
    .set({ status: 'rejected', updated_at: new Date() })
    .where('id', '=', decision.candidate_id)
    .execute();
}
