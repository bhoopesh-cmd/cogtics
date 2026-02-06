/**
 * LLM Cost Tracker
 *
 * Tracks token usage and costs for LLM API calls,
 * with budget monitoring and alerting.
 */
import { nanoid } from 'nanoid';
// Model pricing (per 1M tokens as of 2024)
const MODEL_PRICING = {
    'gpt-4o': { input: 5.00, output: 15.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4.1': { input: 2.50, output: 10.00 },
    'gpt-4.1-mini': { input: 0.40, output: 1.60 },
};
// ============================================
// LLMCostTracker Class
// ============================================
export class LLMCostTracker {
    entries = [];
    alertCallback;
    budgetUsd = 100; // Default monthly budget
    db;
    constructor(options) {
        if (options?.budgetUsd) {
            this.budgetUsd = options.budgetUsd;
        }
        if (options?.alertCallback) {
            this.alertCallback = options.alertCallback;
        }
        if (options?.db) {
            this.db = options.db;
        }
    }
    /**
     * Track a single LLM usage
     */
    async trackUsage(entry) {
        const cost = this.calculateCost(entry.model, entry.inputTokens, entry.outputTokens);
        const usageEntry = {
            id: `llu_${nanoid(16)}`,
            tenantId: entry.tenantId,
            operationType: entry.operationType,
            runId: entry.runId,
            model: entry.model,
            inputTokens: entry.inputTokens,
            outputTokens: entry.outputTokens,
            costUsd: cost,
            requestId: entry.requestId,
            durationMs: entry.durationMs,
            status: entry.status,
            errorCode: entry.errorCode,
            errorMessage: entry.errorMessage,
            cacheHit: entry.cacheHit || false,
            cacheKey: entry.cacheKey,
            createdAt: new Date(),
        };
        // Store in memory
        this.entries.push(usageEntry);
        // Persist to database if available
        if (this.db) {
            try {
                await this.db.insertInto('llm_usage_logs').values({
                    id: usageEntry.id,
                    tenant_id: usageEntry.tenantId,
                    operation_type: usageEntry.operationType,
                    run_id: usageEntry.runId,
                    model: usageEntry.model,
                    input_tokens: usageEntry.inputTokens,
                    output_tokens: usageEntry.outputTokens,
                    cost_usd: usageEntry.costUsd,
                    request_id: usageEntry.requestId,
                    duration_ms: usageEntry.durationMs,
                    status: usageEntry.status,
                    error_code: usageEntry.errorCode,
                    error_message: usageEntry.errorMessage,
                    cache_hit: usageEntry.cacheHit,
                    cache_key: usageEntry.cacheKey,
                    created_at: usageEntry.createdAt,
                }).execute();
            }
            catch (error) {
                console.warn('Failed to persist LLM usage:', error);
            }
        }
        // Check budget
        this.checkBudgetAndAlert(entry.tenantId);
        return usageEntry;
    }
    /**
     * Log full LLM request/response for audit and replay
     */
    async logRequest(entry) {
        const id = entry.id || `llr_${nanoid(16)}`;
        // Only persist if database is available
        if (!this.db) {
            return null;
        }
        try {
            await this.db.insertInto('llm_request_logs').values({
                id,
                usage_log_id: entry.usageLogId,
                tenant_id: entry.tenantId,
                prompt_version: entry.promptVersion,
                operation_type: entry.operationType,
                model: entry.model,
                system_prompt: entry.systemPrompt,
                user_prompt: entry.userPrompt,
                response_content: entry.responseContent,
                response_parsed: entry.responseParsed ? JSON.stringify(entry.responseParsed) : null,
                validation_passed: entry.validationPassed,
                validation_errors: entry.validationErrors ? JSON.stringify(entry.validationErrors) : null,
                needs_review: entry.needsReview,
                confidence: entry.confidence,
                trace_id: entry.traceId,
                run_id: entry.runId,
                created_at: new Date(),
            }).execute();
            return id;
        }
        catch (error) {
            console.warn('Failed to persist LLM request log:', error);
            return null;
        }
    }
    /**
     * Calculate cost for token usage
     */
    calculateCost(model, inputTokens, outputTokens) {
        const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o-mini'];
        const inputCost = (inputTokens / 1_000_000) * pricing.input;
        const outputCost = (outputTokens / 1_000_000) * pricing.output;
        return inputCost + outputCost;
    }
    /**
     * Get cost summary for a detection run
     */
    getCostForRun(runId) {
        const runEntries = this.entries.filter(e => e.runId === runId);
        return this.aggregateEntries(runEntries);
    }
    /**
     * Get cost summary for a tenant
     */
    getCostForTenant(tenantId, since) {
        let entries = this.entries.filter(e => e.tenantId === tenantId);
        if (since) {
            entries = entries.filter(e => e.createdAt >= since);
        }
        return this.aggregateEntries(entries);
    }
    /**
     * Get current budget status for tenant
     */
    checkBudget(tenantId) {
        // Get entries for current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const summary = this.getCostForTenant(tenantId, startOfMonth);
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const dayOfMonth = now.getDate();
        const projectedDailyCost = summary.requestCount > 0
            ? summary.totalCostUsd / dayOfMonth
            : 0;
        const percentUsed = (summary.totalCostUsd / this.budgetUsd) * 100;
        const alertThreshold = 80; // Alert at 80%
        return {
            currentCostUsd: summary.totalCostUsd,
            budgetUsd: this.budgetUsd,
            percentUsed,
            isOverBudget: summary.totalCostUsd >= this.budgetUsd,
            projectedDailyCost,
            alertTriggered: percentUsed >= alertThreshold,
        };
    }
    /**
     * Check budget and trigger alert if needed
     */
    checkBudgetAndAlert(tenantId) {
        if (!this.alertCallback)
            return;
        const status = this.checkBudget(tenantId);
        if (status.alertTriggered) {
            this.alertCallback(status);
        }
    }
    /**
     * Set budget for cost tracking
     */
    setBudget(budgetUsd) {
        this.budgetUsd = budgetUsd;
    }
    /**
     * Set alert callback
     */
    setAlertCallback(callback) {
        this.alertCallback = callback;
    }
    /**
     * Clear in-memory entries
     */
    clearEntries() {
        this.entries = [];
    }
    /**
     * Aggregate entries into summary
     */
    aggregateEntries(entries) {
        const byOperation = {};
        const byModel = {};
        let totalCostUsd = 0;
        let inputTokens = 0;
        let outputTokens = 0;
        let cachedCount = 0;
        let errorCount = 0;
        for (const entry of entries) {
            totalCostUsd += entry.costUsd;
            inputTokens += entry.inputTokens;
            outputTokens += entry.outputTokens;
            if (entry.cacheHit)
                cachedCount++;
            if (entry.status === 'error')
                errorCount++;
            // By operation
            if (!byOperation[entry.operationType]) {
                byOperation[entry.operationType] = { cost: 0, count: 0 };
            }
            byOperation[entry.operationType].cost += entry.costUsd;
            byOperation[entry.operationType].count++;
            // By model
            if (!byModel[entry.model]) {
                byModel[entry.model] = { cost: 0, count: 0 };
            }
            byModel[entry.model].cost += entry.costUsd;
            byModel[entry.model].count++;
        }
        return {
            totalCostUsd,
            totalTokens: inputTokens + outputTokens,
            inputTokens,
            outputTokens,
            requestCount: entries.length,
            cachedCount,
            errorCount,
            byOperation,
            byModel,
        };
    }
}
/**
 * Create a cost tracker instance
 */
export function createCostTracker(options) {
    return new LLMCostTracker(options);
}
//# sourceMappingURL=cost-tracker.js.map