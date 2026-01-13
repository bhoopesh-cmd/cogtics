/**
 * Unit tests for Tier 5: Usage rules
 */

import { describe, it, expect } from 'vitest';
import { usageRules } from '../rules/usage/index.js';
import { createTestContext } from './fixtures.js';

describe('Tier 5: Usage Rules', () => {
  describe('Rule Registration', () => {
    it('should have 5 usage rules', () => {
      expect(usageRules.length).toBe(5);
    });

    it('all rules should have correct tier and category', () => {
      for (const rule of usageRules) {
        expect(rule.tier).toBe('usage');
        expect(rule.category).toBe('usage');
        expect(rule.enabled).toBe(true);
      }
    });

    it('all rules should have required properties', () => {
      for (const rule of usageRules) {
        expect(rule.id).toBeDefined();
        expect(rule.version).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(rule.severity).toBeDefined();
        expect(typeof rule.run).toBe('function');
      }
    });

    it('should have expected rule IDs', () => {
      const ids = usageRules.map(r => r.id);
      expect(ids).toContain('R150');
      expect(ids).toContain('R151');
      expect(ids).toContain('R152');
      expect(ids).toContain('R153');
      expect(ids).toContain('R154');
    });
  });

  describe('Rule Execution', () => {
    it('rules should execute without errors on empty context', () => {
      const ctx = createTestContext({ 
        contracts: [], 
        invoices: [], 
        usageEvents: [],
      });
      
      for (const rule of usageRules) {
        expect(() => rule.run(ctx)).not.toThrow();
      }
    });

    it('rules should return array of issues', () => {
      const ctx = createTestContext({ 
        contracts: [], 
        invoices: [], 
        usageEvents: [],
      });
      
      for (const rule of usageRules) {
        const issues = rule.run(ctx);
        expect(Array.isArray(issues)).toBe(true);
      }
    });
  });
});
