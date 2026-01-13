/**
 * Unit tests for Tier 6: Lifecycle rules
 */

import { describe, it, expect } from 'vitest';
import { lifecycleRules } from '../rules/lifecycle/index.js';
import { createTestContext } from './fixtures.js';

describe('Tier 6: Lifecycle Rules', () => {
  describe('Rule Registration', () => {
    it('should have 7 lifecycle rules', () => {
      expect(lifecycleRules.length).toBe(7);
    });

    it('all rules should have correct tier and category', () => {
      for (const rule of lifecycleRules) {
        expect(rule.tier).toBe('lifecycle');
        expect(rule.category).toBe('lifecycle');
        expect(rule.enabled).toBe(true);
      }
    });

    it('all rules should have required properties', () => {
      for (const rule of lifecycleRules) {
        expect(rule.id).toBeDefined();
        expect(rule.version).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(rule.severity).toBeDefined();
        expect(typeof rule.run).toBe('function');
      }
    });

    it('should have expected rule IDs', () => {
      const ids = lifecycleRules.map(r => r.id);
      expect(ids).toContain('R060');
      expect(ids).toContain('R061');
      expect(ids).toContain('R062');
      expect(ids).toContain('R063');
      expect(ids).toContain('R064');
      expect(ids).toContain('R160');
      expect(ids).toContain('R161');
    });
  });

  describe('Rule Execution', () => {
    it('rules should execute without errors on empty context', () => {
      const ctx = createTestContext({ 
        contracts: [], 
        invoices: [], 
        payments: [] 
      });
      
      for (const rule of lifecycleRules) {
        expect(() => rule.run(ctx)).not.toThrow();
      }
    });

    it('rules should return array of issues', () => {
      const ctx = createTestContext();
      
      for (const rule of lifecycleRules) {
        const issues = rule.run(ctx);
        expect(Array.isArray(issues)).toBe(true);
      }
    });

    it('issues should have required fields', () => {
      const ctx = createTestContext();
      
      for (const rule of lifecycleRules) {
        const issues = rule.run(ctx);
        for (const issue of issues) {
          expect(issue.ruleId).toBe(rule.id);
          expect(issue.category).toBe('lifecycle');
          expect(issue.expected).toBeDefined();
          expect(issue.actual).toBeDefined();
          expect(issue.dimensions).toBeDefined();
        }
      }
    });
  });

  describe('R062 Suppression', () => {
    it('R062 should be suppressed by R061', () => {
      const r062 = lifecycleRules.find(r => r.id === 'R062');
      expect(r062).toBeDefined();
      expect(r062?.suppressedBy).toContain('R061');
    });
  });
});
