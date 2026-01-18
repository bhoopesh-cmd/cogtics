/**
 * Delta Computation
 * 
 * Pure functions for computing simulation deltas between baseline and modified contexts.
 */

import type {
  SimulationContext,
  DeltaRecord,
  PeriodImpact,
  SimulationSummary,
  SimulationOptions,
  AppliedOverride,
  SkippedOverride,
} from './types.js';

/**
 * Compute deltas between baseline and modified simulation contexts.
 */
export function computeDeltas(
  baseline: SimulationContext,
  modified: SimulationContext,
  options: SimulationOptions = {}
): DeltaRecord[] {
  const deltas: DeltaRecord[] = [];
  const materialityThreshold = options.materialityThreshold ?? 0.01;

  // Compute contract-level deltas
  const contractDeltas = computeContractDeltas(baseline, modified, materialityThreshold);
  deltas.push(...contractDeltas);

  // Compute obligation-level deltas
  const obligationDeltas = computeObligationDeltas(baseline, modified, materialityThreshold);
  deltas.push(...obligationDeltas);

  // Compute revenue period deltas from schedules
  const periodDeltas = computePeriodDeltas(baseline, modified, materialityThreshold);
  deltas.push(...periodDeltas);

  // Compute total revenue delta
  const totalDelta = computeTotalRevenueDelta(baseline, modified);
  if (Math.abs(totalDelta.deltaAmount) >= materialityThreshold) {
    deltas.push(totalDelta);
  }

  return deltas;
}

/**
 * Compute contract-level impact deltas.
 */
function computeContractDeltas(
  baseline: SimulationContext,
  modified: SimulationContext,
  materialityThreshold: number
): DeltaRecord[] {
  const deltas: DeltaRecord[] = [];

  for (const modContract of modified.contracts) {
    const baseContract = baseline.contracts.find(c => c.id === modContract.id);
    if (!baseContract) continue;

    const baselineArr = baseContract.arr ?? 0;
    const modifiedArr = modContract.arr ?? 0;
    const deltaAmount = modifiedArr - baselineArr;

    if (Math.abs(deltaAmount) >= materialityThreshold) {
      deltas.push({
        deltaType: 'contract_impact',
        targetType: 'contract',
        targetId: modContract.id,
        baselineAmount: baselineArr,
        simulatedAmount: modifiedArr,
        deltaAmount,
        deltaPct: baselineArr !== 0 ? (deltaAmount / baselineArr) * 100 : undefined,
        currency: modContract.currency,
        details: {
          contractName: modContract.name,
          customerId: modContract.customerId,
        },
      });
    }
  }

  return deltas;
}

/**
 * Compute obligation-level impact deltas.
 */
function computeObligationDeltas(
  baseline: SimulationContext,
  modified: SimulationContext,
  materialityThreshold: number
): DeltaRecord[] {
  const deltas: DeltaRecord[] = [];

  for (const modObl of modified.obligations) {
    const baseObl = baseline.obligations.find(o => o.id === modObl.id);
    if (!baseObl) continue;

    const baselinePrice = baseObl.transactionPrice;
    const modifiedPrice = modObl.transactionPrice;
    const deltaAmount = modifiedPrice - baselinePrice;

    if (Math.abs(deltaAmount) >= materialityThreshold) {
      deltas.push({
        deltaType: 'obligation_impact',
        targetType: 'obligation',
        targetId: modObl.id,
        baselineAmount: baselinePrice,
        simulatedAmount: modifiedPrice,
        deltaAmount,
        deltaPct: baselinePrice !== 0 ? (deltaAmount / baselinePrice) * 100 : undefined,
        currency: 'USD', // Would need currency from related contract
        details: {
          contractId: modObl.contractId,
          obligationType: modObl.obligationType,
        },
      });
    }
  }

  return deltas;
}

/**
 * Compute period-by-period revenue deltas from schedule changes.
 */
