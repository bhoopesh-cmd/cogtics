import type { FastifyPluginAsync } from 'fastify';
import { Queue } from 'bullmq';
import {
  CreateDigestSubscriptionRequestSchema,
  UpdateDigestSubscriptionRequestSchema,
  DigestListQuerySchema,
  createDigestSubscriptionId,
  createDigestRunId,
  createJobId,
} from '@cogtics/schemas';

// Shared queue instance (created once per server lifecycle)
let digestQueue: Queue | null = null;

const digestRoutes: FastifyPluginAsync = async (fastify) => {
  const redis = fastify.redis;
  
  // Reuse queue instance if already created
  if (!digestQueue) {
    digestQueue = new Queue('digest.send', { connection: redis as any });
  }

  /**
   * POST /digests - Create a digest subscription
   */
  fastify.post('/', async (request, reply) => {
    const { tenantId, userId } = request;
    const body = CreateDigestSubscriptionRequestSchema.parse(request.body);

    const subscriptionId = createDigestSubscriptionId();
    await fastify.db
      .insertInto('digest_subscriptions')
      .values({
        id: subscriptionId,
        tenant_id: tenantId,
        name: body.name,
        cadence: body.cadence,
        scope_json: JSON.stringify(body.scope ?? {}),
        recipients_json: JSON.stringify(body.recipients),
        is_active: true,
        created_by: userId ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .execute();

    request.log.info({ subscriptionId, name: body.name }, 'Digest subscription created');

    return reply.status(201).send({
      subscription: {
        id: subscriptionId,
        tenantId,
        name: body.name,
        cadence: body.cadence,
        scope: body.scope ?? {},
        recipients: body.recipients,
        isActive: true,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  });

  /**
   * GET /digests - List digest subscriptions
   */
  fastify.get('/', async (request, reply) => {
    const { tenantId } = request;
    const query = DigestListQuerySchema.parse(request.query);

    let dbQuery = fastify.db
      .selectFrom('digest_subscriptions')
      .selectAll()
      .where('tenant_id', '=', tenantId);

    if (query.isActive !== undefined) {
      dbQuery = dbQuery.where('is_active', '=', query.isActive);
    }
    if (query.cadence) {
      dbQuery = dbQuery.where('cadence', '=', query.cadence);
    }

    const [subscriptions, countResult] = await Promise.all([
      dbQuery
        .orderBy('created_at', 'desc')
        .limit(query.limit)
        .offset(query.offset)
        .execute(),
      fastify.db
        .selectFrom('digest_subscriptions')
        .select(fastify.db.fn.count('id').as('count'))
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst(),
    ]);

    return reply.send({
      subscriptions: subscriptions.map(s => ({
        id: s.id,
        tenantId: s.tenant_id,
        name: s.name,
        cadence: s.cadence,
        scope: s.scope_json,
        recipients: s.recipients_json,
        isActive: s.is_active,
        createdBy: s.created_by,
        createdAt: s.created_at.toISOString(),
        updatedAt: s.updated_at.toISOString(),
      })),
      total: Number(countResult?.count ?? 0),
      limit: query.limit,
      offset: query.offset,
    });
  });

  /**
   * GET /digests/:id - Get digest subscription details
   */
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { tenantId } = request;
    const { id } = request.params;

    const subscription = await fastify.db
      .selectFrom('digest_subscriptions')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!subscription) {
      return reply.status(404).send({ error: 'Digest subscription not found' });
    }

    return reply.send({
      subscription: {
        id: subscription.id,
        tenantId: subscription.tenant_id,
        name: subscription.name,
        cadence: subscription.cadence,
        scope: subscription.scope_json,
        recipients: subscription.recipients_json,
        isActive: subscription.is_active,
        createdBy: subscription.created_by,
        createdAt: subscription.created_at.toISOString(),
        updatedAt: subscription.updated_at.toISOString(),
      },
    });
  });

  /**
   * PATCH /digests/:id - Update digest subscription
   */
  fastify.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { tenantId } = request;
    const { id } = request.params;
    const body = UpdateDigestSubscriptionRequestSchema.parse(request.body);

    const subscription = await fastify.db
      .selectFrom('digest_subscriptions')
      .select(['id'])
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!subscription) {
      return reply.status(404).send({ error: 'Digest subscription not found' });
    }

    const updates: Record<string, unknown> = { updated_at: new Date() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.cadence !== undefined) updates.cadence = body.cadence;
    if (body.scope !== undefined) updates.scope_json = JSON.stringify(body.scope);
    if (body.recipients !== undefined) updates.recipients_json = JSON.stringify(body.recipients);
    if (body.isActive !== undefined) updates.is_active = body.isActive;

    await fastify.db
      .updateTable('digest_subscriptions')
      .set(updates)
      .where('id', '=', id)
      .execute();

    const updated = await fastify.db
      .selectFrom('digest_subscriptions')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    request.log.info({ subscriptionId: id }, 'Digest subscription updated');

    return reply.send({
      subscription: {
        id: updated!.id,
        tenantId: updated!.tenant_id,
        name: updated!.name,
        cadence: updated!.cadence,
        scope: updated!.scope_json,
        recipients: updated!.recipients_json,
        isActive: updated!.is_active,
        createdBy: updated!.created_by,
        createdAt: updated!.created_at.toISOString(),
        updatedAt: updated!.updated_at.toISOString(),
      },
    });
  });

  /**
   * DELETE /digests/:id - Delete digest subscription
   */
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { tenantId } = request;
    const { id } = request.params;

    const subscription = await fastify.db
      .selectFrom('digest_subscriptions')
      .select(['id'])
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!subscription) {
      return reply.status(404).send({ error: 'Digest subscription not found' });
    }

    await fastify.db
      .deleteFrom('digest_subscriptions')
      .where('id', '=', id)
      .execute();

    request.log.info({ subscriptionId: id }, 'Digest subscription deleted');

    return reply.send({ success: true });
  });

  /**
   * GET /digests/:id/runs - List digest run history
   */
  fastify.get<{ Params: { id: string }; Querystring: { limit?: number; offset?: number } }>('/:id/runs', async (request, reply) => {
    const { tenantId } = request;
    const { id } = request.params;
    const { limit = 20, offset = 0 } = request.query;

    const subscription = await fastify.db
      .selectFrom('digest_subscriptions')
      .select(['id'])
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!subscription) {
      return reply.status(404).send({ error: 'Digest subscription not found' });
    }

    const [runs, countResult] = await Promise.all([
      fastify.db
        .selectFrom('digest_runs')
        .selectAll()
        .where('subscription_id', '=', id)
        .where('tenant_id', '=', tenantId)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute(),
      fastify.db
        .selectFrom('digest_runs')
        .select(fastify.db.fn.count('id').as('count'))
        .where('subscription_id', '=', id)
        .executeTakeFirst(),
    ]);

    return reply.send({
      runs: runs.map(r => ({
        id: r.id,
        tenantId: r.tenant_id,
        subscriptionId: r.subscription_id,
        status: r.status,
        itemsCount: r.items_count,
        recipientsCount: r.recipients_count,
        emailsSent: r.emails_sent,
        emailsFailed: r.emails_failed,
        snapshotId: r.snapshot_id,
        periodStart: r.period_start?.toISOString() ?? null,
        periodEnd: r.period_end?.toISOString() ?? null,
        startedAt: r.started_at?.toISOString() ?? null,
        finishedAt: r.finished_at?.toISOString() ?? null,
        errorCode: r.error_code,
        errorMessage: r.error_message,
        createdAt: r.created_at.toISOString(),
      })),
      total: Number(countResult?.count ?? 0),
      limit,
      offset,
    });
  });

  /**
   * POST /digests/:id/trigger - Manually trigger a digest
   */
  fastify.post<{ Params: { id: string } }>('/:id/trigger', async (request, reply) => {
    const { tenantId, userId } = request;
    const { id } = request.params;

    const subscription = await fastify.db
      .selectFrom('digest_subscriptions')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!subscription) {
      return reply.status(404).send({ error: 'Digest subscription not found' });
    }

    // Create digest run record
    const runId = createDigestRunId();
    await fastify.db
      .insertInto('digest_runs')
      .values({
        id: runId,
        tenant_id: tenantId,
        subscription_id: id,
        status: 'pending',
        items_count: 0,
        recipients_count: 0,
        emails_sent: 0,
        emails_failed: 0,
        created_at: new Date(),
      })
      .execute();

    // Create job record
    const jobId = createJobId();
    await fastify.db
      .insertInto('jobs')
      .values({
        id: jobId,
        tenant_id: tenantId,
        type: 'digest' as any,
        status: 'pending',
        payload_json: {
          type: 'digest.send',
          tenantId,
          subscriptionId: id,
          runId,
        },
        created_at: new Date(),
        updated_at: new Date(),
      })
      .execute();

    // Enqueue job
    await digestQueue!.add('digest.send', {
      jobId,
      tenantId,
      payload: {
        type: 'digest.send',
        tenantId,
        subscriptionId: id,
        runId,
      },
    });

    request.log.info({ subscriptionId: id, runId, jobId }, 'Digest manually triggered');

    return reply.status(201).send({
      runId,
      jobId,
      status: 'pending',
    });
  });
};

export default digestRoutes;
