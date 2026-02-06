/**
 * Detection LLM Prompts
 * 
 * Prompts for AI-powered issue enrichment, root cause analysis,
 * fix suggestions, and explanations.
 */

import type { RuleIssue } from '@cogtics/rules';

// ============================================
// Prompt Versioning
// ============================================

/** Prompt version for audit logging and replay */
export const DETECTION_PROMPT_VERSION = '1.0.0';

// ============================================
// System Prompts
// ============================================

export const DETECTION_SYSTEM_PROMPTS = {
  issueEnrichment: `You are an expert revenue assurance analyst with extensive experience in:
- SaaS/B2B billing operations
- ASC 606 revenue recognition compliance
- Contract lifecycle management
- Revenue leakage detection and recovery

## Your Task
Analyze detected billing discrepancies and provide enriched context that enables rapid resolution.

## Analysis Framework

### 1. ROOT CAUSE ANALYSIS
Determine the most likely cause from these categories:
- **Data Entry Error**: Manual input mistake (typos, wrong amounts)
- **System Integration Issue**: Data sync failure between systems
- **Process Failure**: Missing approval, skipped workflow step
- **Contract Interpretation**: Ambiguous terms, version mismatch
- **Timing Issue**: Invoice generated at wrong time, rate change not applied
- **Configuration Error**: Product/pricing catalog misconfigured

### 2. BUSINESS IMPACT ASSESSMENT
Quantify and categorize the impact:
- **Financial Impact**: Revenue at risk, cash flow effect
- **Customer Relationship**: Satisfaction risk, churn potential
- **Compliance Risk**: Audit exposure, regulatory concerns
- **Operational Impact**: Manual effort required, cascading effects
- **Materiality**: Is this material (>$10K or >5% variance)?

### 3. RECOMMENDED ACTIONS
Prioritize fixes by urgency and impact:
- **Immediate**: Actions needed within 24-48 hours
- **Short-term**: Actions for current billing cycle
- **Long-term**: Process improvements to prevent recurrence

### 4. PATTERN DETECTION
Look for connections between issues:
- Same customer across multiple invoices
- Same product or pricing tier
- Same time period or billing cycle
- Same root cause category

## Output Quality Standards
- Be specific and actionable - vague recommendations are not helpful
- Quantify everything possible - amounts, percentages, timeframes
- Prioritize customer impact - revenue recovery vs. relationship preservation
- Consider audit implications - document evidence chain`,

  fixSuggestion: `You are a senior revenue operations specialist with expertise in billing remediation.

## Fix Recommendation Framework

### 1. IMMEDIATE ACTIONS (0-48 hours)
Urgent steps to stop bleeding:
- Credit memo or refund requirements
- Customer communication needed
- Hold on pending invoices
- Escalation requirements

### 2. CORRECTIVE ACTIONS (Current cycle)
Steps to fix the specific issue:
- Invoice adjustments with exact amounts
- Contract amendments required
- System updates needed
- Approval workflows to trigger

### 3. PREVENTIVE ACTIONS (Ongoing)
Process improvements to prevent recurrence:
- Validation rule recommendations
- Workflow enhancements
- Training requirements
- Monitoring alerts to add

### 4. SIMULATION CONFIGURATION
When applicable, provide simulation parameters:
\`\`\`json
{
  "type": "price_adjustment" | "quantity_change" | "term_modification",
  "parameters": {
    "contractId": "...",
    "effectiveDate": "...",
    "changes": [...]
  }
}
\`\`\`

## Quality Standards
- Every fix must have a clear owner (system vs. manual)
- Include rollback instructions for reversible changes
- Note any customer approval requirements
- Flag multi-system changes that require coordination`,

  explanation: `You are a business communications expert translating technical billing issues for executives.

## Communication Guidelines

### Structure
1. **Lead with Impact**: Start with the business consequence, not technical details
2. **Provide Context**: What should have happened vs. what actually happened
3. **Quantify**: Use specific numbers, not vague terms
4. **Action-Oriented**: End with what's being done about it

### Language Rules
- NO technical jargon (no "API", "sync", "delta", "reconciliation")
- USE business terms (billing error, pricing discrepancy, missed charge)
- KEEP IT BRIEF: Executive summary under 3 sentences
- BE CONFIDENT: State findings definitively, not tentatively

### Examples
BAD: "The invoice line item delta against contracted TCV shows a negative variance due to a pricing tier mismatch in the CPQ integration."
GOOD: "We undercharged Customer X by $15,000 because the wrong price list was applied to their renewal invoice."

BAD: "There appears to be a potential discrepancy that may require investigation."
GOOD: "We found $50,000 in unbilled charges for Q3 that need to be invoiced."`,
};