function computePeriodDeltas(
  baseline: SimulationContext,
  modified: SimulationContext,
  materialityThreshold: number
): DeltaRecord[] {
  const deltas: DeltaRecord[] = [];

  // Group schedules by period
  const baselinePeriods = groupSchedulesByPeriod(baseline.schedules);
  const modifiedPeriods = groupSchedulesByPeriod(modified.schedules);

  // Get all unique period keys
  const allPeriodKeys = new Set([
    ...Object.keys(baselinePeriods),
    ...Object.keys(modifiedPeriods),
  ]);

  for (const periodKey of allPeriodKeys) {
    const baseData = baselinePeriods[periodKey] || { scheduled: 0, recognized: 0, deferred: 0 };
    const modData = modifiedPeriods[periodKey] || { scheduled: 0, recognized: 0, deferred: 0 };

    const [startStr, endStr] = periodKey.split('_');
    const periodStart = new Date(startStr);
    const periodEnd = new Date(endStr);

    // Scheduled amount delta
    const scheduledDelta = modData.scheduled - baseData.scheduled;
    if (Math.abs(scheduledDelta) >= materialityThreshold) {
      deltas.push({
        deltaType: 'revenue_period',
        periodStart,
        periodEnd,
        baselineAmount: baseData.scheduled,
        simulatedAmount: modData.scheduled,
        deltaAmount: scheduledDelta,
        deltaPct: baseData.scheduled !== 0 ? (scheduledDelta / baseData.scheduled) * 100 : undefined,
        currency: 'USD',
      });
    }

    // Recognized shift
    const recognizedDelta = modData.recognized - baseData.recognized;
    if (Math.abs(recognizedDelta) >= materialityThreshold) {
      deltas.push({
        deltaType: 'recognized_shift',
        periodStart,
        periodEnd,
        baselineAmount: baseData.recognized,
        simulatedAmount: modData.recognized,
        deltaAmount: recognizedDelta,
        deltaPct: baseData.recognized !== 0 ? (recognizedDelta / baseData.recognized) * 100 : undefined,
        currency: 'USD',
      });
    }

    // Deferred shift
    const deferredDelta = modData.deferred - baseData.deferred;
    if (Math.abs(deferredDelta) >= materialityThreshold) {
      deltas.push({
        deltaType: 'deferred_shift',
        periodStart,
        periodEnd,
        baselineAmount: baseData.deferred,
        simulatedAmount: modData.deferred,
        deltaAmount: deferredDelta,
        deltaPct: baseData.deferred !== 0 ? (deferredDelta / baseData.deferred) * 100 : undefined,
        currency: 'USD',
      });
    }
  }

  return deltas;
}

interface PeriodData {
  scheduled: number;
  recognized: number;
  deferred: number;
}

function groupSchedulesByPeriod(
  schedules: SimulationContext['schedules']
): Record<string, PeriodData> {
  const periods: Record<string, PeriodData> = {};

  for (const schedule of schedules) {
    const key = `${schedule.periodStart.toISOString().split('T')[0]}_${schedule.periodEnd.toISOString().split('T')[0]}`;
    
    if (!periods[key]) {
      periods[key] = { scheduled: 0, recognized: 0, deferred: 0 };
    }

    periods[key].scheduled += schedule.scheduledAmount;
    periods[key].recognized += schedule.recognizedAmount;
    periods[key].deferred += schedule.deferredAmount;
  }

  return periods;
}

/**
 * Compute total revenue delta.
 */
function computeTotalRevenueDelta(
  baseline: SimulationContext,
  modified: SimulationContext
): DeltaRecord {
  const baselineTotal = baseline.contracts.reduce((sum, c) => sum + (c.arr ?? 0), 0);
  const modifiedTotal = modified.contracts.reduce((sum, c) => sum + (c.arr ?? 0), 0);
  const deltaAmount = modifiedTotal - baselineTotal;

  return {
    deltaType: 'revenue_total',
    baselineAmount: baselineTotal,
    simulatedAmount: modifiedTotal,
    deltaAmount,
    deltaPct: baselineTotal !== 0 ? (deltaAmount / baselineTotal) * 100 : undefined,
    currency: 'USD',
  };
}

/**
 * Aggregate deltas into a summary.
 */
