/**
 * Definition Resolution
 *
 * Extracts and resolves defined terms from contract documents.
 * Links defined terms to their usage throughout the document.
 */
// Patterns for detecting defined terms
const DEFINITION_PATTERNS = [
    // "Term" means...
    /[""]([A-Z][A-Za-z\s]+)[""][\s,]*(?:means?|shall\s+mean|is\s+defined\s+as|refers?\s+to)/gi,
    // "Term" - definition
    /[""]([A-Z][A-Za-z\s]+)[""][\s]*[-–—:][\s]*([^.]+\.)/gi,
    // As used herein, "Term" means...
    /as\s+used\s+(?:herein|in\s+this\s+agreement)[,\s]*[""]([A-Z][A-Za-z\s]+)[""][\s]*(?:means?|refers?\s+to)/gi,
    // The term "Term" means...
    /the\s+term\s+[""]([A-Z][A-Za-z\s]+)[""][\s]*(?:means?|shall\s+mean|is\s+defined\s+as)/gi,
    // For purposes of this Agreement, "Term" means...
    /for\s+(?:purposes?\s+of|the\s+purposes?\s+of)\s+this\s+(?:Agreement|Contract)[,\s]*[""]([A-Z][A-Za-z\s]+)[""][\s]*(?:means?)/gi,
    // Capitalized term in parentheses after a phrase (defining inline)
    /(?:the\s+)?([a-z][a-z\s]+)\s+\((?:the\s+)?[""]?([A-Z][A-Za-z]+)[""]?\)/gi,
    // SECTION 1. DEFINITIONS header followed by definitions
    /^(?:SECTION\s+\d+\.?\s*)?DEFINITIONS?$/gim,
];
// Common defined term patterns by category
const TERM_CATEGORIES = {
    party: [
        /customer|client|licensee|subscriber|purchaser|buyer/i,
        /vendor|provider|licensor|supplier|seller|company/i,
        /affiliate|subsidiary|parent|related\s+entity/i,
        /party|parties/i,
    ],
    product: [
        /product|software|platform|service|solution|system/i,
        /subscription|license|offering/i,
        /documentation|materials/i,
    ],
    service: [
        /service|support|maintenance|professional\s+services/i,
        /implementation|consulting|training/i,
    ],
    financial: [
        /fee|price|rate|charge|cost|payment/i,
        /invoice|billing|amount/i,
        /discount|credit|refund/i,
    ],
    temporal: [
        /term|period|date|effective|expiration/i,
        /renewal|subscription\s+term/i,
        /year|month|quarter/i,
    ],
    legal: [
        /confidential|proprietary/i,
        /liability|indemnif|warrant/i,
        /intellectual\s+property|ip/i,
        /law|jurisdiction|governing/i,
    ],
    technical: [
        /data|user|account|access/i,
        /api|integration|interface/i,
        /sla|uptime|availability/i,
    ],
    general: [/.*/], // Catch-all
};
/**
 * Extract defined terms from document text
 */
export function extractDefinitions(text, clauses) {
    const definitions = [];
    const seenTerms = new Set();
    // First, try to find a definitions section
    const definitionsSectionIndex = findDefinitionsSection(text);
    // Extract definitions from patterns
    for (const pattern of DEFINITION_PATTERNS) {
        pattern.lastIndex = 0; // Reset regex state
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const term = extractTermFromMatch(match);
            if (!term || seenTerms.has(term.toLowerCase()))
                continue;
            const definition = extractDefinitionText(text, match.index + match[0].length);
            if (!definition)
                continue;
            seenTerms.add(term.toLowerCase());
            // Find which clause this belongs to
            let clauseIndex = 0;
            let pageNumber = null;
            if (clauses) {
                for (let i = 0; i < clauses.length; i++) {
                    if (clauses[i].startOffset <= match.index && clauses[i].endOffset >= match.index) {
                        clauseIndex = i;
                        pageNumber = clauses[i].pageNumber;
                        break;
                    }
                }
            }
            // Calculate confidence
            let confidence = 0.7;
            // Boost confidence if in definitions section
            if (definitionsSectionIndex !== -1 && match.index > definitionsSectionIndex &&
                match.index < definitionsSectionIndex + 10000) {
                confidence += 0.2;
            }
            // Boost for explicit definition patterns
            if (match[0].includes('means') || match[0].includes('shall mean')) {
                confidence += 0.1;
            }
            definitions.push({
                term,
                definition,
                clauseIndex,
                startOffset: match.index,
                endOffset: match.index + match[0].length + definition.length,
                pageNumber,
                confidence: Math.min(confidence, 0.99),
                category: categorizeDefinition(term, definition),
            });
        }
    }
    return definitions;
}
/**
 * Find the start of a definitions section
 */
function findDefinitionsSection(text) {
    const patterns = [
        /^(?:SECTION\s+\d+\.?\s*)?DEFINITIONS?$/gim,
        /^\d+\.\s*DEFINITIONS?$/gim,
        /^ARTICLE\s+[IVX\d]+\.?\s*DEFINITIONS?$/gim,
    ];
    for (const pattern of patterns) {
        pattern.lastIndex = 0;
        const match = pattern.exec(text);
        if (match) {
            return match.index;
        }
    }
    return -1;
}
/**
 * Extract term name from a regex match
 */
function extractTermFromMatch(match) {
    // Try capture groups first
    for (let i = 1; i < match.length; i++) {
        if (match[i] && match[i].length > 1 && match[i].length < 100) {
            return match[i].trim();
        }
    }
    // Try to extract from quoted text in match[0]
    const quotedMatch = match[0].match(/[""]([^""]+)[""]/);
    if (quotedMatch) {
        return quotedMatch[1].trim();
    }
    return null;
}
/**
 * Extract definition text following the term
 */
