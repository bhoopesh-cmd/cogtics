/**
 * PDF Text Preprocessing
 *
 * Cleans extracted PDF text by removing headers, footers, page numbers,
 * normalizing whitespace, and detecting structural elements.
 */
export interface PreprocessingResult {
    cleanedText: string;
    originalLength: number;
    cleanedLength: number;
    removedHeaders: string[];
    removedFooters: string[];
    pageBreaks: number[];
    pageCount: number;
    twoColumnDetected: boolean;
    metadata: {
        confidentialityNotice?: string;
        documentDate?: string;
        documentTitle?: string;
    };
}
export interface PreprocessingOptions {
    removeHeaders?: boolean;
    removeFooters?: boolean;
    removePageNumbers?: boolean;
    normalizeWhitespace?: boolean;
    detectColumns?: boolean;
    preservePageBreaks?: boolean;
}
/**
 * Preprocess extracted PDF text
 */
export declare function preprocessText(text: string, options?: PreprocessingOptions): PreprocessingResult;
/**
 * Clean text minimally (just whitespace normalization)
 */
export declare function cleanTextMinimal(text: string): string;
/**
 * Check if text appears to be from a scanned document (no extractable text)
 */
export declare function isScannedDocument(text: string): boolean;
/**
 * Estimate the quality of text extraction
 */
export declare function estimateExtractionQuality(text: string): {
    quality: 'good' | 'fair' | 'poor';
    score: number;
    issues: string[];
};
//# sourceMappingURL=preprocessing.d.ts.map