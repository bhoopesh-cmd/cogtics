/**
 * Enhanced Logger with OpenTelemetry Trace Correlation (Phase 11)
 * 
 * Features:
 * - Trace context injection (trace_id, span_id) for log correlation
 * - Loki transport support for production
 * - Structured fields for request_id, tenant_id, snapshot_id, job_id, run_id
 * - Log sampling for high-volume paths
 */
import pino, { type Logger, type LoggerOptions, type TransportTargetOptions } from 'pino';
import { getTraceContext } from './telemetry.js';

export type { Logger };

export interface LogContext {
  requestId?: string;
  tenantId?: string;
  userId?: string;
  snapshotId?: string;
  jobId?: string;
  runId?: string;
  [key: string]: unknown;
}

export interface LoggerConfig {
  name: string;
  level?: string;
  context?: LogContext;
  lokiUrl?: string;
  lokiLabels?: Record<string, string>;
  enableTraceContext?: boolean;
  sampleRate?: number; // 0.0 to 1.0 for log sampling
}

// Paths to sample logs for (to reduce noise)
const SAMPLED_PATHS = ['/health', '/health/ready', '/metrics'];

/**
 * Create a mixin that injects trace context into logs
 */
function createTraceMixin() {
  return (): Record<string, unknown> => {
    const traceContext = getTraceContext();
    if (traceContext.traceId) {
      return {
        trace_id: traceContext.traceId,
        span_id: traceContext.spanId,
      };
    }
    return {};
  };
}

/**
 * Build transport configuration for pino
 */
function buildTransports(config: LoggerConfig): TransportTargetOptions[] {
  const transports: TransportTargetOptions[] = [];
  const isDev = process.env['NODE_ENV'] === 'development';

  if (isDev) {
    // Pretty print in development
    transports.push({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
      level: config.level || 'info',
    });
  } else {
    // JSON output for production
    transports.push({
      target: 'pino/file',
      options: { destination: 1 }, // stdout
      level: config.level || 'info',
    });
  }

  // Add Loki transport if configured
  if (config.lokiUrl && !isDev) {
    transports.push({
      target: 'pino-loki',
      options: {
        host: config.lokiUrl,
        labels: {
          app: config.name,
          ...config.lokiLabels,
        },
        batching: true,
        interval: 5, // seconds
      },
      level: config.level || 'info',
    });
  }

  return transports;
}

/**
 * Create a pino logger instance with structured JSON output and trace correlation
 */
export function createLogger(config: LoggerConfig): Logger {
  const loggerOptions: LoggerOptions = {
    name: config.name,
    level: config.level || 'info',
    formatters: {
      level: (label) => ({ level: label }),
      bindings: (bindings) => ({
        pid: bindings.pid,
        host: bindings.hostname,
        service: bindings.name,
      }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: config.context,
  };

  // Add trace context mixin if enabled
  if (config.enableTraceContext !== false) {
    loggerOptions.mixin = createTraceMixin();
  }

  // Build transports
  const transports = buildTransports(config);

  if (transports.length === 1) {
    return pino({
      ...loggerOptions,
      transport: transports[0],
    });
  }

  if (transports.length > 1) {
    return pino({
      ...loggerOptions,
      transport: {
        targets: transports,
      },
    });
  }

  // Fallback to basic pino
  return pino(loggerOptions);
}

/**
 * Create a child logger with additional context
 */
export function childLogger(parent: Logger, context: LogContext): Logger {
  return parent.child(context);
}

/**
 * Create a request-scoped logger with trace and request context
 */
export function createRequestLogger(
  parent: Logger,
  requestId: string,
  tenantId?: string,
  userId?: string
): Logger {
  return parent.child({
    requestId,
    tenantId,
    userId,
  });
}

/**
 * Create a job-scoped logger with job context
 */
export function createJobLogger(
  parent: Logger,
  jobId: string,
  jobType: string,
  tenantId: string,
  additionalContext?: Record<string, unknown>
): Logger {
  return parent.child({
    jobId,
    jobType,
    tenantId,
    ...additionalContext,
  });
}

/**
 * Determine if a log should be sampled (skipped) based on path
 * Used to reduce noise from health checks and metrics endpoints
 */
export function shouldSampleLog(path: string, sampleRate: number = 0.01): boolean {
  if (!SAMPLED_PATHS.some((p) => path.startsWith(p))) {
    return false; // Always log non-sampled paths
  }
  // Sample at the specified rate (e.g., 0.01 = log 1% of health checks)
  return Math.random() > sampleRate;
}

/**
 * Format error for structured logging
 */
export function formatError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    };
  }
  return { error: String(error) };
}

/**
 * Redact sensitive fields from objects before logging
 */
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'apiKey', 'authorization'];

export function redactSensitive<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    if (SENSITIVE_FIELDS.some((f) => key.toLowerCase().includes(f.toLowerCase()))) {
      (result as Record<string, unknown>)[key] = '[REDACTED]';
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      (result as Record<string, unknown>)[key] = redactSensitive(
        result[key] as Record<string, unknown>
      );
    }
  }
  return result;
}