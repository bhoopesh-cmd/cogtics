import type { Logger } from 'pino';
export interface HttpRequestOptions {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
    timeout?: number;
}
export interface HttpResponse<T = unknown> {
    status: number;
    headers: Headers;
    data: T;
}
export interface RateLimitConfig {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    respectRetryAfter: boolean;
}
export interface RateLimitState {
    remaining?: number;
    limit?: number;
    resetAt?: Date;
}
/**
 * HTTP client with retry and rate limit handling
 */
export declare class RateLimitedHttpClient {
    private readonly config;
    private readonly logger?;
    private rateLimitState;
    constructor(config?: Partial<RateLimitConfig>, logger?: Logger);
    /**
     * Make an HTTP request with automatic retry on rate limits and transient errors
     */
    request<T>(options: HttpRequestOptions): Promise<HttpResponse<T>>;
    /**
     * Make a single HTTP request
     */
    private makeRequest;
    /**
     * Calculate exponential backoff delay
     */
    private calculateBackoff;
    /**
     * Get Retry-After header value in milliseconds
     */
    private getRetryAfter;
    /**
     * Update rate limit state from response headers
     */
    private updateRateLimitState;
    /**
     * Check if error is retryable
     */
    private isRetryableError;
    /**
     * Sleep for specified milliseconds
     */
    private sleep;
    /**
     * Get current rate limit state
     */
    getRateLimitState(): RateLimitState;
}
/**
 * Create a pre-configured HTTP client for a connector
 */
export declare function createHttpClient(config?: Partial<RateLimitConfig>, logger?: Logger): RateLimitedHttpClient;
//# sourceMappingURL=http.d.ts.map