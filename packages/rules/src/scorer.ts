/**
 * Issue Scorer
 * Calculates severity and confidence for detected issues
 * Implements meta-rules R070-R072 as scoring logic
 */
import type { DetectionConfig } from '@cogtics/schemas';
import type { Issue as DbIssue } from '@cogtics/db';
import type {
  IssueSeverity,
  RuleIssue,
  RuleContext,
  ContractWithTerms,
  ScorerInput,
  ScorerOutput,
} from './types.js';
import { getSeverityByImpact, getConfidenceCap } from './config.js';

// ============================================
// Main Scoring Function
// ============================================

/**
 * Score all issues after detection
 */
export function scoreIssues(
  issues: RuleIssue[],
  context: RuleContext
): RuleIssue[] {
  // Group issues by contract for correlation
  const issuesByContract = new Map<string, RuleIssue[]>();
  for (const issue of issues) {
    const contractId = issue.contractId || '_no_contract';
    const existing = issuesByContract.get(contractId) || [];
    existing.push(issue);
    issuesByContract.set(contractId, existing);
  }

  // Score each issue
  return issues.map(issue => {
    const input: ScorerInput = {
      issue,
      contract: issue.contractId 
        ? context.contracts.find(c => c.id === issue.contractId)
        : undefined,
      priorIssues: context.priorIssues,
      relatedIssues: issuesByContract.get(issue.contractId || '_no_contract'),
      config: context.config,
    };

    const output = calculateScore(input, context);

    return {
      ...issue,
      severity: output.severity,
      confidence: output.confidence,
      metadata: {
        ...issue.metadata,
        escalationReason: output.escalationReason,
      },
    };
  });
}

// ============================================
// Score Calculation
// ============================================

function calculateScore(input: ScorerInput, context: RuleContext): ScorerOutput {
  const { issue, contract, priorIssues, relatedIssues, config } = input;

  let severity = issue.severity;
  let confidence = issue.confidence;
  let escalationReason: string | undefined;

  // R070: High-Value Contract Weight
  if (contract) {
    const contractValueWeight = applyContractValueWeight(issue, contract, config);
    if (contractValueWeight.escalate) {
      severity = escalateSeverity(severity);
      escalationReason = contractValueWeight.reason;
    }
  }

  // R071: Recurring Issue Escalation
  if (priorIssues && priorIssues.length > 0) {
    const recurrenceResult = checkRecurrence(issue, priorIssues, context);
    if (recurrenceResult.escalate) {
      severity = escalateSeverity(severity);
      escalationReason = escalationReason 
        ? `${escalationReason}; ${recurrenceResult.reason}`
        : recurrenceResult.reason;
    }
  }

  // R072: Multi-Rule Correlation
  if (relatedIssues && relatedIssues.length > 1) {
    const correlationResult = checkCorrelation(issue, relatedIssues, config);
    if (correlationResult.escalate) {
      severity = escalateSeverity(severity);
      escalationReason = escalationReason 
        ? `${escalationReason}; ${correlationResult.reason}`
        : correlationResult.reason;
    }
  }

  // Apply data quality confidence cap
  if (contract) {
    const contractReadiness = context.dataQuality.contractReadiness.get(contract.id);
    if (contractReadiness !== undefined && contractReadiness < 1.0) {
      const cap = getConfidenceCap(false, config);
      confidence = Math.min(confidence, cap);
    }
  }

  // Impact-based severity adjustment
  if (issue.impactAmount) {
    const impactSeverity = getSeverityByImpact(issue.impactAmount, config);
    if (severityRank(impactSeverity) > severityRank(severity)) {
      severity = impactSeverity;
    }
  }

  return { severity, confidence, escalationReason };
}

// ============================================
// R070: High-Value Contract Weight
// ============================================

interface WeightResult {
  escalate: boolean;
  reason?: string;
}

