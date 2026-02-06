/**
 * Application Metrics (Phase 11)
 *
 * Defines and exports core metrics for API and Worker monitoring.
 * Uses lazy loading to avoid issues when OpenTelemetry packages aren't installed.
 */
interface SimpleMetrics {
    counters: Map<string, {
        value: number;
        labels: Map<string, number>;
    }>;
    histograms: Map<string, {
        values: number[];
        labels: Map<string, number[]>;
    }>;
}
/**
 * Initialize metrics registry
 */
export declare function initMetricsAsync(serviceName: string): Promise<void>;
/**
 * Sync version that schedules async init
 */
export declare function initMetrics(serviceName: string): void;
/**
 * Register a queue depth callback
 */
export declare function registerQueueDepthCallback(queueName: string, callback: () => number): void;
/**
 * Unregister a queue depth callback
 */
export declare function unregisterQueueDepthCallback(queueName: string): void;
/**
 * Record an API request
 */
export declare function recordApiRequest(method: string, route: string, statusCode: number, durationMs: number): void;
/**
 * Record a job completion
 */
export declare function recordJobCompletion(jobType: string, status: 'success' | 'failure', durationMs: number, retryCount?: number): void;
/**
 * Record a snapshot creation
 */
export declare function recordSnapshot(status: 'success' | 'failure', durationMs: number): void;
/**
 * Record detected issues
 */
export declare function recordDetectionIssues(severity: string, category: string, count: number): void;
/**
 * Record detection run
 */
export declare function recordDetectionRun(durationMs: number, issueCount: number): void;
/**
 * Record an export
 */
export declare function recordExport(exportType: string, sizeBytes: number): void;
/**
 * Record a DLQ entry
 */
export declare function recordDlqEntry(queueName: string, jobType: string): void;
/**
 * Record a DLQ requeue
 */
export declare function recordDlqRequeue(queueName: string, jobType: string): void;
/**
 * Get simple metrics (for debugging)
 */
export declare function getSimpleMetrics(): SimpleMetrics;
export {};
//# sourceMappingURL=metrics.d.ts.map