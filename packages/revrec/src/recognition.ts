/**
 * Recognition Event Processing
 * 
 * Creates and processes recognition events from schedules.
 */
import type { 
  SchedulePeriod, 
  RecognitionEvent,
  RecognitionEventType,
} from './types.js';

// ============================================
// Main Functions
// ============================================

/**
 * Creates recognition events from schedules.
 * 
 * For straight-line: Creates scheduled events at period end dates.
 * For usage-based: Placeholder events, actual events come from usage.
 * For milestone: Single event when milestone is complete.
 * For as-invoiced: Immediate event at start date.
 */
export function createRecognitionEvents(
  schedules: SchedulePeriod[],
  asOfDate?: Date
): RecognitionEvent[] {
  const events: RecognitionEvent[] = [];
  const today = asOfDate ?? new Date();
  
  for (let i = 0; i < schedules.length; i++) {
    const schedule = schedules[i];
    
    switch (schedule.recognitionMethod) {
      case 'straight_line':
        // Recognize at period end if period has passed
        if (schedule.periodEnd <= today) {
          events.push({
            eventDate: schedule.periodEnd,
            recognizedAmount: schedule.scheduledAmount,
            eventType: 'scheduled',
            scheduleIndex: i,
            sourceInvoiceId: null,
            description: `Straight-line recognition for period ${formatDate(schedule.periodStart)} - ${formatDate(schedule.periodEnd)}`,
          });
        }
        break;
      
      case 'as_invoiced':
        // Already recognized at creation
        if (schedule.recognizedAmount > 0) {
          events.push({
            eventDate: schedule.periodStart,
            recognizedAmount: schedule.recognizedAmount,
            eventType: 'scheduled',
            scheduleIndex: i,
            sourceInvoiceId: null,
            description: 'Immediate recognition (as-invoiced)',
          });
        }
        break;
      
      case 'milestone':
        // Only create event if milestone is complete (status = recognized)
        if (schedule.status === 'recognized') {
          events.push({
            eventDate: schedule.periodEnd,
            recognizedAmount: schedule.scheduledAmount,
            eventType: 'milestone',
            scheduleIndex: i,
            sourceInvoiceId: null,
            description: 'Milestone completion recognition',
          });
        }
        break;
      
      case 'usage_based':
        // Usage events are created externally based on actual usage
        // This just creates a placeholder if there's recognized amount
        if (schedule.recognizedAmount > 0) {
          events.push({
            eventDate: schedule.periodEnd,
            recognizedAmount: schedule.recognizedAmount,
            eventType: 'usage',
            scheduleIndex: i,
            sourceInvoiceId: null,
            description: 'Usage-based recognition',
          });
        }
        break;
    }
  }
  
  return events;
}

/**
 * Creates a usage recognition event.
 */
export function createUsageEvent(
  scheduleIndex: number,
  eventDate: Date,
  amount: number,
  description?: string
): RecognitionEvent {
  return {
    eventDate,
    recognizedAmount: amount,
    eventType: 'usage',
    scheduleIndex,
    sourceInvoiceId: null,
    description: description ?? 'Usage-based recognition',
  };
}

/**
 * Creates an adjustment event.
 */
export function createAdjustmentEvent(
  scheduleIndex: number | null,
  eventDate: Date,
  amount: number,
  reason: string
): RecognitionEvent {
  return {
    eventDate,
    recognizedAmount: amount,
    eventType: 'adjustment',
    scheduleIndex,
    sourceInvoiceId: null,
    description: `Adjustment: ${reason}`,
  };
}

/**
 * Creates a cancellation event.
 */
export function createCancellationEvent(
  scheduleIndex: number | null,
  eventDate: Date,
  reversalAmount: number,
  reason?: string
): RecognitionEvent {
  return {
    eventDate,
    recognizedAmount: -reversalAmount,  // Negative to reverse recognition
    eventType: 'cancellation',
    scheduleIndex,
    sourceInvoiceId: null,
    description: reason ?? 'Contract cancellation reversal',
  };
}

/**
 * Creates an amendment event.
 */
export function createAmendmentEvent(
  scheduleIndex: number | null,
  eventDate: Date,
  adjustmentAmount: number,
  reason?: string
): RecognitionEvent {
  return {
    eventDate,
    recognizedAmount: adjustmentAmount,
    eventType: 'amendment',
    scheduleIndex,
    sourceInvoiceId: null,
    description: reason ?? 'Contract amendment adjustment',
  };
}

/**
 * Calculates cumulative recognized amount from events.
 */
export function calculateCumulativeRecognized(
  events: RecognitionEvent[],
  asOfDate?: Date
): number {
  const cutoffDate = asOfDate ?? new Date();
  
  return events
    .filter(e => e.eventDate <= cutoffDate)
    .reduce((sum, e) => sum + e.recognizedAmount, 0);
}

/**
 * Updates schedule with recognized amounts from events.
 */
export function applyEventsToSchedule(
  schedule: SchedulePeriod,
  events: RecognitionEvent[],
  scheduleIndex: number
): SchedulePeriod {
  const relevantEvents = events.filter(e => e.scheduleIndex === scheduleIndex);
  const recognized = relevantEvents.reduce((sum, e) => sum + e.recognizedAmount, 0);
  
  const recognizedAmount = Math.max(0, Math.min(recognized, schedule.scheduledAmount));
  const deferredAmount = schedule.scheduledAmount - recognizedAmount;
  
  let status = schedule.status;
  if (recognizedAmount >= schedule.scheduledAmount) {
    status = 'recognized';
  } else if (recognizedAmount > 0) {
    status = 'partial';
  }
  
  return {
    ...schedule,
    recognizedAmount: round(recognizedAmount, 2),
    deferredAmount: round(deferredAmount, 2),
    status,
  };
}

// ============================================
// Utility Functions
// ============================================

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
