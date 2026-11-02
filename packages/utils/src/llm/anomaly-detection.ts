/**
 * Anomaly Detection LLM - AI-Powered Pattern Detection (Tier 3)
 * 
 * Production-ready LLM client for anomaly detection with:
 * - Rate limit handling
 * - Cost tracking
 * - Token limit validation
 * - Concurrent request limiting
 */

import type {
  RuleIssue,
  RuleContext,
  ContractWithTerms,
  InvoiceWithLines,
  AIDiscoveredIssue,
  IssueSeverity,
} from '@cogtics/rules';
import { 
  ProductionLLMClient, 
  type BaseLLMConfig, 
  DEFAULT_LIMITS,
} from './base-client.js';
import {
  ANOMALY_SYSTEM_PROMPTS,
  ANOMALY_PROMPT_VERSION,
  semanticAnomalyPrompt,
  crossContractPatternPrompt,
  unusualPatternPrompt,
} from './prompts/anomaly.js';
import {
  AnomalyDetectionResponseSchema,
  safeParseLLMResponse,
  computeNeedsReview,
  type AIDiscoveredIssue as AIDiscoveredIssueResponse,
} from './schemas.js';
import { nanoid } from 'nanoid';

// ============================================
// Types
// ============================================

export interface AnomalyDetectionLLMConfig extends Partial<BaseLLMConfig> {
  /** Default detection configuration */
  detectionConfig?: Partial<AnomalyDetectionConfig>;
}

export interface AnomalyDetectionConfig {
  /** Minimum confidence to report anomalies (default: 0.6, generous) */
  minConfidenceToReport: number;
  /** Maximum anomalies to report per run (default: 100, very generous) */
  maxAnomaliesPerRun: number;
  /** Enabled detection categories */
  categories: Array<'semantic' | 'pattern' | 'anomaly' | 'contextual'>;
}

export interface AnomalyDetectionStats {
  totalAnomalies: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  durationMs: number;
  tokensUsed: number;
  costUsd: number;
  cacheHits: number;
}

// ============================================
// AnomalyDetectionLLM Class
// ============================================

export class AnomalyDetectionLLM extends ProductionLLMClient {
  private defaultConfig: AnomalyDetectionConfig = {
    minConfidenceToReport: 0.6, // Generous - catch more potential issues
    maxAnomaliesPerRun: 100, // Very generous
    categories: ['semantic', 'pattern', 'anomaly', 'contextual'],
  };
  private stats: AnomalyDetectionStats;

  constructor(config?: AnomalyDetectionLLMConfig) {
    const apiKey = config?.apiKey || process.env.OPENAI_API_KEY || '';
    super({
      apiKey,
      model: config?.model || 'gpt-4o-mini',
      timeout: config?.timeout || 180000, // 3 min for complex analysis
      maxRetries: config?.maxRetries || 5,
      trackCosts: true,
      enableCache: true,
      tenantId: config?.tenantId,
      runId: config?.runId,
      limits: {
        ...DEFAULT_LIMITS,
        // Generous limits for anomaly detection
        maxConcurrentRequests: 100,
        maxInputTokens: 120000,
        costHardLimitUsd: 500,
        costWarningThresholdUsd: 50,
        ...config?.limits,
      },
    });

    if (config?.detectionConfig) {
      this.defaultConfig = { ...this.defaultConfig, ...config.detectionConfig };
    }

    this.stats = this.initStats();
  }

  private initStats(): AnomalyDetectionStats {
    return {
      totalAnomalies: 0,
      byCategory: {},
      bySeverity: {},
      durationMs: 0,
      tokensUsed: 0,
      costUsd: 0,
      cacheHits: 0,
    };
  }

