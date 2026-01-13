/**
 * Unit tests for Tier 2: Discount rules
 */

import { describe, it, expect } from 'vitest';
import { discountRules } from '../rules/discounts/index.js';
import { createTestContext } from './fixtures.js';

describe('Tier 2: Discount Rules', () => {
  describe('Rule Registration', () => {
    it('should have 6 discount rules', () => {
      expect(discountRules.length).toBe(6);
    });

    it('all rules should have correct tier and category', () => {
      for (const rule of discountRules) {
        expect(rule.tier).toBe('discount');
        expect(rule.category).toBe('discount');
        expect(rule.enabled).toBe(true);
      }
    });

    it('all rules should have required properties', () => {
      for (const rule of discountRules) {
        expect(rule.id).toBeDefined();
        expect(rule.version).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(rule.severity).toBeDefined();
        expect(typeof rule.run).toBe('function');
      }
    });

    it('should have expected rule IDs', () => {
      const ids = discountRules.map(r => r.id);
      expect(ids).toContain('R011');
      expect(ids).toContain('R012');
      expect(ids).toContain('R013');
      expect(ids).toContain('R014');
      expect(ids).toContain('R015');
      expect(ids).toContain('R016');
    });
  });

  describe('Rule Execution', () => {
    it('rules should execute without errors on empty context', () => {
      const ctx = createTestContext({ contracts: [], invoices: [] });
      
      for (const rule of discountRules) {
        expect(() => rule.run(ctx)).not.toThrow();
      }
    });

    it('rules should return array of issues', () => {
      const ctx = createTestContext();
      
      for (const rule of discountRules) {
        const issues = rule.run(ctx);
        expect(Array.isArray(issues)).toBe(true);
      }
    });
  });
});
