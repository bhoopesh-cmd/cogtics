/**
 * Contract Term Validation
 *
 * Validates extracted contract terms for logical consistency,
 * business rules, and data quality.
 */
import type { TermType, ExtractedTerm } from './extraction.js';
export type ValidationSeverity = 'error' | 'warning' | 'info';
export interface ValidationResult {
    isValid: boolean;
    issues: ValidationIssue[];
    termResults: Map<number, TermValidationResult>;
}
export interface TermValidationResult {
    termIndex: number;
    termType: TermType;
    isValid: boolean;
    issues: ValidationIssue[];
}
export interface ValidationIssue {
    termIndex: number;
    termType: TermType;
    ruleName: string;
    severity: ValidationSeverity;
    message: string;
    suggestion?: string;
    fieldPath?: string;
}
export interface ValidationRule {
    name: string;
    description: string;
    termTypes: TermType[] | 'all';
    severity: ValidationSeverity;
    validate: (term: ExtractedTerm, allTerms: ExtractedTerm[], termIndex: number) => ValidationIssue | null;
}
/**
 * Validate all extracted terms
 */
export declare function validateTerms(terms: ExtractedTerm[]): ValidationResult;
/**
 * Validate a single term
 */
export declare function validateTerm(term: ExtractedTerm, allTerms?: ExtractedTerm[]): ValidationIssue[];
/**
 * Get all validation rules (for documentation/transparency)
 */
export declare function getValidationRules(): Array<{
    name: string;
    description: string;
    termTypes: TermType[] | 'all';
    severity: ValidationSeverity;
}>;
//# sourceMappingURL=validation.d.ts.map