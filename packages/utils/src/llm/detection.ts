/**
 * Detection LLM - AI-Powered Issue Enrichment
 * 
 * Production-ready LLM client for issue enrichment with:
 * - Rate limit handling
 * - Cost tracking
 * - Token limit validation
 * - Concurrent request limiting
 */

import type { 
  RuleIssue, 
  ContractWithTerms, 
  InvoiceWithLines, 
  Customer,
  AIEnrichedIssue,
} from '@cogtics/rules';
import { 
  ProductionLLMClient, 
  type BaseLLMConfig, 
  DEFAULT_LIMITS,
  type CompletionResult,
} from './base-client.js';
import {
  DETECTION_SYSTEM_PROMPTS,
  DETECTION_PROMPT_VERSION,
  issueEnrichmentPrompt,
  fixSuggestionPrompt,
  explanationPrompt,
} from './prompts/detection.js';
import {
  IssueEnrichmentResponseSchema,
  ExplanationResponseSchema,
  FixSuggestionResponseSchema,
  safeParseLLMResponse,
  computeNeedsReview,
  type IssueEnrichmentResponse,
  type ExplanationResponse,
  type FixSuggestionResponse,
} from './schemas.js';

// Re-export for convenience
export type { AIEnrichedIssue };

// ============================================
// Types
// ============================================

export interface DetectionLLMConfig extends Partial<BaseLLMConfig> {
  /** Max issues per batch (default: 20, generous) */
  batchSize?: number;
  /** Max tokens per enrichment request */
  maxTokensPerRequest?: number;
}

export interface EnrichmentContext {
  contracts: ContractWithTerms[];
  invoices: InvoiceWithLines[];
  customers: Customer[];
}

export interface IssueExplanation {
  headline: string;
  explanation: string;
  whyItMatters: string;
  recommendation?: string;
  urgency: 'immediate' | 'this_week' | 'this_month' | 'monitor';
}

export interface FixSuggestion {
  immediateAction: string;
  systemChanges: Array<{
    type: 'simulation_override' | 'contract_update' | 'invoice_adjustment' | 'credit_memo';
    description: string;
    parameters: Record<string, unknown>;
  }>;
  processImprovements: string[];
  estimatedImpact: {
    revenueChange: number;
    currency: string;
    confidence: number;
  };
  riskAssessment: string;
}

export interface EnrichmentStats {
  totalIssues: number;
  enrichedCount: number;
  failedCount: number;
  skippedCount: number;
  totalTokensUsed: number;
  estimatedCostUsd: number;
  durationMs: number;
  cacheHits: number;
}

// ============================================
// DetectionLLM Class
// ============================================

export class DetectionLLM extends ProductionLLMClient {
  private batchSize: number;
  private maxTokensPerRequest: number;
  private stats: EnrichmentStats;

  constructor(config?: DetectionLLMConfig) {
    const apiKey = config?.apiKey || process.env.OPENAI_API_KEY || '';
    super({
      apiKey,
      model: config?.model || 'gpt-4o-mini',
      timeout: config?.timeout || 120000, // Generous 2 min timeout
      maxRetries: config?.maxRetries || 5,
      trackCosts: true,
      enableCache: true,
      tenantId: config?.tenantId,
      runId: config?.runId,
      limits: {
        ...DEFAULT_LIMITS,
        // Generous limits for detection
        maxConcurrentRequests: 100,
        maxInputTokens: 120000,
        costHardLimitUsd: 500, // Very generous
        costWarningThresholdUsd: 50,
        ...config?.limits,
      },
    });
    
    this.batchSize = config?.batchSize || 20; // Generous batch size
    this.maxTokensPerRequest = config?.maxTokensPerRequest || 16000;
    this.stats = this.initStats();
  }

  private initStats(): EnrichmentStats {
    return {
      totalIssues: 0,
      enrichedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      totalTokensUsed: 0,
      estimatedCostUsd: 0,
      durationMs: 0,
      cacheHits: 0,
    };
  }

