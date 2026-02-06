/**
 * LLM Client for Contract Intelligence
 *
 * OpenAI GPT-4.1 integration for contract parsing, term extraction,
 * conflict resolution, and explanations.
 */
import type { TermType, ExtractedTerm } from '../contracts/extraction.js';
export interface LLMClientConfig {
    apiKey: string;
    model?: 'gpt-4.1' | 'gpt-4.1-mini' | 'gpt-4o' | 'gpt-4o-mini';
    baseUrl?: string;
    timeout?: number;
    maxRetries?: number;
}
export interface LLMExtraction {
    termType: TermType;
    value: unknown;
    confidence: number;
    matchedText: string;
    reasoning: string;
    startOffset?: number;
    endOffset?: number;
}
export interface ConflictResolution {
    winningTermIndex: number;
    reasoning: string;
    confidence: number;
    appliedRules: string[];
    suggestedAction: 'accept' | 'review' | 'reject';
}
export interface OverrideDetection {
    type: 'notwithstanding' | 'except_as' | 'prevails_over' | 'controls' | 'supersedes';
    matchedText: string;
    targetSection?: string;
    confidence: number;
    startOffset: number;
    endOffset: number;
}
export interface ExplanationResult {
    explanation: string;
    confidence: string;
    sources: string[];
}
/**
 * LLM Client for contract intelligence operations
 */
export declare class ContractLLM {
    private apiKey;
    private model;
    private baseUrl;
    private timeout;
    private maxRetries;
    constructor(config: LLMClientConfig);
    /**
     * Extract terms from clause text using LLM
     */
    extractTerms(clauseText: string, termTypes: TermType[], context?: {
        documentType?: string;
        section?: string;
    }): Promise<LLMExtraction[]>;
    /**
     * Resolve conflicts between multiple extracted terms
     */
    resolveConflict(terms: Array<{
        term: ExtractedTerm;
        documentType?: string;
        effectiveDate?: string;
    }>, context: string): Promise<ConflictResolution>;
    /**
     * Generate explanation for an extracted term
     */
    explainExtraction(term: ExtractedTerm, clauseText: string): Promise<ExplanationResult>;
    /**
     * Detect override language in text
     */
    detectOverrideLanguage(text: string): Promise<OverrideDetection[]>;
    /**
     * Make a completion request to OpenAI
     */
    private complete;
    /**
     * Make HTTP request to OpenAI API
     */
    private makeRequest;
    /**
     * Sleep for specified milliseconds
     */
    private sleep;
    /**
     * Check if the LLM client is configured
     */
    isConfigured(): boolean;
    /**
     * Get the current model being used
     */
    getModel(): string;
    /**
     * Set the model to use (for switching between full and mini)
     */
    setModel(model: 'gpt-4.1' | 'gpt-4.1-mini' | 'gpt-4o' | 'gpt-4o-mini'): void;
}
/**
 * Create an LLM client from environment variables
 */
export declare function createContractLLM(): ContractLLM | null;
/**
 * Check if LLM is available
 */
export declare function isLLMAvailable(): boolean;
//# sourceMappingURL=client.d.ts.map