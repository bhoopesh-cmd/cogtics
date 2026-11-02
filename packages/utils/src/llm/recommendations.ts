/**
 * Recommendation LLM - AI-Powered Prescriptive Analytics (Tier 4)
 * 
 * Production-ready LLM client for generating recommendations with:
 * - Rate limit handling
 * - Cost tracking
 * - Token limit validation
 * - Concurrent request limiting
 */

import type {
  RuleContext,
  ContractWithTerms,
  InvoiceWithLines,
  AIEnrichedIssue,
  AIRecommendation,
  SimulationOverride,
  RuleIssue,
} from '@cogtics/rules';
import { 
  ProductionLLMClient, 
  type BaseLLMConfig, 
  DEFAULT_LIMITS,
} from './base-client.js';
import {
  RECOMMENDATION_SYSTEM_PROMPTS,
  RECOMMENDATION_PROMPT_VERSION,
  recommendationPrompt,
  simulationConfigPrompt,
  impactEstimationPrompt,
  type AIRecommendationResponse,
} from './prompts/recommendations.js';
import {
  RecommendationResponseSchema,
  ImpactEstimationResponseSchema,
  safeParseLLMResponse,
  computeNeedsReview,
} from './schemas.js';
import { nanoid } from 'nanoid';

// ============================================
// Types
// ============================================

export interface RecommendationLLMConfig extends Partial<BaseLLMConfig> {
  /** Default recommendation configuration */
  recommendationConfig?: Partial<RecommendationConfig>;
}

export interface RecommendationConfig {
  /** Max recommendations to generate (default: 50, generous) */
  maxRecommendations: number;
  /** Minimum combined impact to generate recommendation (default: 10, generous) */
  minImpactThreshold: number;
  /** Group related issues */
  groupRelatedIssues: boolean;
  /** Include simulation configs */
  includeSimulationConfigs: boolean;
}

export interface IssueCluster {
  id: string;
  issues: AIEnrichedIssue[];
  commonContractId?: string;
  commonCustomerId?: string;
  totalImpact: number;
  currency: string;
}

export interface RecommendationStats {
  totalRecommendations: number;
  totalEstimatedImpact: number;
  byPriority: Record<string, number>;
  byEffort: Record<string, number>;
  durationMs: number;
  tokensUsed: number;
  costUsd: number;
  cacheHits: number;
}

// ============================================
// RecommendationLLM Class
// ============================================

export class RecommendationLLM extends ProductionLLMClient {
  private defaultConfig: RecommendationConfig = {
    maxRecommendations: 50, // Generous
    minImpactThreshold: 10, // Very low threshold to catch everything
    groupRelatedIssues: true,
    includeSimulationConfigs: true,
  };
  private stats: RecommendationStats;

  constructor(config?: RecommendationLLMConfig) {
    const apiKey = config?.apiKey || process.env.OPENAI_API_KEY || '';
    super({
      apiKey,
      model: config?.model || 'gpt-4o-mini',
      timeout: config?.timeout || 120000, // 2 min timeout
      maxRetries: config?.maxRetries || 5,
      trackCosts: true,
      enableCache: true,
      tenantId: config?.tenantId,
      runId: config?.runId,
      limits: {
        ...DEFAULT_LIMITS,
        // Generous limits
        maxConcurrentRequests: 100,
        maxInputTokens: 120000,
        costHardLimitUsd: 500,
        costWarningThresholdUsd: 50,
        ...config?.limits,
      },
    });

    if (config?.recommendationConfig) {
      this.defaultConfig = { ...this.defaultConfig, ...config.recommendationConfig };
    }

    this.stats = this.initStats();
  }

  private initStats(): RecommendationStats {
    return {
      totalRecommendations: 0,
      totalEstimatedImpact: 0,
      byPriority: {},
      byEffort: {},
      durationMs: 0,
      tokensUsed: 0,
      costUsd: 0,
      cacheHits: 0,
    };
  }

