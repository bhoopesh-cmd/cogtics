/**
 * Unit tests for Tier 3: Rev-Rec rules
 */

import { describe, it, expect } from 'vitest';
import { revrecRules } from '../rules/revrec/index.js';
import { createTestContext } from './fixtures.js';

describe('Tier 3: Rev-Rec Rules', () => {
  describe('Rule Registration', () => {
    it('should have 8 rev-rec rules', () => {
      expect(revrecRules.length).toBe(8);
    });

    it('all rules should have correct tier and category', () => {
      for (const rule of revrecRules) {
        expect(rule.tier).toBe('revrec');
        expect(rule.category).toBe('revrec');
        expect(rule.enabled).toBe(true);
      }
    });

    it('all rules should have required properties', () => {
      for (const rule of revrecRules) {
        expect(rule.id).toBeDefined();
        expect(rule.version).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(rule.severity).toBeDefined();
        expect(typeof rule.run).toBe('function');
      }
    });

    it('should have expected rule IDs', () => {
      const ids = revrecRules.map(r => r.id);
      expect(ids).toContain('R020');
      expect(ids).toContain('R021');
      expect(ids).toContain('R022');
      expect(ids).toContain('R023');
      expect(ids).toContain('R024');
      expect(ids).toContain('R025');
      expect(ids).toContain('R026');
      expect(ids).toContain('R027');
    });
  });

  describe('Rule Execution', () => {
    it('rules should execute without errors on empty context', () => {
      const ctx = createTestContext({ 
        contracts: [], 
        invoices: [], 
        obligations: [],
        schedules: [],
        deferredBalances: [],
      });
      
      for (const rule of revrecRules) {
        expect(() => rule.run(ctx)).not.toThrow();
      }
    });

    it('rules should return array of issues', () => {
      const ctx = createTestContext();
      
      for (const rule of revrecRules) {
        const issues = rule.run(ctx);
        expect(Array.isArray(issues)).toBe(true);
      }
    });
  });
});
