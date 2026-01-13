/**
 * Unit tests for Tier 7: Multi-Entity rules
 */

import { describe, it, expect } from 'vitest';
import { multiEntityRules } from '../rules/multi-entity/index.js';
import { createTestContext } from './fixtures.js';

describe('Tier 7: Multi-Entity Rules', () => {
  describe('Rule Registration', () => {
    it('should have 4 multi-entity rules', () => {
      expect(multiEntityRules.length).toBe(4);
    });

    it('all rules should have correct tier and category', () => {
      for (const rule of multiEntityRules) {
        expect(rule.tier).toBe('multi_entity');
        expect(rule.category).toBe('multi_entity');
        expect(rule.enabled).toBe(true);
      }
    });

    it('all rules should have required properties', () => {
      for (const rule of multiEntityRules) {
        expect(rule.id).toBeDefined();
        expect(rule.version).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(rule.severity).toBeDefined();
        expect(typeof rule.run).toBe('function');
      }
    });

    it('should have expected rule IDs', () => {
      const ids = multiEntityRules.map(r => r.id);
      expect(ids).toContain('R170');
      expect(ids).toContain('R171');
      expect(ids).toContain('R172');
      expect(ids).toContain('R173');
    });
  });

  describe('Rule Execution', () => {
    it('rules should execute without errors on empty context', () => {
      const ctx = createTestContext({ 
        contracts: [], 
        invoices: [], 
        customers: [],
      });
      
      for (const rule of multiEntityRules) {
        expect(() => rule.run(ctx)).not.toThrow();
      }
    });

    it('rules should return array of issues', () => {
      const ctx = createTestContext();
      
      for (const rule of multiEntityRules) {
        const issues = rule.run(ctx);
        expect(Array.isArray(issues)).toBe(true);
      }
    });
  });
});
