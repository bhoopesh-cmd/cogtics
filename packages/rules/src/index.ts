/**
 * @cogtics/rules
 * Detection Engine - Rule-based revenue leakage and rev-rec mismatch detection
 */

// Types
export * from './types.js';

// Configuration
export * from './config.js';

// Utilities
export * from './utils.js';

// Registry
export {
  getRegistry,
  createRegistry,
  resetRegistry,
  registerRule,
  registerRules,
  TIER_ORDER,
} from './registry.js';

// Runner
export { runDetection } from './runner.js';

// Preprocessor
export { preprocessData, netCreditsWithInvoices } from './preprocessor.js';

// Scorer
export { scoreIssues } from './scorer.js';

// Deduplicator
export {
  deduplicateIssues,
  RULE_HIERARCHY,
  INVERSE_HIERARCHY,
  getSuppressingRules,
  getSuppressedRules,
  isInHierarchy,
} from './deduplicator.js';

// Rules
export * from './rules/index.js';
