/**
 * Reconciliation Tests
 */
import { describe, it, expect } from 'vitest';
import { reconcileSchedulesWithInvoices, DEFAULT_RECONCILIATION_CONFIG } from '../reconciliation.js';
import type { SchedulePeriod, InvoiceInput } from '../types.js';

describe('reconcileSchedulesWithInvoices', () => {
  it('should match when schedule and invoice amounts are equal', () => {
    const schedules: SchedulePeriod[] = [
      {
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
        scheduledAmount: 10000,
        recognizedAmount: 10000,
        deferredAmount: 0,
        periodDays: 31,
        dailyRate: 322.58,
        recognitionMethod: 'straight_line',
        status: 'recognized',
      },
    ];

    const invoices: InvoiceInput[] = [
      {
        id: 'inv_1',
        contractId: 'contract_1',
        invoiceDate: new Date('2024-01-01'),
        total: 10000,
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
      },
    ];

    const result = reconcileSchedulesWithInvoices(schedules, invoices, 'contract_1');

    expect(result.reconciliations).toHaveLength(1);
    expect(result.reconciliations[0].status).toBe('matched');
    expect(result.reconciliations[0].varianceAmount).toBe(0);
    expect(result.summary.matched).toBe(1);
  });

  it('should detect amount variance when invoice differs from schedule', () => {
    const schedules: SchedulePeriod[] = [
      {
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
        scheduledAmount: 10000,
        recognizedAmount: 10000,
        deferredAmount: 0,
        periodDays: 31,
        dailyRate: 322.58,
        recognitionMethod: 'straight_line',
        status: 'recognized',
      },
    ];

    const invoices: InvoiceInput[] = [
      {
        id: 'inv_1',
        contractId: 'contract_1',
        invoiceDate: new Date('2024-01-01'),
        total: 8000,  // $2000 less than scheduled
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
      },
    ];

    const result = reconcileSchedulesWithInvoices(schedules, invoices, 'contract_1');

    expect(result.reconciliations[0].status).toBe('amount_variance');
    expect(result.reconciliations[0].varianceAmount).toBe(-2000);
    expect(result.summary.amountVariance).toBe(1);
  });

  it('should flag missing invoice when schedule has no corresponding invoice', () => {
    const schedules: SchedulePeriod[] = [
      {
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
        scheduledAmount: 10000,
        recognizedAmount: 0,
        deferredAmount: 10000,
        periodDays: 31,
        dailyRate: 322.58,
        recognitionMethod: 'straight_line',
        status: 'pending',
      },
    ];

    const invoices: InvoiceInput[] = [];

    const result = reconcileSchedulesWithInvoices(schedules, invoices, 'contract_1');

    expect(result.reconciliations[0].status).toBe('missing_invoice');
    expect(result.reconciliations[0].invoicedAmount).toBe(0);
    expect(result.summary.missingInvoice).toBe(1);
  });

  it('should flag unmatched when invoice has no corresponding schedule', () => {
    const schedules: SchedulePeriod[] = [];

    const invoices: InvoiceInput[] = [
      {
        id: 'inv_1',
        contractId: 'contract_1',
        invoiceDate: new Date('2024-01-15'),
        total: 5000,
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
      },
    ];

    const result = reconcileSchedulesWithInvoices(schedules, invoices, 'contract_1');

    expect(result.reconciliations[0].status).toBe('unmatched');
    expect(result.summary.unmatched).toBe(1);
  });

  it('should auto-match when variance is within threshold', () => {
    const schedules: SchedulePeriod[] = [
      {
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
        scheduledAmount: 10000,
        recognizedAmount: 10000,
        deferredAmount: 0,
        periodDays: 31,
        dailyRate: 322.58,
        recognitionMethod: 'straight_line',
        status: 'recognized',
      },
    ];

    const invoices: InvoiceInput[] = [
      {
        id: 'inv_1',
        contractId: 'contract_1',
        invoiceDate: new Date('2024-01-01'),
        total: 10050,  // $50 variance (0.5%)
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
      },
    ];

    const result = reconcileSchedulesWithInvoices(schedules, invoices, 'contract_1');

    // Within $100 threshold
    expect(result.reconciliations[0].status).toBe('matched');
  });

  it('should reconcile multiple periods', () => {
    const schedules: SchedulePeriod[] = [
      {
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
        scheduledAmount: 10000,
        recognizedAmount: 10000,
        deferredAmount: 0,
        periodDays: 31,
        dailyRate: 322.58,
        recognitionMethod: 'straight_line',
        status: 'recognized',
      },
      {
        periodStart: new Date('2024-02-01'),
        periodEnd: new Date('2024-02-29'),
        scheduledAmount: 10000,
        recognizedAmount: 10000,
        deferredAmount: 0,
        periodDays: 29,
        dailyRate: 344.83,
        recognitionMethod: 'straight_line',
        status: 'recognized',
      },
      {
        periodStart: new Date('2024-03-01'),
        periodEnd: new Date('2024-03-31'),
        scheduledAmount: 10000,
        recognizedAmount: 0,
        deferredAmount: 10000,
        periodDays: 31,
        dailyRate: 322.58,
        recognitionMethod: 'straight_line',
        status: 'pending',
      },
    ];

    const invoices: InvoiceInput[] = [
      {
        id: 'inv_1',
        contractId: 'contract_1',
        invoiceDate: new Date('2024-01-31'),  // Match period end
        total: 10000,
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
      },
      {
        id: 'inv_2',
        contractId: 'contract_1',
        invoiceDate: new Date('2024-02-29'),  // Match period end
        total: 8000,  // Larger variance to ensure amount_variance
        periodStart: new Date('2024-02-01'),
        periodEnd: new Date('2024-02-29'),
      },
      // No invoice for March
    ];

    const result = reconcileSchedulesWithInvoices(schedules, invoices, 'contract_1', {
      ...DEFAULT_RECONCILIATION_CONFIG,
      timingVarianceDays: 0,  // Disable timing variance detection
    });

    expect(result.reconciliations).toHaveLength(3);
    expect(result.summary.matched).toBe(1);
    expect(result.summary.amountVariance).toBe(1);
    expect(result.summary.missingInvoice).toBe(1);
  });

  it('should include reconciliation details', () => {
    const schedules: SchedulePeriod[] = [
      {
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
        scheduledAmount: 10000,
        recognizedAmount: 10000,
        deferredAmount: 0,
        periodDays: 31,
        dailyRate: 322.58,
        recognitionMethod: 'straight_line',
        status: 'recognized',
      },
    ];

    const invoices: InvoiceInput[] = [
      {
        id: 'inv_123',
        contractId: 'contract_1',
        invoiceDate: new Date('2024-01-01'),
        total: 10000,
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
      },
    ];

    const result = reconcileSchedulesWithInvoices(schedules, invoices, 'contract_1');

    expect(result.reconciliations[0].details).toBeDefined();
    expect(result.reconciliations[0].details.invoiceIds).toContain('inv_123');
    expect(result.reconciliations[0].details.scheduleCount).toBe(1);
  });

  it('should use custom config thresholds', () => {
    const schedules: SchedulePeriod[] = [
      {
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
        scheduledAmount: 10000,
        recognizedAmount: 10000,
        deferredAmount: 0,
        periodDays: 31,
        dailyRate: 322.58,
        recognitionMethod: 'straight_line',
        status: 'recognized',
      },
    ];

    const invoices: InvoiceInput[] = [
      {
        id: 'inv_1',
        contractId: 'contract_1',
        invoiceDate: new Date('2024-01-31'),  // Match period end date
        total: 10500,  // $500 variance
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
      },
    ];

    // With strict config, should be variance
    const strictResult = reconcileSchedulesWithInvoices(
      schedules,
      invoices,
      'contract_1',
      { ...DEFAULT_RECONCILIATION_CONFIG, amountVarianceThreshold: 100, timingVarianceDays: 0 }
    );
    expect(strictResult.reconciliations[0].status).toBe('amount_variance');

    // With lenient config, should match
    const lenientResult = reconcileSchedulesWithInvoices(
      schedules,
      invoices,
      'contract_1',
      { ...DEFAULT_RECONCILIATION_CONFIG, amountVarianceThreshold: 1000 }
    );
    expect(lenientResult.reconciliations[0].status).toBe('matched');
  });
});
