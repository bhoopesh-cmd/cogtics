/**
 * LLM-Powered Document Extraction
 *
 * Uses OpenAI Vision API for:
 * 1. OCR fallback for scanned PDFs
 * 2. Direct structured extraction from documents
 */
import { ContractLLM } from './client.js';
export interface DocumentExtractionResult {
    success: boolean;
    extractedText?: string;
    structuredData?: StructuredContractData;
    ocrUsed: boolean;
    model: string;
    tokensUsed?: number;
    error?: string;
}
export interface StructuredContractData {
    documentType: string;
    parties: {
        customer?: PartyInfo;
        vendor?: PartyInfo;
    };
    dates: {
        effectiveDate?: string;
        expirationDate?: string;
        signedDate?: string;
    };
    financials: {
        contractValue?: {
            amount: number;
            currency: string;
            period?: string;
        };
        paymentTerms?: string;
        billingCadence?: string;
        discount?: {
            percentage?: number;
            amount?: number;
        };
    };
    terms: {
        termLength?: string;
        autoRenew?: boolean;
        noticePeriod?: string;
        terminationTerms?: string;
    };
    products: Array<{
        name: string;
        quantity?: number;
        unitPrice?: {
            amount: number;
            currency: string;
        };
        description?: string;
    }>;
    rawTerms: Array<{
        type: string;
        value: unknown;
        matchedText: string;
        confidence: number;
    }>;
    summary: string;
}
export interface PartyInfo {
    name: string;
    type?: 'company' | 'individual';
    address?: string;
    jurisdiction?: string;
}
/**
 * Extract structured data directly from a document image using GPT-4 Vision
 */
export declare function extractStructuredFromImage(imageBase64: string, mimeType?: 'image/png' | 'image/jpeg' | 'image/webp', llmClient?: ContractLLM): Promise<DocumentExtractionResult>;
/**
 * OCR: Extract raw text from a document image
 */
export declare function extractTextFromImage(imageBase64: string, mimeType?: 'image/png' | 'image/jpeg' | 'image/webp'): Promise<DocumentExtractionResult>;
/**
 * Extract structured data from existing text using LLM
 */
export declare function extractStructuredFromText(text: string, documentType?: string, llmClient?: ContractLLM): Promise<DocumentExtractionResult>;
/**
 * Check if LLM/OCR features are available
 * Only requires OPENAI_API_KEY - uses GPT-4 Vision for both text extraction and OCR
 */
export declare function isLLMExtractionEnabled(): boolean;
/**
 * Alias for isLLMExtractionEnabled - OCR uses GPT-4 Vision
 */
export declare function isOCRFallbackEnabled(): boolean;
//# sourceMappingURL=document-extraction.d.ts.map