import { describe, it, expect } from 'vitest';
import { computeDeltas, aggregateSummary, scoreSimulationImpact } from '../deltas';
import type { SimulationContext, AppliedOverride, SkippedOverride } from '../types';

describe('computeDeltas', () => {
  const baselineContext: SimulationContext = {
    snapshotId: 'snap_test',
    tenantId: 'tenant_test',
    contracts: [
      {
        id: 'ctr_001',
        customerId: 'cust_001',
        name: 'Test Contract',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        arr: 120000,
        currency: 'USD',
        billingFrequency: 'monthly',
        status: 'active',
      },
      {
        id: 'ctr_002',
        customerId: 'cust_002',
        name: 'Another Contract',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2025-02-28'),
        arr: 60000,
        currency: 'USD',
        billingFrequency: 'annual',
        status: 'active',
      },
    ],
    invoices: [],
    obligations: [
      {
        id: 'obl_001',
        contractId: 'ctr_001',
        obligationType: 'subscription',
        transactionPrice: 120000,
        serviceStartDate: new Date('2024-01-01'),
        serviceEndDate: new Date('2024-12-31'),
        status: 'active',
      },
    ],
    schedules: [
      {
        id: 'sched_001',
        obligationId: 'obl_001',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
        scheduledAmount: 10000,
        recognizedAmount: 10000,
        deferredAmount: 0,
      },
      {
        id: 'sched_002',
        obligationId: 'obl_001',
        periodStart: new Date('2024-02-01'),
        periodEnd: new Date('2024-02-29'),
        scheduledAmount: 10000,
        recognizedAmount: 10000,
        deferredAmount: 0,
      },
    ],
  };

  it('should compute contract-level deltas', () => {
    const modifiedContext: SimulationContext = {
      ...baselineContext,
      contracts: baselineContext.contracts.map(c => 
        c.id === 'ctr_001' 
          ? { ...c, arr: 150000 }
          : c
      ),
    };

    const deltas = computeDeltas(baselineContext, modifiedContext);
    
    const contractDelta = deltas.find(d => 
      d.deltaType === 'contract_impact' && d.targetId === 'ctr_001'
    );
    
    expect(contractDelta).toBeDefined();
    expect(contractDelta?.deltaAmount).toBe(30000);
    expect(contractDelta?.baselineAmount).toBe(120000);
    expect(contractDelta?.simulatedAmount).toBe(150000);
  });

  it('should compute total revenue delta', () => {
    const modifiedContext: SimulationContext = {
      ...baselineContext,
      contracts: baselineContext.contracts.map(c => 
        c.id === 'ctr_001' 
          ? { ...c, arr: 150000 }
          : c
      ),
    };

    const deltas = computeDeltas(baselineContext, modifiedContext);
    
    const totalDelta = deltas.find(d => d.deltaType === 'revenue_total');
    
    expect(totalDelta).toBeDefined();
    expect(totalDelta?.deltaAmount).toBe(30000);
    expect(totalDelta?.baselineAmount).toBe(180000); // 120000 + 60000
    expect(totalDelta?.simulatedAmount).toBe(210000); // 150000 + 60000
  });

  it('should filter out immaterial deltas', () => {
    const modifiedContext: SimulationContext = {
      ...baselineContext,
      contracts: baselineContext.contracts.map(c => 
        c.id === 'ctr_001' 
          ? { ...c, arr: 120000.005 } // Very small change
          : c
      ),
    };

    const deltas = computeDeltas(baselineContext, modifiedContext, {
      materialityThreshold: 0.01,
    });
    
    // Should not have contract delta due to small change
    const contractDelta = deltas.find(d => 
      d.deltaType === 'contract_impact' && d.targetId === 'ctr_001'
    );
    
    expect(contractDelta).toBeUndefined();
  });

  it('should compute obligation-level deltas', () => {
    const modifiedContext: SimulationContext = {
      ...baselineContext,
      obligations: baselineContext.obligations.map(o => 
        o.id === 'obl_001' 
          ? { ...o, transactionPrice: 130000 }
          : o
      ),
    };

    const deltas = computeDeltas(baselineContext, modifiedContext);
    
    const oblDelta = deltas.find(d => 
      d.deltaType === 'obligation_impact' && d.targetId === 'obl_001'
    );
    
    expect(oblDelta).toBeDefined();
    expect(oblDelta?.deltaAmount).toBe(10000);
  });

  it('should compute period deltas from schedules', () => {
    const modifiedContext: SimulationContext = {
      ...baselineContext,
      schedules: baselineContext.schedules.map(s => 
        s.id === 'sched_001' 
          ? { ...s, scheduledAmount: 12000, recognizedAmount: 12000 }
          : s
      ),
    };

    const deltas = computeDeltas(baselineContext, modifiedContext);
    
    const periodDelta = deltas.find(d => 
      d.deltaType === 'revenue_period' && 
      d.periodStart?.toISOString().includes('2024-01-01')
    );
    
    expect(periodDelta).toBeDefined();
    expect(periodDelta?.deltaAmount).toBe(2000);
  });

  it('should calculate percentage change', () => {
    const modifiedContext: SimulationContext = {
      ...baselineContext,
      contracts: baselineContext.contracts.map(c => 
        c.id === 'ctr_001' 
          ? { ...c, arr: 132000 } // 10% increase
          : c
      ),
    };

    const deltas = computeDeltas(baselineContext, modifiedContext);
    
    const contractDelta = deltas.find(d => 
      d.deltaType === 'contract_impact' && d.targetId === 'ctr_001'
    );
    
    expect(contractDelta?.deltaPct).toBeCloseTo(10, 1);
  });

  it('should handle zero baseline without error', () => {
    const contextWithZero: SimulationContext = {
      ...baselineContext,
      contracts: [
        {
          ...baselineContext.contracts[0],
          arr: 0,
        },
      ],
    };

    const modifiedContext: SimulationContext = {
      ...contextWithZero,
      contracts: [
        {
          ...contextWithZero.contracts[0],
          arr: 50000,
        },
      ],
    };

    const deltas = computeDeltas(contextWithZero, modifiedContext);
    
    const contractDelta = deltas.find(d => 
      d.deltaType === 'contract_impact' && d.targetId === 'ctr_001'
    );
    
    expect(contractDelta?.deltaAmount).toBe(50000);
    expect(contractDelta?.deltaPct).toBeUndefined(); // Can't compute percentage from zero
  });
});