  /**
   * Generate recommendations from enriched issues
   */
  async generateRecommendations(
    issues: AIEnrichedIssue[],
    context: RuleContext,
    config?: Partial<RecommendationConfig>
  ): Promise<AIRecommendation[]> {
    const startTime = Date.now();
    this.stats = this.initStats();
    
    const mergedConfig = { ...this.defaultConfig, ...config };
    
    if (issues.length === 0) {
      return [];
    }

    // Cluster related issues
    const clusters = mergedConfig.groupRelatedIssues
      ? this.clusterRelatedIssues(issues)
      : issues.map(i => ({
          id: nanoid(8),
          issues: [i],
          commonContractId: i.contractId,
          totalImpact: i.impactAmount || 0,
          currency: i.currency || 'USD',
        }));

    // Filter clusters by impact threshold (generous threshold)
    const significantClusters = clusters.filter(
      c => c.totalImpact >= mergedConfig.minImpactThreshold
    );

    // Generate recommendations for each cluster
    const recommendations: AIRecommendation[] = [];

    for (const cluster of significantClusters.slice(0, mergedConfig.maxRecommendations)) {
      const contract = context.contracts.find(c => c.id === cluster.commonContractId);
      const customer = contract?.customer || 
        context.customers.find(c => c.id === (cluster as { commonCustomerId?: string }).commonCustomerId);

      const clusterRecs = await this.generateClusterRecommendations(
        cluster,
        {
          contractName: contract?.name ?? undefined,
          customerName: customer?.name ?? undefined,
          totalImpact: cluster.totalImpact,
          currency: cluster.currency,
        }
      );

      recommendations.push(...clusterRecs);
    }

    // Sort by priority and impact
    const sorted = recommendations
      .sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        if (priorityDiff !== 0) return priorityDiff;
        return b.estimatedImpact.revenueChange - a.estimatedImpact.revenueChange;
      })
      .slice(0, mergedConfig.maxRecommendations);

    // Update stats
    this.stats.totalRecommendations = sorted.length;
    this.stats.durationMs = Date.now() - startTime;
    this.stats.costUsd = this.getRunCostSummary().totalCostUsd;
    
    for (const rec of sorted) {
      this.stats.totalEstimatedImpact += rec.estimatedImpact.revenueChange;
      this.stats.byPriority[rec.priority] = (this.stats.byPriority[rec.priority] || 0) + 1;
      this.stats.byEffort[rec.effort] = (this.stats.byEffort[rec.effort] || 0) + 1;
    }

    return sorted;
  }

  /**
   * Generate simulation configuration for a recommendation
   */
  async generateSimulationConfig(
    recommendation: AIRecommendation,
    context: RuleContext
  ): Promise<SimulationOverride[]> {
    // If recommendation already has simulation config, return it
    if (recommendation.suggestedSimulation?.overrides.length > 0) {
      return recommendation.suggestedSimulation.overrides;
    }

    // Generate new config based on the recommendation
    const issue = this.findIssueById(recommendation.issueIds[0], context);
    if (!issue) {
      return [];
    }

    const contract = context.contracts.find(c => c.id === issue.contractId);
    const invoice = context.invoices.find(i => i.id === issue.invoiceId);

    const prompt = simulationConfigPrompt(issue as AIEnrichedIssue, {
      contractTerms: contract?.terms?.map(t => ({
        type: t.term_type,
        value: t.value_json,
      })),
      currentInvoice: invoice ? {
        id: invoice.id,
        amount: Number(invoice.total_amount),
        date: invoice.invoice_date?.toString() || '',
      } : undefined,
    });

    try {
      const result = await this.complete(
        RECOMMENDATION_SYSTEM_PROMPTS.simulationConfig,
        prompt,
        { 
          json: true,
          operationType: 'simulation_config',
          promptVersion: RECOMMENDATION_PROMPT_VERSION,
        }
      );

      this.stats.tokensUsed += result.inputTokens + result.outputTokens;
      if (result.cached) this.stats.cacheHits++;

      // Parse simulation config (uses simpler schema)
      const json = JSON.parse(result.content);
      return (json.overrides || []).map((o: any) => ({
        type: o.type,
        targetId: o.targetId,
        field: o.field,
        originalValue: o.originalValue,
        newValue: o.newValue,
        effectiveDate: o.effectiveDate,
        description: o.description,
      }));
    } catch (error) {
      console.warn('Failed to generate simulation config:', error);
      return [];
    }
  }

  /**
   * Cluster related issues for grouped recommendations
   */
  clusterRelatedIssues(issues: AIEnrichedIssue[]): IssueCluster[] {
    const clusters: IssueCluster[] = [];
    const assigned = new Set<string>();

    // Group by contract first
    const byContract = new Map<string, AIEnrichedIssue[]>();
    for (const issue of issues) {
      if (issue.contractId) {
        if (!byContract.has(issue.contractId)) {
          byContract.set(issue.contractId, []);
        }
        byContract.get(issue.contractId)!.push(issue);
      }
    }

    // Create clusters from contract groups
    for (const [contractId, contractIssues] of byContract) {
      const totalImpact = contractIssues.reduce((sum, i) => sum + (i.impactAmount || 0), 0);
      clusters.push({
        id: `cluster_${nanoid(8)}`,
        issues: contractIssues,
        commonContractId: contractId,
        commonCustomerId: contractIssues[0]?.customerId,
        totalImpact,
        currency: contractIssues[0]?.currency || 'USD',
      });
      contractIssues.forEach(i => assigned.add(i.issueKey || i.ruleId));
    }

    // Handle issues without contracts
    const orphans = issues.filter(i => !assigned.has(i.issueKey || i.ruleId));
    if (orphans.length > 0) {
      const totalImpact = orphans.reduce((sum, i) => sum + (i.impactAmount || 0), 0);
      clusters.push({
        id: `cluster_orphan_${nanoid(8)}`,
        issues: orphans,
        totalImpact,
        currency: 'USD',
      });
    }

    return clusters;
  }

  /**
   * Score a recommendation for ranking
   */
  scoreRecommendation(recommendation: AIRecommendation): number {
    const priorityScores = { critical: 100, high: 75, medium: 50, low: 25 };
    const effortScores = { low: 30, medium: 15, high: 5 };

    const priorityScore = priorityScores[recommendation.priority] || 0;
    const effortScore = effortScores[recommendation.effort] || 0;
    const impactScore = Math.min(recommendation.estimatedImpact.revenueChange / 1000, 100);
    const confidenceScore = recommendation.estimatedImpact.confidence * 50;

    return priorityScore + effortScore + impactScore + confidenceScore;
  }

  /**
   * Generate recommendations for a cluster of issues
   */
  private async generateClusterRecommendations(
    cluster: IssueCluster,
    context: {
      contractName?: string;
      customerName?: string;
      totalImpact: number;
      currency: string;
    }
  ): Promise<AIRecommendation[]> {
    const prompt = recommendationPrompt(cluster.issues, context);

    try {
      const result = await this.complete(
        RECOMMENDATION_SYSTEM_PROMPTS.recommendation,
        prompt,
        { 
          json: true,
          operationType: 'recommendation',
          promptVersion: RECOMMENDATION_PROMPT_VERSION,
        }
      );

      this.stats.tokensUsed += result.inputTokens + result.outputTokens;
      if (result.cached) this.stats.cacheHits++;

      // Validate response with Zod schema
      const parsed = safeParseLLMResponse(
        RecommendationResponseSchema,
        result.content,
        { recommendations: [] }
      );
      
      return (parsed?.recommendations || []).map(r => 
        this.convertToAIRecommendation(r as AIRecommendationResponse, cluster.issues)
      );
    } catch (error) {
      console.warn('Failed to generate recommendations for cluster:', error);
      
      // Return basic recommendation based on issues
      return [{
        id: `rec_${nanoid(16)}`,
        issueIds: cluster.issues.map(i => i.issueKey || ''),
        priority: this.determinePriority(cluster.issues),
        title: `Fix ${cluster.issues.length} billing issue(s)`,
        description: `Review and correct ${cluster.issues.length} detected issue(s) affecting ${context.contractName || 'multiple contracts'}`,
        estimatedImpact: {
          revenueChange: context.totalImpact,
          currency: context.currency,
          confidence: 0.5,
        },
        suggestedSimulation: { description: 'Automated recommendation', overrides: [] },
        effort: 'medium' as const,
        reasoning: 'Automated recommendation based on detected issues',
        status: 'pending' as const,
        createdAt: new Date(),
      }];
    }
  }

  /**
   * Convert API response to AIRecommendation format
   */
  private convertToAIRecommendation(
    response: AIRecommendationResponse,
    issues: AIEnrichedIssue[]
  ): AIRecommendation {
    // Handle both formats: suggestedSimulation (new) and suggestedOverrides (legacy)
    const overrides = response.suggestedSimulation?.overrides 
      || (response as any).suggestedOverrides 
      || [];
    
    const confidence = response.estimatedImpact?.confidence;
    
    return {
      id: `rec_${nanoid(16)}`,
      issueIds: issues.map(i => i.issueKey || ''),
      priority: response.priority,
      title: response.title,
      description: response.description,
      estimatedImpact: response.estimatedImpact,
      suggestedSimulation: {
        description: response.suggestedSimulation?.description ?? '',
        overrides,
      },
      effort: response.effort,
      reasoning: response.reasoning,
      status: 'pending' as const,
      createdAt: new Date(),
    };
  }

  /**
   * Determine priority based on issues
   */
  private determinePriority(issues: AIEnrichedIssue[]): 'critical' | 'high' | 'medium' | 'low' {
    const severities = issues.map(i => i.severity);
    
    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'high';
    if (severities.includes('medium')) return 'medium';
    return 'low';
  }

  /**
   * Find issue by ID in context
   */
  private findIssueById(issueId: string, context: RuleContext): RuleIssue | undefined {
    // Search in current run issues if available
    return context.currentRunIssues?.find(
      i => (i as any).issueKey === issueId || i.ruleId === issueId
    );
  }

  /**
   * Get recommendation statistics
   */
  getStats(): RecommendationStats {
    return { ...this.stats };
  }
}

/**
 * Create a RecommendationLLM instance from environment variables
 */
export function createRecommendationLLM(config?: RecommendationLLMConfig): RecommendationLLM | null {
  const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return null;
  }

  return new RecommendationLLM({
    apiKey,
    model: (process.env.OPENAI_MODEL as any) || 'gpt-4o-mini',
    ...config,
  });
}
