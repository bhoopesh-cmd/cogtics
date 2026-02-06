/**
 * Detection LLM - AI-Powered Issue Enrichment
 *
 * Production-ready LLM client for issue enrichment with:
 * - Rate limit handling
 * - Cost tracking
 * - Token limit validation
 * - Concurrent request limiting
 */
import type { RuleIssue, ContractWithTerms, InvoiceWithLines, Customer, AIEnrichedIssue } from '@cogtics/rules';
import { ProductionLLMClient, type BaseLLMConfig } from './base-client.js';
export type { AIEnrichedIssue };
export interface DetectionLLMConfig extends Partial<BaseLLMConfig> {
    /** Max issues per batch (default: 20, generous) */
    batchSize?: number;
    /** Max tokens per enrichment request */
    maxTokensPerRequest?: number;
}
export interface EnrichmentContext {
    contracts: ContractWithTerms[];
    invoices: InvoiceWithLines[];
    customers: Customer[];
}
export interface IssueExplanation {
    headline: string;
    explanation: string;
    whyItMatters: string;
    recommendation?: string;
    urgency: 'immediate' | 'this_week' | 'this_month' | 'monitor';
}
export interface FixSuggestion {
    immediateAction: string;
    systemChanges: Array<{
        type: 'simulation_override' | 'contract_update' | 'invoice_adjustment' | 'credit_memo';
        description: string;
        parameters: Record<string, unknown>;
    }>;
    processImprovements: string[];
    estimatedImpact: {
        revenueChange: number;
        currency: string;
        confidence: number;
    };
    riskAssessment: string;
}
export interface EnrichmentStats {
    totalIssues: number;
    enrichedCount: number;
    failedCount: number;
    skippedCount: number;
    totalTokensUsed: number;
    estimatedCostUsd: number;
    durationMs: number;
    cacheHits: number;
}
export declare class DetectionLLM extends ProductionLLMClient {
    private batchSize;
    private maxTokensPerRequest;
    private stats;
    constructor(config?: DetectionLLMConfig);
    private initStats;
    /**
     * Enrich multiple issues with AI analysis
     * Batches issues by contract for efficiency
     */
    enrichIssues(issues: RuleIssue[], context: EnrichmentContext): Promise<AIEnrichedIssue[]>;
    /**
     * Enrich a batch of issues
     */
    private enrichBatch;
    /**
     * Create fallback enrichment when AI fails
     */
    private createFallbackEnrichment;
    /**
     * Get a detailed explanation for a single issue
     */
    explainIssue(issue: RuleIssue, options?: {
        audienceLevel?: 'executive' | 'manager' | 'analyst';
        includeRecommendation?: boolean;
    }): Promise<IssueExplanation>;
    /**
     * Get a fix suggestion for a single issue
     */
    suggestFix(issue: RuleIssue, context: EnrichmentContext): Promise<FixSuggestion>;
    /**
     * Get enrichment statistics
     */
    getStats(): EnrichmentStats;
    /**
     * Group issues by contract ID
     */
    private groupIssuesByContract;
    /**
     * Generate a unique issue key
     */
    private generateIssueKey;
    /**
     * Map severity to priority
     */
    private mapSeverityToPriority;
    /**
     * Map severity to urgency
     */
    private mapSeverityToUrgency;
}
/**
 * Create a DetectionLLM instance from environment variables
 */
export declare function createDetectionLLM(config?: DetectionLLMConfig): DetectionLLM | null;
//# sourceMappingURL=detection.d.ts.map