/**
 * Term Extraction
 * 
 * Rule-based and pattern-based extraction of contract terms.
 */

import type { ClauseSegment } from './segmentation.js';

export type TermType =
  | 'pricing_model'
  | 'billing_cadence'
  | 'discount'
  | 'renewal_terms'
  | 'termination_terms'
  | 'usage_caps'
  | 'payment_terms'
  | 'uplift'
  | 'auto_renew'
  | 'notice_period'
  | 'contract_value'
  | 'start_date'
  | 'end_date'
  | 'term_length';

export type ExtractionMethod = 'rule' | 'pattern' | 'llm';

export interface ExtractedTerm {
  termType: TermType;
  value: unknown;
  confidence: number; // 0.0 - 1.0
  sourceClauseIndex: number;
  extractionMethod: ExtractionMethod;
  matchedText: string;
  startOffset: number;
  endOffset: number;
}

interface ExtractionRule {
  termType: TermType;
  patterns: RegExp[];
  extractor: (match: RegExpMatchArray, text: string) => unknown;
  baseConfidence: number;
}

// ============================================
// Extraction Rules
// ============================================

const EXTRACTION_RULES: ExtractionRule[] = [
  // Pricing Model
  {
    termType: 'pricing_model',
    patterns: [
      /per\s+user\s+(?:per\s+month|monthly|\/month)/i,
      /per\s+seat\s+(?:per\s+month|monthly|\/month)/i,
      /flat\s+fee\s+of\s+\$?[\d,]+/i,
      /usage[- ]based\s+(?:pricing|billing|model)/i,
      /tiered\s+pricing/i,
      /subscription\s+fee/i,
      /license\s+fee/i,
    ],
    extractor: (match, text) => {
      const matchedText = match[0].toLowerCase();
      if (matchedText.includes('per user') || matchedText.includes('per seat')) {
        return { model: 'per_user', details: match[0] };
      }
      if (matchedText.includes('flat fee')) {
        return { model: 'flat_fee', details: match[0] };
      }
      if (matchedText.includes('usage')) {
        return { model: 'usage_based', details: match[0] };
      }
      if (matchedText.includes('tiered')) {
        return { model: 'tiered', details: match[0] };
      }
      return { model: 'custom', details: match[0] };
    },
    baseConfidence: 0.85,
  },

  // Billing Cadence
  {
    termType: 'billing_cadence',
    patterns: [
      /billed?\s+(?:on\s+)?(?:a\s+|an\s+)?monthly\s+basis/i,
      /monthly\s+(?:billing|invoic(?:e|ing))/i,
      /billed?\s+(?:on\s+)?(?:a\s+|an\s+)?quarterly\s+basis/i,
      /quarterly\s+(?:billing|invoic(?:e|ing))/i,
      /billed?\s+(?:on\s+)?(?:a\s+|an\s+)?annual(?:ly)?\s+basis/i,
      /annual(?:ly)?\s+(?:billing|invoic(?:e|ing))/i,
      /(?:invoiced?|billed?)\s+(?:annually|monthly|quarterly)/i,
      /paid\s+(?:annually|monthly|quarterly)\s+in\s+advance/i,
      /(?:fees?\s+are\s+)?billed\s+on\s+an?\s+(?:annual|monthly|quarterly)\s+basis/i,
    ],
    extractor: (match) => {
      const text = match[0].toLowerCase();
      if (text.includes('annual')) {
        return { cadence: 'annually', details: match[0] };
      }
      if (text.includes('quarter')) {
        return { cadence: 'quarterly', details: match[0] };
      }
      if (text.includes('month')) {
        return { cadence: 'monthly', details: match[0] };
      }
      return { cadence: 'monthly', details: match[0] };
    },
    baseConfidence: 0.9,
  },

  // Discount
  {
    termType: 'discount',
    patterns: [
      /(\d+(?:\.\d+)?)\s*%\s*discount/i,
      /discount\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*%/i,
      /(\d+(?:\.\d+)?)\s*%\s+off/i,
      /reduced\s+(?:by|rate\s+of)\s+(\d+(?:\.\d+)?)\s*%/i,
      /\$\s*([\d,]+(?:\.\d{2})?)\s+discount/i,
    ],
    extractor: (match) => {
      // Try to extract percentage
      const percentMatch = match[0].match(/(\d+(?:\.\d+)?)\s*%/);
      if (percentMatch) {
        return {
          percentage: parseFloat(percentMatch[1]),
          description: match[0],
        };
      }
      // Try to extract dollar amount
      const amountMatch = match[0].match(/\$\s*([\d,]+(?:\.\d{2})?)/);
      if (amountMatch) {
        return {
          amount: parseFloat(amountMatch[1].replace(/,/g, '')),
          currency: 'USD',
          description: match[0],
        };
      }
      return { description: match[0] };
    },
    baseConfidence: 0.85,
  },

  // Contract Value / Total Value
  {
    termType: 'contract_value',
    patterns: [
      /total\s+(?:contract\s+)?(?:value|amount|fee)\s*[:\s]+(?:of\s+|is\s+)?\$\s*([\d,]+(?:\.\d{2})?)/i,
      /aggregate\s+(?:fees?|value)\s+(?:of\s+|is\s+)?\$\s*([\d,]+(?:\.\d{2})?)/i,
      /annual(?:ized)?\s+(?:contract\s+)?value\s+(?:\([^)]+\)\s+)?(?:of\s+|is\s+)?\$\s*([\d,]+(?:\.\d{2})?)/i,
      /(?:acv|arr|tcv)\s+(?:of\s+|is\s+)?\$\s*([\d,]+(?:\.\d{2})?)/i,
      /\$\s*([\d,]+(?:\.\d{2})?)\s+(?:per\s+)?(?:year|annum|annually)/i,
      /annual\s+(?:license\s+)?fee\s+(?:of\s+)?\$\s*([\d,]+(?:\.\d{2})?)/i,
      /(?:license|subscription)\s+fee\s+(?:of\s+)?\$\s*([\d,]+(?:\.\d{2})?)/i,
    ],
    extractor: (match) => {
      const amountMatch = match[0].match(/\$\s*([\d,]+(?:\.\d{2})?)/);
      if (amountMatch) {
        const text = match[0].toLowerCase();
        let period: 'annually' | 'monthly' | 'total' = 'total';
        if (text.includes('annual') || text.includes('arr') || text.includes('acv') || text.includes('year')) {
          period = 'annually';
        } else if (text.includes('month')) {
          period = 'monthly';
        }
        return {
          amount: parseFloat(amountMatch[1].replace(/,/g, '')),
          currency: 'USD',
          period,
        };
      }
      return { description: match[0] };
    },
    baseConfidence: 0.8,
  },

  // Payment Terms
  {
    termType: 'payment_terms',
    patterns: [
      /net\s+(\d+)\s+days?/i,
      /payment\s+(?:is\s+)?due\s+(?:within\s+)?(\d+)\s+days?/i,
      /due\s+(?:upon|on)\s+receipt/i,
      /payable\s+(?:within\s+)?(\d+)\s+days?/i,
      /(\d+)\s+days?\s+(?:from\s+)?(?:invoice|receipt)/i,
    ],
    extractor: (match) => {
      const text = match[0].toLowerCase();
      if (text.includes('receipt')) {
        return { dueOnReceipt: true, details: match[0] };
      }
      const daysMatch = match[0].match(/(\d+)/);
      if (daysMatch) {
        return { netDays: parseInt(daysMatch[1], 10), details: match[0] };
      }
      return { details: match[0] };
    },
    baseConfidence: 0.9,
  },

  // Auto Renew / Renewal Terms
  {
    termType: 'auto_renew',
    patterns: [
      /auto(?:matically)?\s*[-\s]?renew(?:s|al|ed)?/i,
      /shall\s+(?:automatically\s+)?renew/i,
      /renewal\s+(?:shall\s+be\s+)?automatic/i,
      /(?:unless|until)\s+(?:either\s+party\s+)?(?:terminates?|cancell?(?:s|ed)?)/i,
      /evergreen\s+(?:contract|agreement|term)/i,
    ],
    extractor: (match) => {
      return { autoRenew: true, details: match[0] };
    },
    baseConfidence: 0.85,
  },

  // Renewal Terms (period)
  {
    termType: 'renewal_terms',
    patterns: [
      /renew(?:s|al)?\s+(?:for\s+)?(?:successive|additional)?\s*(\d+)\s*[-\s]?(?:year|month|day)/i,
      /renewal\s+(?:term|period)\s+(?:of\s+)?(\d+)\s*[-\s]?(?:year|month)/i,
      /(?:year|month)\s+to\s+(?:year|month)\s+renewal/i,
    ],
    extractor: (match) => {
      const text = match[0].toLowerCase();
      const periodMatch = match[0].match(/(\d+)\s*[-\s]?(year|month)/i);
      if (periodMatch) {
        const count = parseInt(periodMatch[1], 10);
        const unit = periodMatch[2].toLowerCase();
        return {
          autoRenew: true,
          renewalPeriod: `${count} ${unit}${count > 1 ? 's' : ''}`,
        };
      }
      return { autoRenew: true, details: match[0] };
    },
    baseConfidence: 0.8,
  },

  // Notice Period
  {
    termType: 'notice_period',
    patterns: [
      /(\d+)\s+days?(?:'|')?\s+(?:prior\s+)?(?:written\s+)?notice/i,
      /notice\s+(?:of\s+)?(\d+)\s+days?/i,
      /(\d+)\s+days?\s+(?:advance\s+)?(?:written\s+)?notice/i,
      /written\s+notice\s+(?:of\s+)?(?:at\s+least\s+)?(\d+)\s+days?/i,
    ],
    extractor: (match) => {
      const daysMatch = match[0].match(/(\d+)/);
      if (daysMatch) {
        return { days: parseInt(daysMatch[1], 10), description: match[0] };
      }
      return { description: match[0] };
    },
    baseConfidence: 0.85,
  },

  // Termination Terms
  {
    termType: 'termination_terms',
    patterns: [
      /terminat(?:e|ion)\s+(?:this\s+)?(?:agreement\s+)?(?:for\s+)?(?:cause|convenience)/i,
      /(?:either\s+party\s+)?may\s+terminate\s+(?:this\s+)?(?:agreement\s+)?(?:for\s+)?(?:cause|convenience)/i,
      /termination\s+(?:without\s+cause|for\s+breach)/i,
      /right\s+to\s+terminate/i,
      /terminat(?:e|ion)\s+upon\s+(\d+)\s+days?/i,
      /may\s+terminate\s+for\s+cause/i,
    ],
    extractor: (match) => {
      const text = match[0].toLowerCase();
      return {
        terminationForCause: text.includes('cause') || text.includes('breach'),
        terminationForConvenience: text.includes('convenience') || (text.includes('either party') && !text.includes('cause')),
        details: match[0],
      };
    },
    baseConfidence: 0.8,
  },

  // Term Length
  {
    termType: 'term_length',
    patterns: [
      /(?:initial\s+)?term\s+(?:of\s+)?(?:this\s+)?(?:agreement\s+)?(?:is\s+)?(\d+)\s*[-\s]?(?:year|month)/i,
      /(\d+)\s*[-\s]?(?:year|month)\s+(?:initial\s+)?(?:term|agreement|contract)/i,
      /(?:agreement|contract)\s+(?:term|period)\s+(?:of\s+)?(\d+)\s*[-\s]?(?:year|month)/i,
      /effective\s+for\s+(?:a\s+period\s+of\s+)?(\d+)\s*[-\s]?(?:year|month)/i,
      /(?:initial\s+)?term\s+(?:of|is)\s+(\d+)\s*[-\s]?(?:year|month)/i,
    ],
    extractor: (match) => {
      const periodMatch = match[0].match(/(\d+)\s*[-\s]?(year|month)/i);
      if (periodMatch) {
        const count = parseInt(periodMatch[1], 10);
        const unit = periodMatch[2].toLowerCase();
        if (unit.includes('year')) {
          return { years: count, description: match[0] };
        }
        return { months: count, description: match[0] };
      }
      return { description: match[0] };
    },
    baseConfidence: 0.85,
  },

  // Start Date
  {
    termType: 'start_date',
    patterns: [
      /(?:effective|start|commence(?:ment)?)\s+date[:\s]+(\w+\s+\d{1,2},?\s+\d{4})/i,
      /(?:effective|start)\s+(?:as\s+of\s+)?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(?:commencing|beginning)\s+(?:on\s+)?(\w+\s+\d{1,2},?\s+\d{4})/i,
    ],
    extractor: (match) => {
      const dateMatch = match[1] || match[0].match(/(\w+\s+\d{1,2},?\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/)?.[1];
      if (dateMatch) {
        return { date: dateMatch };
      }
      return { description: match[0] };
    },
    baseConfidence: 0.8,
  },

  // End Date
  {
    termType: 'end_date',
    patterns: [
      /(?:end|expir(?:ation|es?)|terminat(?:e|ion))\s+date[:\s]+(\w+\s+\d{1,2},?\s+\d{4})/i,
      /(?:expires?|ends?)\s+(?:on\s+)?(\w+\s+\d{1,2},?\s+\d{4})/i,
      /(?:expires?|ends?)\s+(?:on\s+)?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /through\s+(\w+\s+\d{1,2},?\s+\d{4})/i,
    ],
    extractor: (match) => {
      const dateMatch = match[1] || match[0].match(/(\w+\s+\d{1,2},?\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/)?.[1];
      if (dateMatch) {
        return { date: dateMatch };
      }
      return { description: match[0] };
    },
    baseConfidence: 0.8,
  },

  // Usage Caps
  {
    termType: 'usage_caps',
    patterns: [
      /(?:up\s+to|maximum\s+of|limit\s+of)\s+([\d,]+)\s+(?:users?|seats?|licenses?)/i,
      /([\d,]+)\s+(?:user|seat|license)\s+(?:limit|cap|maximum)/i,
      /(?:not\s+to\s+exceed|capped\s+at)\s+([\d,]+)/i,
    ],
    extractor: (match) => {
      const amountMatch = match[0].match(/([\d,]+)/);
      if (amountMatch) {
        return {
          amount: parseInt(amountMatch[1].replace(/,/g, ''), 10),
          description: match[0],
        };
      }
      return { description: match[0] };
    },
    baseConfidence: 0.75,
  },

  // Uplift / Price Increase
  {
    termType: 'uplift',
    patterns: [
      /(?:annual\s+)?(?:price\s+)?(?:increase|uplift)\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*%/i,
      /(?:prices?\s+)?(?:may\s+)?increase\s+(?:by\s+)?(?:up\s+to\s+)?(\d+(?:\.\d+)?)\s*%/i,
      /(\d+(?:\.\d+)?)\s*%\s+(?:annual\s+)?(?:price\s+)?(?:increase|uplift)/i,
      /cpi\s+(?:adjustment|increase|uplift)/i,
      /increase\s+fees?\s+(?:by\s+)?(?:up\s+to\s+)?(\d+(?:\.\d+)?)\s*%/i,
      /(?:may\s+)?increase\s+(?:fees?\s+)?by\s+(?:up\s+to\s+)?(\d+(?:\.\d+)?)\s*%\s*annually/i,
    ],
    extractor: (match) => {
      const percentMatch = match[0].match(/(\d+(?:\.\d+)?)\s*%/);
      if (percentMatch) {
        return {
          percentage: parseFloat(percentMatch[1]),
          description: match[0],
        };
      }
      if (match[0].toLowerCase().includes('cpi')) {
        return { percentage: null, cpiLinked: true, description: match[0] };
      }
      return { description: match[0] };
    },
    baseConfidence: 0.8,
  },
];

/**
 * Extract terms from clause segments
 */
export function extractTerms(clauses: ClauseSegment[]): ExtractedTerm[] {
  const terms: ExtractedTerm[] = [];

  for (let clauseIndex = 0; clauseIndex < clauses.length; clauseIndex++) {
    const clause = clauses[clauseIndex];
    const clauseTerms = extractTermsFromClause(clause.text, clauseIndex, clause.startOffset);
    terms.push(...clauseTerms);
  }

  // Deduplicate terms of the same type, keeping highest confidence
  return deduplicateTerms(terms);
}

/**
 * Extract terms from a single clause text
 */
function extractTermsFromClause(
  text: string,
  clauseIndex: number,
  clauseStartOffset: number
): ExtractedTerm[] {
  const terms: ExtractedTerm[] = [];

  for (const rule of EXTRACTION_RULES) {
    for (const pattern of rule.patterns) {
      const match = text.match(pattern);
      if (match && match.index !== undefined) {
        const value = rule.extractor(match, text);
        
        // Calculate confidence based on match quality
        let confidence = rule.baseConfidence;
        
        // Boost confidence for longer matches (more context)
        if (match[0].length > 30) {
          confidence = Math.min(1, confidence + 0.05);
        }
        
        // Reduce confidence for very short matches
        if (match[0].length < 10) {
          confidence = Math.max(0.3, confidence - 0.1);
        }

        terms.push({
          termType: rule.termType,
          value,
          confidence,
          sourceClauseIndex: clauseIndex,
          extractionMethod: 'pattern',
          matchedText: match[0],
          startOffset: clauseStartOffset + match.index,
          endOffset: clauseStartOffset + match.index + match[0].length,
        });
      }
    }
  }

  return terms;
}

/**
 * Deduplicate terms, keeping the highest confidence for each term type
 */
function deduplicateTerms(terms: ExtractedTerm[]): ExtractedTerm[] {
  const termsByType = new Map<TermType, ExtractedTerm[]>();

  for (const term of terms) {
    const existing = termsByType.get(term.termType) || [];
    existing.push(term);
    termsByType.set(term.termType, existing);
  }

  const result: ExtractedTerm[] = [];

  for (const [termType, typeTerms] of termsByType) {
    // Sort by confidence descending
    typeTerms.sort((a, b) => b.confidence - a.confidence);
    
    // Take the best match for each term type
    // Could be extended to keep multiple if they represent different values
    result.push(typeTerms[0]);
  }

  return result;
}

/**
 * Extract terms directly from text (without pre-segmented clauses)
 */
export function extractTermsFromText(text: string): ExtractedTerm[] {
  // Create a single pseudo-clause for the entire text
  const pseudoClause: ClauseSegment = {
    type: 'paragraph',
    label: null,
    text,
    startOffset: 0,
    endOffset: text.length,
    pageNumber: null,
    sequenceNumber: 0,
    parentIndex: null,
  };

  return extractTerms([pseudoClause]);
}

/**
 * Get all supported term types
 */
export function getSupportedTermTypes(): TermType[] {
  return [...new Set(EXTRACTION_RULES.map(r => r.termType))];
}

/**
 * Check if a term type is supported for extraction
 */
export function isTermTypeSupported(termType: string): termType is TermType {
  return getSupportedTermTypes().includes(termType as TermType);
}
