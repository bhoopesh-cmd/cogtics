/**
 * Recommendation LLM Prompts (Tier 4)
 *
 * Prompts for AI-powered prescriptive recommendations including
 * fix suggestions, simulation configurations, and impact predictions.
 */
import type { AIEnrichedIssue, SimulationOverride } from '@cogtics/rules';
/** Prompt version for audit logging and replay */
export declare const RECOMMENDATION_PROMPT_VERSION = "1.0.0";
export declare const RECOMMENDATION_SYSTEM_PROMPTS: {
    recommendation: string;
    simulationConfig: string;
    impactEstimation: string;
};
/**
 * Generate recommendation prompt for a group of related issues
 */
export declare function recommendationPrompt(issues: AIEnrichedIssue[], context: {
    contractName?: string;
    customerName?: string;
    totalImpact?: number;
    currency?: string;
}): string;
/**
 * Generate simulation config for a specific fix
 */
export declare function simulationConfigPrompt(issue: AIEnrichedIssue, context: {
    contractTerms?: Array<{
        type: string;
        value: unknown;
    }>;
    currentInvoice?: {
        id: string;
        amount: number;
        date: string;
    };
    historicalData?: {
        avgAmount: number;
        invoiceCount: number;
    };
}): string;
/**
 * Generate impact estimation prompt
 */
export declare function impactEstimationPrompt(issues: AIEnrichedIssue[], proposedChanges: SimulationOverride[]): string;
export interface RecommendationResponse {
    recommendations: AIRecommendationResponse[];
}
export interface AIRecommendationResponse {
    issueIndices: number[];
    priority: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    estimatedImpact: {
        revenueChange: number;
        currency: string;
        confidence: number;
        timeHorizon?: string;
    };
    suggestedSimulation: {
        overrides: SimulationOverrideResponse[];
        description: string;
    };
    effort: 'low' | 'medium' | 'high';
    reasoning: string;
}
export interface SimulationOverrideResponse {
    type: 'contract_term' | 'price_change' | 'timing_shift' | 'discount_change' | 'billing_adjustment';
    targetId: string;
    field: string;
    originalValue: unknown;
    newValue: unknown;
    effectiveDate?: string;
    description?: string;
}
export interface ImpactEstimationResponse {
    directImpact: {
        amount: number;
        currency: string;
        confidence: number;
    };
    ongoingPrevention?: {
        annualAmount: number;
        currency: string;
        confidence: number;
    };
    timeToRealize: 'immediate' | '30_days' | 'quarter' | 'annual';
    riskFactors: string[];
    reasoning: string;
}
//# sourceMappingURL=recommendations.d.ts.map