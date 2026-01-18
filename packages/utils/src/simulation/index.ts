/**
 * Simulation Engine
 * 
 * Pure functions for running snapshot-based simulations.
 */

// Types
export * from './types.js';

// Override validation and application
export {
  validateOverrides,
  applyOverrides,
} from './overrides.js';

// Delta computation
export {
  computeDeltas,
  aggregateSummary,
  scoreSimulationImpact,
} from './deltas.js';

// Main engine
export {
  runSimulation,
  previewSimulation,
  validateContext,
  compareSimulations,
  getAffectedEntities,
} from './engine.js';
