/**
 * Recommendation LLM Prompts (Tier 4)
 * 
 * Prompts for AI-powered prescriptive recommendations including
 * fix suggestions, simulation configurations, and impact predictions.
 */

import type { AIEnrichedIssue, SimulationOverride } from '@cogtics/rules';

// ============================================
// Prompt Versioning
// ============================================

/** Prompt version for audit logging and replay */
export const RECOMMENDATION_PROMPT_VERSION = '1.0.0';

// ============================================
// System Prompts
// ============================================

export const RECOMMENDATION_SYSTEM_PROMPTS = {
  recommendation: `You are a revenue operations expert providing actionable recommendations to fix billing and contract issues.
Your recommendations should be:
1. ACTIONABLE - Clear, specific steps that can be executed
2. PRIORITIZED - Ranked by impact and effort
3. QUANTIFIED - Include estimated revenue impact
4. TESTABLE - Provide simulation configuration to preview changes

For each recommendation:
- Address the root cause, not just symptoms
- Consider downstream effects
- Group related issues together
- Estimate implementation effort
- Provide simulation overrides to test the fix

Important: Your recommendations will be used to configure automated simulations, so be precise with values.`,

  simulationConfig: `You are a revenue simulation expert generating override configurations to test proposed fixes.
Your simulation configs must be:
1. PRECISE - Exact values that can be applied to contracts/invoices
2. REVERSIBLE - Changes that can be safely tested without permanent impact
3. COMPLETE - Include all necessary overrides for the fix
4. DATED - Include effective dates for time-sensitive changes

Override types available:
- contract_term: Change contract values (price, quantity, discount)
- price_change: Adjust pricing
- timing_shift: Move billing dates
- discount_change: Modify discount rates
- billing_adjustment: Create adjusting entries

Return simulation configs that can be directly applied to the simulation engine.`,

  impactEstimation: `You are a financial analyst estimating the revenue impact of proposed changes.
Your estimates should include:
1. Direct revenue change
2. Confidence level based on data quality
3. Risk factors that could affect the estimate
4. Time horizon for impact realization

Be conservative in estimates - it's better to under-promise than over-promise.`,
};

// ============================================
// Prompt Templates
// ============================================

/**
 * Generate recommendation prompt for a group of related issues
 */
export function recommendationPrompt(
  issues: AIEnrichedIssue[],
  context: {
    contractName?: string;
    customerName?: string;
    totalImpact?: number;
    currency?: string;
  }
): string {
  const issuesList = issues.map((issue, idx) => ({
    index: idx,
    ruleId: issue.ruleId,
    category: issue.category,
    severity: issue.severity,
    confidence: issue.confidence,
    impactAmount: issue.impactAmount,
    currency: issue.currency,
    expected: issue.expected,
    actual: issue.actual,
    aiAnalysis: issue.aiAnalysis ? {
      rootCause: issue.aiAnalysis.rootCause,
      businessImpact: issue.aiAnalysis.businessImpact,
      suggestedFix: issue.aiAnalysis.suggestedFix,
    } : null,
    contractId: issue.contractId,
    invoiceId: issue.invoiceId,
  }));

  return `Generate actionable recommendations for these related billing issues:

**Context:**
- Contract: ${context.contractName || 'Multiple contracts'}
- Customer: ${context.customerName || 'Multiple customers'}
- Total Impact: ${context.currency || 'USD'} ${(context.totalImpact || 0).toLocaleString()}

**Issues (${issues.length} total):**
${JSON.stringify(issuesList, null, 2)}

Generate recommendations that:
1. Address the root causes
2. Group fixes that should be done together
3. Provide specific simulation configs to test each fix
4. Estimate the revenue impact of each fix

Return JSON:
{
  "recommendations": [
    {
      "issueIndices": [0, 1],
      "priority": "critical|high|medium|low",
      "title": "Clear, actionable title",
      "description": "Detailed description of the recommendation",
      "estimatedImpact": {
        "revenueChange": 1000.00,
        "currency": "USD",
        "confidence": 0.8,
        "timeHorizon": "immediate|30_days|quarter|annual"
      },
      "suggestedSimulation": {
        "overrides": [
          {
            "type": "contract_term|price_change|discount_change|billing_adjustment",
            "targetId": "contract or invoice ID",
            "field": "field to change",
            "originalValue": "current value",
            "newValue": "proposed value",
            "effectiveDate": "YYYY-MM-DD",
            "description": "what this change does"
          }
        ],
        "description": "What this simulation will test"
      },
      "effort": "low|medium|high",
      "reasoning": "Why this recommendation will fix the issues"
    }
  ]
}`;
}

