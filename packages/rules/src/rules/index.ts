/**
 * Rule Registry Entry Point
 * Registers all rules with the registry
 */
import { registerRules } from '../registry.js';

// Import all rule modules
import { dataQualityRules } from './data-quality/index.js';
import { billingRules } from './billing/index.js';
import { discountRules } from './discounts/index.js';
import { revrecRules } from './revrec/index.js';
import { creditsRules } from './credits/index.js';
import { usageRules } from './usage/index.js';
import { lifecycleRules } from './lifecycle/index.js';
import { multiEntityRules } from './multi-entity/index.js';
import { crossSnapshotRules } from './cross-snapshot/index.js';
import { taxFeesRules } from './tax-fees/index.js';
import { fxCurrencyRules } from './fx-currency/index.js';

// Combine all rules
export const allRules = [
  ...dataQualityRules,
  ...billingRules,
  ...discountRules,
  ...revrecRules,
  ...creditsRules,
  ...usageRules,
  ...lifecycleRules,
  ...multiEntityRules,
  ...crossSnapshotRules,
  ...taxFeesRules,
  ...fxCurrencyRules,
];

// Register all rules
export function initializeRules(): void {
  registerRules(allRules);
}

// Export individual rule sets
export {
  dataQualityRules,
  billingRules,
  discountRules,
  revrecRules,
  creditsRules,
  usageRules,
  lifecycleRules,
  multiEntityRules,
  crossSnapshotRules,
  taxFeesRules,
  fxCurrencyRules,
};

// Export rule count for verification
export const TOTAL_RULE_COUNT = allRules.length;
