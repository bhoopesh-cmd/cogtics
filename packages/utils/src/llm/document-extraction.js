/**
 * LLM-Powered Document Extraction
 *
 * Uses OpenAI Vision API for:
 * 1. OCR fallback for scanned PDFs
 * 2. Direct structured extraction from documents
 */
import { createContractLLM } from './client.js';
import { StructuredContractDataSchema, safeParseLLMResponse } from './schemas.js';
const EXTRACTION_SYSTEM_PROMPT = `You are a contract analysis expert. Extract structured information from contract documents.

Return a JSON object with the following structure:
{
  "documentType": "msa" | "order_form" | "amendment" | "sow" | "addendum" | "other",
  "parties": {
    "customer": { "name": "...", "type": "company" | "individual", "address": "...", "jurisdiction": "..." },
    "vendor": { "name": "...", "type": "company" | "individual", "address": "...", "jurisdiction": "..." }
  },
  "dates": {
    "effectiveDate": "YYYY-MM-DD",
    "expirationDate": "YYYY-MM-DD",
    "signedDate": "YYYY-MM-DD"
  },
  "financials": {
    "contractValue": { "amount": 50000, "currency": "USD", "period": "annually" },
    "paymentTerms": "Net 30",
    "billingCadence": "monthly" | "quarterly" | "annually",
    "discount": { "percentage": 10, "amount": null }
  },
  "terms": {
    "termLength": "12 months",
    "autoRenew": true,
    "noticePeriod": "90 days",
    "terminationTerms": "Either party may terminate with 30 days notice for cause"
  },
  "products": [
    { "name": "Enterprise License", "quantity": 100, "unitPrice": { "amount": 500, "currency": "USD" }, "description": "..." }
  ],
  "rawTerms": [
    { "type": "contract_value", "value": { "amount": 50000, "currency": "USD" }, "matchedText": "$50,000 annually", "confidence": 0.95 }
  ],
  "summary": "A 12-month MSA between Vendor and Customer for $50,000 annually with auto-renewal."
}

Rules:
- Extract ALL financial amounts mentioned
- Identify ALL products/services with their pricing
- Dates must be in YYYY-MM-DD format
- Include confidence scores (0.0-1.0) for extracted terms
- If a value is unclear, omit it rather than guess
- For rawTerms, include any additional contract terms not covered by the main structure`;
const OCR_SYSTEM_PROMPT = `You are a document OCR specialist. Extract all text from the provided document image.

Instructions:
1. Extract ALL visible text from the document
2. Preserve the document structure (sections, paragraphs, lists)
3. Maintain table formatting where possible
4. Note any areas that are unclear or unreadable
5. Return plain text, not JSON`;
/**
 * Extract structured data directly from a document image using GPT-4 Vision
 */
export async function extractStructuredFromImage(imageBase64, mimeType = 'image/png', llmClient) {
    const client = llmClient || createContractLLM();
    if (!client) {
        return {
            success: false,
            ocrUsed: true,
            model: 'none',
            error: 'LLM not configured. Set OPENAI_API_KEY environment variable.',
        };
    }
    try {
        // Use GPT-4 Vision for structured extraction
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o', // Vision-capable model
                messages: [
                    {
                        role: 'system',
                        content: EXTRACTION_SYSTEM_PROMPT,
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Extract all contract information from this document image and return as structured JSON.',
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${mimeType};base64,${imageBase64}`,
                                    detail: 'high',
                                },
                            },
                        ],
                    },
                ],
                max_tokens: 4096,
                temperature: 0,
                response_format: { type: 'json_object' },
            }),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI API error: ${error}`);
        }
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error('Empty response from OpenAI');
        }
        // Validate response with Zod schema
        const structuredData = safeParseLLMResponse(StructuredContractDataSchema, content);
        if (!structuredData) {
            throw new Error('Failed to parse structured contract data from response');
        }
        return {
            success: true,
            structuredData: structuredData,
            ocrUsed: true,
            model: 'gpt-4o',
            tokensUsed: data.usage?.total_tokens,
        };
    }
    catch (error) {
        return {
            success: false,
            ocrUsed: true,
            model: 'gpt-4o',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
/**
 * OCR: Extract raw text from a document image
 */
export async function extractTextFromImage(imageBase64, mimeType = 'image/png') {
    if (!process.env.OPENAI_API_KEY) {
        return {
            success: false,
            ocrUsed: true,
            model: 'none',
            error: 'OPENAI_API_KEY not configured',
        };
    }
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini', // Cheaper model for OCR
                messages: [
                    {
                        role: 'system',
                        content: OCR_SYSTEM_PROMPT,
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Extract all text from this document image.',
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${mimeType};base64,${imageBase64}`,
                                    detail: 'high',
                                },
                            },
                        ],
                    },
                ],
                max_tokens: 4096,
                temperature: 0,
            }),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI API error: ${error}`);
        }
        const data = await response.json();
        const extractedText = data.choices?.[0]?.message?.content || '';
        return {
            success: true,
            extractedText,
            ocrUsed: true,
            model: 'gpt-4o-mini',
            tokensUsed: data.usage?.total_tokens,
        };
    }
    catch (error) {
        return {
            success: false,
            ocrUsed: true,
            model: 'gpt-4o-mini',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
/**
 * Extract structured data from existing text using LLM
 */
export async function extractStructuredFromText(text, documentType, llmClient) {
    const client = llmClient || createContractLLM();
    if (!client) {
        return {
            success: false,
            ocrUsed: false,
            model: 'none',
            error: 'LLM not configured',
        };
    }
    try {
        // Truncate very long texts
        const truncatedText = text.length > 30000 ? text.substring(0, 30000) + '\n\n[Document truncated...]' : text;
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: EXTRACTION_SYSTEM_PROMPT,
                    },
                    {
                        role: 'user',
                        content: `Extract structured contract information from this ${documentType || 'contract'} document:\n\n${truncatedText}`,
                    },
                ],
                max_tokens: 4096,
                temperature: 0,
                response_format: { type: 'json_object' },
            }),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI API error: ${error}`);
        }
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error('Empty response from OpenAI');
        }
        // Validate response with Zod schema
        const structuredData = safeParseLLMResponse(StructuredContractDataSchema, content);
        if (!structuredData) {
            throw new Error('Failed to parse structured contract data from response');
        }
        return {
            success: true,
            extractedText: text,
            structuredData: structuredData,
            ocrUsed: false,
            model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
            tokensUsed: data.usage?.total_tokens,
        };
    }
    catch (error) {
        return {
            success: false,
            ocrUsed: false,
            model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
/**
 * Check if LLM/OCR features are available
 * Only requires OPENAI_API_KEY - uses GPT-4 Vision for both text extraction and OCR
 */
export function isLLMExtractionEnabled() {
    return !!process.env.OPENAI_API_KEY;
}
/**
 * Alias for isLLMExtractionEnabled - OCR uses GPT-4 Vision
 */
export function isOCRFallbackEnabled() {
    return !!process.env.OPENAI_API_KEY;
}
//# sourceMappingURL=document-extraction.js.map