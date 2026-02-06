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
/** Generous limits - designed to never block genuine usage */
export declare const DEFAULT_LIMITS: {
    /** Max concurrent API requests (generous - OpenAI allows much more) */
    maxConcurrentRequests: number;
    /** Max tokens per request (GPT-4o supports 128K context) */
    maxInputTokens: number;
    /** Max output tokens */
    maxOutputTokens: number;
    /** Rate limit retry attempts */
    rateLimitRetries: number;
    /** Initial backoff delay in ms for rate limits */
    rateLimitInitialDelayMs: number;
    /** Max backoff delay in ms */
    rateLimitMaxDelayMs: number;
    /** Request timeout in ms (generous for long responses) */
    requestTimeoutMs: number;
    /** Max retries for transient errors */
    maxRetries: number;
    /** Cost per run warning threshold in USD */
    costWarningThresholdUsd: number;
    /** Cost per run hard limit in USD (very generous - $500 covers ~500K API calls) */
    costHardLimitUsd: number;
};
export interface BaseLLMConfig {
    apiKey: string;
    model?: string;
    baseUrl?: string;
    timeout?: number;
    maxRetries?: number;
    /** Enable cost tracking */
    trackCosts?: boolean;
    /** Cost tracker instance (shared across requests) */
    costTracker?: LLMCostTracker;
    /** Enable response caching */
    enableCache?: boolean;
    /** Cache instance (shared across requests) */
    cache?: LLMCache;
    /** Tenant ID for cost tracking */
    tenantId?: string;
    /** Run ID for cost tracking */
    runId?: string;
    /** Custom limits */
    limits?: Partial<typeof DEFAULT_LIMITS>;
}
export interface CompletionOptions {
    json?: boolean;
    temperature?: number;
    maxTokens?: number;
    /** Operation type for cost tracking */
    operationType?: string;
    /** Skip cache for this request */
    skipCache?: boolean;
    /** Prompt version for audit logging */
    promptVersion?: string;
}
export interface CompletionResult {
    content: string;
    inputTokens: number;
    outputTokens: number;
    cached: boolean;
    durationMs: number;
    costUsd: number;
}
export declare class ProductionLLMClient {
    protected apiKey: string;
    protected model: string;
    protected baseUrl: string;
    protected timeout: number;
    protected maxRetries: number;
    protected costTracker?: LLMCostTracker;
    protected cache?: LLMCache;
    protected tenantId?: string;
    protected runId?: string;
    protected limits: typeof DEFAULT_LIMITS;
    protected totalCostThisRun: number;
    constructor(config: BaseLLMConfig);
    /**
     * Make a completion request with all production features
     */
    complete(systemPrompt: string, userPrompt: string, options?: CompletionOptions): Promise<CompletionResult>;
    /**
     * Make request with rate limit handling (429 responses)
     */
    private makeRequestWithRateLimitHandling;
    /**
     * Validate token limits before making request
     */
    private validateTokenLimits;
    /**
     * Check cost limits before making request
     */
    private checkCostLimits;
    /**
     * Estimate token count from text
     */
    protected estimateTokens(text: string): number;
    /**
     * Calculate cost for token usage
     */
    protected calculateCost(inputTokens: number, outputTokens: number): number;
    /**
     * Sleep for specified milliseconds
     */
    protected sleep(ms: number): Promise<void>;
    /**
     * Get cost summary for this run
     */
    getRunCostSummary(): {
        totalCostUsd: number;
        limit: number;
        percentUsed: number;
    };
    /**
     * Reset run cost counter
     */
    resetRunCost(): void;
    /**
     * Get cost tracker
     */
    getCostTracker(): LLMCostTracker | undefined;
    /**
     * Get cache
     */
    getCache(): LLMCache | undefined;
    /**
     * Get current model
     */
    getModel(): string;
    /**
     * Set model
     */
    setModel(model: string): void;
    /**
     * Check if configured
     */
    isConfigured(): boolean;
}
/**
 * Create a production LLM client
 */
export declare function createProductionLLMClient(config?: Partial<BaseLLMConfig>): ProductionLLMClient | null;
//# sourceMappingURL=base-client.d.ts.map