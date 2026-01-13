/**
 * Unit tests for Tier 10: FX/Currency rules
 */

import { describe, it, expect } from 'vitest';
import { fxCurrencyRules } from '../rules/fx-currency/index.js';
import { createTestContext } from './fixtures.js';

describe('Tier 10: FX/Currency Rules', () => {
  describe('Rule Registration', () => {
    it('should have 3 FX/currency rules', () => {
      expect(fxCurrencyRules.length).toBe(3);
    });

    it('all rules should have correct tier and category', () => {
      for (const rule of fxCurrencyRules) {
        expect(rule.tier).toBe('fx_currency');
        expect(rule.category).toBe('fx_currency');
        expect(rule.enabled).toBe(true);
      }
    });

    it('all rules should have required properties', () => {
      for (const rule of fxCurrencyRules) {
        expect(rule.id).toBeDefined();
        expect(rule.version).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(rule.severity).toBeDefined();
        expect(typeof rule.run).toBe('function');
      }
    });

    it('should have expected rule IDs', () => {
      const ids = fxCurrencyRules.map(r => r.id);
      expect(ids).toContain('R130');
      expect(ids).toContain('R131');
      expect(ids).toContain('R132');
    });
  });

  describe('Rule Execution', () => {
    it('rules should execute without errors on empty context', () => {
      const ctx = createTestContext({ 
        contracts: [], 
        invoices: [], 
        payments: [],
        fxRates: {},
      });
      
      for (const rule of fxCurrencyRules) {
        expect(() => rule.run(ctx)).not.toThrow();
      }
    });

    it('rules should return array of issues', () => {
      const ctx = createTestContext();
      
      for (const rule of fxCurrencyRules) {
        const issues = rule.run(ctx);
        expect(Array.isArray(issues)).toBe(true);
      }
    });
  });

  describe('FX Rules Data Requirements', () => {
    it('FX rules should require FX rates', () => {
      const r130 = fxCurrencyRules.find(r => r.id === 'R130');
      expect(r130?.requiresData).toContain('fx_rates');
    });
  });
});
