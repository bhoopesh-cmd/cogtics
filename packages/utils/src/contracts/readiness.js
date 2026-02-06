/**
 * Readiness Computation
 *
 * Determines if a contract has sufficient extracted terms for downstream use.
 */
// Default required terms for standard contracts
const DEFAULT_REQUIRED_TERMS = [
    'pricing_model',
    'billing_cadence',
    'contract_value',
    'start_date',
    'term_length',
];
// Default configuration
const DEFAULT_CONFIG = {
    requiredTerms: DEFAULT_REQUIRED_TERMS,
    minConfidenceThreshold: 0.5,
    readyConfidenceThreshold: 0.7,
};
// Contract type specific required terms
const CONTRACT_TYPE_REQUIREMENTS = {
    subscription: [
        'pricing_model',
        'billing_cadence',
        'contract_value',
        'start_date',
        'term_length',
        'auto_renew',
    ],
    enterprise: [
        'pricing_model',
        'billing_cadence',
        'contract_value',
        'start_date',
        'term_length',
        'payment_terms',
        'termination_terms',
    ],
    saas: [
        'pricing_model',
        'billing_cadence',
        'contract_value',
        'start_date',
        'term_length',
        'auto_renew',
        'usage_caps',
    ],
    services: [
        'pricing_model',
        'contract_value',
        'start_date',
        'end_date',
        'payment_terms',
    ],
    license: [
        'pricing_model',
        'contract_value',
        'start_date',
        'term_length',
        'usage_caps',
    ],
};
/**
 * Compute readiness status for a contract based on extracted terms
 */
export function computeReadiness(terms, contractType, customConfig) {
    // Determine configuration
    const config = {
        ...DEFAULT_CONFIG,
        ...customConfig,
    };
    // Use contract-type specific requirements if available
    if (contractType && CONTRACT_TYPE_REQUIREMENTS[contractType.toLowerCase()]) {
        config.requiredTerms = CONTRACT_TYPE_REQUIREMENTS[contractType.toLowerCase()];
    }
    const requiredTermsSet = new Set(config.requiredTerms);
    const extractedTermTypes = new Set(terms.map(t => t.termType));
    // Find missing terms
    const missingTerms = [];
    for (const required of config.requiredTerms) {
        if (!extractedTermTypes.has(required)) {
            missingTerms.push(required);
        }
    }
    // Find low confidence terms
    const lowConfidenceTerms = [];
    for (const term of terms) {
        if (term.confidence < config.minConfidenceThreshold) {
            lowConfidenceTerms.push({
                termType: term.termType,
                confidence: term.confidence,
            });
        }
    }
    // Calculate overall confidence score
    const confidenceScore = calculateOverallConfidence(terms, config.requiredTerms, config.minConfidenceThreshold);
    // Determine status
    const status = determineStatus(missingTerms.length, lowConfidenceTerms.length, confidenceScore, config.readyConfidenceThreshold);
    // Count extracted terms that match required terms
    const extractedRequiredCount = terms.filter(t => requiredTermsSet.has(t.termType)).length;
    return {
        status,
        confidenceScore,
        requiredTermsCount: config.requiredTerms.length,
        extractedTermsCount: extractedRequiredCount,
        missingTerms,
        lowConfidenceTerms,
    };
}
/**
 * Calculate overall confidence score
 */
function calculateOverallConfidence(terms, requiredTerms, minThreshold) {
    if (requiredTerms.length === 0) {
        return terms.length > 0 ? averageConfidence(terms) : 0;
    }
    const termsByType = new Map();
    for (const term of terms) {
        if (!termsByType.has(term.termType) || term.confidence > termsByType.get(term.termType).confidence) {
            termsByType.set(term.termType, term);
        }
    }
    let totalScore = 0;
    let totalWeight = 0;
    for (const required of requiredTerms) {
        const weight = 1; // Could be adjusted per term type
        const term = termsByType.get(required);
        if (term) {
            // Term found - use its confidence
            totalScore += term.confidence * weight;
        }
        else {
            // Missing term - contributes 0
            totalScore += 0;
        }
        totalWeight += weight;
    }
    // Also factor in bonus terms (non-required but extracted)
    const bonusTerms = terms.filter(t => !requiredTerms.includes(t.termType));
    if (bonusTerms.length > 0) {
        const bonusWeight = 0.1 * bonusTerms.length;
        const bonusScore = averageConfidence(bonusTerms) * bonusWeight;
        totalScore += bonusScore;
        totalWeight += bonusWeight;
    }
    return totalWeight > 0 ? totalScore / totalWeight : 0;
}
/**
 * Calculate average confidence of terms
 */
function averageConfidence(terms) {
    if (terms.length === 0)
        return 0;
    return terms.reduce((sum, t) => sum + t.confidence, 0) / terms.length;
}
/**
 * Determine readiness status based on metrics
 */
function determineStatus(missingCount, lowConfidenceCount, confidenceScore, readyThreshold) {
    // If critical terms are missing, incomplete
    if (missingCount >= 3) {
        return 'incomplete';
    }
    // If confidence is below threshold, needs review
    if (confidenceScore < readyThreshold) {
        return 'needs_review';
    }
    // If there are missing terms or low confidence terms, needs review
    if (missingCount > 0 || lowConfidenceCount > 0) {
        return 'needs_review';
    }
    // All good
    return 'ready';
}
/**
 * Get required terms for a contract type
 */
export function getRequiredTermsForType(contractType) {
    if (contractType && CONTRACT_TYPE_REQUIREMENTS[contractType.toLowerCase()]) {
        return [...CONTRACT_TYPE_REQUIREMENTS[contractType.toLowerCase()]];
    }
    return [...DEFAULT_REQUIRED_TERMS];
}
/**
 * Get all supported contract types
 */
export function getSupportedContractTypes() {
    return Object.keys(CONTRACT_TYPE_REQUIREMENTS);
}
/**
 * Check if a contract meets minimum requirements for processing
 */
export function meetsMinimumRequirements(terms) {
    // At minimum, we need some pricing and date information
    const hasValue = terms.some(t => t.termType === 'contract_value' ||
        t.termType === 'pricing_model');
    const hasDate = terms.some(t => t.termType === 'start_date' ||
        t.termType === 'end_date' ||
        t.termType === 'term_length');
    return hasValue && hasDate;
}
/**
 * Calculate improvement suggestions for a contract
 */
export function getImprovementSuggestions(result) {
    const suggestions = [];
    if (result.missingTerms.length > 0) {
        suggestions.push(`Add the following missing terms: ${result.missingTerms.join(', ')}`);
    }
    if (result.lowConfidenceTerms.length > 0) {
        const lowTerms = result.lowConfidenceTerms
            .map(t => `${t.termType} (${Math.round(t.confidence * 100)}%)`)
            .join(', ');
        suggestions.push(`Review and verify low-confidence terms: ${lowTerms}`);
    }
    if (result.confidenceScore < 0.7 && result.missingTerms.length === 0) {
        suggestions.push('Consider reviewing the contract document for clearer term definitions');
    }
    return suggestions;
}
//# sourceMappingURL=readiness.js.map