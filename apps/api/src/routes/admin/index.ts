import { FastifyPluginAsync } from 'fastify';
import { tenantRoutes } from './tenants.js';
import { userRoutes } from './users.js';
import { auditRoutes } from './audit.js';
import { jobRoutes } from './jobs.js';

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(tenantRoutes, { prefix: '/tenants' });
  await fastify.register(userRoutes, { prefix: '/users' });
  await fastify.register(auditRoutes, { prefix: '/audit-logs' });
  await fastify.register(jobRoutes, { prefix: '/jobs' });
};

