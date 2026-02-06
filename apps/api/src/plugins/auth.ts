import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import * as jose from 'jose';
import { createClerkClient } from '@clerk/backend';
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

  // JWT helpers (for dev/jwt modes)
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

  // Initialize Clerk client
  let clerkClient: ReturnType<typeof createClerkClient> | null = null;

  // Register Clerk client if using clerk mode
  if (config.AUTH_MODE === 'clerk' && config.CLERK_SECRET_KEY) {
    clerkClient = createClerkClient({ secretKey: config.CLERK_SECRET_KEY });
  }

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

    // ===========================================
    // CLERK MODE - Production recommended
    // ===========================================
    if (config.AUTH_MODE === 'clerk') {
      if (!config.CLERK_SECRET_KEY || !clerkClient) {
        throw fastify.httpErrors.internalServerError('CLERK_SECRET_KEY not configured');
      }

      try {
        // Authenticate request using Clerk Backend SDK
        // We need to construct a Request object that looks like what Clerk expects
        // This handles standard Authorization header (Bearer token)
        const { isSignedIn, toAuth } = await clerkClient.authenticateRequest(
          new Request(request.url, {
            method: request.method,
            headers: request.headers as any,
          }),
          {
            publishableKey: config.CLERK_PUBLISHABLE_KEY,
            secretKey: config.CLERK_SECRET_KEY,
          }
        );

        if (!isSignedIn) {
          throw fastify.httpErrors.unauthorized('Not authenticated');
        }

        const auth = toAuth();

        if (!auth || !auth.userId) {
          throw fastify.httpErrors.unauthorized('Not authenticated');
        }

        // Get organizationId from Clerk session (maps to tenantId)
        const organizationId = auth.orgId;
        if (!organizationId) {
          throw fastify.httpErrors.forbidden('No organization selected. Please select an organization.');
        }

        request.auth = {
          userId: auth.userId as UserId,
          tenantId: organizationId as TenantId,
        };
        return;
      } catch (error: any) {
        if (error.statusCode) throw error;
        request.log.error({ error }, 'Clerk authentication failed');
        throw fastify.httpErrors.unauthorized('Invalid authentication');
      }
    }

    // ===========================================
    // DEV MODE - Local development only
    // Accepts either: Bearer JWT token OR x-tenant-id/x-user-id headers
    // ===========================================
    if (config.AUTH_MODE === 'dev') {
      // First, try Bearer token (from dev-token endpoint)
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const payload = await fastify.jwt.verify(token);
          request.auth = {
            userId: payload.sub as UserId,
            tenantId: payload.tid as TenantId,
          };
          return;
        } catch (err) {
          // Token invalid, fall through to header check
          request.log.debug('Dev mode: Bearer token invalid, checking headers');
        }
      }

      // Fall back to header-based auth
      const tenantId = request.headers['x-tenant-id'] as string || config.DEV_TENANT_ID;
      const userId = request.headers['x-user-id'] as string || config.DEV_USER_ID;

      if (!tenantId || !userId) {
        throw fastify.httpErrors.unauthorized('Missing authentication. Provide Bearer token or x-tenant-id/x-user-id headers');
      }

      request.auth = {
        userId: userId as UserId,
        tenantId: tenantId as TenantId,
      };
      return;
    }

    // ===========================================
    // JWT MODE - Standalone JWT (Phase 1 legacy)
    // ===========================================
    if (config.AUTH_MODE === 'jwt') {
      const start = Date.now();
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          throw fastify.httpErrors.unauthorized('Missing bearer token');
        }

        const token = authHeader.substring(7);
        const payload = await fastify.jwt.verify(token);

        request.auth = {
          userId: payload.sub as UserId,
          tenantId: payload.tid as TenantId,
        };
        return;
      } catch (err) {
        throw fastify.httpErrors.unauthorized('Invalid token');
      }
    }

    // Fallback if no valid mode
    throw fastify.httpErrors.internalServerError('Invalid AUTH_MODE configuration');
  });
};

export const authPlugin = fp(authPluginImpl, {
  name: 'auth',
  dependencies: ['config'],
});
