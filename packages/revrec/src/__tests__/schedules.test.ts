/**
 * Schedule Generation Tests
 */
import { describe, it, expect } from 'vitest';
import { generateSchedule, generateStraightLineSchedule } from '../schedules.js';
import type { IdentifiedObligation, AllocationResult } from '../types.js';

describe('generateStraightLineSchedule', () => {
  it('should generate monthly periods for 1-year contract with correct total', () => {
    const schedules = generateStraightLineSchedule(
      new Date(2024, 0, 1),  // Jan 1, 2024 local time
      new Date(2024, 11, 31), // Dec 31, 2024 local time
      120000,
      'monthly'
    );

    // Should generate 12 periods
    expect(schedules.length).toBe(12);
    
    // Total should equal transaction price
    const total = schedules.reduce((sum, s) => sum + s.scheduledAmount, 0);
    expect(total).toBeCloseTo(120000, 0);
    
    // Check first period starts in January
    expect(schedules[0].periodStart.getMonth()).toBe(0); // January
  });

  it('should handle partial first month', () => {
    const schedules = generateStraightLineSchedule(
      new Date('2024-01-15'),
      new Date('2024-12-31'),
      120000,
      'monthly'
    );

    // First period should be shorter
    expect(schedules[0].periodDays).toBeLessThan(31);
    expect(schedules[0].scheduledAmount).toBeLessThan(schedules[1].scheduledAmount);
  });

  it('should handle partial last month', () => {
    const schedules = generateStraightLineSchedule(
      new Date('2024-01-01'),
      new Date('2024-12-15'),
      120000,
      'monthly'
    );

    const lastSchedule = schedules[schedules.length - 1];
    expect(lastSchedule.periodDays).toBeLessThan(31);
  });

  it('should sum to total transaction price', () => {
    const schedules = generateStraightLineSchedule(
      new Date('2024-01-01'),
      new Date('2024-12-31'),
      123456.78,
      'monthly'
    );

    const total = schedules.reduce((sum, s) => sum + s.scheduledAmount, 0);
    expect(total).toBeCloseTo(123456.78, 2);
  });

  it('should handle single-day service period', () => {
    const schedules = generateStraightLineSchedule(
      new Date('2024-01-15'),
      new Date('2024-01-15'),
      5000,
      'monthly'
    );

    expect(schedules).toHaveLength(1);
    expect(schedules[0].scheduledAmount).toBe(5000);
    expect(schedules[0].periodDays).toBe(1);
  });

  it('should handle multi-year contract', () => {
    const schedules = generateStraightLineSchedule(
      new Date(2024, 0, 1),  // Jan 1, 2024
      new Date(2026, 11, 31), // Dec 31, 2026
      360000,
      'monthly'
    );

    expect(schedules.length).toBe(36); // 3 years * 12 months
    
    const total = schedules.reduce((sum, s) => sum + s.scheduledAmount, 0);
    expect(total).toBeCloseTo(360000, 0);
  });

  it('should set correct status and amounts', () => {
    const schedules = generateStraightLineSchedule(
      new Date('2024-01-01'),
      new Date('2024-03-31'),
      30000,
      'monthly'
    );

    for (const schedule of schedules) {
      expect(schedule.status).toBe('pending');
      expect(schedule.recognizedAmount).toBe(0);
      expect(schedule.deferredAmount).toBe(schedule.scheduledAmount);
      expect(schedule.recognitionMethod).toBe('straight_line');
    }
  });

  it('should handle quarterly granularity', () => {
    const schedules = generateStraightLineSchedule(
      new Date(2024, 0, 1),  // Jan 1, 2024
      new Date(2024, 11, 31), // Dec 31, 2024
      120000,
      'quarterly'
    );

    expect(schedules).toHaveLength(4);
    
    const total = schedules.reduce((sum, s) => sum + s.scheduledAmount, 0);
    expect(total).toBeCloseTo(120000, 0);
  });

  it('should handle leap year correctly', () => {
    const schedules = generateStraightLineSchedule(
      new Date(2024, 1, 1),  // Feb 1, 2024
      new Date(2024, 1, 29), // Feb 29, 2024 (leap year)
      29000,
      'monthly'
    );

    expect(schedules).toHaveLength(1);
    expect(schedules[0].periodDays).toBe(29); // 2024 is a leap year
  });
});

