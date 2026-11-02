import { FastifyPluginAsync } from 'fastify';
import { randomUUID, createHash, randomBytes } from 'crypto';
import { sql } from '@cogtics/db';
import {
  ConnectorProviderSchema,
  StartOAuthRequestSchema,
  OAuthCallbackRequestSchema,
  TriggerSyncRequestSchema,
  type ConnectorProvider,
} from '@cogtics/schemas';
import { generateState } from '@cogtics/connectors';

export const connectionRoutes: FastifyPluginAsync = async (fastify) => {
  const PKCE_TTL_SECONDS = 10 * 60;
  const pkceKey = (provider: string, state: string) => `oauth:pkce:${provider}:${state}`;

  function base64UrlEncode(buffer: Buffer) {
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  function createCodeVerifier() {
    // 32 bytes => 43 char base64url (within PKCE 43-128 range)
    return base64UrlEncode(randomBytes(32));
  }

  function createCodeChallengeS256(verifier: string) {
    const hash = createHash('sha256').update(verifier).digest();
    return base64UrlEncode(hash);
  }

  // ============================================
  // List all connections for tenant
  // ============================================
  fastify.get('/', {
    preHandler: [fastify.requirePermission('integrations.manage')],
  }, async (request) => {
    const tenantId = request.tenantId;

    const connections = await fastify.db
      .selectFrom('connections')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .orderBy('created_at', 'desc')
      .execute();

    return {
      connections: connections.map(mapConnectionToResponse),
      total: connections.length,
    };
  });

  // ============================================
  // Get single connection
  // ============================================
  fastify.get<{ Params: { id: string } }>('/:id', {
    preHandler: [fastify.requirePermission('integrations.manage')],
  }, async (request, reply) => {
    const { id } = request.params;
    const tenantId = request.tenantId;

    const connection = await fastify.db
      .selectFrom('connections')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!connection) {
      return reply.notFound('Connection not found');
    }

    return mapConnectionToResponse(connection);
  });

  // ============================================
  // Start OAuth flow
  // ============================================
  fastify.post<{ 
    Params: { provider: string };
    Body: { redirectUri?: string; state?: string };
  }>('/:provider/start', {
    preHandler: [fastify.requirePermission('integrations.manage')],
  }, async (request, reply) => {
    const { provider: providerStr } = request.params;
    const body = StartOAuthRequestSchema.safeParse({ 
      provider: providerStr, 
      ...request.body 
    });

    if (!body.success) {
      return reply.badRequest(body.error.message);
    }

    const { provider } = body.data;
    const config = fastify.config;

    // Get OAuth config for provider
    const oauthConfig = getOAuthConfig(config, provider, body.data.redirectUri);
    if (!oauthConfig) {
      return reply.badRequest(`OAuth not configured for ${provider}`);
    }

    // Generate state for CSRF protection
    const state = body.data.state ?? generateState();

    // Get connector and build auth URL
    const connector = fastify.connectors.get(provider);

    // Salesforce requires PKCE (often enforced by org policy). Generate and store code_verifier keyed by state.
    let authUrl: string;
    if (provider === 'salesforce') {
      const codeVerifier = createCodeVerifier();
      const codeChallenge = createCodeChallengeS256(codeVerifier);

      await fastify.redis.setex(pkceKey(provider, state), PKCE_TTL_SECONDS, codeVerifier);

      authUrl = connector.getAuthUrl({
        ...oauthConfig,
        state,
        codeChallenge,
        codeChallengeMethod: 'S256',
      });
    } else {
      authUrl = connector.getAuthUrl({
        ...oauthConfig,
        state,
      });
    }

    return { authUrl, state };
  });

  // ============================================
  // OAuth callback - exchange code for tokens
  // ============================================
  fastify.post<{
    Params: { provider: string };
    Body: { code: string; state?: string; displayName?: string };
  }>('/:provider/callback', {
    preHandler: [fastify.requirePermission('integrations.manage')],
  }, async (request, reply) => {
    const { provider: providerStr } = request.params;
    const body = OAuthCallbackRequestSchema.safeParse({
      provider: providerStr,
      ...request.body,
    });

    if (!body.success) {
      return reply.badRequest(body.error.message);
    }

    const { provider, code } = body.data;
    const tenantId = request.tenantId;
    const userId = request.userId;
    const config = fastify.config;

    // Get OAuth config
    const oauthConfig = getOAuthConfig(config, provider);
    if (!oauthConfig) {
      return reply.badRequest(`OAuth not configured for ${provider}`);
    }

    try {
      // Exchange code for tokens
      const connector = fastify.connectors.get(provider);

      let tokenResponse;
      if (provider === 'salesforce') {
        const state = body.data.state;
        if (!state) {
          return reply.badRequest('Missing state');
        }
        const verifier = await fastify.redis.get(pkceKey(provider, state));
        if (!verifier) {
          return reply.badRequest('PKCE verifier missing or expired; restart OAuth flow');
        }
        await fastify.redis.del(pkceKey(provider, state));
        tokenResponse = await connector.exchangeCode(code, { ...oauthConfig, codeVerifier: verifier });
      } else {
        tokenResponse = await connector.exchangeCode(code, oauthConfig);
      }

      // Create connection record
      const connectionId = `conn_${randomUUID().replace(/-/g, '')}`;
      const credentialId = `cred_${randomUUID().replace(/-/g, '')}`;

      // Encrypt tokens
      const accessTokenEnc = await fastify.connectors.encryptToken(tokenResponse.accessToken);
      const refreshTokenEnc = tokenResponse.refreshToken
        ? await fastify.connectors.encryptToken(tokenResponse.refreshToken)
        : null;

      // Insert connection
      await fastify.db
        .insertInto('connections')
        .values({
          id: connectionId,
          tenant_id: tenantId,
          provider,
          status: 'connected',
          display_name: (request.body as { displayName?: string }).displayName ?? `${provider} connection`,
          created_by: userId,
        })
        .execute();

      // Insert credentials
      await fastify.db
        .insertInto('connection_credentials')
        .values({
          id: credentialId,
          connection_id: connectionId,
          access_token_enc: accessTokenEnc,
          refresh_token_enc: refreshTokenEnc,
          token_type: tokenResponse.tokenType,
          scopes: tokenResponse.scopes ?? null,
          expires_at: tokenResponse.expiresAt ?? null,
          external_account_id: tokenResponse.externalAccountId ?? null,
          instance_url: tokenResponse.instanceUrl ?? null,
        })
        .execute();

      // Audit log
      await request.audit.log({
        action: 'connection.created' as any,
        resource: `connections/${connectionId}`,
        metadata: {
          provider,
          externalAccountId: tokenResponse.externalAccountId,
        },
      });

      return {
        connectionId,
        status: 'connected' as const,
        externalAccountId: tokenResponse.externalAccountId,
      };
    } catch (error) {
      request.log.error({ error }, 'OAuth callback failed');
      return reply.internalServerError('Failed to complete OAuth flow');
    }
  });

  // ============================================
  // OAuth callback - GET handler for browser redirects
  // ============================================
  fastify.get<{
    Params: { provider: string };
    Querystring: { code?: string; state?: string; error?: string };
  }>('/:provider/callback', async (request, reply) => {
    const { provider: providerStr } = request.params;
    const { code, state, error: oauthError } = request.query;
    const config = fastify.config;
    
    // Get frontend URL for redirects (defaults to same origin in production)
    const frontendUrl = config.FRONTEND_URL || '';

    // Handle OAuth errors
    if (oauthError) {
      return reply.redirect(`${frontendUrl}/settings/integrations?error=${encodeURIComponent(oauthError)}`);
    }

    if (!code) {
      return reply.redirect(`${frontendUrl}/settings/integrations?error=missing_code`);
    }

    // Validate provider
    const providerResult = ConnectorProviderSchema.safeParse(providerStr);
    if (!providerResult.success) {
      return reply.redirect(`${frontendUrl}/settings/integrations?error=invalid_provider`);
    }

    const provider = providerResult.data;

    // For GET callback, we need auth from session/token
    // In dev mode with JWT, the token should be in a cookie or we redirect to complete flow
    if (!request.auth) {
      // Redirect to login with return URL
      return reply.redirect(`${frontendUrl}/login?returnTo=/connections/${provider}/callback?code=${code}&state=${state || ''}`);
    }

    const tenantId = request.tenantId;
    const userId = request.userId;

    const oauthConfig = getOAuthConfig(config, provider);
    if (!oauthConfig) {
      return reply.redirect(`${frontendUrl}/settings/integrations?error=oauth_not_configured`);
    }

    try {
      const connector = fastify.connectors.get(provider);

      let tokenResponse;
      if (provider === 'salesforce') {
        if (!state) {
          return reply.redirect(`${frontendUrl}/settings/integrations?error=missing_state`);
        }
        const verifier = await fastify.redis.get(pkceKey(provider, state));
        if (!verifier) {
          return reply.redirect(`${frontendUrl}/settings/integrations?error=pkce_expired`);
        }
        await fastify.redis.del(pkceKey(provider, state));
        tokenResponse = await connector.exchangeCode(code, { ...oauthConfig, codeVerifier: verifier });
      } else {
        tokenResponse = await connector.exchangeCode(code, oauthConfig);
      }

      const connectionId = `conn_${randomUUID().replace(/-/g, '')}`;
      const credentialId = `cred_${randomUUID().replace(/-/g, '')}`;

      const accessTokenEnc = await fastify.connectors.encryptToken(tokenResponse.accessToken);
      const refreshTokenEnc = tokenResponse.refreshToken
        ? await fastify.connectors.encryptToken(tokenResponse.refreshToken)
        : null;

      await fastify.db
        .insertInto('connections')
        .values({
          id: connectionId,
          tenant_id: tenantId,
          provider,
          status: 'connected',
          display_name: `${provider} connection`,
          created_by: userId,
        })
        .execute();

      await fastify.db
        .insertInto('connection_credentials')
        .values({
          id: credentialId,
          connection_id: connectionId,
          access_token_enc: accessTokenEnc,
          refresh_token_enc: refreshTokenEnc,
          token_type: tokenResponse.tokenType,
          scopes: tokenResponse.scopes ?? null,
          expires_at: tokenResponse.expiresAt ?? null,
          external_account_id: tokenResponse.externalAccountId ?? null,
          instance_url: tokenResponse.instanceUrl ?? null,
        })
        .execute();

      await request.audit.log({
        action: 'connection.created' as any,
        resource: `connections/${connectionId}`,
        metadata: {
          provider,
          externalAccountId: tokenResponse.externalAccountId,
        },
      });

      return reply.redirect(`${frontendUrl}/settings/integrations?connected=${provider}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      request.log.error(
        {
          errorMessage: err.message,
          errorName: err.name,
          errorStack: err.stack,
        },
        'OAuth GET callback failed'
      );
      return reply.redirect(`${frontendUrl}/settings/integrations?error=oauth_failed`);
    }
  });

  // ============================================
  // Get connection schema
  // ============================================
  fastify.get<{ Params: { id: string } }>('/:id/schema', {
    preHandler: [fastify.requirePermission('integrations.manage')],
  }, async (request, reply) => {
    const { id } = request.params;
    const tenantId = request.tenantId;

    const connection = await fastify.db
      .selectFrom('connections')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!connection) {
      return reply.notFound('Connection not found');
    }

    const schemas = await fastify.db
      .selectFrom('connector_schemas')
      .selectAll()
      .where('connection_id', '=', id)
      .execute();

    return {
      connectionId: id,
      provider: connection.provider,
      objects: schemas.map((s) => ({
        objectType: s.object_type,
        schema: s.schema_json,
        discoveredAt: s.discovered_at,
      })),
    };
  });

  // ============================================
  // Trigger schema discovery
  // ============================================
  fastify.post<{ Params: { id: string } }>('/:id/discover', {
    preHandler: [fastify.requirePermission('integrations.manage')],
  }, async (request, reply) => {
    const { id } = request.params;
    const tenantId = request.tenantId;

    const connection = await getConnectionWithCredentials(fastify.db, id, tenantId);
    if (!connection) {
      return reply.notFound('Connection not found');
    }

    try {
      // Decrypt credentials
      const credentials = await decryptCredentials(fastify, connection.credentials);

      // Discover schema
      const connector = fastify.connectors.get(connection.provider as ConnectorProvider);
      const schema = await connector.discoverSchema(credentials);

      // Store discovered schemas
      for (const object of schema.objects) {
        await fastify.db
          .insertInto('connector_schemas')
          .values({
            id: `schema_${randomUUID().replace(/-/g, '')}`,
            connection_id: id,
            object_type: object.name,
            schema_json: object as unknown,
            discovered_at: schema.discoveredAt,
          })
          .onConflict((oc) =>
            oc.columns(['connection_id', 'object_type']).doUpdateSet({
              schema_json: object as unknown,
              discovered_at: schema.discoveredAt,
            })
          )
          .execute();
      }

      return {
        connectionId: id,
        provider: schema.provider,
        objectCount: schema.objects.length,
        discoveredAt: schema.discoveredAt,
      };
    } catch (error) {
      request.log.error({ error }, 'Schema discovery failed');
      return reply.internalServerError('Failed to discover schema');
    }
  });

  // ============================================
  // Trigger sync
  // ============================================
  fastify.post<{ 
    Params: { id: string };
    Body: { runType?: 'full' | 'incremental'; objectTypes?: string[] };
  }>('/:id/sync', {
    preHandler: [fastify.requirePermission('integrations.manage')],
  }, async (request, reply) => {
    const { id } = request.params;
    const tenantId = request.tenantId;
    const body = TriggerSyncRequestSchema.parse(request.body ?? {});

    const connection = await fastify.db
      .selectFrom('connections')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!connection) {
      return reply.notFound('Connection not found');
    }

    if (connection.status !== 'connected') {
      return reply.badRequest('Connection is not active');
    }

    // Create a sync job
    const jobId = `job_${randomUUID().replace(/-/g, '')}`;
    const runId = `run_${randomUUID().replace(/-/g, '')}`;

    // Create job record first (connector_run references it)
    await fastify.db
      .insertInto('jobs')
      .values({
        id: jobId,
        tenant_id: tenantId,
        type: 'sync',
        status: 'pending',
        payload_json: {
          type: 'sync',
          tenantId,
          connectionId: id,
          runId,
          runType: body.runType,
          objectTypes: body.objectTypes,
        },
      })
      .execute();

    // Create connector run record
    await fastify.db
      .insertInto('connector_runs')
      .values({
        id: runId,
        connection_id: id,
        tenant_id: tenantId,
        run_type: body.runType,
        status: 'running',
        job_id: jobId,
      })
      .execute();

    // Enqueue to BullMQ
    await fastify.queues.sync.add('sync', {
      jobId,
      tenantId,
      payload: {
        type: 'sync' as const,
        tenantId,
        connectionId: id,
        runId,
        runType: body.runType,
        objectTypes: body.objectTypes,
      },
    }, {
      jobId,
    });

    await request.audit.log({
      action: 'connection.sync.triggered' as any,
      resource: `connections/${id}`,
      metadata: {
        runId,
        runType: body.runType,
      },
    });

    return {
      runId,
      jobId,
      status: 'running' as const,
    };
  });

  // ============================================
  // Health check
  // ============================================
  fastify.post<{ Params: { id: string } }>('/:id/health', {
    preHandler: [fastify.requirePermission('integrations.manage')],
  }, async (request, reply) => {
    const { id } = request.params;
    const tenantId = request.tenantId;

    const connection = await getConnectionWithCredentials(fastify.db, id, tenantId);
    if (!connection) {
      return reply.notFound('Connection not found');
    }

    try {
      let credentials = await decryptCredentials(fastify, connection.credentials);
      const connector = fastify.connectors.get(connection.provider as ConnectorProvider);
      
      // For OAuth providers, try to refresh token first if we have a refresh token
      if (credentials.refreshToken && connection.provider === 'salesforce') {
        try {
          request.log.info({ provider: connection.provider }, 'Attempting token refresh before health check');
          const oauthConfig = getOAuthConfig(fastify.config, connection.provider as ConnectorProvider);
          if (!oauthConfig) {
            throw new Error('OAuth not configured for provider');
          }
          const refreshed = await connector.refreshToken(credentials.refreshToken, oauthConfig);
          
          // Update stored credentials with new tokens
          const accessTokenEnc = await fastify.connectors.encryptToken(refreshed.accessToken);
          const refreshTokenEnc = refreshed.refreshToken 
            ? await fastify.connectors.encryptToken(refreshed.refreshToken)
            : credentials.refreshToken 
              ? await fastify.connectors.encryptToken(credentials.refreshToken)
              : null;
          
          await fastify.db
            .updateTable('connection_credentials')
            .set({
              access_token_enc: accessTokenEnc,
              refresh_token_enc: refreshTokenEnc,
              instance_url: refreshed.instanceUrl,
              updated_at: new Date(),
            })
            .where('connection_id', '=', id)
            .execute();
          
          credentials = {
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken ?? credentials.refreshToken,
            tokenType: refreshed.tokenType,
            instanceUrl: refreshed.instanceUrl,
            externalAccountId: refreshed.externalAccountId,
          } as any;
          
          request.log.info({ provider: connection.provider }, 'Token refreshed successfully');
        } catch (refreshError) {
          const errMsg = refreshError instanceof Error ? refreshError.message : String(refreshError);
          request.log.warn({ errorMessage: errMsg, provider: connection.provider }, 'Token refresh failed, trying health check with existing token');
        }
      }
      
      const health = await connector.healthCheck(credentials);

      // Update connection status based on health
      const newStatus = health.healthy ? 'connected' : 'error';
      await fastify.db
        .updateTable('connections')
        .set({
          status: newStatus,
          last_error_message: health.healthy ? null : health.message,
          last_error_at: health.healthy ? null : new Date(),
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .execute();

      return {
        healthy: health.healthy,
        message: health.message,
        checkedAt: health.checkedAt,
        externalAccountId: health.externalAccountId,
      };
    } catch (error) {
      request.log.error({ error }, 'Health check failed');
      return reply.internalServerError('Health check failed');
    }
  });

  // ============================================
  // Delete connection
  // ============================================
  fastify.delete<{ Params: { id: string } }>('/:id', {
    preHandler: [fastify.requirePermission('integrations.manage')],
  }, async (request, reply) => {
    const { id } = request.params;
    const tenantId = request.tenantId;

    const connection = await fastify.db
      .selectFrom('connections')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!connection) {
      return reply.notFound('Connection not found');
    }

    // Delete cascades to credentials, schemas, cursors
    await fastify.db
      .deleteFrom('connections')
      .where('id', '=', id)
      .execute();

    await request.audit.log({
      action: 'connection.deleted' as any,
      resource: `connections/${id}`,
      metadata: {
        provider: connection.provider,
      },
    });

    return { deleted: true };
  });

  // ============================================
  // Create API key-based connection (Stripe)
  // ============================================
  // This endpoint allows creating a Stripe connection using the API secret key directly,
  // without going through OAuth. This is the simpler approach for accessing your own Stripe data.
  fastify.post<{
    Body: { apiKey: string; displayName?: string };
  }>('/stripe/api-key', {
    preHandler: [fastify.requirePermission('integrations.manage')],
  }, async (request, reply) => {
    const { apiKey, displayName } = request.body;
    const tenantId = request.tenantId;
    const userId = request.userId;

    if (!apiKey || typeof apiKey !== 'string') {
      return reply.badRequest('API key is required');
    }

    // Validate the API key by making a test request to Stripe
    const connector = fastify.connectors.get('stripe');
    try {
      const healthResult = await connector.healthCheck({
        accessToken: apiKey,
      });

      if (!healthResult.healthy) {
        return reply.badRequest(`Invalid Stripe API key: ${healthResult.message || 'Failed to authenticate'}`);
      }

      // Create connection record
      const connectionId = `conn_${randomUUID().replace(/-/g, '')}`;
      const credentialId = `cred_${randomUUID().replace(/-/g, '')}`;

      // Encrypt the API key
      const apiKeyEnc = await fastify.connectors.encryptToken(apiKey);

      // Insert connection
      await fastify.db
        .insertInto('connections')
        .values({
          id: connectionId,
          tenant_id: tenantId,
          provider: 'stripe',
          status: 'connected',
          display_name: displayName ?? 'Stripe API Key Connection',
          created_by: userId,
        })
        .execute();

      // Insert credentials (API key is stored as access_token)
      await fastify.db
        .insertInto('connection_credentials')
        .values({
          id: credentialId,
          connection_id: connectionId,
          access_token_enc: apiKeyEnc,
          refresh_token_enc: null, // API keys don't have refresh tokens
          token_type: 'api_key',
          scopes: null,
          expires_at: null, // API keys don't expire (unless rotated manually)
          external_account_id: healthResult.externalAccountId ?? null,
          instance_url: null,
        })
        .execute();

      // Audit log
      await request.audit.log({
        action: 'connection.created' as any,
        resource: `connections/${connectionId}`,
        metadata: {
          provider: 'stripe',
          method: 'api_key',
          externalAccountId: healthResult.externalAccountId,
        },
      });

      return {
        connectionId,
        status: 'connected' as const,
        externalAccountId: healthResult.externalAccountId,
        message: 'Stripe connection created successfully using API key',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      request.log.error({ 
        error: errorMessage, 
        stack: errorStack,
        errorType: error?.constructor?.name 
      }, 'Stripe API key connection failed');
      return reply.internalServerError(`Failed to create Stripe connection: ${errorMessage}`);
    }
  });
};

// ============================================
// Helper functions
// ============================================

function getOAuthConfig(config: any, provider: ConnectorProvider, redirectUri?: string) {
  if (provider === 'stripe') {
    if (!config.STRIPE_CLIENT_ID || !config.STRIPE_CLIENT_SECRET) {
      return null;
    }
    return {
      clientId: config.STRIPE_CLIENT_ID,
      clientSecret: config.STRIPE_CLIENT_SECRET,
      redirectUri: redirectUri ?? `${config.API_HOST}:${config.API_PORT}/connections/stripe/callback`,
    };
  }

  if (provider === 'salesforce') {
    if (!config.SALESFORCE_CLIENT_ID || !config.SALESFORCE_CLIENT_SECRET) {
      return null;
    }
    return {
      clientId: config.SALESFORCE_CLIENT_ID,
      clientSecret: config.SALESFORCE_CLIENT_SECRET,
      redirectUri: redirectUri ?? config.SALESFORCE_REDIRECT_URI ?? '',
      isSandbox: config.SALESFORCE_IS_SANDBOX === 'true' || config.SALESFORCE_IS_SANDBOX === true,
    };
  }

  return null;
}

async function getConnectionWithCredentials(db: any, connectionId: string, tenantId: string) {
  const connection = await db
    .selectFrom('connections')
    .selectAll()
    .where('id', '=', connectionId)
    .where('tenant_id', '=', tenantId)
    .executeTakeFirst();

  if (!connection) {
    return null;
  }

  const credentials = await db
    .selectFrom('connection_credentials')
    .selectAll()
    .where('connection_id', '=', connectionId)
    .executeTakeFirst();

  return { ...connection, credentials };
}

async function decryptCredentials(fastify: any, credentials: any) {
  const accessToken = await fastify.connectors.decryptToken(credentials.access_token_enc);
  const refreshToken = credentials.refresh_token_enc
    ? await fastify.connectors.decryptToken(credentials.refresh_token_enc)
    : undefined;

  return {
    accessToken,
    refreshToken,
    expiresAt: credentials.expires_at ?? undefined,
    instanceUrl: credentials.instance_url ?? undefined,
    externalAccountId: credentials.external_account_id ?? undefined,
  };
}

function mapConnectionToResponse(connection: any) {
  return {
    id: connection.id,
    tenantId: connection.tenant_id,
    provider: connection.provider,
    status: connection.status,
    displayName: connection.display_name,
    createdAt: connection.created_at,
    updatedAt: connection.updated_at,
    lastSyncAt: connection.last_sync_at,
    lastSuccessAt: connection.last_success_at,
    lastErrorAt: connection.last_error_at,
    lastErrorCode: connection.last_error_code,
    lastErrorMessage: connection.last_error_message,
  };
}

