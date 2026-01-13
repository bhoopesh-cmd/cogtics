/**
 * Revenue Recognition Engine
 * 
 * ASC 606-compliant revenue recognition calculations.
 */

// Types
export * from './types.js';

// Obligation identification
export { identifyObligations } from './obligations.js';

// Price allocation
export { allocatePrices, validateAllocations } from './allocation.js';

// Schedule generation
export { generateSchedule, generateStraightLineSchedule } from './schedules.js';

// Recognition events
export { 
  createRecognitionEvents,
  createUsageEvent,
  createAdjustmentEvent,
  createCancellationEvent,
  createAmendmentEvent,
  calculateCumulativeRecognized,
  applyEventsToSchedule,
} from './recognition.js';

// Deferred revenue
export { 
  computeDeferredBalances,
  computePeriodBalance,
  validateBalanceRollforward,
  getBalanceAsOf,
} from './deferred.js';

// Reconciliation
export { 
  reconcileSchedulesWithInvoices,
  DEFAULT_RECONCILIATION_CONFIG,
  type ReconciliationConfig,
} from './reconciliation.js';

// ============================================
// Convenience: Full RevRec Pipeline
// ============================================

import type { 
  ContractInput, 
  InvoiceInput,
  RevRecOutput,
  ReconciliationOutput,
  SchedulePeriod,
  RecognitionEvent,
  DeferredBalance,
} from './types.js';
import { identifyObligations } from './obligations.js';
import { allocatePrices } from './allocation.js';
import { generateSchedule } from './schedules.js';
import { createRecognitionEvents } from './recognition.js';
import { computeDeferredBalances } from './deferred.js';
import { reconcileSchedulesWithInvoices, type ReconciliationConfig } from './reconciliation.js';

/**
 * Runs the full rev-rec calculation pipeline for a contract.
 */
export function computeRevRec(
  contract: ContractInput,
  asOfDate?: Date
): RevRecOutput {
  // 1. Identify obligations
  const obligations = identifyObligations(contract);
  
  if (obligations.length === 0) {
    return {
      obligations: [],
      allocations: [],
      schedules: [],
      events: [],
      balances: [],
    };
  }
  
  // 2. Allocate transaction prices
  const totalPrice = contract.arr ?? obligations.reduce((sum, o) => sum + o.transactionPrice, 0);
  const allocations = allocatePrices(obligations, totalPrice);
  
  // 3. Generate schedules for each obligation
  const schedules: SchedulePeriod[][] = [];
  for (let i = 0; i < obligations.length; i++) {
    const obligation = obligations[i];
    const allocation = allocations.find(a => a.obligationIndex === i);
    if (allocation) {
      schedules.push(generateSchedule(obligation, allocation, 'monthly'));
    } else {
      schedules.push([]);
    }
  }
  
  // 4. Create recognition events for each obligation
  const events: RecognitionEvent[][] = [];
  for (const obligationSchedules of schedules) {
    events.push(createRecognitionEvents(obligationSchedules, asOfDate));
  }
  
  // 5. Compute deferred balances for each obligation
  const balances: DeferredBalance[][] = [];
  for (let i = 0; i < obligations.length; i++) {
    const allocation = allocations.find(a => a.obligationIndex === i);
    if (allocation && schedules[i].length > 0) {
      balances.push(
        computeDeferredBalances(schedules[i], events[i], allocation.allocatedAmount)
      );
    } else {
      balances.push([]);
    }
  }
  
  return {
    obligations,
    allocations,
    schedules,
    events,
    balances,
  };
}

/**
 * Runs reconciliation for a contract's schedules against invoices.
 */
export function reconcileContract(
  contractId: string,
  schedules: import('./types.js').SchedulePeriod[],
  invoices: InvoiceInput[],
  config?: ReconciliationConfig
): ReconciliationOutput {
  return reconcileSchedulesWithInvoices(schedules, invoices, contractId, config);
}