describe('aggregateSummary', () => {
  it('should aggregate deltas into summary', () => {
    const deltas = [
      {
        deltaType: 'revenue_total' as const,
        baselineAmount: 180000,
        simulatedAmount: 210000,
        deltaAmount: 30000,
        currency: 'USD',
      },
      {
        deltaType: 'contract_impact' as const,
        targetType: 'contract',
        targetId: 'ctr_001',
        baselineAmount: 120000,
        simulatedAmount: 150000,
        deltaAmount: 30000,
        currency: 'USD',
      },
      {
        deltaType: 'obligation_impact' as const,
        targetType: 'obligation',
        targetId: 'obl_001',
        baselineAmount: 120000,
        simulatedAmount: 130000,
        deltaAmount: 10000,
        currency: 'USD',
      },
    ];

    const applied: AppliedOverride[] = [
      { overrideId: 'ov_001', targetId: 'ctr_001', fieldPath: 'arr', originalValue: 120000, newValue: 150000 },
    ];
    const skipped: SkippedOverride[] = [];

    const summary = aggregateSummary(deltas, applied, skipped);

    expect(summary.totalRevenueDelta).toBe(30000);
    expect(summary.contractsAffected).toBe(1);
    expect(summary.obligationsAffected).toBe(1);
    expect(summary.overridesApplied).toBe(1);
    expect(summary.overridesSkipped).toBe(0);
  });

  it('should aggregate period impacts', () => {
    const deltas = [
      {
        deltaType: 'revenue_period' as const,
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
        baselineAmount: 10000,
        simulatedAmount: 12000,
        deltaAmount: 2000,
        currency: 'USD',
      },
      {
        deltaType: 'revenue_period' as const,
        periodStart: new Date('2024-02-01'),
        periodEnd: new Date('2024-02-29'),
        baselineAmount: 10000,
        simulatedAmount: 12000,
        deltaAmount: 2000,
        currency: 'USD',
      },
    ];

    const summary = aggregateSummary(deltas, [], []);

    expect(summary.periodImpacts).toHaveLength(2);
    expect(summary.periodImpacts[0].revenueDelta).toBe(2000);
  });

  it('should count skipped overrides', () => {
    const deltas = [
      {
        deltaType: 'revenue_total' as const,
        baselineAmount: 100000,
        simulatedAmount: 100000,
        deltaAmount: 0,
        currency: 'USD',
      },
    ];

    const applied: AppliedOverride[] = [];
    const skipped: SkippedOverride[] = [
      { overrideId: 'ov_001', reason: 'Target not found' },
      { overrideId: 'ov_002', reason: 'Invalid value' },
    ];

    const summary = aggregateSummary(deltas, applied, skipped);

    expect(summary.overridesApplied).toBe(0);
    expect(summary.overridesSkipped).toBe(2);
  });
});

