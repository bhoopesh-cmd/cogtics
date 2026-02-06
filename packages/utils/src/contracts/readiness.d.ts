/**
 * Readiness Computation
 *
 * Determines if a contract has sufficient extracted terms for downstream use.
 */
import type { ExtractedTerm, TermType } from './extraction.js';
export type ReadinessStatus = 'ready' | 'needs_review' | 'incomplete';
export interface ReadinessResult {
    status: ReadinessStatus;
    confidenceScore: number;
    requiredTermsCount: number;
    extractedTermsCount: number;
    missingTerms: string[];
    lowConfidenceTerms: Array<{
        termType: string;
        confidence: number;
    }>;
}
export interface ReadinessConfig {
    requiredTerms: TermType[];
    minConfidenceThreshold: number;
    readyConfidenceThreshold: number;
}
/**
 * Compute readiness status for a contract based on extracted terms
 */
export declare function computeReadiness(terms: ExtractedTerm[], contractType?: string, customConfig?: Partial<ReadinessConfig>): ReadinessResult;
/**
 * Get required terms for a contract type
 */
export declare function getRequiredTermsForType(contractType?: string): TermType[];
/**
 * Get all supported contract types
 */
export declare function getSupportedContractTypes(): string[];
/**
 * Check if a contract meets minimum requirements for processing
 */
export declare function meetsMinimumRequirements(terms: ExtractedTerm[]): boolean;
/**
 * Calculate improvement suggestions for a contract
 */
export declare function getImprovementSuggestions(result: ReadinessResult): string[];
//# sourceMappingURL=readiness.d.ts.map