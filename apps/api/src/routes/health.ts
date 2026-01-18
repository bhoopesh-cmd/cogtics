import { FastifyPluginAsync } from 'fastify';
import { getPrometheusExporter } from '@cogtics/utils';

// Track server start time for uptime calculation
const startTime = Date.now();

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  // Basic health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Readiness check (includes dependencies)
  fastify.get('/health/ready', async (request, reply) => {
    const checks: Record<string, boolean> = {};

    // Check database
    try {
      await fastify.db.selectFrom('tenants').select('id').limit(1).execute();
      checks['database'] = true;
    } catch {
      checks['database'] = false;
    }

    // Check Redis
    try {
      await fastify.redis.ping();
      checks['redis'] = true;
    } catch {
      checks['redis'] = false;
    }

    const allHealthy = Object.values(checks).every(Boolean);

    if (!allHealthy) {
      return reply.status(503).send({
        status: 'unhealthy',
        checks,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: 'ready',
      checks,
      timestamp: new Date().toISOString(),
    };
  });

  // Prometheus metrics endpoint (Phase 11)
  fastify.get('/metrics', async (request, reply) => {
    const exporter = getPrometheusExporter();
    
    if (!exporter) {
      return reply.status(503).send({
        error: 'Metrics not available',
        message: 'OpenTelemetry is not enabled',
      });
    }

    try {
      // Get metrics from Prometheus exporter
      const metrics = await exporter.collect();
      reply.header('Content-Type', 'text/plain; version=0.0.4');
      return reply.send(metrics);
    } catch (err) {
      request.log.error({ err }, 'Failed to collect metrics');
      return reply.status(500).send({ error: 'Failed to collect metrics' });
    }
  });

  // Detailed health check with queue info (Phase 11)
  fastify.get('/health/detailed', async (request, reply) => {
    const checks: Record<string, { status: boolean; latencyMs?: number }> = {};
    const queueInfo: Record<string, { depth: number; oldestJobAge?: number }> = {};

    // Check database with latency
    const dbStart = Date.now();
    try {
      await fastify.db.selectFrom('tenants').select('id').limit(1).execute();
      checks['database'] = { status: true, latencyMs: Date.now() - dbStart };
    } catch {
      checks['database'] = { status: false, latencyMs: Date.now() - dbStart };
    }

    // Check Redis with latency
    const redisStart = Date.now();
    try {
      await fastify.redis.ping();
      checks['redis'] = { status: true, latencyMs: Date.now() - redisStart };
    } catch {
      checks['redis'] = { status: false, latencyMs: Date.now() - redisStart };
    }

    // Check storage (MinIO/S3)
    const storageStart = Date.now();
    try {
      if (fastify.storage) {
        // Just check if storage client exists
        checks['storage'] = { status: true, latencyMs: Date.now() - storageStart };
      } else {
        checks['storage'] = { status: false, latencyMs: 0 };
      }
    } catch {
      checks['storage'] = { status: false, latencyMs: Date.now() - storageStart };
    }

    // Get queue depths from jobs table
    try {
      const queueCounts = await fastify.db
        .selectFrom('jobs')
        .select(['type'])
        .select((eb) => eb.fn.count<number>('id').as('count'))
        .where('status', 'in', ['pending', 'processing'])
        .groupBy('type')
        .execute();

      for (const q of queueCounts) {
        queueInfo[q.type] = { depth: Number(q.count) };
      }
    } catch {
      // Ignore queue check errors
    }

    // Get DLQ count
    let dlqCount = 0;
    try {
      const dlqResult = await fastify.db
        .selectFrom('dead_letter_jobs')
        .select((eb) => eb.fn.count<number>('id').as('count'))
        .where('status', '=', 'failed')
        .executeTakeFirst();
      dlqCount = Number(dlqResult?.count || 0);
    } catch {
      // DLQ table may not exist yet
    }

    const allHealthy = Object.values(checks).every((c) => c.status);
    const status = allHealthy ? 'healthy' : 'degraded';

    return {
      status,
      checks,
      queues: queueInfo,
      dlq: { totalCount: dlqCount },
      version: process.env['npm_package_version'] || '0.0.0',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
    };
  });
};

