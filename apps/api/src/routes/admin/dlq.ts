/**
 * Dead Letter Queue Admin API (Phase 11)
 * 
 * Provides endpoints for viewing, requeuing, and discarding DLQ entries.
 */
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { recordDlqRequeue } from '@cogtics/utils';

// Zod schemas for request validation
const ListDlqQuerySchema = z.object({
  status: z.enum(['failed', 'requeued', 'discarded']).optional(),
  queue_name: z.string().optional(),
  job_type: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0),
});

const RequeueBodySchema = z.object({
  // No body needed for single requeue
});

const BulkRequeueBodySchema = z.object({
  queue_name: z.string().optional(),
  job_type: z.string().optional(),
  older_than: z.string().datetime().optional(),
  newer_than: z.string().datetime().optional(),
  limit: z.number().min(1).max(1000).default(100),
});

export const dlqRoutes: FastifyPluginAsync = async (fastify) => {
  // List DLQ entries
  fastify.get('/', async (request, reply) => {
    const parseResult = ListDlqQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: parseResult.error.message,
      });
    }

    const { status, queue_name, job_type, limit, offset } = parseResult.data;
    const tenantId = request.tenantId;

    let query = fastify.db
      .selectFrom('dead_letter_jobs')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .orderBy('last_failed_at', 'desc')
      .limit(limit)
      .offset(offset);

    if (status) {
      query = query.where('status', '=', status);
    }
    if (queue_name) {
      query = query.where('queue_name', '=', queue_name);
    }
    if (job_type) {
      query = query.where('job_type', '=', job_type);
    }

    const entries = await query.execute();

    // Get total count
    let countQuery = fastify.db
      .selectFrom('dead_letter_jobs')
      .select((eb) => eb.fn.count<number>('id').as('count'))
      .where('tenant_id', '=', tenantId);

    if (status) {
      countQuery = countQuery.where('status', '=', status);
    }
    if (queue_name) {
      countQuery = countQuery.where('queue_name', '=', queue_name);
    }
    if (job_type) {
      countQuery = countQuery.where('job_type', '=', job_type);
    }

    const countResult = await countQuery.executeTakeFirst();
    const total = Number(countResult?.count || 0);

    return {
      entries,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + entries.length < total,
      },
    };
  });

  // Get single DLQ entry
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;

    const entry = await fastify.db
      .selectFrom('dead_letter_jobs')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!entry) {
      return reply.status(404).send({ error: 'DLQ entry not found' });
    }

    return entry;
  });

  // Requeue a single job
  fastify.post('/:id/requeue', async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;
    const userId = request.userId;

    // Get the DLQ entry
    const dlqEntry = await fastify.db
      .selectFrom('dead_letter_jobs')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .where('status', '=', 'failed')
      .executeTakeFirst();

    if (!dlqEntry) {
      return reply.status(404).send({ error: 'DLQ entry not found or already processed' });
    }

    // Create a new job
    const newJobId = `job_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`;

    await fastify.db
      .insertInto('jobs')
      .values({
        id: newJobId,
        tenant_id: tenantId,
        type: dlqEntry.job_type as any,
        status: 'pending',
        payload_json: dlqEntry.payload_json,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .execute();

    // Mark DLQ entry as requeued
    await fastify.db
      .updateTable('dead_letter_jobs')
      .set({
        status: 'requeued',
        requeued_at: new Date(),
        requeued_by: userId,
      })
      .where('id', '=', id)
      .execute();

    // Record metrics
    recordDlqRequeue(dlqEntry.queue_name, dlqEntry.job_type);

    request.log.info({ dlqId: id, newJobId }, 'Job requeued from DLQ');

    return {
      success: true,
      jobId: newJobId,
      message: 'Job has been requeued',
    };
  });

  // Bulk requeue jobs
  fastify.post('/requeue-batch', async (request, reply) => {
    const parseResult = BulkRequeueBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: parseResult.error.message,
      });
    }

    const { queue_name, job_type, older_than, newer_than, limit } = parseResult.data;
    const tenantId = request.tenantId;
    const userId = request.userId;

    // Find matching entries
    let query = fastify.db
      .selectFrom('dead_letter_jobs')
      .select(['id', 'queue_name', 'job_type', 'payload_json'])
      .where('tenant_id', '=', tenantId)
      .where('status', '=', 'failed')
      .limit(limit);

    if (queue_name) {
      query = query.where('queue_name', '=', queue_name);
    }
    if (job_type) {
      query = query.where('job_type', '=', job_type);
    }
    if (older_than) {
      query = query.where('last_failed_at', '<', new Date(older_than));
    }
    if (newer_than) {
      query = query.where('last_failed_at', '>', new Date(newer_than));
    }

    const entries = await query.execute();
    let requeuedCount = 0;
    const errors: string[] = [];

    for (const entry of entries) {
      try {
        const newJobId = `job_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`;

        await fastify.db
          .insertInto('jobs')
          .values({
            id: newJobId,
            tenant_id: tenantId,
            type: entry.job_type as any,
            status: 'pending',
            payload_json: entry.payload_json,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .execute();

        await fastify.db
          .updateTable('dead_letter_jobs')
          .set({
            status: 'requeued',
            requeued_at: new Date(),
            requeued_by: userId,
          })
          .where('id', '=', entry.id)
          .execute();

        recordDlqRequeue(entry.queue_name, entry.job_type);
        requeuedCount++;
      } catch (err) {
        errors.push(`${entry.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    request.log.info({ tenantId, requeuedCount, errorCount: errors.length }, 'Bulk requeue completed');

    return {
      success: true,
      requeuedCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  });

  // Discard a DLQ entry
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;
    const userId = request.userId;

    const result = await fastify.db
      .updateTable('dead_letter_jobs')
      .set({
        status: 'discarded',
        discarded_at: new Date(),
        discarded_by: userId,
      })
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .where('status', '=', 'failed')
      .executeTakeFirst();

    if (!result.numUpdatedRows || result.numUpdatedRows === 0n) {
      return reply.status(404).send({ error: 'DLQ entry not found or already processed' });
    }

    request.log.info({ dlqId: id }, 'DLQ entry discarded');

    return {
      success: true,
      message: 'DLQ entry has been discarded',
    };
  });

  // Get DLQ statistics
  fastify.get('/stats', async (request, reply) => {
    const tenantId = request.tenantId;

    // Get counts by status
    const statusCounts = await fastify.db
      .selectFrom('dead_letter_jobs')
      .select(['status'])
      .select((eb) => eb.fn.count<number>('id').as('count'))
      .where('tenant_id', '=', tenantId)
      .groupBy('status')
      .execute();

    // Get counts by queue
    const queueCounts = await fastify.db
      .selectFrom('dead_letter_jobs')
      .select(['queue_name'])
      .select((eb) => eb.fn.count<number>('id').as('count'))
      .where('tenant_id', '=', tenantId)
      .where('status', '=', 'failed')
      .groupBy('queue_name')
      .execute();

    // Get counts by job type
    const typeCounts = await fastify.db
      .selectFrom('dead_letter_jobs')
      .select(['job_type'])
      .select((eb) => eb.fn.count<number>('id').as('count'))
      .where('tenant_id', '=', tenantId)
      .where('status', '=', 'failed')
      .groupBy('job_type')
      .execute();

    const byStatus: Record<string, number> = {};
    for (const row of statusCounts) {
      byStatus[row.status] = Number(row.count);
    }

    const byQueue: Record<string, number> = {};
    for (const row of queueCounts) {
      byQueue[row.queue_name] = Number(row.count);
    }

    const byType: Record<string, number> = {};
    for (const row of typeCounts) {
      byType[row.job_type] = Number(row.count);
    }

    return {
      total: Object.values(byStatus).reduce((a, b) => a + b, 0),
      failed: byStatus['failed'] || 0,
      requeued: byStatus['requeued'] || 0,
      discarded: byStatus['discarded'] || 0,
      byQueue,
      byType,
    };
  });
};
