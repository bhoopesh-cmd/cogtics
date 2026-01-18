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

// Lazy-loaded references
let sdk: any = null;
let prometheusExporter: any = null;
let otelApi: any = null;
let telemetryInitialized = false;

/**
 * Initialize OpenTelemetry SDK
 * Must be called before any other imports in the application
 */
export async function initTelemetry(config: TelemetryConfig): Promise<void> {
  if (!config.enabled) {
    console.log('[Telemetry] Disabled');
    return;
  }

  try {
    // Dynamic imports to handle missing packages gracefully
    const [
      { NodeSDK },
      { getNodeAutoInstrumentations },
      { PrometheusExporter },
      { OTLPTraceExporter },
      { Resource },
      semanticConventions,
    ] = await Promise.all([
      import('@opentelemetry/sdk-node'),
      import('@opentelemetry/auto-instrumentations-node'),
      import('@opentelemetry/exporter-prometheus'),
      import('@opentelemetry/exporter-trace-otlp-http'),
      import('@opentelemetry/resources'),
      import('@opentelemetry/semantic-conventions'),
    ]);

    otelApi = await import('@opentelemetry/api');

    const resource = new Resource({
      [semanticConventions.SEMRESATTRS_SERVICE_NAME]: config.serviceName,
      [semanticConventions.SEMRESATTRS_SERVICE_VERSION]: config.serviceVersion || '0.0.0',
      [semanticConventions.SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: config.environment || 'development',
    });

    // Prometheus exporter for metrics
    prometheusExporter = new PrometheusExporter({
      port: config.prometheusPort || 9464,
      preventServerStart: true,
    });

    // OTLP trace exporter for Tempo
    const traceExporter = new OTLPTraceExporter({
      url: config.otlpEndpoint || 'http://localhost:4318/v1/traces',
    });

    sdk = new NodeSDK({
      resource,
      traceExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': { enabled: false },
          '@opentelemetry/instrumentation-dns': { enabled: false },
          '@opentelemetry/instrumentation-http': {
            ignoreIncomingPaths: ['/health', '/health/ready', '/metrics'],
          },
        }),
      ],
    });

    sdk.start();
    telemetryInitialized = true;
    console.log(`[Telemetry] Initialized for ${config.serviceName}`);

    // Graceful shutdown
    process.on('SIGTERM', () => {
      sdk?.shutdown()
        .then(() => console.log('[Telemetry] Shutdown complete'))
        .catch((err: Error) => console.error('[Telemetry] Shutdown error:', err));
    });
  } catch (err) {
    console.warn('[Telemetry] Failed to initialize (packages may not be installed):', err);
  }
}

/**
 * Sync version - just logs if not enabled
 */
export function initTelemetrySync(config: TelemetryConfig): void {
  if (!config.enabled) {
    console.log('[Telemetry] Disabled');
    return;
  }
  // For sync initialization, we just schedule the async init
  initTelemetry(config).catch((err) => {
    console.warn('[Telemetry] Async init failed:', err);
  });
}

/**
 * Get the Prometheus exporter for manual metrics endpoint
 */
export function getPrometheusExporter(): any {
  return prometheusExporter;
}

/**
 * Get a tracer for creating custom spans
 */
export function getTracer(name: string): any {
  if (!otelApi || !telemetryInitialized) {
    return createNoopTracer();
  }
  return otelApi.trace.getTracer(name);
}

/**
 * Get the current active span
 */
export function getActiveSpan(): any {
  if (!otelApi || !telemetryInitialized) {
    return undefined;
  }
  return otelApi.trace.getActiveSpan();
}

/**
 * Get current trace context for log correlation
 */
export function getTraceContext(): { traceId?: string; spanId?: string } {
  if (!otelApi || !telemetryInitialized) {
    return {};
  }
  
  const span = otelApi.trace.getActiveSpan();
  if (!span) return {};
  
  const spanContext = span.spanContext();
  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
  };
}

/**
 * Create a child span for tracking operations
 */
export async function startSpan<T>(
  tracer: any,
  name: string,
  attributes: Record<string, string | number | boolean>,
  fn: (span: any) => Promise<T>
): Promise<T> {
  if (!tracer || !tracer.startActiveSpan || !telemetryInitialized) {
    // No-op: just run the function
    return fn(createNoopSpan());
  }
  
  return tracer.startActiveSpan(name, { attributes }, async (span: any) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: 1 }); // OK
      return result;
    } catch (error) {
      span.setStatus({
        code: 2, // ERROR
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Add attributes to current span
 */
export function setSpanAttributes(attributes: Record<string, string | number | boolean>): void {
  if (!otelApi || !telemetryInitialized) return;
  
  const span = otelApi.trace.getActiveSpan();
  if (span) {
    span.setAttributes(attributes);
  }
}

/**
 * Record an error on the current span
 */
export function recordSpanError(error: Error): void {
  if (!otelApi || !telemetryInitialized) return;
  
  const span = otelApi.trace.getActiveSpan();
  if (span) {
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message });
  }
}

/**
 * Shutdown telemetry SDK gracefully
 */
export async function shutdownTelemetry(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
    telemetryInitialized = false;
  }
}

// No-op implementations for when telemetry is disabled
function createNoopSpan(): any {
  return {
    setAttribute: () => {},
    setAttributes: () => {},
    setStatus: () => {},
    recordException: () => {},
    end: () => {},
    spanContext: () => ({ traceId: '', spanId: '' }),
  };
}

function createNoopTracer(): any {
  return {
    startActiveSpan: async (_name: string, _opts: any, fn: (span: any) => Promise<any>) => {
      return fn(createNoopSpan());
    },
    startSpan: () => createNoopSpan(),
  };
}

// Re-export types for convenience
export type Span = any;
export type Tracer = any;
