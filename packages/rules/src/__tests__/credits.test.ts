/**
 * Unit tests for Tier 4: Credits rules
 */

import { describe, it, expect } from 'vitest';
import { creditsRules } from '../rules/credits/index.js';
import { createTestContext } from './fixtures.js';

describe('Tier 4: Credits Rules', () => {
  describe('Rule Registration', () => {
    it('should have 4 credits rules', () => {
      expect(creditsRules.length).toBe(4);
    });

    it('all rules should have correct tier and category', () => {
      for (const rule of creditsRules) {
        expect(rule.tier).toBe('credits');
        expect(rule.category).toBe('credits');
        expect(rule.enabled).toBe(true);
      }
    });

    it('all rules should have required properties', () => {
      for (const rule of creditsRules) {
        expect(rule.id).toBeDefined();
        expect(rule.version).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(rule.severity).toBeDefined();
        expect(typeof rule.run).toBe('function');
      }
    });

    it('should have expected rule IDs', () => {
      const ids = creditsRules.map(r => r.id);
      expect(ids).toContain('R110');
      expect(ids).toContain('R111');
      expect(ids).toContain('R112');
      expect(ids).toContain('R113');
    });
  });

  describe('Rule Execution', () => {
    it('rules should execute without errors on empty context', () => {
      const ctx = createTestContext({ invoices: [], payments: [] });
      
      for (const rule of creditsRules) {
        expect(() => rule.run(ctx)).not.toThrow();
      }
    });

    it('rules should return array of issues', () => {
      const ctx = createTestContext();
      
      for (const rule of creditsRules) {
        const issues = rule.run(ctx);
        expect(Array.isArray(issues)).toBe(true);
      }
    });
  });
});