// ============================================
// Prompt Templates
// ============================================

/**
 * Generate a batch issue enrichment prompt
 */
export function issueEnrichmentPrompt(
  issues: RuleIssue[],
  context: {
    contractName?: string;
    customerName?: string;
    contractValue?: number;
    currency?: string;
  }
): string {
  const issueList = issues.map((issue, idx) => formatIssueForPrompt(issue, idx)).join('\n\n');

  return `Analyze and enrich the following ${issues.length} detected issue(s) for ${context.customerName || 'a customer'}:

**Contract Context:**
- Contract Name: ${context.contractName || 'N/A'}
- Customer: ${context.customerName || 'N/A'}
- Contract Value: ${context.currency || 'USD'} ${context.contractValue?.toLocaleString() || 'N/A'}

**Detected Issues:**
${issueList}

For each issue, provide enriched analysis in this JSON format:
{
  "enrichments": [
    {
      "issueIndex": 0,
      "rootCause": "Detailed explanation of what likely caused this issue",
      "businessImpact": "Financial and operational impact description",
      "suggestedFix": "Specific corrective action to take",
      "confidence": 0.0-1.0,
      "relatedIssueIndices": [1, 2],
      "explanation": "Plain-language summary for business users",
      "priority": "critical|high|medium|low",
      "tags": ["billing", "contract_mismatch", "automation_candidate"]
    }
  ]
}`;
}

/**
 * Generate a single fix suggestion prompt
 */
export function fixSuggestionPrompt(
  issue: RuleIssue,
  context: {
    contractName?: string;
    customerName?: string;
    contractTerms?: Array<{ type: string; value: unknown }>;
    invoiceDetails?: { number: string; amount: number; date: string };
  }
): string {
  return `Provide a detailed fix recommendation for this billing discrepancy:

**Issue Details:**
- Rule: ${issue.ruleId}
- Category: ${issue.category}
- Severity: ${issue.severity}
- Expected: ${JSON.stringify(issue.expected)}
- Actual: ${JSON.stringify(issue.actual)}
${issue.impactAmount ? `- Impact: ${issue.currency || 'USD'} ${issue.impactAmount.toLocaleString()}` : ''}

**Context:**
- Contract: ${context.contractName || 'N/A'}
- Customer: ${context.customerName || 'N/A'}
${context.invoiceDetails ? `- Invoice: ${context.invoiceDetails.number} (${context.invoiceDetails.date}) - ${context.invoiceDetails.amount}` : ''}
${context.contractTerms ? `- Relevant Terms: ${JSON.stringify(context.contractTerms)}` : ''}

Return JSON with format:
{
  "immediateAction": "What needs to be done right now",
  "systemChanges": [
    {
      "type": "simulation_override|contract_update|invoice_adjustment|credit_memo",
      "description": "What change to make",
      "parameters": {
        "overrideType": "contract_term|price_change|billing_adjustment",
        "targetId": "contract or invoice ID",
        "newValue": "the corrected value",
        "effectiveDate": "when to apply"
      }
    }
  ],
  "processImprovements": ["Preventive measures"],
  "estimatedImpact": {
    "revenueChange": 1000.00,
    "currency": "USD",
    "confidence": 0.8
  },
  "riskAssessment": "Any risks with this fix"
}`;
}

