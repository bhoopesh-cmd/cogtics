import { FastifyPluginAsync } from 'fastify';
import { 
  EnqueueJobRequestSchema, 
  createJobId, 
  createIdempotencyKeyId,
  type QueueName 
} from '@cogtics/schemas';

export const jobRoutes: FastifyPluginAsync = async (fastify) => {
  // Enqueue a job
  fastify.post('/enqueue', {
    preHandler: fastify.requirePermission('jobs.enqueue'),
    handler: async (request, reply) => {
      if (!request.tenantId) {
        throw fastify.httpErrors.unauthorized('No tenant context');
      }

      const parsed = EnqueueJobRequestSchema.safeParse(request.body);
      
      if (!parsed.success) {
        throw fastify.httpErrors.badRequest(parsed.error.message);
      }

      const { payload, idempotencyKey } = parsed.data;
      const jobId = createJobId();
      const queueName = payload.type as QueueName;

      // Check idempotency if key provided
      if (idempotencyKey) {
        const existingKey = await fastify.db
          .selectFrom('idempotency_keys')
          .selectAll()
          .where('tenant_id', '=', request.tenantId)
          .where('scope', '=', 'job')
          .where('key', '=', idempotencyKey)
          .executeTakeFirst();

        if (existingKey) {
          if (existingKey.status === 'completed') {
            return reply.status(200).send({
              status: 'duplicate',
              jobId: existingKey.response_json ? (existingKey.response_json as { jobId: string }).jobId : null,
              message: 'Job already processed with this idempotency key',
            });
          } else if (existingKey.status === 'pending') {
            return reply.status(202).send({
              status: 'in_progress',
              message: 'Job is already being processed',
            });
          }
        }
      }

      // Create idempotency key if provided
      let idempotencyKeyId: string | null = null;
      if (idempotencyKey) {
        idempotencyKeyId = createIdempotencyKeyId();
        await fastify.db
          .insertInto('idempotency_keys')
          .values({
            id: idempotencyKeyId,
            tenant_id: request.tenantId,
            scope: 'job',
            key: idempotencyKey,
            status: 'pending',
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          })
          .execute();
      }

      // Create job record
      await fastify.db
        .insertInto('jobs')
        .values({
          id: jobId,
          tenant_id: request.tenantId,
          type: queueName,
          status: 'pending',
          payload_json: payload,
          idempotency_key_id: idempotencyKeyId,
        })
        .execute();

      // Enqueue to BullMQ
      const queue = fastify.queues[queueName];
      await queue.add(jobId, {
        jobId,
        tenantId: request.tenantId,
        payload,
      });

      await request.audit.log({
        action: 'job.enqueue',
        resource: jobId,
        metadata: { type: queueName, idempotencyKey },
      });

      return reply.status(202).send({
        status: 'queued',
        jobId,
        type: queueName,
      });
    },
  });

  // Get job status
  fastify.get<{ Params: { id: string } }>('/:id', {
    preHandler: fastify.requirePermission('jobs.enqueue'),
    handler: async (request) => {
      if (!request.tenantId) {
        throw fastify.httpErrors.unauthorized('No tenant context');
      }

      const job = await fastify.db
        .selectFrom('jobs')
        .selectAll()
        .where('id', '=', request.params.id)
        .where('tenant_id', '=', request.tenantId)
        .executeTakeFirst();

      if (!job) {
        throw fastify.httpErrors.notFound('Job not found');
      }

      return {
        id: job.id,
        type: job.type,
        status: job.status,
        payload: job.payload_json,
        result: job.result_json,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        completedAt: job.completed_at,
      };
    },
  });

  // List jobs for tenant
  fastify.get('/', {
    preHandler: fastify.requirePermission('jobs.enqueue'),
    handler: async (request) => {
      if (!request.tenantId) {
        throw fastify.httpErrors.unauthorized('No tenant context');
      }

      const jobs = await fastify.db
        .selectFrom('jobs')
        .selectAll()
        .where('tenant_id', '=', request.tenantId)
        .orderBy('created_at', 'desc')
        .limit(50)
        .execute();

      return {
        items: jobs.map((job) => ({
          id: job.id,
          type: job.type,
          status: job.status,
          createdAt: job.created_at,
          completedAt: job.completed_at,
        })),
        total: jobs.length,
      };
    },
  });
};

