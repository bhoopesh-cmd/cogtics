/**
 * Simulation Engine
 * 
 * Main entry point for running simulations.
 * All functions are pure and deterministic.
 */

import type {
  SimulationContext,
  Override,
  SimulationOptions,
  SimulationResult,
  SimulationWarning,
} from './types.js';
import { validateOverrides, applyOverrides } from './overrides.js';
import { computeDeltas, aggregateSummary } from './deltas.js';

/**
 * Run a complete simulation.
 * 
 * This is a pure function that:
 * 1. Validates overrides against the baseline context
 * 2. Applies valid overrides to create a modified context
 * 3. Computes deltas between baseline and modified
 * 4. Aggregates results into a summary
 * 
 * The baseline context is never mutated.
 */
export function runSimulation(
  baselineContext: SimulationContext,
  overrides: Override[],
  options: SimulationOptions = {}
): SimulationResult {
  const warnings: SimulationWarning[] = [];

  // Step 1: Validate overrides
  const validation = validateOverrides(overrides, baselineContext);
  warnings.push(...validation.warnings);

  // Add warnings for invalid overrides
  for (const invalid of validation.invalid) {
    warnings.push({
      code: 'OVERRIDE_SKIPPED',
      message: `Override skipped: ${invalid.reason}`,
      overrideId: invalid.overrideId,
      severity: 'warning',
    });
  }

  // Step 2: Apply valid overrides
  const { context: modifiedContext, applied: appliedOverrides } = applyOverrides(
    baselineContext,
    validation.valid
  );

  // Step 3: Compute deltas
  const deltas = computeDeltas(baselineContext, modifiedContext, options);

  // Step 4: Aggregate summary
  const summary = aggregateSummary(deltas, appliedOverrides, validation.invalid);

  // Add info warnings for significant impacts
  if (Math.abs(summary.totalRevenueDelta) > 100000) {
    warnings.push({
      code: 'HIGH_IMPACT',
      message: `Simulation has high revenue impact: $${summary.totalRevenueDelta.toLocaleString()}`,
      severity: 'info',
    });
  }

  if (summary.contractsAffected > 10) {
    warnings.push({
      code: 'MANY_CONTRACTS',
      message: `Simulation affects ${summary.contractsAffected} contracts`,
      severity: 'info',
    });
  }

  return {
    modifiedContext,
    deltas,
    summary,
    appliedOverrides,
    skippedOverrides: validation.invalid,
    warnings,
  };
}

/**
 * Preview a simulation without full delta computation.
 * Useful for quick validation of overrides.
 */
export function previewSimulation(
  baselineContext: SimulationContext,
  overrides: Override[]
): {
  validOverrides: number;
  invalidOverrides: number;
  warnings: SimulationWarning[];
} {
  const validation = validateOverrides(overrides, baselineContext);

  return {
    validOverrides: validation.valid.length,
    invalidOverrides: validation.invalid.length,
    warnings: validation.warnings,
  };
}

/**
 * Validate that a context is well-formed.
 */
export function validateContext(context: SimulationContext): SimulationWarning[] {
  const warnings: SimulationWarning[] = [];

  // Check for contracts without customers
  const orphanContracts = context.contracts.filter(c => !c.customerId);
  if (orphanContracts.length > 0) {
    warnings.push({
      code: 'ORPHAN_CONTRACTS',
      message: `${orphanContracts.length} contracts have no customer assigned`,
      severity: 'warning',
    });
  }

  // Check for obligations without schedules
  const obligationIds = new Set(context.obligations.map(o => o.id));
  const scheduledObligationIds = new Set(context.schedules.map(s => s.obligationId));
  const unscheduledObligations = [...obligationIds].filter(id => !scheduledObligationIds.has(id));
  if (unscheduledObligations.length > 0) {
    warnings.push({
      code: 'UNSCHEDULED_OBLIGATIONS',
      message: `${unscheduledObligations.length} obligations have no recognition schedules`,
      severity: 'warning',
    });
  }

  // Check for zero-value contracts
  const zeroContracts = context.contracts.filter(c => c.arr === 0 || c.arr === null);
  if (zeroContracts.length > 0) {
    warnings.push({
      code: 'ZERO_VALUE_CONTRACTS',
      message: `${zeroContracts.length} contracts have zero or null ARR`,
      severity: 'info',
    });
  }

  // Check for contracts with invalid date ranges
  const invalidDateContracts = context.contracts.filter(c => {
    if (!c.startDate || !c.endDate) return false;
    return c.endDate < c.startDate;
  });
  if (invalidDateContracts.length > 0) {
    warnings.push({
      code: 'INVALID_DATE_RANGE',
      message: `${invalidDateContracts.length} contracts have end date before start date`,
      severity: 'error',
    });
  }

  return warnings;
}

/**
 * Compare two simulation results.
 */
export function compareSimulations(
  result1: SimulationResult,
  result2: SimulationResult
): {
  revenueDeltaDiff: number;
  contractsAffectedDiff: number;
  overridesDiff: number;
} {
  return {
    revenueDeltaDiff: result2.summary.totalRevenueDelta - result1.summary.totalRevenueDelta,
    contractsAffectedDiff: result2.summary.contractsAffected - result1.summary.contractsAffected,
    overridesDiff: result2.appliedOverrides.length - result1.appliedOverrides.length,
  };
}

/**
 * Extract the set of affected entity IDs from a simulation result.
 */
export function getAffectedEntities(result: SimulationResult): {
  contractIds: string[];
  obligationIds: string[];
  invoiceIds: string[];
} {
  const contractIds = new Set<string>();
  const obligationIds = new Set<string>();
  const invoiceIds = new Set<string>();

  for (const delta of result.deltas) {
    if (delta.targetType === 'contract' && delta.targetId) {
      contractIds.add(delta.targetId);
    }
    if (delta.targetType === 'obligation' && delta.targetId) {
      obligationIds.add(delta.targetId);
    }
    if (delta.targetType === 'invoice' && delta.targetId) {
      invoiceIds.add(delta.targetId);
    }
  }

  for (const applied of result.appliedOverrides) {
    if (applied.targetId.startsWith('ctr_')) {
      contractIds.add(applied.targetId);
    }
  }

  return {
    contractIds: [...contractIds],
    obligationIds: [...obligationIds],
    invoiceIds: [...invoiceIds],
  };
}
