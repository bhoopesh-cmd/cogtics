/**
 * LLM Prompts for Contract Intelligence
 * 
 * Structured prompts for term extraction, conflict resolution,
 * and contract analysis.
 */

import type { TermType } from '../contracts/extraction.js';

// ============================================
// System Prompts
// ============================================

export const SYSTEM_PROMPTS = {
  termExtraction: `You are an expert contract analyst specializing in extracting structured data from legal agreements.
Your task is to identify and extract specific contract terms with high precision.

Key principles:
1. Only extract terms you find clear evidence for - never hallucinate or guess
2. Provide exact text matches as evidence for each extraction
3. Assign confidence scores based on clarity of the language
4. Consider context and surrounding clauses for interpretation
5. Flag ambiguous language with lower confidence scores

For each term found, structure your response with:
- termType: The specific type of term being extracted
- value: The structured value (format depends on term type)
- confidence: 0.0-1.0 based on language clarity
- matchedText: Exact text that supports this extraction
- reasoning: Brief explanation of your interpretation`,

  conflictResolution: `You are a contract analyst resolving conflicts between overlapping or contradictory contract terms.
Apply standard legal precedence rules in this order:

1. EXPLICIT OVERRIDE: Language like "Notwithstanding", "Except as", "prevails", "controls"
2. EFFECTIVE DATE: More recent effective date takes precedence
3. DOCUMENT HIERARCHY: Amendment > Order Form > MSA/Framework > SOW
4. SPECIFICITY: Product-specific terms override general terms
5. CLAUSE ORDER: Later clause in same document wins if conflict

Important:
- Never auto-select silently when genuine ambiguity exists
- Suggest human review for close calls (confidence < 0.7)
- Document which rules you applied and why
- Consider business context and typical industry practice`,

  partyExtraction: `You are a contract analyst identifying parties to an agreement.
Look for:
1. Signature blocks and signature pages
2. Preamble/recitals ("This Agreement is between...")
3. Definition sections defining "Customer", "Vendor", etc.
4. Letterheads and company information
5. "Customer", "Licensor", "Provider" definitions

For each party, identify:
- Legal entity name (full corporate name)
- Role in the agreement (customer, vendor, etc.)
- Any aliases or defined terms used for this party`,

  documentAnalysis: `You are a contract analyst providing a high-level summary of a contract document.
Identify:
1. Document type (MSA, Order Form, Amendment, SOW, etc.)
2. Key dates (effective, expiration, renewal)
3. Total contract value and payment terms
4. Key obligations and deliverables
5. Unusual or notable terms that require attention
6. Potential risks or red flags`,
};

// ============================================
// User Prompt Templates
// ============================================

/**
 * Generate a term extraction prompt
 */
export function termExtractionPrompt(
  clauseText: string,
  termTypes: TermType[],
  options?: {
    documentType?: string;
    sectionHeading?: string;
    precedingContext?: string;
  }
): string {
  let prompt = `Extract the following term types from this contract clause:

**Term types to extract:** ${termTypes.join(', ')}

`;

  if (options?.documentType) {
    prompt += `**Document type:** ${options.documentType}\n`;
  }
  if (options?.sectionHeading) {
    prompt += `**Section:** ${options.sectionHeading}\n`;
  }
  if (options?.precedingContext) {
    prompt += `**Preceding context:**
\`\`\`
${options.precedingContext}
\`\`\`

`;
  }

  prompt += `**Clause text:**
\`\`\`
${clauseText}
\`\`\`

Return a JSON object with this structure:
{
  "extractions": [
    {
      "termType": "...",
      "value": { ... },
      "confidence": 0.0-1.0,
      "matchedText": "exact quote from clause",
      "reasoning": "why this extraction is correct"
    }
  ]
}

Only include terms you find clear evidence for. Do not guess or infer.`;

  return prompt;
}

/**
 * Generate a conflict resolution prompt
 */
