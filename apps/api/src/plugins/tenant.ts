import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { sql } from 'kysely';
import type { TenantId, UserId } from '@cogtics/schemas';

declare module 'fastify' {
  interface FastifyRequest {
    tenantId: TenantId;
    userId: UserId;
    setTenantContext: () => Promise<void>;
  }
}

const tenantPluginImpl: FastifyPluginAsync = async (fastify) => {
  // Decorate request with tenant context
  fastify.decorateRequest('tenantId', null as unknown as TenantId);
  fastify.decorateRequest('userId', null as unknown as UserId);
  fastify.decorateRequest('setTenantContext', null);

  fastify.addHook('preHandler', async (request) => {
    // Skip for health endpoints
    if (request.url === '/health' || request.url === '/health/ready') {
      return;
    }

    if (!request.auth) {
      return;
    }

    request.tenantId = request.auth.tenantId;
    request.userId = request.auth.userId;

    // Function to set tenant context in database session
    request.setTenantContext = async () => {
      await fastify.db.executeQuery(
        sql`SET LOCAL app.tenant_id = ${sql.lit(request.tenantId)}`.compile(fastify.db)
      );
    };
  });
};

export const tenantPlugin = fp(tenantPluginImpl, {
  name: 'tenant',
  dependencies: ['auth', 'db'],
});

