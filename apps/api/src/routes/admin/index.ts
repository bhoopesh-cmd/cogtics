import { FastifyPluginAsync } from 'fastify';
import { tenantRoutes } from './tenants.js';
import { userRoutes } from './users.js';
import { auditRoutes } from './audit.js';
import { jobRoutes } from './jobs.js';
// Phase 11 routes
import { dlqRoutes } from './dlq.js';
import { integrityRoutes } from './integrity.js';
import { replayRoutes } from './replay.js';

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(tenantRoutes, { prefix: '/tenants' });
  await fastify.register(userRoutes, { prefix: '/users' });
  await fastify.register(auditRoutes, { prefix: '/audit-logs' });
  await fastify.register(jobRoutes, { prefix: '/jobs' });
  // Phase 11 routes
  await fastify.register(dlqRoutes, { prefix: '/dlq' });
  await fastify.register(integrityRoutes, { prefix: '/integrity' });
  await fastify.register(replayRoutes, { prefix: '/replay' });
};

