/**
 * Delta Computation
 *
 * Pure functions for computing simulation deltas between baseline and modified contexts.
 */
import type { SimulationContext, DeltaRecord, SimulationSummary, SimulationOptions, AppliedOverride, SkippedOverride } from './types.js';
/**
 * Compute deltas between baseline and modified simulation contexts.
 */
export declare function computeDeltas(baseline: SimulationContext, modified: SimulationContext, options?: SimulationOptions): DeltaRecord[];
/**
 * Aggregate deltas into a summary.
 */
export declare function aggregateSummary(deltas: DeltaRecord[], appliedOverrides: AppliedOverride[], skippedOverrides: SkippedOverride[]): SimulationSummary;
/**
 * Score the impact of a simulation.
 * Returns a normalized score from 0-100.
 */
export declare function scoreSimulationImpact(summary: SimulationSummary): number;
//# sourceMappingURL=deltas.d.ts.map