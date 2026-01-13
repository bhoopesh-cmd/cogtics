/**
 * Deferred Revenue Balance Calculations
 * 
 * Computes period-end deferred revenue balances.
 */
import type { 
  SchedulePeriod, 
  RecognitionEvent,
  DeferredBalance,
} from './types.js';

// ============================================
// Main Functions
// ============================================

/**
 * Computes deferred revenue balances by period.
 * 
 * The deferred balance rollforward:
 * Opening Balance + Additions - Recognized +/- Adjustments = Closing Balance
 */
export function computeDeferredBalances(
  schedules: SchedulePeriod[],
  events: RecognitionEvent[],
  totalTransactionPrice: number
): DeferredBalance[] {
  if (schedules.length === 0) {
    return [];
  }
  
  // Get unique period ends sorted chronologically
  const periodEnds = [...new Set(schedules.map(s => s.periodEnd.getTime()))]
    .sort((a, b) => a - b)
    .map(t => new Date(t));
  
  const balances: DeferredBalance[] = [];
  let runningBalance = totalTransactionPrice;  // Start with full deferred
  let cumulativeRecognized = 0;
  
  for (let i = 0; i < periodEnds.length; i++) {
    const periodEnd = periodEnds[i];
    const prevPeriodEnd = i > 0 ? periodEnds[i - 1] : null;
    
    // Get schedules ending in this period
    const periodSchedules = schedules.filter(
      s => s.periodEnd.getTime() === periodEnd.getTime()
    );
    
    // For straight-line, additions represent initial deferral amount for first period
    // For subsequent periods, additions are 0 (revenue was already deferred)
    const additions = i === 0 ? 0 : 0;
    
    // Calculate recognized (from events in this period)
    // For first period, include all events up to period end
    // For subsequent periods, include events after previous period end
    const periodStartTime = prevPeriodEnd ? prevPeriodEnd.getTime() : 0;
    const periodEndTime = periodEnd.getTime();
    
    const recognizedInPeriod = events
      .filter(e => {
        const eventTime = e.eventDate.getTime();
        // For first period, include all events <= periodEnd
        // For subsequent periods, include events > prevPeriodEnd and <= periodEnd
        if (i === 0) {
          return eventTime <= periodEndTime;
        }
        return eventTime > periodStartTime && eventTime <= periodEndTime;
      })
      .reduce((sum, e) => sum + e.recognizedAmount, 0);
    
    // Calculate adjustments (non-scheduled events like cancellations, amendments)
    const adjustments = events
      .filter(e => {
        const eventTime = e.eventDate.getTime();
        const inPeriod = i === 0 
          ? eventTime <= periodEndTime
          : eventTime > periodStartTime && eventTime <= periodEndTime;
        return inPeriod &&
               (e.eventType === 'adjustment' || 
                e.eventType === 'cancellation' || 
                e.eventType === 'amendment');
      })
      .reduce((sum, e) => sum + e.recognizedAmount, 0);
    
    const openingBalance = runningBalance;
    const closingBalance = openingBalance + additions - recognizedInPeriod + adjustments;
    
    balances.push({
      periodEnd,
      openingBalance: round(openingBalance, 2),
      additions: round(additions, 2),
      recognized: round(recognizedInPeriod, 2),
      adjustments: round(adjustments, 2),
      closingBalance: round(closingBalance, 2),
    });
    
    runningBalance = closingBalance;
    cumulativeRecognized += recognizedInPeriod;
  }
  
  return balances;
}

/**
 * Computes a single period's deferred balance.
 */
export function computePeriodBalance(
  periodEnd: Date,
  openingBalance: number,
  schedules: SchedulePeriod[],
  events: RecognitionEvent[]
): DeferredBalance {
  // Get schedules for this period
  const periodSchedules = schedules.filter(
    s => s.periodEnd.getTime() === periodEnd.getTime()
  );
  
  // Sum scheduled amounts as additions
  const additions = periodSchedules.reduce((sum, s) => sum + s.scheduledAmount, 0);
  
  // Get events for this period
  const periodEvents = events.filter(
    e => e.eventDate.getTime() === periodEnd.getTime()
  );
  
  const recognized = periodEvents
    .filter(e => e.eventType === 'scheduled' || e.eventType === 'usage' || e.eventType === 'milestone')
    .reduce((sum, e) => sum + e.recognizedAmount, 0);
  
  const adjustments = periodEvents
    .filter(e => e.eventType === 'adjustment' || e.eventType === 'cancellation' || e.eventType === 'amendment')
    .reduce((sum, e) => sum + e.recognizedAmount, 0);
  
  const closingBalance = openingBalance + additions - recognized + adjustments;
  
  return {
    periodEnd,
    openingBalance: round(openingBalance, 2),
    additions: round(additions, 2),
    recognized: round(recognized, 2),
    adjustments: round(adjustments, 2),
    closingBalance: round(closingBalance, 2),
  };
}

/**
 * Validates that deferred balance rollforward is correct.
 */
export function validateBalanceRollforward(
  balances: DeferredBalance[],
  tolerance: number = 0.01
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (let i = 0; i < balances.length; i++) {
    const balance = balances[i];
    
    // Check rollforward formula
    const expected = balance.openingBalance + balance.additions - balance.recognized + balance.adjustments;
    if (Math.abs(expected - balance.closingBalance) > tolerance) {
      errors.push(
        `Period ${formatDate(balance.periodEnd)}: Rollforward mismatch. ` +
        `Expected ${expected.toFixed(2)}, got ${balance.closingBalance.toFixed(2)}`
      );
    }
    
    // Check continuity with previous period
    if (i > 0) {
      const prevBalance = balances[i - 1];
      if (Math.abs(prevBalance.closingBalance - balance.openingBalance) > tolerance) {
        errors.push(
          `Period ${formatDate(balance.periodEnd)}: Opening balance ${balance.openingBalance.toFixed(2)} ` +
          `doesn't match previous closing ${prevBalance.closingBalance.toFixed(2)}`
        );
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Gets the deferred balance as of a specific date.
 */
export function getBalanceAsOf(
  balances: DeferredBalance[],
  asOfDate: Date
): DeferredBalance | null {
  // Find the most recent balance on or before the date
  const applicableBalances = balances
    .filter(b => b.periodEnd <= asOfDate)
    .sort((a, b) => b.periodEnd.getTime() - a.periodEnd.getTime());
  
  return applicableBalances.length > 0 ? applicableBalances[0] : null;
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
