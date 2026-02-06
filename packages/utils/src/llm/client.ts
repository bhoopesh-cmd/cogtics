/**
 * LLM Client for Contract Intelligence
 * 
 * OpenAI GPT-4.1 integration for contract parsing, term extraction,
 * conflict resolution, and explanations.
 */

import type { TermType, ExtractedTerm } from '../contracts/extraction.js';
import {
  ExtractTermsResponseSchema,
  ConflictResolutionSchema,
  DetectOverrideResponseSchema,
  safeParseLLMResponse,
} from './schemas.js';

// OpenAI types (simplified - actual types would come from openai package)
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAICompletionOptions {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
}

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
export class ContractLLM {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;

  constructor(config: LLMClientConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-4.1-mini';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
  }

  /**
   * Extract terms from clause text using LLM
   */
  async extractTerms(
    clauseText: string,
    termTypes: TermType[],
    context?: { documentType?: string; section?: string }
  ): Promise<LLMExtraction[]> {
    const systemPrompt = `You are a contract analyst specializing in extracting structured data from legal agreements.
Extract the requested terms from the provided clause text.
Return a JSON object with an "extractions" array containing the found terms.
For each term, provide:
- termType: The type of term (must match one of the requested types)
- value: The extracted value (structured appropriately for the term type)
- confidence: A number 0.0-1.0 indicating extraction confidence
- matchedText: The exact text that supports this extraction
- reasoning: Brief explanation of why this is correct

Only extract terms you find clear evidence for. Do not hallucinate or guess.
If a requested term is not found, do not include it in the response.`;

    const userPrompt = `Extract the following term types from this clause:
Term types: ${termTypes.join(', ')}

${context?.documentType ? `Document type: ${context.documentType}` : ''}
${context?.section ? `Section: ${context.section}` : ''}

Clause text:
"""
${clauseText}
"""

Return JSON with format: { "extractions": [...] }`;

    const response = await this.complete(systemPrompt, userPrompt, { json: true });
    
    // Validate response with Zod schema
    const parsed = safeParseLLMResponse(ExtractTermsResponseSchema, response, { extractions: [] });
    return (parsed?.extractions || []) as LLMExtraction[];
  }

  /**
   * Resolve conflicts between multiple extracted terms
   */
  async resolveConflict(
    terms: Array<{ term: ExtractedTerm; documentType?: string; effectiveDate?: string }>,
    context: string
  ): Promise<ConflictResolution> {
    const systemPrompt = `You are a contract analyst resolving conflicts between contract terms.
Given multiple conflicting terms, determine which one should take precedence.
Apply these precedence rules in order:
1. Explicit override language ("Notwithstanding", "Except as", "Prevails")
2. Most recent effective date
3. Document hierarchy (Amendment > Order Form > MSA > SOW)
4. Specificity (product-specific > general)
5. Later clause within same document

Return a JSON object with:
- winningTermIndex: The 0-based index of the winning term
- reasoning: Explanation of why this term wins
- confidence: 0.0-1.0 confidence score
- appliedRules: Array of rule names that were applied
- suggestedAction: "accept" if high confidence, "review" if medium, "reject" if unclear`;

    const userPrompt = `Resolve this conflict between ${terms.length} terms:

${terms.map((t, i) => `
Term ${i}:
- Type: ${t.term.termType}
- Value: ${JSON.stringify(t.term.value)}
- Document Type: ${t.documentType || 'unknown'}
- Effective Date: ${t.effectiveDate || 'unknown'}
- Matched Text: "${t.term.matchedText}"
`).join('\n')}

Context from document:
"""
${context}
"""

Return JSON with the resolution.`;

    const response = await this.complete(systemPrompt, userPrompt, { json: true });
    
    // Validate response with Zod schema
    const fallback: ConflictResolution = {
      winningTermIndex: 0,
      reasoning: 'Failed to parse LLM response',
      confidence: 0.1,
      appliedRules: [],
      suggestedAction: 'review',
    };
    const parsed = safeParseLLMResponse(ConflictResolutionSchema, response, fallback);
    return parsed || fallback;
  }

