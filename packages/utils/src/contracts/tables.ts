/**
 * Table Detection and Parsing
 * 
 * Detects and parses tables from extracted PDF text.
 * Handles continuation tables, merged cells, and malformed structures.
 */

export interface TableCell {
  text: string;
  rowIndex: number;
  colIndex: number;
  rowSpan?: number;
  colSpan?: number;
}

export interface TableRow {
  cells: TableCell[];
  isHeader: boolean;
  isContinuation: boolean;
}

export interface TableRegion {
  startOffset: number;
  endOffset: number;
  pageNumber: number | null;
  rows: TableRow[];
  headers: string[];
  confidence: number;
  isContinuation: boolean;
  continuationOf?: number; // Index of previous table this continues
  rawText: string;
}

export interface TableDetectionResult {
  tables: TableRegion[];
  nonTableText: string;
  tableCount: number;
}

// Patterns that indicate table structure
const TABLE_INDICATORS = {
  // Column separators
  pipeDelimited: /\|/,
  tabDelimited: /\t/,
  multiSpace: /\s{3,}/,
  
  // Table headers
  headerRow: /^[\s|]*(?:item|description|qty|quantity|price|amount|total|date|name|type|value|rate|unit)/i,
  
  // Numeric columns
  numericColumn: /^\s*[$€£¥]?\s*[\d,]+\.?\d*\s*$/,
  percentColumn: /^\s*[\d.]+\s*%\s*$/,
  
  // Table continuation
  continued: /\(?continued\)?|cont[.'d]?/i,
  
  // Table title patterns
  tableTitle: /^(?:table|schedule|exhibit)\s+[a-z0-9]+[:\s]/i,
};

/**
 * Detect and extract tables from text
 */
export function detectTables(
  text: string,
  pageBreaks?: number[]
): TableDetectionResult {
  const tables: TableRegion[] = [];
  const lines = text.split('\n');
  
  let currentTableStart = -1;
  let currentTableLines: string[] = [];
  let inTable = false;
  let lineOffset = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = text.indexOf(line, lineOffset);
    lineOffset = lineStart + line.length;
    
    const isTableLine = isLikelyTableLine(line);
    
    if (isTableLine && !inTable) {
      // Start of new table
      inTable = true;
      currentTableStart = lineStart;
      currentTableLines = [line];
    } else if (isTableLine && inTable) {
      // Continue table
      currentTableLines.push(line);
    } else if (!isTableLine && inTable) {
      // Check if this is just a gap in the table
      if (currentTableLines.length >= 2 && line.trim().length === 0) {
        // Empty line might be row separator, check next line
        const nextLine = lines[i + 1];
        if (nextLine && isLikelyTableLine(nextLine)) {
          currentTableLines.push(line);
          continue;
        }
      }
      
      // End of table
      if (currentTableLines.length >= 2) {
        const table = parseTableFromLines(
          currentTableLines,
          currentTableStart,
          getPageNumber(currentTableStart, pageBreaks)
        );
        
        if (table.confidence > 0.3) {
          // Check if this is a continuation of a previous table
          if (tables.length > 0) {
            const prevTable = tables[tables.length - 1];
            if (isContinuationTable(table, prevTable)) {
              table.isContinuation = true;
              table.continuationOf = tables.length - 1;
            }
          }
          tables.push(table);
        }
      }
      
      inTable = false;
      currentTableLines = [];
      currentTableStart = -1;
    }
  }
  
  // Handle table at end of text
  if (inTable && currentTableLines.length >= 2) {
    const table = parseTableFromLines(
      currentTableLines,
      currentTableStart,
      getPageNumber(currentTableStart, pageBreaks)
    );
    
    if (table.confidence > 0.3) {
      tables.push(table);
    }
  }
  
  // Extract non-table text
  const nonTableText = extractNonTableText(text, tables);
  
  return {
    tables,
    nonTableText,
    tableCount: tables.length,
  };
}

/**
 * Check if a line is likely part of a table
 */
function isLikelyTableLine(line: string): boolean {
  const trimmed = line.trim();
  
  if (trimmed.length === 0) {
    return false;
  }
  
  // Check for pipe-delimited content
  if ((trimmed.match(/\|/g) || []).length >= 2) {
    return true;
  }
  
  // Check for tab-delimited content
  if (trimmed.includes('\t') && (trimmed.match(/\t/g) || []).length >= 1) {
    return true;
  }
  
  // Check for aligned columns (multiple 3+ space gaps)
  const spaceGaps = (trimmed.match(/\s{3,}/g) || []).length;
  if (spaceGaps >= 2) {
    return true;
  }
  
  // Check for numeric-heavy content with alignment
  const numericMatches = (trimmed.match(/\$?\s*[\d,]+\.?\d*/g) || []).length;
  if (numericMatches >= 2 && spaceGaps >= 1) {
    return true;
  }
  
  return false;
}

