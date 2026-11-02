/**
 * Revenue Schedule Generation
 * 
 * Generates recognition schedules from obligations.
 */
import type { 
  IdentifiedObligation, 
  AllocationResult,
  SchedulePeriod,
  RecognitionMethod,
} from './types.js';

// ============================================
// Main Functions
// ============================================

/**
 * Generates recognition schedule for an obligation.
 * 
 * @param obligation The performance obligation
 * @param allocation The allocation result for this obligation
 * @param periodGranularity Monthly or quarterly periods
 * @returns Array of schedule periods
 */
export function generateSchedule(
  obligation: IdentifiedObligation,
  allocation: AllocationResult,
  periodGranularity: 'monthly' | 'quarterly' = 'monthly'
): SchedulePeriod[] {
  const { recognitionMethod } = obligation;
  const allocatedAmount = allocation.allocatedAmount;
  
  switch (recognitionMethod) {
    case 'straight_line':
      return generateStraightLineSchedule(
        obligation.serviceStartDate,
        obligation.serviceEndDate,
        allocatedAmount,
        periodGranularity
      );
    
    case 'usage_based':
      // Usage-based creates placeholder periods, actual recognition happens via events
      return generateUsageBasedSchedule(
        obligation.serviceStartDate,
        obligation.serviceEndDate,
        allocatedAmount,
        periodGranularity
      );
    
    case 'milestone':
      // Milestone creates single period, recognition happens upon completion
      return generateMilestoneSchedule(
        obligation.serviceStartDate,
        obligation.serviceEndDate,
        allocatedAmount
      );
    
    case 'as_invoiced':
      // As-invoiced recognizes immediately at start
      return generateAsInvoicedSchedule(
        obligation.serviceStartDate,
        allocatedAmount
      );
    
    default:
      return generateStraightLineSchedule(
        obligation.serviceStartDate,
        obligation.serviceEndDate,
        allocatedAmount,
        periodGranularity
      );
  }
}

/**
 * Generates straight-line recognition schedule.
 * Allocates revenue evenly across the service period.
 */
export function generateStraightLineSchedule(
  serviceStartDate: Date,
  serviceEndDate: Date,
  totalAmount: number,
  periodGranularity: 'monthly' | 'quarterly' = 'monthly'
): SchedulePeriod[] {
  const periods: SchedulePeriod[] = [];
  
  // Validate dates
  if (serviceEndDate <= serviceStartDate) {
    // Handle same-day recognition
    return [{
      periodStart: serviceStartDate,
      periodEnd: serviceEndDate,
      scheduledAmount: round(totalAmount, 2),
      recognizedAmount: 0,
      deferredAmount: round(totalAmount, 2),
      periodDays: 1,
      dailyRate: round(totalAmount, 6),
      recognitionMethod: 'straight_line',
      status: 'pending',
    }];
  }
  
  // Calculate total days
  const totalDays = differenceInDays(serviceEndDate, serviceStartDate);
  
  if (totalDays === 0) {
    return [{
      periodStart: serviceStartDate,
      periodEnd: serviceEndDate,
      scheduledAmount: round(totalAmount, 2),
      recognizedAmount: 0,
      deferredAmount: round(totalAmount, 2),
      periodDays: 1,
      dailyRate: round(totalAmount, 6),
      recognitionMethod: 'straight_line',
      status: 'pending',
    }];
  }
  
  const dailyRate = totalAmount / totalDays;
  
  // Generate periods
  let currentStart = new Date(serviceStartDate);
  let allocatedTotal = 0;
  
  while (currentStart <= serviceEndDate) {
    // Calculate period end
    let periodEnd: Date;
    
    if (periodGranularity === 'monthly') {
      periodEnd = endOfMonth(currentStart);
    } else {
      periodEnd = endOfQuarter(currentStart);
    }
    
    // Cap at service end date
    if (periodEnd > serviceEndDate) {
      periodEnd = new Date(serviceEndDate);
    }
    
    const periodDays = differenceInDays(periodEnd, currentStart) + 1;
    const nextStart = addDays(periodEnd, 1);
    
    // Calculate scheduled amount
    // For last period, allocate remainder to avoid rounding issues
    const isLastPeriod = nextStart > serviceEndDate;
    const scheduledAmount = isLastPeriod
      ? round(totalAmount - allocatedTotal, 2)
      : round(dailyRate * periodDays, 2);
    
    allocatedTotal += scheduledAmount;
    
    periods.push({
      periodStart: new Date(currentStart),
      periodEnd: new Date(periodEnd),
      scheduledAmount,
      recognizedAmount: 0,
      deferredAmount: scheduledAmount,
      periodDays,
      dailyRate: round(dailyRate, 6),
      recognitionMethod: 'straight_line',
      status: 'pending',
    });
    
    // Move to next period - exit if we've reached the end
    if (nextStart > serviceEndDate) {
      break;
    }
    currentStart = nextStart;
  }
  
  return periods;
}

