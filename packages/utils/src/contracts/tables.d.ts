/**
 * Table Detection and Parsing
 *
 * Detects and parses tables from extracted PDF text.
 * Handles continuation tables, merged cells, and malformed structures.
 */
export interface TableCell {
    text: string;
    rowIndex: number;
    colIndex: number;
    rowSpan?: number;
    colSpan?: number;
}
export interface TableRow {
    cells: TableCell[];
    isHeader: boolean;
    isContinuation: boolean;
}
export interface TableRegion {
    startOffset: number;
    endOffset: number;
    pageNumber: number | null;
    rows: TableRow[];
    headers: string[];
    confidence: number;
    isContinuation: boolean;
    continuationOf?: number;
    rawText: string;
}
export interface TableDetectionResult {
    tables: TableRegion[];
    nonTableText: string;
    tableCount: number;
}
/**
 * Detect and extract tables from text
 */
export declare function detectTables(text: string, pageBreaks?: number[]): TableDetectionResult;
/**
 * Merge continuation tables into their parent tables
 */
export declare function mergeContinuationTables(tables: TableRegion[]): TableRegion[];
/**
 * Convert table to markdown format
 */
export declare function tableToMarkdown(table: TableRegion): string;
/**
 * Extract key-value pairs from a simple two-column table
 */
export declare function extractKeyValuePairs(table: TableRegion): Map<string, string>;
//# sourceMappingURL=tables.d.ts.map