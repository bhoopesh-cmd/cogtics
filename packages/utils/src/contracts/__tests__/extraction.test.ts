/**
 * Term Extraction Unit Tests
 */
import { describe, it, expect } from 'vitest';
import { extractTermsFromText, extractTerms, getSupportedTermTypes, isTermTypeSupported } from '../extraction.js';
import type { ClauseSegment } from '../segmentation.js';

describe('Term Extraction', () => {
  describe('extractTermsFromText', () => {
    describe('Pricing Model', () => {
      it('should detect per user pricing', () => {
        const text = 'The subscription fee is $50 per user per month.';
        const terms = extractTermsFromText(text);
        
        const pricingTerm = terms.find(t => t.termType === 'pricing_model');
        expect(pricingTerm).toBeDefined();
        expect(pricingTerm?.value).toMatchObject({ model: 'per_user' });
      });

      it('should detect flat fee pricing', () => {
        const text = 'There is a flat fee of $5,000 per year.';
        const terms = extractTermsFromText(text);
        
        const pricingTerm = terms.find(t => t.termType === 'pricing_model');
        expect(pricingTerm).toBeDefined();
        expect(pricingTerm?.value).toMatchObject({ model: 'flat_fee' });
      });

      it('should detect usage-based pricing', () => {
        const text = 'Fees are calculated on a usage-based pricing model.';
        const terms = extractTermsFromText(text);
        
        const pricingTerm = terms.find(t => t.termType === 'pricing_model');
        expect(pricingTerm).toBeDefined();
        expect(pricingTerm?.value).toMatchObject({ model: 'usage_based' });
      });
    });

    describe('Billing Cadence', () => {
      it('should detect monthly billing', () => {
        const text = 'Fees are billed on a monthly basis.';
        const terms = extractTermsFromText(text);
        
        const billingTerm = terms.find(t => t.termType === 'billing_cadence');
        expect(billingTerm).toBeDefined();
        expect(billingTerm?.value).toMatchObject({ cadence: 'monthly' });
      });

      it('should detect annual billing', () => {
        const text = 'All fees are invoiced annually in advance.';
        const terms = extractTermsFromText(text);
        
        const billingTerm = terms.find(t => t.termType === 'billing_cadence');
        expect(billingTerm).toBeDefined();
        expect(billingTerm?.value).toMatchObject({ cadence: 'annually' });
      });

      it('should detect quarterly billing', () => {
        const text = 'Customer shall be billed on a quarterly basis.';
        const terms = extractTermsFromText(text);
        
        const billingTerm = terms.find(t => t.termType === 'billing_cadence');
        expect(billingTerm).toBeDefined();
        expect(billingTerm?.value).toMatchObject({ cadence: 'quarterly' });
      });
    });

    describe('Discount', () => {
      it('should detect percentage discount', () => {
        const text = 'Customer receives a 20% discount on all services.';
        const terms = extractTermsFromText(text);
        
        const discountTerm = terms.find(t => t.termType === 'discount');
        expect(discountTerm).toBeDefined();
        expect(discountTerm?.value).toMatchObject({ percentage: 20 });
      });

      it('should detect dollar discount', () => {
        const text = 'A $500 discount is applied to the first invoice.';
        const terms = extractTermsFromText(text);
        
        const discountTerm = terms.find(t => t.termType === 'discount');
        expect(discountTerm).toBeDefined();
        expect(discountTerm?.value).toMatchObject({ amount: 500, currency: 'USD' });
      });
    });

    describe('Contract Value', () => {
      it('should detect total contract value', () => {
        const text = 'The total contract value is $120,000.';
        const terms = extractTermsFromText(text);
        
        const valueTerm = terms.find(t => t.termType === 'contract_value');
        expect(valueTerm).toBeDefined();
        expect(valueTerm?.value).toMatchObject({ amount: 120000 });
      });

      it('should detect annual value', () => {
        const text = 'The annual contract value (ACV) is $50,000.';
        const terms = extractTermsFromText(text);
        
        const valueTerm = terms.find(t => t.termType === 'contract_value');
        expect(valueTerm).toBeDefined();
        expect(valueTerm?.value).toMatchObject({ amount: 50000, period: 'annually' });
      });
    });

    describe('Payment Terms', () => {
      it('should detect net 30 payment terms', () => {
        const text = 'Payment is due net 30 days from invoice date.';
        const terms = extractTermsFromText(text);
        
        const paymentTerm = terms.find(t => t.termType === 'payment_terms');
        expect(paymentTerm).toBeDefined();
        expect(paymentTerm?.value).toMatchObject({ netDays: 30 });
      });

      it('should detect due on receipt', () => {
        const text = 'All invoices are due upon receipt.';
        const terms = extractTermsFromText(text);
        
        const paymentTerm = terms.find(t => t.termType === 'payment_terms');
        expect(paymentTerm).toBeDefined();
        expect(paymentTerm?.value).toMatchObject({ dueOnReceipt: true });
      });
    });

    describe('Auto Renew', () => {
      it('should detect auto renewal clause', () => {
        const text = 'This agreement shall automatically renew for successive one-year terms.';
        const terms = extractTermsFromText(text);
        
        const renewTerm = terms.find(t => t.termType === 'auto_renew' || t.termType === 'renewal_terms');
        expect(renewTerm).toBeDefined();
        expect(renewTerm?.value).toMatchObject({ autoRenew: true });
      });

      it('should detect evergreen contracts', () => {
        const text = 'This is an evergreen contract that continues until terminated.';
        const terms = extractTermsFromText(text);
        
        const renewTerm = terms.find(t => t.termType === 'auto_renew');
        expect(renewTerm).toBeDefined();
        expect(renewTerm?.value).toMatchObject({ autoRenew: true });
      });
    });

    describe('Notice Period', () => {
      it('should detect days notice requirement', () => {
        const text = 'Either party may terminate with 30 days prior written notice.';
        const terms = extractTermsFromText(text);
        
        const noticeTerm = terms.find(t => t.termType === 'notice_period');
        expect(noticeTerm).toBeDefined();
        expect(noticeTerm?.value).toMatchObject({ days: 30 });
      });

      it('should detect notice period in termination context', () => {
        const text = 'Termination requires 90 days advance written notice.';
        const terms = extractTermsFromText(text);
        
        const noticeTerm = terms.find(t => t.termType === 'notice_period');
        expect(noticeTerm).toBeDefined();
        expect(noticeTerm?.value).toMatchObject({ days: 90 });
      });
    });

    describe('Term Length', () => {
      it('should detect term length in years', () => {
        const text = 'The initial term of this agreement is 3 years.';
        const terms = extractTermsFromText(text);
        
        const termLength = terms.find(t => t.termType === 'term_length');
        expect(termLength).toBeDefined();
        expect(termLength?.value).toMatchObject({ years: 3 });
      });

      it('should detect term length in months', () => {
        const text = 'This contract has an initial term of 12 months.';
        const terms = extractTermsFromText(text);
        
        const termLength = terms.find(t => t.termType === 'term_length');
        expect(termLength).toBeDefined();
        expect(termLength?.value).toMatchObject({ months: 12 });
      });
    });

    describe('Termination Terms', () => {
      it('should detect termination for cause', () => {
        const text = 'Either party may terminate this agreement for cause.';
        const terms = extractTermsFromText(text);
        
        const termTerm = terms.find(t => t.termType === 'termination_terms');
        expect(termTerm).toBeDefined();
        expect(termTerm?.value).toMatchObject({ terminationForCause: true });
      });

      it('should detect termination for convenience', () => {
        const text = 'Customer may terminate for convenience at any time.';
        const terms = extractTermsFromText(text);
        
        const termTerm = terms.find(t => t.termType === 'termination_terms');
        expect(termTerm).toBeDefined();
        expect(termTerm?.value).toMatchObject({ terminationForConvenience: true });
      });
    });

    describe('Uplift', () => {
      it('should detect annual price increase', () => {
        const text = 'Prices may increase by up to 5% annually.';
        const terms = extractTermsFromText(text);
        
        const upliftTerm = terms.find(t => t.termType === 'uplift');
        expect(upliftTerm).toBeDefined();
        expect(upliftTerm?.value).toMatchObject({ percentage: 5 });
      });

      it('should detect CPI adjustment', () => {
        const text = 'Fees are subject to annual CPI adjustment.';
        const terms = extractTermsFromText(text);
        
        const upliftTerm = terms.find(t => t.termType === 'uplift');
        expect(upliftTerm).toBeDefined();
        expect(upliftTerm?.value).toMatchObject({ cpiLinked: true });
      });
    });
  });

  describe('extractTerms with clauses', () => {
    it('should extract terms from multiple clauses', () => {
      const clauses: ClauseSegment[] = [
        {
          type: 'section',
          label: '1',
          text: 'The subscription fee is $100 per user per month.',
          startOffset: 0,
          endOffset: 50,
          pageNumber: 1,
          sequenceNumber: 0,
          parentIndex: null,
        },
        {
          type: 'section',
          label: '2',
          text: 'All fees are billed on a monthly basis.',
          startOffset: 51,
          endOffset: 90,
          pageNumber: 1,
          sequenceNumber: 1,
          parentIndex: null,
        },
      ];

      const terms = extractTerms(clauses);
      
      expect(terms.find(t => t.termType === 'pricing_model')).toBeDefined();
      expect(terms.find(t => t.termType === 'billing_cadence')).toBeDefined();
    });

    it('should set correct source clause index', () => {
      const clauses: ClauseSegment[] = [
        {
          type: 'paragraph',
          label: null,
          text: 'Some introductory text.',
          startOffset: 0,
          endOffset: 25,
          pageNumber: 1,
          sequenceNumber: 0,
          parentIndex: null,
        },
        {
          type: 'paragraph',
          label: null,
          text: 'Payment is due net 45 days.',
          startOffset: 26,
          endOffset: 55,
          pageNumber: 1,
          sequenceNumber: 1,
          parentIndex: null,
        },
      ];

      const terms = extractTerms(clauses);
      const paymentTerm = terms.find(t => t.termType === 'payment_terms');
      
      expect(paymentTerm).toBeDefined();
      expect(paymentTerm?.sourceClauseIndex).toBe(1);
    });
  });

  describe('confidence scoring', () => {
    it('should have confidence between 0 and 1', () => {
      const text = 'The annual contract value is $100,000. Payment is net 30 days.';
      const terms = extractTermsFromText(text);
      
      for (const term of terms) {
        expect(term.confidence).toBeGreaterThanOrEqual(0);
        expect(term.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('getSupportedTermTypes', () => {
    it('should return array of term types', () => {
      const types = getSupportedTermTypes();
      
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
      expect(types).toContain('pricing_model');
      expect(types).toContain('billing_cadence');
      expect(types).toContain('contract_value');
    });
  });

  describe('isTermTypeSupported', () => {
    it('should return true for supported types', () => {
      expect(isTermTypeSupported('pricing_model')).toBe(true);
      expect(isTermTypeSupported('billing_cadence')).toBe(true);
      expect(isTermTypeSupported('contract_value')).toBe(true);
    });

    it('should return false for unsupported types', () => {
      expect(isTermTypeSupported('unknown_type')).toBe(false);
      expect(isTermTypeSupported('')).toBe(false);
    });
  });
});
