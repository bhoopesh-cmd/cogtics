/**
 * Identity Resolution Utilities
 */
export { normalizeCompanyName, extractDomain, normalizeAddress, normalizePhone, tokenizeName, jaroWinkler, tokenOverlap, hashString, } from './normalize.js';
export { type CustomerForMatching, type BlockingKeyType, generateBlockingKeys, computeMatchFeatures, findMatchingBlockingKeys, buildBlockingKeyIndex, generateCandidatePairs, } from './matching.js';
export { DEFAULT_WEIGHTS, computeMatchScore, applyThresholds, scoreAndDecide, explainScore, type MatchDecision, } from './scoring.js';
//# sourceMappingURL=index.d.ts.map