import { describe, it, expect } from 'vitest';
import { validateOverrides, applyOverrides } from '../overrides';
import type { SimulationContext, Override } from '../types';

describe('validateOverrides', () => {
  const baseContext: SimulationContext = {
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
    schedules: [],
  };

  it('should validate valid contract term override', () => {
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
    ];

    const result = validateOverrides(overrides, baseContext);
    expect(result.valid).toHaveLength(1);
    expect(result.invalid).toHaveLength(0);
  });

  it('should invalidate override with non-existent target', () => {
    const overrides: Override[] = [
      {
        id: 'ov_001',
        overrideType: 'contract_term',
        targetType: 'contract',
        targetId: 'ctr_nonexistent',
        fieldPath: 'arr',
        overrideValue: 150000,
        sequenceNumber: 0,
      },
    ];

    const result = validateOverrides(overrides, baseContext);
    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].reason).toContain('not found');
  });

  it('should invalidate negative ARR value', () => {
    const overrides: Override[] = [
      {
        id: 'ov_001',
        overrideType: 'contract_term',
        targetType: 'contract',
        targetId: 'ctr_001',
        fieldPath: 'arr',
        overrideValue: -50000,
        sequenceNumber: 0,
      },
    ];

    const result = validateOverrides(overrides, baseContext);
    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].reason).toContain('negative');
  });

  it('should invalidate invalid discount percentage', () => {
    const overrides: Override[] = [
      {
        id: 'ov_001',
        overrideType: 'discount_change',
        targetType: 'contract',
        targetId: 'ctr_001',
        overrideValue: { discountPct: 150 },
        sequenceNumber: 0,
      },
    ];

    const result = validateOverrides(overrides, baseContext);
    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].reason).toContain('between 0 and 100');
  });

  it('should warn on large date shifts', () => {
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

    const result = validateOverrides(overrides, baseContext);
    expect(result.valid).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].code).toBe('LARGE_DATE_SHIFT');
  });

  it('should sort overrides by sequence number', () => {
    const overrides: Override[] = [
      {
        id: 'ov_003',
        overrideType: 'contract_term',
        targetType: 'contract',
        targetId: 'ctr_001',
        fieldPath: 'arr',
        overrideValue: 130000,
        sequenceNumber: 2,
      },
      {
        id: 'ov_001',
        overrideType: 'contract_term',
        targetType: 'contract',
        targetId: 'ctr_001',
        fieldPath: 'arr',
        overrideValue: 140000,
        sequenceNumber: 0,
      },
      {
        id: 'ov_002',
        overrideType: 'contract_term',
        targetType: 'contract',
        targetId: 'ctr_001',
        fieldPath: 'arr',
        overrideValue: 150000,
        sequenceNumber: 1,
      },
    ];

    const result = validateOverrides(overrides, baseContext);
    expect(result.valid).toHaveLength(3);
    expect(result.valid[0].id).toBe('ov_001');
    expect(result.valid[1].id).toBe('ov_002');
    expect(result.valid[2].id).toBe('ov_003');
  });
});

describe('applyOverrides', () => {
  const baseContext: SimulationContext = {
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
    schedules: [],
  };

  it('should apply contract term ARR override', () => {
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
    ];

    const { context, applied } = applyOverrides(baseContext, overrides);
    
    expect(context.contracts[0].arr).toBe(150000);
    expect(applied).toHaveLength(1);
    expect(applied[0].originalValue).toBe(120000);
    expect(applied[0].newValue).toBe(150000);
  });

  it('should not mutate original context', () => {
    const originalArr = baseContext.contracts[0].arr;
    
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
    ];

    applyOverrides(baseContext, overrides);
    
    expect(baseContext.contracts[0].arr).toBe(originalArr);
  });

  it('should apply price change with percentage', () => {
    const overrides: Override[] = [
      {
        id: 'ov_001',
        overrideType: 'price_change',
        targetType: 'contract',
        targetId: 'ctr_001',
        overrideValue: { pricePct: 10 }, // 10% increase
        sequenceNumber: 0,
      },
    ];

    const { context, applied } = applyOverrides(baseContext, overrides);
    
    expect(context.contracts[0].arr).toBe(132000); // 120000 * 1.10
    expect(applied).toHaveLength(1);
  });

  it('should apply discount change', () => {
    const overrides: Override[] = [
      {
        id: 'ov_001',
        overrideType: 'discount_change',
        targetType: 'contract',
        targetId: 'ctr_001',
        overrideValue: { discountPct: 10 },
        sequenceNumber: 0,
      },
    ];

    const { context, applied } = applyOverrides(baseContext, overrides);
    
    expect(context.contracts[0].arr).toBe(108000); // 120000 * 0.90
    expect(applied).toHaveLength(1);
  });

  it('should apply timing shift with days', () => {
    const overrides: Override[] = [
      {
        id: 'ov_001',
        overrideType: 'timing_shift',
        targetType: 'contract',
        targetId: 'ctr_001',
        overrideValue: { shiftType: 'end_date', shiftDays: 30 },
        sequenceNumber: 0,
      },
    ];

    const { context, applied } = applyOverrides(baseContext, overrides);
    
    const expectedEndDate = new Date('2025-01-30');
    expect(context.contracts[0].endDate?.toISOString().split('T')[0]).toBe(
      expectedEndDate.toISOString().split('T')[0]
    );
    expect(applied).toHaveLength(1);
  });

  it('should apply billing adjustment to invoice', () => {
    const overrides: Override[] = [
      {
        id: 'ov_001',
        overrideType: 'billing_adjustment',
        targetType: 'invoice',
        targetId: 'inv_001',
        overrideValue: { adjustmentAmount: -500 }, // Credit of $500
        sequenceNumber: 0,
      },
    ];

    const { context, applied } = applyOverrides(baseContext, overrides);
    
    expect(context.invoices[0].total).toBe(9500);
    expect(applied).toHaveLength(1);
  });

  it('should apply multiple overrides in sequence', () => {
    const overrides: Override[] = [
      {
        id: 'ov_001',
        overrideType: 'contract_term',
        targetType: 'contract',
        targetId: 'ctr_001',
        fieldPath: 'arr',
        overrideValue: 100000,
        sequenceNumber: 0,
      },
      {
        id: 'ov_002',
        overrideType: 'price_change',
        targetType: 'contract',
        targetId: 'ctr_001',
        overrideValue: { pricePct: 20 }, // 20% increase on new ARR
        sequenceNumber: 1,
      },
    ];

    const { context, applied } = applyOverrides(baseContext, overrides);
    
    expect(context.contracts[0].arr).toBe(120000); // 100000 * 1.20
    expect(applied).toHaveLength(2);
  });

  it('should apply obligation price change', () => {
    const overrides: Override[] = [
      {
        id: 'ov_001',
        overrideType: 'price_change',
        targetType: 'obligation',
        targetId: 'obl_001',
        overrideValue: { priceDelta: 10000 },
        sequenceNumber: 0,
      },
    ];

    const { context, applied } = applyOverrides(baseContext, overrides);
    
    expect(context.obligations[0].transactionPrice).toBe(130000);
    expect(applied).toHaveLength(1);
  });
});
