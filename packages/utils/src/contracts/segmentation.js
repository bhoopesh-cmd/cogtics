/**
 * Clause Segmentation
 *
 * Deterministic clause segmentation for contract documents.
 * Identifies headings, sections, paragraphs, and list items.
 */
// Patterns for detecting section headings
const HEADING_PATTERNS = [
    // Numbered sections: 1., 1.1, 1.1.1, etc.
    /^(\d+(?:\.\d+)*)\.\s+([A-Z][A-Za-z\s]+)/,
    // Letter sections: A., B., a), b)
    /^([A-Za-z])[.)]\s+([A-Z][A-Za-z\s]+)/,
    // Roman numerals: I., II., III., etc.
    /^([IVXLCDM]+)[.)]\s+([A-Z][A-Za-z\s]+)/i,
    // All caps headings (often section titles)
    /^([A-Z][A-Z\s]{3,})$/,
    // Explicit section markers
    /^(SECTION|ARTICLE|CLAUSE|EXHIBIT|SCHEDULE)\s+(\d+|[A-Z])[.:\s]/i,
];
// Patterns for detecting list items
const LIST_ITEM_PATTERNS = [
    // Bullet points
    /^[\u2022\u2023\u25E6\u2043\u2219•●○◦]\s+/,
    // Dashes
    /^[-–—]\s+/,
    // Numbered lists with parentheses: (1), (a), (i)
    /^\([0-9a-zA-Z]+\)\s+/,
    // Numbered lists: 1), a), i)
    /^[0-9a-zA-Z]+\)\s+/,
    // Asterisks
    /^\*\s+/,
];
/**
 * Segment extracted text into clauses
 *
 * @param text - The extracted text from a PDF
 * @param pageBreaks - Optional array of character offsets where page breaks occur
 * @returns Array of clause segments
 */
export function segmentClauses(text, pageBreaks) {
    const segments = [];
    // Split text into paragraphs (double newline or significant whitespace)
    const paragraphs = splitIntoParagraphs(text);
    let currentOffset = 0;
    let sequenceNumber = 0;
    let currentHeadingIndex = null;
    let currentSectionIndex = null;
    for (const paragraph of paragraphs) {
        const trimmed = paragraph.trim();
        if (!trimmed) {
            currentOffset += paragraph.length;
            continue;
        }
        const startOffset = text.indexOf(paragraph, currentOffset);
        const endOffset = startOffset + paragraph.length;
        const pageNumber = getPageNumber(startOffset, pageBreaks);
        // Determine clause type
        const headingMatch = matchHeading(trimmed);
        const isListItem = isListItemLine(trimmed);
        let segment;
        if (headingMatch) {
            segment = {
                type: 'heading',
                label: headingMatch.label,
                text: trimmed,
                startOffset,
                endOffset,
                pageNumber,
                sequenceNumber: sequenceNumber++,
                parentIndex: null,
            };
            currentHeadingIndex = segments.length;
            currentSectionIndex = null;
        }
        else if (isListItem) {
            segment = {
                type: 'list_item',
                label: null,
                text: trimmed,
                startOffset,
                endOffset,
                pageNumber,
                sequenceNumber: sequenceNumber++,
                parentIndex: currentSectionIndex ?? currentHeadingIndex,
            };
        }
        else if (looksLikeSection(trimmed)) {
            segment = {
                type: 'section',
                label: extractSectionLabel(trimmed),
                text: trimmed,
                startOffset,
                endOffset,
                pageNumber,
                sequenceNumber: sequenceNumber++,
                parentIndex: currentHeadingIndex,
            };
            currentSectionIndex = segments.length;
        }
        else {
            segment = {
                type: 'paragraph',
                label: null,
                text: trimmed,
                startOffset,
                endOffset,
                pageNumber,
                sequenceNumber: sequenceNumber++,
                parentIndex: currentSectionIndex ?? currentHeadingIndex,
            };
        }
        segments.push(segment);
        currentOffset = endOffset;
    }
    return segments;
}
/**
 * Split text into paragraphs based on double newlines
 */
