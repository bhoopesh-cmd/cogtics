const DEFAULT_CONFIG = {
    maxRetries: 5,
    baseDelayMs: 1000,
    maxDelayMs: 60000,
    respectRetryAfter: true,
};
/**
 * HTTP client with retry and rate limit handling
 */
export class RateLimitedHttpClient {
    config;
    logger;
    rateLimitState = {};
    constructor(config = {}, logger) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.logger = logger;
    }
    /**
     * Make an HTTP request with automatic retry on rate limits and transient errors
     */
    async request(options) {
        let lastError = null;
        let attempt = 0;
        while (attempt <= this.config.maxRetries) {
            try {
                const response = await this.makeRequest(options);
                // Update rate limit state from headers
                this.updateRateLimitState(response.headers);
                // Check for rate limit response
                if (response.status === 429) {
                    const retryAfter = this.getRetryAfter(response.headers);
                    const delay = retryAfter ?? this.calculateBackoff(attempt);
                    this.logger?.warn({ attempt, delay, url: options.url }, 'Rate limited, retrying after delay');
                    await this.sleep(delay);
                    attempt++;
                    continue;
                }
                // Check for server errors (5xx)
                if (response.status >= 500) {
                    const delay = this.calculateBackoff(attempt);
                    this.logger?.warn({ attempt, delay, status: response.status, url: options.url }, 'Server error, retrying after delay');
                    await this.sleep(delay);
                    attempt++;
                    continue;
                }
                return response;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                // Retry on network errors
                if (this.isRetryableError(lastError)) {
                    const delay = this.calculateBackoff(attempt);
                    this.logger?.warn({ attempt, delay, error: lastError.message, url: options.url }, 'Network error, retrying after delay');
                    await this.sleep(delay);
                    attempt++;
                    continue;
                }
                throw lastError;
            }
        }
        throw lastError ?? new Error('Max retries exceeded');
    }
    /**
     * Make a single HTTP request
     */
    async makeRequest(options) {
        const controller = new AbortController();
        const timeout = options.timeout ?? 30000;
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            const headers = {
                'Content-Type': 'application/json',
                ...options.headers,
            };
            // Important: Don't JSON.stringify() already-serialized bodies (e.g., x-www-form-urlencoded)
            // - If body is a string, send it as-is.
            // - If body is URLSearchParams, send .toString().
            // - Otherwise, treat as JSON.
            let body;
            if (options.body !== undefined && options.body !== null) {
                if (typeof options.body === 'string') {
                    body = options.body;
                }
                else if (typeof URLSearchParams !== 'undefined' && options.body instanceof URLSearchParams) {
                    body = options.body.toString();
                }
                else {
                    body = JSON.stringify(options.body);
                }
            }
            const response = await fetch(options.url, {
                method: options.method,
                headers,
                body,
                signal: controller.signal,
            });
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                data = (await response.json());
            }
            else {
                data = (await response.text());
            }
            return {
                status: response.status,
                headers: response.headers,
                data,
            };
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    /**
     * Calculate exponential backoff delay
     */
    calculateBackoff(attempt) {
        const delay = this.config.baseDelayMs * Math.pow(2, attempt);
        const jitter = Math.random() * 0.3 * delay; // Add up to 30% jitter
        return Math.min(delay + jitter, this.config.maxDelayMs);
    }
    /**
     * Get Retry-After header value in milliseconds
     */
    getRetryAfter(headers) {
        if (!this.config.respectRetryAfter) {
            return null;
        }
        const retryAfter = headers.get('retry-after');
        if (!retryAfter) {
            return null;
        }
        // Check if it's a number (seconds)
        const seconds = parseInt(retryAfter, 10);
        if (!isNaN(seconds)) {
            return seconds * 1000;
        }
        // Check if it's a date
        const date = new Date(retryAfter);
        if (!isNaN(date.getTime())) {
            return Math.max(0, date.getTime() - Date.now());
        }
        return null;
    }
    /**
     * Update rate limit state from response headers
     */
    updateRateLimitState(headers) {
        // Common rate limit headers
        const remaining = headers.get('x-ratelimit-remaining') ?? headers.get('ratelimit-remaining');
        const limit = headers.get('x-ratelimit-limit') ?? headers.get('ratelimit-limit');
        const reset = headers.get('x-ratelimit-reset') ?? headers.get('ratelimit-reset');
        if (remaining) {
            this.rateLimitState.remaining = parseInt(remaining, 10);
        }
        if (limit) {
            this.rateLimitState.limit = parseInt(limit, 10);
        }
        if (reset) {
            // Reset can be a timestamp or seconds until reset
            const resetNum = parseInt(reset, 10);
            if (resetNum > 1000000000) {
                // It's a Unix timestamp
                this.rateLimitState.resetAt = new Date(resetNum * 1000);
            }
            else {
                // It's seconds until reset
                this.rateLimitState.resetAt = new Date(Date.now() + resetNum * 1000);
            }
        }
        // Salesforce-specific header
        const sforceLimit = headers.get('sforce-limit-info');
        if (sforceLimit) {
            const match = sforceLimit.match(/api-usage=(\d+)\/(\d+)/);
            if (match) {
                const used = parseInt(match[1], 10);
                const total = parseInt(match[2], 10);
                this.rateLimitState.remaining = total - used;
                this.rateLimitState.limit = total;
            }
        }
    }
    /**
     * Check if error is retryable
     */
    isRetryableError(error) {
        // Network errors
        if (error.name === 'AbortError')
            return true;
        if (error.message.includes('ECONNRESET'))
            return true;
        if (error.message.includes('ECONNREFUSED'))
            return true;
        if (error.message.includes('ETIMEDOUT'))
            return true;
        if (error.message.includes('fetch failed'))
            return true;
        return false;
    }
    /**
     * Sleep for specified milliseconds
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Get current rate limit state
     */
    getRateLimitState() {
        return { ...this.rateLimitState };
    }
}
/**
 * Create a pre-configured HTTP client for a connector
 */
export function createHttpClient(config, logger) {
    return new RateLimitedHttpClient(config, logger);
}
//# sourceMappingURL=http.js.map