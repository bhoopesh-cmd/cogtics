/**
 * CSV Generation Utilities for Phase 10 Exports
 */
/**
 * Escape a value for CSV format
 * Handles: quotes, commas, newlines, and null values
 */
export function escapeCsvValue(value) {
    if (value === null || value === undefined) {
        return '';
    }
    const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
    // Escape quotes and wrap in quotes if needed
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}
/**
 * Generate CSV row from array of values
 */
export function toCsvRow(values) {
    return values.map(escapeCsvValue).join(',') + '\n';
}
/**
 * Generate complete CSV content from headers and rows
 */
export function generateCsv(headers, rows) {
    let content = toCsvRow(headers);
    for (const row of rows) {
        content += toCsvRow(row);
    }
    return content;
}
/**
 * Column mappings for different export types
 */
export const EXPORT_COLUMNS = {
    issues: [
        'id', 'severity', 'category', 'status', 'rule_id', 'rule_version',
        'confidence', 'impact_amount', 'currency', 'contract_id', 'customer_id', 'created_at'
    ],
    revrec: [
        'id', 'contract_id', 'obligation_id', 'period_start', 'period_end',
        'scheduled_amount', 'recognized_amount', 'deferred_amount', 'status', 'recognition_method'
    ],
    contracts: [
        'id', 'name', 'customer_id', 'status', 'start_date', 'end_date',
        'arr', 'currency', 'billing_frequency', 'auto_renew', 'readiness_score', 'readiness_status'
    ],
};
/**
 * Get column headers for an export type
 */
export function getExportColumns(type) {
    return EXPORT_COLUMNS[type];
}
/**
 * Format a date value for CSV export
 */
export function formatDateForCsv(date) {
    if (!date)
        return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime()))
        return '';
    return d.toISOString();
}
/**
 * Format a date value as date only (no time) for CSV export
 */
export function formatDateOnlyForCsv(date) {
    if (!date)
        return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime()))
        return '';
    return d.toISOString().split('T')[0];
}
//# sourceMappingURL=csv.js.map