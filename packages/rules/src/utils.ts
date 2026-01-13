/**
 * Detection Engine Utilities
 * Helper functions for rule implementations
 */
import { differenceInDays, parseISO, isValid, format } from 'date-fns';
import SHA256 from 'crypto-js/sha256';
import type { IssueDimensions } from './types.js';

// ============================================
// Date Utilities
// ============================================

/**
 * Parse a date value (string or Date) to Date object
 */
export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  
  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }
  
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

/**
 * Check if a date is within a range (inclusive)
 */
export function isDateInRange(
  date: Date,
  start: Date | null,
  end: Date | null
): boolean {
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

/**
 * Calculate days between two dates
 */
export function daysBetween(start: Date, end: Date): number {
  return differenceInDays(end, start);
}

/**
 * Check if periods overlap
 */
export function periodsOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 <= end2 && start2 <= end1;
}

/**
 * Format date for dimension key
 */
export function formatDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

// ============================================
// Amount Utilities
// ============================================

/**
 * Round to specified decimal places
 */
export function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Calculate percentage difference
 */
export function percentageDiff(expected: number, actual: number): number {
  if (expected === 0) {
    return actual === 0 ? 0 : 100;
  }
  return round(((actual - expected) / Math.abs(expected)) * 100, 2);
}

/**
 * Calculate absolute difference
 */
export function absoluteDiff(expected: number, actual: number): number {
  return round(actual - expected, 2);
}

/**
 * Check if amount is effectively zero
 */
export function isZero(amount: number, tolerance: number = 0.01): boolean {
  return Math.abs(amount) < tolerance;
}

/**
 * Convert amount using FX rate
 */
export function convertCurrency(
  amount: number,
  rate: number
): number {
  return round(amount * rate, 2);
}

// ============================================
// Issue Key Generation
// ============================================

/**
 * Generate deterministic issue key from dimensions
 */
export function generateIssueKey(
  ruleId: string,
  ruleVersion: string,
  dimensions: IssueDimensions
): string {
  // Create a stable, sorted representation
  const sortedDimensions = Object.keys(dimensions)
    .sort()
    .filter(k => dimensions[k] !== undefined)
    .map(k => `${k}:${dimensions[k]}`)
    .join('|');

  const input = `${ruleId}|${ruleVersion}|${sortedDimensions}`;
  return SHA256(input).toString().substring(0, 32);
}

// ============================================
// Comparison Utilities
// ============================================

/**
 * Compare two values with tolerance
 */
export function compareWithTolerance(
  expected: number,
  actual: number,
  tolerancePct: number,
  toleranceAbs: number
): { matches: boolean; variance: number; variancePct: number } {
  const variance = absoluteDiff(expected, actual);
  const variancePct = percentageDiff(expected, actual);

  const matches = 
    Math.abs(variance) <= toleranceAbs ||
    (expected !== 0 && Math.abs(variancePct) <= tolerancePct * 100);

  return { matches, variance, variancePct };
}

/**
 * Find matching invoices for a contract and period
 */
export function findInvoicesForPeriod<T extends { invoice_date: Date; contract_id: string | null }>(
  invoices: T[],
  contractId: string,
  periodStart: Date,
  periodEnd: Date
): T[] {
  return invoices.filter(inv => {
    if (inv.contract_id !== contractId) return false;
    const invDate = inv.invoice_date;
    return isDateInRange(invDate, periodStart, periodEnd);
  });
}

// ============================================
// Grouping Utilities
// ============================================

/**
 * Group items by a key function
 */
export function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K
): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  
  for (const item of items) {
    const key = keyFn(item);
    const existing = groups.get(key) || [];
    existing.push(item);
    groups.set(key, existing);
  }
  
  return groups;
}

/**
 * Sum values from items
 */
export function sum<T>(items: T[], valueFn: (item: T) => number): number {
  return items.reduce((acc, item) => acc + valueFn(item), 0);
}

// ============================================
// Validation Utilities
// ============================================

/**
 * Check if contract is within active period
 */
export function isContractActive(
  contract: { status: string; start_date: Date | null; end_date: Date | null },
  asOfDate: Date
): boolean {
  if (contract.status !== 'active' && contract.status !== 'renewed') {
    return false;
  }

  if (contract.start_date && asOfDate < contract.start_date) {
    return false;
  }

  if (contract.end_date && asOfDate > contract.end_date) {
    return false;
  }

  return true;
}

/**
 * Check if invoice is within contract term
 */
export function isInvoiceWithinTerm(
  invoiceDate: Date,
  contractStart: Date | null,
  contractEnd: Date | null
): { within: boolean; beforeStart: boolean; afterEnd: boolean } {
  const beforeStart = contractStart ? invoiceDate < contractStart : false;
  const afterEnd = contractEnd ? invoiceDate > contractEnd : false;
  
  return {
    within: !beforeStart && !afterEnd,
    beforeStart,
    afterEnd,
  };
}

// ============================================
// FX Rate Utilities
// ============================================

/**
 * Generate FX rate lookup key
 */
export function fxRateKey(
  fromCurrency: string,
  toCurrency: string,
  date: Date
): string {
  return `${fromCurrency}_${toCurrency}_${formatDateKey(date)}`;
}

/**
 * Get FX rate from map with fallback
 */
export function getFxRate(
  fxRates: Map<string, number>,
  fromCurrency: string,
  toCurrency: string,
  date: Date
): number | null {
  // Same currency = 1:1
  if (fromCurrency === toCurrency) {
    return 1.0;
  }

  // Try direct rate
  const directKey = fxRateKey(fromCurrency, toCurrency, date);
  const directRate = fxRates.get(directKey);
  if (directRate !== undefined) {
    return directRate;
  }

  // Try inverse rate
  const inverseKey = fxRateKey(toCurrency, fromCurrency, date);
  const inverseRate = fxRates.get(inverseKey);
  if (inverseRate !== undefined && inverseRate !== 0) {
    return 1 / inverseRate;
  }

  return null;
}
