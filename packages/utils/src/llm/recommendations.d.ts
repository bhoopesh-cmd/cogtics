/**
 * Recommendation LLM - AI-Powered Prescriptive Analytics (Tier 4)
 *
 * Production-ready LLM client for generating recommendations with:
 * - Rate limit handling
 * - Cost tracking
 * - Token limit validation
 * - Concurrent request limiting
 */
import type { RuleContext, AIEnrichedIssue, AIRecommendation, SimulationOverride } from '@cogtics/rules';
import { ProductionLLMClient, type BaseLLMConfig } from './base-client.js';
export interface RecommendationLLMConfig extends Partial<BaseLLMConfig> {
    /** Default recommendation configuration */
    recommendationConfig?: Partial<RecommendationConfig>;
}
export interface RecommendationConfig {
    /** Max recommendations to generate (default: 50, generous) */
    maxRecommendations: number;
    /** Minimum combined impact to generate recommendation (default: 10, generous) */
    minImpactThreshold: number;
    /** Group related issues */
    groupRelatedIssues: boolean;
    /** Include simulation configs */
    includeSimulationConfigs: boolean;
}
export interface IssueCluster {
    id: string;
    issues: AIEnrichedIssue[];
    commonContractId?: string;
    commonCustomerId?: string;
    totalImpact: number;
    currency: string;
}
export interface RecommendationStats {
    totalRecommendations: number;
    totalEstimatedImpact: number;
    byPriority: Record<string, number>;
    byEffort: Record<string, number>;
    durationMs: number;
    tokensUsed: number;
    costUsd: number;
    cacheHits: number;
}
export declare class RecommendationLLM extends ProductionLLMClient {
    private defaultConfig;
    private stats;
    constructor(config?: RecommendationLLMConfig);
    private initStats;
    /**
     * Generate recommendations from enriched issues
     */
    generateRecommendations(issues: AIEnrichedIssue[], context: RuleContext, config?: Partial<RecommendationConfig>): Promise<AIRecommendation[]>;
    /**
     * Generate simulation configuration for a recommendation
     */
    generateSimulationConfig(recommendation: AIRecommendation, context: RuleContext): Promise<SimulationOverride[]>;
    /**
     * Cluster related issues for grouped recommendations
     */
    clusterRelatedIssues(issues: AIEnrichedIssue[]): IssueCluster[];
    /**
     * Score a recommendation for ranking
     */
    scoreRecommendation(recommendation: AIRecommendation): number;
    /**
     * Generate recommendations for a cluster of issues
     */
    private generateClusterRecommendations;
    /**
     * Convert API response to AIRecommendation format
     */
    private convertToAIRecommendation;
    /**
     * Determine priority based on issues
     */
    private determinePriority;
    /**
     * Find issue by ID in context
     */
    private findIssueById;
    /**
     * Get recommendation statistics
     */
    getStats(): RecommendationStats;
}
/**
 * Create a RecommendationLLM instance from environment variables
 */
export declare function createRecommendationLLM(config?: RecommendationLLMConfig): RecommendationLLM | null;
//# sourceMappingURL=recommendations.d.ts.map