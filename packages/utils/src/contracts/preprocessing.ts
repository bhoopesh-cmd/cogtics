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

const DEFAULT_OPTIONS: PreprocessingOptions = {
  removeHeaders: true,
  removeFooters: true,
  removePageNumbers: true,
  normalizeWhitespace: true,
  detectColumns: true,
  preservePageBreaks: true,
};

// Common header/footer patterns
const HEADER_FOOTER_PATTERNS = [
  // Confidentiality notices
  /confidential\s*[-–—]\s*(?:do\s+not\s+)?(?:copy|distribute|share)/gi,
  /proprietary\s+(?:and\s+)?confidential/gi,
  /for\s+internal\s+use\s+only/gi,
  /privileged\s+(?:and\s+)?confidential/gi,
  
  // Draft/version markers
  /^\s*draft\s*$/gim,
  /^\s*version\s+[\d.]+\s*$/gim,
  /^\s*rev(?:ision)?\.?\s*[\d.]+\s*$/gim,
  
  // Company letterhead patterns (generic)
  /^\s*(?:tel|phone|fax|email|www\.|http)[\s:.].{0,50}$/gim,
  
  // Copyright notices
  /©\s*\d{4}/g,
  /copyright\s+\d{4}/gi,
  /all\s+rights\s+reserved/gi,
];

// Page number patterns
const PAGE_NUMBER_PATTERNS = [
  // "Page X of Y"
  /^\s*page\s+\d+\s+of\s+\d+\s*$/gim,
  /^\s*page\s+\d+\s*$/gim,
  
  // "- X -" style
  /^\s*[-–—]\s*\d+\s*[-–—]\s*$/gm,
  
  // Standalone numbers at start/end of lines
  /^\s*\d{1,4}\s*$/gm,
  
  // Form feed with number
  /\f\s*\d+\s*/g,
];

// Form feed character (page break in PDFs)
const FORM_FEED = '\f';

/**
 * Preprocess extracted PDF text
 */
export function preprocessText(
  text: string,
  options: PreprocessingOptions = {}
): PreprocessingResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalLength = text.length;
  
  let cleanedText = text;
  const removedHeaders: string[] = [];
  const removedFooters: string[] = [];
  const pageBreaks: number[] = [];
  
  // Split into pages first
  const pages = splitIntoPages(cleanedText);
  const pageCount = pages.length;
  
  // Detect two-column layout
  const twoColumnDetected = opts.detectColumns ? detectTwoColumnLayout(cleanedText) : false;
  
  // If two-column, try to reflow the text
  if (twoColumnDetected) {
    cleanedText = reflowTwoColumnText(cleanedText);
  }
  
  // Remove repeating headers/footers
  if (opts.removeHeaders || opts.removeFooters) {
    const result = removeRepeatingHeadersFooters(cleanedText, pages);
    cleanedText = result.text;
    removedHeaders.push(...result.headers);
    removedFooters.push(...result.footers);
  }
  
  // Remove page numbers
  if (opts.removePageNumbers) {
    cleanedText = removePageNumbers(cleanedText);
  }
  
  // Remove common header/footer patterns
  for (const pattern of HEADER_FOOTER_PATTERNS) {
    const matches = cleanedText.match(pattern);
    if (matches) {
      for (const match of matches) {
        if (match.length < 200) { // Only remove short matches
          cleanedText = cleanedText.replace(match, '');
        }
      }
    }
  }
  
  // Track page breaks
  if (opts.preservePageBreaks) {
    let offset = 0;
    for (let i = 0; i < cleanedText.length; i++) {
      if (cleanedText[i] === FORM_FEED) {
        pageBreaks.push(i);
      }
    }
  }
  
  // Normalize whitespace
  if (opts.normalizeWhitespace) {
    cleanedText = normalizeWhitespace(cleanedText);
  }
  
  // Extract metadata
  const metadata = extractMetadata(text);
  
  return {
    cleanedText,
    originalLength,
    cleanedLength: cleanedText.length,
    removedHeaders,
    removedFooters,
    pageBreaks,
    pageCount,
    twoColumnDetected,
    metadata,
  };
}

/**
 * Split text into pages based on form feeds or page markers
 */