function applyContractValueWeight(
  issue: RuleIssue,
  contract: ContractWithTerms,
  config: DetectionConfig
): WeightResult {
  const arr = contract.arr || 0;
  
  // Escalate if contract ARR exceeds critical threshold
  if (arr >= config.thresholds.criticalImpactThreshold * 10) {
    return {
      escalate: true,
      reason: `high-value contract (ARR: ${arr})`,
    };
  }

  // Escalate if issue impact is significant relative to contract value
  if (issue.impactAmount && arr > 0) {
    const impactPct = Math.abs(issue.impactAmount) / arr;
    if (impactPct >= 0.05) { // 5% of ARR
      return {
        escalate: true,
        reason: `significant impact (${(impactPct * 100).toFixed(1)}% of ARR)`,
      };
    }
  }

  return { escalate: false };
}

// ============================================
// R071: Recurring Issue Escalation
// ============================================

interface RecurrenceResult {
  escalate: boolean;
  occurrenceCount: number;
  reason?: string;
}

function checkRecurrence(
  issue: RuleIssue,
  priorIssues: DbIssue[],
  context: RuleContext
): RecurrenceResult {
  // Find matching prior issues (same rule, same dimensions)
  const matching = priorIssues.filter(prior => {
    if (prior.rule_id !== issue.ruleId) return false;
    
    // Check dimension overlap
    const priorDims = prior.dimensions_json as Record<string, unknown>;
    return (
      priorDims.contractId === issue.dimensions.contractId ||
      priorDims.customerId === issue.dimensions.customerId
    );
  });

  // Escalate if issue has recurred 3+ times
  if (matching.length >= 2) { // Current + 2 prior = 3 occurrences
    return {
      escalate: true,
      occurrenceCount: matching.length + 1,
      reason: `recurring issue (${matching.length + 1} occurrences)`,
    };
  }

  // Escalate if previously resolved issue reappears
  const resolved = matching.find(m => m.status === 'resolved');
  if (resolved) {
    return {
      escalate: true,
      occurrenceCount: matching.length + 1,
      reason: 'previously resolved issue reappeared',
    };
  }

  return { escalate: false, occurrenceCount: 1 };
}

// ============================================
// R072: Multi-Rule Correlation
// ============================================

interface CorrelationResult {
  escalate: boolean;
  correlatedRules: string[];
  reason?: string;
}

function checkCorrelation(
  issue: RuleIssue,
  relatedIssues: RuleIssue[],
  config: DetectionConfig
): CorrelationResult {
  // Get unique rules affecting the same entity
  const ruleIds = new Set(relatedIssues.map(i => i.ruleId));
  
  // Escalate if multiple rules from different categories affect same entity
  const categories = new Set(relatedIssues.map(i => i.category));
  
  if (categories.size >= 3) {
    return {
      escalate: true,
      correlatedRules: Array.from(ruleIds),
      reason: `multiple issue categories (${Array.from(categories).join(', ')})`,
    };
  }

  // Escalate if high total impact
  const totalImpact = relatedIssues.reduce(
    (sum, i) => sum + Math.abs(i.impactAmount || 0),
    0
  );
  
  if (totalImpact >= config.thresholds.criticalImpactThreshold) {
    return {
      escalate: true,
      correlatedRules: Array.from(ruleIds),
      reason: `high combined impact ($${totalImpact.toFixed(2)})`,
    };
  }

  return { escalate: false, correlatedRules: [] };
}

// ============================================
// Helpers
// ============================================

function severityRank(severity: IssueSeverity): number {
  const ranks: Record<IssueSeverity, number> = {
    info: 0,
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };
  return ranks[severity];
}

function escalateSeverity(current: IssueSeverity): IssueSeverity {
  const escalation: Record<IssueSeverity, IssueSeverity> = {
    info: 'low',
    low: 'medium',
    medium: 'high',
    high: 'critical',
    critical: 'critical',
  };
  return escalation[current];
}