/**
 * Generate simulation config for a specific fix
 */
export function simulationConfigPrompt(
  issue: AIEnrichedIssue,
  context: {
    contractTerms?: Array<{ type: string; value: unknown }>;
    currentInvoice?: { id: string; amount: number; date: string };
    historicalData?: { avgAmount: number; invoiceCount: number };
  }
): string {
  return `Generate a simulation configuration to test fixing this issue:

**Issue:**
- Rule: ${issue.ruleId}
- Category: ${issue.category}
- Expected: ${JSON.stringify(issue.expected)}
- Actual: ${JSON.stringify(issue.actual)}
- Impact: ${issue.currency || 'USD'} ${issue.impactAmount || 0}
${issue.aiAnalysis ? `- Root Cause: ${issue.aiAnalysis.rootCause}` : ''}
${issue.aiAnalysis ? `- Suggested Fix: ${issue.aiAnalysis.suggestedFix}` : ''}

**Contract Terms:**
${JSON.stringify(context.contractTerms || [], null, 2)}

**Current Invoice:**
${context.currentInvoice ? JSON.stringify(context.currentInvoice, null, 2) : 'N/A'}

**Historical Data:**
${context.historicalData ? JSON.stringify(context.historicalData, null, 2) : 'N/A'}

Generate simulation overrides that would correct this issue. Return JSON:
{
  "overrides": [
    {
      "type": "contract_term|price_change|timing_shift|discount_change|billing_adjustment",
      "targetId": "entity ID to modify",
      "field": "specific field",
      "originalValue": "current value",
      "newValue": "corrected value",
      "effectiveDate": "YYYY-MM-DD (if time-sensitive)",
      "description": "explanation of this override"
    }
  ],
  "expectedOutcome": {
    "revenueChange": 1000.00,
    "variance": 0.1,
    "description": "What should happen when this simulation runs"
  },
  "warnings": ["Any risks or side effects to consider"]
}`;
}

/**
 * Generate impact estimation prompt
 */
export function impactEstimationPrompt(
  issues: AIEnrichedIssue[],
  proposedChanges: SimulationOverride[]
): string {
  return `Estimate the financial impact of these proposed changes:

**Issues Being Addressed (${issues.length}):**
${issues.map(i => `- ${i.ruleId}: ${i.impactAmount || 0} ${i.currency || 'USD'} (${i.severity} severity)`).join('\n')}

**Proposed Changes:**
${JSON.stringify(proposedChanges, null, 2)}

Estimate the revenue impact considering:
1. Direct recovery from fixing issues
2. Ongoing prevention of similar issues
3. Time to realize impact
4. Confidence in the estimate

Return JSON:
{
  "directImpact": {
    "amount": 5000.00,
    "currency": "USD",
    "confidence": 0.85
  },
  "ongoingPrevention": {
    "annualAmount": 12000.00,
    "currency": "USD",
    "confidence": 0.7
  },
  "timeToRealize": "immediate|30_days|quarter|annual",
  "riskFactors": [
    "Factor that could affect the estimate"
  ],
  "reasoning": "How this estimate was calculated"
}`;
}

// ============================================
// Response Types
// ============================================

export interface RecommendationResponse {
  recommendations: AIRecommendationResponse[];
}

export interface AIRecommendationResponse {
  issueIndices: number[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  estimatedImpact: {
    revenueChange: number;
    currency: string;
    confidence: number;
    timeHorizon?: string;
  };
  suggestedSimulation: {
    overrides: SimulationOverrideResponse[];
    description: string;
  };
  effort: 'low' | 'medium' | 'high';
  reasoning: string;
}

export interface SimulationOverrideResponse {
  type: 'contract_term' | 'price_change' | 'timing_shift' | 'discount_change' | 'billing_adjustment';
  targetId: string;
  field: string;
  originalValue: unknown;
  newValue: unknown;
  effectiveDate?: string;
  description?: string;
}

export interface ImpactEstimationResponse {
  directImpact: {
    amount: number;
    currency: string;
    confidence: number;
  };
  ongoingPrevention?: {
    annualAmount: number;
    currency: string;
    confidence: number;
  };
  timeToRealize: 'immediate' | '30_days' | 'quarter' | 'annual';
  riskFactors: string[];
  reasoning: string;
}
