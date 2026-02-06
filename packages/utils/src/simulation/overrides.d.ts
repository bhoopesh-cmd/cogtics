/**
 * Override Validation and Application
 *
 * Pure functions for validating and applying simulation overrides.
 */
import type { Override, SimulationContext, ValidationResult, AppliedOverride } from './types.js';
/**
 * Validate overrides against a simulation context.
 * Returns valid overrides sorted by sequence, invalid overrides with reasons, and warnings.
 */
export declare function validateOverrides(overrides: Override[], context: SimulationContext): ValidationResult;
/**
 * Apply validated overrides to a simulation context.
 * Returns a new context with modifications applied (original is not mutated).
 */
export declare function applyOverrides(context: SimulationContext, overrides: Override[]): {
    context: SimulationContext;
    applied: AppliedOverride[];
};
//# sourceMappingURL=overrides.d.ts.map