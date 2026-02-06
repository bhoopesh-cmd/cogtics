/**
 * LLM Cost Tracker
 *
 * Tracks token usage and costs for LLM API calls,
 * with budget monitoring and alerting.
 */
export interface LLMUsageEntry {
    id: string;
    tenantId: string;
    operationType: string;
    runId?: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    requestId?: string;
    durationMs?: number;
    status: 'success' | 'error' | 'cached';
    errorCode?: string;
    errorMessage?: string;
    cacheHit: boolean;
    cacheKey?: string;
    createdAt: Date;
}
export interface CostSummary {
    totalCostUsd: number;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    requestCount: number;
    cachedCount: number;
    errorCount: number;
    byOperation: Record<string, {
        cost: number;
        count: number;
    }>;
    byModel: Record<string, {
        cost: number;
        count: number;
    }>;
}
export interface BudgetStatus {
    currentCostUsd: number;
    budgetUsd: number;
    percentUsed: number;
    isOverBudget: boolean;
    projectedDailyCost: number;
    alertTriggered: boolean;
}
export interface LLMRequestLogEntry {
    id?: string;
    usageLogId?: string;
    tenantId: string;
    promptVersion?: string;
    operationType: string;
    model: string;
    systemPrompt: string;
    userPrompt: string;
    responseContent?: string;
    responseParsed?: unknown;
    validationPassed: boolean;
    validationErrors?: Array<{
        code: string;
        message: string;
        path: (string | number)[];
    }>;
    needsReview: boolean;
    confidence?: number;
    traceId?: string;
    runId?: string;
}
export declare class LLMCostTracker {
    private entries;
    private alertCallback?;
    private budgetUsd;
    private db?;
    constructor(options?: {
        budgetUsd?: number;
        alertCallback?: (status: BudgetStatus) => void;
        db?: any;
    });
    /**
     * Track a single LLM usage
     */
    trackUsage(entry: {
        tenantId: string;
        operationType: string;
        runId?: string;
        model: string;
        inputTokens: number;
        outputTokens: number;
        requestId?: string;
        durationMs?: number;
        status: 'success' | 'error' | 'cached';
        errorCode?: string;
        errorMessage?: string;
        cacheHit?: boolean;
        cacheKey?: string;
    }): Promise<LLMUsageEntry>;
    /**
     * Log full LLM request/response for audit and replay
     */
    logRequest(entry: LLMRequestLogEntry): Promise<string | null>;
    /**
     * Calculate cost for token usage
     */
    calculateCost(model: string, inputTokens: number, outputTokens: number): number;
    /**
     * Get cost summary for a detection run
     */
    getCostForRun(runId: string): CostSummary;
    /**
     * Get cost summary for a tenant
     */
    getCostForTenant(tenantId: string, since?: Date): CostSummary;
    /**
     * Get current budget status for tenant
     */
    checkBudget(tenantId: string): BudgetStatus;
    /**
     * Check budget and trigger alert if needed
     */
    private checkBudgetAndAlert;
    /**
     * Set budget for cost tracking
     */
    setBudget(budgetUsd: number): void;
    /**
     * Set alert callback
     */
    setAlertCallback(callback: (status: BudgetStatus) => void): void;
    /**
     * Clear in-memory entries
     */
    clearEntries(): void;
    /**
     * Aggregate entries into summary
     */
    private aggregateEntries;
}
/**
 * Create a cost tracker instance
 */
export declare function createCostTracker(options?: {
    budgetUsd?: number;
    alertCallback?: (status: BudgetStatus) => void;
    db?: any;
}): LLMCostTracker;
//# sourceMappingURL=cost-tracker.d.ts.map