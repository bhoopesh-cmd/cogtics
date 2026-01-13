import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import * as jose from 'jose';
import type { UserId, TenantId } from '@cogtics/schemas';

export interface AuthContext {
  userId: UserId;
  tenantId: TenantId;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext | null;
  }
  interface FastifyInstance {
    jwt: {
      sign: (payload: { sub: string; tid: string }) => Promise<string>;
      verify: (token: string) => Promise<{ sub: string; tid: string }>;
    };
  }
}

// Routes that skip auth
const PUBLIC_ROUTES = [
  '/health',
  '/health/live',
  '/health/ready',
  '/auth/dev-token',
];

const authPluginImpl: FastifyPluginAsync = async (fastify) => {
  const config = fastify.config;

  // Decorate request with auth context
  fastify.decorateRequest('auth', null);

  // JWT helpers
  const jwtSecret = config.JWT_SECRET || 'dev-secret-change-in-production';
  const secret = new TextEncoder().encode(jwtSecret);

  fastify.decorate('jwt', {
    sign: async (payload: { sub: string; tid: string }) => {
      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret);
      return token;
    },
    verify: async (token: string) => {
      const { payload } = await jose.jwtVerify(token, secret);
      return payload as { sub: string; tid: string };
    },
  });

  fastify.addHook('preHandler', async (request) => {
    // Skip auth for public routes
    const urlPath = request.url.split('?')[0];
    if (PUBLIC_ROUTES.some((route) => urlPath === route || urlPath?.startsWith(route + '/'))) {
      return;
    }

    // Skip auth for static assets (frontend)
    if (
      urlPath?.startsWith('/@') ||
      urlPath?.startsWith('/src') ||
      urlPath?.startsWith('/node_modules') ||
      urlPath?.endsWith('.js') ||
      urlPath?.endsWith('.ts') ||
      urlPath?.endsWith('.tsx') ||
      urlPath?.endsWith('.css') ||
      urlPath?.endsWith('.svg') ||
      urlPath?.endsWith('.png') ||
      urlPath?.endsWith('.ico') ||
      urlPath === '/'
    ) {
      return;
    }

    if (config.AUTH_MODE === 'dev') {
      // Dev mode: support both headers AND JWT
      const authHeader = request.headers['authorization'];
      
      if (authHeader?.startsWith('Bearer ')) {
        // JWT token provided
        const token = authHeader.slice(7);
        try {
          const payload = await fastify.jwt.verify(token);
          request.auth = {
            userId: payload.sub as UserId,
            tenantId: payload.tid as TenantId,
          };
          return;
        } catch {
          throw fastify.httpErrors.unauthorized('Invalid token');
        }
      }

      // Fall back to header-based auth
      const userId = request.headers['x-user-id'] as string | undefined;
      const tenantId = request.headers['x-tenant-id'] as string | undefined;

      if (userId && tenantId) {
        request.auth = {
          userId: userId as UserId,
          tenantId: tenantId as TenantId,
        };
        return;
      }

      // Use env defaults if no auth provided
      if (config.DEV_USER_ID && config.DEV_TENANT_ID) {
        request.auth = {
          userId: config.DEV_USER_ID as UserId,
          tenantId: config.DEV_TENANT_ID as TenantId,
        };
        return;
      }

      throw fastify.httpErrors.unauthorized('Missing authentication');
    } else if (config.AUTH_MODE === 'jwt') {
      // JWT mode: require Authorization header
      const authHeader = request.headers['authorization'];
      if (!authHeader?.startsWith('Bearer ')) {
        throw fastify.httpErrors.unauthorized('Missing Authorization header');
      }

      const token = authHeader.slice(7);
      try {
        const payload = await fastify.jwt.verify(token);
        request.auth = {
          userId: payload.sub as UserId,
          tenantId: payload.tid as TenantId,
        };
      } catch {
        throw fastify.httpErrors.unauthorized('Invalid token');
      }
    } else {
      throw fastify.httpErrors.internalServerError('Invalid AUTH_MODE');
    }
  });
};

export const authPlugin = fp(authPluginImpl, {
  name: 'auth',
  dependencies: ['config'],
});
