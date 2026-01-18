/**
 * Calculation Recording Module (Phase 8)
 * 
 * Provides utilities for rules to record calculation steps
 * that can be stored in evidence packs for reproducibility.
 */

import type { CalculationStep } from '@cogtics/schemas';

/**
 * Calculation type for categorizing calculation steps
 */
export type CalcType = 
  | 'expected_amount'
  | 'actual_amount'
  | 'variance'
  | 'proration'
  | 'discount'
  | 'fx_conversion'
  | 'revenue_allocation'
  | 'custom';

/**
 * Input for recording a calculation step
 */
export interface RecordCalculationInput {
  name: string;
  formula: string;
  inputs: Record<string, number>;
  output: number;
  calcType?: CalcType;
  notes?: string;
}

/**
 * Calculation recorder that accumulates calculation steps
 * during rule execution for evidence generation.
 */
export class CalculationRecorder {
  private steps: CalculationStep[] = [];
  private ruleId: string;
  private ruleVersion: string;

  constructor(ruleId: string, ruleVersion: string) {
    this.ruleId = ruleId;
    this.ruleVersion = ruleVersion;
  }

  /**
   * Record a calculation step
   */
  record(input: RecordCalculationInput): number {
    const step: CalculationStep = {
      name: input.name,
      formula: input.formula,
      inputs: input.inputs,
      output: input.output,
      ruleId: this.ruleId,
      ruleVersion: this.ruleVersion,
    };
    this.steps.push(step);
    return input.output;
  }

  /**
   * Record an expected amount calculation
   */
  recordExpected(
    name: string,
    formula: string,
    inputs: Record<string, number>,
    output: number
  ): number {
    return this.record({ name, formula, inputs, output, calcType: 'expected_amount' });
  }

  /**
   * Record an actual amount calculation
   */
  recordActual(
    name: string,
    formula: string,
    inputs: Record<string, number>,
    output: number
  ): number {
    return this.record({ name, formula, inputs, output, calcType: 'actual_amount' });
  }

  /**
   * Record a variance calculation
   */
  recordVariance(
    name: string,
    expected: number,
    actual: number
  ): number {
    const variance = actual - expected;
    return this.record({
      name,
      formula: 'actual - expected',
      inputs: { expected, actual },
      output: variance,
      calcType: 'variance',
    });
  }

  /**
   * Record a proration calculation
   */
  recordProration(
    name: string,
    fullAmount: number,
    daysInPeriod: number,
    totalDays: number
  ): number {
    const proratedAmount = (fullAmount / totalDays) * daysInPeriod;
    return this.record({
      name,
      formula: '(fullAmount / totalDays) * daysInPeriod',
      inputs: { fullAmount, daysInPeriod, totalDays },
      output: proratedAmount,
      calcType: 'proration',
    });
  }

  /**
   * Record a discount calculation
   */
  recordDiscount(
    name: string,
    originalAmount: number,
    discountRate: number
  ): number {
    const discountedAmount = originalAmount * (1 - discountRate);
    return this.record({
      name,
      formula: 'originalAmount * (1 - discountRate)',
      inputs: { originalAmount, discountRate },
      output: discountedAmount,
      calcType: 'discount',
    });
  }

  /**
   * Record an FX conversion calculation
   */
  recordFxConversion(
    name: string,
    sourceAmount: number,
    exchangeRate: number,
    sourceCurrency: string,
    targetCurrency: string
  ): number {
    const convertedAmount = sourceAmount * exchangeRate;
    return this.record({
      name: `${name} (${sourceCurrency} -> ${targetCurrency})`,
      formula: 'sourceAmount * exchangeRate',
      inputs: { sourceAmount, exchangeRate },
      output: convertedAmount,
      calcType: 'fx_conversion',
    });
  }

  /**
   * Get all recorded calculation steps
   */
  getSteps(): CalculationStep[] {
    return [...this.steps];
  }

  /**
   * Clear all recorded steps
   */
  clear(): void {
    this.steps = [];
  }

  /**
   * Get the number of recorded steps
   */
  get count(): number {
    return this.steps.length;
  }
}

/**
 * Create a calculation recorder for a specific rule
 */
export function createCalculationRecorder(
  ruleId: string,
  ruleVersion: string
): CalculationRecorder {
  return new CalculationRecorder(ruleId, ruleVersion);
}

/**
 * Calculate expected monthly amount from ARR
 */
export function calculateMonthlyFromArr(arr: number): { amount: number; formula: string; inputs: Record<string, number> } {
  return {
    amount: arr / 12,
    formula: 'arr / 12',
    inputs: { arr, months: 12 },
  };
}

/**
 * Calculate expected quarterly amount from ARR
 */
export function calculateQuarterlyFromArr(arr: number): { amount: number; formula: string; inputs: Record<string, number> } {
  return {
    amount: arr / 4,
    formula: 'arr / 4',
    inputs: { arr, quarters: 4 },
  };
}

/**
 * Calculate variance between expected and actual
 */
