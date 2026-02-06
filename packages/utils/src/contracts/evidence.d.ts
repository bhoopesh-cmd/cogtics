/**
 * Evidence Trail
 *
 * Enhanced evidence storage for contract term extraction.
 * Provides full traceability for audits and explanations.
 */
import type { ExtractedTerm, ExtractionMethod } from './extraction.js';
import type { PrecedenceDecision, AppliedRule } from './precedence.js';
import type { ValidationIssue } from './validation.js';
export interface TermEvidence {
    clauseId?: string;
    documentId: string;
    pageNumber: number | null;
    startOffset: number;
    endOffset: number;
    matchedText: string;
    contextBefore: string;
    contextAfter: string;
    extractionMethod: ExtractionMethod;
    extractionRuleName?: string;
    extractionPattern?: string;
    llmReasoning?: string;
    llmConfidence?: number;
    llmModel?: string;
    precedenceApplied?: PrecedenceEvidence;
    validationStatus: 'valid' | 'warning' | 'error';
    validationIssues: ValidationIssue[];
}
export interface PrecedenceEvidence {
    conflictId?: string;
    appliedRules: AppliedRule[];
    competingTerms: CompetingTermSummary[];
    auditLog: string;
    resolutionConfidence: number;
}
export interface CompetingTermSummary {
    documentId: string;
    documentType?: string;
    value: unknown;
    confidence: number;
    matchedText: string;
    reason: string;
}
export interface EvidenceBuilder {
    withContext(fullText: string, startOffset: number, endOffset: number, contextSize?: number): EvidenceBuilder;
    withLLMReasoning(reasoning: string, model?: string, confidence?: number): EvidenceBuilder;
    withPrecedence(decision: PrecedenceDecision): EvidenceBuilder;
    withValidation(issues: ValidationIssue[]): EvidenceBuilder;
    build(): TermEvidence;
}
export declare function createEvidenceBuilder(term: ExtractedTerm, documentId: string, pageNumber?: number | null): EvidenceBuilder;
/**
 * Extract context around a matched term
 */
export declare function extractContext(fullText: string, startOffset: number, endOffset: number, contextSize?: number): {
    before: string;
    after: string;
};
/**
 * Build a human-readable evidence summary
 */
export declare function summarizeEvidence(evidence: TermEvidence): string;
/**
 * Convert evidence to a database-storable format
 */
export declare function evidenceToJson(evidence: TermEvidence): Record<string, unknown>;
/**
 * Parse evidence from database JSON
 */
export declare function evidenceFromJson(json: Record<string, unknown>): Partial<TermEvidence>;
/**
 * Format evidence for display in UI
 */
export declare function formatEvidenceForDisplay(evidence: TermEvidence): {
    location: string;
    extraction: string;
    validation: string;
    context: string;
};
/**
 * Get evidence quality score
 */
export declare function getEvidenceQuality(evidence: TermEvidence): number;
//# sourceMappingURL=evidence.d.ts.map