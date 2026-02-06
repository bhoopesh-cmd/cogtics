import http from 'node:http';
import { loadWorkerConfig, createLogger } from '@cogtics/utils';

const logger = createLogger({ name: 'worker-health' });

/**
 * Simple HTTP server for health checks
 * Runs on port 3001 (separate from API on 3000)
 * Used by Docker/k8s for liveness and readiness probes
 */
export function startHealthServer() {
  const config = loadWorkerConfig();
  const port = config.WORKER_HEALTH_PORT ?? 3001;

  const server = http.createServer((req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      // Basic liveness check - is the process running?
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        workerConcurrency: config.WORKER_CONCURRENCY,
        pid: process.pid,
        memory: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        },
      }));
    } else if (req.url === '/ready' && req.method === 'GET') {
      // Readiness check - is the worker ready to process jobs?
      // For now, if the server is running, the worker is ready
      // Could add DB/Redis ping checks here if needed
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ready',
        timestamp: new Date().toISOString(),
      }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(port, () => {
    logger.info({ port }, 'Worker health server listening');
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, closing health server');
    server.close(() => {
      logger.info('Health server closed');
    });
  });

  return server;
}
