import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import type { QueueName, JobPayload } from '@cogtics/schemas';

declare module 'fastify' {
  interface FastifyInstance {
    queues: Record<QueueName, Queue>;
    redis: Redis;
    jobQueue: {
      add: (name: string, data: unknown) => Promise<unknown>;
    };
  }
}

const QUEUE_NAMES: QueueName[] = [
  // Core queues
  'sync',
  'detect',
  'simulate',
  'export',
  // Ingestion queues 
  'ingest.load',
  'ingest.normalize',
  'ingest.upsert',
  'ingest.finalize',
  'ingest.full',
  // Identity queues
  'identity.resolve',
  'identity.apply',
  // Upload queues
  'upload.csv.parse',
  'upload.csv.finalize',
  'upload.pdf.parse',
  'upload.reprocess' as any,
  // Contract intelligence queues
  'contracts.pdf.extract',
  'contracts.clause.segment',
  'contracts.terms.extract',
  'contracts.readiness.compute',
  // RevRec queues
  'revrec.compute',
  'revrec.reconcile',
  // Detection queues
  'detect.run',
  'detect.replay',
  // Evidence queues (PREVIOUSLY MISSING - caused 500 errors)
  'evidence.generate',
  'evidence.regenerate',
  // Simulation queues (PREVIOUSLY MISSING)
  'simulation.run',
  'simulation.replay',
  // Export queues
  'export.csv.generate',
  'export.pdf.render',
  // Digest queue
  'digest.send',
];

const queuePluginImpl: FastifyPluginAsync = async (fastify) => {
  const redis = new Redis(fastify.config.REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  const queues: Record<string, Queue> = {};

  for (const name of QUEUE_NAMES) {
    queues[name] = new Queue(name, {
      connection: redis as any,
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

  // Generic job queue interface that routes to the correct queue by job name
  fastify.decorate('jobQueue', {
    add: async (name: string, data: unknown) => {
      const queue = queues[name as QueueName];
      if (!queue) {
        throw new Error(`Unknown queue: ${name}`);
      }
      return queue.add(name, data);
    },
  });

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

