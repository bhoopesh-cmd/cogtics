/**
 * Clause Segmentation
 *
 * Deterministic clause segmentation for contract documents.
 * Identifies headings, sections, paragraphs, and list items.
 */
export interface ClauseSegment {
    type: 'heading' | 'section' | 'paragraph' | 'list_item';
    label: string | null;
    text: string;
    startOffset: number;
    endOffset: number;
    pageNumber: number | null;
    sequenceNumber: number;
    parentIndex: number | null;
}
/**
 * Segment extracted text into clauses
 *
 * @param text - The extracted text from a PDF
 * @param pageBreaks - Optional array of character offsets where page breaks occur
 * @returns Array of clause segments
 */
export declare function segmentClauses(text: string, pageBreaks?: number[]): ClauseSegment[];
/**
 * Find page breaks in extracted text
 * Looks for common page break markers
 */
export declare function findPageBreaks(text: string): number[];
/**
 * Get clause hierarchy depth
 */
export declare function getClauseDepth(clause: ClauseSegment, allClauses: ClauseSegment[]): number;
/**
 * Get all child clauses of a given clause
 */
export declare function getChildClauses(parentIndex: number, allClauses: ClauseSegment[]): ClauseSegment[];
/**
 * Get clauses by type
 */
export declare function getClausesByType(clauses: ClauseSegment[], type: ClauseSegment['type']): ClauseSegment[];
//# sourceMappingURL=segmentation.d.ts.map