/**
 * Enhanced Logger with OpenTelemetry Trace Correlation (Phase 11)
 *
 * Features:
 * - Trace context injection (trace_id, span_id) for log correlation
 * - Loki transport support for production
 * - Structured fields for request_id, tenant_id, snapshot_id, job_id, run_id
 * - Log sampling for high-volume paths
 */
import { type Logger } from 'pino';
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
    sampleRate?: number;
}
/**
 * Create a pino logger instance with structured JSON output and trace correlation
 */
export declare function createLogger(config: LoggerConfig): Logger;
/**
 * Create a child logger with additional context
 */
export declare function childLogger(parent: Logger, context: LogContext): Logger;
/**
 * Create a request-scoped logger with trace and request context
 */
export declare function createRequestLogger(parent: Logger, requestId: string, tenantId?: string, userId?: string): Logger;
/**
 * Create a job-scoped logger with job context
 */
export declare function createJobLogger(parent: Logger, jobId: string, jobType: string, tenantId: string, additionalContext?: Record<string, unknown>): Logger;
/**
 * Determine if a log should be sampled (skipped) based on path
 * Used to reduce noise from health checks and metrics endpoints
 */
export declare function shouldSampleLog(path: string, sampleRate?: number): boolean;
/**
 * Format error for structured logging
 */
export declare function formatError(error: unknown): Record<string, unknown>;
export declare function redactSensitive<T extends Record<string, unknown>>(obj: T): T;
//# sourceMappingURL=logger.d.ts.map