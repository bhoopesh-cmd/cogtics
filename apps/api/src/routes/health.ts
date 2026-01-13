import { FastifyPluginAsync } from 'fastify';

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
};