export function aggregateSummary(
  deltas: DeltaRecord[],
  appliedOverrides: AppliedOverride[],
  skippedOverrides: SkippedOverride[]
): SimulationSummary {
  // Get total revenue delta
  const totalRevenueDelta = deltas.find(d => d.deltaType === 'revenue_total');
  
  // Sum recognized and deferred shifts
  const recognizedDeltas = deltas.filter(d => d.deltaType === 'recognized_shift');
  const deferredDeltas = deltas.filter(d => d.deltaType === 'deferred_shift');
  
  const totalRecognizedDelta = recognizedDeltas.reduce((sum, d) => sum + d.deltaAmount, 0);
  const totalDeferredDelta = deferredDeltas.reduce((sum, d) => sum + d.deltaAmount, 0);

  // Count affected entities
  const contractDeltas = deltas.filter(d => d.deltaType === 'contract_impact');
  const obligationDeltas = deltas.filter(d => d.deltaType === 'obligation_impact');

  // Aggregate period impacts
  const periodDeltas = deltas.filter(d => d.deltaType === 'revenue_period');
  const periodMap = new Map<string, PeriodImpact>();

  for (const delta of periodDeltas) {
    if (!delta.periodStart || !delta.periodEnd) continue;
    
    const key = `${delta.periodStart.toISOString()}_${delta.periodEnd.toISOString()}`;
    const existing = periodMap.get(key);
    
    if (existing) {
      existing.revenueDelta += delta.deltaAmount;
    } else {
      periodMap.set(key, {
        periodStart: delta.periodStart,
        periodEnd: delta.periodEnd,
        revenueDelta: delta.deltaAmount,
        recognizedDelta: 0,
        deferredDelta: 0,
      });
    }
  }

  // Add recognized deltas to period impacts
  for (const delta of recognizedDeltas) {
    if (!delta.periodStart || !delta.periodEnd) continue;
    
    const key = `${delta.periodStart.toISOString()}_${delta.periodEnd.toISOString()}`;
    const existing = periodMap.get(key);
    
    if (existing) {
      existing.recognizedDelta += delta.deltaAmount;
    } else {
      periodMap.set(key, {
        periodStart: delta.periodStart,
        periodEnd: delta.periodEnd,
        revenueDelta: 0,
        recognizedDelta: delta.deltaAmount,
        deferredDelta: 0,
      });
    }
  }

  // Add deferred deltas to period impacts
  for (const delta of deferredDeltas) {
    if (!delta.periodStart || !delta.periodEnd) continue;
    
    const key = `${delta.periodStart.toISOString()}_${delta.periodEnd.toISOString()}`;
    const existing = periodMap.get(key);
    
    if (existing) {
      existing.deferredDelta += delta.deltaAmount;
    } else {
      periodMap.set(key, {
        periodStart: delta.periodStart,
        periodEnd: delta.periodEnd,
        revenueDelta: 0,
        recognizedDelta: 0,
        deferredDelta: delta.deltaAmount,
      });
    }
  }

  // Sort period impacts by start date
  const periodImpacts = Array.from(periodMap.values()).sort(
    (a, b) => a.periodStart.getTime() - b.periodStart.getTime()
  );

  return {
    totalRevenueDelta: totalRevenueDelta?.deltaAmount ?? 0,
    totalRecognizedDelta,
    totalDeferredDelta,
    contractsAffected: contractDeltas.length,
    obligationsAffected: obligationDeltas.length,
    overridesApplied: appliedOverrides.length,
    overridesSkipped: skippedOverrides.length,
    periodImpacts,
  };
}

/**
 * Score the impact of a simulation.
 * Returns a normalized score from 0-100.
 */
export function scoreSimulationImpact(summary: SimulationSummary): number {
  // Base score on absolute revenue delta magnitude
  const absRevenueDelta = Math.abs(summary.totalRevenueDelta);
  
  // Scale: $0 = 0, $100K = 50, $1M+ = 100
  let score = Math.min(100, (absRevenueDelta / 1_000_000) * 100);
  
  // Boost for number of contracts affected
  score += Math.min(20, summary.contractsAffected * 2);
  
  // Boost for timing shifts (recognized/deferred changes)
  if (summary.totalRecognizedDelta !== 0 || summary.totalDeferredDelta !== 0) {
    score += 10;
  }

  return Math.min(100, Math.round(score));
}
