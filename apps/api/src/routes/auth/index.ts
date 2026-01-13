import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const DevTokenRequestSchema = z.object({
  tenantId: z.string().min(1),
  userId: z.string().min(1),
});

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /auth/dev-token
   * Development-only endpoint to mint JWT tokens
   */
  fastify.post<{
    Body: { tenantId: string; userId: string };
  }>('/dev-token', async (request, reply) => {
    const config = fastify.config;

    // Only allow in development
    if (config.NODE_ENV !== 'development') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Dev token endpoint is only available in development mode',
      });
    }

    // Validate request body
    const parseResult = DevTokenRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.badRequest('Invalid request body');
    }

    const { tenantId, userId } = parseResult.data;

    // Verify user exists
    const user = await fastify.db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!user) {
      return reply.notFound('User not found');
    }

    // Verify membership exists
    const membership = await fastify.db
      .selectFrom('memberships')
      .selectAll()
      .where('user_id', '=', userId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!membership) {
      return reply.notFound('User is not a member of this tenant');
    }

    // Sign JWT
    const token = await fastify.jwt.sign({
      sub: userId,
      tid: tenantId,
    });

    // Calculate expiration (24h from now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return {
      token,
      expiresAt,
    };
  });
};