  /**
   * Enrich multiple issues with AI analysis
   * Batches issues by contract for efficiency
   */
  async enrichIssues(
    issues: RuleIssue[],
    context: EnrichmentContext
  ): Promise<AIEnrichedIssue[]> {
    if (issues.length === 0) return [];

    const startTime = Date.now();
    this.stats = this.initStats();
    this.stats.totalIssues = issues.length;

    // Group issues by contract for better context
    const issuesByContract = this.groupIssuesByContract(issues);
    const enrichedIssues: AIEnrichedIssue[] = [];

    for (const [contractId, contractIssues] of Object.entries(issuesByContract)) {
      const contract = context.contracts.find(c => c.id === contractId);
      const customer = contract?.customer || 
        context.customers.find(c => c.id === contract?.customer_id);

      // Process in batches
      for (let i = 0; i < contractIssues.length; i += this.batchSize) {
        const batch = contractIssues.slice(i, i + this.batchSize);
        const batchEnriched = await this.enrichBatch(batch, {
          contractName: contract?.name,
          customerName: customer?.name,
          contractValue: contract?.total_value ? Number(contract.total_value) : undefined,
          currency: contract?.currency || 'USD',
        });
        enrichedIssues.push(...batchEnriched);
      }
    }

    // Handle issues without contract IDs
    const orphanIssues = issues.filter(i => !i.contractId);
    if (orphanIssues.length > 0) {
      for (let i = 0; i < orphanIssues.length; i += this.batchSize) {
        const batch = orphanIssues.slice(i, i + this.batchSize);
        const batchEnriched = await this.enrichBatch(batch, {});
        enrichedIssues.push(...batchEnriched);
      }
    }

    this.stats.durationMs = Date.now() - startTime;
    this.stats.estimatedCostUsd = this.getRunCostSummary().totalCostUsd;

    return enrichedIssues;
  }

  /**
   * Enrich a batch of issues
   */
  private async enrichBatch(
    issues: RuleIssue[],
    context: {
      contractName?: string;
      customerName?: string;
      contractValue?: number;
      currency?: string;
    }
  ): Promise<AIEnrichedIssue[]> {
    const prompt = issueEnrichmentPrompt(issues, context);
    
    try {
      const result = await this.complete(
        DETECTION_SYSTEM_PROMPTS.issueEnrichment,
        prompt,
        { 
          json: true,
          operationType: 'issue_enrichment',
          promptVersion: DETECTION_PROMPT_VERSION,
        }
      );

      // Track stats
      this.stats.totalTokensUsed += result.inputTokens + result.outputTokens;
      if (result.cached) {
        this.stats.cacheHits++;
      }

      // Validate response with Zod schema
      const parsed = safeParseLLMResponse(
        IssueEnrichmentResponseSchema,
        result.content,
        { enrichments: [] }
      );
      const enrichments = parsed?.enrichments || [];

      const enriched = issues.map((issue, idx) => {
        const enrichment = enrichments.find(e => e.issueIndex === idx);
        const issueKey = this.generateIssueKey(issue);

        if (enrichment) {
          this.stats.enrichedCount++;
          return {
            ...issue,
            aiAnalysis: {
              rootCause: enrichment.rootCause,
              businessImpact: enrichment.businessImpact,
              suggestedFix: enrichment.suggestedFix,
              confidence: enrichment.confidence,
              relatedIssueIds: enrichment.relatedIssueIndices
                .filter(i => i >= 0 && i < issues.length && issues[i])
                .map(i => this.generateIssueKey(issues[i])),
              explanation: enrichment.explanation,
              priority: enrichment.priority,
              tags: enrichment.tags,
              needsReview: computeNeedsReview(enrichment.confidence),
            },
            issueKey,
            aiEnrichedAt: new Date(),
          };
        }

        // Return issue with minimal AI analysis if enrichment not found
        this.stats.skippedCount++;
        return this.createFallbackEnrichment(issue, issueKey);
      });

      return enriched;
    } catch (error) {
      console.warn('Failed to enrich batch:', error);
      this.stats.failedCount += issues.length;
      
      // Return issues with fallback AI analysis
      return issues.map(issue => 
        this.createFallbackEnrichment(issue, this.generateIssueKey(issue))
      );
    }
  }

  /**
   * Create fallback enrichment when AI fails
   */
  private createFallbackEnrichment(issue: RuleIssue, issueKey: string): AIEnrichedIssue {
    return {
      ...issue,
      aiAnalysis: {
        rootCause: 'AI analysis unavailable',
        businessImpact: 'Impact analysis unavailable',
        suggestedFix: 'Manual review required',
        confidence: 0,
        relatedIssueIds: [],
        explanation: 'AI enrichment was not successful for this issue',
        priority: this.mapSeverityToPriority(issue.severity),
        tags: [issue.category],
        needsReview: true, // Fallback always needs review
      },
      issueKey,
      aiEnrichedAt: new Date(),
    };
  }

