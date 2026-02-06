/**
 * OpenTelemetry Telemetry Bootstrap (Phase 11)
 *
 * Initializes OpenTelemetry SDK with:
 * - Prometheus exporter for metrics
 * - OTLP exporter for traces (to Tempo)
 * - Auto-instrumentation for HTTP, pg, Redis, and BullMQ
 *
 * Uses lazy imports to avoid issues when packages aren't installed.
 */
export interface TelemetryConfig {
    serviceName: string;
    serviceVersion?: string;
    environment?: string;
    prometheusPort?: number;
    otlpEndpoint?: string;
    enabled?: boolean;
}
/**
 * Initialize OpenTelemetry SDK
 * Must be called before any other imports in the application
 */
export declare function initTelemetry(config: TelemetryConfig): Promise<void>;
/**
 * Sync version - just logs if not enabled
 */
export declare function initTelemetrySync(config: TelemetryConfig): void;
/**
 * Get the Prometheus exporter for manual metrics endpoint
 */
export declare function getPrometheusExporter(): any;
/**
 * Get a tracer for creating custom spans
 */
export declare function getTracer(name: string): any;
/**
 * Get the current active span
 */
export declare function getActiveSpan(): any;
/**
 * Get current trace context for log correlation
 */
export declare function getTraceContext(): {
    traceId?: string;
    spanId?: string;
};
/**
 * Create a child span for tracking operations
 */
export declare function startSpan<T>(tracer: any, name: string, attributes: Record<string, string | number | boolean>, fn: (span: any) => Promise<T>): Promise<T>;
/**
 * Add attributes to current span
 */
export declare function setSpanAttributes(attributes: Record<string, string | number | boolean>): void;
/**
 * Record an error on the current span
 */
export declare function recordSpanError(error: Error): void;
/**
 * Shutdown telemetry SDK gracefully
 */
export declare function shutdownTelemetry(): Promise<void>;
export type Span = any;
export type Tracer = any;
//# sourceMappingURL=telemetry.d.ts.map