import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { createAuditLogId, type AuditAction } from '@cogtics/schemas';

interface AuditLogEntry {
  action: AuditAction;
  resource?: string;
  metadata?: Record<string, unknown>;
}

declare module 'fastify' {
  interface FastifyRequest {
    audit: {
      log: (entry: AuditLogEntry) => Promise<void>;
    };
  }
}

const auditPluginImpl: FastifyPluginAsync = async (fastify) => {
  // Decorate request with audit helper
  fastify.decorateRequest('audit', null);

  fastify.addHook('preHandler', async (request) => {
    request.audit = {
      log: async (entry: AuditLogEntry) => {
        if (!request.tenantId) {
          request.log.warn('Cannot log audit entry without tenant context');
          return;
        }

        try {
          await fastify.db
            .insertInto('audit_logs')
            .values({
              id: createAuditLogId(),
              tenant_id: request.tenantId,
              actor_user_id: request.auth?.userId ?? null,
              action: entry.action,
              resource: entry.resource ?? null,
              metadata_json: entry.metadata ?? null,
              request_id: request.id,
            })
            .execute();
        } catch (err) {
          request.log.error({ err }, 'Failed to write audit log');
        }
      },
    };
  });
};

export const auditPlugin = fp(auditPluginImpl, {
  name: 'audit',
  dependencies: ['db', 'auth', 'tenant'],
});

