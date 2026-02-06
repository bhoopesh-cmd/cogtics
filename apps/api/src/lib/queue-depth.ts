import type { FastifyInstance } from 'fastify';

/**
 * Queue depth limits per queue type
 * These thresholds trigger backpressure (HTTP 429) when exceeded
 *
 * Phase 3: Limits increased for 3-worker deployment
 * - 3 workers × 15 concurrency = 45 total slots
 * - 45 slots × 4 jobs/min = 180 jobs/min throughput
 * - Limits set to ~1-2 minutes of backlog
 */
export const QUEUE_DEPTH_LIMITS = {
  'upload.pdf.parse': 225,       // Max 225 pending PDF uploads (3x from 75)
  'upload.csv.parse': 150,       // Max 150 pending CSV uploads (3x from 50)
  'upload.csv.finalize': 150,    // Max 150 pending CSV finalizations (3x from 50)
  'contracts.pdf.extract': 300,  // Max 300 pending PDF extractions (3x from 100)
  'contracts.clause.segment': 300,
  'contracts.terms.extract': 300,
  'contracts.readiness.compute': 300,
  'detect.run': 450,             // Max 450 pending detection runs (3x from 150)
  'detect.replay': 300,
  'simulate': 300,
  'export': 225,
  'ingest.load': 300,
  'ingest.normalize': 300,
  'ingest.upsert': 300,
  'ingest.finalize': 300,
  'ingest.full': 150,
  'sync': 300,
} as const;

export type QueueName = keyof typeof QUEUE_DEPTH_LIMITS;

/**
 * Get current depth for a specific queue type
 * Counts jobs in 'pending' or 'processing' status
 */
export async function getQueueDepth(
  fastify: FastifyInstance,
  queueType: string
): Promise<number> {
  const result = await fastify.db
    .selectFrom('jobs')
    .select((eb) => eb.fn.count<number>('id').as('count'))
    .where('type', '=', queueType)
    .where('status', 'in', ['pending', 'processing'])
    .executeTakeFirst();

  return Number(result?.count ?? 0);
}

/**
 * Check if queue can accept new jobs
 * Returns canEnqueue=false when depth exceeds limit
 */
export async function canEnqueueJob(
  fastify: FastifyInstance,
  queueType: string
): Promise<{
  canEnqueue: boolean;
  currentDepth: number;
  limit: number;
  retryAfterSeconds?: number;
}> {
  const currentDepth = await getQueueDepth(fastify, queueType);
  const limit = QUEUE_DEPTH_LIMITS[queueType as QueueName] ?? 100; // Default limit

  const canEnqueue = currentDepth < limit;

  // Calculate retry-after based on current depth and processing rate
  // Phase 3: 3 workers × 15 concurrency = 45 slots
  // 45 slots × 4 jobs/min = 180 jobs/min throughput
  const retryAfterSeconds = canEnqueue
    ? undefined
    : Math.ceil((currentDepth - limit + 10) / 180) * 60; // Round up to nearest minute

  return {
    canEnqueue,
    currentDepth,
    limit,
    retryAfterSeconds,
  };
}

/**
 * Get all queue depths for monitoring
 * Returns map of queue type to current depth
 */
export async function getAllQueueDepths(
  fastify: FastifyInstance
): Promise<Record<string, number>> {
  const results = await fastify.db
    .selectFrom('jobs')
    .select(['type'])
    .select((eb) => eb.fn.count<number>('id').as('count'))
    .where('status', 'in', ['pending', 'processing'])
    .groupBy('type')
    .execute();

  return Object.fromEntries(
    results.map((r) => [r.type, Number(r.count)])
  );
}

/**
 * Get queue status with utilization percentages
 * Used by enhanced health endpoint
 */
export async function getQueueStatus(
  fastify: FastifyInstance
): Promise<Array<{
  type: string;
  depth: number;
  limit: number;
  utilizationPercent: number;
  status: 'healthy' | 'warning' | 'critical';
}>> {
  const depths = await getAllQueueDepths(fastify);

  return Object.entries(depths).map(([type, depth]) => {
    const limit = QUEUE_DEPTH_LIMITS[type as QueueName] ?? 100;
    const utilizationPercent = (depth / limit) * 100;

    return {
      type,
      depth,
      limit,
      utilizationPercent,
      status:
        utilizationPercent >= 90 ? 'critical' :
        utilizationPercent >= 75 ? 'warning' :
        'healthy',
    };
  });
}
