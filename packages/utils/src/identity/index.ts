/**
 * Identity Resolution Utilities
 */

// Normalization
export {
  normalizeCompanyName,
  extractDomain,
  normalizeAddress,
  normalizePhone,
  tokenizeName,
  jaroWinkler,
  tokenOverlap,
  hashString,
} from './normalize.js';

// Matching
export {
  type CustomerForMatching,
  type BlockingKeyType,
  generateBlockingKeys,
  computeMatchFeatures,
  findMatchingBlockingKeys,
  buildBlockingKeyIndex,
  generateCandidatePairs,
} from './matching.js';

// Scoring
export {
  DEFAULT_WEIGHTS,
  computeMatchScore,
  applyThresholds,
  scoreAndDecide,
  explainScore,
  type MatchDecision,
} from './scoring.js';