export function calculateVariance(
  expected: number,
  actual: number
): { 
  variance: number; 
  variancePct: number | null; 
  direction: 'over' | 'under' | 'none';
  formula: string;
  inputs: Record<string, number>;
} {
  const variance = actual - expected;
  const variancePct = expected !== 0 ? ((actual - expected) / expected) * 100 : null;
  const direction = variance > 0 ? 'over' : variance < 0 ? 'under' : 'none';
  
  return {
    variance,
    variancePct,
    direction,
    formula: 'actual - expected',
    inputs: { expected, actual },
  };
}

/**
 * Calculate prorated amount for partial period
 */
export function calculateProratedAmount(
  fullAmount: number,
  startDate: Date,
  endDate: Date,
  periodStart: Date,
  periodEnd: Date
): { 
  amount: number; 
  daysInPeriod: number; 
  totalDays: number;
  formula: string;
  inputs: Record<string, number>;
} {
  const msPerDay = 24 * 60 * 60 * 1000;
  
  // Calculate actual days in period
  const actualStart = startDate > periodStart ? startDate : periodStart;
  const actualEnd = endDate < periodEnd ? endDate : periodEnd;
  const daysInPeriod = Math.max(0, Math.ceil((actualEnd.getTime() - actualStart.getTime()) / msPerDay) + 1);
  
  // Calculate total period days
  const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / msPerDay) + 1;
  
  const amount = totalDays > 0 ? (fullAmount / totalDays) * daysInPeriod : 0;
  
  return {
    amount,
    daysInPeriod,
    totalDays,
    formula: '(fullAmount / totalDays) * daysInPeriod',
    inputs: { fullAmount, daysInPeriod, totalDays },
  };
}

/**
 * Calculate amount with discount applied
 */
export function calculateDiscountedAmount(
  originalAmount: number,
  discountPct: number
): {
  amount: number;
  discountAmount: number;
  formula: string;
  inputs: Record<string, number>;
} {
  const discountRate = discountPct / 100;
  const discountAmount = originalAmount * discountRate;
  const amount = originalAmount - discountAmount;
  
  return {
    amount,
    discountAmount,
    formula: 'originalAmount * (1 - discountPct/100)',
    inputs: { originalAmount, discountPct },
  };
}

/**
 * Calculate FX converted amount
 */
export function calculateFxAmount(
  sourceAmount: number,
  rate: number
): {
  amount: number;
  formula: string;
  inputs: Record<string, number>;
} {
  return {
    amount: sourceAmount * rate,
    formula: 'sourceAmount * exchangeRate',
    inputs: { sourceAmount, exchangeRate: rate },
  };
}

/**
 * Completeness scoring utilities
 */
export interface CompletenessBreakdown {
  source_coverage: number;
  contract_ready: number;
  calculation_reproducible: number;
  clause_linked: number;
}

export interface CompletenessInput {
  expectedSources: number;
  actualSources: number;
  contractReadinessScore: number | null;
  hasCalculations: boolean;
  calculationsReproducible: boolean;
  hasClauses: boolean;
  expectedClauseCount: number;
  actualClauseCount: number;
}

/**
 * Calculate evidence completeness score
 */
export function calculateCompletenessScore(input: CompletenessInput): {
  score: number;
  breakdown: CompletenessBreakdown;
} {
  const weights = {
    source_coverage: 0.30,
    contract_ready: 0.25,
    calculation_reproducible: 0.25,
    clause_linked: 0.20,
  };

  // Source coverage: percentage of expected sources present
  const sourceCoverage = input.expectedSources > 0
    ? Math.min(1, input.actualSources / input.expectedSources)
    : 1;

  // Contract readiness: use provided score or default
  const contractReady = input.contractReadinessScore !== null
    ? input.contractReadinessScore / 100 // Assuming 0-100 scale
    : 0.5; // Default if no contract

  // Calculation reproducibility
  let calcReproducible = 0;
  if (!input.hasCalculations) {
    calcReproducible = 1; // No calculations needed
  } else {
    calcReproducible = input.calculationsReproducible ? 1 : 0.5;
  }

  // Clause linking
  let clauseLinked = 0;
  if (!input.hasClauses) {
    clauseLinked = 0.5; // Partial score if no clauses expected
  } else if (input.expectedClauseCount > 0) {
    clauseLinked = Math.min(1, input.actualClauseCount / input.expectedClauseCount);
  } else {
    clauseLinked = 1;
  }

  const breakdown: CompletenessBreakdown = {
    source_coverage: sourceCoverage,
    contract_ready: contractReady,
    calculation_reproducible: calcReproducible,
    clause_linked: clauseLinked,
  };

  const score = Object.entries(weights).reduce((total, [key, weight]) => {
    return total + (breakdown[key as keyof CompletenessBreakdown] * weight);
  }, 0);

  return { score: Math.round(score * 10000) / 10000, breakdown };
}

/**
 * Get completeness label based on score
 */
export function getCompletenessLabel(score: number): 'complete' | 'partial' | 'incomplete' {
  if (score >= 0.9) return 'complete';
  if (score >= 0.7) return 'partial';
  return 'incomplete';
}