function extractDefinitionText(text, startIndex) {
    // Get text from start index to next period or semicolon (within reason)
    const maxLength = 500;
    const endIndex = Math.min(startIndex + maxLength, text.length);
    const segment = text.substring(startIndex, endIndex);
    // Find the end of the definition sentence
    const sentenceEnd = segment.match(/[.;][\s\n]/);
    if (sentenceEnd && sentenceEnd.index !== undefined) {
        const definition = segment.substring(0, sentenceEnd.index + 1).trim();
        if (definition.length > 5) {
            return definition;
        }
    }
    // Fallback: take first 200 characters
    const fallback = segment.substring(0, 200).trim();
    return fallback.length > 5 ? fallback : null;
}
/**
 * Categorize a definition based on its term and content
 */
function categorizeDefinition(term, definition) {
    const combined = `${term} ${definition}`.toLowerCase();
    for (const [category, patterns] of Object.entries(TERM_CATEGORIES)) {
        if (category === 'general')
            continue;
        for (const pattern of patterns) {
            if (pattern.test(combined)) {
                return category;
            }
        }
    }
    return 'general';
}
/**
 * Find usages of defined terms throughout the document
 */
export function findDefinitionUsages(text, definitions, clauses) {
    const usages = [];
    for (const def of definitions) {
        // Create a pattern to match the term (case-insensitive but prefer capitalized)
        const termPattern = new RegExp(`\\b${escapeRegExp(def.term)}\\b`, 'gi');
        let match;
        while ((match = termPattern.exec(text)) !== null) {
            // Skip if this is the definition itself
            if (match.index >= def.startOffset && match.index <= def.endOffset) {
                continue;
            }
            // Find clause index
            let clauseIndex = 0;
            if (clauses) {
                for (let i = 0; i < clauses.length; i++) {
                    if (clauses[i].startOffset <= match.index && clauses[i].endOffset >= match.index) {
                        clauseIndex = i;
                        break;
                    }
                }
            }
            // Extract context around the usage
            const contextStart = Math.max(0, match.index - 50);
            const contextEnd = Math.min(text.length, match.index + match[0].length + 50);
            const context = text.substring(contextStart, contextEnd);
            usages.push({
                term: def.term,
                clauseIndex,
                offset: match.index,
                context: context.replace(/\s+/g, ' ').trim(),
            });
        }
    }
    return usages;
}
/**
 * Resolve defined terms in text by expanding them to their definitions
 */
export function resolveDefinitionsInText(text, definitions) {
    let resolved = text;
    // Sort definitions by term length (longest first to avoid partial matches)
    const sortedDefs = [...definitions].sort((a, b) => b.term.length - a.term.length);
    for (const def of sortedDefs) {
        // Skip very short terms to avoid false matches
        if (def.term.length < 3)
            continue;
        const termPattern = new RegExp(`\\b${escapeRegExp(def.term)}\\b`, 'g');
        // Replace with term and definition in brackets for context
        // Only do this for the first few occurrences to avoid cluttering
        let replacementCount = 0;
        resolved = resolved.replace(termPattern, (match) => {
            replacementCount++;
            if (replacementCount === 1) {
                // First occurrence: include full definition
                return `${match} [defined as: ${def.definition.substring(0, 100)}...]`;
            }
            return match;
        });
    }
    return resolved;
}
/**
 * Find undefined references to capitalized terms
 */
export function findUndefinedReferences(text, definitions) {
    const definedTerms = new Set(definitions.map(d => d.term.toLowerCase()));
    const capitalizedPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
    const potentialTerms = new Map();
    let match;
    while ((match = capitalizedPattern.exec(text)) !== null) {
        const term = match[0];
        // Skip common words that are often capitalized
        const commonWords = ['The', 'This', 'That', 'These', 'Those', 'It', 'We', 'You', 'They',
            'If', 'When', 'Where', 'What', 'How', 'Why', 'Each', 'Any', 'All', 'No', 'Not',
            'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
            'September', 'October', 'November', 'December', 'Monday', 'Tuesday', 'Wednesday',
            'Thursday', 'Friday', 'Saturday', 'Sunday'];
        if (commonWords.includes(term))
            continue;
        if (definedTerms.has(term.toLowerCase()))
            continue;
        if (term.length < 3)
            continue;
        // Count occurrences
        potentialTerms.set(term, (potentialTerms.get(term) || 0) + 1);
    }
    // Return terms that appear multiple times (likely should be defined)
    return Array.from(potentialTerms.entries())
        .filter(([_, count]) => count >= 3)
        .map(([term]) => term)
        .sort();
}
/**
 * Build a full resolution result
 */
export function resolveDefinitions(text, clauses) {
    const definitions = extractDefinitions(text, clauses);
    const usages = findDefinitionUsages(text, definitions, clauses);
    const unresolvedReferences = findUndefinedReferences(text, definitions);
    return {
        definitions,
        usages,
        unresolvedReferences,
    };
}
/**
 * Escape special regex characters in a string
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/**
 * Get definition for a specific term
 */
export function getDefinition(term, definitions) {
    const lowerTerm = term.toLowerCase();
    return definitions.find(d => d.term.toLowerCase() === lowerTerm);
}
/**
 * Check if a term is defined
 */
export function isTermDefined(term, definitions) {
    return getDefinition(term, definitions) !== undefined;
}
//# sourceMappingURL=definitions.js.map