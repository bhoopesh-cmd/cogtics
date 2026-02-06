/**
 * Recommendation LLM - AI-Powered Prescriptive Analytics (Tier 4)
 *
 * Production-ready LLM client for generating recommendations with:
 * - Rate limit handling
 * - Cost tracking
 * - Token limit validation
 * - Concurrent request limiting
 */
import { ProductionLLMClient, DEFAULT_LIMITS, } from './base-client.js';
import { RECOMMENDATION_SYSTEM_PROMPTS, RECOMMENDATION_PROMPT_VERSION, recommendationPrompt, simulationConfigPrompt, } from './prompts/recommendations.js';
import { RecommendationResponseSchema, safeParseLLMResponse, computeNeedsReview, } from './schemas.js';
import { nanoid } from 'nanoid';
// ============================================
// RecommendationLLM Class
// ============================================
export class RecommendationLLM extends ProductionLLMClient {
    defaultConfig = {
        maxRecommendations: 50, // Generous
        minImpactThreshold: 10, // Very low threshold to catch everything
        groupRelatedIssues: true,
        includeSimulationConfigs: true,
    };
    stats;
    constructor(config) {
        const apiKey = config?.apiKey || process.env.OPENAI_API_KEY || '';
        super({
            apiKey,
            model: config?.model || 'gpt-4o-mini',
            timeout: config?.timeout || 120000, // 2 min timeout
            maxRetries: config?.maxRetries || 5,
            trackCosts: true,
            enableCache: true,
            tenantId: config?.tenantId,
            runId: config?.runId,
            limits: {
                ...DEFAULT_LIMITS,
                // Generous limits
                maxConcurrentRequests: 100,
                maxInputTokens: 120000,
                costHardLimitUsd: 500,
                costWarningThresholdUsd: 50,
                ...config?.limits,
            },
        });
        if (config?.recommendationConfig) {
            this.defaultConfig = { ...this.defaultConfig, ...config.recommendationConfig };
        }
        this.stats = this.initStats();
    }
    initStats() {
        return {
            totalRecommendations: 0,
            totalEstimatedImpact: 0,
            byPriority: {},
            byEffort: {},
            durationMs: 0,
            tokensUsed: 0,
            costUsd: 0,
            cacheHits: 0,
        };
    }
    /**
     * Generate recommendations from enriched issues
     */
    async generateRecommendations(issues, context, config) {
        const startTime = Date.now();
        this.stats = this.initStats();
        const mergedConfig = { ...this.defaultConfig, ...config };
        if (issues.length === 0) {
            return [];
        }
        // Cluster related issues
        const clusters = mergedConfig.groupRelatedIssues
            ? this.clusterRelatedIssues(issues)
            : issues.map(i => ({
                id: nanoid(8),
                issues: [i],
                commonContractId: i.contractId,
                totalImpact: i.impactAmount || 0,
                currency: i.currency || 'USD',
            }));
        // Filter clusters by impact threshold (generous threshold)
        const significantClusters = clusters.filter(c => c.totalImpact >= mergedConfig.minImpactThreshold);
        // Generate recommendations for each cluster
        const recommendations = [];
        for (const cluster of significantClusters.slice(0, mergedConfig.maxRecommendations)) {
            const contract = context.contracts.find(c => c.id === cluster.commonContractId);
            const customer = contract?.customer ||
                context.customers.find(c => c.id === cluster.commonCustomerId);
            const clusterRecs = await this.generateClusterRecommendations(cluster, {
                contractName: contract?.name,
                customerName: customer?.name,
                totalImpact: cluster.totalImpact,
                currency: cluster.currency,
            });
            recommendations.push(...clusterRecs);
        }
        // Sort by priority and impact
        const sorted = recommendations
            .sort((a, b) => {
            const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
            if (priorityDiff !== 0)
                return priorityDiff;
            return b.estimatedImpact.revenueChange - a.estimatedImpact.revenueChange;
        })
            .slice(0, mergedConfig.maxRecommendations);
        // Update stats
        this.stats.totalRecommendations = sorted.length;
        this.stats.durationMs = Date.now() - startTime;
        this.stats.costUsd = this.getRunCostSummary().totalCostUsd;
        for (const rec of sorted) {
            this.stats.totalEstimatedImpact += rec.estimatedImpact.revenueChange;
            this.stats.byPriority[rec.priority] = (this.stats.byPriority[rec.priority] || 0) + 1;
            this.stats.byEffort[rec.effort] = (this.stats.byEffort[rec.effort] || 0) + 1;
        }
        return sorted;
    }
    /**
     * Generate simulation configuration for a recommendation
     */
    async generateSimulationConfig(recommendation, context) {
        // If recommendation already has simulation config, return it
        if (recommendation.suggestedSimulation?.overrides.length > 0) {
            return recommendation.suggestedSimulation.overrides;
        }
        // Generate new config based on the recommendation
        const issue = this.findIssueById(recommendation.issueIds[0], context);
        if (!issue) {
            return [];
        }
        const contract = context.contracts.find(c => c.id === issue.contractId);
        const invoice = context.invoices.find(i => i.id === issue.invoiceId);
        const prompt = simulationConfigPrompt(issue, {
            contractTerms: contract?.terms?.map(t => ({
                type: t.term_type,
                value: t.value_json,
            })),
            currentInvoice: invoice ? {
                id: invoice.id,
                amount: Number(invoice.total_amount),
                date: invoice.invoice_date?.toString() || '',
            } : undefined,
        });
        try {
            const result = await this.complete(RECOMMENDATION_SYSTEM_PROMPTS.simulationConfig, prompt, {
                json: true,
                operationType: 'simulation_config',
                promptVersion: RECOMMENDATION_PROMPT_VERSION,
            });
            this.stats.tokensUsed += result.inputTokens + result.outputTokens;
            if (result.cached)
                this.stats.cacheHits++;
            // Parse simulation config (uses simpler schema)
            const json = JSON.parse(result.content);
            return (json.overrides || []).map((o) => ({
                type: o.type,
                targetId: o.targetId,
                field: o.field,
                originalValue: o.originalValue,
                newValue: o.newValue,
                effectiveDate: o.effectiveDate,
                description: o.description,
            }));
        }
        catch (error) {
            console.warn('Failed to generate simulation config:', error);
            return [];
        }
    }
    /**
     * Cluster related issues for grouped recommendations
     */
    clusterRelatedIssues(issues) {
        const clusters = [];
        const assigned = new Set();
        // Group by contract first
        const byContract = new Map();
        for (const issue of issues) {
            if (issue.contractId) {
                if (!byContract.has(issue.contractId)) {
                    byContract.set(issue.contractId, []);
                }
                byContract.get(issue.contractId).push(issue);
            }
        }
        // Create clusters from contract groups
        for (const [contractId, contractIssues] of byContract) {
            const totalImpact = contractIssues.reduce((sum, i) => sum + (i.impactAmount || 0), 0);
            clusters.push({
                id: `cluster_${nanoid(8)}`,
                issues: contractIssues,
                commonContractId: contractId,
                commonCustomerId: contractIssues[0]?.customerId,
                totalImpact,
                currency: contractIssues[0]?.currency || 'USD',
            });
            contractIssues.forEach(i => assigned.add(i.issueKey || i.ruleId));
        }
        // Handle issues without contracts
        const orphans = issues.filter(i => !assigned.has(i.issueKey || i.ruleId));
        if (orphans.length > 0) {
            const totalImpact = orphans.reduce((sum, i) => sum + (i.impactAmount || 0), 0);
            clusters.push({
                id: `cluster_orphan_${nanoid(8)}`,
                issues: orphans,
                totalImpact,
                currency: 'USD',
            });
        }
        return clusters;
    }
    /**
     * Score a recommendation for ranking
     */
    scoreRecommendation(recommendation) {
        const priorityScores = { critical: 100, high: 75, medium: 50, low: 25 };
        const effortScores = { low: 30, medium: 15, high: 5 };
        const priorityScore = priorityScores[recommendation.priority] || 0;
        const effortScore = effortScores[recommendation.effort] || 0;
        const impactScore = Math.min(recommendation.estimatedImpact.revenueChange / 1000, 100);
        const confidenceScore = recommendation.estimatedImpact.confidence * 50;
        return priorityScore + effortScore + impactScore + confidenceScore;
    }
    /**
     * Generate recommendations for a cluster of issues
     */
    async generateClusterRecommendations(cluster, context) {
        const prompt = recommendationPrompt(cluster.issues, context);
        try {
            const result = await this.complete(RECOMMENDATION_SYSTEM_PROMPTS.recommendation, prompt, {
                json: true,
                operationType: 'recommendation',
                promptVersion: RECOMMENDATION_PROMPT_VERSION,
            });
            this.stats.tokensUsed += result.inputTokens + result.outputTokens;
            if (result.cached)
                this.stats.cacheHits++;
            // Validate response with Zod schema
            const parsed = safeParseLLMResponse(RecommendationResponseSchema, result.content, { recommendations: [] });
            return (parsed?.recommendations || []).map(r => this.convertToAIRecommendation(r, cluster.issues));
        }
        catch (error) {
            console.warn('Failed to generate recommendations for cluster:', error);
            // Return basic recommendation based on issues
            return [{
                    id: `rec_${nanoid(16)}`,
                    issueIds: cluster.issues.map(i => i.issueKey || ''),
                    priority: this.determinePriority(cluster.issues),
                    title: `Fix ${cluster.issues.length} billing issue(s)`,
                    description: `Review and correct ${cluster.issues.length} detected issue(s) affecting ${context.contractName || 'multiple contracts'}`,
                    estimatedImpact: {
                        revenueChange: context.totalImpact,
                        currency: context.currency,
                        affectedContracts: 1,
                        confidence: 0.5,
                    },
                    suggestedSimulation: { overrides: [] },
                    effort: 'medium',
                    reasoning: 'Automated recommendation based on detected issues',
                    status: 'pending',
                    createdAt: new Date(),
                }];
        }
    }
    /**
     * Convert API response to AIRecommendation format
     */
    convertToAIRecommendation(response, issues) {
        // Handle both formats: suggestedSimulation (new) and suggestedOverrides (legacy)
        const overrides = response.suggestedSimulation?.overrides
            || response.suggestedOverrides
            || [];
        const confidence = response.estimatedImpact?.confidence;
        return {
            id: `rec_${nanoid(16)}`,
            issueIds: issues.map(i => i.issueKey || ''),
            priority: response.priority,
            title: response.title,
            description: response.description,
            estimatedImpact: response.estimatedImpact,
            suggestedSimulation: {
                overrides,
            },
            effort: response.effort,
            reasoning: response.reasoning,
            status: 'pending',
            createdAt: new Date(),
            needsReview: computeNeedsReview(confidence),
        };
    }
    /**
     * Determine priority based on issues
     */
    determinePriority(issues) {
        const severities = issues.map(i => i.severity);
        if (severities.includes('critical'))
            return 'critical';
        if (severities.includes('high'))
            return 'high';
        if (severities.includes('medium'))
            return 'medium';
        return 'low';
    }
    /**
     * Find issue by ID in context
     */
    findIssueById(issueId, context) {
        // Search in current run issues if available
        return context.currentRunIssues?.find(i => i.issueKey === issueId || i.ruleId === issueId);
    }
    /**
     * Get recommendation statistics
     */
    getStats() {
        return { ...this.stats };
    }
}
/**
 * Create a RecommendationLLM instance from environment variables
 */
export function createRecommendationLLM(config) {
    const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return null;
    }
    return new RecommendationLLM({
        apiKey,
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        ...config,
    });
}
//# sourceMappingURL=recommendations.js.map