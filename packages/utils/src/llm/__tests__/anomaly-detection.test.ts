/**
 * AnomalyDetectionLLM Unit Tests
 * 
 * Tests for AI-powered anomaly detection functionality.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnomalyDetectionLLM } from '../anomaly-detection.js';
import type { RuleIssue, RuleContext, ContractWithTerms, InvoiceWithLines } from '@cogtics/rules';

// Mock fetch for OpenAI API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AnomalyDetectionLLM', () => {
  let llm: AnomalyDetectionLLM;

  beforeEach(() => {
    vi.stubEnv('OPENAI_API_KEY', 'test-api-key');
    llm = new AnomalyDetectionLLM({ apiKey: 'test-api-key', maxRetries: 1 });
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const createMockContext = (): RuleContext => ({
    tenantId: 'tenant_test',
    snapshotId: 'snap_test',
    snapshotDate: new Date(),
    runId: 'run_test',
    config: {} as any,
    dataQuality: {
      snapshotCompleteness: 1.0,
      usageDataStale: false,
      usageDataAgeHours: 0,
      crmDataStale: false,
      crmDataAgeHours: 0,
      contractReadiness: new Map(),
      missingMasterData: [],
      fxRatesAvailable: new Set(),
    },
    contracts: [
      {
        id: 'con_123',
        name: 'Contract A',
        total_value: 10000,
        currency: 'USD',
        customer_id: 'cust_1',
        terms: [],
      } as ContractWithTerms,
      {
        id: 'con_456',
        name: 'Contract B',
        total_value: 10000,
        currency: 'USD',
        customer_id: 'cust_1',
        terms: [],
      } as ContractWithTerms,
      {
        id: 'con_789',
        name: 'Contract C',
        total_value: 50000,
        currency: 'USD',
        customer_id: 'cust_2',
        terms: [],
      } as ContractWithTerms,
    ],
    invoices: [
      {
        id: 'inv_123',
        contract_id: 'con_123',
        total_amount: 1000,
        currency: 'USD',
        invoice_date: new Date(),
        lines: [],
      } as InvoiceWithLines,
      {
        id: 'inv_456',
        contract_id: 'con_456',
        total_amount: 500,
        currency: 'USD',
        invoice_date: new Date(),
        lines: [],
      } as InvoiceWithLines,
    ],
    payments: [],
    usageEvents: [],
    customers: [
      { id: 'cust_1', name: 'Customer 1' },
      { id: 'cust_2', name: 'Customer 2' },
    ] as any[],
    products: [],
    schedules: [],
    obligations: [],
    fxRates: new Map(),
    currentRunIssues: [],
  });

  describe('detectAnomalies', () => {
    it('should detect semantic anomalies', async () => {
      const mockResponse = {
        anomalies: [{
          category: 'semantic',
          severity: 'high',
          confidence: 0.85,
          title: 'Pricing inconsistency detected',
          description: 'Customer 1 has different pricing for similar contracts',
          evidence: {
            contractIds: ['con_123', 'con_456'],
            invoiceIds: ['inv_123', 'inv_456'],
            relevantFields: { priceDifference: 500 },
          },
          reasoning: 'Same customer should have consistent pricing',
        }],
      };

      // Mock all three API calls (semantic, pattern, unusual)
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify(mockResponse) } }],
        }),
      });

      const context = createMockContext();
      const existingIssues: RuleIssue[] = [];

      const result = await llm.detectAnomalies(context, existingIssues, {
        categories: ['semantic'],
        minConfidenceToReport: 0.7,
        maxAnomaliesPerRun: 20,
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].category).toBe('semantic');
      expect(result[0].confidence).toBeGreaterThanOrEqual(0.7);
      // High confidence (0.85 >= 0.7) means no review required
      expect(result[0].requiresReview).toBe(false);
    });

    it('should detect cross-contract patterns', async () => {
      const mockResponse = {
        patterns: [{
          category: 'pattern',
          severity: 'medium',
          confidence: 0.75,
          title: 'Inconsistent discount rates',
          description: 'Same customer getting different discounts',
          evidence: {
            contractIds: ['con_123', 'con_456'],
            invoiceIds: [],
            relevantFields: { discountVariance: 0.1 },
          },
          reasoning: 'Discount policies should be consistent for same customer',
        }],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify(mockResponse) } }],
        }),
      });

      const context = createMockContext();

      const result = await llm.detectAnomalies(context, [], {
        categories: ['pattern'],
        minConfidenceToReport: 0.7,
        maxAnomaliesPerRun: 20,
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].category).toBe('pattern');
    });

    it('should filter by confidence threshold', async () => {
      const mockResponse = {
        anomalies: [
          {
            category: 'semantic',
            severity: 'high',
            confidence: 0.9,
            title: 'High confidence anomaly',
            description: 'Test',
            evidence: { contractIds: [], invoiceIds: [], relevantFields: {} },
            reasoning: 'Test',
          },
          {
            category: 'semantic',
            severity: 'low',
            confidence: 0.5,
            title: 'Low confidence anomaly',
            description: 'Test',
            evidence: { contractIds: [], invoiceIds: [], relevantFields: {} },
            reasoning: 'Test',
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify(mockResponse) } }],
        }),
      });

      const context = createMockContext();

      const result = await llm.detectAnomalies(context, [], {
        categories: ['semantic'],
        minConfidenceToReport: 0.7,
        maxAnomaliesPerRun: 20,
      });

      // Should only include the high confidence anomaly
      expect(result.every(a => a.confidence >= 0.7)).toBe(true);
    });

    it('should limit number of anomalies', async () => {
      const mockResponse = {
        anomalies: Array.from({ length: 30 }, (_, i) => ({
          category: 'semantic',
          severity: 'medium',
          confidence: 0.8,
          title: `Anomaly ${i}`,
          description: 'Test',
          evidence: { contractIds: [], invoiceIds: [], relevantFields: {} },
          reasoning: 'Test',
        })),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify(mockResponse) } }],
        }),
      });

      const context = createMockContext();

      const result = await llm.detectAnomalies(context, [], {
        categories: ['semantic'],
        minConfidenceToReport: 0.7,
        maxAnomaliesPerRun: 10,
      });

      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));

      const context = createMockContext();

      const result = await llm.detectAnomalies(context, [], {
        categories: ['semantic', 'pattern', 'anomaly'],
        minConfidenceToReport: 0.7,
        maxAnomaliesPerRun: 20,
      });

      // Should return empty array on error
      expect(result).toEqual([]);
    });

    it('should skip detection if not enough contracts', async () => {
      const context = createMockContext();
      context.contracts = [context.contracts[0]]; // Only one contract

      const result = await llm.detectAnomalies(context, [], {
        categories: ['pattern'],
        minConfidenceToReport: 0.7,
        maxAnomaliesPerRun: 20,
      });

      // Should not call API for cross-contract patterns with < 3 contracts
      expect(result).toEqual([]);
    });

    it('should sort anomalies by severity and confidence', async () => {
      const mockResponse = {
        anomalies: [
          {
            category: 'semantic',
            severity: 'low',
            confidence: 0.9,
            title: 'Low severity',
            description: 'Test',
            evidence: { contractIds: [], invoiceIds: [], relevantFields: {} },
            reasoning: 'Test',
          },
          {
            category: 'semantic',
            severity: 'critical',
            confidence: 0.8,
            title: 'Critical severity',
            description: 'Test',
            evidence: { contractIds: [], invoiceIds: [], relevantFields: {} },
            reasoning: 'Test',
          },
          {
            category: 'semantic',
            severity: 'high',
            confidence: 0.85,
            title: 'High severity',
            description: 'Test',
            evidence: { contractIds: [], invoiceIds: [], relevantFields: {} },
            reasoning: 'Test',
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify(mockResponse) } }],
        }),
      });

      const context = createMockContext();

      const result = await llm.detectAnomalies(context, [], {
        categories: ['semantic'],
        minConfidenceToReport: 0.7,
        maxAnomaliesPerRun: 20,
      });

      // Critical should be first
      expect(result[0].severity).toBe('critical');
      // Then high
      expect(result[1].severity).toBe('high');
    });
  });
});

describe('Anomaly Detection Prompts', () => {
  it('should generate semantic anomaly prompt', async () => {
    const { semanticAnomalyPrompt } = await import('../prompts/anomaly.js');

    const contracts: ContractWithTerms[] = [
      { id: 'con_1', name: 'Test', terms: [] } as ContractWithTerms,
    ];
    const invoices: InvoiceWithLines[] = [
      { id: 'inv_1', lines: [] } as InvoiceWithLines,
    ];
    const existingIssues: RuleIssue[] = [];

    const prompt = semanticAnomalyPrompt(contracts, invoices, existingIssues);

    expect(prompt).toContain('Analyze');
    expect(prompt).toContain('anomalies');
    expect(prompt).toContain('semantic');
  });

  it('should generate cross-contract pattern prompt', async () => {
    const { crossContractPatternPrompt } = await import('../prompts/anomaly.js');

    const contracts: ContractWithTerms[] = [
      { id: 'con_1', name: 'Test 1', customer_id: 'cust_1', terms: [] } as ContractWithTerms,
      { id: 'con_2', name: 'Test 2', customer_id: 'cust_1', terms: [] } as ContractWithTerms,
    ];

    const prompt = crossContractPatternPrompt(contracts, {});

    expect(prompt).toContain('Customers with Multiple Contracts');
    expect(prompt).toContain('patterns');
  });
});