/**
 * Parse table from lines of text
 */
function parseTableFromLines(
  lines: string[],
  startOffset: number,
  pageNumber: number | null
): TableRegion {
  const rawText = lines.join('\n');
  const rows: TableRow[] = [];
  
  // Determine delimiter type
  const delimiterType = detectDelimiterType(lines);
  
  // Parse each line into cells
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cells = parseLineIntoCells(line, delimiterType, i);
    
    if (cells.length > 0) {
      const isHeader = i === 0 && isLikelyHeaderRow(cells);
      const isContinuation = TABLE_INDICATORS.continued.test(line);
      
      rows.push({
        cells,
        isHeader,
        isContinuation,
      });
    }
  }
  
  // Extract headers
  const headers = rows.length > 0 && rows[0].isHeader
    ? rows[0].cells.map(c => c.text)
    : [];
  
  // Calculate confidence
  const confidence = calculateTableConfidence(rows, delimiterType);
  
  return {
    startOffset,
    endOffset: startOffset + rawText.length,
    pageNumber,
    rows,
    headers,
    confidence,
    isContinuation: false,
    rawText,
  };
}

/**
 * Detect the type of delimiter used in the table
 */
function detectDelimiterType(lines: string[]): 'pipe' | 'tab' | 'space' | 'mixed' {
  let pipeCount = 0;
  let tabCount = 0;
  let spaceCount = 0;
  
  for (const line of lines) {
    if (line.includes('|')) pipeCount++;
    if (line.includes('\t')) tabCount++;
    if (/\s{3,}/.test(line)) spaceCount++;
  }
  
  const total = lines.length;
  
  if (pipeCount > total * 0.5) return 'pipe';
  if (tabCount > total * 0.5) return 'tab';
  if (spaceCount > total * 0.5) return 'space';
  
  return 'mixed';
}

/**
 * Parse a line into table cells
 */
function parseLineIntoCells(
  line: string,
  delimiterType: 'pipe' | 'tab' | 'space' | 'mixed',
  rowIndex: number
): TableCell[] {
  let parts: string[];
  
  switch (delimiterType) {
    case 'pipe':
      parts = line.split('|').map(p => p.trim()).filter(p => p.length > 0);
      break;
    case 'tab':
      parts = line.split('\t').map(p => p.trim());
      break;
    case 'space':
    case 'mixed':
    default:
      // Split on 3+ spaces
      parts = line.split(/\s{3,}/).map(p => p.trim()).filter(p => p.length > 0);
      break;
  }
  
  return parts.map((text, colIndex) => ({
    text,
    rowIndex,
    colIndex,
  }));
}

/**
 * Check if a row is likely a header row
 */
function isLikelyHeaderRow(cells: TableCell[]): boolean {
  const headerWords = [
    'item', 'description', 'qty', 'quantity', 'price', 'amount', 
    'total', 'date', 'name', 'type', 'value', 'rate', 'unit',
    'product', 'service', 'fee', 'cost', 'period', 'term',
  ];
  
  let headerWordCount = 0;
  
  for (const cell of cells) {
    const lower = cell.text.toLowerCase();
    if (headerWords.some(w => lower.includes(w))) {
      headerWordCount++;
    }
  }
  
  // If more than half the cells contain header-like words
  return headerWordCount > cells.length * 0.3;
}

/**
 * Calculate confidence score for table detection
 */
function calculateTableConfidence(
  rows: TableRow[],
  delimiterType: 'pipe' | 'tab' | 'space' | 'mixed'
): number {
  if (rows.length < 2) return 0.1;
  
  let confidence = 0.5;
  
  // Consistent column count increases confidence
  const columnCounts = rows.map(r => r.cells.length);
  const avgColumns = columnCounts.reduce((a, b) => a + b, 0) / columnCounts.length;
  const columnVariance = columnCounts.reduce((sum, c) => sum + Math.abs(c - avgColumns), 0) / columnCounts.length;
  
  if (columnVariance < 0.5) {
    confidence += 0.2; // Very consistent columns
  } else if (columnVariance < 1.0) {
    confidence += 0.1; // Somewhat consistent
  }
  
  // Has header row
  if (rows[0].isHeader) {
    confidence += 0.1;
  }
  
  // Delimiter type affects confidence
  if (delimiterType === 'pipe' || delimiterType === 'tab') {
    confidence += 0.1; // Clear delimiters
  }
  
  // Multiple rows
  if (rows.length >= 5) {
    confidence += 0.1;
  }
  
  // Contains numeric data
  const hasNumeric = rows.some(r => 
    r.cells.some(c => TABLE_INDICATORS.numericColumn.test(c.text))
  );
  if (hasNumeric) {
    confidence += 0.1;
  }
  
  return Math.min(confidence, 0.99);
}

