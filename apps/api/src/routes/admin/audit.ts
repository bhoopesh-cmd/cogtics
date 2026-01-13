import { FastifyPluginAsync } from 'fastify';
import { AuditLogQuerySchema } from '@cogtics/schemas';

export const auditRoutes: FastifyPluginAsync = async (fastify) => {
  // List audit logs (tenant scoped)
  fastify.get('/', {
    preHandler: fastify.requirePermission('audit.read'),
    handler: async (request) => {
      if (!request.tenantId) {
        throw fastify.httpErrors.unauthorized('No tenant context');
      }

      const parsed = AuditLogQuerySchema.safeParse(request.query);
      
      if (!parsed.success) {
        throw fastify.httpErrors.badRequest(parsed.error.message);
      }

      const { action, actorUserId, startDate, endDate, limit, offset } = parsed.data;

      let query = fastify.db
        .selectFrom('audit_logs')
        .selectAll()
        .where('tenant_id', '=', request.tenantId)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      if (action) {
        query = query.where('action', '=', action);
      }

      if (actorUserId) {
        query = query.where('actor_user_id', '=', actorUserId);
      }

      if (startDate) {
        query = query.where('created_at', '>=', new Date(startDate));
      }

      if (endDate) {
        query = query.where('created_at', '<=', new Date(endDate));
      }

      const logs = await query.execute();

      // Get total count
      const countResult = await fastify.db
        .selectFrom('audit_logs')
        .select((eb) => eb.fn.countAll().as('count'))
        .where('tenant_id', '=', request.tenantId)
        .executeTakeFirst();

      const total = Number(countResult?.count ?? 0);

      return {
        items: logs.map((log) => ({
          id: log.id,
          tenantId: log.tenant_id,
          actorUserId: log.actor_user_id,
          action: log.action,
          resource: log.resource,
          metadata: log.metadata_json,
          requestId: log.request_id,
          createdAt: log.created_at,
        })),
        total,
        limit,
        offset,
      };
    },
  });
};

