/**
 * Definition Resolution
 *
 * Extracts and resolves defined terms from contract documents.
 * Links defined terms to their usage throughout the document.
 */
import type { ClauseSegment } from './segmentation.js';
export interface DefinedTerm {
    term: string;
    definition: string;
    clauseId?: string;
    clauseIndex: number;
    startOffset: number;
    endOffset: number;
    pageNumber: number | null;
    confidence: number;
    category: DefinitionCategory;
}
export type DefinitionCategory = 'party' | 'product' | 'service' | 'financial' | 'temporal' | 'legal' | 'technical' | 'general';
export interface DefinitionUsage {
    term: string;
    clauseIndex: number;
    offset: number;
    context: string;
}
export interface DefinitionResolutionResult {
    definitions: DefinedTerm[];
    usages: DefinitionUsage[];
    unresolvedReferences: string[];
}
/**
 * Extract defined terms from document text
 */
export declare function extractDefinitions(text: string, clauses?: ClauseSegment[]): DefinedTerm[];
/**
 * Find usages of defined terms throughout the document
 */
export declare function findDefinitionUsages(text: string, definitions: DefinedTerm[], clauses?: ClauseSegment[]): DefinitionUsage[];
/**
 * Resolve defined terms in text by expanding them to their definitions
 */
export declare function resolveDefinitionsInText(text: string, definitions: DefinedTerm[]): string;
/**
 * Find undefined references to capitalized terms
 */
export declare function findUndefinedReferences(text: string, definitions: DefinedTerm[]): string[];
/**
 * Build a full resolution result
 */
export declare function resolveDefinitions(text: string, clauses?: ClauseSegment[]): DefinitionResolutionResult;
/**
 * Get definition for a specific term
 */
export declare function getDefinition(term: string, definitions: DefinedTerm[]): DefinedTerm | undefined;
/**
 * Check if a term is defined
 */
export declare function isTermDefined(term: string, definitions: DefinedTerm[]): boolean;
//# sourceMappingURL=definitions.d.ts.map