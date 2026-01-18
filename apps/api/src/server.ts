import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import fastifyStatic from '@fastify/static';
import { 
  loadApiConfig, 
  createLogger,
  initTelemetrySync,
  initMetrics,
  recordApiRequest,
  shouldSampleLog,
} from '@cogtics/utils';

// Plugins
import { configPlugin } from './plugins/config.js';
import { dbPlugin } from './plugins/db.js';
import { authPlugin } from './plugins/auth.js';
import { tenantPlugin } from './plugins/tenant.js';
import { rbacPlugin } from './plugins/rbac.js';
import { auditPlugin } from './plugins/audit.js';
import { queuePlugin } from './plugins/queue.js';
import { connectorsPlugin } from './plugins/connectors.js';
import { storagePlugin } from './plugins/storage.js';

// Routes
import { healthRoutes } from './routes/health.js';
import { meRoutes } from './routes/me.js';
import { adminRoutes } from './routes/admin/index.js';
import { connectionRoutes } from './routes/connections/index.js';
import { authRoutes } from './routes/auth/index.js';
import { webhookRoutes } from './routes/webhooks/index.js';
// Phase 2 Routes
import { snapshotRoutes } from './routes/snapshots/index.js';
import { dataRoutes } from './routes/data/index.js';
import { ingestionRoutes } from './routes/ingestion/index.js';
// Phase 3 Routes
import { identityRoutes } from './routes/identity/index.js';
// Phase 4 Routes
import { uploadRoutes } from './routes/uploads/index.js';
// Phase 5 Routes
import { contractRoutes } from './routes/contracts/index.js';
// Phase 6 Routes
import revrecRoutes from './routes/revrec/index.js';
// Phase 7 Routes
import issueRoutes from './routes/issues/index.js';
// Phase 9 Routes
import { simulationRoutes } from './routes/simulations/index.js';
// Phase 10 Routes
import exportRoutes from './routes/exports/index.js';
import digestRoutes from './routes/digests/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from workspace root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// API route prefixes to exclude from SPA fallback
const API_PREFIXES = ['/api', '/health', '/me', '/admin', '/connections', '/auth', '/snapshots', '/data', '/ingestion', '/identity', '/uploads', '/contracts', '/webhooks', '/revrec', '/issues', '/simulations', '/exports', '/digests', '/metrics'];

async function main() {
  // Load and validate configuration
  const config = loadApiConfig();
  const isDev = config.NODE_ENV === 'development';

  // Initialize OpenTelemetry (Phase 11)
  const telemetryEnabled = process.env['OTEL_ENABLED'] === 'true';
  if (telemetryEnabled) {
    initTelemetrySync({
      serviceName: 'cogtics-api',
      serviceVersion: process.env['npm_package_version'] || '0.0.0',
      environment: config.NODE_ENV,
      prometheusPort: parseInt(process.env['PROMETHEUS_PORT'] || '9464', 10),
      otlpEndpoint: process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] || 'http://localhost:4318/v1/traces',
      enabled: true,
    });
    initMetrics('cogtics-api');
  }

  // Create logger with Loki support
  const logger = createLogger({
    name: 'cogtics-api',
    level: config.LOG_LEVEL,
    lokiUrl: process.env['LOKI_URL'],
    enableTraceContext: telemetryEnabled,
  });

  // Create Fastify instance
  const app = Fastify({
    logger: logger,
    genReqId: () => `req_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`,
    requestIdHeader: 'x-request-id',
  });

  // Register core plugins
  await app.register(cors, { origin: true });
  await app.register(sensible);

  // Request timing and metrics hook (Phase 11)
  app.addHook('onRequest', async (request) => {
    (request as any).startTime = Date.now();
  });

  app.addHook('onResponse', async (request, reply) => {
    const startTime = (request as any).startTime;
    if (startTime) {
      const duration = Date.now() - startTime;
      const route = request.routeOptions?.url || request.url;
      
      // Skip logging for sampled paths (health checks, metrics)
      if (!shouldSampleLog(route)) {
        recordApiRequest(request.method, route, reply.statusCode, duration);
      }
    }
  });

  // Register custom plugins in order
  await app.register(configPlugin);
  await app.register(dbPlugin);
  await app.register(queuePlugin);
  await app.register(authPlugin);
  await app.register(tenantPlugin);
  await app.register(rbacPlugin);
  await app.register(auditPlugin);
  await app.register(connectorsPlugin);
  await app.register(storagePlugin);

  // Register API routes
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(meRoutes);
  await app.register(adminRoutes, { prefix: '/admin' });
  await app.register(connectionRoutes, { prefix: '/connections' });
  await app.register(webhookRoutes, { prefix: '/webhooks' });
  // Phase 2 routes
  await app.register(snapshotRoutes, { prefix: '/snapshots' });
  await app.register(dataRoutes, { prefix: '/data' });
  await app.register(ingestionRoutes, { prefix: '/ingestion' });
  // Phase 3 routes
  await app.register(identityRoutes, { prefix: '/identity' });
  // Phase 4 routes
  await app.register(uploadRoutes, { prefix: '/uploads' });
  // Phase 5 routes
  await app.register(contractRoutes, { prefix: '/contracts' });
  // Phase 6 routes
  await app.register(revrecRoutes, { prefix: '/revrec' });
  // Phase 7 routes
  await app.register(issueRoutes, { prefix: '/issues' });
  // Phase 9 routes
  await app.register(simulationRoutes, { prefix: '/simulations' });
  // Phase 10 routes
  await app.register(exportRoutes, { prefix: '/exports' });
  await app.register(digestRoutes, { prefix: '/digests' });

  // Serve frontend (production only - dev uses separate Vite server with proxy)
  if (!isDev) {
    const webDistPath = path.resolve(__dirname, '../../../web/dist');
    await app.register(fastifyStatic, {
      root: webDistPath,
      prefix: '/',
      decorateReply: false,
    });

    // SPA fallback for non-API routes
    app.setNotFoundHandler((request, reply) => {
      if (isApiRoute(request.url)) {
        return reply.status(404).send({ error: 'Not Found', statusCode: 404 });
      }
      return reply.sendFile('index.html');
    });
  }

  // Global error handler
  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, 'Request error');

    // Handle Zod validation errors
    if (error.validation) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Request validation failed',
        statusCode: 400,
        details: error.validation,
      });
    }

    // Handle known HTTP errors
    if (error.statusCode && error.statusCode < 500) {
      return reply.status(error.statusCode).send({
        error: error.name,
        message: error.message,
        statusCode: error.statusCode,
      });
    }

    // Internal server error
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      statusCode: 500,
    });
  });

  // Start server
  try {
    const address = await app.listen({
      port: config.API_PORT,
      host: config.API_HOST,
    });
    logger.info(`Server listening at ${address}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

function isApiRoute(url: string): boolean {
  return API_PREFIXES.some((prefix) => url.startsWith(prefix));
}


main();
