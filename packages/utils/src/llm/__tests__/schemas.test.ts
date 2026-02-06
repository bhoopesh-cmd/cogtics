/**
 * Tests for LLM Response Schemas and Validation
 */

import { describe, it, expect } from 'vitest';
import {
  LOW_CONFIDENCE_THRESHOLD,
  computeNeedsReview,
  safeParseLLMResponse,
  parseLLMResponse,
  coerceLLMResponse,
  IssueEnrichmentResponseSchema,
  ExplanationResponseSchema,
  FixSuggestionResponseSchema,
  AnomalyDetectionResponseSchema,
  RecommendationResponseSchema,
  CSVAnalysisResultSchema,
  StructuredContractDataSchema,
  ExtractTermsResponseSchema,
  ConflictResolutionSchema,
  DetectOverrideResponseSchema,
} from '../schemas.js';

describe('Schema Constants', () => {
  it('should have LOW_CONFIDENCE_THRESHOLD set to 0.7', () => {
    expect(LOW_CONFIDENCE_THRESHOLD).toBe(0.7);
  });
});

describe('computeNeedsReview', () => {
  it('should return true when confidence is below threshold', () => {
    expect(computeNeedsReview(0.5)).toBe(true);
    expect(computeNeedsReview(0.69)).toBe(true);
    expect(computeNeedsReview(0)).toBe(true);
  });

  it('should return false when confidence is at or above threshold', () => {
    expect(computeNeedsReview(0.7)).toBe(false);
    expect(computeNeedsReview(0.85)).toBe(false);
    expect(computeNeedsReview(1)).toBe(false);
  });

  it('should return true when confidence is undefined', () => {
    expect(computeNeedsReview(undefined)).toBe(true);
  });
});

describe('safeParseLLMResponse', () => {
  const testSchema = IssueEnrichmentResponseSchema;

  it('should parse valid JSON response', () => {
    const validResponse = JSON.stringify({
      enrichments: [{
        issueIndex: 0,
        rootCause: 'Test root cause',
        businessImpact: 'Test impact',
        suggestedFix: 'Test fix',
        confidence: 0.85,
        explanation: 'Test explanation',
        priority: 'high',
      }],
    });

    const result = safeParseLLMResponse(testSchema, validResponse);
    expect(result).toBeDefined();
    expect(result?.enrichments).toHaveLength(1);
    expect(result?.enrichments[0].rootCause).toBe('Test root cause');
  });

  it('should return fallback on invalid JSON', () => {
    const invalidJson = 'not valid json {';
    const fallback = { enrichments: [] };
    
    const result = safeParseLLMResponse(testSchema, invalidJson, fallback);
    expect(result).toEqual(fallback);
  });

  it('should return undefined when validation fails and no fallback', () => {
    const invalidStructure = JSON.stringify({
      enrichments: [{ invalid: true }],
    });
    
    const result = safeParseLLMResponse(testSchema, invalidStructure);
    expect(result).toBeUndefined();
  });
});

describe('parseLLMResponse', () => {
  it('should parse valid response', () => {
    const validResponse = JSON.stringify({
      enrichments: [{
        issueIndex: 0,
        rootCause: 'Test',
        businessImpact: 'Test',
        suggestedFix: 'Test',
        confidence: 0.8,
        explanation: 'Test',
        priority: 'medium',
      }],
    });

    const result = parseLLMResponse(IssueEnrichmentResponseSchema, validResponse);
    expect(result.enrichments).toHaveLength(1);
  });

  it('should throw on invalid JSON', () => {
    expect(() => parseLLMResponse(IssueEnrichmentResponseSchema, 'invalid'))
      .toThrow();
  });

  it('should throw on validation error', () => {
    const invalidStructure = JSON.stringify({
      enrichments: [{ missingFields: true }],
    });
    
    expect(() => parseLLMResponse(IssueEnrichmentResponseSchema, invalidStructure))
      .toThrow();
  });
});

describe('coerceLLMResponse', () => {
  it('should return data and empty errors on success', () => {
    const validResponse = JSON.stringify({
      enrichments: [{
        issueIndex: 0,
        rootCause: 'Test',
        businessImpact: 'Test',
        suggestedFix: 'Test',
        confidence: 0.8,
        explanation: 'Test',
        priority: 'low',
      }],
    });

    const { data, errors } = coerceLLMResponse(IssueEnrichmentResponseSchema, validResponse);
    expect(data).toBeDefined();
    expect(errors).toHaveLength(0);
  });

  it('should return null data and errors on failure', () => {
    const invalidResponse = JSON.stringify({
      enrichments: [{ invalid: true }],
    });

    const { data, errors } = coerceLLMResponse(IssueEnrichmentResponseSchema, invalidResponse);
    expect(data).toBeNull();
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should return errors for invalid JSON', () => {
    const { data, errors } = coerceLLMResponse(IssueEnrichmentResponseSchema, 'not json');
    expect(data).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Invalid JSON');
  });
});

