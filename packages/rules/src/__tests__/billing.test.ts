/**
 * Unit tests for Tier 1: Billing rules
 */

import { describe, it, expect } from 'vitest';
import { billingRules } from '../rules/billing/index.js';
import { createTestContext } from './fixtures.js';

describe('Tier 1: Billing Rules', () => {
  describe('Rule Registration', () => {
    it('should have 10 billing rules', () => {
      expect(billingRules.length).toBe(10);
    });

    it('all rules should have correct tier and category', () => {
      for (const rule of billingRules) {
        expect(rule.tier).toBe('billing');
        expect(rule.category).toBe('billing');
        expect(rule.enabled).toBe(true);
      }
    });

    it('all rules should have required properties', () => {
      for (const rule of billingRules) {
        expect(rule.id).toBeDefined();
        expect(rule.version).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(rule.severity).toBeDefined();
        expect(typeof rule.run).toBe('function');
      }
    });

    it('should have expected rule IDs', () => {
      const ids = billingRules.map(r => r.id);
      expect(ids).toContain('R001');
      expect(ids).toContain('R002');
      expect(ids).toContain('R003');
      expect(ids).toContain('R004');
      expect(ids).toContain('R005');
      expect(ids).toContain('R006');
      expect(ids).toContain('R007');
      expect(ids).toContain('R008');
      expect(ids).toContain('R009');
      expect(ids).toContain('R010');
    });
  });

  describe('Rule Execution', () => {
    it('rules should execute without errors on empty context', () => {
      const ctx = createTestContext({ contracts: [], invoices: [] });
      
      for (const rule of billingRules) {
        expect(() => rule.run(ctx)).not.toThrow();
      }
    });

    it('rules should return array of issues', () => {
      const ctx = createTestContext();
      
      for (const rule of billingRules) {
        const issues = rule.run(ctx);
        expect(Array.isArray(issues)).toBe(true);
      }
    });
  });

  describe('Rule Hierarchy', () => {
    it('R002 should be suppressed by specific rules', () => {
      const r002 = billingRules.find(r => r.id === 'R002');
      expect(r002?.suppressedBy).toBeDefined();
      expect(r002?.suppressedBy).toContain('R004');
      expect(r002?.suppressedBy).toContain('R005');
    });

    it('R003 should be suppressed by specific rules', () => {
      const r003 = billingRules.find(r => r.id === 'R003');
      expect(r003?.suppressedBy).toBeDefined();
      expect(r003?.suppressedBy).toContain('R004');
      expect(r003?.suppressedBy).toContain('R005');
    });
  });
});
