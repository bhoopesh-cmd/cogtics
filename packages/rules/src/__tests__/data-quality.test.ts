/**
 * Unit tests for Tier 0: Data Quality Gate rules
 */

import { describe, it, expect } from 'vitest';
import { dataQualityRules } from '../rules/data-quality/index.js';
import { createTestContext, healthyDataQuality, staleDataQuality } from './fixtures.js';

describe('Tier 0: Data Quality Gate Rules', () => {
  describe('Rule Registration', () => {
    it('should have 6 data quality rules', () => {
      expect(dataQualityRules.length).toBe(6);
    });

    it('all rules should have correct tier and category', () => {
      for (const rule of dataQualityRules) {
        expect(rule.tier).toBe('data_quality');
        expect(rule.category).toBe('data_quality');
        expect(rule.enabled).toBe(true);
      }
    });

    it('all rules should have required properties', () => {
      for (const rule of dataQualityRules) {
        expect(rule.id).toBeDefined();
        expect(rule.version).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(rule.severity).toBeDefined();
        expect(typeof rule.run).toBe('function');
      }
    });

    it('should have expected rule IDs', () => {
      const ids = dataQualityRules.map(r => r.id);
      expect(ids).toContain('R100');
      expect(ids).toContain('R101');
      expect(ids).toContain('R102');
      expect(ids).toContain('R103');
      expect(ids).toContain('R104');
      expect(ids).toContain('R105');
    });
  });

  describe('Rule Execution', () => {
    it('rules should execute without errors on healthy data', () => {
      const ctx = createTestContext({ dataQuality: healthyDataQuality });
      
      for (const rule of dataQualityRules) {
        expect(() => rule.run(ctx)).not.toThrow();
      }
    });

    it('rules should execute without errors on stale data', () => {
      const ctx = createTestContext({ dataQuality: staleDataQuality });
      
      for (const rule of dataQualityRules) {
        expect(() => rule.run(ctx)).not.toThrow();
      }
    });

    it('rules should return array of issues', () => {
      const ctx = createTestContext();
      
      for (const rule of dataQualityRules) {
        const issues = rule.run(ctx);
        expect(Array.isArray(issues)).toBe(true);
      }
    });

    it('should detect issues with stale data', () => {
      const ctx = createTestContext({ dataQuality: staleDataQuality });
      
      let totalIssues = 0;
      for (const rule of dataQualityRules) {
        const issues = rule.run(ctx);
        totalIssues += issues.length;
      }
      
      // Stale data should produce some issues
      expect(totalIssues).toBeGreaterThan(0);
    });
  });
});
