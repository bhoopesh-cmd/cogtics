/**
 * DetectionLLM Unit Tests
 * 
 * Tests for AI-powered issue enrichment functionality.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DetectionLLM, type AIEnrichedIssue } from '../detection.js';
import type { RuleIssue, ContractWithTerms, InvoiceWithLines, Customer } from '@cogtics/rules';

// Mock fetch for OpenAI API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('DetectionLLM', () => {
  let llm: DetectionLLM;

  beforeEach(() => {
    vi.stubEnv('OPENAI_API_KEY', 'test-api-key');
    llm = new DetectionLLM({ apiKey: 'test-api-key' });
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('enrichIssues', () => {
    const mockIssue: RuleIssue = {
      ruleId: 'R001',
      ruleVersion: '1.0.0',
      category: 'billing',
      severity: 'high',
      confidence: 0.9,
      impactAmount: 1000,
      currency: 'USD',
      expected: { amount: 1000 },
      actual: { amount: 900 },
      dimensions: {
        contractId: 'con_123',
        invoiceId: 'inv_456',
      },
      contractId: 'con_123',
      invoiceId: 'inv_456',
    };

    const mockContext = {
      contracts: [{
        id: 'con_123',
        name: 'Test Contract',
        customer_id: 'cust_789',
        terms: [],
      }] as ContractWithTerms[],
      invoices: [{
        id: 'inv_456',
        invoice_number: 'INV-001',
        total_amount: 900,
        lines: [],
      }] as InvoiceWithLines[],
      customers: [{
        id: 'cust_789',
        name: 'Test Customer',
      }] as Customer[],
    };

    it('should enrich issues with AI analysis', async () => {
      const mockResponse = {
        enrichments: [{
          issueIndex: 0,
          rootCause: 'Invoice amount was calculated incorrectly',
          businessImpact: 'Revenue underreported by $100',
          suggestedFix: 'Issue credit memo and correct invoice',
          confidence: 0.85,
          relatedIssueIndices: [],
          explanation: 'The invoice amount is $100 less than expected',
          priority: 'high',
          tags: ['billing', 'amount_mismatch'],
        }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify(mockResponse) } }],
        }),
      });

      const result = await llm.enrichIssues([mockIssue], mockContext);

      expect(result).toHaveLength(1);
      expect(result[0].aiAnalysis).toBeDefined();
      expect(result[0].aiAnalysis.rootCause).toBe('Invoice amount was calculated incorrectly');
      expect(result[0].aiAnalysis.businessImpact).toBe('Revenue underreported by $100');
      expect(result[0].aiAnalysis.priority).toBe('high');
      expect(result[0].aiEnrichedAt).toBeInstanceOf(Date);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      const result = await llm.enrichIssues([mockIssue], mockContext);

      expect(result).toHaveLength(1);
      expect(result[0].aiAnalysis).toBeDefined();
      expect(result[0].aiAnalysis.rootCause).toBe('AI analysis unavailable');
      expect(result[0].aiAnalysis.confidence).toBe(0);
    });

    it('should return empty array for empty issues', async () => {
      const result = await llm.enrichIssues([], mockContext);
      expect(result).toHaveLength(0);
    });

    it('should batch issues by contract', async () => {
      const issues = [
        { ...mockIssue, contractId: 'con_123' },
        { ...mockIssue, contractId: 'con_123', invoiceId: 'inv_457' },
        { ...mockIssue, contractId: 'con_456' },
      ];

      const mockResponse = {
        enrichments: issues.map((_, idx) => ({
          issueIndex: idx % 2,  // Will be 0 for first batch, 0 for second
          rootCause: `Root cause ${idx}`,
          businessImpact: `Impact ${idx}`,
          suggestedFix: `Fix ${idx}`,
          confidence: 0.8,
          relatedIssueIndices: [],
          explanation: `Explanation ${idx}`,
          priority: 'medium',
          tags: [],
        })),
      };

      // Will be called twice: once for con_123 (2 issues), once for con_456 (1 issue)
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify(mockResponse) } }],
        }),
      });

      const result = await llm.enrichIssues(issues, {
        ...mockContext,
        contracts: [
          ...mockContext.contracts,
          { id: 'con_456', name: 'Another Contract', terms: [] } as ContractWithTerms,
        ],
      });

      expect(result).toHaveLength(3);
      expect(mockFetch).toHaveBeenCalledTimes(2); // Two batches
    });
  });

  describe('explainIssue', () => {
    const mockIssue: RuleIssue = {
      ruleId: 'R002',
      ruleVersion: '1.0.0',
      category: 'billing',
      severity: 'medium',
      confidence: 0.75,
      expected: { invoiceCount: 1 },
      actual: { invoiceCount: 0 },
      dimensions: { contractId: 'con_123' },
    };

    it('should generate explanation for issue', async () => {
      const mockResponse = {
        headline: 'Missing invoice for billing period',
        explanation: 'An invoice was expected but not found for the contract.',
        whyItMatters: 'Revenue may be underreported',
        recommendation: 'Generate missing invoice',
        urgency: 'this_week',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify(mockResponse) } }],
        }),
      });

      const result = await llm.explainIssue(mockIssue, {
        audienceLevel: 'manager',
        includeRecommendation: true,
      });

      expect(result.headline).toBe('Missing invoice for billing period');
      expect(result.explanation).toContain('invoice');
      expect(result.urgency).toBe('this_week');
    });

    it('should fallback on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      const result = await llm.explainIssue(mockIssue);

      expect(result.headline).toContain('billing');
      expect(result.urgency).toBe('this_month'); // Maps from medium severity
    });
  });

  describe('suggestFix', () => {
    const mockIssue: RuleIssue = {
      ruleId: 'R001',
      ruleVersion: '1.0.0',
      category: 'billing',
      severity: 'high',
      confidence: 0.9,
      impactAmount: 500,
      currency: 'USD',
      expected: { amount: 1000 },
      actual: { amount: 500 },
      dimensions: { contractId: 'con_123', invoiceId: 'inv_456' },
      contractId: 'con_123',
      invoiceId: 'inv_456',
    };

    const mockContext = {
      contracts: [{
        id: 'con_123',
        name: 'Test Contract',
        terms: [],
      }] as ContractWithTerms[],
      invoices: [{
        id: 'inv_456',
        invoice_number: 'INV-001',
        total_amount: 500,
        invoice_date: new Date(),
        lines: [],
      }] as InvoiceWithLines[],
      customers: [] as Customer[],
    };

    it('should generate fix suggestion', async () => {
      const mockResponse = {
        immediateAction: 'Issue corrective invoice for $500',
        systemChanges: [{
          type: 'invoice_adjustment',
          description: 'Create adjustment invoice',
          parameters: { amount: 500 },
        }],
        processImprovements: ['Add validation for invoice amounts'],
        estimatedImpact: {
          revenueChange: 500,
          currency: 'USD',
          confidence: 0.9,
        },
        riskAssessment: 'Low risk - straightforward correction',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify(mockResponse) } }],
        }),
      });

      const result = await llm.suggestFix(mockIssue, mockContext);

      expect(result.immediateAction).toBe('Issue corrective invoice for $500');
      expect(result.systemChanges).toHaveLength(1);
      expect(result.estimatedImpact.revenueChange).toBe(500);
    });

    it('should fallback on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      const result = await llm.suggestFix(mockIssue, mockContext);

      expect(result.immediateAction).toBe('Review issue manually');
      expect(result.systemChanges).toHaveLength(0);
    });
  });
});

describe('Detection Prompts', () => {
  it('should generate proper issue enrichment prompt', async () => {
    const { issueEnrichmentPrompt } = await import('../prompts/detection.js');

    const issues: RuleIssue[] = [{
      ruleId: 'R001',
      ruleVersion: '1.0.0',
      category: 'billing',
      severity: 'high',
      confidence: 0.9,
      expected: { amount: 1000 },
      actual: { amount: 900 },
      dimensions: {},
    }];

    const prompt = issueEnrichmentPrompt(issues, {
      contractName: 'Test Contract',
      customerName: 'Test Customer',
      contractValue: 10000,
      currency: 'USD',
    });

    expect(prompt).toContain('Test Contract');
    expect(prompt).toContain('Test Customer');
    expect(prompt).toContain('R001');
    expect(prompt).toContain('enrichments');
  });
});
