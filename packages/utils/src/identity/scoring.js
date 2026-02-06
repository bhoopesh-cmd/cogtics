import { DEFAULT_IDENTITY_CONFIG } from '@cogtics/schemas';
/**
 * Default scoring weights
 */
export const DEFAULT_WEIGHTS = {
    name_similarity: 40,
    domain_match: 25,
    tax_id_match: 20,
    address_match: 10,
    external_id_overlap: 5,
};
/**
 * Compute a match score from features (0-100)
 */
export function computeMatchScore(features, weights = DEFAULT_WEIGHTS) {
    let score = 0;
    let totalWeight = 0;
    // Name similarity (0-1) contributes proportionally
    score += features.name_similarity * weights.name_similarity;
    totalWeight += weights.name_similarity;
    // Boolean features contribute full weight if true
    if (features.domain_match) {
        score += weights.domain_match;
    }
    totalWeight += weights.domain_match;
    if (features.tax_id_match) {
        score += weights.tax_id_match;
    }
    totalWeight += weights.tax_id_match;
    if (features.address_match) {
        score += weights.address_match;
    }
    totalWeight += weights.address_match;
    if (features.external_id_overlap) {
        score += weights.external_id_overlap;
    }
    totalWeight += weights.external_id_overlap;
    // Normalize to 0-100
    return totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;
}
/**
 * Apply thresholds to a score and return a decision
 */
export function applyThresholds(score, config = DEFAULT_IDENTITY_CONFIG) {
    if (score >= config.auto_merge_threshold) {
        return 'auto_merge';
    }
    if (score >= config.review_threshold) {
        return 'review';
    }
    return 'skip';
}
/**
 * Score a candidate pair and return decision
 */
export function scoreAndDecide(features, config = DEFAULT_IDENTITY_CONFIG) {
    const weights = config.scoring_weights ?? DEFAULT_WEIGHTS;
    const score = computeMatchScore(features, weights);
    const decision = applyThresholds(score, config);
    return { score, decision };
}
/**
 * Explain a match score breakdown
 */
export function explainScore(features, weights = DEFAULT_WEIGHTS) {
    const explanations = [];
    const namePct = features.name_similarity * 100;
    explanations.push({
        feature: 'Name Similarity',
        value: `${namePct.toFixed(0)}%`,
        contribution: Math.round(features.name_similarity * weights.name_similarity),
    });
    explanations.push({
        feature: 'Domain Match',
        value: features.domain_match ? 'Yes' : 'No',
        contribution: features.domain_match ? weights.domain_match : 0,
    });
    explanations.push({
        feature: 'Tax ID Match',
        value: features.tax_id_match ? 'Yes' : 'No',
        contribution: features.tax_id_match ? weights.tax_id_match : 0,
    });
    explanations.push({
        feature: 'Address Match',
        value: features.address_match ? 'Yes' : 'No',
        contribution: features.address_match ? weights.address_match : 0,
    });
    explanations.push({
        feature: 'External ID Overlap',
        value: features.external_id_overlap ? 'Yes' : 'No',
        contribution: features.external_id_overlap ? weights.external_id_overlap : 0,
    });
    return explanations;
}
//# sourceMappingURL=scoring.js.map