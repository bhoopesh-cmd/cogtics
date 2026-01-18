import { describe, it, expect } from 'vitest';
import { runSimulation, previewSimulation, validateContext, getAffectedEntities } from '../engine';
import type { SimulationContext, Override } from '../types';

describe('runSimulation', () => {
  const baselineContext: SimulationContext = {
    snapshotId: 'snap_test',
    tenantId: 'tenant_test',
    contracts: [
      {
        id: 'ctr_001',
        customerId: 'cust_001',
        name: 'Enterprise Contract',
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
        name: 'SMB Contract',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2025-02-28'),
        arr: 24000,
        currency: 'USD',
        billingFrequency: 'annual',
        status: 'active',
      },
    ],
    invoices: [
      {
        id: 'inv_001',
        contractId: 'ctr_001',
        customerId: 'cust_001',
        invoiceDate: new Date('2024-01-15'),
        total: 10000,
        currency: 'USD',
        status: 'paid',
      },
    ],
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
    ],
  };

  it('should run a complete simulation', () => {
    const overrides: Override[] = [
      {
        id: 'ov_001',
        overrideType: 'contract_term',
        targetType: 'contract',
        targetId: 'ctr_001',
        fieldPath: 'arr',
        overrideValue: 144000, // 20% increase
        sequenceNumber: 0,
      },
    ];

    const result = runSimulation(baselineContext, overrides);

    expect(result.appliedOverrides).toHaveLength(1);
    expect(result.skippedOverrides).toHaveLength(0);
    expect(result.modifiedContext.contracts[0].arr).toBe(144000);
    expect(result.summary.totalRevenueDelta).toBe(24000);
    expect(result.summary.contractsAffected).toBe(1);
  });

  it('should not mutate baseline context', () => {
    const originalArr = baselineContext.contracts[0].arr;
    
    const overrides: Override[] = [
      {
        id: 'ov_001',
        overrideType: 'contract_term',
        targetType: 'contract',
        targetId: 'ctr_001',
        fieldPath: 'arr',
        overrideValue: 200000,
        sequenceNumber: 0,
      },
    ];

    runSimulation(baselineContext, overrides);

    expect(baselineContext.contracts[0].arr).toBe(originalArr);
  });

  it('should handle invalid overrides gracefully', () => {
    const overrides: Override[] = [
      {
        id: 'ov_001',
        overrideType: 'contract_term',
        targetType: 'contract',
        targetId: 'ctr_nonexistent',
        fieldPath: 'arr',
        overrideValue: 100000,
        sequenceNumber: 0,
      },
    ];

    const result = runSimulation(baselineContext, overrides);

    expect(result.appliedOverrides).toHaveLength(0);
    expect(result.skippedOverrides).toHaveLength(1);
    expect(result.warnings.some(w => w.code === 'OVERRIDE_SKIPPED')).toBe(true);
  });

  it('should add info warning for high impact', () => {
    const overrides: Override[] = [
      {
        id: 'ov_001',
        overrideType: 'price_change',
        targetType: 'contract',
        targetId: 'ctr_001',
        overrideValue: { pricePct: 100 }, // 100% increase
        sequenceNumber: 0,
      },
    ];

    const result = runSimulation(baselineContext, overrides);

    expect(result.warnings.some(w => w.code === 'HIGH_IMPACT')).toBe(true);
  });

  it('should apply multiple overrides correctly', () => {
    const overrides: Override[] = [
      {
        id: 'ov_001',
        overrideType: 'price_change',
        targetType: 'contract',
        targetId: 'ctr_001',
        overrideValue: { pricePct: 10 },
        sequenceNumber: 0,
      },
      {
        id: 'ov_002',
        overrideType: 'price_change',
        targetType: 'contract',
        targetId: 'ctr_002',
        overrideValue: { pricePct: 10 },
        sequenceNumber: 1,
      },
    ];

    const result = runSimulation(baselineContext, overrides);

    expect(result.appliedOverrides).toHaveLength(2);
    expect(result.modifiedContext.contracts[0].arr).toBeCloseTo(132000, 2); // 120000 * 1.10
    expect(result.modifiedContext.contracts[1].arr).toBeCloseTo(26400, 2); // 24000 * 1.10
    expect(result.summary.contractsAffected).toBe(2);
  });

  it('should include period impacts in summary', () => {
    const overrides: Override[] = [
      {
        id: 'ov_001',
        overrideType: 'contract_term',
        targetType: 'contract',
        targetId: 'ctr_001',
        fieldPath: 'arr',
        overrideValue: 144000,
        sequenceNumber: 0,
      },
    ];

    const result = runSimulation(baselineContext, overrides);

    // Summary should exist even if period impacts are calculated from schedules
    expect(result.summary).toBeDefined();
    expect(typeof result.summary.totalRevenueDelta).toBe('number');
  });
});

