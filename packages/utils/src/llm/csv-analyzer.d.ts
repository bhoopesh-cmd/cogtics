/**
 * AI-Powered CSV Analyzer
 *
 * Uses OpenAI to automatically detect entity types and column mappings
 * for uploaded CSV files.
 *
 * Design principles:
 * - Lean canonical model: only fields needed for revenue integrity
 * - All extra fields go to metadata_json for lineage & future mapping
 * - Config-driven mapping: users map arbitrary columns to canonical OR metadata
 * - Map ALL columns - AI suggests, user confirms
 */
/**
 * Supported entity types for CSV uploads
 */
export type CSVEntityType = 'customer' | 'invoice' | 'contract' | 'payment' | 'product' | 'subscription' | 'usage' | 'credit_memo' | 'unknown';
/**
 * Field classification for mapping
 */
export type FieldCategory = 'required' | 'standard' | 'metadata';
/**
 * Lean canonical schema per entity type
 * - required: Must have for revenue integrity (identity, amounts, dates)
 * - standard: Common optional fields with known semantics
 * - Everything else → metadata_json (stored as raw JSON, no code changes needed)
 */
export declare const ENTITY_SCHEMA: Record<CSVEntityType, {
    required: string[];
    standard: string[];
}>;
export declare const ENTITY_TARGET_FIELDS: Record<CSVEntityType, string[]>;
/**
 * Column mapping suggestion from AI
 * Every column gets a mapping - either to canonical field or metadata_json
 */
export interface ColumnMappingSuggestion {
    sourceColumn: string;
    targetField: string;
    category: FieldCategory;
    metadataKey?: string;
    confidence: number;
    reasoning: string;
}
/**
 * Result of AI CSV analysis
 */
export interface CSVAnalysisResult {
    entityType: CSVEntityType;
    entityTypeConfidence: number;
    entityTypeReasoning: string;
    columnMappings: ColumnMappingSuggestion[];
    requiredMissing: string[];
    suggestions: string[];
    warnings: string[];
    aiPowered: boolean;
}
/**
 * Analyze CSV headers and sample data to detect entity type and column mappings
 */
export declare function analyzeCSV(headers: string[], sampleRows: string[][], hints?: {
    fileName?: string;
    userHint?: string;
}): Promise<CSVAnalysisResult>;
/**
 * Parse CSV sample from file content
 */
export declare function parseCSVSample(csvContent: string, maxRows?: number): {
    headers: string[];
    rows: string[][];
};
//# sourceMappingURL=csv-analyzer.d.ts.map