/**
 * Generates usage-based schedule (placeholder periods).
 */
function generateUsageBasedSchedule(
  serviceStartDate: Date,
  serviceEndDate: Date,
  totalAmount: number,
  periodGranularity: 'monthly' | 'quarterly'
): SchedulePeriod[] {
  // Create placeholder periods with zero scheduled amounts
  // Actual recognition happens via usage events
  const periods: SchedulePeriod[] = [];
  let currentStart = new Date(serviceStartDate);
  
  while (currentStart < serviceEndDate) {
    let periodEnd = periodGranularity === 'monthly'
      ? endOfMonth(currentStart)
      : endOfQuarter(currentStart);
    
    if (periodEnd > serviceEndDate) {
      periodEnd = new Date(serviceEndDate);
    }
    
    const periodDays = differenceInDays(periodEnd, currentStart) + 1;
    
    periods.push({
      periodStart: new Date(currentStart),
      periodEnd: new Date(periodEnd),
      scheduledAmount: 0,  // Placeholder - filled by usage events
      recognizedAmount: 0,
      deferredAmount: 0,
      periodDays,
      dailyRate: 0,
      recognitionMethod: 'usage_based',
      status: 'pending',
    });
    
    currentStart = addDays(periodEnd, 1);
  }
  
  return periods;
}

/**
 * Generates milestone schedule (single period).
 */
function generateMilestoneSchedule(
  serviceStartDate: Date,
  serviceEndDate: Date,
  totalAmount: number
): SchedulePeriod[] {
  const periodDays = Math.max(1, differenceInDays(serviceEndDate, serviceStartDate));
  
  return [{
    periodStart: serviceStartDate,
    periodEnd: serviceEndDate,
    scheduledAmount: round(totalAmount, 2),
    recognizedAmount: 0,
    deferredAmount: round(totalAmount, 2),
    periodDays,
    dailyRate: round(totalAmount / periodDays, 6),
    recognitionMethod: 'milestone',
    status: 'pending',
  }];
}

/**
 * Generates as-invoiced schedule (immediate recognition).
 */
function generateAsInvoicedSchedule(
  serviceStartDate: Date,
  totalAmount: number
): SchedulePeriod[] {
  return [{
    periodStart: serviceStartDate,
    periodEnd: serviceStartDate,
    scheduledAmount: round(totalAmount, 2),
    recognizedAmount: round(totalAmount, 2),  // Immediately recognized
    deferredAmount: 0,
    periodDays: 1,
    dailyRate: round(totalAmount, 6),
    recognitionMethod: 'as_invoiced',
    status: 'recognized',
  }];
}

// ============================================
// Utility Functions
// ============================================

function differenceInDays(endDate: Date, startDate: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function endOfMonth(date: Date): Date {
  // Get last day of the month at midnight
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 0, 0, 0, 0);
}

function endOfQuarter(date: Date): Date {
  const quarter = Math.floor(date.getMonth() / 3);
  const quarterEndMonth = (quarter + 1) * 3;
  return new Date(date.getFullYear(), quarterEndMonth, 0);
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