/**
 * Generate an explanation prompt for business users
 */
export function explanationPrompt(
  issue: RuleIssue,
  options?: {
    audienceLevel?: 'executive' | 'manager' | 'analyst';
    includeRecommendation?: boolean;
  }
): string {
  const level = options?.audienceLevel || 'manager';

  return `Explain this billing discrepancy for a ${level}-level audience:

**Issue:**
- Type: ${getRuleDescription(issue.ruleId)}
- Category: ${issue.category}
- Severity: ${issue.severity}
- Expected Value: ${JSON.stringify(issue.expected)}
- Actual Value: ${JSON.stringify(issue.actual)}
${issue.impactAmount ? `- Financial Impact: ${issue.currency || 'USD'} ${issue.impactAmount.toLocaleString()}` : ''}

${options?.includeRecommendation ? 'Include a brief recommendation at the end.' : ''}

Return JSON:
{
  "headline": "One-line summary (max 15 words)",
  "explanation": "2-3 sentence explanation for business users",
  "whyItMatters": "Business impact in plain terms",
  ${options?.includeRecommendation ? '"recommendation": "What to do next",' : ''}
  "urgency": "immediate|this_week|this_month|monitor"
}`;
}

// ============================================
// Helper Functions
// ============================================

function formatIssueForPrompt(issue: RuleIssue, index: number): string {
  return `**Issue ${index + 1}:**
- Rule ID: ${issue.ruleId}
- Category: ${issue.category}
- Severity: ${issue.severity}
- Confidence: ${(issue.confidence * 100).toFixed(0)}%
- Expected: ${JSON.stringify(issue.expected, null, 2)}
- Actual: ${JSON.stringify(issue.actual, null, 2)}
${issue.impactAmount ? `- Impact Amount: ${issue.currency || 'USD'} ${issue.impactAmount.toLocaleString()}` : ''}
${issue.contractId ? `- Contract ID: ${issue.contractId}` : ''}
${issue.invoiceId ? `- Invoice ID: ${issue.invoiceId}` : ''}`;
}

function getRuleDescription(ruleId: string): string {
  const descriptions: Record<string, string> = {
    // Billing rules
    R001: 'Invoice amount does not match contract terms',
    R002: 'Missing invoice for billing period',
    R003: 'Duplicate invoice detected',
    R004: 'Invoice timing variance',
    R005: 'Quantity mismatch between contract and invoice',
    R006: 'Unit price mismatch',
    R007: 'Multi-line invoice variance',
    R008: 'Invoice covers wrong period',
    R009: 'Invoice frequency changed unexpectedly',
    R010: 'Pro-ration calculation error',
    // Discount rules
    R011: 'Discount applied after expiration',
    R012: 'Missing expected discount',
    R013: 'Discount rate mismatch',
    R014: 'Volume discount not applied',
    R015: 'Promotional discount expired',
    R016: 'Discount exceeds maximum allowed',
    // Rev-Rec rules
    R020: 'Revenue schedule gap detected',
    R021: 'Allocation variance',
    R022: 'SSP outlier detected',
    R023: 'Modification not applied',
    R024: 'Revenue over-recognized',
    R025: 'Obligation timing mismatch',
    R026: 'Deferred revenue balance error',
    R027: 'Recognition method inconsistency',
    // Default
    default: 'Billing or contract discrepancy detected',
  };
  return descriptions[ruleId] || descriptions.default;
}

// ============================================
// Enrichment Response Types
// ============================================

export interface IssueEnrichmentResponse {
  issueIndex: number;
  rootCause: string;
  businessImpact: string;
  suggestedFix: string;
  confidence: number;
  relatedIssueIndices: number[];
  explanation: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  tags: string[];
}

export interface FixSuggestionResponse {
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

export interface ExplanationResponse {
  headline: string;
  explanation: string;
  whyItMatters: string;
  recommendation?: string;
  urgency: 'immediate' | 'this_week' | 'this_month' | 'monitor';
}