function splitIntoPages(text: string): string[] {
  // Try form feed first
  if (text.includes(FORM_FEED)) {
    return text.split(FORM_FEED).filter(p => p.trim().length > 0);
  }
  
  // Try "Page X of Y" markers
  const pageMarkerPattern = /\bpage\s+\d+\s+of\s+\d+\b/gi;
  const markers = [...text.matchAll(pageMarkerPattern)];
  
  if (markers.length > 1) {
    const pages: string[] = [];
    let lastIndex = 0;
    
    for (const marker of markers) {
      if (marker.index !== undefined && marker.index > lastIndex) {
        pages.push(text.substring(lastIndex, marker.index));
        lastIndex = marker.index + marker[0].length;
      }
    }
    
    if (lastIndex < text.length) {
      pages.push(text.substring(lastIndex));
    }
    
    return pages.filter(p => p.trim().length > 0);
  }
  
  // No clear page breaks, treat as single page
  return [text];
}

/**
 * Detect two-column layout based on whitespace patterns
 */
function detectTwoColumnLayout(text: string): boolean {
  const lines = text.split('\n');
  let columnGapCount = 0;
  let totalLines = 0;
  
  for (const line of lines) {
    if (line.length < 40) continue;
    totalLines++;
    
    // Look for large gaps in the middle of lines (column separator)
    const middleStart = Math.floor(line.length * 0.3);
    const middleEnd = Math.floor(line.length * 0.7);
    const middleSection = line.substring(middleStart, middleEnd);
    
    // Check for large whitespace gap (5+ spaces)
    if (/\s{5,}/.test(middleSection)) {
      columnGapCount++;
    }
  }
  
  // If more than 30% of lines have column gaps, likely two-column
  return totalLines > 10 && columnGapCount / totalLines > 0.3;
}

/**
 * Attempt to reflow two-column text into single column
 * This is a heuristic approach and may not work perfectly
 */
function reflowTwoColumnText(text: string): string {
  const lines = text.split('\n');
  const reflowed: string[] = [];
  const leftColumn: string[] = [];
  const rightColumn: string[] = [];
  
  for (const line of lines) {
    // Find the column gap
    const gapMatch = line.match(/^(.+?)\s{5,}(.+)$/);
    
    if (gapMatch) {
      leftColumn.push(gapMatch[1].trim());
      rightColumn.push(gapMatch[2].trim());
    } else {
      // No gap, flush columns and add line as-is
      if (leftColumn.length > 0) {
        reflowed.push(...leftColumn, ...rightColumn);
        leftColumn.length = 0;
        rightColumn.length = 0;
      }
      reflowed.push(line);
    }
  }
  
  // Flush remaining columns
  if (leftColumn.length > 0) {
    reflowed.push(...leftColumn, ...rightColumn);
  }
  
  return reflowed.join('\n');
}

/**
 * Remove repeating headers and footers across pages
 */
function removeRepeatingHeadersFooters(
  text: string,
  pages: string[]
): { text: string; headers: string[]; footers: string[] } {
  if (pages.length < 2) {
    return { text, headers: [], footers: [] };
  }
  
  const headers: string[] = [];
  const footers: string[] = [];
  
  // Extract first and last lines from each page
  const pageFirstLines: string[] = [];
  const pageLastLines: string[] = [];
  
  for (const page of pages) {
    const lines = page.split('\n').filter(l => l.trim().length > 0);
    if (lines.length > 0) {
      pageFirstLines.push(lines[0].trim());
      pageLastLines.push(lines[lines.length - 1].trim());
    }
  }
  
  // Find repeating first lines (headers)
  const headerCounts = new Map<string, number>();
  for (const line of pageFirstLines) {
    if (line.length > 5 && line.length < 200) {
      headerCounts.set(line, (headerCounts.get(line) || 0) + 1);
    }
  }
  
  // Find repeating last lines (footers)
  const footerCounts = new Map<string, number>();
  for (const line of pageLastLines) {
    if (line.length > 5 && line.length < 200) {
      footerCounts.set(line, (footerCounts.get(line) || 0) + 1);
    }
  }
  
  // Remove lines that appear on more than half the pages
  const threshold = Math.max(2, pages.length * 0.5);
  let result = text;
  
  for (const [header, count] of headerCounts) {
    if (count >= threshold) {
      headers.push(header);
      // Remove all occurrences at line start
      result = result.split('\n')
        .filter(line => line.trim() !== header)
        .join('\n');
    }
  }
  
  for (const [footer, count] of footerCounts) {
    if (count >= threshold) {
      footers.push(footer);
      // Remove all occurrences at line end
      result = result.split('\n')
        .filter(line => line.trim() !== footer)
        .join('\n');
    }
  }
  
  return { text: result, headers, footers };
}

