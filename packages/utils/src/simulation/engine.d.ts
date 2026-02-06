/**
 * Simulation Engine
 *
 * Main entry point for running simulations.
 * All functions are pure and deterministic.
 */
import type { SimulationContext, Override, SimulationOptions, SimulationResult, SimulationWarning } from './types.js';
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
export declare function runSimulation(baselineContext: SimulationContext, overrides: Override[], options?: SimulationOptions): SimulationResult;
/**
 * Preview a simulation without full delta computation.
 * Useful for quick validation of overrides.
 */
export declare function previewSimulation(baselineContext: SimulationContext, overrides: Override[]): {
    validOverrides: number;
    invalidOverrides: number;
    warnings: SimulationWarning[];
};
/**
 * Validate that a context is well-formed.
 */
export declare function validateContext(context: SimulationContext): SimulationWarning[];
/**
 * Compare two simulation results.
 */
export declare function compareSimulations(result1: SimulationResult, result2: SimulationResult): {
    revenueDeltaDiff: number;
    contractsAffectedDiff: number;
    overridesDiff: number;
};
/**
 * Extract the set of affected entity IDs from a simulation result.
 */
export declare function getAffectedEntities(result: SimulationResult): {
    contractIds: string[];
    obligationIds: string[];
    invoiceIds: string[];
};
//# sourceMappingURL=engine.d.ts.map