  /**
   * Get a detailed explanation for a single issue
   */
  async explainIssue(
    issue: RuleIssue,
    options?: {
      audienceLevel?: 'executive' | 'manager' | 'analyst';
      includeRecommendation?: boolean;
    }
  ): Promise<IssueExplanation> {
    const prompt = explanationPrompt(issue, options);

    try {
      const result = await this.complete(
        DETECTION_SYSTEM_PROMPTS.explanation,
        prompt,
        { 
          json: true,
          operationType: 'issue_explanation',
          promptVersion: DETECTION_PROMPT_VERSION,
        }
      );

      // Validate response with Zod schema
      const parsed = safeParseLLMResponse(ExplanationResponseSchema, result.content);
      if (!parsed) {
        throw new Error('Invalid explanation response format');
      }
      return {
        headline: parsed.headline,
        explanation: parsed.explanation,
        whyItMatters: parsed.whyItMatters,
        recommendation: parsed.recommendation,
        urgency: parsed.urgency,
      };
    } catch (error) {
      console.warn('Failed to explain issue:', error);
      return {
        headline: `${issue.category} issue detected`,
        explanation: `A ${issue.severity} severity issue was detected by rule ${issue.ruleId}.`,
        whyItMatters: 'This may impact revenue accuracy or compliance.',
        urgency: this.mapSeverityToUrgency(issue.severity),
      };
    }
  }

  /**
   * Get a fix suggestion for a single issue
   */
  async suggestFix(
    issue: RuleIssue,
    context: EnrichmentContext
  ): Promise<FixSuggestion> {
    const contract = context.contracts.find(c => c.id === issue.contractId);
    const invoice = context.invoices.find(i => i.id === issue.invoiceId);
    const customer = contract?.customer ||
      context.customers.find(c => c.id === contract?.customer_id);

    const prompt = fixSuggestionPrompt(issue, {
      contractName: contract?.name,
      customerName: customer?.name,
      contractTerms: contract?.terms?.map(t => ({
        type: t.term_type,
        value: t.value_json,
      })),
      invoiceDetails: invoice ? {
        number: invoice.invoice_number || invoice.id,
        amount: Number(invoice.total_amount),
        date: invoice.invoice_date?.toString() || '',
      } : undefined,
    });

    try {
      const result = await this.complete(
        DETECTION_SYSTEM_PROMPTS.fixSuggestion,
        prompt,
        { 
          json: true,
          operationType: 'fix_suggestion',
          promptVersion: DETECTION_PROMPT_VERSION,
        }
      );

      // Validate response with Zod schema
      const parsed = safeParseLLMResponse(FixSuggestionResponseSchema, result.content);
      if (!parsed) {
        throw new Error('Invalid fix suggestion response format');
      }
      return {
        immediateAction: parsed.immediateAction,
        systemChanges: parsed.systemChanges,
        processImprovements: parsed.processImprovements,
        estimatedImpact: parsed.estimatedImpact,
        riskAssessment: parsed.riskAssessment,
      };
    } catch (error) {
      console.warn('Failed to suggest fix:', error);
      return {
        immediateAction: 'Review issue manually',
        systemChanges: [],
        processImprovements: ['Implement additional validation'],
        estimatedImpact: {
          revenueChange: issue.impactAmount || 0,
          currency: issue.currency || 'USD',
          confidence: 0,
        },
        riskAssessment: 'Unable to assess risk automatically',
      };
    }
  }

  /**
   * Get enrichment statistics
   */
  getStats(): EnrichmentStats {
    return { ...this.stats };
  }

  /**
   * Group issues by contract ID
   */
  private groupIssuesByContract(issues: RuleIssue[]): Record<string, RuleIssue[]> {
    const grouped: Record<string, RuleIssue[]> = {};
    
    for (const issue of issues) {
      const key = issue.contractId || '__no_contract__';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(issue);
    }

    return grouped;
  }

  /**
   * Generate a unique issue key
   */
  private generateIssueKey(issue: RuleIssue): string {
    const parts = [
      issue.ruleId,
      issue.dimensions?.contractId,
      issue.dimensions?.invoiceId,
      issue.dimensions?.periodStart,
      issue.dimensions?.periodEnd,
      issue.dimensions?.lineItemId,
    ].filter(Boolean);

    return parts.join('_');
  }

  /**
   * Map severity to priority
   */
  private mapSeverityToPriority(severity: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (severity) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      default: return 'low';
    }
  }

  /**
   * Map severity to urgency
   */
  private mapSeverityToUrgency(severity: string): 'immediate' | 'this_week' | 'this_month' | 'monitor' {
    switch (severity) {
      case 'critical': return 'immediate';
      case 'high': return 'this_week';
      case 'medium': return 'this_month';
      default: return 'monitor';
    }
  }
}

/**
 * Create a DetectionLLM instance from environment variables
 */
export function createDetectionLLM(config?: DetectionLLMConfig): DetectionLLM | null {
  const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return null;
  }

  return new DetectionLLM({
    apiKey,
    model: (process.env.OPENAI_MODEL as any) || 'gpt-4o-mini',
    ...config,
  });
}
