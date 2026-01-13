/**
 * Phase 5: Contract Intelligence Smoke Tests
 * 
 * Verifies that all Phase 5 components are properly wired and accessible.
 */
import { describe, it, expect } from 'vitest';
import { contracts } from '@cogtics/utils';

describe('Phase 5: Contract Intelligence Smoke Tests', () => {
  describe('Zod Schemas', () => {
    it('should export contract intelligence schemas', async () => {
      const schemas = await import('@cogtics/schemas');
      
      // ID generators
      expect(schemas.createContractDocumentId).toBeDefined();
      expect(schemas.createClauseId).toBeDefined();
      expect(schemas.createTermOverrideId).toBeDefined();
      expect(schemas.createReadinessId).toBeDefined();
      expect(schemas.createContractTermId).toBeDefined();
      
      // Enums
      expect(schemas.ClauseTypeSchema).toBeDefined();
      expect(schemas.TermTypeSchema).toBeDefined();
      expect(schemas.ExtractionMethodSchema).toBeDefined();
      expect(schemas.ReadinessStatusSchema).toBeDefined();
      expect(schemas.DocumentStatusSchema).toBeDefined();
    });

    it('should export contract job payload schemas', async () => {
      const schemas = await import('@cogtics/schemas');
      
      expect(schemas.ContractExtractJobPayloadSchema).toBeDefined();
      expect(schemas.ClauseSegmentJobPayloadSchema).toBeDefined();
      expect(schemas.TermExtractJobPayloadSchema).toBeDefined();
      expect(schemas.ReadinessComputeJobPayloadSchema).toBeDefined();
    });

    it('should export contract API request schemas', async () => {
      const schemas = await import('@cogtics/schemas');
      
      expect(schemas.TermOverrideRequestSchema).toBeDefined();
      expect(schemas.MarkReviewedRequestSchema).toBeDefined();
      expect(schemas.ReprocessRequestSchema).toBeDefined();
    });

    it('should include Phase 5 queues in QueueNameSchema', async () => {
      const { QueueNameSchema } = await import('@cogtics/schemas');
      
      const result1 = QueueNameSchema.safeParse('contracts.pdf.extract');
      expect(result1.success).toBe(true);
      
      const result2 = QueueNameSchema.safeParse('contracts.clause.segment');
      expect(result2.success).toBe(true);
      
      const result3 = QueueNameSchema.safeParse('contracts.terms.extract');
      expect(result3.success).toBe(true);
      
      const result4 = QueueNameSchema.safeParse('contracts.readiness.compute');
      expect(result4.success).toBe(true);
    });

    it('should include Phase 5 jobs in JobPayloadSchema', async () => {
      const { JobPayloadSchema } = await import('@cogtics/schemas');
      
      const extractPayload = {
        type: 'contracts.pdf.extract',
        tenantId: 'test_tenant',
        snapshotId: 'test_snapshot',
        documentId: 'test_doc',
        s3Key: 'test/key.pdf',
      };
      
      const result = JobPayloadSchema.safeParse(extractPayload);
      expect(result.success).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    it('should export contract segmentation utilities', () => {
      expect(contracts.segmentClauses).toBeDefined();
      expect(typeof contracts.segmentClauses).toBe('function');
      
      expect(contracts.findPageBreaks).toBeDefined();
      expect(typeof contracts.findPageBreaks).toBe('function');
    });

    it('should export term extraction utilities', () => {
      expect(contracts.extractTerms).toBeDefined();
      expect(typeof contracts.extractTerms).toBe('function');
      
      expect(contracts.extractTermsFromText).toBeDefined();
      expect(typeof contracts.extractTermsFromText).toBe('function');
      
      expect(contracts.getSupportedTermTypes).toBeDefined();
      expect(typeof contracts.getSupportedTermTypes).toBe('function');
    });

    it('should export readiness computation utilities', () => {
      expect(contracts.computeReadiness).toBeDefined();
      expect(typeof contracts.computeReadiness).toBe('function');
      
      expect(contracts.getRequiredTermsForType).toBeDefined();
      expect(typeof contracts.getRequiredTermsForType).toBe('function');
      
      expect(contracts.meetsMinimumRequirements).toBeDefined();
      expect(typeof contracts.meetsMinimumRequirements).toBe('function');
    });

    it('should perform basic term extraction', () => {
      const text = 'Payment is due net 30 days. Annual fee is $50,000.';
      const terms = contracts.extractTermsFromText(text);
      
      expect(Array.isArray(terms)).toBe(true);
      expect(terms.length).toBeGreaterThan(0);
    });

    it('should compute readiness for terms', () => {
      const text = 'Total annual value: $100,000. Monthly billing. Auto-renews annually.';
      const terms = contracts.extractTermsFromText(text);
      const readiness = contracts.computeReadiness(terms);
      
      expect(readiness).toHaveProperty('status');
      expect(readiness).toHaveProperty('confidenceScore');
      expect(readiness).toHaveProperty('missingTerms');
      expect(readiness).toHaveProperty('lowConfidenceTerms');
    });
  });

  describe('Exit Criteria Verification', () => {
    it('should support clause-level extraction', () => {
      const text = `
1. DEFINITIONS

1.1 Customer means the party.
1.2 Provider means Acme Corp.

2. TERMS

This paragraph explains the terms.
`;
      const clauses = contracts.segmentClauses(text);
      
      expect(clauses.length).toBeGreaterThan(0);
      expect(clauses.some(c => c.type === 'heading')).toBe(true);
    });

    it('should extract terms with confidence scores', () => {
      const text = 'Payment is due net 30 days.';
      const terms = contracts.extractTermsFromText(text);
      
      expect(terms.length).toBeGreaterThan(0);
      for (const term of terms) {
        expect(term.confidence).toBeGreaterThanOrEqual(0);
        expect(term.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should track term provenance', () => {
      const text = 'Annual fee of $50,000 due net 30 days';
      const terms = contracts.extractTermsFromText(text);
      
      expect(terms.length).toBeGreaterThan(0);
      for (const term of terms) {
        expect(term.matchedText).toBeTruthy();
        expect(term.startOffset).toBeGreaterThanOrEqual(0);
        expect(term.endOffset).toBeGreaterThan(term.startOffset);
        expect(term.extractionMethod).toBeDefined();
      }
    });

    it('should compute readiness status', () => {
      const terms = contracts.extractTermsFromText('Annual value: $100,000. Term: 3 years.');
      const readiness = contracts.computeReadiness(terms);
      
      expect(['ready', 'needs_review', 'incomplete']).toContain(readiness.status);
      expect(readiness.requiredTermsCount).toBeGreaterThan(0);
    });

    it('should identify missing terms for readiness gating', () => {
      // Minimal terms - should have missing required terms
      const terms = contracts.extractTermsFromText('Some introductory text.');
      const readiness = contracts.computeReadiness(terms);
      
      expect(readiness.missingTerms.length).toBeGreaterThan(0);
    });

    it('should flag low-confidence terms for review', () => {
      // Create a term with low confidence
      const terms: contracts.ExtractedTerm[] = [
        {
          termType: 'pricing_model',
          value: { model: 'unknown' },
          confidence: 0.3,
          sourceClauseIndex: 0,
          extractionMethod: 'pattern',
          matchedText: 'test',
          startOffset: 0,
          endOffset: 4,
        },
      ];
      
      const readiness = contracts.computeReadiness(terms);
      
      expect(readiness.lowConfidenceTerms.length).toBeGreaterThan(0);
    });
  });

  describe('ID Generators', () => {
    it('should generate unique contract document IDs', async () => {
      const { createContractDocumentId } = await import('@cogtics/schemas');
      
      const id1 = createContractDocumentId();
      const id2 = createContractDocumentId();
      
      expect(id1).toMatch(/^cdoc_/);
      expect(id2).toMatch(/^cdoc_/);
      expect(id1).not.toBe(id2);
    });

    it('should generate unique clause IDs', async () => {
      const { createClauseId } = await import('@cogtics/schemas');
      
      const id1 = createClauseId();
      const id2 = createClauseId();
      
      expect(id1).toMatch(/^clau_/);
      expect(id2).toMatch(/^clau_/);
      expect(id1).not.toBe(id2);
    });

    it('should generate unique term override IDs', async () => {
      const { createTermOverrideId } = await import('@cogtics/schemas');
      
      const id1 = createTermOverrideId();
      const id2 = createTermOverrideId();
      
      expect(id1).toMatch(/^tovr_/);
      expect(id2).toMatch(/^tovr_/);
      expect(id1).not.toBe(id2);
    });

    it('should generate unique readiness IDs', async () => {
      const { createReadinessId } = await import('@cogtics/schemas');
      
      const id1 = createReadinessId();
      const id2 = createReadinessId();
      
      expect(id1).toMatch(/^crdy_/);
      expect(id2).toMatch(/^crdy_/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('Term Types', () => {
    it('should support all expected term types', () => {
      const supportedTypes = contracts.getSupportedTermTypes();
      
      expect(supportedTypes).toContain('pricing_model');
      expect(supportedTypes).toContain('billing_cadence');
      expect(supportedTypes).toContain('contract_value');
      expect(supportedTypes).toContain('payment_terms');
      expect(supportedTypes).toContain('term_length');
      expect(supportedTypes).toContain('auto_renew');
      expect(supportedTypes).toContain('notice_period');
      expect(supportedTypes).toContain('termination_terms');
      expect(supportedTypes).toContain('discount');
      expect(supportedTypes).toContain('uplift');
    });

    it('should validate term types', () => {
      expect(contracts.isTermTypeSupported('pricing_model')).toBe(true);
      expect(contracts.isTermTypeSupported('billing_cadence')).toBe(true);
      expect(contracts.isTermTypeSupported('unknown_type')).toBe(false);
    });
  });

  describe('Contract Types', () => {
    it('should support multiple contract types', () => {
      const contractTypes = contracts.getSupportedContractTypes();
      
      expect(contractTypes).toContain('subscription');
      expect(contractTypes).toContain('enterprise');
      expect(contractTypes).toContain('saas');
      expect(contractTypes).toContain('services');
      expect(contractTypes).toContain('license');
    });

    it('should return required terms for each type', () => {
      const defaultTerms = contracts.getRequiredTermsForType();
      const subscriptionTerms = contracts.getRequiredTermsForType('subscription');
      const enterpriseTerms = contracts.getRequiredTermsForType('enterprise');
      
      expect(defaultTerms.length).toBeGreaterThan(0);
      expect(subscriptionTerms.length).toBeGreaterThan(0);
      expect(enterpriseTerms.length).toBeGreaterThan(0);
    });
  });
});
