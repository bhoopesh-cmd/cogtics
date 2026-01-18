/**
 * Application Metrics (Phase 11)
 * 
 * Defines and exports core metrics for API and Worker monitoring.
 * Uses lazy loading to avoid issues when OpenTelemetry packages aren't installed.
 */

// Metric names following Prometheus naming conventions
const METRIC_PREFIX = 'cogtics';

// Simple in-memory metrics when OTel is not available
interface SimpleMetrics {
  counters: Map<string, { value: number; labels: Map<string, number> }>;
  histograms: Map<string, { values: number[]; labels: Map<string, number[]> }>;
}

const simpleMetrics: SimpleMetrics = {
  counters: new Map(),
  histograms: new Map(),
};

// Lazy-loaded OTel references
let otelMetrics: any = null;
let meter: any = null;
let metricsInitialized = false;

// Metric instances
let apiRequestDuration: any = null;
let apiRequestsTotal: any = null;
let apiErrorsTotal: any = null;
let jobDuration: any = null;
let jobTotal: any = null;
let jobFailuresTotal: any = null;
let jobRetriesTotal: any = null;
let queueDepth: any = null;
let snapshotDuration: any = null;
let snapshotsTotal: any = null;
let detectionIssuesTotal: any = null;
let detectionRunDuration: any = null;
let exportSizeBytes: any = null;
let exportsTotal: any = null;
let dlqEntriesTotal: any = null;
let dlqRequeuesTotal: any = null;

// Histogram bucket boundaries
const LATENCY_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
const JOB_DURATION_BUCKETS = [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300, 600];
const SIZE_BUCKETS = [1024, 10240, 102400, 1048576, 10485760, 104857600];

// Queue depth callbacks
const queueDepthCallbacks = new Map<string, () => number>();

/**
 * Initialize metrics registry
 */
export async function initMetricsAsync(serviceName: string): Promise<void> {
  try {
    otelMetrics = await import('@opentelemetry/api');
    meter = otelMetrics.metrics.getMeter(serviceName, '1.0.0');
    
    // API Metrics
    apiRequestDuration = meter.createHistogram(`${METRIC_PREFIX}_api_request_duration_seconds`, {
      description: 'API request latency in seconds',
      unit: 's',
      advice: { explicitBucketBoundaries: LATENCY_BUCKETS },
    });

    apiRequestsTotal = meter.createCounter(`${METRIC_PREFIX}_api_requests_total`, {
      description: 'Total number of API requests',
    });

    apiErrorsTotal = meter.createCounter(`${METRIC_PREFIX}_api_errors_total`, {
      description: 'Total number of API errors',
    });

    // Job Metrics
    jobDuration = meter.createHistogram(`${METRIC_PREFIX}_job_duration_seconds`, {
      description: 'Job processing duration in seconds',
      unit: 's',
      advice: { explicitBucketBoundaries: JOB_DURATION_BUCKETS },
    });

    jobTotal = meter.createCounter(`${METRIC_PREFIX}_job_total`, {
      description: 'Total number of jobs processed',
    });

    jobFailuresTotal = meter.createCounter(`${METRIC_PREFIX}_job_failures_total`, {
      description: 'Total number of job failures',
    });

    jobRetriesTotal = meter.createCounter(`${METRIC_PREFIX}_job_retries_total`, {
      description: 'Total number of job retries',
    });

    // Queue Metrics
    queueDepth = meter.createObservableGauge(`${METRIC_PREFIX}_queue_depth`, {
      description: 'Current queue depth',
    });

    queueDepth.addCallback((observableResult: any) => {
      for (const [queueName, callback] of queueDepthCallbacks) {
        try {
          const depth = callback();
          observableResult.observe(depth, { queue_name: queueName });
        } catch {
          // Ignore
        }
      }
    });

    // Snapshot Metrics
    snapshotDuration = meter.createHistogram(`${METRIC_PREFIX}_snapshot_duration_seconds`, {
      description: 'Snapshot creation duration in seconds',
      unit: 's',
      advice: { explicitBucketBoundaries: JOB_DURATION_BUCKETS },
    });

    snapshotsTotal = meter.createCounter(`${METRIC_PREFIX}_snapshots_total`, {
      description: 'Total number of snapshots created',
    });

    // Detection Metrics
    detectionIssuesTotal = meter.createCounter(`${METRIC_PREFIX}_detection_issues_total`, {
      description: 'Total number of issues detected',
    });

    detectionRunDuration = meter.createHistogram(`${METRIC_PREFIX}_detection_run_duration_seconds`, {
      description: 'Detection run duration in seconds',
      unit: 's',
      advice: { explicitBucketBoundaries: JOB_DURATION_BUCKETS },
    });

    // Export Metrics
    exportSizeBytes = meter.createHistogram(`${METRIC_PREFIX}_export_size_bytes`, {
      description: 'Export file size in bytes',
      unit: 'By',
      advice: { explicitBucketBoundaries: SIZE_BUCKETS },
    });

    exportsTotal = meter.createCounter(`${METRIC_PREFIX}_exports_total`, {
      description: 'Total number of exports generated',
    });

    // DLQ Metrics
    dlqEntriesTotal = meter.createCounter(`${METRIC_PREFIX}_dlq_entries_total`, {
      description: 'Total number of jobs sent to DLQ',
    });

    dlqRequeuesTotal = meter.createCounter(`${METRIC_PREFIX}_dlq_requeues_total`, {
      description: 'Total number of jobs requeued from DLQ',
    });

    metricsInitialized = true;
    console.log(`[Metrics] Initialized for ${serviceName}`);
  } catch (err) {
    console.warn('[Metrics] Failed to initialize OTel metrics, using simple counters');
  }
}