  /**
   * Generate explanation for an extracted term
   */
  async explainExtraction(term: ExtractedTerm, clauseText: string): Promise<ExplanationResult> {
    const systemPrompt = `You are a contract analyst explaining extracted terms to business users.
Provide a clear, non-legal explanation of what the extracted term means for the business.
Focus on practical implications, risks, and action items.`;

    const userPrompt = `Explain this extracted contract term:

Term Type: ${term.termType}
Extracted Value: ${JSON.stringify(term.value)}
Source Text: "${term.matchedText}"
Confidence: ${(term.confidence * 100).toFixed(0)}%

Full clause:
"""
${clauseText}
"""

Provide:
1. A plain-English explanation (2-3 sentences)
2. Why the confidence level is ${term.confidence > 0.8 ? 'high' : term.confidence > 0.5 ? 'medium' : 'low'}
3. What source text supports this extraction`;

    const response = await this.complete(systemPrompt, userPrompt);
    
    return {
      explanation: response,
      confidence: term.confidence > 0.8 ? 'high' : term.confidence > 0.5 ? 'medium' : 'low',
      sources: [term.matchedText],
    };
  }

  /**
   * Detect override language in text
   */
  async detectOverrideLanguage(text: string): Promise<OverrideDetection[]> {
    const systemPrompt = `You are a contract analyst identifying precedence and override language.
Find clauses that establish which terms take priority over others.
Look for patterns like:
- "Notwithstanding anything in Section X..."
- "Except as expressly stated in..."
- "This Order Form shall prevail over..."
- "In the event of a conflict..."
- "The terms of this Amendment supersede..."`;

    const userPrompt = `Find all override/precedence language in this text:

"""
${text}
"""

Return JSON with format: { "overrides": [{ "type": "...", "matchedText": "...", "targetSection": "...", "confidence": 0.0-1.0 }] }`;

    const response = await this.complete(systemPrompt, userPrompt, { json: true });
    
    // Validate response with Zod schema
    const parsed = safeParseLLMResponse(DetectOverrideResponseSchema, response, { overrides: [] });
    return (parsed?.overrides || []).map((o) => ({
      type: o.type || 'controls',
      matchedText: o.matchedText || '',
      targetSection: o.targetSection,
      confidence: o.confidence || 0.7,
      startOffset: text.indexOf(o.matchedText || ''),
      endOffset: text.indexOf(o.matchedText || '') + (o.matchedText?.length || 0),
    }));
  }

  /**
   * Make a completion request to OpenAI
   */
  private async complete(
    systemPrompt: string,
    userPrompt: string,
    options?: { json?: boolean; temperature?: number }
  ): Promise<string> {
    const messages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const requestBody: OpenAICompletionOptions = {
      model: this.model,
      messages,
      temperature: options?.temperature ?? 0.1,
      max_tokens: 4096,
    };

    if (options?.json) {
      requestBody.response_format = { type: 'json_object' };
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest(requestBody);
        return response;
      } catch (error) {
        lastError = error as Error;
        
        // Exponential backoff
        if (attempt < this.maxRetries - 1) {
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError || new Error('LLM request failed');
  }

  /**
   * Make HTTP request to OpenAI API
   */
  private async makeRequest(body: OpenAICompletionOptions): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${error}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if the LLM client is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }

  /**
   * Get the current model being used
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Set the model to use (for switching between full and mini)
   */
  setModel(model: 'gpt-4.1' | 'gpt-4.1-mini' | 'gpt-4o' | 'gpt-4o-mini'): void {
    this.model = model;
  }
}

/**
 * Create an LLM client from environment variables
 */
export function createContractLLM(): ContractLLM | null {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return null;
  }

  return new ContractLLM({
    apiKey,
    model: (process.env.OPENAI_MODEL as any) || 'gpt-4o-mini',
  });
}

/**
 * Check if LLM is available
 */
export function isLLMAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
