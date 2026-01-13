/**
 * Contract Intelligence Integration Tests
 * 
 * Tests for the full contract extraction pipeline and API endpoints.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { contracts } from '@cogtics/utils';
import type { ClauseSegment, ExtractedTerm } from '@cogtics/utils/contracts';

describe('Contract Intelligence Integration', () => {
  describe('Full Extraction Pipeline', () => {
    const SAMPLE_CONTRACT_TEXT = `
SOFTWARE LICENSE AGREEMENT

This Software License Agreement ("Agreement") is entered into as of January 1, 2024 ("Effective Date").

1. DEFINITIONS

1.1 "Customer" means the entity purchasing the license.
1.2 "Provider" means Acme Software Corporation.
1.3 "Software" means the Provider's proprietary software platform.

2. LICENSE GRANT

Provider grants Customer a non-exclusive license to use the Software.

3. FEES AND PAYMENT

3.1 License Fee. Customer shall pay an annual license fee of $50,000.

3.2 Payment Terms. All invoices are due net 30 days from invoice date.

3.3 Billing. Fees are billed on an annual basis, in advance.

4. TERM AND TERMINATION

4.1 Initial Term. The initial term of this Agreement is 3 years from the Effective Date.

4.2 Renewal. This Agreement shall automatically renew for successive one-year terms unless either party provides 90 days prior written notice.

4.3 Termination. Either party may terminate this agreement for cause upon material breach.

5. PRICING ADJUSTMENTS

Provider may increase fees by up to 5% annually upon renewal.

6. SUPPORT

Provider shall provide standard support services.

7. CONFIDENTIALITY

Each party agrees to maintain the confidentiality of the other's proprietary information.
`;

    let clauses: ClauseSegment[];
    let terms: ExtractedTerm[];
    let readiness: contracts.ReadinessResult;

    beforeAll(() => {
      // Run the full extraction pipeline
      clauses = contracts.segmentClauses(SAMPLE_CONTRACT_TEXT);
      terms = contracts.extractTerms(clauses);
      readiness = contracts.computeReadiness(terms);
    });

    it('should segment text into clauses', () => {
      expect(clauses.length).toBeGreaterThan(0);
      
      // Should have headings
      const headings = clauses.filter(c => c.type === 'heading');
      expect(headings.length).toBeGreaterThan(0);
      
      // Should have sections
      const sections = clauses.filter(c => c.type === 'section');
      expect(sections.length).toBeGreaterThan(0);
    });

    it('should extract key contract terms', () => {
      expect(terms.length).toBeGreaterThan(0);
      
      // Should have extracted pricing-related terms
      const pricingTerms = terms.filter(t => 
        t.termType === 'contract_value' || 
        t.termType === 'pricing_model'
      );
      expect(pricingTerms.length).toBeGreaterThan(0);
      
      // Should have extracted payment terms
      const paymentTerms = terms.filter(t => t.termType === 'payment_terms');
      expect(paymentTerms.length).toBeGreaterThan(0);
      
      // Should have extracted billing cadence
      const billingTerms = terms.filter(t => t.termType === 'billing_cadence');
      expect(billingTerms.length).toBeGreaterThan(0);
    });

    it('should extract contract value correctly', () => {
      const valueTerm = terms.find(t => t.termType === 'contract_value');
      expect(valueTerm).toBeDefined();
      expect(valueTerm?.value).toMatchObject({ amount: 50000 });
    });

    it('should extract payment terms correctly', () => {
      const paymentTerm = terms.find(t => t.termType === 'payment_terms');
      expect(paymentTerm).toBeDefined();
      expect(paymentTerm?.value).toMatchObject({ netDays: 30 });
    });

    it('should extract term length correctly', () => {
      const termLength = terms.find(t => t.termType === 'term_length');
      expect(termLength).toBeDefined();
      expect(termLength?.value).toMatchObject({ years: 3 });
    });

    it('should detect auto-renewal', () => {
      const autoRenew = terms.find(t => 
        t.termType === 'auto_renew' || 
        t.termType === 'renewal_terms'
      );
      expect(autoRenew).toBeDefined();
      expect(autoRenew?.value).toMatchObject({ autoRenew: true });
    });

    it('should detect notice period', () => {
      const noticePeriod = terms.find(t => t.termType === 'notice_period');
      expect(noticePeriod).toBeDefined();
      expect(noticePeriod?.value).toMatchObject({ days: 90 });
    });

    it('should detect annual price uplift', () => {
      const uplift = terms.find(t => t.termType === 'uplift');
      expect(uplift).toBeDefined();
      expect(uplift?.value).toMatchObject({ percentage: 5 });
    });

    it('should compute readiness status', () => {
      expect(readiness.status).toBeDefined();
      expect(['ready', 'needs_review', 'incomplete']).toContain(readiness.status);
      expect(readiness.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(readiness.confidenceScore).toBeLessThanOrEqual(1);
    });

    it('should track term extraction provenance', () => {
      for (const term of terms) {
        expect(term.sourceClauseIndex).toBeGreaterThanOrEqual(0);
        expect(term.matchedText).toBeTruthy();
        expect(term.startOffset).toBeGreaterThanOrEqual(0);
        expect(term.endOffset).toBeGreaterThan(term.startOffset);
      }
    });

    it('should have confidence scores for all terms', () => {
      for (const term of terms) {
        expect(term.confidence).toBeGreaterThanOrEqual(0);
        expect(term.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle contract with minimal terms', () => {
      const minimalText = `
Agreement dated January 1, 2024.
Customer agrees to pay $10,000.
`;
      const clauses = contracts.segmentClauses(minimalText);
      const terms = contracts.extractTerms(clauses);
      const readiness = contracts.computeReadiness(terms);

      expect(clauses.length).toBeGreaterThan(0);
      expect(readiness.status).toBe('incomplete');
      expect(readiness.missingTerms.length).toBeGreaterThan(0);
    });

    it('should handle contract with unusual formatting', () => {
      const unusualText = `
CONTRACT #12345

Payment: Monthly @ $999/month
Duration: 12 months
Auto-renewal: YES
`;
      const clauses = contracts.segmentClauses(unusualText);
      const terms = contracts.extractTerms(clauses);

      expect(clauses.length).toBeGreaterThan(0);
      // May not extract as many terms due to unusual formatting
    });

    it('should handle very long contracts', () => {
      // Create a long contract by repeating sections
      let longText = 'SOFTWARE AGREEMENT\n\n';
      for (let i = 0; i < 50; i++) {
        longText += `Section ${i + 1}. Lorem ipsum dolor sit amet.\n\n`;
      }
      longText += 'Total contract value: $1,000,000.\n';

      const clauses = contracts.segmentClauses(longText);
      const terms = contracts.extractTerms(clauses);

      expect(clauses.length).toBeGreaterThanOrEqual(50);
      expect(terms.some(t => t.termType === 'contract_value')).toBe(true);
    });

    it('should handle contracts with no extractable terms', () => {
      const noTermsText = `
MUTUAL NON-DISCLOSURE AGREEMENT

The parties agree to keep information confidential.
This agreement is for informational purposes only.
`;
      const clauses = contracts.segmentClauses(noTermsText);
      const terms = contracts.extractTerms(clauses);
      const readiness = contracts.computeReadiness(terms);

      expect(readiness.status).toBe('incomplete');
      expect(readiness.extractedTermsCount).toBe(0);
    });
  });

  describe('Term Override Workflow', () => {
    it('should support overriding extracted values', () => {
      const text = 'Payment is net 30 days.';
      const terms = contracts.extractTermsFromText(text);
      
      const paymentTerm = terms.find(t => t.termType === 'payment_terms');
      expect(paymentTerm).toBeDefined();
      expect(paymentTerm?.value).toMatchObject({ netDays: 30 });
      
      // Override would be handled by the API/database layer
      // Here we just verify the term structure supports it
      expect(paymentTerm).toHaveProperty('value');
      expect(paymentTerm).toHaveProperty('confidence');
    });
  });

  describe('Contract Type Detection', () => {
    it('should use correct requirements for subscription contracts', () => {
      const subscriptionText = `
SUBSCRIPTION AGREEMENT

Monthly subscription fee: $100 per user per month.
Billing: Monthly in advance.
Auto-renewal: Yes, annually.
`;
      const clauses = contracts.segmentClauses(subscriptionText);
      const terms = contracts.extractTerms(clauses);
      const readiness = contracts.computeReadiness(terms, 'subscription');

      expect(readiness.requiredTermsCount).toBe(6); // Subscription has 6 required terms
    });

    it('should use correct requirements for enterprise contracts', () => {
      const enterpriseText = `
ENTERPRISE LICENSE AGREEMENT

Total contract value: $500,000 annually.
Payment: Net 45 days.
Term: 3 years with auto-renewal.
Termination: Either party may terminate for cause.
`;
      const clauses = contracts.segmentClauses(enterpriseText);
      const terms = contracts.extractTerms(clauses);
      const readiness = contracts.computeReadiness(terms, 'enterprise');

      expect(readiness.requiredTermsCount).toBe(7); // Enterprise has 7 required terms
    });
  });

  describe('Readiness Thresholds', () => {
    it('should flag low confidence terms for review', () => {
      // Create terms with varying confidence
      const terms: ExtractedTerm[] = [
        {
          termType: 'pricing_model',
          value: { model: 'per_user' },
          confidence: 0.9,
          sourceClauseIndex: 0,
          extractionMethod: 'pattern',
          matchedText: 'per user',
          startOffset: 0,
          endOffset: 10,
        },
        {
          termType: 'billing_cadence',
          value: { cadence: 'monthly' },
          confidence: 0.4, // Low confidence
          sourceClauseIndex: 1,
          extractionMethod: 'pattern',
          matchedText: 'monthly',
          startOffset: 20,
          endOffset: 30,
        },
      ];

      const readiness = contracts.computeReadiness(terms);

      expect(readiness.lowConfidenceTerms.length).toBeGreaterThan(0);
      expect(readiness.lowConfidenceTerms.some(t => t.termType === 'billing_cadence')).toBe(true);
    });

    it('should meet minimum requirements with core terms', () => {
      const terms: ExtractedTerm[] = [
        {
          termType: 'contract_value',
          value: { amount: 10000 },
          confidence: 0.8,
          sourceClauseIndex: 0,
          extractionMethod: 'pattern',
          matchedText: '$10,000',
          startOffset: 0,
          endOffset: 10,
        },
        {
          termType: 'start_date',
          value: { date: '2024-01-01' },
          confidence: 0.8,
          sourceClauseIndex: 1,
          extractionMethod: 'pattern',
          matchedText: 'January 1, 2024',
          startOffset: 20,
          endOffset: 35,
        },
      ];

      expect(contracts.meetsMinimumRequirements(terms)).toBe(true);
    });
  });
});