/**
 * Sync version that schedules async init
 */
export function initMetrics(serviceName: string): void {
  initMetricsAsync(serviceName).catch((err) => {
    console.warn('[Metrics] Async init failed:', err);
  });
}

/**
 * Register a queue depth callback
 */
export function registerQueueDepthCallback(queueName: string, callback: () => number): void {
  queueDepthCallbacks.set(queueName, callback);
}

/**
 * Unregister a queue depth callback
 */
export function unregisterQueueDepthCallback(queueName: string): void {
  queueDepthCallbacks.delete(queueName);
}

// Helper to increment a simple counter
function incrementSimpleCounter(name: string, labels: Record<string, string> = {}): void {
  const key = JSON.stringify(labels);
  if (!simpleMetrics.counters.has(name)) {
    simpleMetrics.counters.set(name, { value: 0, labels: new Map() });
  }
  const counter = simpleMetrics.counters.get(name)!;
  counter.labels.set(key, (counter.labels.get(key) || 0) + 1);
  counter.value++;
}

// Helper functions for recording metrics

/**
 * Record an API request
 */
export function recordApiRequest(
  method: string,
  route: string,
  statusCode: number,
  durationMs: number
): void {
  const labels = { method, route, status: String(statusCode) };
  
  if (metricsInitialized && apiRequestsTotal) {
    apiRequestsTotal.add(1, labels);
    apiRequestDuration.record(durationMs / 1000, labels);
    if (statusCode >= 400) {
      apiErrorsTotal.add(1, labels);
    }
  } else {
    incrementSimpleCounter('api_requests', labels);
  }
}

/**
 * Record a job completion
 */
export function recordJobCompletion(
  jobType: string,
  status: 'success' | 'failure',
  durationMs: number,
  retryCount: number = 0
): void {
  const labels = { job_type: jobType, status };
  
  if (metricsInitialized && jobTotal) {
    jobTotal.add(1, labels);
    jobDuration.record(durationMs / 1000, labels);
    if (status === 'failure') {
      jobFailuresTotal.add(1, { job_type: jobType });
    }
    if (retryCount > 0) {
      jobRetriesTotal.add(retryCount, { job_type: jobType });
    }
  } else {
    incrementSimpleCounter('job_total', labels);
  }
}

/**
 * Record a snapshot creation
 */
export function recordSnapshot(status: 'success' | 'failure', durationMs: number): void {
  if (metricsInitialized && snapshotsTotal) {
    snapshotsTotal.add(1, { status });
    snapshotDuration.record(durationMs / 1000, { status });
  } else {
    incrementSimpleCounter('snapshots', { status });
  }
}

/**
 * Record detected issues
 */
export function recordDetectionIssues(
  severity: string,
  category: string,
  count: number
): void {
  if (metricsInitialized && detectionIssuesTotal) {
    detectionIssuesTotal.add(count, { severity, category });
  } else {
    incrementSimpleCounter('detection_issues', { severity, category });
  }
}

/**
 * Record detection run
 */
export function recordDetectionRun(durationMs: number, issueCount: number): void {
  if (metricsInitialized && detectionRunDuration) {
    detectionRunDuration.record(durationMs / 1000, {});
  }
}

/**
 * Record an export
 */
export function recordExport(exportType: string, sizeBytes: number): void {
  if (metricsInitialized && exportsTotal) {
    exportsTotal.add(1, { export_type: exportType });
    exportSizeBytes.record(sizeBytes, { export_type: exportType });
  } else {
    incrementSimpleCounter('exports', { export_type: exportType });
  }
}

/**
 * Record a DLQ entry
 */
export function recordDlqEntry(queueName: string, jobType: string): void {
  if (metricsInitialized && dlqEntriesTotal) {
    dlqEntriesTotal.add(1, { queue_name: queueName, job_type: jobType });
  } else {
    incrementSimpleCounter('dlq_entries', { queue_name: queueName, job_type: jobType });
  }
}

/**
 * Record a DLQ requeue
 */
export function recordDlqRequeue(queueName: string, jobType: string): void {
  if (metricsInitialized && dlqRequeuesTotal) {
    dlqRequeuesTotal.add(1, { queue_name: queueName, job_type: jobType });
  } else {
    incrementSimpleCounter('dlq_requeues', { queue_name: queueName, job_type: jobType });
  }
}

/**
 * Get simple metrics (for debugging)
 */
export function getSimpleMetrics(): SimpleMetrics {
  return simpleMetrics;
}
