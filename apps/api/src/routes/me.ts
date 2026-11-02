import { FastifyPluginAsync } from 'fastify';

export const meRoutes: FastifyPluginAsync = async (fastify) => {
  // Get current user context
  fastify.get('/me', async (request, reply) => {
    if (!request.auth) {
      throw fastify.httpErrors.unauthorized('Not authenticated');
    }

    // Get user details
    const user = await fastify.db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', request.userId)
      .executeTakeFirst();

    if (!user) {
      throw fastify.httpErrors.notFound('User not found');
    }

    // Get tenant details
    const tenant = await fastify.db
      .selectFrom('tenants')
      .selectAll()
      .where('id', '=', request.tenantId)
      .executeTakeFirst();

    if (!tenant) {
      throw fastify.httpErrors.notFound('Tenant not found');
    }

    // Return flat structure for frontend
    return {
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      name: user.name,
      role: request.userPermissions?.role ?? 'User',
      permissions: request.userPermissions?.permissions ?? [],
      tenant: {
        id: tenant.id,
        name: tenant.name,
        status: tenant.status,
      },
    };
  });
};
