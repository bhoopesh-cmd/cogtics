import { FastifyPluginAsync } from 'fastify';
import { CreateTenantRequestSchema, createTenantId } from '@cogtics/schemas';

export const tenantRoutes: FastifyPluginAsync = async (fastify) => {
  // Create tenant (admin only)
  fastify.post('/', {
    preHandler: fastify.requirePermission('tenant.manage'),
    handler: async (request, reply) => {
      const parsed = CreateTenantRequestSchema.safeParse(request.body);
      
      if (!parsed.success) {
        throw fastify.httpErrors.badRequest(parsed.error.message);
      }

      const { name, status } = parsed.data;
      const tenantId = createTenantId();

      const tenant = await fastify.db
        .insertInto('tenants')
        .values({
          id: tenantId,
          name,
          status,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      await request.audit.log({
        action: 'tenant.create',
        resource: tenantId,
        metadata: { name, status },
      });

      return reply.status(201).send({
        id: tenant.id,
        name: tenant.name,
        status: tenant.status,
        createdAt: tenant.created_at,
      });
    },
  });

  // List all tenants (admin only)
  fastify.get('/', {
    preHandler: fastify.requirePermission('tenant.manage'),
    handler: async () => {
      const tenants = await fastify.db
        .selectFrom('tenants')
        .selectAll()
        .orderBy('created_at', 'desc')
        .execute();

      return {
        items: tenants.map((t) => ({
          id: t.id,
          name: t.name,
          status: t.status,
          createdAt: t.created_at,
        })),
        total: tenants.length,
      };
    },
  });

  // Get single tenant
  fastify.get<{ Params: { id: string } }>('/:id', {
    preHandler: fastify.requirePermission('tenant.manage'),
    handler: async (request) => {
      const tenant = await fastify.db
        .selectFrom('tenants')
        .selectAll()
        .where('id', '=', request.params.id)
        .executeTakeFirst();

      if (!tenant) {
        throw fastify.httpErrors.notFound('Tenant not found');
      }

      return {
        id: tenant.id,
        name: tenant.name,
        status: tenant.status,
        createdAt: tenant.created_at,
      };
    },
  });
};

