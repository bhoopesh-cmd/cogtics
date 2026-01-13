/**
 * Identity Resolution Routes
 * 
 * API endpoints for identity resolution, review queue, and decisions.
 */
import { FastifyPluginAsync } from 'fastify';
import { sql } from '@cogtics/db';
import {
  createIdentityRunId,
  createIdentityDecisionId,
  IdentityDecisionInputSchema,
  TriggerIdentityResolutionSchema,
  IdentityTaskStatusSchema,
} from '@cogtics/schemas';

export const identityRoutes: FastifyPluginAsync = async (fastify) => {
  // ============================================
  // Helper: Get snapshot ID (latest if not provided)
  // ============================================
  async function resolveSnapshotId(tenantId: string, snapshotId?: string): Promise<string> {
    if (snapshotId) {
      const snapshot = await fastify.db
        .selectFrom('snapshots')
        .select('id')
        .where('id', '=', snapshotId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!snapshot) {
        throw fastify.httpErrors.notFound('Snapshot not found');
      }
      return snapshotId;
    }

    const latest = await fastify.db
      .selectFrom('snapshots')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where('status', '=', 'complete')
      .orderBy('completed_at', 'desc')
      .executeTakeFirst();

    if (!latest) {
      throw fastify.httpErrors.notFound('No complete snapshot found');
    }
    return latest.id;
  }

  // ============================================
  // GET /identity/summary - Stats for identity resolution
  // ============================================
  fastify.get('/summary', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { snapshotId: requestedSnapshotId } = request.query as { snapshotId?: string };

      const snapshotId = await resolveSnapshotId(tenantId, requestedSnapshotId);

      // Get latest run
      const run = await fastify.db
        .selectFrom('identity_runs')
        .selectAll()
        .where('snapshot_id', '=', snapshotId)
        .where('tenant_id', '=', tenantId)
        .orderBy('created_at', 'desc')
        .executeTakeFirst();

      // Get queue counts
      const queueCounts = await fastify.db
        .selectFrom('identity_tasks')
        .select([
          'status',
          sql<number>`count(*)`.as('count'),
        ])
        .where('snapshot_id', '=', snapshotId)
        .groupBy('status')
        .execute();

      const queue = {
        pending: 0,
        assigned: 0,
        resolved: 0,
        total: 0,
      };

      for (const row of queueCounts) {
        if (row.status === 'pending') queue.pending = Number(row.count);
        if (row.status === 'assigned') queue.assigned = Number(row.count);
        if (row.status === 'resolved') queue.resolved = Number(row.count);
        queue.total += Number(row.count);
      }

      return reply.send({
        snapshotId,
        runId: run?.id ?? null,
        runStatus: run?.status ?? null,
        stats: run?.stats_json ?? {},
        queue,
      });
    },
  });

  // ============================================
  // GET /identity/runs - List identity runs
  // ============================================
  fastify.get('/runs', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { snapshotId } = request.query as { snapshotId?: string };

      let query = fastify.db
        .selectFrom('identity_runs')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .orderBy('created_at', 'desc')
        .limit(20);

      if (snapshotId) {
        query = query.where('snapshot_id', '=', snapshotId);
      }

      const runs = await query.execute();

      return reply.send({
        runs: runs.map(run => ({
          id: run.id,
          snapshotId: run.snapshot_id,
          status: run.status,
          rulesVersion: run.rules_version,
          stats: run.stats_json,
          startedAt: run.started_at.toISOString(),
          finishedAt: run.finished_at?.toISOString() ?? null,
          errorMessage: run.error_message,
        })),
        total: runs.length,
      });
    },
  });

  // ============================================
  // POST /identity/trigger - Trigger identity resolution
  // ============================================
  fastify.post('/trigger', {
    handler: async (request, reply) => {
      const { tenantId, userId } = request.auth!;
      const body = TriggerIdentityResolutionSchema.parse(request.body);

      const snapshotId = await resolveSnapshotId(tenantId, body.snapshotId);

      // Check if already running
      const existing = await fastify.db
        .selectFrom('identity_runs')
        .select('id')
        .where('snapshot_id', '=', snapshotId)
        .where('status', 'in', ['pending', 'running'])
        .executeTakeFirst();

      if (existing) {
        throw fastify.httpErrors.conflict('Identity resolution already running for this snapshot');
      }

      // Create run record
      const runId = createIdentityRunId();
      await fastify.db
        .insertInto('identity_runs')
        .values({
          id: runId,
          tenant_id: tenantId,
          snapshot_id: snapshotId,
          status: 'pending',
          rules_version: 'v1',
          config_json: body.config ?? {},
          stats_json: {},
        })
        .execute();

      // Enqueue job
      await fastify.queue.add('identity.resolve', {
        tenantId,
        snapshotId,
        runId,
        config: body.config,
      });

      return reply.status(201).send({
        runId,
        snapshotId,
        status: 'pending',
      });
    },
  });

  // ============================================
  // GET /identity/queue - List review tasks
  // ============================================
  fastify.get('/queue', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const query = request.query as {
        snapshotId?: string;
        status?: string;
        limit?: string;
        offset?: string;
      };

      const snapshotId = await resolveSnapshotId(tenantId, query.snapshotId);
      const limit = Math.min(parseInt(query.limit ?? '50', 10), 100);
      const offset = parseInt(query.offset ?? '0', 10);
      const statusParsed = IdentityTaskStatusSchema.safeParse(query.status ?? 'pending');
      const status = statusParsed.success ? statusParsed.data : 'pending';

      const tasks = await fastify.db
        .selectFrom('identity_tasks')
        .innerJoin('identity_candidates', 'identity_candidates.id', 'identity_tasks.candidate_id')
        .select([
          'identity_tasks.id',
          'identity_tasks.candidate_id',
          'identity_tasks.status',
          'identity_tasks.priority',
          'identity_tasks.assigned_to',
          'identity_tasks.created_at',
          'identity_candidates.customer_id_a',
          'identity_candidates.customer_id_b',
          'identity_candidates.score',
          'identity_candidates.features_json',
          'identity_candidates.blocking_keys',
        ])
        .where('identity_tasks.snapshot_id', '=', snapshotId)
        .where('identity_tasks.status', '=', status)
        .orderBy('identity_candidates.score', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();

      // Get customer details for tasks
      const customerIds = new Set<string>();
      for (const task of tasks) {
        customerIds.add(task.customer_id_a);
        customerIds.add(task.customer_id_b);
      }

      const customers = customerIds.size > 0
        ? await fastify.db
            .selectFrom('customers')
            .select(['id', 'name', 'email', 'source_system', 'external_id'])
            .where('id', 'in', Array.from(customerIds))
            .execute()
        : [];

      const customerMap = new Map(customers.map(c => [c.id, c]));

      // Get total count
      const countResult = await fastify.db
        .selectFrom('identity_tasks')
        .select(sql<number>`count(*)`.as('count'))
        .where('snapshot_id', '=', snapshotId)
        .where('status', '=', status)
        .executeTakeFirst();

      return reply.send({
        tasks: tasks.map(task => ({
          id: task.id,
          candidateId: task.candidate_id,
          status: task.status,
          priority: task.priority,
          score: task.score,
          features: task.features_json,
          blockingKeys: task.blocking_keys,
          customerA: customerMap.get(task.customer_id_a) ?? null,
          customerB: customerMap.get(task.customer_id_b) ?? null,
          createdAt: task.created_at.toISOString(),
        })),
        total: Number(countResult?.count ?? 0),
        snapshotId,
      });
    },
  });

  // ============================================
  // GET /identity/queue/:taskId - Task detail
  // ============================================
  fastify.get<{ Params: { taskId: string } }>('/queue/:taskId', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { taskId } = request.params;

      const task = await fastify.db
        .selectFrom('identity_tasks')
        .innerJoin('identity_candidates', 'identity_candidates.id', 'identity_tasks.candidate_id')
        .selectAll()
        .where('identity_tasks.id', '=', taskId)
        .where('identity_tasks.tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!task) {
        throw fastify.httpErrors.notFound('Task not found');
      }

      // Get customer details
      const customers = await fastify.db
        .selectFrom('customers')
        .selectAll()
        .where('id', 'in', [task.customer_id_a, task.customer_id_b])
        .execute();

      const customerA = customers.find(c => c.id === task.customer_id_a);
      const customerB = customers.find(c => c.id === task.customer_id_b);

      return reply.send({
        id: task.id,
        candidateId: task.candidate_id,
        status: task.status,
        priority: task.priority,
        score: task.score,
        features: task.features_json,
        blockingKeys: task.blocking_keys,
        customerA: customerA ? mapCustomerToResponse(customerA) : null,
        customerB: customerB ? mapCustomerToResponse(customerB) : null,
        createdAt: task.created_at.toISOString(),
      });
    },
  });

  // ============================================
  // POST /identity/decisions - Submit decision
  // ============================================
  fastify.post('/decisions', {
    handler: async (request, reply) => {
      const { tenantId, userId } = request.auth!;
      const input = IdentityDecisionInputSchema.parse(request.body);

      // Get task and candidate
      const task = await fastify.db
        .selectFrom('identity_tasks')
        .selectAll()
        .where('id', '=', input.taskId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!task) {
        throw fastify.httpErrors.notFound('Task not found');
      }

      if (task.status === 'resolved') {
        throw fastify.httpErrors.conflict('Task already resolved');
      }

      // Create decision record
      const decisionId = createIdentityDecisionId();
      await fastify.db
        .insertInto('identity_decisions')
        .values({
          id: decisionId,
          tenant_id: tenantId,
          snapshot_id: task.snapshot_id,
          task_id: task.id,
          candidate_id: task.candidate_id,
          decision: input.decision,
          actor_user_id: userId,
          notes: input.notes ?? null,
          metadata_json: {},
        })
        .execute();

      // Enqueue apply job
      await fastify.queue.add('identity.apply', {
        tenantId,
        snapshotId: task.snapshot_id,
        decisionIds: [decisionId],
      });

      // Log audit event
      await fastify.db
        .insertInto('audit_logs')
        .values({
          id: `audit_${Date.now().toString(36)}`,
          tenant_id: tenantId,
          actor_user_id: userId,
          action: `identity.decision.${input.decision}`,
          resource: `identity_task:${task.id}`,
          metadata_json: { decision: input.decision, notes: input.notes },
        })
        .execute();

      return reply.status(201).send({
        decisionId,
        taskId: task.id,
        decision: input.decision,
        status: 'submitted',
      });
    },
  });

  // ============================================
  // GET /identity/resolved - List resolved identities
  // ============================================
  fastify.get('/resolved', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const query = request.query as {
        snapshotId?: string;
        limit?: string;
        offset?: string;
      };

      const snapshotId = await resolveSnapshotId(tenantId, query.snapshotId);
      const limit = Math.min(parseInt(query.limit ?? '50', 10), 100);
      const offset = parseInt(query.offset ?? '0', 10);

      const identities = await fastify.db
        .selectFrom('customer_identities')
        .selectAll()
        .where('snapshot_id', '=', snapshotId)
        .where('tenant_id', '=', tenantId)
        .orderBy('member_count', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();

      // Get primary customer details
      const primaryIds = identities.map(i => i.primary_customer_id);
      const primaryCustomers = primaryIds.length > 0
        ? await fastify.db
            .selectFrom('customers')
            .select(['id', 'name', 'email', 'source_system'])
            .where('id', 'in', primaryIds)
            .execute()
        : [];

      const customerMap = new Map(primaryCustomers.map(c => [c.id, c]));

      const countResult = await fastify.db
        .selectFrom('customer_identities')
        .select(sql<number>`count(*)`.as('count'))
        .where('snapshot_id', '=', snapshotId)
        .executeTakeFirst();

      return reply.send({
        identities: identities.map(identity => ({
          id: identity.id,
          primaryCustomerId: identity.primary_customer_id,
          primaryName: customerMap.get(identity.primary_customer_id)?.name ?? null,
          primaryEmail: customerMap.get(identity.primary_customer_id)?.email ?? null,
          confidence: identity.confidence,
          method: identity.method,
          memberCount: identity.member_count,
          sourceSystems: identity.source_systems,
          createdAt: identity.created_at.toISOString(),
        })),
        total: Number(countResult?.count ?? 0),
        snapshotId,
      });
    },
  });

  // ============================================
  // GET /identity/resolved/:identityId - Identity detail
  // ============================================
  fastify.get<{ Params: { identityId: string } }>('/resolved/:identityId', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { identityId } = request.params;

      const identity = await fastify.db
        .selectFrom('customer_identities')
        .selectAll()
        .where('id', '=', identityId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!identity) {
        throw fastify.httpErrors.notFound('Identity not found');
      }

      // Get members
      const members = await fastify.db
        .selectFrom('customer_identity_members')
        .innerJoin('customers', 'customers.id', 'customer_identity_members.customer_id')
        .select([
          'customer_identity_members.id as member_id',
          'customer_identity_members.customer_id',
          'customer_identity_members.source_system',
          'customer_identity_members.external_id',
          'customer_identity_members.confidence',
          'customer_identity_members.role',
          'customer_identity_members.added_method',
          'customers.name',
          'customers.email',
        ])
        .where('customer_identity_members.identity_id', '=', identityId)
        .execute();

      return reply.send({
        id: identity.id,
        snapshotId: identity.snapshot_id,
        primaryCustomerId: identity.primary_customer_id,
        confidence: identity.confidence,
        method: identity.method,
        memberCount: identity.member_count,
        sourceSystems: identity.source_systems,
        createdAt: identity.created_at.toISOString(),
        members: members.map(m => ({
          id: m.member_id,
          customerId: m.customer_id,
          name: m.name,
          email: m.email,
          sourceSystem: m.source_system,
          externalId: m.external_id,
          confidence: m.confidence,
          role: m.role,
          method: m.added_method,
        })),
      });
    },
  });
};

// Helper function
function mapCustomerToResponse(customer: any) {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    externalId: customer.external_id,
    sourceSystem: customer.source_system,
    status: customer.status,
    metadata: customer.metadata_json,
  };
}
