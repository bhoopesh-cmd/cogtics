/**
 * Recognition Event Tests
 */
import { describe, it, expect } from 'vitest';
import { 
  createRecognitionEvents,
  createUsageEvent,
  createAdjustmentEvent,
  createCancellationEvent,
  createAmendmentEvent,
  calculateCumulativeRecognized,
  applyEventsToSchedule,
} from '../recognition.js';
import type { SchedulePeriod, RecognitionEvent } from '../types.js';

describe('createRecognitionEvents', () => {
  it('should create scheduled events for past straight-line periods', () => {
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
      {
        periodStart: new Date('2024-02-01'),
        periodEnd: new Date('2024-02-29'),
        scheduledAmount: 10000,
        recognizedAmount: 0,
        deferredAmount: 10000,
        periodDays: 29,
        dailyRate: 344.83,
        recognitionMethod: 'straight_line',
        status: 'pending',
      },
    ];

    // As of end of January
    const events = createRecognitionEvents(schedules, new Date('2024-02-01'));

    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('scheduled');
    expect(events[0].recognizedAmount).toBe(10000);
    expect(events[0].scheduleIndex).toBe(0);
  });

  it('should create immediate event for as-invoiced schedules', () => {
    const schedules: SchedulePeriod[] = [
      {
        periodStart: new Date('2024-01-15'),
        periodEnd: new Date('2024-01-15'),
        scheduledAmount: 5000,
        recognizedAmount: 5000,
        deferredAmount: 0,
        periodDays: 1,
        dailyRate: 5000,
        recognitionMethod: 'as_invoiced',
        status: 'recognized',
      },
    ];

    const events = createRecognitionEvents(schedules);

    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('scheduled');
    expect(events[0].recognizedAmount).toBe(5000);
  });

  it('should not create event for unrecognized milestone', () => {
    const schedules: SchedulePeriod[] = [
      {
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-03-31'),
        scheduledAmount: 20000,
        recognizedAmount: 0,
        deferredAmount: 20000,
        periodDays: 90,
        dailyRate: 222.22,
        recognitionMethod: 'milestone',
        status: 'pending',
      },
    ];

    const events = createRecognitionEvents(schedules);

    expect(events).toHaveLength(0);
  });

  it('should create milestone event when complete', () => {
    const schedules: SchedulePeriod[] = [
      {
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-03-31'),
        scheduledAmount: 20000,
        recognizedAmount: 0,
        deferredAmount: 20000,
        periodDays: 90,
        dailyRate: 222.22,
        recognitionMethod: 'milestone',
        status: 'recognized',
      },
    ];

    const events = createRecognitionEvents(schedules);

    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('milestone');
    expect(events[0].recognizedAmount).toBe(20000);
  });
});

describe('createUsageEvent', () => {
  it('should create usage event with correct properties', () => {
    const event = createUsageEvent(0, new Date('2024-01-15'), 500, 'API usage');

    expect(event.eventType).toBe('usage');
    expect(event.recognizedAmount).toBe(500);
    expect(event.scheduleIndex).toBe(0);
    expect(event.description).toBe('API usage');
  });
});

describe('createAdjustmentEvent', () => {
  it('should create adjustment event', () => {
    const event = createAdjustmentEvent(0, new Date('2024-01-31'), 1000, 'Price correction');

    expect(event.eventType).toBe('adjustment');
    expect(event.recognizedAmount).toBe(1000);
    expect(event.description).toBe('Adjustment: Price correction');
  });
});

describe('createCancellationEvent', () => {
  it('should create cancellation event with negative amount', () => {
    const event = createCancellationEvent(0, new Date('2024-06-30'), 50000, 'Early termination');

    expect(event.eventType).toBe('cancellation');
    expect(event.recognizedAmount).toBe(-50000);
    expect(event.description).toBe('Early termination');
  });
});

describe('createAmendmentEvent', () => {
  it('should create amendment event', () => {
    const event = createAmendmentEvent(null, new Date('2024-04-01'), 25000, 'Contract upgrade');

    expect(event.eventType).toBe('amendment');
    expect(event.recognizedAmount).toBe(25000);
    expect(event.scheduleIndex).toBeNull();
  });
});

describe('calculateCumulativeRecognized', () => {
  it('should sum all recognized amounts up to date', () => {
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
      {
        eventDate: new Date('2024-03-31'),
        recognizedAmount: 10000,
        eventType: 'scheduled',
        scheduleIndex: 2,
        sourceInvoiceId: null,
        description: null,
      },
    ];

    // As of end of February
    const cumulative = calculateCumulativeRecognized(events, new Date('2024-03-01'));

    expect(cumulative).toBe(20000);
  });

  it('should include adjustments and cancellations', () => {
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
        eventDate: new Date('2024-02-15'),
        recognizedAmount: -2000,
        eventType: 'adjustment',
        scheduleIndex: null,
        sourceInvoiceId: null,
        description: null,
      },
    ];

    const cumulative = calculateCumulativeRecognized(events, new Date('2024-03-01'));

    expect(cumulative).toBe(8000);
  });
});

describe('applyEventsToSchedule', () => {
  it('should update schedule with recognized amounts', () => {
    const schedule: SchedulePeriod = {
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-01-31'),
      scheduledAmount: 10000,
      recognizedAmount: 0,
      deferredAmount: 10000,
      periodDays: 31,
      dailyRate: 322.58,
      recognitionMethod: 'straight_line',
      status: 'pending',
    };

    const events: RecognitionEvent[] = [
      {
        eventDate: new Date('2024-01-31'),
        recognizedAmount: 10000,
        eventType: 'scheduled',
        scheduleIndex: 0,
        sourceInvoiceId: null,
        description: null,
      },
    ];

    const updated = applyEventsToSchedule(schedule, events, 0);

    expect(updated.recognizedAmount).toBe(10000);
    expect(updated.deferredAmount).toBe(0);
    expect(updated.status).toBe('recognized');
  });

  it('should handle partial recognition', () => {
    const schedule: SchedulePeriod = {
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-01-31'),
      scheduledAmount: 10000,
      recognizedAmount: 0,
      deferredAmount: 10000,
      periodDays: 31,
      dailyRate: 322.58,
      recognitionMethod: 'straight_line',
      status: 'pending',
    };

    const events: RecognitionEvent[] = [
      {
        eventDate: new Date('2024-01-15'),
        recognizedAmount: 5000,
        eventType: 'usage',
        scheduleIndex: 0,
        sourceInvoiceId: null,
        description: null,
      },
    ];

    const updated = applyEventsToSchedule(schedule, events, 0);

    expect(updated.recognizedAmount).toBe(5000);
    expect(updated.deferredAmount).toBe(5000);
    expect(updated.status).toBe('partial');
  });
});