export function conflictResolutionPrompt(
  conflicts: Array<{
    termType: string;
    value: unknown;
    source: string;
    documentType?: string;
    effectiveDate?: string;
    matchedText: string;
  }>,
  context?: string
): string {
  let prompt = `Resolve this conflict between ${conflicts.length} terms of type "${conflicts[0].termType}":

`;

  conflicts.forEach((c, i) => {
    prompt += `**Term ${i + 1}:**
- Source: ${c.source}
- Document Type: ${c.documentType || 'Unknown'}
- Effective Date: ${c.effectiveDate || 'Unknown'}
- Value: ${JSON.stringify(c.value)}
- Text: "${c.matchedText}"

`;
  });

  if (context) {
    prompt += `**Additional Context:**
\`\`\`
${context}
\`\`\`

`;
  }

  prompt += `Apply precedence rules and return JSON:
{
  "winningTermIndex": 0-based index of winning term,
  "reasoning": "explanation of decision",
  "confidence": 0.0-1.0,
  "appliedRules": ["rule1", "rule2"],
  "suggestedAction": "accept" | "review" | "reject"
}`;

  return prompt;
}

/**
 * Generate a party extraction prompt
 */
export function partyExtractionPrompt(
  documentText: string,
  section?: 'preamble' | 'signatures' | 'definitions' | 'all'
): string {
  return `Identify all parties to this agreement:

**Section to analyze:** ${section || 'all'}

**Document text:**
\`\`\`
${documentText.substring(0, 8000)}
\`\`\`

Return JSON:
{
  "parties": [
    {
      "name": "Full legal entity name",
      "role": "customer" | "vendor" | "affiliate" | "other",
      "aliases": ["other names/terms used for this party"],
      "confidence": 0.0-1.0,
      "evidence": "text that identifies this party"
    }
  ]
}`;
}

/**
 * Generate a document analysis prompt
 */
export function documentAnalysisPrompt(
  documentText: string,
  options?: {
    focusAreas?: string[];
    maxLength?: number;
  }
): string {
  const text = documentText.substring(0, options?.maxLength || 15000);
  
  let prompt = `Analyze this contract document and provide a structured summary:

`;

  if (options?.focusAreas && options.focusAreas.length > 0) {
    prompt += `**Focus on these areas:** ${options.focusAreas.join(', ')}

`;
  }

  prompt += `**Document text:**
\`\`\`
${text}
\`\`\`

Return JSON:
{
  "documentType": "msa" | "order_form" | "amendment" | "sow" | "other",
  "parties": {
    "customer": "name or null",
    "vendor": "name or null"
  },
  "keyDates": {
    "effectiveDate": "date or null",
    "expirationDate": "date or null",
    "termLength": "description or null"
  },
  "financials": {
    "totalValue": "amount or null",
    "currency": "USD/EUR/etc.",
    "paymentTerms": "description"
  },
  "keyTerms": ["list of notable terms"],
  "risks": ["potential issues or concerns"],
  "summary": "2-3 sentence summary"
}`;

  return prompt;
}

/**
 * Generate an override detection prompt
 */
export function overrideDetectionPrompt(text: string): string {
  return `Identify all precedence and override language in this contract text:

**Text to analyze:**
\`\`\`
${text}
\`\`\`

Look for patterns like:
- "Notwithstanding anything in Section X..."
- "Except as expressly stated..."
- "In the event of conflict..."
- "This Order Form shall control/prevail..."
- "The terms herein supersede..."

Return JSON:
{
  "overrides": [
    {
      "type": "notwithstanding" | "except_as" | "prevails_over" | "controls" | "supersedes",
      "matchedText": "exact text containing the override",
      "targetSection": "section being overridden, if specified",
      "confidence": 0.0-1.0
    }
  ]
}`;
}

/**
 * Generate a validation prompt for extracted terms
 */
export function validationPrompt(
  terms: Array<{ termType: string; value: unknown; matchedText: string }>
): string {
  return `Validate these extracted contract terms for logical consistency:

**Extracted terms:**
${terms.map((t, i) => `${i + 1}. ${t.termType}: ${JSON.stringify(t.value)}
   Source: "${t.matchedText}"`).join('\n\n')}

Check for:
1. Date consistency (end after start, renewal within term)
2. Financial consistency (discounts < 100%, values > 0)
3. Term conflicts (contradictory values for same type)
4. Logical issues (e.g., 0 quantity, negative prices)

Return JSON:
{
  "isValid": true/false,
  "issues": [
    {
      "termIndex": 0-based index,
      "issue": "description of problem",
      "severity": "error" | "warning" | "info",
      "suggestion": "how to resolve"
    }
  ]
}`;
}

