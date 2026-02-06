/**
 * Integration tests for the detection pipeline
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { initializeRules, allRules, getRegistry, TIER_ORDER } from '../index.js';
import { createEmptyContext } from './fixtures.js';

describe('Detection Pipeline Integration', () => {
  beforeEach(() => {
    // Initialize rules for each test
    initializeRules();
  });

  describe('Rule Registry', () => {
    it('should have 59 rules registered', () => {
      expect(allRules.length).toBe(62);
    });

    it('should have unique rule IDs', () => {
      const ids = allRules.map(r => r.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });

    it('should have all required rule properties', () => {
      for (const rule of allRules) {
        expect(rule.id).toBeDefined();
        expect(rule.version).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.category).toBeDefined();
        expect(rule.tier).toBeDefined();
        expect(rule.severity).toBeDefined();
        expect(typeof rule.run).toBe('function');
        expect(typeof rule.enabled).toBe('boolean');
      }
    });

    it('should get rules by tier after initialization', () => {
      const registry = getRegistry();
      
      for (const tier of TIER_ORDER) {
        const tierRules = registry.getByTier(tier);
        expect(tierRules.length).toBeGreaterThan(0);
      }
    });

    it('should count all registered rules', () => {
      const registry = getRegistry();
      expect(registry.count()).toBe(62);
    });
  });

  describe('Rule Tiers', () => {
    it('should have data_quality rules first in tier order', () => {
      expect(TIER_ORDER[0]).toBe('data_quality');
    });

    it('should have all 11 tiers', () => {
      expect(TIER_ORDER.length).toBe(11);
    });

    it('should have billing before credits in order', () => {
      const billingIdx = TIER_ORDER.indexOf('billing');
      const creditsIdx = TIER_ORDER.indexOf('credits');
      expect(billingIdx).toBeLessThan(creditsIdx);
    });
  });

  describe('Rule Categories', () => {
    it('should have rules in all 11 categories', () => {
      const registry = getRegistry();
      const categories = [
        'data_quality', 'billing', 'discount', 'revrec', 'credits',
        'usage', 'lifecycle', 'multi_entity', 'cross_snapshot', 
        'tax_fees', 'fx_currency'
      ];
      
      for (const category of categories) {
        const rules = registry.getByCategory(category as any);
        expect(rules.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Rule Counts', () => {
    it('should have correct count per tier', () => {
      const countByTier: Record<string, number> = {};
      for (const rule of allRules) {
        countByTier[rule.tier] = (countByTier[rule.tier] || 0) + 1;
      }
      
      expect(countByTier['data_quality']).toBe(6);
      expect(countByTier['billing']).toBe(12);
      expect(countByTier['discount']).toBe(6);
      expect(countByTier['revrec']).toBe(8);
      expect(countByTier['credits']).toBe(4);
      expect(countByTier['usage']).toBe(5);
      expect(countByTier['lifecycle']).toBe(7);
      expect(countByTier['multi_entity']).toBe(4);
      expect(countByTier['cross_snapshot']).toBe(4);
      expect(countByTier['tax_fees']).toBe(3);
      expect(countByTier['fx_currency']).toBe(3);
    });
  });

  describe('Rule Severity', () => {
    it('all rules should have valid severity', () => {
      const validSeverities = ['info', 'low', 'medium', 'high', 'critical'];
      
      for (const rule of allRules) {
        expect(validSeverities).toContain(rule.severity);
      }
    });
  });

  describe('Rule IDs', () => {
    it('should have expected rule ID patterns', () => {
      const ruleIds = allRules.map(r => r.id);
      
      // Data quality: R100-R105
      expect(ruleIds).toContain('R100');
      expect(ruleIds).toContain('R105');
      
      // Billing: R001-R010
      expect(ruleIds).toContain('R001');
      expect(ruleIds).toContain('R010');
      
      // Discount: R011-R016
      expect(ruleIds).toContain('R011');
      expect(ruleIds).toContain('R016');
      
      // Rev-rec: R020-R027
      expect(ruleIds).toContain('R020');
      expect(ruleIds).toContain('R027');
      
      // Credits: R110-R113
      expect(ruleIds).toContain('R110');
      expect(ruleIds).toContain('R113');
      
      // Usage: R150-R154
      expect(ruleIds).toContain('R150');
      expect(ruleIds).toContain('R154');
      
      // Lifecycle: R060-R064, R160-R161
      expect(ruleIds).toContain('R060');
      expect(ruleIds).toContain('R160');
      
      // Multi-entity: R170-R173
      expect(ruleIds).toContain('R170');
      expect(ruleIds).toContain('R173');
      
      // Cross-snapshot: R080-R083
      expect(ruleIds).toContain('R080');
      expect(ruleIds).toContain('R083');
      
      // Tax/fees: R120-R121
      expect(ruleIds).toContain('R120');
      expect(ruleIds).toContain('R121');
      
      // FX/currency: R130-R132
      expect(ruleIds).toContain('R130');
      expect(ruleIds).toContain('R132');
    });
  });
});