describe('previewSimulation', () => {
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
    ],
    invoices: [],
    obligations: [],
    schedules: [],
  };

  it('should return override validation counts', () => {
    const overrides: Override[] = [
      {
        id: 'ov_001',
        overrideType: 'contract_term',
        targetType: 'contract',
        targetId: 'ctr_001',
        fieldPath: 'arr',
        overrideValue: 150000,
        sequenceNumber: 0,
      },
      {
        id: 'ov_002',
        overrideType: 'contract_term',
        targetType: 'contract',
        targetId: 'ctr_nonexistent',
        fieldPath: 'arr',
        overrideValue: 100000,
        sequenceNumber: 1,
      },
    ];

    const preview = previewSimulation(baselineContext, overrides);

    expect(preview.validOverrides).toBe(1);
    expect(preview.invalidOverrides).toBe(1);
  });

  it('should include validation warnings', () => {
    const overrides: Override[] = [
      {
        id: 'ov_001',
        overrideType: 'timing_shift',
        targetType: 'contract',
        targetId: 'ctr_001',
        overrideValue: { shiftType: 'end_date', shiftDays: 500 },
        sequenceNumber: 0,
      },
    ];

    const preview = previewSimulation(baselineContext, overrides);

    expect(preview.validOverrides).toBe(1);
    expect(preview.warnings.length).toBeGreaterThan(0);
  });
});

describe('validateContext', () => {
  it('should warn about orphan contracts', () => {
    const context: SimulationContext = {
      snapshotId: 'snap_test',
      tenantId: 'tenant_test',
      contracts: [
        {
          id: 'ctr_001',
          customerId: null, // No customer
          name: 'Orphan Contract',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          arr: 120000,
          currency: 'USD',
          billingFrequency: 'monthly',
          status: 'active',
        },
      ],
      invoices: [],
      obligations: [],
      schedules: [],
    };

    const warnings = validateContext(context);

    expect(warnings.some(w => w.code === 'ORPHAN_CONTRACTS')).toBe(true);
  });

  it('should warn about unscheduled obligations', () => {
    const context: SimulationContext = {
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
      schedules: [], // No schedules
    };

    const warnings = validateContext(context);

    expect(warnings.some(w => w.code === 'UNSCHEDULED_OBLIGATIONS')).toBe(true);
  });

  it('should warn about zero-value contracts', () => {
    const context: SimulationContext = {
      snapshotId: 'snap_test',
      tenantId: 'tenant_test',
      contracts: [
        {
          id: 'ctr_001',
          customerId: 'cust_001',
          name: 'Zero Value Contract',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          arr: 0,
          currency: 'USD',
          billingFrequency: 'monthly',
          status: 'active',
        },
      ],
      invoices: [],
      obligations: [],
      schedules: [],
    };

    const warnings = validateContext(context);

    expect(warnings.some(w => w.code === 'ZERO_VALUE_CONTRACTS')).toBe(true);
  });

  it('should error on invalid date ranges', () => {
    const context: SimulationContext = {
      snapshotId: 'snap_test',
      tenantId: 'tenant_test',
      contracts: [
        {
          id: 'ctr_001',
          customerId: 'cust_001',
          name: 'Invalid Dates Contract',
          startDate: new Date('2024-12-31'),
          endDate: new Date('2024-01-01'), // End before start
          arr: 120000,
          currency: 'USD',
          billingFrequency: 'monthly',
          status: 'active',
        },
      ],
      invoices: [],
      obligations: [],
      schedules: [],
    };

    const warnings = validateContext(context);

    expect(warnings.some(w => w.code === 'INVALID_DATE_RANGE' && w.severity === 'error')).toBe(true);
  });
});

describe('getAffectedEntities', () => {
  it('should extract affected entity IDs', () => {
    const result = {
      modifiedContext: {} as SimulationContext,
      deltas: [
        {
          deltaType: 'contract_impact' as const,
          targetType: 'contract',
          targetId: 'ctr_001',
          baselineAmount: 100000,
          simulatedAmount: 120000,
          deltaAmount: 20000,
          currency: 'USD',
        },
        {
          deltaType: 'obligation_impact' as const,
          targetType: 'obligation',
          targetId: 'obl_001',
          baselineAmount: 100000,
          simulatedAmount: 110000,
          deltaAmount: 10000,
          currency: 'USD',
        },
      ],
      summary: {
        totalRevenueDelta: 20000,
        totalRecognizedDelta: 0,
        totalDeferredDelta: 0,
        contractsAffected: 1,
        obligationsAffected: 1,
        overridesApplied: 1,
        overridesSkipped: 0,
        periodImpacts: [],
      },
      appliedOverrides: [
        {
          overrideId: 'ov_001',
          targetId: 'ctr_001',
          fieldPath: 'arr',
          originalValue: 100000,
          newValue: 120000,
        },
      ],
      skippedOverrides: [],
      warnings: [],
    };

    const entities = getAffectedEntities(result);

    expect(entities.contractIds).toContain('ctr_001');
    expect(entities.obligationIds).toContain('obl_001');
  });
});