describe('scoreSimulationImpact', () => {
  it('should score based on revenue delta magnitude', () => {
    const lowImpact = scoreSimulationImpact({
      totalRevenueDelta: 10000,
      totalRecognizedDelta: 0,
      totalDeferredDelta: 0,
      contractsAffected: 1,
      obligationsAffected: 0,
      overridesApplied: 1,
      overridesSkipped: 0,
      periodImpacts: [],
    });

    const highImpact = scoreSimulationImpact({
      totalRevenueDelta: 500000,
      totalRecognizedDelta: 0,
      totalDeferredDelta: 0,
      contractsAffected: 10,
      obligationsAffected: 0,
      overridesApplied: 1,
      overridesSkipped: 0,
      periodImpacts: [],
    });

    expect(highImpact).toBeGreaterThan(lowImpact);
  });

  it('should boost score for many contracts affected', () => {
    const fewContracts = scoreSimulationImpact({
      totalRevenueDelta: 100000,
      totalRecognizedDelta: 0,
      totalDeferredDelta: 0,
      contractsAffected: 1,
      obligationsAffected: 0,
      overridesApplied: 1,
      overridesSkipped: 0,
      periodImpacts: [],
    });

    const manyContracts = scoreSimulationImpact({
      totalRevenueDelta: 100000,
      totalRecognizedDelta: 0,
      totalDeferredDelta: 0,
      contractsAffected: 10,
      obligationsAffected: 0,
      overridesApplied: 1,
      overridesSkipped: 0,
      periodImpacts: [],
    });

    expect(manyContracts).toBeGreaterThan(fewContracts);
  });

  it('should boost score for timing changes', () => {
    const noTiming = scoreSimulationImpact({
      totalRevenueDelta: 100000,
      totalRecognizedDelta: 0,
      totalDeferredDelta: 0,
      contractsAffected: 1,
      obligationsAffected: 0,
      overridesApplied: 1,
      overridesSkipped: 0,
      periodImpacts: [],
    });

    const withTiming = scoreSimulationImpact({
      totalRevenueDelta: 100000,
      totalRecognizedDelta: 50000,
      totalDeferredDelta: -50000,
      contractsAffected: 1,
      obligationsAffected: 0,
      overridesApplied: 1,
      overridesSkipped: 0,
      periodImpacts: [],
    });

    expect(withTiming).toBeGreaterThan(noTiming);
  });

  it('should cap score at 100', () => {
    const massiveImpact = scoreSimulationImpact({
      totalRevenueDelta: 10000000,
      totalRecognizedDelta: 5000000,
      totalDeferredDelta: 5000000,
      contractsAffected: 100,
      obligationsAffected: 500,
      overridesApplied: 50,
      overridesSkipped: 0,
      periodImpacts: [],
    });

    expect(massiveImpact).toBeLessThanOrEqual(100);
  });
});