/**
 * Remove page numbers from text
 */
function removePageNumbers(text: string): string {
  let result = text;
  
  for (const pattern of PAGE_NUMBER_PATTERNS) {
    result = result.replace(pattern, '');
  }
  
  return result;
}

/**
 * Normalize whitespace in text
 */
function normalizeWhitespace(text: string): string {
  return text
    // Replace multiple spaces with single space
    .replace(/[^\S\n]{2,}/g, ' ')
    // Replace multiple newlines with double newline (paragraph break)
    .replace(/\n{3,}/g, '\n\n')
    // Remove trailing whitespace from lines
    .replace(/[ \t]+$/gm, '')
    // Remove leading whitespace from lines (but preserve indentation for lists)
    .replace(/^[ \t]{10,}/gm, '    ')
    // Trim overall
    .trim();
}

/**
 * Extract metadata from document text
 */
function extractMetadata(text: string): PreprocessingResult['metadata'] {
  const metadata: PreprocessingResult['metadata'] = {};
  
  // Look for confidentiality notice
  const confidMatch = text.match(/confidential[^.]{0,100}\./i);
  if (confidMatch) {
    metadata.confidentialityNotice = confidMatch[0].trim();
  }
  
  // Look for document date
  const datePatterns = [
    /(?:effective|dated?|as\s+of)[:\s]+(\w+\s+\d{1,2},?\s+\d{4})/i,
    /(?:effective|dated?|as\s+of)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      metadata.documentDate = match[1];
      break;
    }
  }
  
  // Look for document title (first substantial line)
  const lines = text.split('\n').filter(l => l.trim().length > 10);
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    if (firstLine.length < 200 && /^[A-Z]/.test(firstLine)) {
      metadata.documentTitle = firstLine;
    }
  }
  
  return metadata;
}

/**
 * Clean text minimally (just whitespace normalization)
 */
export function cleanTextMinimal(text: string): string {
  return normalizeWhitespace(text);
}

/**
 * Check if text appears to be from a scanned document (no extractable text)
 */
export function isScannedDocument(text: string): boolean {
  // Very short text relative to expected contract length
  if (text.trim().length < 100) {
    return true;
  }
  
  // High ratio of non-word characters (garbage from failed OCR)
  const wordChars = text.match(/[a-zA-Z]/g)?.length || 0;
  const totalChars = text.length;
  
  if (totalChars > 0 && wordChars / totalChars < 0.3) {
    return true;
  }
  
  return false;
}

/**
 * Estimate the quality of text extraction
 */
export function estimateExtractionQuality(text: string): {
  quality: 'good' | 'fair' | 'poor';
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 1.0;
  
  // Check for minimum length
  if (text.length < 500) {
    issues.push('Very short text - may be incomplete extraction');
    score *= 0.5;
  }
  
  // Check for word ratio
  const words = text.split(/\s+/).filter(w => w.length > 2);
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / (words.length || 1);
  
  if (avgWordLength < 3 || avgWordLength > 15) {
    issues.push('Unusual word length distribution');
    score *= 0.8;
  }
  
  // Check for garbage characters
  const garbageRatio = (text.match(/[^\w\s.,;:!?'"()\-–—$%@#&*\/\\]/g)?.length || 0) / text.length;
  if (garbageRatio > 0.1) {
    issues.push('High ratio of unusual characters');
    score *= 0.7;
  }
  
  // Check for missing spaces (run-on text)
  const longWords = words.filter(w => w.length > 30);
  if (longWords.length > words.length * 0.05) {
    issues.push('Possible missing word boundaries');
    score *= 0.8;
  }
  
  // Determine quality level
  let quality: 'good' | 'fair' | 'poor';
  if (score >= 0.8) {
    quality = 'good';
  } else if (score >= 0.5) {
    quality = 'fair';
  } else {
    quality = 'poor';
  }
  
  return { quality, score, issues };
}
