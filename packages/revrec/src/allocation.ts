/**
 * Transaction Price Allocation
 * 
 * Allocates transaction prices to performance obligations.
 */
import type { 
  IdentifiedObligation, 
  AllocationResult,
  AllocationMethod,
} from './types.js';

// ============================================
// Main Functions
// ============================================

/**
 * Allocates transaction price to obligations.
 * 
 * Methods:
 * - SSP (Standalone Selling Price): Proportional allocation based on relative SSP
 * - Residual: Allocate known SSPs first, remainder to residual obligation
 * - Straight-line: Equal allocation when SSPs not available
 * - Custom: Override allocation from contract terms
 */
export function allocatePrices(
  obligations: IdentifiedObligation[],
  totalTransactionPrice: number
): AllocationResult[] {
  if (obligations.length === 0) {
    return [];
  }
  
  // Handle single obligation case
  if (obligations.length === 1) {
    return [{
      obligationIndex: 0,
      allocationPct: 100,
      allocatedAmount: obligations[0].transactionPrice || totalTransactionPrice,
      allocationBasis: 'single_obligation',
    }];
  }
  
  // Determine allocation method based on available SSP data
  const hasAllSSP = obligations.every(o => o.standaloneSellIingPrice !== null);
  const hasSomeSSP = obligations.some(o => o.standaloneSellIingPrice !== null);
  
  if (hasAllSSP) {
    return allocateBySSP(obligations, totalTransactionPrice);
  } else if (hasSomeSSP) {
    return allocateByResidual(obligations, totalTransactionPrice);
  } else {
    // Use obligation's own transaction prices or equal allocation
    return allocateByTransactionPrice(obligations, totalTransactionPrice);
  }
}

/**
 * Allocates using Standalone Selling Price (SSP) proportional method.
 */
function allocateBySSP(
  obligations: IdentifiedObligation[],
  totalTransactionPrice: number
): AllocationResult[] {
  const results: AllocationResult[] = [];
  
  // Calculate total SSP
  const totalSSP = obligations.reduce(
    (sum, o) => sum + (o.standaloneSellIingPrice ?? 0),
    0
  );
  
  if (totalSSP === 0) {
    // Fall back to equal allocation
    return allocateEqually(obligations, totalTransactionPrice);
  }
  
  // Allocate proportionally
  let allocatedTotal = 0;
  
  for (let i = 0; i < obligations.length; i++) {
    const obligation = obligations[i];
    const ssp = obligation.standaloneSellIingPrice ?? 0;
    const allocationPct = (ssp / totalSSP) * 100;
    
    // For last obligation, allocate remainder to avoid rounding issues
    const isLast = i === obligations.length - 1;
    const allocatedAmount = isLast
      ? round(totalTransactionPrice - allocatedTotal, 2)
      : round((ssp / totalSSP) * totalTransactionPrice, 2);
    
    allocatedTotal += allocatedAmount;
    
    results.push({
      obligationIndex: i,
      allocationPct: round(allocationPct, 4),
      allocatedAmount,
      allocationBasis: 'ssp_proportional',
    });
  }
  
  return results;
}

/**
 * Allocates using residual method (known SSPs first, remainder to residual).
 */
function allocateByResidual(
  obligations: IdentifiedObligation[],
  totalTransactionPrice: number
): AllocationResult[] {
  const results: AllocationResult[] = [];
  
  // First pass: allocate known SSPs
  let remainingPrice = totalTransactionPrice;
  const residualIndices: number[] = [];
  
  for (let i = 0; i < obligations.length; i++) {
    const obligation = obligations[i];
    
    if (obligation.standaloneSellIingPrice !== null) {
      const allocatedAmount = Math.min(obligation.standaloneSellIingPrice, remainingPrice);
      remainingPrice -= allocatedAmount;
      
      results.push({
        obligationIndex: i,
        allocationPct: round((allocatedAmount / totalTransactionPrice) * 100, 4),
        allocatedAmount: round(allocatedAmount, 2),
        allocationBasis: 'ssp_known',
      });
    } else {
      residualIndices.push(i);
    }
  }
  
  // Second pass: allocate remainder to residual obligations
  if (residualIndices.length > 0 && remainingPrice > 0) {
    const perResidual = remainingPrice / residualIndices.length;
    
    for (let i = 0; i < residualIndices.length; i++) {
      const isLast = i === residualIndices.length - 1;
      const allocatedAmount = isLast
        ? round(remainingPrice - (perResidual * i), 2)
        : round(perResidual, 2);
      
      results.push({
        obligationIndex: residualIndices[i],
        allocationPct: round((allocatedAmount / totalTransactionPrice) * 100, 4),
        allocatedAmount,
        allocationBasis: 'residual',
      });
    }
  } else if (residualIndices.length > 0) {
    // No remaining price, allocate 0 to residual
    for (const idx of residualIndices) {
      results.push({
        obligationIndex: idx,
        allocationPct: 0,
        allocatedAmount: 0,
        allocationBasis: 'residual_zero',
      });
    }
  }
  
  // Sort by obligation index
  return results.sort((a, b) => a.obligationIndex - b.obligationIndex);
}

/**
 * Allocates based on each obligation's transaction price.
 */
function allocateByTransactionPrice(
  obligations: IdentifiedObligation[],
  totalTransactionPrice: number
): AllocationResult[] {
  const results: AllocationResult[] = [];
  
  // Calculate total from obligations
  const totalFromObligations = obligations.reduce(
    (sum, o) => sum + o.transactionPrice,
    0
  );
  
  if (totalFromObligations === 0) {
    return allocateEqually(obligations, totalTransactionPrice);
  }
  
  // Use each obligation's proportion of total
  let allocatedTotal = 0;
  
  for (let i = 0; i < obligations.length; i++) {
    const obligation = obligations[i];
    const proportion = obligation.transactionPrice / totalFromObligations;
    
    const isLast = i === obligations.length - 1;
    const allocatedAmount = isLast
      ? round(totalTransactionPrice - allocatedTotal, 2)
      : round(proportion * totalTransactionPrice, 2);
    
    allocatedTotal += allocatedAmount;
    
    results.push({
      obligationIndex: i,
      allocationPct: round(proportion * 100, 4),
      allocatedAmount,
      allocationBasis: 'transaction_price_proportional',
    });
  }
  
  return results;
}

/**
 * Allocates equally among all obligations.
 */
function allocateEqually(
  obligations: IdentifiedObligation[],
  totalTransactionPrice: number
): AllocationResult[] {
  const results: AllocationResult[] = [];
  const count = obligations.length;
  const equalPct = 100 / count;
  const perObligation = totalTransactionPrice / count;
  
  let allocatedTotal = 0;
  
  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    const allocatedAmount = isLast
      ? round(totalTransactionPrice - allocatedTotal, 2)
      : round(perObligation, 2);
    
    allocatedTotal += allocatedAmount;
    
    results.push({
      obligationIndex: i,
      allocationPct: round(equalPct, 4),
      allocatedAmount,
      allocationBasis: 'equal_allocation',
    });
  }
  
  return results;
}

/**
 * Validates that allocations sum to total transaction price.
 */
export function validateAllocations(
  allocations: AllocationResult[],
  totalTransactionPrice: number,
  tolerance: number = 0.01
): boolean {
  const totalAllocated = allocations.reduce(
    (sum, a) => sum + a.allocatedAmount,
    0
  );
  
  return Math.abs(totalAllocated - totalTransactionPrice) <= tolerance;
}

// ============================================
// Utility Functions
// ============================================

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