// ============================================
// Term-Specific Value Formats
// ============================================

export const TERM_VALUE_FORMATS: Record<TermType, string> = {
  pricing_model: '{ "model": "per_user|flat_fee|usage_based|tiered|hybrid", "details": "..." }',
  billing_cadence: '{ "cadence": "monthly|quarterly|annually|one_time", "details": "..." }',
  discount: '{ "percentage": number, "amount": number, "currency": "USD", "description": "..." }',
  contract_value: '{ "amount": number, "currency": "USD", "period": "monthly|annually|total" }',
  payment_terms: '{ "netDays": number, "dueOnReceipt": boolean, "details": "..." }',
  uplift: '{ "percentage": number, "cpiLinked": boolean, "description": "..." }',
  start_date: '{ "date": "YYYY-MM-DD or description" }',
  end_date: '{ "date": "YYYY-MM-DD or description" }',
  term_length: '{ "months": number, "years": number, "description": "..." }',
  billing_start_date: '{ "date": "YYYY-MM-DD or description" }',
  renewal_terms: '{ "autoRenew": boolean, "renewalPeriod": "...", "noticePeriodDays": number }',
  termination_terms: '{ "forCause": boolean, "forConvenience": boolean, "noticeDays": number }',
  auto_renew: '{ "autoRenew": boolean, "details": "..." }',
  notice_period: '{ "days": number, "description": "..." }',
  early_termination_fee: '{ "amount": number, "currency": "USD", "formula": "..." }',
  termination_notice_period: '{ "days": number, "description": "..." }',
  usage_caps: '{ "amount": number, "unit": "users|seats|etc.", "description": "..." }',
  quantity: '{ "quantity": number, "unit": "users|seats|licenses" }',
  min_commit: '{ "amount": number, "currency": "USD" }',
  usage_metric: '{ "metric": "...", "unit": "..." }',
  overage_rate: '{ "amount": number, "currency": "USD", "unit": "..." }',
  unit_price: '{ "amount": number, "currency": "USD", "unit": "..." }',
  currency: '{ "currency": "USD|EUR|GBP|..." }',
  tiered_pricing: '{ "tiers": [{ "min": n, "max": n, "price": n }], "description": "..." }',
  ramp_pricing: '{ "schedule": [{ "period": "...", "price": n }], "description": "..." }',
  credits: '{ "amount": number, "currency": "USD", "type": "one-time|recurring" }',
  implementation_fee: '{ "amount": number, "currency": "USD", "isOneTime": boolean }',
  deposit: '{ "amount": number, "currency": "USD", "refundable": boolean }',
  mfn_clause: '{ "hasMFN": boolean, "description": "..." }',
  discount_start: '{ "date": "YYYY-MM-DD" }',
  discount_end: '{ "date": "YYYY-MM-DD" }',
  discount_cap: '{ "amount": number, "currency": "USD" }',
  discount_stacking: '{ "allowed": boolean, "description": "..." }',
  proration_rule: '{ "hasProration": boolean, "description": "..." }',
  invoicing_timing: '{ "timing": "advance|arrears", "description": "..." }',
  tax_treatment: '{ "included": boolean, "excluded": boolean, "exempt": boolean }',
  withholding_tax: '{ "percentage": number, "description": "..." }',
  jurisdiction: '{ "jurisdiction": "state/country name" }',
  true_up_clause: '{ "hasTrueUp": boolean, "frequency": "...", "description": "..." }',
  reconciliation_period: '{ "period": "monthly|quarterly|annually", "description": "..." }',
  party_customer: '{ "name": "...", "role": "customer" }',
  party_vendor: '{ "name": "...", "role": "vendor" }',
  party_affiliate: '{ "name": "...", "role": "affiliate" }',
};
