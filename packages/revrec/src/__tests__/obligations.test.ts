/**
 * Obligation Identification Tests
 */
import { describe, it, expect } from 'vitest';
import { identifyObligations } from '../obligations.js';
import type { ContractInput } from '../types.js';

describe('identifyObligations', () => {
  it('should create default subscription obligation when no terms provided', () => {
    const contract: ContractInput = {
      id: 'contract_1',
      customerId: 'customer_1',
      name: 'Test Contract',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      arr: 120000,
      currency: 'USD',
      billingFrequency: 'monthly',
      terms: [],
    };

    const obligations = identifyObligations(contract);

    expect(obligations).toHaveLength(1);
    expect(obligations[0].obligationType).toBe('subscription');
    expect(obligations[0].transactionPrice).toBe(120000);
    expect(obligations[0].description).toBe('Test Contract - Subscription Service');
    expect(obligations[0].recognitionMethod).toBe('straight_line');
  });

  it('should create obligation from contract_value term', () => {
    const contract: ContractInput = {
      id: 'contract_1',
      customerId: 'customer_1',
      name: 'Enterprise License',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      arr: null,
      currency: 'USD',
      billingFrequency: 'annually',
      terms: [
        {
          id: 'term_1',
          termType: 'contract_value',
          value: 50000,
          confidence: 95,
        },
      ],
    };

    const obligations = identifyObligations(contract);

    expect(obligations).toHaveLength(1);
    expect(obligations[0].obligationType).toBe('subscription');
    expect(obligations[0].transactionPrice).toBe(50000);
  });

  it('should handle contract_value as string with currency', () => {
    const contract: ContractInput = {
      id: 'contract_1',
      customerId: 'customer_1',
      name: 'Test',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      arr: 10000,
      currency: 'USD',
      billingFrequency: 'monthly',
      terms: [
        {
          id: 'term_1',
          termType: 'contract_value',
          value: '$50,000',
          confidence: 90,
        },
      ],
    };

    const obligations = identifyObligations(contract);

    expect(obligations[0].transactionPrice).toBe(50000);
  });

  it('should handle contract_value as object with amount', () => {
    const contract: ContractInput = {
      id: 'contract_1',
      customerId: 'customer_1',
      name: 'Test',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      arr: 10000,
      currency: 'USD',
      billingFrequency: 'monthly',
      terms: [
        {
          id: 'term_1',
          termType: 'contract_value',
          value: { amount: 75000, currency: 'USD' },
          confidence: 95,
        },
      ],
    };

    const obligations = identifyObligations(contract);

    expect(obligations[0].transactionPrice).toBe(75000);
  });

  it('should return empty array for zero value contract', () => {
    const contract: ContractInput = {
      id: 'contract_1',
      customerId: 'customer_1',
      name: 'Free Trial',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      arr: 0,
      currency: 'USD',
      billingFrequency: 'monthly',
      terms: [],
    };

    const obligations = identifyObligations(contract);

    expect(obligations).toHaveLength(0);
  });

  it('should throw error for end date before start date', () => {
    const contract: ContractInput = {
      id: 'contract_1',
      customerId: 'customer_1',
      name: 'Invalid Contract',
      startDate: new Date('2024-12-31'),
      endDate: new Date('2024-01-01'),
      arr: 10000,
      currency: 'USD',
      billingFrequency: 'monthly',
      terms: [],
    };

    expect(() => identifyObligations(contract)).toThrow('Invalid contract dates');
  });

  it('should use current date as fallback for missing start date', () => {
    const contract: ContractInput = {
      id: 'contract_1',
      customerId: 'customer_1',
      name: 'Test',
      startDate: null,
      endDate: null,
      arr: 12000,
      currency: 'USD',
      billingFrequency: 'monthly',
      terms: [],
    };

    const obligations = identifyObligations(contract);

    expect(obligations).toHaveLength(1);
    expect(obligations[0].serviceStartDate).toBeInstanceOf(Date);
    expect(obligations[0].serviceEndDate).toBeInstanceOf(Date);
  });

  it('should create usage obligation from usage_terms', () => {
    const contract: ContractInput = {
      id: 'contract_1',
      customerId: 'customer_1',
      name: 'Usage Contract',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      arr: 5000,
      currency: 'USD',
      billingFrequency: 'monthly',
      terms: [
        {
          id: 'term_1',
          termType: 'usage_terms',
          value: 'per API call pricing',
          confidence: 85,
        },
      ],
    };

    const obligations = identifyObligations(contract);

    expect(obligations).toHaveLength(1);
    expect(obligations[0].obligationType).toBe('usage');
    expect(obligations[0].recognitionMethod).toBe('usage_based');
  });

  it('should create support obligation from support_terms', () => {
    const contract: ContractInput = {
      id: 'contract_1',
      customerId: 'customer_1',
      name: 'Support Contract',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      arr: 24000,
      currency: 'USD',
      billingFrequency: 'monthly',
      terms: [
        {
          id: 'term_1',
          termType: 'support_terms',
          value: '24/7 support included',
          confidence: 90,
        },
      ],
    };

    const obligations = identifyObligations(contract);

    expect(obligations).toHaveLength(1);
    expect(obligations[0].obligationType).toBe('support');
  });

  it('should include source term IDs in obligation', () => {
    const contract: ContractInput = {
      id: 'contract_1',
      customerId: 'customer_1',
      name: 'Test',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      arr: 10000,
      currency: 'USD',
      billingFrequency: 'monthly',
      terms: [
        { id: 'term_1', termType: 'contract_value', value: 10000, confidence: 95 },
        { id: 'term_2', termType: 'billing_cadence', value: 'monthly', confidence: 90 },
      ],
    };

    const obligations = identifyObligations(contract);

    expect(obligations[0].sourceTermIds).toContain('term_1');
    expect(obligations[0].sourceTermIds).toContain('term_2');
  });
});
