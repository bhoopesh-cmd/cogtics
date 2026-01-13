import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import type { TenantId } from '@cogtics/schemas';

declare module 'fastify' {
  interface FastifyRequest {
    tenantId: TenantId | null;
    setTenantContext: () => Promise<void>;
  }
}

const tenantPluginImpl: FastifyPluginAsync = async (fastify) => {
  // Decorate request with tenant context
  fastify.decorateRequest('tenantId', null);
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

    // Function to set tenant context in database session
    request.setTenantContext = async () => {
      if (request.tenantId) {
        await fastify.db.executeQuery(
          fastify.db
            .raw(`SET LOCAL app.tenant_id = '${request.tenantId}'`)
            .compile(fastify.db)
        );
      }
    };
  });
};

export const tenantPlugin = fp(tenantPluginImpl, {
  name: 'tenant',
  dependencies: ['auth', 'db'],
});

