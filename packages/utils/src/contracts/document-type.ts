/**
 * Document Type Detection
 * 
 * Detects the type of contract document (MSA, Order Form, Amendment, etc.)
 * based on content patterns, structure, and naming conventions.
 */

export type DocumentType = 
  | 'msa' 
  | 'order_form' 
  | 'amendment' 
  | 'sow' 
  | 'addendum' 
  | 'exhibit' 
  | 'schedule' 
  | 'renewal' 
  | 'termination' 
  | 'other';

export interface DocumentTypeDetection {
  documentType: DocumentType;
  confidence: number;
  matchedPatterns: string[];
  suggestedTypes: Array<{ type: DocumentType; confidence: number }>;
}

interface DetectionPattern {
  type: DocumentType;
  patterns: RegExp[];
  titlePatterns: RegExp[];
  weight: number;
}

// Detection patterns ordered by specificity
const DETECTION_PATTERNS: DetectionPattern[] = [
  {
    type: 'amendment',
    patterns: [
      /\b(?:first|second|third|\d+(?:st|nd|rd|th))\s+amendment\b/i,
      /\bamendment\s+(?:no\.?|number|#)\s*\d+/i,
      /\bamendment\s+to\s+(?:the\s+)?(?:master\s+)?(?:service\s+)?agreement/i,
      /\bmodification\s+(?:of|to)\s+(?:the\s+)?agreement/i,
      /\bsupplemental\s+agreement/i,
      /\bcontract\s+modification/i,
    ],
    titlePatterns: [
      /^amendment/i,
      /^contract\s+amendment/i,
      /^modification/i,
    ],
    weight: 1.0,
  },
  {
    type: 'order_form',
    patterns: [
      /\border\s+form\b/i,
      /\border\s+schedule\b/i,
      /\bproduct\s+order\b/i,
      /\bservice\s+order\b/i,
      /\bsubscription\s+order\b/i,
      /\bpurchase\s+order\b/i,
      /\bstatement\s+of\s+fees\b/i,
      /\bpricing\s+schedule\b/i,
      /\bquote\s+(?:number|no\.?|#)/i,
    ],
    titlePatterns: [
      /^order\s+form/i,
      /^order\s+schedule/i,
      /^service\s+order/i,
      /^product\s+order/i,
    ],
    weight: 0.95,
  },
  {
    type: 'sow',
    patterns: [
      /\bstatement\s+of\s+work\b/i,
      /\bscope\s+of\s+work\b/i,
      /\bwork\s+order\b/i,
      /\bproject\s+scope\b/i,
      /\bdeliverables\s+and\s+milestones\b/i,
      /\bprofessional\s+services\s+agreement\b/i,
      /\bservices\s+description\b/i,
    ],
    titlePatterns: [
      /^statement\s+of\s+work/i,
      /^sow\b/i,
      /^scope\s+of\s+work/i,
      /^work\s+order/i,
    ],
    weight: 0.9,
  },
  {
    type: 'addendum',
    patterns: [
      /\baddendum\s+(?:to\s+)?(?:the\s+)?agreement/i,
      /\baddendum\s+(?:no\.?|number|#)\s*\d+/i,
      /\bdata\s+processing\s+addendum\b/i,
      /\bdpa\b.*\bdata\s+protection/i,
      /\bsecurity\s+addendum\b/i,
      /\bbusiness\s+associate\s+(?:agreement|addendum)\b/i,
      /\bbaa\b.*\bhipaa/i,
    ],
    titlePatterns: [
      /^addendum/i,
      /^data\s+processing/i,
      /^dpa\b/i,
    ],
    weight: 0.85,
  },
  {
    type: 'exhibit',
    patterns: [
      /\bexhibit\s+[a-z]\b/i,
      /\bexhibit\s+\d+\b/i,
      /\battachment\s+[a-z]\b/i,
      /\battachment\s+\d+\b/i,
      /\bannex\s+[a-z]\b/i,
      /\bannex\s+\d+\b/i,
    ],
    titlePatterns: [
      /^exhibit\s+[a-z0-9]/i,
      /^attachment\s+[a-z0-9]/i,
      /^annex\s+[a-z0-9]/i,
    ],
    weight: 0.8,
  },
  {
    type: 'schedule',
    patterns: [
      /\bschedule\s+[a-z]\b/i,
      /\bschedule\s+\d+\b/i,
      /\bpayment\s+schedule\b/i,
      /\bdelivery\s+schedule\b/i,
      /\bimplementation\s+schedule\b/i,
    ],
    titlePatterns: [
      /^schedule\s+[a-z0-9]/i,
    ],
    weight: 0.75,
  },
  {
    type: 'renewal',
    patterns: [
      /\brenewal\s+(?:of\s+)?(?:the\s+)?agreement/i,
      /\brenewal\s+notice/i,
      /\brenewal\s+terms/i,
      /\bcontract\s+renewal/i,
      /\bextension\s+(?:of\s+)?(?:the\s+)?agreement/i,
      /\bterm\s+extension/i,
    ],
    titlePatterns: [
      /^renewal/i,
      /^extension/i,
    ],
    weight: 0.85,
  },
  {
    type: 'termination',
    patterns: [
      /\btermination\s+(?:of\s+)?(?:the\s+)?agreement/i,
      /\btermination\s+notice/i,
      /\bnotice\s+of\s+termination/i,
      /\bcancellation\s+notice/i,
      /\bnotice\s+of\s+(?:non-?)?renewal/i,
    ],
    titlePatterns: [
      /^termination/i,
      /^notice\s+of\s+termination/i,
      /^cancellation/i,
    ],
    weight: 0.9,
  },
  {
    type: 'msa',
    patterns: [
      /\bmaster\s+(?:service[s]?\s+)?agreement\b/i,
      /\bmaster\s+subscription\s+agreement\b/i,
      /\bframework\s+agreement\b/i,
      /\bterms\s+(?:and|&)\s+conditions\b/i,
      /\bgeneral\s+terms\s+(?:and|&)\s+conditions\b/i,
      /\blicense\s+agreement\b/i,
      /\bsoftware\s+(?:as\s+a\s+)?service\s+agreement\b/i,
      /\bsaas\s+agreement\b/i,
      /\bsubscription\s+agreement\b/i,
      /\bservice\s+agreement\b/i,
      /\bend\s+user\s+license\s+agreement\b/i,
      /\beula\b/i,
      /\bterms\s+of\s+(?:service|use)\b/i,
    ],
    titlePatterns: [
      /^master\s+/i,
      /^msa\b/i,
      /^terms\s+(?:and|&)\s+conditions/i,
      /^license\s+agreement/i,
      /^subscription\s+agreement/i,
      /^service\s+agreement/i,
    ],
    weight: 0.7, // Lower weight since it's the "default" type
  },
];

/**
 * Detect document type from text content
 */
export function detectDocumentType(
  text: string,
  fileName?: string
): DocumentTypeDetection {
  const scores: Map<DocumentType, { score: number; patterns: string[] }> = new Map();
  
  // Initialize scores
  for (const pattern of DETECTION_PATTERNS) {
    scores.set(pattern.type, { score: 0, patterns: [] });
  }
  scores.set('other', { score: 0, patterns: [] });

  // Get the first 5000 characters (title area) and full text for analysis
  const titleArea = text.substring(0, 5000);
  const fullText = text;

  // Check filename patterns (strong signal)
  if (fileName) {
    const fileNameLower = fileName.toLowerCase();
    for (const pattern of DETECTION_PATTERNS) {
      for (const titlePattern of pattern.titlePatterns) {
        if (titlePattern.test(fileNameLower)) {
          const entry = scores.get(pattern.type)!;
          entry.score += 0.5 * pattern.weight; // Increased from 0.3
          entry.patterns.push(`filename: ${titlePattern.source}`);
        }
      }
    }
  }

  // Check title patterns in first part of document (very strong signal)
  for (const pattern of DETECTION_PATTERNS) {
    for (const titlePattern of pattern.titlePatterns) {
      if (titlePattern.test(titleArea)) {
        const entry = scores.get(pattern.type)!;
        entry.score += 0.6 * pattern.weight; // Increased from 0.4
        entry.patterns.push(`title: ${titlePattern.source}`);
      }
    }
  }

  // Check content patterns
  for (const pattern of DETECTION_PATTERNS) {
    for (const contentPattern of pattern.patterns) {
      const matches = fullText.match(new RegExp(contentPattern.source, 'gi'));
      if (matches && matches.length > 0) {
        const entry = scores.get(pattern.type)!;
        // Score based on number of matches, with higher base score
        // First match gives 0.3, subsequent matches add 0.1 each (up to 5)
        const matchScore = (0.3 + Math.min(matches.length - 1, 4) * 0.1) * pattern.weight;
        entry.score += matchScore;
        entry.patterns.push(`content: ${contentPattern.source} (${matches.length}x)`);
      }
    }
  }

  // Normalize scores and find the best match
  const sortedScores = Array.from(scores.entries())
    .map(([type, data]) => ({
      type,
      confidence: Math.min(data.score, 1.0),
      patterns: data.patterns,
    }))
    .sort((a, b) => b.confidence - a.confidence);

  // If no clear winner, default to 'other' with low confidence
  if (sortedScores[0].confidence < 0.1) {
    return {
      documentType: 'other',
      confidence: 0.1,
      matchedPatterns: [],
      suggestedTypes: [{ type: 'msa', confidence: 0.5 }],
    };
  }

  // Calculate relative confidence (top score vs second best)
  const topScore = sortedScores[0];
  const secondScore = sortedScores[1];
  
  // Boost confidence when we have multiple pattern matches
  let finalConfidence = topScore.confidence;
  
  // Boost for having multiple different patterns matched
  if (topScore.patterns.length >= 2) {
    finalConfidence = Math.min(finalConfidence * 1.3, 0.95);
  }
  if (topScore.patterns.length >= 3) {
    finalConfidence = Math.min(finalConfidence * 1.2, 0.95);
  }
  
  // Reduce confidence if second place is close
  if (secondScore && secondScore.confidence > 0) {
    const margin = topScore.confidence - secondScore.confidence;
    if (margin < 0.1) {
      // Close call, reduce confidence
      finalConfidence *= 0.85;
    }
  }

  return {
    documentType: topScore.type,
    confidence: Math.min(finalConfidence, 0.99),
    matchedPatterns: topScore.patterns,
    suggestedTypes: sortedScores
      .filter(s => s.confidence > 0.1 && s.type !== topScore.type)
      .slice(0, 3)
      .map(s => ({ type: s.type, confidence: s.confidence })),
  };
}

/**
 * Detect document type from filename alone
 * Useful for quick classification before text extraction
 */
export function detectDocumentTypeFromFilename(fileName: string): DocumentTypeDetection {
  const fileNameLower = fileName.toLowerCase();
  
  // Quick filename-based patterns
  const filenamePatterns: Array<{ pattern: RegExp; type: DocumentType; confidence: number }> = [
    { pattern: /amendment|modify|modification/i, type: 'amendment', confidence: 0.7 },
    { pattern: /order[_\-\s]?form|product[_\-\s]?order|service[_\-\s]?order/i, type: 'order_form', confidence: 0.7 },
    { pattern: /sow|statement[_\-\s]?of[_\-\s]?work|scope/i, type: 'sow', confidence: 0.7 },
    { pattern: /addendum|dpa|baa/i, type: 'addendum', confidence: 0.6 },
    { pattern: /exhibit[_\-\s]?[a-z0-9]/i, type: 'exhibit', confidence: 0.6 },
    { pattern: /schedule[_\-\s]?[a-z0-9]/i, type: 'schedule', confidence: 0.6 },
    { pattern: /renewal|extension/i, type: 'renewal', confidence: 0.6 },
    { pattern: /terminat|cancel/i, type: 'termination', confidence: 0.6 },
    { pattern: /msa|master|terms|license|agreement|contract/i, type: 'msa', confidence: 0.5 },
  ];

  for (const { pattern, type, confidence } of filenamePatterns) {
    if (pattern.test(fileNameLower)) {
      return {
        documentType: type,
        confidence,
        matchedPatterns: [`filename: ${pattern.source}`],
        suggestedTypes: [],
      };
    }
  }

  return {
    documentType: 'other',
    confidence: 0.1,
    matchedPatterns: [],
    suggestedTypes: [{ type: 'msa', confidence: 0.3 }],
  };
}

/**
 * Get document type precedence (lower = higher precedence)
 */
export function getDocumentTypePrecedence(type: DocumentType): number {
  const precedence: Record<DocumentType, number> = {
    'amendment': 1,
    'order_form': 2,
    'addendum': 3,
    'msa': 4,
    'sow': 5,
    'exhibit': 6,
    'schedule': 7,
    'renewal': 8,
    'termination': 9,
    'other': 10,
  };
  return precedence[type] ?? 10;
}

/**
 * Check if document type A has higher precedence than B
 */
export function hasHigherPrecedence(typeA: DocumentType, typeB: DocumentType): boolean {
  return getDocumentTypePrecedence(typeA) < getDocumentTypePrecedence(typeB);
}

/**
 * Get human-readable document type name
 */
export function getDocumentTypeName(type: DocumentType): string {
  const names: Record<DocumentType, string> = {
    'msa': 'Master Service Agreement',
    'order_form': 'Order Form',
    'amendment': 'Amendment',
    'sow': 'Statement of Work',
    'addendum': 'Addendum',
    'exhibit': 'Exhibit',
    'schedule': 'Schedule',
    'renewal': 'Renewal',
    'termination': 'Termination Notice',
    'other': 'Other Document',
  };
  return names[type] ?? 'Unknown';
}
