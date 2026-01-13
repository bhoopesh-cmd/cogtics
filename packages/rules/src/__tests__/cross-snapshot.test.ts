/**
 * Unit tests for Tier 8: Cross-Snapshot rules
 */

import { describe, it, expect } from 'vitest';
import { crossSnapshotRules } from '../rules/cross-snapshot/index.js';
import { createTestContext } from './fixtures.js';

describe('Tier 8: Cross-Snapshot Rules', () => {
  describe('Rule Registration', () => {
    it('should have 4 cross-snapshot rules', () => {
      expect(crossSnapshotRules.length).toBe(4);
    });

    it('all rules should have correct tier and category', () => {
      for (const rule of crossSnapshotRules) {
        expect(rule.tier).toBe('cross_snapshot');
        expect(rule.category).toBe('cross_snapshot');
        expect(rule.enabled).toBe(true);
      }
    });

    it('all rules should have required properties', () => {
      for (const rule of crossSnapshotRules) {
        expect(rule.id).toBeDefined();
        expect(rule.version).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(rule.severity).toBeDefined();
        expect(typeof rule.run).toBe('function');
      }
    });

    it('should have expected rule IDs', () => {
      const ids = crossSnapshotRules.map(r => r.id);
      expect(ids).toContain('R080');
      expect(ids).toContain('R081');
      expect(ids).toContain('R082');
      expect(ids).toContain('R083');
    });
  });

  describe('Rule Execution', () => {
    it('rules should execute without errors on empty context', () => {
      const ctx = createTestContext({ 
        contracts: [], 
        invoices: [], 
        priorIssues: [],
        priorSnapshots: [],
      });
      
      for (const rule of crossSnapshotRules) {
        expect(() => rule.run(ctx)).not.toThrow();
      }
    });

    it('rules should return array of issues', () => {
      const ctx = createTestContext();
      
      for (const rule of crossSnapshotRules) {
        const issues = rule.run(ctx);
        expect(Array.isArray(issues)).toBe(true);
      }
    });
  });

  describe('Cross-Snapshot Data Requirements', () => {
    it('rules should be designed for cross-snapshot analysis', () => {
      // Cross-snapshot rules analyze data across snapshots
      expect(crossSnapshotRules.length).toBe(4);
      
      // All should be in the cross_snapshot category/tier
      for (const rule of crossSnapshotRules) {
        expect(rule.category).toBe('cross_snapshot');
        expect(rule.tier).toBe('cross_snapshot');
      }
    });
  });
});