function splitIntoParagraphs(text) {
    // Split on double newlines or more
    const parts = text.split(/\n{2,}/);
    // Also handle single newlines that appear to be paragraph breaks
    // (e.g., when followed by indentation or numbering)
    const result = [];
    for (const part of parts) {
        const lines = part.split('\n');
        let currentParagraph = [];
        for (const line of lines) {
            // Check if this line starts a new logical paragraph
            if (currentParagraph.length > 0 && startsNewParagraph(line)) {
                result.push(currentParagraph.join('\n'));
                currentParagraph = [line];
            }
            else {
                currentParagraph.push(line);
            }
        }
        if (currentParagraph.length > 0) {
            result.push(currentParagraph.join('\n'));
        }
    }
    return result;
}
/**
 * Check if a line starts a new paragraph
 */
function startsNewParagraph(line) {
    const trimmed = line.trim();
    if (!trimmed)
        return false;
    // Check for heading patterns
    if (matchHeading(trimmed))
        return true;
    // Check for list items
    if (isListItemLine(trimmed))
        return true;
    // Check for significant indentation change (often indicates new section)
    const leadingSpaces = line.length - line.trimStart().length;
    if (leadingSpaces >= 4)
        return true;
    return false;
}
/**
 * Match heading patterns and extract label
 */
function matchHeading(text) {
    for (const pattern of HEADING_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
            // Extract the section number/letter as label
            const label = match[1] || text.substring(0, 20);
            return { label: label.trim() };
        }
    }
    return null;
}
/**
 * Check if a line is a list item
 */
function isListItemLine(text) {
    return LIST_ITEM_PATTERNS.some(pattern => pattern.test(text));
}
/**
 * Check if text looks like a section (numbered or lettered paragraph)
 */
function looksLikeSection(text) {
    // Short texts with numbering at the start
    if (text.length < 500 && /^\d+\.\d*\s/.test(text)) {
        return true;
    }
    // Text that starts with explicit section markers
    if (/^(Section|Article|Clause)\s+\d/i.test(text)) {
        return true;
    }
    return false;
}
/**
 * Extract section label from text
 */
function extractSectionLabel(text) {
    // Try to extract numbered section label
    const numMatch = text.match(/^(\d+(?:\.\d+)*)/);
    if (numMatch) {
        return numMatch[1];
    }
    // Try to extract section/article number
    const sectionMatch = text.match(/^(Section|Article|Clause)\s+(\d+|[A-Z])/i);
    if (sectionMatch) {
        return `${sectionMatch[1]} ${sectionMatch[2]}`;
    }
    return null;
}
/**
 * Get page number for a given offset
 */
function getPageNumber(offset, pageBreaks) {
    if (!pageBreaks || pageBreaks.length === 0) {
        return null;
    }
    let page = 1;
    for (const breakOffset of pageBreaks) {
        if (offset >= breakOffset) {
            page++;
        }
        else {
            break;
        }
    }
    return page;
}
/**
 * Find page breaks in extracted text
 * Looks for common page break markers
 */
export function findPageBreaks(text) {
    const breaks = [];
    // Common page break patterns
    const patterns = [
        /\f/g, // Form feed character
        /\n\s*Page\s+\d+\s*\n/gi, // "Page X" markers
        /\n\s*-\s*\d+\s*-\s*\n/g, // "- X -" style page numbers
    ];
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            breaks.push(match.index);
        }
    }
    return breaks.sort((a, b) => a - b);
}
/**
 * Get clause hierarchy depth
 */
export function getClauseDepth(clause, allClauses) {
    let depth = 0;
    let current = clause;
    while (current.parentIndex !== null && depth < 10) {
        current = allClauses[current.parentIndex];
        depth++;
    }
    return depth;
}
/**
 * Get all child clauses of a given clause
 */
export function getChildClauses(parentIndex, allClauses) {
    return allClauses.filter(clause => clause.parentIndex === parentIndex);
}
/**
 * Get clauses by type
 */
export function getClausesByType(clauses, type) {
    return clauses.filter(clause => clause.type === type);
}
//# sourceMappingURL=segmentation.js.map