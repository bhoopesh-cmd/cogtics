import { describe, it, expect } from 'vitest';
import {
  escapeCsvValue,
  toCsvRow,
  generateCsv,
  getExportColumns,
  formatDateForCsv,
  formatDateOnlyForCsv,
} from '../csv.js';

describe('CSV Utilities', () => {
  describe('escapeCsvValue', () => {
    it('should return empty string for null', () => {
      expect(escapeCsvValue(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(escapeCsvValue(undefined)).toBe('');
    });

    it('should return string as-is when no special chars', () => {
      expect(escapeCsvValue('hello')).toBe('hello');
    });

    it('should return number as string', () => {
      expect(escapeCsvValue(123)).toBe('123');
      expect(escapeCsvValue(0)).toBe('0');
      expect(escapeCsvValue(-45.67)).toBe('-45.67');
    });

    it('should return boolean as string', () => {
      expect(escapeCsvValue(true)).toBe('true');
      expect(escapeCsvValue(false)).toBe('false');
    });

    it('should wrap value with comma in quotes', () => {
      expect(escapeCsvValue('hello, world')).toBe('"hello, world"');
    });

    it('should wrap value with newline in quotes', () => {
      expect(escapeCsvValue('line1\nline2')).toBe('"line1\nline2"');
    });

    it('should wrap value with carriage return in quotes', () => {
      expect(escapeCsvValue('line1\rline2')).toBe('"line1\rline2"');
    });

    it('should escape double quotes', () => {
      expect(escapeCsvValue('say "hello"')).toBe('"say ""hello"""');
    });

    it('should handle complex strings with multiple special chars', () => {
      expect(escapeCsvValue('He said, "Hello\nWorld"')).toBe('"He said, ""Hello\nWorld"""');
    });

    it('should stringify objects with proper escaping', () => {
      // Objects containing quotes are wrapped and escaped per CSV spec
      expect(escapeCsvValue({ key: 'value' })).toBe('"{""key"":""value""}"');
    });

    it('should stringify arrays', () => {
      expect(escapeCsvValue([1, 2, 3])).toBe('"[1,2,3]"');
    });
  });

  describe('toCsvRow', () => {
    it('should create CSV row from simple values', () => {
      expect(toCsvRow(['a', 'b', 'c'])).toBe('a,b,c\n');
    });

    it('should handle mixed types', () => {
      expect(toCsvRow(['hello', 123, true, null])).toBe('hello,123,true,\n');
    });

    it('should escape values as needed', () => {
      expect(toCsvRow(['normal', 'with, comma', 'quoted "text"'])).toBe('normal,"with, comma","quoted ""text"""\n');
    });

    it('should handle empty array', () => {
      expect(toCsvRow([])).toBe('\n');
    });
  });

  describe('generateCsv', () => {
    it('should generate complete CSV with headers and rows', () => {
      const headers = ['id', 'name', 'value'];
      const rows = [
        ['1', 'Alice', 100],
        ['2', 'Bob', 200],
      ];
      
      const csv = generateCsv(headers, rows);
      
      expect(csv).toBe('id,name,value\n1,Alice,100\n2,Bob,200\n');
    });

    it('should handle empty rows', () => {
      const headers = ['id', 'name'];
      const rows: unknown[][] = [];
      
      const csv = generateCsv(headers, rows);
      
      expect(csv).toBe('id,name\n');
    });

    it('should escape special characters in rows', () => {
      const headers = ['id', 'description'];
      const rows = [
        ['1', 'Contains, comma'],
        ['2', 'Has "quotes"'],
      ];
      
      const csv = generateCsv(headers, rows);
      
      expect(csv).toBe('id,description\n1,"Contains, comma"\n2,"Has ""quotes"""\n');
    });
  });

  describe('getExportColumns', () => {
    it('should return issues columns', () => {
      const columns = getExportColumns('issues');
      expect(columns).toContain('id');
      expect(columns).toContain('severity');
      expect(columns).toContain('category');
      expect(columns).toContain('impact_amount');
    });

    it('should return revrec columns', () => {
      const columns = getExportColumns('revrec');
      expect(columns).toContain('contract_id');
      expect(columns).toContain('scheduled_amount');
      expect(columns).toContain('recognition_method');
    });

    it('should return contracts columns', () => {
      const columns = getExportColumns('contracts');
      expect(columns).toContain('name');
      expect(columns).toContain('arr');
      expect(columns).toContain('readiness_score');
    });
  });

  describe('formatDateForCsv', () => {
    it('should return empty string for null', () => {
      expect(formatDateForCsv(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(formatDateForCsv(undefined)).toBe('');
    });

    it('should format Date object to ISO string', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(formatDateForCsv(date)).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should format date string to ISO string', () => {
      expect(formatDateForCsv('2024-01-15')).toContain('2024-01-15');
    });

    it('should return empty string for invalid date', () => {
      expect(formatDateForCsv('not a date')).toBe('');
    });
  });

  describe('formatDateOnlyForCsv', () => {
    it('should return empty string for null', () => {
      expect(formatDateOnlyForCsv(null)).toBe('');
    });

    it('should format Date object to date only', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(formatDateOnlyForCsv(date)).toBe('2024-01-15');
    });

    it('should format date string to date only', () => {
      expect(formatDateOnlyForCsv('2024-06-20T15:45:30Z')).toBe('2024-06-20');
    });

    it('should return empty string for invalid date', () => {
      expect(formatDateOnlyForCsv('invalid')).toBe('');
    });
  });
});
