/**
 * Document Type Detection
 *
 * Detects the type of contract document (MSA, Order Form, Amendment, etc.)
 * based on content patterns, structure, and naming conventions.
 */
export type DocumentType = 'msa' | 'order_form' | 'amendment' | 'sow' | 'addendum' | 'exhibit' | 'schedule' | 'renewal' | 'termination' | 'other';
export interface DocumentTypeDetection {
    documentType: DocumentType;
    confidence: number;
    matchedPatterns: string[];
    suggestedTypes: Array<{
        type: DocumentType;
        confidence: number;
    }>;
}
/**
 * Detect document type from text content
 */
export declare function detectDocumentType(text: string, fileName?: string): DocumentTypeDetection;
/**
 * Detect document type from filename alone
 * Useful for quick classification before text extraction
 */
export declare function detectDocumentTypeFromFilename(fileName: string): DocumentTypeDetection;
/**
 * Get document type precedence (lower = higher precedence)
 */
export declare function getDocumentTypePrecedence(type: DocumentType): number;
/**
 * Check if document type A has higher precedence than B
 */
export declare function hasHigherPrecedence(typeA: DocumentType, typeB: DocumentType): boolean;
/**
 * Get human-readable document type name
 */
export declare function getDocumentTypeName(type: DocumentType): string;
//# sourceMappingURL=document-type.d.ts.map