describe('IssueEnrichmentResponseSchema', () => {
  it('should validate complete enrichment', () => {
    const response = {
      enrichments: [{
        issueIndex: 0,
        rootCause: 'Missing synchronization between billing system',
        businessImpact: 'Revenue leakage of $5,000 per month',
        suggestedFix: 'Implement invoice validation workflow',
        confidence: 0.92,
        relatedIssueIndices: [1, 2],
        explanation: 'Detailed explanation here',
        priority: 'high',
        tags: ['billing', 'sync'],
      }],
    };

    const result = IssueEnrichmentResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should apply defaults for optional fields', () => {
    const response = {
      enrichments: [{
        issueIndex: 0,
        rootCause: 'Test',
        businessImpact: 'Test',
        suggestedFix: 'Test',
        confidence: 0.8,
        explanation: 'Test',
        priority: 'medium',
      }],
    };

    const result = IssueEnrichmentResponseSchema.parse(response);
    expect(result.enrichments[0].relatedIssueIndices).toEqual([]);
    expect(result.enrichments[0].tags).toEqual([]);
  });
});

describe('ExplanationResponseSchema', () => {
  it('should validate explanation response', () => {
    const response = {
      headline: 'Invoice-Contract Mismatch',
      explanation: 'The invoice amount differs from the contract terms',
      whyItMatters: 'This affects revenue accuracy and compliance',
      recommendation: 'Review and adjust the invoice',
      urgency: 'this_week',
    };

    const result = ExplanationResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});

describe('AnomalyDetectionResponseSchema', () => {
  it('should validate anomaly detection response', () => {
    const response = {
      anomalies: [{
        category: 'billing',
        severity: 'high',
        confidence: 0.88,
        title: 'Unusual billing pattern',
        description: 'Customer has erratic billing amounts',
        evidence: {
          contractIds: ['con_123'],
          invoiceIds: ['inv_456'],
        },
      }],
    };

    const result = AnomalyDetectionResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});

describe('CSVAnalysisResultSchema', () => {
  it('should validate CSV analysis result', () => {
    const response = {
      entityType: 'invoice',
      entityTypeConfidence: 0.95,
      columnMappings: [{
        sourceColumn: 'Invoice ID',
        targetField: 'id',
        category: 'required',
        confidence: 0.9,
        reasoning: 'Direct mapping',
      }],
      requiredMissing: [],
      suggestions: ['Consider adding date format'],
      warnings: [],
    };

    const result = CSVAnalysisResultSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});

describe('StructuredContractDataSchema', () => {
  it('should validate structured contract data', () => {
    const response = {
      documentType: 'msa',
      parties: {
        customer: { name: 'Acme Corp', type: 'company' },
        vendor: { name: 'Tech Inc', type: 'company' },
      },
      dates: {
        effectiveDate: '2024-01-01',
        expirationDate: '2025-01-01',
      },
      financials: {
        contractValue: { amount: 100000, currency: 'USD', period: 'annual' },
        billingCadence: 'monthly',
      },
      terms: {
        termLength: '12 months',
        autoRenew: true,
      },
      products: [{
        name: 'Enterprise License',
        quantity: 100,
        unitPrice: { amount: 100, currency: 'USD' },
      }],
      rawTerms: [],
      summary: 'Master service agreement for enterprise software',
    };

    const result = StructuredContractDataSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});

describe('ExtractTermsResponseSchema', () => {
  it('should validate extract terms response', () => {
    const response = {
      extractions: [{
        termType: 'payment_terms',
        value: 'Net 30',
        confidence: 0.85,
        matchedText: 'Payment due within 30 days',
        reasoning: 'Standard payment terms clause',
      }],
    };

    const result = ExtractTermsResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});

describe('ConflictResolutionSchema', () => {
  it('should validate conflict resolution', () => {
    const response = {
      winningTermIndex: 1,
      reasoning: 'Later amendment supersedes original terms',
      confidence: 0.9,
      appliedRules: ['later_date_wins', 'explicit_override'],
      suggestedAction: 'accept',
    };

    const result = ConflictResolutionSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});

describe('DetectOverrideResponseSchema', () => {
  it('should validate override detection response', () => {
    const response = {
      overrides: [{
        type: 'notwithstanding',
        matchedText: 'Notwithstanding anything to the contrary',
        targetSection: 'Section 3.1',
        confidence: 0.95,
      }],
    };

    const result = DetectOverrideResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});
