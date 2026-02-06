/**
 * Identity Scoring Utilities
 *
 * Compute match scores from features and apply thresholds.
 */
import type { MatchFeatures, IdentityConfig } from '@cogtics/schemas';
/**
 * Default scoring weights
 */
export declare const DEFAULT_WEIGHTS: {
    name_similarity: number;
    domain_match: number;
    tax_id_match: number;
    address_match: number;
    external_id_overlap: number;
};
/**
 * Compute a match score from features (0-100)
 */
export declare function computeMatchScore(features: MatchFeatures, weights?: {
    name_similarity: number;
    domain_match: number;
    tax_id_match: number;
    address_match: number;
    external_id_overlap: number;
}): number;
/**
 * Match decision types
 */
export type MatchDecision = 'auto_merge' | 'review' | 'skip';
/**
 * Apply thresholds to a score and return a decision
 */
export declare function applyThresholds(score: number, config?: IdentityConfig): MatchDecision;
/**
 * Score a candidate pair and return decision
 */
export declare function scoreAndDecide(features: MatchFeatures, config?: IdentityConfig): {
    score: number;
    decision: MatchDecision;
};
/**
 * Explain a match score breakdown
 */
export declare function explainScore(features: MatchFeatures, weights?: {
    name_similarity: number;
    domain_match: number;
    tax_id_match: number;
    address_match: number;
    external_id_overlap: number;
}): Array<{
    feature: string;
    value: string;
    contribution: number;
}>;
//# sourceMappingURL=scoring.d.ts.map