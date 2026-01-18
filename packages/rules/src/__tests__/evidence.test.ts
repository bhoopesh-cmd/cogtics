/**
 * Evidence Generation Unit Tests (Phase 8)
 * 
 * Tests for evidence assembly, completeness scoring, and calculation recording.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  CalculationRecorder,
  createCalculationRecorder,
  calculateMonthlyFromArr,
  calculateQuarterlyFromArr,
  calculateVariance,
  calculateProratedAmount,
  calculateDiscountedAmount,
  calculateFxAmount,
  calculateCompletenessScore,
  getCompletenessLabel,
  type CompletenessInput,
} from '../calculations.js';

describe('CalculationRecorder', () => {
  let recorder: CalculationRecorder;

  beforeEach(() => {
    recorder = createCalculationRecorder('R001', '1.0.0');
  });

  it('should record a basic calculation step', () => {
    const output = recorder.record({
      name: 'test_calculation',
      formula: 'a + b',
      inputs: { a: 100, b: 200 },
      output: 300,
    });

    expect(output).toBe(300);
    expect(recorder.count).toBe(1);

    const steps = recorder.getSteps();
    expect(steps).toHaveLength(1);
    expect(steps[0]).toEqual({
      name: 'test_calculation',
      formula: 'a + b',
      inputs: { a: 100, b: 200 },
      output: 300,
      ruleId: 'R001',
      ruleVersion: '1.0.0',
    });
  });

  it('should record expected amount calculation', () => {
    const output = recorder.recordExpected(
      'expected_monthly',
      'arr / 12',
      { arr: 120000 },
      10000
    );

    expect(output).toBe(10000);
    expect(recorder.getSteps()[0].name).toBe('expected_monthly');
  });

  it('should record actual amount calculation', () => {
    const output = recorder.recordActual(
      'actual_invoice',
      'invoice.total',
      { invoiceTotal: 9500 },
      9500
    );

    expect(output).toBe(9500);
  });

  it('should record variance calculation', () => {
    const output = recorder.recordVariance('billing_variance', 10000, 9500);

    expect(output).toBe(-500);
    const step = recorder.getSteps()[0];
    expect(step.formula).toBe('actual - expected');
    expect(step.inputs).toEqual({ expected: 10000, actual: 9500 });
  });

  it('should record proration calculation', () => {
    const output = recorder.recordProration('prorated_amount', 10000, 15, 30);

    expect(output).toBe(5000); // (10000 / 30) * 15
    const step = recorder.getSteps()[0];
    expect(step.inputs).toEqual({ fullAmount: 10000, daysInPeriod: 15, totalDays: 30 });
  });

  it('should record discount calculation', () => {
    const output = recorder.recordDiscount('discounted_price', 10000, 0.2);

    expect(output).toBe(8000); // 10000 * 0.8
    const step = recorder.getSteps()[0];
    expect(step.inputs).toEqual({ originalAmount: 10000, discountRate: 0.2 });
  });

  it('should record FX conversion calculation', () => {
    const output = recorder.recordFxConversion(
      'usd_to_eur',
      10000,
      0.92,
      'USD',
      'EUR'
    );

    expect(output).toBe(9200);
    const step = recorder.getSteps()[0];
    expect(step.name).toBe('usd_to_eur (USD -> EUR)');
    expect(step.inputs).toEqual({ sourceAmount: 10000, exchangeRate: 0.92 });
  });

  it('should accumulate multiple calculation steps', () => {
    recorder.recordExpected('step1', 'a + b', { a: 100, b: 200 }, 300);
    recorder.recordActual('step2', 'c * 2', { c: 150 }, 300);
    recorder.recordVariance('step3', 300, 300);

    expect(recorder.count).toBe(3);
    expect(recorder.getSteps()).toHaveLength(3);
  });

  it('should clear all steps', () => {
    recorder.record({ name: 'test', formula: 'x', inputs: { x: 1 }, output: 1 });
    expect(recorder.count).toBe(1);

    recorder.clear();
    expect(recorder.count).toBe(0);
    expect(recorder.getSteps()).toHaveLength(0);
  });

  it('should return a copy of steps array', () => {
    recorder.record({ name: 'test', formula: 'x', inputs: { x: 1 }, output: 1 });
    const steps1 = recorder.getSteps();
    const steps2 = recorder.getSteps();

    expect(steps1).not.toBe(steps2);
    expect(steps1).toEqual(steps2);
  });
});

describe('Calculation Utility Functions', () => {
  describe('calculateMonthlyFromArr', () => {
    it('should calculate monthly amount from ARR', () => {
      const result = calculateMonthlyFromArr(120000);

      expect(result.amount).toBe(10000);
      expect(result.formula).toBe('arr / 12');
      expect(result.inputs).toEqual({ arr: 120000, months: 12 });
    });

    it('should handle zero ARR', () => {
      const result = calculateMonthlyFromArr(0);
      expect(result.amount).toBe(0);
    });
  });

  describe('calculateQuarterlyFromArr', () => {
    it('should calculate quarterly amount from ARR', () => {
      const result = calculateQuarterlyFromArr(120000);

      expect(result.amount).toBe(30000);
      expect(result.formula).toBe('arr / 4');
      expect(result.inputs).toEqual({ arr: 120000, quarters: 4 });
    });
  });

  describe('calculateVariance', () => {
    it('should calculate positive variance (overbilling)', () => {
      const result = calculateVariance(10000, 12000);

      expect(result.variance).toBe(2000);
      expect(result.variancePct).toBe(20);
      expect(result.direction).toBe('over');
      expect(result.formula).toBe('actual - expected');
    });

    it('should calculate negative variance (underbilling)', () => {
      const result = calculateVariance(10000, 8000);

      expect(result.variance).toBe(-2000);
      expect(result.variancePct).toBe(-20);
      expect(result.direction).toBe('under');
    });

    it('should handle zero variance', () => {
      const result = calculateVariance(10000, 10000);

      expect(result.variance).toBe(0);
      expect(result.variancePct).toBe(0);
      expect(result.direction).toBe('none');
    });

    it('should handle zero expected (division by zero)', () => {
      const result = calculateVariance(0, 1000);

      expect(result.variance).toBe(1000);
      expect(result.variancePct).toBeNull();
      expect(result.direction).toBe('over');
    });
  });

  describe('calculateProratedAmount', () => {
    it('should calculate prorated amount for partial period', () => {
      const periodStart = new Date('2024-01-01');
      const periodEnd = new Date('2024-01-31');
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-31');

      const result = calculateProratedAmount(10000, startDate, endDate, periodStart, periodEnd);

      expect(result.daysInPeriod).toBe(17); // Jan 15-31
      expect(result.totalDays).toBe(31);
      expect(result.amount).toBeCloseTo(5483.87, 1);
    });

    it('should calculate full amount for full period', () => {
      const periodStart = new Date('2024-01-01');
      const periodEnd = new Date('2024-01-31');

      const result = calculateProratedAmount(10000, periodStart, periodEnd, periodStart, periodEnd);

      expect(result.daysInPeriod).toBe(31);
      expect(result.totalDays).toBe(31);
      expect(result.amount).toBe(10000);
    });

    it('should handle start date before period start', () => {
      const periodStart = new Date('2024-01-01');
      const periodEnd = new Date('2024-01-31');
      const startDate = new Date('2023-12-15'); // Before period
      const endDate = new Date('2024-01-31');

      const result = calculateProratedAmount(10000, startDate, endDate, periodStart, periodEnd);

      expect(result.daysInPeriod).toBe(31); // Full period
      expect(result.amount).toBe(10000);
    });
  });

  describe('calculateDiscountedAmount', () => {
    it('should calculate discounted amount with percentage', () => {
      const result = calculateDiscountedAmount(10000, 20);

      expect(result.amount).toBe(8000);
      expect(result.discountAmount).toBe(2000);
      expect(result.formula).toBe('originalAmount * (1 - discountPct/100)');
    });

    it('should handle zero discount', () => {
      const result = calculateDiscountedAmount(10000, 0);

      expect(result.amount).toBe(10000);
      expect(result.discountAmount).toBe(0);
    });

    it('should handle 100% discount', () => {
      const result = calculateDiscountedAmount(10000, 100);

      expect(result.amount).toBe(0);
      expect(result.discountAmount).toBe(10000);
    });
  });

  describe('calculateFxAmount', () => {
    it('should calculate FX converted amount', () => {
      const result = calculateFxAmount(10000, 0.92);

      expect(result.amount).toBe(9200);
      expect(result.formula).toBe('sourceAmount * exchangeRate');
      expect(result.inputs).toEqual({ sourceAmount: 10000, exchangeRate: 0.92 });
    });

    it('should handle rate of 1 (same currency)', () => {
      const result = calculateFxAmount(10000, 1.0);
      expect(result.amount).toBe(10000);
    });
  });
});

describe('Completeness Scoring', () => {
  describe('calculateCompletenessScore', () => {
    it('should calculate full score for complete evidence', () => {
      const input: CompletenessInput = {
        expectedSources: 3,
        actualSources: 3,
        contractReadinessScore: 95,
        hasCalculations: true,
        calculationsReproducible: true,
        hasClauses: true,
        expectedClauseCount: 2,
        actualClauseCount: 2,
      };

      const result = calculateCompletenessScore(input);

      expect(result.score).toBeGreaterThanOrEqual(0.9);
      expect(result.breakdown.source_coverage).toBe(1);
      expect(result.breakdown.contract_ready).toBe(0.95);
      expect(result.breakdown.calculation_reproducible).toBe(1);
      expect(result.breakdown.clause_linked).toBe(1);
    });

    it('should calculate partial score for missing sources', () => {
      const input: CompletenessInput = {
        expectedSources: 4,
        actualSources: 2,
        contractReadinessScore: 80,
        hasCalculations: true,
        calculationsReproducible: true,
        hasClauses: true,
        expectedClauseCount: 1,
        actualClauseCount: 1,
      };

      const result = calculateCompletenessScore(input);

      expect(result.breakdown.source_coverage).toBe(0.5);
      expect(result.score).toBeLessThan(0.9);
    });

    it('should handle missing contract (null readiness score)', () => {
      const input: CompletenessInput = {
        expectedSources: 2,
        actualSources: 2,
        contractReadinessScore: null,
        hasCalculations: true,
        calculationsReproducible: true,
        hasClauses: false,
        expectedClauseCount: 0,
        actualClauseCount: 0,
      };

      const result = calculateCompletenessScore(input);

      expect(result.breakdown.contract_ready).toBe(0.5); // Default for no contract
    });

    it('should handle no calculations needed', () => {
      const input: CompletenessInput = {
        expectedSources: 1,
        actualSources: 1,
        contractReadinessScore: 100,
        hasCalculations: false,
        calculationsReproducible: true,
        hasClauses: false,
        expectedClauseCount: 0,
        actualClauseCount: 0,
      };

      const result = calculateCompletenessScore(input);

      expect(result.breakdown.calculation_reproducible).toBe(1);
    });

    it('should penalize non-reproducible calculations', () => {
      const input: CompletenessInput = {
        expectedSources: 2,
        actualSources: 2,
        contractReadinessScore: 100,
        hasCalculations: true,
        calculationsReproducible: false,
        hasClauses: true,
        expectedClauseCount: 1,
        actualClauseCount: 1,
      };

      const result = calculateCompletenessScore(input);

      expect(result.breakdown.calculation_reproducible).toBe(0.5);
    });

    it('should handle zero expected sources', () => {
      const input: CompletenessInput = {
        expectedSources: 0,
        actualSources: 0,
        contractReadinessScore: 100,
        hasCalculations: false,
        calculationsReproducible: true,
        hasClauses: false,
        expectedClauseCount: 0,
        actualClauseCount: 0,
      };

      const result = calculateCompletenessScore(input);

      expect(result.breakdown.source_coverage).toBe(1); // No sources needed
    });

    it('should cap source coverage at 1', () => {
      const input: CompletenessInput = {
        expectedSources: 2,
        actualSources: 5, // More than expected
        contractReadinessScore: 100,
        hasCalculations: true,
        calculationsReproducible: true,
        hasClauses: true,
        expectedClauseCount: 1,
        actualClauseCount: 1,
      };

      const result = calculateCompletenessScore(input);

      expect(result.breakdown.source_coverage).toBe(1); // Capped at 1
    });

    it('should calculate weighted score correctly', () => {
      // Test that weights sum to 1 and are applied correctly
      const input: CompletenessInput = {
        expectedSources: 1,
        actualSources: 1,   // 1.0 * 0.30 = 0.30
        contractReadinessScore: 100, // 1.0 * 0.25 = 0.25
        hasCalculations: true,
        calculationsReproducible: true, // 1.0 * 0.25 = 0.25
        hasClauses: true,
        expectedClauseCount: 1,
        actualClauseCount: 1, // 1.0 * 0.20 = 0.20
      };

      const result = calculateCompletenessScore(input);

      expect(result.score).toBe(1); // All perfect = 1.0
    });
  });

  describe('getCompletenessLabel', () => {
    it('should return "complete" for score >= 0.9', () => {
      expect(getCompletenessLabel(0.9)).toBe('complete');
      expect(getCompletenessLabel(0.95)).toBe('complete');
      expect(getCompletenessLabel(1.0)).toBe('complete');
    });

    it('should return "partial" for score >= 0.7 and < 0.9', () => {
      expect(getCompletenessLabel(0.7)).toBe('partial');
      expect(getCompletenessLabel(0.8)).toBe('partial');
      expect(getCompletenessLabel(0.89)).toBe('partial');
    });

    it('should return "incomplete" for score < 0.7', () => {
      expect(getCompletenessLabel(0.0)).toBe('incomplete');
      expect(getCompletenessLabel(0.5)).toBe('incomplete');
      expect(getCompletenessLabel(0.69)).toBe('incomplete');
    });
  });
});

describe('Edge Cases', () => {
  describe('CalculationRecorder edge cases', () => {
    it('should handle very large numbers', () => {
      const recorder = createCalculationRecorder('R001', '1.0.0');
      const output = recorder.record({
        name: 'large_number',
        formula: 'x',
        inputs: { x: Number.MAX_SAFE_INTEGER },
        output: Number.MAX_SAFE_INTEGER,
      });

      expect(output).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle negative numbers', () => {
      const recorder = createCalculationRecorder('R001', '1.0.0');
      const output = recorder.recordVariance('negative', 1000, -500);

      expect(output).toBe(-1500);
    });

    it('should handle decimal precision', () => {
      const recorder = createCalculationRecorder('R001', '1.0.0');
      const output = recorder.record({
        name: 'decimal',
        formula: 'x',
        inputs: { x: 0.1 + 0.2 },
        output: 0.3,
      });

      expect(output).toBe(0.3);
    });
  });

  describe('Variance edge cases', () => {
    it('should handle very small differences', () => {
      const result = calculateVariance(10000, 10000.01);

      expect(result.variance).toBeCloseTo(0.01, 2);
      expect(result.direction).toBe('over');
    });

    it('should handle negative expected and actual', () => {
      const result = calculateVariance(-1000, -800);

      expect(result.variance).toBe(200);
      expect(result.direction).toBe('over');
    });
  });

  describe('Proration edge cases', () => {
    it('should handle single day period', () => {
      const date = new Date('2024-01-15');
      const result = calculateProratedAmount(10000, date, date, date, date);

      expect(result.daysInPeriod).toBe(1);
      expect(result.totalDays).toBe(1);
      expect(result.amount).toBe(10000);
    });

    it('should handle dates completely outside period', () => {
      const periodStart = new Date('2024-01-01');
      const periodEnd = new Date('2024-01-31');
      const startDate = new Date('2024-02-01');
      const endDate = new Date('2024-02-28');

      const result = calculateProratedAmount(10000, startDate, endDate, periodStart, periodEnd);

      expect(result.daysInPeriod).toBe(0);
      expect(result.amount).toBe(0);
    });
  });

  describe('Completeness edge cases', () => {
    it('should handle all zeros', () => {
      const input: CompletenessInput = {
        expectedSources: 0,
        actualSources: 0,
        contractReadinessScore: null,
        hasCalculations: false,
        calculationsReproducible: false,
        hasClauses: false,
        expectedClauseCount: 0,
        actualClauseCount: 0,
      };

      const result = calculateCompletenessScore(input);

      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('should handle extreme values', () => {
      const input: CompletenessInput = {
        expectedSources: 1000000,
        actualSources: 1,
        contractReadinessScore: 1,
        hasCalculations: true,
        calculationsReproducible: false,
        hasClauses: true,
        expectedClauseCount: 1000,
        actualClauseCount: 1,
      };

      const result = calculateCompletenessScore(input);

      expect(result.score).toBeLessThan(0.5);
      expect(result.breakdown.source_coverage).toBeCloseTo(0.000001, 6);
    });
  });
});
