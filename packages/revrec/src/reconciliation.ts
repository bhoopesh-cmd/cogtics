/**
 * Revenue Reconciliation
 * 
 * Reconciles recognition schedules with invoices.
 */
import type { 
  SchedulePeriod, 
  InvoiceInput,
  ReconciliationResult,
  ReconciliationStatus,
  ReconciliationOutput,
} from './types.js';

// ============================================
// Configuration
// ============================================

export interface ReconciliationConfig {
  /** Amount variance threshold (absolute) below which to auto-match */
  amountVarianceThreshold: number;
  /** Amount variance threshold (percentage) below which to auto-match */
  amountVariancePctThreshold: number;
  /** Days tolerance for timing variance */
  timingVarianceDays: number;
}

export const DEFAULT_RECONCILIATION_CONFIG: ReconciliationConfig = {
  amountVarianceThreshold: 100,      // $100
  amountVariancePctThreshold: 0.01,  // 1%
  timingVarianceDays: 30,
};

// ============================================
// Main Functions
// ============================================

/**
 * Reconciles schedules with invoices for a contract.
 */
export function reconcileSchedulesWithInvoices(
  schedules: SchedulePeriod[],
  invoices: InvoiceInput[],
  contractId: string,
  config: ReconciliationConfig = DEFAULT_RECONCILIATION_CONFIG
): ReconciliationOutput {
  const reconciliations: ReconciliationResult[] = [];
  
  // Group schedules by period
  const schedulePeriods = groupSchedulesByPeriod(schedules);
  
  // Group invoices by period
  const invoicePeriods = groupInvoicesByPeriod(invoices);
  
  // Get all unique periods
  const allPeriods = new Set([
    ...Object.keys(schedulePeriods),
    ...Object.keys(invoicePeriods),
  ]);
  
  for (const periodKey of allPeriods) {
    const periodSchedules = schedulePeriods[periodKey] || [];
    const periodInvoices = invoicePeriods[periodKey] || [];
    
    const { periodStart, periodEnd } = parsePeriodKey(periodKey);
    
    const scheduledAmount = periodSchedules.reduce(
      (sum, s) => sum + s.scheduledAmount,
      0
    );
    
    const invoicedAmount = periodInvoices.reduce(
      (sum, i) => sum + i.total,
      0
    );
    
    const varianceAmount = round(invoicedAmount - scheduledAmount, 2);
    const variancePct = scheduledAmount !== 0 
      ? round((varianceAmount / scheduledAmount) * 100, 4) 
      : null;
    
    const status = determineReconciliationStatus(
      scheduledAmount,
      invoicedAmount,
      varianceAmount,
      variancePct,
      periodSchedules,
      periodInvoices,
      config
    );
    
    reconciliations.push({
      contractId,
      periodStart,
      periodEnd,
      status,
      scheduledAmount: round(scheduledAmount, 2),
      invoicedAmount: round(invoicedAmount, 2),
      varianceAmount,
      variancePct,
      details: buildReconciliationDetails(
        status,
        periodSchedules,
        periodInvoices,
        varianceAmount
      ),
    });
  }
  
  // Sort by period start
  reconciliations.sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime());
  
  // Calculate summary
  const summary = {
    matched: reconciliations.filter(r => r.status === 'matched').length,
    timingVariance: reconciliations.filter(r => r.status === 'timing_variance').length,
    amountVariance: reconciliations.filter(r => r.status === 'amount_variance').length,
    missingInvoice: reconciliations.filter(r => r.status === 'missing_invoice').length,
    unmatched: reconciliations.filter(r => r.status === 'unmatched').length,
  };
  
  return { reconciliations, summary };
}

/**
 * Determines the reconciliation status for a period.
 */
function determineReconciliationStatus(
  scheduledAmount: number,
  invoicedAmount: number,
  varianceAmount: number,
  variancePct: number | null,
  schedules: SchedulePeriod[],
  invoices: InvoiceInput[],
  config: ReconciliationConfig
): ReconciliationStatus {
  // No schedules but has invoices = unmatched
  if (schedules.length === 0 && invoices.length > 0) {
    return 'unmatched';
  }
  
  // Has schedules but no invoices = missing invoice
  if (schedules.length > 0 && invoices.length === 0) {
    return 'missing_invoice';
  }
  
  // No schedules and no invoices = matched (nothing to reconcile)
  if (schedules.length === 0 && invoices.length === 0) {
    return 'matched';
  }
  
  const absVariance = Math.abs(varianceAmount);
  const absVariancePct = Math.abs(variancePct ?? 0) / 100;
  
  // Check if variance is within tolerance
  const withinAbsoluteThreshold = absVariance <= config.amountVarianceThreshold;
  const withinPctThreshold = absVariancePct <= config.amountVariancePctThreshold;
  
  if (withinAbsoluteThreshold || withinPctThreshold) {
    return 'matched';
  }
  
  // Check for timing variance (invoice in different period than schedule)
  const hasTimingMismatch = checkTimingMismatch(schedules, invoices, config);
  if (hasTimingMismatch) {
    return 'timing_variance';
  }
  
  // Otherwise it's an amount variance
  return 'amount_variance';
}

