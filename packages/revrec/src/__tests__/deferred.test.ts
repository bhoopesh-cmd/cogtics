/**
 * Deferred Revenue Balance Tests
 */
import { describe, it, expect } from 'vitest';
import { 
  computeDeferredBalances,
  computePeriodBalance,
  validateBalanceRollforward,
  getBalanceAsOf,
} from '../deferred.js';
import type { SchedulePeriod, RecognitionEvent, DeferredBalance } from '../types.js';

describe('computeDeferredBalances', () => {
  it('should compute balances for straight-line schedule', () => {
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

    const events: RecognitionEvent[] = [
      {
        eventDate: new Date('2024-01-31'),
        recognizedAmount: 10000,
        eventType: 'scheduled',
        scheduleIndex: 0,
        sourceInvoiceId: null,
        description: null,
      },
      {
        eventDate: new Date('2024-02-29'),
        recognizedAmount: 10000,
        eventType: 'scheduled',
        scheduleIndex: 1,
        sourceInvoiceId: null,
        description: null,
      },
    ];

    const balances = computeDeferredBalances(schedules, events, 30000);

    expect(balances).toHaveLength(3);
    
    // First period: 30000 - 10000 = 20000
    expect(balances[0].openingBalance).toBe(30000);
    expect(balances[0].recognized).toBe(10000);
    expect(balances[0].closingBalance).toBe(20000);
    
    // Second period: 20000 - 10000 = 10000
    expect(balances[1].openingBalance).toBe(20000);
    expect(balances[1].recognized).toBe(10000);
    expect(balances[1].closingBalance).toBe(10000);
    
    // Third period: no recognition yet
    expect(balances[2].openingBalance).toBe(10000);
    expect(balances[2].closingBalance).toBe(10000);
  });

  it('should handle empty schedules', () => {
    const balances = computeDeferredBalances([], [], 0);
    expect(balances).toHaveLength(0);
  });

  it('should handle adjustments', () => {
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

    const events: RecognitionEvent[] = [
      {
        eventDate: new Date('2024-01-31'),
        recognizedAmount: 10000,
        eventType: 'scheduled',
        scheduleIndex: 0,
        sourceInvoiceId: null,
        description: null,
      },
      {
        eventDate: new Date('2024-01-31'),
        recognizedAmount: -1000,
        eventType: 'adjustment',
        scheduleIndex: null,
        sourceInvoiceId: null,
        description: 'Price adjustment',
      },
    ];

    const balances = computeDeferredBalances(schedules, events, 10000);

    expect(balances).toHaveLength(1);
    expect(balances[0].adjustments).toBe(-1000);
  });
});

describe('validateBalanceRollforward', () => {
  it('should validate correct rollforward', () => {
    const balances: DeferredBalance[] = [
      {
        periodEnd: new Date('2024-01-31'),
        openingBalance: 30000,
        additions: 0,
        recognized: 10000,
        adjustments: 0,
        closingBalance: 20000,
      },
      {
        periodEnd: new Date('2024-02-29'),
        openingBalance: 20000,
        additions: 0,
        recognized: 10000,
        adjustments: 0,
        closingBalance: 10000,
      },
    ];

    const result = validateBalanceRollforward(balances);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect rollforward mismatch', () => {
    const balances: DeferredBalance[] = [
      {
        periodEnd: new Date('2024-01-31'),
        openingBalance: 30000,
        additions: 0,
        recognized: 10000,
        adjustments: 0,
        closingBalance: 19000,  // Should be 20000
      },
    ];

    const result = validateBalanceRollforward(balances);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Rollforward mismatch');
  });

  it('should detect continuity break', () => {
    const balances: DeferredBalance[] = [
      {
        periodEnd: new Date('2024-01-31'),
        openingBalance: 30000,
        additions: 0,
        recognized: 10000,
        adjustments: 0,
        closingBalance: 20000,
      },
      {
        periodEnd: new Date('2024-02-29'),
        openingBalance: 19000,  // Should be 20000
        additions: 0,
        recognized: 10000,
        adjustments: 0,
        closingBalance: 9000,
      },
    ];

    const result = validateBalanceRollforward(balances);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Opening balance'))).toBe(true);
  });
});

describe('getBalanceAsOf', () => {
  it('should return correct balance as of date', () => {
    const balances: DeferredBalance[] = [
      {
        periodEnd: new Date('2024-01-31'),
        openingBalance: 30000,
        additions: 0,
        recognized: 10000,
        adjustments: 0,
        closingBalance: 20000,
      },
      {
        periodEnd: new Date('2024-02-29'),
        openingBalance: 20000,
        additions: 0,
        recognized: 10000,
        adjustments: 0,
        closingBalance: 10000,
      },
      {
        periodEnd: new Date('2024-03-31'),
        openingBalance: 10000,
        additions: 0,
        recognized: 10000,
        adjustments: 0,
        closingBalance: 0,
      },
    ];

    // As of mid-February, should return January balance
    const balance = getBalanceAsOf(balances, new Date('2024-02-15'));

    expect(balance?.periodEnd).toEqual(new Date('2024-01-31'));
    expect(balance?.closingBalance).toBe(20000);
  });

  it('should return null if no balance before date', () => {
    const balances: DeferredBalance[] = [
      {
        periodEnd: new Date('2024-02-29'),
        openingBalance: 20000,
        additions: 0,
        recognized: 10000,
        adjustments: 0,
        closingBalance: 10000,
      },
    ];

    const balance = getBalanceAsOf(balances, new Date('2024-01-15'));

    expect(balance).toBeNull();
  });

  it('should return most recent balance', () => {
    const balances: DeferredBalance[] = [
      {
        periodEnd: new Date('2024-01-31'),
        openingBalance: 30000,
        additions: 0,
        recognized: 10000,
        adjustments: 0,
        closingBalance: 20000,
      },
      {
        periodEnd: new Date('2024-02-29'),
        openingBalance: 20000,
        additions: 0,
        recognized: 10000,
        adjustments: 0,
        closingBalance: 10000,
      },
    ];

    // As of end of year
    const balance = getBalanceAsOf(balances, new Date('2024-12-31'));

    expect(balance?.periodEnd).toEqual(new Date('2024-02-29'));
    expect(balance?.closingBalance).toBe(10000);
  });
});
