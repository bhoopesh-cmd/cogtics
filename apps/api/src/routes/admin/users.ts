import { FastifyPluginAsync } from 'fastify';
import { CreateUserRequestSchema, createUserId, createMembershipId } from '@cogtics/schemas';

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  // Create user with tenant membership (admin only)
  fastify.post('/', {
    preHandler: fastify.requirePermission('user.manage'),
    handler: async (request, reply) => {
      const parsed = CreateUserRequestSchema.safeParse(request.body);
      
      if (!parsed.success) {
        throw fastify.httpErrors.badRequest(parsed.error.message);
      }

      const { email, name, tenantId, role } = parsed.data;
      const userId = createUserId();
      const membershipId = createMembershipId();

      // Map role name to role ID
      const roleRecord = await fastify.db
        .selectFrom('roles')
        .select('id')
        .where('name', '=', role)
        .executeTakeFirst();

      if (!roleRecord) {
        throw fastify.httpErrors.badRequest(`Invalid role: ${role}`);
      }

      // Check if tenant exists
      const tenant = await fastify.db
        .selectFrom('tenants')
        .select('id')
        .where('id', '=', tenantId)
        .executeTakeFirst();

      if (!tenant) {
        throw fastify.httpErrors.badRequest('Tenant not found');
      }

      // Check if email already exists
      const existingUser = await fastify.db
        .selectFrom('users')
        .select('id')
        .where('email', '=', email)
        .executeTakeFirst();

      if (existingUser) {
        throw fastify.httpErrors.conflict('Email already registered');
      }

      // Create user and membership in transaction
      const result = await fastify.db.transaction().execute(async (trx) => {
        const user = await trx
          .insertInto('users')
          .values({
            id: userId,
            email,
            name,
            status: 'active',
          })
          .returningAll()
          .executeTakeFirstOrThrow();

        await trx
          .insertInto('memberships')
          .values({
            id: membershipId,
            tenant_id: tenantId,
            user_id: userId,
            role_id: roleRecord.id,
          })
          .execute();

        return user;
      });

      await request.audit.log({
        action: 'user.create',
        resource: userId,
        metadata: { email, name, tenantId, role },
      });

      return reply.status(201).send({
        id: result.id,
        email: result.email,
        name: result.name,
        status: result.status,
        createdAt: result.created_at,
        tenantId,
        role,
      });
    },
  });

  // List users in tenant
  fastify.get('/', {
    preHandler: fastify.requirePermission('user.manage'),
    handler: async (request) => {
      if (!request.tenantId) {
        throw fastify.httpErrors.unauthorized('No tenant context');
      }

      const users = await fastify.db
        .selectFrom('users')
        .innerJoin('memberships', 'memberships.user_id', 'users.id')
        .innerJoin('roles', 'roles.id', 'memberships.role_id')
        .select([
          'users.id',
          'users.email',
          'users.name',
          'users.status',
          'users.created_at',
          'roles.name as role',
        ])
        .where('memberships.tenant_id', '=', request.tenantId)
        .orderBy('users.created_at', 'desc')
        .execute();

      return {
        items: users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          status: u.status,
          createdAt: u.created_at,
          role: u.role,
        })),
        total: users.length,
      };
    },
  });
};

