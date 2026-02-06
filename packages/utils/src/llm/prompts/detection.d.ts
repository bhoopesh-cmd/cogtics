/**
 * Detection LLM Prompts
 *
 * Prompts for AI-powered issue enrichment, root cause analysis,
 * fix suggestions, and explanations.
 */
import type { RuleIssue } from '@cogtics/rules';
/** Prompt version for audit logging and replay */
export declare const DETECTION_PROMPT_VERSION = "1.0.0";
export declare const DETECTION_SYSTEM_PROMPTS: {
    issueEnrichment: string;
    fixSuggestion: string;
    explanation: string;
};
/**
 * Generate a batch issue enrichment prompt
 */
export declare function issueEnrichmentPrompt(issues: RuleIssue[], context: {
    contractName?: string;
    customerName?: string;
    contractValue?: number;
    currency?: string;
}): string;
/**
 * Generate a single fix suggestion prompt
 */
export declare function fixSuggestionPrompt(issue: RuleIssue, context: {
    contractName?: string;
    customerName?: string;
    contractTerms?: Array<{
        type: string;
        value: unknown;
    }>;
    invoiceDetails?: {
        number: string;
        amount: number;
        date: string;
    };
}): string;
/**
 * Generate an explanation prompt for business users
 */
export declare function explanationPrompt(issue: RuleIssue, options?: {
    audienceLevel?: 'executive' | 'manager' | 'analyst';
    includeRecommendation?: boolean;
}): string;
export interface IssueEnrichmentResponse {
    issueIndex: number;
    rootCause: string;
    businessImpact: string;
    suggestedFix: string;
    confidence: number;
    relatedIssueIndices: number[];
    explanation: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    tags: string[];
}
export interface FixSuggestionResponse {
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
export interface ExplanationResponse {
    headline: string;
    explanation: string;
    whyItMatters: string;
    recommendation?: string;
    urgency: 'immediate' | 'this_week' | 'this_month' | 'monitor';
}
//# sourceMappingURL=detection.d.ts.map