/**
 * LLM Cost Tracker Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMCostTracker, createCostTracker } from '../cost-tracker.js';

describe('LLMCostTracker', () => {
  let tracker: LLMCostTracker;

  beforeEach(() => {
    tracker = new LLMCostTracker({ budgetUsd: 100 });
  });

  describe('trackUsage', () => {
    it('should track LLM usage and calculate cost', async () => {
      const entry = await tracker.trackUsage({
        tenantId: 'tenant_1',
        operationType: 'enrichment',
        model: 'gpt-4o-mini',
        inputTokens: 1000,
        outputTokens: 500,
        status: 'success',
      });

      expect(entry.id).toMatch(/^llu_/);
      expect(entry.tenantId).toBe('tenant_1');
      expect(entry.inputTokens).toBe(1000);
      expect(entry.outputTokens).toBe(500);
      expect(entry.costUsd).toBeGreaterThan(0);
      expect(entry.status).toBe('success');
    });

    it('should track cached requests', async () => {
      const entry = await tracker.trackUsage({
        tenantId: 'tenant_1',
        operationType: 'enrichment',
        model: 'gpt-4o-mini',
        inputTokens: 0,
        outputTokens: 0,
        status: 'cached',
        cacheHit: true,
        cacheKey: 'test_key',
      });

      expect(entry.costUsd).toBe(0);
      expect(entry.cacheHit).toBe(true);
    });
  });

  describe('calculateCost', () => {
    it('should calculate correct cost for gpt-4o-mini', () => {
      const cost = tracker.calculateCost('gpt-4o-mini', 1000000, 500000);
      const expected = 0.15 + 0.30;
      expect(cost).toBeCloseTo(expected, 2);
    });

    it('should calculate correct cost for gpt-4o', () => {
      const cost = tracker.calculateCost('gpt-4o', 1000000, 500000);
      const expected = 5.00 + 7.50;
      expect(cost).toBeCloseTo(expected, 2);
    });
  });

  describe('getCostForRun', () => {
    it('should aggregate costs for a run', async () => {
      await tracker.trackUsage({
        tenantId: 'tenant_1',
        operationType: 'enrichment',
        runId: 'run_1',
        model: 'gpt-4o-mini',
        inputTokens: 5000,
        outputTokens: 2000,
        status: 'success',
      });

      await tracker.trackUsage({
        tenantId: 'tenant_1',
        operationType: 'anomaly',
        runId: 'run_1',
        model: 'gpt-4o-mini',
        inputTokens: 3000,
        outputTokens: 1000,
        status: 'success',
      });

      const summary = tracker.getCostForRun('run_1');

      expect(summary.requestCount).toBe(2);
      expect(summary.totalTokens).toBe(11000);
    });
  });

  describe('checkBudget', () => {
    it('should calculate budget status', async () => {
      tracker.setBudget(1);

      await tracker.trackUsage({
        tenantId: 'tenant_1',
        operationType: 'enrichment',
        model: 'gpt-4o',
        inputTokens: 50000,
        outputTokens: 20000,
        status: 'success',
      });

      const status = tracker.checkBudget('tenant_1');

      expect(status.budgetUsd).toBe(1);
      expect(status.currentCostUsd).toBeGreaterThan(0);
    });
  });
});

describe('createCostTracker', () => {
  it('should create tracker with defaults', () => {
    const tracker = createCostTracker();
    expect(tracker).toBeInstanceOf(LLMCostTracker);
  });
});
