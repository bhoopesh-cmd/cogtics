/**
 * Readiness Computation Unit Tests
 */
import { describe, it, expect } from 'vitest';
import {
  computeReadiness,
  getRequiredTermsForType,
  getSupportedContractTypes,
  meetsMinimumRequirements,
  getImprovementSuggestions,
} from '../readiness.js';
import type { ExtractedTerm } from '../extraction.js';

function createTerm(
  termType: string,
  confidence: number,
  value: unknown = {}
): ExtractedTerm {
  return {
    termType: termType as any,
    value,
    confidence,
    sourceClauseIndex: 0,
    extractionMethod: 'pattern',
    matchedText: 'test',
    startOffset: 0,
    endOffset: 10,
  };
}

describe('Readiness Computation', () => {
  describe('computeReadiness', () => {
    it('should return "ready" when all required terms are present with high confidence', () => {
      const terms: ExtractedTerm[] = [
        createTerm('pricing_model', 0.9),
        createTerm('billing_cadence', 0.85),
        createTerm('contract_value', 0.95),
        createTerm('start_date', 0.8),
        createTerm('term_length', 0.9),
      ];

      const result = computeReadiness(terms);

      expect(result.status).toBe('ready');
      expect(result.confidenceScore).toBeGreaterThan(0.7);
      expect(result.missingTerms).toHaveLength(0);
      expect(result.lowConfidenceTerms).toHaveLength(0);
    });

    it('should return "needs_review" when some terms have low confidence', () => {
      const terms: ExtractedTerm[] = [
        createTerm('pricing_model', 0.4), // Low confidence
        createTerm('billing_cadence', 0.85),
        createTerm('contract_value', 0.3), // Low confidence
        createTerm('start_date', 0.8),
        createTerm('term_length', 0.9),
      ];

      const result = computeReadiness(terms);

      expect(result.status).toBe('needs_review');
      expect(result.lowConfidenceTerms.length).toBeGreaterThan(0);
    });

    it('should return "incomplete" when many required terms are missing', () => {
      const terms: ExtractedTerm[] = [
        createTerm('pricing_model', 0.9),
      ];

      const result = computeReadiness(terms);

      expect(result.status).toBe('incomplete');
      expect(result.missingTerms.length).toBeGreaterThanOrEqual(3);
    });

    it('should return "needs_review" when one or two terms are missing', () => {
      const terms: ExtractedTerm[] = [
        createTerm('pricing_model', 0.9),
        createTerm('billing_cadence', 0.85),
        createTerm('contract_value', 0.95),
        // Missing: start_date, term_length
      ];

      const result = computeReadiness(terms);

      expect(result.status).toBe('needs_review');
      expect(result.missingTerms.length).toBe(2);
    });

    it('should count required and extracted terms correctly', () => {
      const terms: ExtractedTerm[] = [
        createTerm('pricing_model', 0.9),
        createTerm('billing_cadence', 0.85),
        createTerm('contract_value', 0.95),
        createTerm('start_date', 0.8),
        createTerm('term_length', 0.9),
        createTerm('discount', 0.75), // Extra term (not required)
      ];

      const result = computeReadiness(terms);

      expect(result.requiredTermsCount).toBe(5);
      expect(result.extractedTermsCount).toBe(5); // Only counts required terms
    });

    it('should use custom configuration', () => {
      const terms: ExtractedTerm[] = [
        createTerm('pricing_model', 0.6),
        createTerm('billing_cadence', 0.6),
      ];

      const result = computeReadiness(terms, undefined, {
        requiredTerms: ['pricing_model', 'billing_cadence'],
        minConfidenceThreshold: 0.5,
        readyConfidenceThreshold: 0.6,
      });

      expect(result.status).toBe('ready');
      expect(result.requiredTermsCount).toBe(2);
      expect(result.extractedTermsCount).toBe(2);
    });
  });

  describe('computeReadiness with contract types', () => {
    it('should use subscription requirements for subscription type', () => {
      const terms: ExtractedTerm[] = [
        createTerm('pricing_model', 0.9),
        createTerm('billing_cadence', 0.85),
        createTerm('contract_value', 0.95),
        createTerm('start_date', 0.8),
        createTerm('term_length', 0.9),
        createTerm('auto_renew', 0.85),
      ];

      const result = computeReadiness(terms, 'subscription');

      expect(result.status).toBe('ready');
      expect(result.requiredTermsCount).toBe(6); // subscription has 6 required terms
    });

    it('should use enterprise requirements for enterprise type', () => {
      const terms: ExtractedTerm[] = [
        createTerm('pricing_model', 0.9),
        createTerm('billing_cadence', 0.85),
        createTerm('contract_value', 0.95),
        createTerm('start_date', 0.8),
        createTerm('term_length', 0.9),
        createTerm('payment_terms', 0.85),
        createTerm('termination_terms', 0.8),
      ];

      const result = computeReadiness(terms, 'enterprise');

      expect(result.status).toBe('ready');
      expect(result.requiredTermsCount).toBe(7); // enterprise has 7 required terms
    });

    it('should fall back to default requirements for unknown types', () => {
      const terms: ExtractedTerm[] = [
        createTerm('pricing_model', 0.9),
        createTerm('billing_cadence', 0.85),
        createTerm('contract_value', 0.95),
        createTerm('start_date', 0.8),
        createTerm('term_length', 0.9),
      ];

      const result = computeReadiness(terms, 'unknown_type');

      expect(result.requiredTermsCount).toBe(5); // default has 5 required terms
    });
  });

  describe('confidence score calculation', () => {
    it('should calculate average confidence for extracted terms', () => {
      const terms: ExtractedTerm[] = [
        createTerm('pricing_model', 0.8),
        createTerm('billing_cadence', 0.8),
        createTerm('contract_value', 0.8),
        createTerm('start_date', 0.8),
        createTerm('term_length', 0.8),
      ];

      const result = computeReadiness(terms);

      expect(result.confidenceScore).toBeCloseTo(0.8, 1);
    });

    it('should penalize missing terms in confidence score', () => {
      const allTerms: ExtractedTerm[] = [
        createTerm('pricing_model', 0.9),
        createTerm('billing_cadence', 0.9),
        createTerm('contract_value', 0.9),
        createTerm('start_date', 0.9),
        createTerm('term_length', 0.9),
      ];

      const partialTerms: ExtractedTerm[] = [
        createTerm('pricing_model', 0.9),
        createTerm('billing_cadence', 0.9),
      ];

      const fullResult = computeReadiness(allTerms);
      const partialResult = computeReadiness(partialTerms);

      expect(fullResult.confidenceScore).toBeGreaterThan(partialResult.confidenceScore);
    });
  });

  describe('getRequiredTermsForType', () => {
    it('should return default terms for undefined type', () => {
      const terms = getRequiredTermsForType();

      expect(terms).toContain('pricing_model');
      expect(terms).toContain('billing_cadence');
      expect(terms).toContain('contract_value');
      expect(terms).toContain('start_date');
      expect(terms).toContain('term_length');
    });

    it('should return subscription-specific terms', () => {
      const terms = getRequiredTermsForType('subscription');

      expect(terms).toContain('auto_renew');
    });

    it('should return enterprise-specific terms', () => {
      const terms = getRequiredTermsForType('enterprise');

      expect(terms).toContain('payment_terms');
      expect(terms).toContain('termination_terms');
    });
  });

  describe('getSupportedContractTypes', () => {
    it('should return array of contract types', () => {
      const types = getSupportedContractTypes();

      expect(Array.isArray(types)).toBe(true);
      expect(types).toContain('subscription');
      expect(types).toContain('enterprise');
      expect(types).toContain('saas');
      expect(types).toContain('services');
      expect(types).toContain('license');
    });
  });

  describe('meetsMinimumRequirements', () => {
    it('should return true when value and date terms are present', () => {
      const terms: ExtractedTerm[] = [
        createTerm('contract_value', 0.9),
        createTerm('start_date', 0.85),
      ];

      expect(meetsMinimumRequirements(terms)).toBe(true);
    });

    it('should return true with pricing_model and term_length', () => {
      const terms: ExtractedTerm[] = [
        createTerm('pricing_model', 0.9),
        createTerm('term_length', 0.85),
      ];

      expect(meetsMinimumRequirements(terms)).toBe(true);
    });

    it('should return false when only value terms are present', () => {
      const terms: ExtractedTerm[] = [
        createTerm('contract_value', 0.9),
      ];

      expect(meetsMinimumRequirements(terms)).toBe(false);
    });

    it('should return false when only date terms are present', () => {
      const terms: ExtractedTerm[] = [
        createTerm('start_date', 0.9),
      ];

      expect(meetsMinimumRequirements(terms)).toBe(false);
    });

    it('should return false for empty terms', () => {
      expect(meetsMinimumRequirements([])).toBe(false);
    });
  });

  describe('getImprovementSuggestions', () => {
    it('should suggest adding missing terms', () => {
      const result = {
        status: 'needs_review' as const,
        confidenceScore: 0.6,
        requiredTermsCount: 5,
        extractedTermsCount: 3,
        missingTerms: ['start_date', 'term_length'],
        lowConfidenceTerms: [],
      };

      const suggestions = getImprovementSuggestions(result);

      expect(suggestions.some(s => s.includes('missing terms'))).toBe(true);
      expect(suggestions.some(s => s.includes('start_date'))).toBe(true);
    });

    it('should suggest reviewing low-confidence terms', () => {
      const result = {
        status: 'needs_review' as const,
        confidenceScore: 0.5,
        requiredTermsCount: 5,
        extractedTermsCount: 5,
        missingTerms: [],
        lowConfidenceTerms: [
          { termType: 'pricing_model', confidence: 0.4 },
          { termType: 'billing_cadence', confidence: 0.3 },
        ],
      };

      const suggestions = getImprovementSuggestions(result);

      expect(suggestions.some(s => s.includes('low-confidence'))).toBe(true);
    });

    it('should return empty array for ready contracts with no issues', () => {
      const result = {
        status: 'ready' as const,
        confidenceScore: 0.9,
        requiredTermsCount: 5,
        extractedTermsCount: 5,
        missingTerms: [],
        lowConfidenceTerms: [],
      };

      const suggestions = getImprovementSuggestions(result);

      expect(suggestions).toHaveLength(0);
    });
  });
});