describe('generateSchedule', () => {
  it('should generate straight-line schedule for subscription', () => {
    const obligation: IdentifiedObligation = {
      obligationType: 'subscription',
      description: 'Subscription',
      transactionPrice: 120000,
      standaloneSellIingPrice: null,
      serviceStartDate: new Date(2024, 0, 1),  // Jan 1, 2024
      serviceEndDate: new Date(2024, 11, 31),  // Dec 31, 2024
      sourceTermIds: [],
      allocationMethod: 'straight_line',
      recognitionMethod: 'straight_line',
    };

    const allocation: AllocationResult = {
      obligationIndex: 0,
      allocationPct: 100,
      allocatedAmount: 120000,
      allocationBasis: 'single',
    };

    const schedules = generateSchedule(obligation, allocation, 'monthly');

    expect(schedules).toHaveLength(12);
    expect(schedules[0].recognitionMethod).toBe('straight_line');
  });

  it('should generate as-invoiced schedule with immediate recognition', () => {
    const obligation: IdentifiedObligation = {
      obligationType: 'one_time',
      description: 'Setup Fee',
      transactionPrice: 5000,
      standaloneSellIingPrice: null,
      serviceStartDate: new Date('2024-01-01'),
      serviceEndDate: new Date('2024-01-01'),
      sourceTermIds: [],
      allocationMethod: 'straight_line',
      recognitionMethod: 'as_invoiced',
    };

    const allocation: AllocationResult = {
      obligationIndex: 0,
      allocationPct: 100,
      allocatedAmount: 5000,
      allocationBasis: 'single',
    };

    const schedules = generateSchedule(obligation, allocation);

    expect(schedules).toHaveLength(1);
    expect(schedules[0].recognitionMethod).toBe('as_invoiced');
    expect(schedules[0].status).toBe('recognized');
    expect(schedules[0].recognizedAmount).toBe(5000);
    expect(schedules[0].deferredAmount).toBe(0);
  });

  it('should generate milestone schedule as single period', () => {
    const obligation: IdentifiedObligation = {
      obligationType: 'professional_services',
      description: 'Implementation',
      transactionPrice: 20000,
      standaloneSellIingPrice: null,
      serviceStartDate: new Date('2024-01-01'),
      serviceEndDate: new Date('2024-03-31'),
      sourceTermIds: [],
      allocationMethod: 'straight_line',
      recognitionMethod: 'milestone',
    };

    const allocation: AllocationResult = {
      obligationIndex: 0,
      allocationPct: 100,
      allocatedAmount: 20000,
      allocationBasis: 'single',
    };

    const schedules = generateSchedule(obligation, allocation);

    expect(schedules).toHaveLength(1);
    expect(schedules[0].recognitionMethod).toBe('milestone');
    expect(schedules[0].status).toBe('pending');
    expect(schedules[0].scheduledAmount).toBe(20000);
  });

  it('should generate usage-based schedule with zero amounts', () => {
    const obligation: IdentifiedObligation = {
      obligationType: 'usage',
      description: 'API Calls',
      transactionPrice: 50000,
      standaloneSellIingPrice: null,
      serviceStartDate: new Date(2024, 0, 1),  // Jan 1, 2024
      serviceEndDate: new Date(2024, 11, 31),  // Dec 31, 2024
      sourceTermIds: [],
      allocationMethod: 'straight_line',
      recognitionMethod: 'usage_based',
    };

    const allocation: AllocationResult = {
      obligationIndex: 0,
      allocationPct: 100,
      allocatedAmount: 50000,
      allocationBasis: 'single',
    };

    const schedules = generateSchedule(obligation, allocation, 'monthly');

    expect(schedules).toHaveLength(12);
    for (const schedule of schedules) {
      expect(schedule.recognitionMethod).toBe('usage_based');
      expect(schedule.scheduledAmount).toBe(0); // Placeholder
    }
  });
});
