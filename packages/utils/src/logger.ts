import pino, { type Logger, type LoggerOptions } from 'pino';

export type { Logger };

export interface LogContext {
  requestId?: string;
  tenantId?: string;
  userId?: string;
  [key: string]: unknown;
}

/**
 * Create a pino logger instance with structured JSON output
 */
export function createLogger(options: {
  name: string;
  level?: string;
  context?: LogContext;
}): Logger {
  const loggerOptions: LoggerOptions = {
    name: options.name,
    level: options.level || 'info',
    formatters: {
      level: (label) => ({ level: label }),
      bindings: (bindings) => ({
        pid: bindings.pid,
        host: bindings.hostname,
        name: bindings.name,
      }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: options.context,
  };

  // In development, use pretty printing
  if (process.env['NODE_ENV'] === 'development') {
    return pino({
      ...loggerOptions,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    });
  }

  return pino(loggerOptions);
}

/**
 * Create a child logger with additional context
 */
export function childLogger(parent: Logger, context: LogContext): Logger {
  return parent.child(context);
}