/**
 * Check if a table is a continuation of a previous table
 */
function isContinuationTable(
  table: TableRegion,
  prevTable: TableRegion
): boolean {
  // Check for explicit continuation marker
  if (table.rows.some(r => r.isContinuation)) {
    return true;
  }
  
  // Check for matching column structure
  if (prevTable.headers.length > 0 && table.headers.length === 0) {
    // Previous table has headers, this one doesn't - might be continuation
    const prevColCount = prevTable.rows[0]?.cells.length || 0;
    const thisColCount = table.rows[0]?.cells.length || 0;
    
    if (prevColCount === thisColCount) {
      return true;
    }
  }
  
  // Check for matching header text
  if (prevTable.headers.length > 0 && table.headers.length > 0) {
    const matchingHeaders = table.headers.filter(h => 
      prevTable.headers.some(ph => ph.toLowerCase() === h.toLowerCase())
    );
    
    if (matchingHeaders.length >= table.headers.length * 0.8) {
      return true;
    }
  }
  
  return false;
}

/**
 * Extract text that is not part of any table
 */
function extractNonTableText(text: string, tables: TableRegion[]): string {
  if (tables.length === 0) {
    return text;
  }
  
  // Sort tables by start offset
  const sortedTables = [...tables].sort((a, b) => a.startOffset - b.startOffset);
  
  let result = '';
  let lastEnd = 0;
  
  for (const table of sortedTables) {
    if (table.startOffset > lastEnd) {
      result += text.substring(lastEnd, table.startOffset);
    }
    lastEnd = Math.max(lastEnd, table.endOffset);
  }
  
  // Add remaining text after last table
  if (lastEnd < text.length) {
    result += text.substring(lastEnd);
  }
  
  return result;
}

/**
 * Get page number for an offset
 */
function getPageNumber(offset: number, pageBreaks?: number[]): number | null {
  if (!pageBreaks || pageBreaks.length === 0) {
    return null;
  }
  
  let page = 1;
  for (const breakOffset of pageBreaks) {
    if (offset >= breakOffset) {
      page++;
    } else {
      break;
    }
  }
  
  return page;
}

/**
 * Merge continuation tables into their parent tables
 */
export function mergeContinuationTables(tables: TableRegion[]): TableRegion[] {
  const merged: TableRegion[] = [];
  
  for (const table of tables) {
    if (table.isContinuation && table.continuationOf !== undefined) {
      // Find the parent table in merged results
      const parentIndex = table.continuationOf;
      if (parentIndex < merged.length) {
        const parent = merged[parentIndex];
        
        // Merge rows (skip header row if present in continuation)
        const rowsToAdd = table.rows.filter(r => !r.isHeader && !r.isContinuation);
        parent.rows.push(...rowsToAdd);
        parent.endOffset = table.endOffset;
        parent.rawText += '\n' + table.rawText;
        
        continue;
      }
    }
    
    merged.push({ ...table });
  }
  
  return merged;
}

/**
 * Convert table to markdown format
 */
export function tableToMarkdown(table: TableRegion): string {
  if (table.rows.length === 0) return '';
  
  const lines: string[] = [];
  
  for (let i = 0; i < table.rows.length; i++) {
    const row = table.rows[i];
    const cells = row.cells.map(c => c.text.replace(/\|/g, '\\|'));
    lines.push('| ' + cells.join(' | ') + ' |');
    
    // Add separator after header
    if (row.isHeader) {
      lines.push('| ' + cells.map(() => '---').join(' | ') + ' |');
    }
  }
  
  return lines.join('\n');
}

/**
 * Extract key-value pairs from a simple two-column table
 */
export function extractKeyValuePairs(
  table: TableRegion
): Map<string, string> {
  const pairs = new Map<string, string>();
  
  for (const row of table.rows) {
    if (row.cells.length >= 2 && !row.isHeader) {
      const key = row.cells[0].text.trim();
      const value = row.cells[1].text.trim();
      
      if (key && value) {
        pairs.set(key, value);
      }
    }
  }
  
  return pairs;
}