  /**
   * Detect anomalies in the data that rules might miss
   */
  async detectAnomalies(
    context: RuleContext,
    existingIssues: RuleIssue[],
    config?: Partial<AnomalyDetectionConfig>
  ): Promise<AIDiscoveredIssue[]> {
    const startTime = Date.now();
    this.stats = this.initStats();
    
    const mergedConfig = { ...this.defaultConfig, ...config };
    const allAnomalies: AIDiscoveredIssue[] = [];

    // Run detection in parallel for each enabled category
    const detectionPromises: Promise<AIDiscoveredIssue[]>[] = [];

    if (mergedConfig.categories.includes('semantic')) {
      detectionPromises.push(
        this.detectSemanticAnomalies(context, existingIssues)
      );
    }

    if (mergedConfig.categories.includes('pattern')) {
      detectionPromises.push(
        this.detectCrossContractPatterns(context.contracts)
      );
    }

    if (mergedConfig.categories.includes('anomaly')) {
      detectionPromises.push(
        this.detectUnusualPatterns(context, existingIssues)
      );
    }

    // Wait for all detection types
    const results = await Promise.allSettled(detectionPromises);

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allAnomalies.push(...result.value);
      } else {
        console.warn('Anomaly detection failed:', result.reason);
      }
    }

    // Filter by confidence and limit
    const filtered = allAnomalies
      .filter(a => a.confidence >= mergedConfig.minConfidenceToReport)
      .sort((a, b) => {
        // Sort by severity then confidence
        const severityOrder = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
        const severityDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
        if (severityDiff !== 0) return severityDiff;
        return b.confidence - a.confidence;
      })
      .slice(0, mergedConfig.maxAnomaliesPerRun);

    // Update stats
    this.stats.totalAnomalies = filtered.length;
    this.stats.durationMs = Date.now() - startTime;
    this.stats.costUsd = this.getRunCostSummary().totalCostUsd;
    
    for (const anomaly of filtered) {
      this.stats.byCategory[anomaly.category] = (this.stats.byCategory[anomaly.category] || 0) + 1;
      this.stats.bySeverity[anomaly.severity] = (this.stats.bySeverity[anomaly.severity] || 0) + 1;
    }

    return filtered;
  }

  /**
   * Detect semantic anomalies (pricing mismatches, unusual discounts)
   */
  private async detectSemanticAnomalies(
    context: RuleContext,
    existingIssues: RuleIssue[]
  ): Promise<AIDiscoveredIssue[]> {
    const prompt = semanticAnomalyPrompt(
      context.contracts,
      context.invoices,
      existingIssues
    );

    try {
      const result = await this.complete(
        ANOMALY_SYSTEM_PROMPTS.semanticAnomaly,
        prompt,
        { 
          json: true,
          operationType: 'semantic_anomaly',
          promptVersion: ANOMALY_PROMPT_VERSION,
        }
      );

      this.stats.tokensUsed += result.inputTokens + result.outputTokens;
      if (result.cached) this.stats.cacheHits++;

      // Validate response with Zod schema
      const parsed = safeParseLLMResponse(
        AnomalyDetectionResponseSchema,
        result.content,
        { anomalies: [], patterns: [] }
      );
      return this.convertToAIDiscoveredIssues(parsed?.anomalies || []);
    } catch (error) {
      console.warn('Semantic anomaly detection failed:', error);
      return [];
    }
  }

  /**
   * Detect cross-contract patterns (inconsistent pricing across customers)
   */
  private async detectCrossContractPatterns(
    contracts: ContractWithTerms[]
  ): Promise<AIDiscoveredIssue[]> {
    // Skip if not enough contracts to analyze
    if (contracts.length < 3) {
      return [];
    }

    const prompt = crossContractPatternPrompt(contracts, {});

    try {
      const result = await this.complete(
        ANOMALY_SYSTEM_PROMPTS.crossContractPattern,
        prompt,
        { 
          json: true,
          operationType: 'cross_contract_pattern',
          promptVersion: ANOMALY_PROMPT_VERSION,
        }
      );

      this.stats.tokensUsed += result.inputTokens + result.outputTokens;
      if (result.cached) this.stats.cacheHits++;

      // Validate response with Zod schema
      const parsed = safeParseLLMResponse(
        AnomalyDetectionResponseSchema,
        result.content,
        { anomalies: [], patterns: [] }
      );
      return this.convertToAIDiscoveredIssues(parsed?.patterns || []);
    } catch (error) {
      console.warn('Cross-contract pattern detection failed:', error);
      return [];
    }
  }

  /**
   * Detect unusual patterns (statistical outliers, timing issues)
   */
  private async detectUnusualPatterns(
    context: RuleContext,
    existingIssues: RuleIssue[]
  ): Promise<AIDiscoveredIssue[]> {
    const prompt = unusualPatternPrompt(
      {
        contracts: context.contracts,
        invoices: context.invoices,
      },
      existingIssues
    );

    try {
      const result = await this.complete(
        ANOMALY_SYSTEM_PROMPTS.unusualPattern,
        prompt,
        { 
          json: true,
          operationType: 'unusual_pattern',
          promptVersion: ANOMALY_PROMPT_VERSION,
        }
      );

      this.stats.tokensUsed += result.inputTokens + result.outputTokens;
      if (result.cached) this.stats.cacheHits++;

      // Validate response with Zod schema
      const parsed = safeParseLLMResponse(
        AnomalyDetectionResponseSchema,
        result.content,
        { anomalies: [], patterns: [] }
      );
      return this.convertToAIDiscoveredIssues(parsed?.patterns || []);
    } catch (error) {
      console.warn('Unusual pattern detection failed:', error);
      return [];
    }
  }

  /**
   * Convert API responses to AIDiscoveredIssue format
   */
  private convertToAIDiscoveredIssues(
    responses: any[]
  ): AIDiscoveredIssue[] {
    return responses.map(r => ({
      id: `adi_${nanoid(16)}`,
      category: r.category,
      severity: r.severity as IssueSeverity,
      confidence: r.confidence,
      title: r.title,
      description: r.description,
      evidence: r.evidence,
      reasoning: r.reasoning,
      requiresReview: computeNeedsReview(r.confidence),
    } as AIDiscoveredIssue));
  }

  /**
   * Get detection statistics
   */
  getStats(): AnomalyDetectionStats {
    return { ...this.stats };
  }
}

/**
 * Create an AnomalyDetectionLLM instance from environment variables
 */
export function createAnomalyDetectionLLM(config?: AnomalyDetectionLLMConfig): AnomalyDetectionLLM | null {
  const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return null;
  }

  return new AnomalyDetectionLLM({
    apiKey,
    model: (process.env.OPENAI_MODEL as any) || 'gpt-4o-mini',
    ...config,
  });
}
