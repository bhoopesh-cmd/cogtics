import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import type { QueueName, JobPayload } from '@cogtics/schemas';

declare module 'fastify' {
  interface FastifyInstance {
    queues: Record<QueueName, Queue>;
    redis: Redis;
  }
}

const QUEUE_NAMES: QueueName[] = ['sync', 'detect', 'simulate', 'export', 'ingest.load', 'ingest.normalize', 'ingest.upsert', 'ingest.finalize', 'ingest.full', 'revrec.compute', 'revrec.reconcile', 'detect.run', 'detect.replay'];

const queuePluginImpl: FastifyPluginAsync = async (fastify) => {
  const redis = new Redis(fastify.config.REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  const queues: Record<string, Queue> = {};

  for (const name of QUEUE_NAMES) {
    queues[name] = new Queue(name, {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 1000,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });
  }

  fastify.decorate('redis', redis);
  fastify.decorate('queues', queues as Record<QueueName, Queue>);

  fastify.addHook('onClose', async () => {
    for (const queue of Object.values(queues)) {
      await queue.close();
    }
    await redis.quit();
  });
};

export const queuePlugin = fp(queuePluginImpl, {
  name: 'queue',
  dependencies: ['config'],
});

