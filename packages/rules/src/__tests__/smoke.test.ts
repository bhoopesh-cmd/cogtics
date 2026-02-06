/**
 * Smoke tests for Phase 7 Detection Engine
 */

import { describe, it, expect } from 'vitest';

describe('Phase 7 Smoke Tests', () => {
  describe('Package Exports', () => {
    it('should export all rule framework components', async () => {
      const exports = await import('../index.js');
      
      // Registry
      expect(exports.createRegistry).toBeDefined();
      expect(typeof exports.createRegistry).toBe('function');
      expect(exports.getRegistry).toBeDefined();
      
      // Runner
      expect(exports.runDetection).toBeDefined();
      expect(typeof exports.runDetection).toBe('function');
      
      // Config
      expect(exports.DEFAULT_DETECTION_CONFIG).toBeDefined();
      expect(exports.mergeConfig).toBeDefined();
      
      // Utils
      expect(exports.generateIssueKey).toBeDefined();
      
      // Preprocessor
      expect(exports.preprocessData).toBeDefined();
      
      // Scorer
      expect(exports.scoreIssues).toBeDefined();
      
      // Deduplicator
      expect(exports.deduplicateIssues).toBeDefined();
      expect(exports.RULE_HIERARCHY).toBeDefined();
    });

    it('should export all rules', async () => {
      const { allRules, initializeRules } = await import('../index.js');
      
      expect(allRules).toBeDefined();
      expect(Array.isArray(allRules)).toBe(true);
      
      // Should have 59 rules
      expect(allRules.length).toBe(62);
    });

    it('should export rules by category', async () => {
      const exports = await import('../rules/index.js');
      
      expect(exports.dataQualityRules).toBeDefined();
      expect(exports.billingRules).toBeDefined();
      expect(exports.discountRules).toBeDefined();
      expect(exports.revrecRules).toBeDefined();
      expect(exports.creditsRules).toBeDefined();
      expect(exports.usageRules).toBeDefined();
      expect(exports.lifecycleRules).toBeDefined();
      expect(exports.multiEntityRules).toBeDefined();
      expect(exports.crossSnapshotRules).toBeDefined();
      expect(exports.taxFeesRules).toBeDefined();
      expect(exports.fxCurrencyRules).toBeDefined();
    });
  });

  describe('Rule Registry', () => {
    it('should register all 59 rules', async () => {
      const { getRegistry, allRules, initializeRules } = await import('../index.js');
      
      // initializeRules registers to the singleton
      initializeRules();
      const registry = getRegistry();
      
      expect(registry.count()).toBe(62);
    });

    it('should have unique rule IDs', async () => {
      const { allRules } = await import('../index.js');
      
      const ids = allRules.map(r => r.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });

    it('should have all rule properties', async () => {
      const { allRules } = await import('../index.js');
      
      for (const rule of allRules) {
        expect(rule.id).toBeDefined();
        expect(rule.version).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(rule.category).toBeDefined();
        expect(rule.tier).toBeDefined();
        expect(rule.severity).toBeDefined();
        expect(rule.priority).toBeDefined();
        expect(rule.requiresData).toBeDefined();
        expect(Array.isArray(rule.requiresData)).toBe(true);
        expect(typeof rule.enabled).toBe('boolean');
        expect(typeof rule.run).toBe('function');
      }
    });

    it('should get rules by tier', async () => {
      const { getRegistry, initializeRules } = await import('../index.js');
      
      initializeRules();
      const registry = getRegistry();
      
      const tiers = ['data_quality', 'billing', 'discount', 'revrec', 'credits', 
                     'usage', 'lifecycle', 'multi_entity', 'cross_snapshot', 
                     'tax_fees', 'fx_currency'];
      
      for (const tier of tiers) {
        const tierRules = registry.getByTier(tier as any);
        expect(tierRules.length).toBeGreaterThan(0);
        for (const rule of tierRules) {
          expect(rule.tier).toBe(tier);
        }
      }
    });

    it('should get rules by category', async () => {
      const { getRegistry, initializeRules } = await import('../index.js');
      
      initializeRules();
      const registry = getRegistry();
      
      const categories = ['data_quality', 'billing', 'discount', 'revrec', 'credits',
                          'usage', 'lifecycle', 'multi_entity', 'cross_snapshot',
                          'tax_fees', 'fx_currency'];
      
      for (const category of categories) {
        const categoryRules = registry.getByCategory(category as any);
        expect(categoryRules.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Rule Count by Tier', () => {
    it('should have correct rule counts per tier', async () => {
      const { allRules } = await import('../index.js');
      
      const countByTier: Record<string, number> = {};
      for (const rule of allRules) {
        countByTier[rule.tier] = (countByTier[rule.tier] || 0) + 1;
      }
      
      // Expected counts per plan
      expect(countByTier['data_quality']).toBe(6);  // R100-R105
      expect(countByTier['billing']).toBe(12);       // R001-R010, R017, R018
      expect(countByTier['discount']).toBe(6);       // R011-R016
      expect(countByTier['revrec']).toBe(8);         // R020-R027
      expect(countByTier['credits']).toBe(4);        // R110-R113
      expect(countByTier['usage']).toBe(5);          // R150-R154
      expect(countByTier['lifecycle']).toBe(7);      // R060-R064, R160-R161
      expect(countByTier['multi_entity']).toBe(4);   // R170-R173
      expect(countByTier['cross_snapshot']).toBe(4); // R080-R083
      expect(countByTier['tax_fees']).toBe(3);       // R120-R122
      expect(countByTier['fx_currency']).toBe(3);    // R130-R132
    });
  });

  describe('Configuration', () => {
    it('should have valid default config', async () => {
      const { DEFAULT_DETECTION_CONFIG } = await import('../index.js');
      
      expect(DEFAULT_DETECTION_CONFIG).toBeDefined();
      expect(DEFAULT_DETECTION_CONFIG.fx).toBeDefined();
      expect(DEFAULT_DETECTION_CONFIG.thresholds).toBeDefined();
    });

    it('should merge configs correctly', async () => {
      const { DEFAULT_DETECTION_CONFIG, mergeConfig } = await import('../index.js');
      
      const merged = mergeConfig({
        fx: { tolerancePct: 0.05 },
      });
      expect(merged.fx.tolerancePct).toBe(0.05);
      // Other defaults should be preserved
      expect(merged.proration).toBeDefined();
    });
  });

  describe('Rule Suppression', () => {
    it('should have valid suppression hierarchy', async () => {
      const { RULE_HIERARCHY, allRules } = await import('../index.js');
      
      expect(RULE_HIERARCHY).toBeDefined();
      
      // Verify all referenced rules exist
      const ruleIds = new Set(allRules.map(r => r.id));
      
      for (const [ruleId, suppressedBy] of Object.entries(RULE_HIERARCHY)) {
        expect(ruleIds.has(ruleId)).toBe(true);
        for (const suppressorId of suppressedBy) {
          expect(ruleIds.has(suppressorId)).toBe(true);
        }
      }
    });
  });

  describe('Tier Ordering', () => {
    it('should have correct tier execution order', async () => {
      const { TIER_ORDER } = await import('../index.js');
      
      expect(TIER_ORDER).toBeDefined();
      expect(TIER_ORDER[0]).toBe('data_quality'); // DQ runs first
      
      // Billing should run before credits (credits may reference invoices)
      expect(TIER_ORDER.indexOf('billing')).toBeLessThan(TIER_ORDER.indexOf('credits'));
    });
  });

  describe('Issue Key Generation', () => {
    it('should generate consistent keys', async () => {
      const { generateIssueKey } = await import('../index.js');
      
      const dimensions = { contractId: 'c1', invoiceId: 'i1' };
      const key1 = generateIssueKey('R001', '1.0.0', dimensions);
      const key2 = generateIssueKey('R001', '1.0.0', dimensions);
      
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different inputs', async () => {
      const { generateIssueKey } = await import('../index.js');
      
      const key1 = generateIssueKey('R001', '1.0.0', { contractId: 'c1' });
      const key2 = generateIssueKey('R001', '1.0.0', { contractId: 'c2' });
      const key3 = generateIssueKey('R002', '1.0.0', { contractId: 'c1' });
      
      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
    });
  });
});
