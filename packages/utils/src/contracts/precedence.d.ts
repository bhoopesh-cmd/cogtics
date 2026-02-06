/**
 * Precedence Rules Engine
 *
 * Deterministic resolution of conflicting contract terms using
 * explicit precedence rules. Always logs decisions for audit.
 */
import type { DocumentType } from './document-type.js';
import type { ExtractedTerm } from './extraction.js';
export interface TermWithContext {
    term: ExtractedTerm;
    documentId: string;
    documentType: DocumentType;
    effectiveDate: Date | null;
    clauseOffset: number;
    pageNumber: number | null;
    hasOverrideLanguage: boolean;
    overrideType?: OverrideType;
}
export type OverrideType = 'notwithstanding' | 'except_as' | 'prevails_over' | 'controls' | 'supersedes' | 'in_event_of_conflict' | 'explicit_precedence';
export interface PrecedenceDecision {
    winningTermIndex: number;
    winningTerm: TermWithContext;
    losingTerms: TermWithContext[];
    appliedRules: AppliedRule[];
    confidence: number;
    requiresReview: boolean;
    auditLog: string;
}
export interface AppliedRule {
    name: string;
    priority: number;
    result: 'decisive' | 'tiebreaker' | 'inconclusive';
    evidence?: string;
}
export interface OverrideDetection {
    type: OverrideType;
    matchedText: string;
    targetSection?: string;
    startOffset: number;
    endOffset: number;
    confidence: number;
}
/**
 * Detect override language in text
 */
export declare function detectOverrides(text: string): OverrideDetection[];
/**
 * Resolve precedence between conflicting terms
 */
/**
 * Detect circular override relationships between documents
 * Returns true if a cycle is detected (A overrides B which overrides A)
 */
export declare function detectOverrideCycle(terms: TermWithContext[]): {
    hasCycle: boolean;
    cycleDocuments?: string[];
    message?: string;
};
export declare function resolvePrecedence(terms: TermWithContext[]): PrecedenceDecision;
/**
 * Check if a term has override language that affects another term
 */
export declare function hasOverrideFor(overrideDetections: OverrideDetection[], termOffset: number, windowSize?: number): OverrideDetection | null;
/**
 * Get precedence order for a document type
 */
export declare function getDocumentPrecedence(docType: DocumentType): number;
/**
 * Compare two document types for precedence
 */
export declare function compareDocumentTypes(a: DocumentType, b: DocumentType): -1 | 0 | 1;
/**
 * Export precedence rules for transparency
 */
export declare function getPrecedenceRules(): Array<{
    name: string;
    priority: number;
    description: string;
}>;
/**
 * Export document type priorities for transparency
 */
export declare function getDocumentTypePriorities(): Record<DocumentType, number>;
//# sourceMappingURL=precedence.d.ts.map