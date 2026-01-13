import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import type { RoleName } from '@cogtics/schemas';

interface UserPermissions {
  role: RoleName;
  permissions: string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    userPermissions: UserPermissions | null;
    hasPermission: (permission: string) => boolean;
  }
  interface FastifyInstance {
    requirePermission: (permission: string) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const rbacPluginImpl: FastifyPluginAsync = async (fastify) => {
  // Decorate request
  fastify.decorateRequest('userPermissions', null);
  fastify.decorateRequest('hasPermission', function (this: FastifyRequest, permission: string): boolean {
    return this.userPermissions?.permissions.includes(permission) ?? false;
  });

  // Decorate instance with permission check hook
  fastify.decorate('requirePermission', (permission: string) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.hasPermission(permission)) {
        throw fastify.httpErrors.forbidden(`Missing required permission: ${permission}`);
      }
    };
  });

  // Load user permissions on each request
  fastify.addHook('preHandler', async (request) => {
    // Skip for health endpoints
    if (request.url === '/health' || request.url === '/health/ready') {
      return;
    }

    if (!request.auth || !request.tenantId) {
      return;
    }

    // Get user's membership and role
    const membership = await fastify.db
      .selectFrom('memberships')
      .innerJoin('roles', 'roles.id', 'memberships.role_id')
      .select(['roles.name as role_name', 'roles.id as role_id'])
      .where('memberships.user_id', '=', request.auth.userId)
      .where('memberships.tenant_id', '=', request.tenantId)
      .executeTakeFirst();

    if (!membership) {
      throw fastify.httpErrors.forbidden('User is not a member of this tenant');
    }

    // Get role permissions
    const permissions = await fastify.db
      .selectFrom('role_permissions')
      .innerJoin('permissions', 'permissions.id', 'role_permissions.permission_id')
      .select('permissions.name')
      .where('role_permissions.role_id', '=', membership.role_id)
      .execute();

    request.userPermissions = {
      role: membership.role_name as RoleName,
      permissions: permissions.map((p) => p.name),
    };
  });
};

export const rbacPlugin = fp(rbacPluginImpl, {
  name: 'rbac',
  dependencies: ['auth', 'tenant', 'db'],
});

