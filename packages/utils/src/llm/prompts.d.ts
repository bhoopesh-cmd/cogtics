/**
 * LLM Prompts for Contract Intelligence
 *
 * Structured prompts for term extraction, conflict resolution,
 * and contract analysis.
 */
import type { TermType } from '../contracts/extraction.js';
export declare const SYSTEM_PROMPTS: {
    termExtraction: string;
    conflictResolution: string;
    partyExtraction: string;
    documentAnalysis: string;
};
/**
 * Generate a term extraction prompt
 */
export declare function termExtractionPrompt(clauseText: string, termTypes: TermType[], options?: {
    documentType?: string;
    sectionHeading?: string;
    precedingContext?: string;
}): string;
/**
 * Generate a conflict resolution prompt
 */
export declare function conflictResolutionPrompt(conflicts: Array<{
    termType: string;
    value: unknown;
    source: string;
    documentType?: string;
    effectiveDate?: string;
    matchedText: string;
}>, context?: string): string;
/**
 * Generate a party extraction prompt
 */
export declare function partyExtractionPrompt(documentText: string, section?: 'preamble' | 'signatures' | 'definitions' | 'all'): string;
/**
 * Generate a document analysis prompt
 */
export declare function documentAnalysisPrompt(documentText: string, options?: {
    focusAreas?: string[];
    maxLength?: number;
}): string;
/**
 * Generate an override detection prompt
 */
export declare function overrideDetectionPrompt(text: string): string;
/**
 * Generate a validation prompt for extracted terms
 */
export declare function validationPrompt(terms: Array<{
    termType: string;
    value: unknown;
    matchedText: string;
}>): string;
export declare const TERM_VALUE_FORMATS: Record<TermType, string>;
//# sourceMappingURL=prompts.d.ts.map