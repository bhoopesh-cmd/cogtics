/**
 * Production-Ready Base LLM Client
 *
 * Enhanced LLM client with:
 * - Rate limit handling (429 responses with exponential backoff)
 * - Cost tracking integration
 * - Token limit checks before API calls
 * - Concurrent request limiting (semaphore)
 * - Request/response logging
 */
import { LLMCostTracker } from './cost-tracker.js';
import { LLMCache } from './cache.js';
// ============================================
// Configuration
// ============================================
/** Generous limits - designed to never block genuine usage */
export const DEFAULT_LIMITS = {
    /** Max concurrent API requests (generous - OpenAI allows much more) */
    maxConcurrentRequests: 50,
    /** Max tokens per request (GPT-4o supports 128K context) */
    maxInputTokens: 100000,
    /** Max output tokens */
    maxOutputTokens: 16000,
    /** Rate limit retry attempts */
    rateLimitRetries: 5,
    /** Initial backoff delay in ms for rate limits */
    rateLimitInitialDelayMs: 1000,
    /** Max backoff delay in ms */
    rateLimitMaxDelayMs: 60000,
    /** Request timeout in ms (generous for long responses) */
    requestTimeoutMs: 120000,
    /** Max retries for transient errors */
    maxRetries: 5,
    /** Cost per run warning threshold in USD */
    costWarningThresholdUsd: 10.0,
    /** Cost per run hard limit in USD (very generous - $500 covers ~500K API calls) */
    costHardLimitUsd: 500.0,
};
// Approximate tokens per character (for estimation)
const TOKENS_PER_CHAR = 0.25;
// Model context limits
const MODEL_CONTEXT_LIMITS = {
    'gpt-4o': 128000,
    'gpt-4o-mini': 128000,
    'gpt-4.1': 128000,
    'gpt-4.1-mini': 128000,
};
// ============================================
// Semaphore for Concurrent Request Limiting
// ============================================
class Semaphore {
    permits;
    waiting = [];
    constructor(permits) {
        this.permits = permits;
    }
    async acquire() {
        if (this.permits > 0) {
            this.permits--;
            return;
        }
        return new Promise(resolve => {
            this.waiting.push(resolve);
        });
    }
    release() {
        if (this.waiting.length > 0) {
            const next = this.waiting.shift();
            next?.();
        }
        else {
            this.permits++;
        }
    }
}
// Global semaphore for rate limiting across all instances
const globalSemaphore = new Semaphore(DEFAULT_LIMITS.maxConcurrentRequests);
// ============================================
// ProductionLLMClient Class
// ============================================
export class ProductionLLMClient {
    apiKey;
    model;
    baseUrl;
    timeout;
    maxRetries;
    costTracker;
    cache;
    tenantId;
    runId;
    limits;
    totalCostThisRun = 0;
    constructor(config) {
        this.apiKey = config.apiKey;
        this.model = config.model || 'gpt-4o-mini';
        this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
        this.timeout = config.timeout || DEFAULT_LIMITS.requestTimeoutMs;
        this.maxRetries = config.maxRetries || DEFAULT_LIMITS.maxRetries;
        this.tenantId = config.tenantId;
        this.runId = config.runId;
        this.limits = { ...DEFAULT_LIMITS, ...config.limits };
        // Setup cost tracking
        if (config.trackCosts !== false) {
            this.costTracker = config.costTracker || new LLMCostTracker({
                budgetUsd: this.limits.costHardLimitUsd,
            });
        }
        // Setup caching
        if (config.enableCache !== false) {
            this.cache = config.cache || new LLMCache({
                defaultTtlSeconds: 3600,
                maxEntries: 10000,
                enabled: true,
            });
        }
    }
    /**
     * Make a completion request with all production features
     */
    async complete(systemPrompt, userPrompt, options) {
        const startTime = Date.now();
        const operationType = options?.operationType || 'completion';
        // 1. Check token limits
        const estimatedInputTokens = this.estimateTokens(systemPrompt + userPrompt);
        this.validateTokenLimits(estimatedInputTokens);
        // 2. Check cost limits
        this.checkCostLimits();
        // 3. Check cache
        if (this.cache && !options?.skipCache) {
            const cacheKey = LLMCache.generateKey({
                operation: operationType,
                model: this.model,
                systemPrompt,
                userPrompt,
                temperature: options?.temperature,
            });
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                // Track cached request
                if (this.costTracker && this.tenantId) {
                    await this.costTracker.trackUsage({
                        tenantId: this.tenantId,
                        operationType,
                        runId: this.runId,
                        model: this.model,
                        inputTokens: 0,
                        outputTokens: 0,
                        status: 'cached',
                        cacheHit: true,
                        cacheKey,
                    });
                }
                return { ...cached, cached: true };
            }
        }
        // 4. Acquire semaphore for concurrent request limiting
        await globalSemaphore.acquire();
        try {
            // 5. Make request with rate limit handling
            const result = await this.makeRequestWithRateLimitHandling(systemPrompt, userPrompt, options);
            const durationMs = Date.now() - startTime;
            const costUsd = this.calculateCost(result.inputTokens, result.outputTokens);
            this.totalCostThisRun += costUsd;
            // 6. Track usage
            let usageLogId;
            if (this.costTracker && this.tenantId) {
                const usageEntry = await this.costTracker.trackUsage({
                    tenantId: this.tenantId,
                    operationType,
                    runId: this.runId,
                    model: this.model,
                    inputTokens: result.inputTokens,
                    outputTokens: result.outputTokens,
                    durationMs,
                    status: 'success',
                    cacheHit: false,
                });
                usageLogId = usageEntry.id;
                // 7. Log full request/response for audit
                await this.costTracker.logRequest({
                    usageLogId,
                    tenantId: this.tenantId,
                    promptVersion: options?.promptVersion,
                    operationType,
                    model: this.model,
                    systemPrompt,
                    userPrompt,
                    responseContent: result.content,
                    validationPassed: true, // Will be updated by client if validation fails
                    needsReview: false, // Will be updated by client based on confidence
                    runId: this.runId,
                });
            }
            const completionResult = {
                content: result.content,
                inputTokens: result.inputTokens,
                outputTokens: result.outputTokens,
                cached: false,
                durationMs,
                costUsd,
            };
            // 8. Cache result
            if (this.cache && !options?.skipCache) {
                const cacheKey = LLMCache.generateKey({
                    operation: operationType,
                    model: this.model,
                    systemPrompt,
                    userPrompt,
                    temperature: options?.temperature,
                });
                await this.cache.set(cacheKey, completionResult);
            }
            return completionResult;
        }
        finally {
            globalSemaphore.release();
        }
    }
    /**
     * Make request with rate limit handling (429 responses)
     */
    async makeRequestWithRateLimitHandling(systemPrompt, userPrompt, options) {
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ];
        const requestBody = {
            model: this.model,
            messages,
            temperature: options?.temperature ?? 0.1,
            max_tokens: options?.maxTokens || 4096,
        };
        if (options?.json) {
            requestBody.response_format = { type: 'json_object' };
        }
        let lastError = null;
        let attempt = 0;
        let delay = this.limits.rateLimitInitialDelayMs;
        while (attempt < this.limits.rateLimitRetries + this.maxRetries) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);
                const response = await fetch(`${this.baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`,
                    },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                // Handle rate limiting (429)
                if (response.status === 429) {
                    const retryAfter = response.headers.get('Retry-After');
                    const waitTime = retryAfter
                        ? parseInt(retryAfter, 10) * 1000
                        : Math.min(delay, this.limits.rateLimitMaxDelayMs);
                    console.warn(`Rate limited (429), waiting ${waitTime}ms before retry...`);
                    await this.sleep(waitTime);
                    delay *= 2; // Exponential backoff
                    attempt++;
                    continue;
                }
                // Handle other errors
                if (!response.ok) {
                    const errorText = await response.text();
                    // Retry on 5xx errors
                    if (response.status >= 500 && attempt < this.maxRetries) {
                        console.warn(`Server error ${response.status}, retrying...`);
                        await this.sleep(Math.pow(2, attempt) * 1000);
                        attempt++;
                        continue;
                    }
                    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
                }
                const data = await response.json();
                return {
                    content: data.choices?.[0]?.message?.content || '',
                    inputTokens: data.usage?.prompt_tokens || this.estimateTokens(systemPrompt + userPrompt),
                    outputTokens: data.usage?.completion_tokens || this.estimateTokens(data.choices?.[0]?.message?.content || ''),
                };
            }
            catch (error) {
                lastError = error;
                // Abort errors shouldn't be retried
                if (error.name === 'AbortError') {
                    throw new Error(`Request timeout after ${this.timeout}ms`);
                }
                // Network errors - retry with backoff
                if (attempt < this.maxRetries - 1) {
                    await this.sleep(Math.pow(2, attempt) * 1000);
                    attempt++;
                    continue;
                }
                throw lastError;
            }
        }
        throw lastError || new Error('LLM request failed after all retries');
    }
    /**
     * Validate token limits before making request
     */
    validateTokenLimits(estimatedTokens) {
        const contextLimit = MODEL_CONTEXT_LIMITS[this.model] || 128000;
        if (estimatedTokens > this.limits.maxInputTokens) {
            throw new Error(`Input tokens (${estimatedTokens}) exceed limit (${this.limits.maxInputTokens}). ` +
                `Consider reducing prompt size or splitting into batches.`);
        }
        if (estimatedTokens > contextLimit * 0.9) {
            console.warn(`Warning: Input tokens (${estimatedTokens}) approaching model context limit (${contextLimit})`);
        }
    }
    /**
     * Check cost limits before making request
     */
    checkCostLimits() {
        if (this.totalCostThisRun >= this.limits.costHardLimitUsd) {
            throw new Error(`Cost limit exceeded: $${this.totalCostThisRun.toFixed(2)} >= $${this.limits.costHardLimitUsd}. ` +
                `This is a safety limit to prevent runaway costs.`);
        }
        if (this.totalCostThisRun >= this.limits.costWarningThresholdUsd) {
            console.warn(`Warning: Run cost approaching limit: $${this.totalCostThisRun.toFixed(2)} / $${this.limits.costHardLimitUsd}`);
        }
    }
    /**
     * Estimate token count from text
     */
    estimateTokens(text) {
        // Rough estimation: ~4 chars per token for English
        return Math.ceil(text.length * TOKENS_PER_CHAR);
    }
    /**
     * Calculate cost for token usage
     */
    calculateCost(inputTokens, outputTokens) {
        const MODEL_PRICING = {
            'gpt-4o': { input: 5.00, output: 15.00 },
            'gpt-4o-mini': { input: 0.15, output: 0.60 },
            'gpt-4.1': { input: 2.50, output: 10.00 },
            'gpt-4.1-mini': { input: 0.40, output: 1.60 },
        };
        const pricing = MODEL_PRICING[this.model] || MODEL_PRICING['gpt-4o-mini'];
        return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
    }
    /**
     * Sleep for specified milliseconds
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Get cost summary for this run
     */
    getRunCostSummary() {
        return {
            totalCostUsd: this.totalCostThisRun,
            limit: this.limits.costHardLimitUsd,
            percentUsed: (this.totalCostThisRun / this.limits.costHardLimitUsd) * 100,
        };
    }
    /**
     * Reset run cost counter
     */
    resetRunCost() {
        this.totalCostThisRun = 0;
    }
    /**
     * Get cost tracker
     */
    getCostTracker() {
        return this.costTracker;
    }
    /**
     * Get cache
     */
    getCache() {
        return this.cache;
    }
    /**
     * Get current model
     */
    getModel() {
        return this.model;
    }
    /**
     * Set model
     */
    setModel(model) {
        this.model = model;
    }
    /**
     * Check if configured
     */
    isConfigured() {
        return !!this.apiKey && this.apiKey.length > 0;
    }
}
/**
 * Create a production LLM client
 */
export function createProductionLLMClient(config) {
    const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return null;
    }
    return new ProductionLLMClient({
        apiKey,
        model: config?.model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
        ...config,
    });
}
//# sourceMappingURL=base-client.js.map