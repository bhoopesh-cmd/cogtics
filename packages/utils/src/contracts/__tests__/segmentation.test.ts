/**
 * Clause Segmentation Unit Tests
 */
import { describe, it, expect } from 'vitest';
import { segmentClauses, findPageBreaks, getClauseDepth, getClausesByType } from '../segmentation.js';

describe('Clause Segmentation', () => {
  describe('segmentClauses', () => {
    it('should detect numbered section headings', () => {
      const text = `1. DEFINITIONS

This agreement defines the following terms:

1.1 "Customer" means the entity purchasing services.

1.2 "Provider" means Acme Corporation.`;

      const clauses = segmentClauses(text);

      expect(clauses.length).toBeGreaterThan(0);
      expect(clauses[0].type).toBe('heading');
      expect(clauses[0].label).toBe('1');
    });

    it('should detect letter section headings', () => {
      const text = `A. Scope of Services

The Provider shall deliver the following:

B. Payment Terms

Payment is due within 30 days.`;

      const clauses = segmentClauses(text);

      expect(clauses.some(c => c.type === 'heading' && c.label === 'A')).toBe(true);
      expect(clauses.some(c => c.type === 'heading' && c.label === 'B')).toBe(true);
    });

    it('should detect paragraphs', () => {
      const text = `This is the first paragraph of the agreement.

This is the second paragraph with more details.

This is the third paragraph.`;

      const clauses = segmentClauses(text);

      expect(clauses.length).toBe(3);
      expect(clauses.every(c => c.type === 'paragraph')).toBe(true);
    });

    it('should detect list items with bullets', () => {
      const text = `The following items are included:

• Item one
• Item two
• Item three`;

      const clauses = segmentClauses(text);

      const listItems = clauses.filter(c => c.type === 'list_item');
      expect(listItems.length).toBeGreaterThanOrEqual(3);
    });

    it('should detect list items with dashes', () => {
      const text = `Services include:

- Service A
- Service B
- Service C`;

      const clauses = segmentClauses(text);

      const listItems = clauses.filter(c => c.type === 'list_item');
      expect(listItems.length).toBeGreaterThanOrEqual(3);
    });

    it('should calculate correct offsets', () => {
      const text = `First paragraph.

Second paragraph.`;

      const clauses = segmentClauses(text);

      expect(clauses[0].startOffset).toBe(0);
      expect(clauses[0].text).toBe('First paragraph.');
      
      // Second paragraph should start after the newlines
      expect(clauses[1].text).toBe('Second paragraph.');
      expect(clauses[1].startOffset).toBeGreaterThan(clauses[0].endOffset);
    });

    it('should track sequence numbers', () => {
      const text = `First.

Second.

Third.`;

      const clauses = segmentClauses(text);

      expect(clauses[0].sequenceNumber).toBe(0);
      expect(clauses[1].sequenceNumber).toBe(1);
      expect(clauses[2].sequenceNumber).toBe(2);
    });

    it('should handle page breaks for page numbers', () => {
      const text = `Page 1 content.

\f

Page 2 content.

\f

Page 3 content.`;

      const pageBreaks = findPageBreaks(text);
      const clauses = segmentClauses(text, pageBreaks);

      // Should have clauses with different page numbers
      expect(clauses.some(c => c.pageNumber === 1)).toBe(true);
    });

    it('should handle empty input', () => {
      const clauses = segmentClauses('');
      expect(clauses).toEqual([]);
    });

    it('should handle whitespace-only input', () => {
      const clauses = segmentClauses('   \n\n   ');
      expect(clauses).toEqual([]);
    });
  });

  describe('findPageBreaks', () => {
    it('should find form feed characters', () => {
      const text = 'Page 1\fPage 2\fPage 3';
      const breaks = findPageBreaks(text);
      expect(breaks.length).toBe(2);
    });

    it('should find "Page X" markers', () => {
      const text = `Content here

Page 1

More content

Page 2

Final content`;

      const breaks = findPageBreaks(text);
      expect(breaks.length).toBe(2);
    });

    it('should return empty array for text without breaks', () => {
      const breaks = findPageBreaks('No page breaks here');
      expect(breaks).toEqual([]);
    });
  });

  describe('getClauseDepth', () => {
    it('should return 0 for top-level clauses', () => {
      const clauses = [
        { type: 'heading' as const, label: '1', text: 'Heading', startOffset: 0, endOffset: 10, pageNumber: null, sequenceNumber: 0, parentIndex: null },
      ];
      
      expect(getClauseDepth(clauses[0], clauses)).toBe(0);
    });

    it('should return correct depth for nested clauses', () => {
      const clauses = [
        { type: 'heading' as const, label: '1', text: 'Heading', startOffset: 0, endOffset: 10, pageNumber: null, sequenceNumber: 0, parentIndex: null },
        { type: 'section' as const, label: '1.1', text: 'Section', startOffset: 11, endOffset: 20, pageNumber: null, sequenceNumber: 1, parentIndex: 0 },
        { type: 'paragraph' as const, label: null, text: 'Para', startOffset: 21, endOffset: 30, pageNumber: null, sequenceNumber: 2, parentIndex: 1 },
      ];
      
      expect(getClauseDepth(clauses[0], clauses)).toBe(0);
      expect(getClauseDepth(clauses[1], clauses)).toBe(1);
      expect(getClauseDepth(clauses[2], clauses)).toBe(2);
    });
  });

  describe('getClausesByType', () => {
    it('should filter clauses by type', () => {
      const clauses = [
        { type: 'heading' as const, label: '1', text: 'H1', startOffset: 0, endOffset: 10, pageNumber: null, sequenceNumber: 0, parentIndex: null },
        { type: 'paragraph' as const, label: null, text: 'P1', startOffset: 11, endOffset: 20, pageNumber: null, sequenceNumber: 1, parentIndex: 0 },
        { type: 'heading' as const, label: '2', text: 'H2', startOffset: 21, endOffset: 30, pageNumber: null, sequenceNumber: 2, parentIndex: null },
        { type: 'paragraph' as const, label: null, text: 'P2', startOffset: 31, endOffset: 40, pageNumber: null, sequenceNumber: 3, parentIndex: 2 },
      ];

      const headings = getClausesByType(clauses, 'heading');
      expect(headings.length).toBe(2);
      expect(headings.every(c => c.type === 'heading')).toBe(true);

      const paragraphs = getClausesByType(clauses, 'paragraph');
      expect(paragraphs.length).toBe(2);
    });
  });
});
