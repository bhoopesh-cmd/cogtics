/**
 * CSV Generation Utilities for Phase 10 Exports
 */
/**
 * Escape a value for CSV format
 * Handles: quotes, commas, newlines, and null values
 */
export declare function escapeCsvValue(value: unknown): string;
/**
 * Generate CSV row from array of values
 */
export declare function toCsvRow(values: unknown[]): string;
/**
 * Generate complete CSV content from headers and rows
 */
export declare function generateCsv(headers: string[], rows: unknown[][]): string;
/**
 * Column mappings for different export types
 */
export declare const EXPORT_COLUMNS: {
    readonly issues: readonly ["id", "severity", "category", "status", "rule_id", "rule_version", "confidence", "impact_amount", "currency", "contract_id", "customer_id", "created_at"];
    readonly revrec: readonly ["id", "contract_id", "obligation_id", "period_start", "period_end", "scheduled_amount", "recognized_amount", "deferred_amount", "status", "recognition_method"];
    readonly contracts: readonly ["id", "name", "customer_id", "status", "start_date", "end_date", "arr", "currency", "billing_frequency", "auto_renew", "readiness_score", "readiness_status"];
};
export type ExportType = keyof typeof EXPORT_COLUMNS;
/**
 * Get column headers for an export type
 */
export declare function getExportColumns(type: ExportType): readonly string[];
/**
 * Format a date value for CSV export
 */
export declare function formatDateForCsv(date: Date | string | null | undefined): string;
/**
 * Format a date value as date only (no time) for CSV export
 */
export declare function formatDateOnlyForCsv(date: Date | string | null | undefined): string;
//# sourceMappingURL=csv.d.ts.map