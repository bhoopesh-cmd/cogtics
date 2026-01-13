/**
 * Price Allocation Tests
 */
import { describe, it, expect } from 'vitest';
import { allocatePrices, validateAllocations } from '../allocation.js';
import type { IdentifiedObligation } from '../types.js';

describe('allocatePrices', () => {
  it('should allocate 100% to single obligation', () => {
    const obligations: IdentifiedObligation[] = [
      {
        obligationType: 'subscription',
        description: 'Subscription',
        transactionPrice: 120000,
        standaloneSellIingPrice: null,
        serviceStartDate: new Date('2024-01-01'),
        serviceEndDate: new Date('2024-12-31'),
        sourceTermIds: [],
        allocationMethod: 'straight_line',
        recognitionMethod: 'straight_line',
      },
    ];

    const allocations = allocatePrices(obligations, 120000);

    expect(allocations).toHaveLength(1);
    expect(allocations[0].allocationPct).toBe(100);
    expect(allocations[0].allocatedAmount).toBe(120000);
    expect(allocations[0].allocationBasis).toBe('single_obligation');
  });

  it('should allocate proportionally by SSP when all obligations have SSP', () => {
    const obligations: IdentifiedObligation[] = [
      {
        obligationType: 'subscription',
        description: 'Subscription',
        transactionPrice: 80000,
        standaloneSellIingPrice: 80000,
        serviceStartDate: new Date('2024-01-01'),
        serviceEndDate: new Date('2024-12-31'),
        sourceTermIds: [],
        allocationMethod: 'ssp',
        recognitionMethod: 'straight_line',
      },
      {
        obligationType: 'support',
        description: 'Support',
        transactionPrice: 20000,
        standaloneSellIingPrice: 20000,
        serviceStartDate: new Date('2024-01-01'),
        serviceEndDate: new Date('2024-12-31'),
        sourceTermIds: [],
        allocationMethod: 'ssp',
        recognitionMethod: 'straight_line',
      },
    ];

    const allocations = allocatePrices(obligations, 100000);

    expect(allocations).toHaveLength(2);
    expect(allocations[0].allocationPct).toBe(80);
    expect(allocations[0].allocatedAmount).toBe(80000);
    expect(allocations[1].allocationPct).toBe(20);
    expect(allocations[1].allocatedAmount).toBe(20000);
    expect(allocations[0].allocationBasis).toBe('ssp_proportional');
  });

  it('should use residual allocation when only some obligations have SSP', () => {
    const obligations: IdentifiedObligation[] = [
      {
        obligationType: 'subscription',
        description: 'Subscription',
        transactionPrice: 70000,
        standaloneSellIingPrice: 70000,
        serviceStartDate: new Date('2024-01-01'),
        serviceEndDate: new Date('2024-12-31'),
        sourceTermIds: [],
        allocationMethod: 'residual',
        recognitionMethod: 'straight_line',
      },
      {
        obligationType: 'professional_services',
        description: 'Implementation',
        transactionPrice: 30000,
        standaloneSellIingPrice: null,  // No SSP
        serviceStartDate: new Date('2024-01-01'),
        serviceEndDate: new Date('2024-03-31'),
        sourceTermIds: [],
        allocationMethod: 'residual',
        recognitionMethod: 'milestone',
      },
    ];

    const allocations = allocatePrices(obligations, 100000);

    expect(allocations).toHaveLength(2);
    
    const subAlloc = allocations.find(a => a.allocationBasis === 'ssp_known');
    const residualAlloc = allocations.find(a => a.allocationBasis === 'residual');
    
    expect(subAlloc?.allocatedAmount).toBe(70000);
    expect(residualAlloc?.allocatedAmount).toBe(30000);
  });

  it('should allocate by transaction price when no SSP available', () => {
    const obligations: IdentifiedObligation[] = [
      {
        obligationType: 'subscription',
        description: 'Subscription',
        transactionPrice: 60000,
        standaloneSellIingPrice: null,
        serviceStartDate: new Date('2024-01-01'),
        serviceEndDate: new Date('2024-12-31'),
        sourceTermIds: [],
        allocationMethod: 'straight_line',
        recognitionMethod: 'straight_line',
      },
      {
        obligationType: 'support',
        description: 'Support',
        transactionPrice: 40000,
        standaloneSellIingPrice: null,
        serviceStartDate: new Date('2024-01-01'),
        serviceEndDate: new Date('2024-12-31'),
        sourceTermIds: [],
        allocationMethod: 'straight_line',
        recognitionMethod: 'straight_line',
      },
    ];

    const allocations = allocatePrices(obligations, 100000);

    expect(allocations).toHaveLength(2);
    expect(allocations[0].allocationPct).toBe(60);
    expect(allocations[0].allocatedAmount).toBe(60000);
    expect(allocations[1].allocationPct).toBe(40);
    expect(allocations[1].allocatedAmount).toBe(40000);
    expect(allocations[0].allocationBasis).toBe('transaction_price_proportional');
  });

  it('should handle empty obligations array', () => {
    const allocations = allocatePrices([], 100000);
    expect(allocations).toHaveLength(0);
  });

  it('should sum to total transaction price', () => {
    const obligations: IdentifiedObligation[] = [
      {
        obligationType: 'subscription',
        description: 'Sub',
        transactionPrice: 33333,
        standaloneSellIingPrice: null,
        serviceStartDate: new Date('2024-01-01'),
        serviceEndDate: new Date('2024-12-31'),
        sourceTermIds: [],
        allocationMethod: 'straight_line',
        recognitionMethod: 'straight_line',
      },
      {
        obligationType: 'support',
        description: 'Support',
        transactionPrice: 33333,
        standaloneSellIingPrice: null,
        serviceStartDate: new Date('2024-01-01'),
        serviceEndDate: new Date('2024-12-31'),
        sourceTermIds: [],
        allocationMethod: 'straight_line',
        recognitionMethod: 'straight_line',
      },
      {
        obligationType: 'one_time',
        description: 'Setup',
        transactionPrice: 33334,
        standaloneSellIingPrice: null,
        serviceStartDate: new Date('2024-01-01'),
        serviceEndDate: new Date('2024-01-01'),
        sourceTermIds: [],
        allocationMethod: 'straight_line',
        recognitionMethod: 'as_invoiced',
      },
    ];

    const allocations = allocatePrices(obligations, 100000);
    const total = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);

    expect(total).toBe(100000);
    expect(validateAllocations(allocations, 100000)).toBe(true);
  });
});

describe('validateAllocations', () => {
  it('should return true when allocations sum to total', () => {
    const allocations = [
      { obligationIndex: 0, allocationPct: 60, allocatedAmount: 60000, allocationBasis: 'ssp' },
      { obligationIndex: 1, allocationPct: 40, allocatedAmount: 40000, allocationBasis: 'ssp' },
    ];

    expect(validateAllocations(allocations, 100000)).toBe(true);
  });

  it('should return false when allocations do not sum to total', () => {
    const allocations = [
      { obligationIndex: 0, allocationPct: 60, allocatedAmount: 60000, allocationBasis: 'ssp' },
      { obligationIndex: 1, allocationPct: 30, allocatedAmount: 30000, allocationBasis: 'ssp' },
    ];

    expect(validateAllocations(allocations, 100000)).toBe(false);
  });

  it('should respect tolerance threshold', () => {
    const allocations = [
      { obligationIndex: 0, allocationPct: 60, allocatedAmount: 60000, allocationBasis: 'ssp' },
      { obligationIndex: 1, allocationPct: 40, allocatedAmount: 39999.995, allocationBasis: 'ssp' },
    ];

    expect(validateAllocations(allocations, 100000, 0.01)).toBe(true);
  });
});
