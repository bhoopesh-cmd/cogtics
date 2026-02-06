/**
 * RecommendationLLM Unit Tests
 * 
 * Tests for AI-powered prescriptive recommendations.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RecommendationLLM } from '../recommendations.js';
import type { AIEnrichedIssue, RuleContext } from '@cogtics/rules';

// Mock fetch for OpenAI API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('RecommendationLLM', () => {
  let llm: RecommendationLLM;

  beforeEach(() => {
    vi.stubEnv('OPENAI_API_KEY', 'test-api-key');
    llm = new RecommendationLLM({ apiKey: 'test-api-key' });
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const createMockEnrichedIssue = (overrides: Partial<AIEnrichedIssue> = {}): AIEnrichedIssue => ({
    ruleId: 'R001',
    ruleVersion: '1.0.0',
    category: 'billing',
    severity: 'high',
    confidence: 0.9,
    impactAmount: 1000,
    currency: 'USD',
    expected: { amount: 1000 },
    actual: { amount: 900 },
    dimensions: { contractId: 'con_123' },
    contractId: 'con_123',
    invoiceId: 'inv_456',
    aiAnalysis: {
      rootCause: 'Pricing mismatch',
      businessImpact: 'Revenue leakage',
      suggestedFix: 'Correct invoice amount',
      confidence: 0.85,
      relatedIssueIds: [],
      explanation: 'Invoice amount is $100 less than expected',
      priority: 'high',
      tags: ['billing'],
    },
    issueKey: 'R001_con_123_inv_456',
    aiEnrichedAt: new Date(),
    ...overrides,
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
        name: 'Test Contract',
        total_value: 10000,
        currency: 'USD',
        customer_id: 'cust_1',
        terms: [],
        customer: { id: 'cust_1', name: 'Test Customer' },
      } as any,
    ],
    invoices: [
      {
        id: 'inv_456',
        contract_id: 'con_123',
        total_amount: 900,
        currency: 'USD',
        invoice_date: new Date(),
        lines: [],
      } as any,
    ],
    payments: [],
    usageEvents: [],
    customers: [{ id: 'cust_1', name: 'Test Customer' }] as any[],
    products: [],
    schedules: [],
    obligations: [],
    fxRates: new Map(),
    currentRunIssues: [],
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations from enriched issues', async () => {
      const mockResponse = {
        recommendations: [{
          issueIndices: [0],
          priority: 'high',
          title: 'Correct invoice amount',
          description: 'Issue credit memo for $100 difference',
          estimatedImpact: {
            revenueChange: 100,
            currency: 'USD',
            affectedContracts: 1,
            confidence: 0.85,
          },
          suggestedOverrides: [{
            type: 'billing_adjustment',
            targetId: 'inv_456',
            field: 'total_amount',
            originalValue: 900,
            newValue: 1000,
            description: 'Correct invoice amount',
          }],
          effort: 'low',
          reasoning: 'Simple amount correction',
        }],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify(mockResponse) } }],
        }),
      });

      const issues = [createMockEnrichedIssue()];
      const context = createMockContext();

      const result = await llm.generateRecommendations(issues, context);

      expect(result).toHaveLength(1);
      expect(result[0].priority).toBe('high');
      expect(result[0].title).toBe('Correct invoice amount');
      expect(result[0].suggestedSimulation.overrides).toHaveLength(1);
    });

    it('should cluster related issues', async () => {
      const mockResponse = {
        recommendations: [{
          issueIndices: [0, 1],
          priority: 'high',
          title: 'Fix billing issues for contract',
          description: 'Multiple billing discrepancies',
          estimatedImpact: {
            revenueChange: 500,
            currency: 'USD',
            confidence: 0.8,
          },
          suggestedSimulation: {
            overrides: [],
            description: 'Review contract billing',
          },
          effort: 'medium',
          reasoning: 'Related issues should be fixed together',
        }],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify(mockResponse) } }],
        }),
      });

      const issues = [
        createMockEnrichedIssue({ impactAmount: 200 }),
        createMockEnrichedIssue({ 
          ruleId: 'R002', 
          impactAmount: 300,
          issueKey: 'R002_con_123_inv_457',
        }),
      ];
      const context = createMockContext();

      const result = await llm.generateRecommendations(issues, context, {
        groupRelatedIssues: true,
      });

      expect(result.length).toBeGreaterThan(0);
    });

    it('should filter by impact threshold', async () => {
      const issues = [
        createMockEnrichedIssue({ impactAmount: 50 }), // Below threshold
      ];
      const context = createMockContext();

      const result = await llm.generateRecommendations(issues, context, {
        minImpactThreshold: 100,
      });

      // Should be empty because all issues are below threshold
      expect(result).toHaveLength(0);
    });

    it('should return empty array for no issues', async () => {
      const context = createMockContext();

      const result = await llm.generateRecommendations([], context);

      expect(result).toHaveLength(0);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));

      const issues = [createMockEnrichedIssue()];
      const context = createMockContext();

      const result = await llm.generateRecommendations(issues, context);

      // Should return basic recommendation on error
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].reasoning).toContain('Automated recommendation');
    });

    it('should limit number of recommendations', async () => {
      const mockResponse = {
        recommendations: Array.from({ length: 20 }, (_, i) => ({
          issueIndices: [0],
          priority: 'medium',
          title: `Recommendation ${i}`,
          description: 'Test',
          estimatedImpact: {
            revenueChange: 100,
            currency: 'USD',
            confidence: 0.7,
          },
          suggestedSimulation: { overrides: [], description: 'Test' },
          effort: 'low',
          reasoning: 'Test',
        })),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify(mockResponse) } }],
        }),
      });

      const issues = [createMockEnrichedIssue()];
      const context = createMockContext();

      const result = await llm.generateRecommendations(issues, context, {
        maxRecommendations: 5,
      });

      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe('clusterRelatedIssues', () => {
    it('should group issues by contract', () => {
      const issues = [
        createMockEnrichedIssue({ contractId: 'con_1', impactAmount: 100 }),
        createMockEnrichedIssue({ contractId: 'con_1', impactAmount: 200 }),
        createMockEnrichedIssue({ contractId: 'con_2', impactAmount: 300 }),
      ];

      const clusters = llm.clusterRelatedIssues(issues);

      expect(clusters.length).toBe(2);
      
      const con1Cluster = clusters.find(c => c.commonContractId === 'con_1');
      expect(con1Cluster?.issues.length).toBe(2);
      expect(con1Cluster?.totalImpact).toBe(300);
      
      const con2Cluster = clusters.find(c => c.commonContractId === 'con_2');
      expect(con2Cluster?.issues.length).toBe(1);
      expect(con2Cluster?.totalImpact).toBe(300);
    });

    it('should handle issues without contracts', () => {
      const issues = [
        createMockEnrichedIssue({ contractId: undefined, impactAmount: 100 }),
        createMockEnrichedIssue({ contractId: undefined, impactAmount: 200 }),
      ];

      const clusters = llm.clusterRelatedIssues(issues);

      // Should have orphan cluster
      expect(clusters.length).toBe(1);
      expect(clusters[0].issues.length).toBe(2);
    });
  });

  describe('scoreRecommendation', () => {
    it('should score recommendations correctly', () => {
      const highPriorityLowEffort = {
        id: 'rec_1',
        issueIds: [],
        priority: 'critical' as const,
        title: 'Test',
        description: 'Test',
        estimatedImpact: { revenueChange: 5000, currency: 'USD', confidence: 0.9 },
        suggestedSimulation: { overrides: [], description: 'Test' },
        effort: 'low' as const,
        reasoning: 'Test',
      };

      const lowPriorityHighEffort = {
        id: 'rec_2',
        issueIds: [],
        priority: 'low' as const,
        title: 'Test',
        description: 'Test',
        estimatedImpact: { revenueChange: 500, currency: 'USD', confidence: 0.5 },
        suggestedSimulation: { overrides: [], description: 'Test' },
        effort: 'high' as const,
        reasoning: 'Test',
      };

      const score1 = llm.scoreRecommendation(highPriorityLowEffort);
      const score2 = llm.scoreRecommendation(lowPriorityHighEffort);

      expect(score1).toBeGreaterThan(score2);
    });
  });
});

describe('Recommendation Prompts', () => {
  it('should generate recommendation prompt', async () => {
    const { recommendationPrompt } = await import('../prompts/recommendations.js');

    const issues: AIEnrichedIssue[] = [{
      ruleId: 'R001',
      ruleVersion: '1.0.0',
      category: 'billing',
      severity: 'high',
      confidence: 0.9,
      impactAmount: 1000,
      expected: {},
      actual: {},
      dimensions: {},
      aiAnalysis: {
        rootCause: 'Test',
        businessImpact: 'Test',
        suggestedFix: 'Test',
        confidence: 0.8,
        relatedIssueIds: [],
        explanation: 'Test',
        priority: 'high',
        tags: [],
      },
      issueKey: 'test',
      aiEnrichedAt: new Date(),
    }];

    const prompt = recommendationPrompt(issues, {
      contractName: 'Test Contract',
      customerName: 'Test Customer',
      totalImpact: 1000,
      currency: 'USD',
    });

    expect(prompt).toContain('Test Contract');
    expect(prompt).toContain('recommendations');
    expect(prompt).toContain('R001');
  });

  it('should generate simulation config prompt', async () => {
    const { simulationConfigPrompt } = await import('../prompts/recommendations.js');

    const issue: AIEnrichedIssue = {
      ruleId: 'R001',
      ruleVersion: '1.0.0',
      category: 'billing',
      severity: 'high',
      confidence: 0.9,
      impactAmount: 1000,
      expected: { amount: 1000 },
      actual: { amount: 900 },
      dimensions: {},
      aiAnalysis: {
        rootCause: 'Test',
        businessImpact: 'Test',
        suggestedFix: 'Test',
        confidence: 0.8,
        relatedIssueIds: [],
        explanation: 'Test',
        priority: 'high',
        tags: [],
      },
      issueKey: 'test',
      aiEnrichedAt: new Date(),
    };

    const prompt = simulationConfigPrompt(issue, {});

    expect(prompt).toContain('simulation');
    expect(prompt).toContain('overrides');
  });
});