/**
 * Checks if there's a timing mismatch between schedules and invoices.
 */
function checkTimingMismatch(
  schedules: SchedulePeriod[],
  invoices: InvoiceInput[],
  config: ReconciliationConfig
): boolean {
  // If amounts are close but timing is off, it's a timing variance
  // This is a simplified check - could be more sophisticated
  
  for (const schedule of schedules) {
    const scheduleDate = schedule.periodEnd;
    
    for (const invoice of invoices) {
      const invoiceDate = invoice.invoiceDate;
      const daysDiff = Math.abs(
        Math.floor((scheduleDate.getTime() - invoiceDate.getTime()) / (24 * 60 * 60 * 1000))
      );
      
      if (daysDiff > 0 && daysDiff <= config.timingVarianceDays) {
        // Amounts are similar but dates differ
        const amountDiff = Math.abs(schedule.scheduledAmount - invoice.total);
        const amountPctDiff = schedule.scheduledAmount !== 0 
          ? amountDiff / schedule.scheduledAmount 
          : 0;
        
        if (amountPctDiff < 0.1) {  // Within 10% is likely timing
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * Builds detailed reconciliation information.
 */
function buildReconciliationDetails(
  status: ReconciliationStatus,
  schedules: SchedulePeriod[],
  invoices: InvoiceInput[],
  varianceAmount: number
): Record<string, unknown> {
  const details: Record<string, unknown> = {
    scheduleCount: schedules.length,
    invoiceCount: invoices.length,
    scheduleIds: schedules.map((_, i) => i),
    invoiceIds: invoices.map(i => i.id),
  };
  
  switch (status) {
    case 'matched':
      details.matchType = 'exact';
      break;
    case 'timing_variance':
      details.variance = 'timing';
      details.message = 'Invoice and recognition periods do not align';
      break;
    case 'amount_variance':
      details.variance = 'amount';
      details.message = `Variance of ${varianceAmount.toFixed(2)} between scheduled and invoiced`;
      break;
    case 'missing_invoice':
      details.message = 'No invoice found for this recognition period';
      break;
    case 'unmatched':
      details.message = 'Invoice without corresponding recognition schedule';
      break;
  }
  
  return details;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Groups schedules by period key (YYYY-MM format).
 */
function groupSchedulesByPeriod(
  schedules: SchedulePeriod[]
): Record<string, SchedulePeriod[]> {
  const groups: Record<string, SchedulePeriod[]> = {};
  
  for (const schedule of schedules) {
    const key = getPeriodKey(schedule.periodStart, schedule.periodEnd);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(schedule);
  }
  
  return groups;
}

/**
 * Groups invoices by period key (YYYY-MM format).
 */
function groupInvoicesByPeriod(
  invoices: InvoiceInput[]
): Record<string, InvoiceInput[]> {
  const groups: Record<string, InvoiceInput[]> = {};
  
  for (const invoice of invoices) {
    // Use invoice date or period if available
    const periodStart = invoice.periodStart ?? invoice.invoiceDate;
    const periodEnd = invoice.periodEnd ?? invoice.invoiceDate;
    
    const key = getPeriodKey(periodStart, periodEnd);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(invoice);
  }
  
  return groups;
}

/**
 * Creates a period key from start and end dates.
 */
function getPeriodKey(start: Date, end: Date): string {
  const startStr = formatDate(start);
  const endStr = formatDate(end);
  return `${startStr}|${endStr}`;
}

/**
 * Parses a period key back into dates.
 */
function parsePeriodKey(key: string): { periodStart: Date; periodEnd: Date } {
  const [startStr, endStr] = key.split('|');
  return {
    periodStart: parseDateOnly(startStr),
    periodEnd: parseDateOnly(endStr),
  };
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
