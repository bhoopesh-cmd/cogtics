/**
 * Unit tests for Tier 9: Tax/Fee rules
 */

import { describe, it, expect } from 'vitest';
import { taxFeesRules } from '../rules/tax-fees/index.js';
import { createTestContext } from './fixtures.js';

describe('Tier 9: Tax/Fee Rules', () => {
  describe('Rule Registration', () => {
    it('should have 3 tax/fee rules', () => {
      expect(taxFeesRules.length).toBe(3);
    });

    it('all rules should have correct tier and category', () => {
      for (const rule of taxFeesRules) {
        expect(rule.tier).toBe('tax_fees');
        expect(rule.category).toBe('tax_fees');
        expect(rule.enabled).toBe(true);
      }
    });

    it('all rules should have required properties', () => {
      for (const rule of taxFeesRules) {
        expect(rule.id).toBeDefined();
        expect(rule.version).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(rule.severity).toBeDefined();
        expect(typeof rule.run).toBe('function');
      }
    });

    it('should have expected rule IDs', () => {
      const ids = taxFeesRules.map(r => r.id);
      expect(ids).toContain('R120');
      expect(ids).toContain('R121');
    });
  });

  describe('Rule Execution', () => {
    it('rules should execute without errors on empty context', () => {
      const ctx = createTestContext({ invoices: [], customers: [] });
      
      for (const rule of taxFeesRules) {
        expect(() => rule.run(ctx)).not.toThrow();
      }
    });

    it('rules should return array of issues', () => {
      const ctx = createTestContext();
      
      for (const rule of taxFeesRules) {
        const issues = rule.run(ctx);
        expect(Array.isArray(issues)).toBe(true);
      }
    });
  });
});
