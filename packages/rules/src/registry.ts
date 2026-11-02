/**
 * Rule Registry
 * Central registry for all detection rules with versioning
 */
import { createHash } from 'node:crypto';
import type { RuleTier } from '@cogtics/schemas';
import type { IssueCategory, Rule, RuleRegistry, RuleRegistryEntry } from './types.js';

// ============================================
// Rule Tier Order (execution sequence)
// ============================================

const TIER_ORDER: RuleTier[] = [
  'data_quality',   // Tier 0: Run first, can block
  'billing',        // Tier 1: Core billing rules
  'discount',       // Tier 2: Discount rules
  'revrec',         // Tier 3: Rev-rec rules
  'credits',        // Tier 4: Credits/refunds
  'usage',          // Tier 5: Usage-based billing
  'lifecycle',      // Tier 6: Contract lifecycle
  'multi_entity',   // Tier 7: Multi-entity/parent-child
  'cross_snapshot', // Tier 8: Cross-snapshot consistency
  'tax_fees',       // Tier 9: Tax/fee detection
  'fx_currency',    // Tier 10: FX/currency detection
];

// ============================================
// Rule Hash Generation
// ============================================

function generateRuleHash(rule: Rule): string {
  // Create a stable hash of rule definition (excluding run function)
  const hashInput = JSON.stringify({
    id: rule.id,
    version: rule.version,
    name: rule.name,
    category: rule.category,
    tier: rule.tier,
    severity: rule.severity,
    priority: rule.priority,
    dependsOn: rule.dependsOn,
    suppressedBy: rule.suppressedBy,
    requiresData: rule.requiresData,
  });
  
  return createHash('sha256').update(hashInput).digest('hex').substring(0, 16);
}

// ============================================
// Registry Implementation
// ============================================

class RuleRegistryImpl implements RuleRegistry {
  rules: Map<string, RuleRegistryEntry> = new Map();

  register(rule: Rule): void {
    const hash = generateRuleHash(rule);
    this.rules.set(rule.id, { rule, hash });
  }

  registerAll(rules: Rule[]): void {
    for (const rule of rules) {
      this.register(rule);
    }
  }

  get(id: string): Rule | undefined {
    return this.rules.get(id)?.rule;
  }

  getByCategory(category: IssueCategory): Rule[] {
    const result: Rule[] = [];
    for (const entry of this.rules.values()) {
      if (entry.rule.category === category) {
        result.push(entry.rule);
      }
    }
    return result;
  }

  getByTier(tier: RuleTier): Rule[] {
    const result: Rule[] = [];
    for (const entry of this.rules.values()) {
      if (entry.rule.tier === tier) {
        result.push(entry.rule);
      }
    }
    return result.sort((a, b) => a.priority - b.priority);
  }

  getEnabled(): Rule[] {
    const result: Rule[] = [];
    for (const entry of this.rules.values()) {
      if (entry.rule.enabled) {
        result.push(entry.rule);
      }
    }
    return result;
  }

  getInOrder(): Rule[] {
    const allRules: Rule[] = [];
    
    // Get rules in tier order
    for (const tier of TIER_ORDER) {
      const tierRules = this.getByTier(tier);
      allRules.push(...tierRules);
    }
    
    return allRules;
  }

  getHash(id: string): string | undefined {
    return this.rules.get(id)?.hash;
  }

  getAllHashes(): Record<string, string> {
    const hashes: Record<string, string> = {};
    for (const [id, entry] of this.rules.entries()) {
      hashes[id] = entry.hash;
    }
    return hashes;
  }

  count(): number {
    return this.rules.size;
  }

  list(): string[] {
    return Array.from(this.rules.keys());
  }
}

// ============================================
// Singleton Instance
// ============================================

let registryInstance: RuleRegistryImpl | null = null;

/**
 * Get the singleton rule registry
 */
export function getRegistry(): RuleRegistry {
  if (!registryInstance) {
    registryInstance = new RuleRegistryImpl();
  }
  return registryInstance;
}

/**
 * Create a new registry (for testing)
 */
export function createRegistry(): RuleRegistry {
  return new RuleRegistryImpl();
}

/**
 * Reset the singleton registry (for testing)
 */
export function resetRegistry(): void {
  registryInstance = null;
}

/**
 * Register a rule with the singleton registry
 */
export function registerRule(rule: Rule): void {
  getRegistry();
  if (registryInstance) {
    registryInstance.register(rule);
  }
}

/**
 * Register multiple rules with the singleton registry
 */
export function registerRules(rules: Rule[]): void {
  getRegistry();
  if (registryInstance) {
    registryInstance.registerAll(rules);
  }
}

// Export tier order for external use
export { TIER_ORDER };
