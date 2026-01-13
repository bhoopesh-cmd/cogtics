/**
 * Issue Deduplicator
 * Handles hierarchy suppression and duplicate detection
 */
import type { DetectionConfig } from '@cogtics/schemas';
import type { RuleIssue, DeduplicationResult } from './types.js';
import { generateIssueKey } from './utils.js';

// ============================================
// Rule Hierarchy (Suppression Rules)
// ============================================

/**
 * Defines which rules suppress which parent rules
 * Key: Parent rule ID that gets suppressed
 * Value: Array of child rule IDs that suppress the parent
 */
export const RULE_HIERARCHY: Record<string, string[]> = {
  // Underbilling (R002) is suppressed if specific cause is identified
  'R002': ['R004', 'R005'],
  // Overbilling (R003) is suppressed if specific cause is identified  
  'R003': ['R004', 'R005'],
  // Cancelled contract billing (R061) suppresses expired (R062)
  'R062': ['R061'],
};

/**
 * Inverse hierarchy: child -> parent(s) it suppresses
 */
export const INVERSE_HIERARCHY: Record<string, string[]> = (() => {
  const inverse: Record<string, string[]> = {};
  for (const [parent, children] of Object.entries(RULE_HIERARCHY)) {
    for (const child of children) {
      if (!inverse[child]) {
        inverse[child] = [];
      }
      inverse[child].push(parent);
    }
  }
  return inverse;
})();

// ============================================
// Main Deduplication Function
// ============================================

/**
 * Deduplicate issues by removing duplicates and applying hierarchy suppression
 */
export function deduplicateIssues(
  issues: RuleIssue[],
  config: DetectionConfig
): DeduplicationResult {
  const result: DeduplicationResult = {
    issues: [],
    suppressed: [],
    duplicates: [],
  };

  // Step 1: Remove exact duplicates (same issue key)
  const uniqueIssues = removeDuplicates(issues, result);

  // Step 2: Apply hierarchy suppression
  const finalIssues = applyHierarchySuppression(uniqueIssues, result);

  result.issues = finalIssues;
  return result;
}

// ============================================
// Duplicate Removal
// ============================================

function removeDuplicates(
  issues: RuleIssue[],
  result: DeduplicationResult
): RuleIssue[] {
  const seen = new Map<string, RuleIssue>();
  
  for (const issue of issues) {
    const key = generateIssueKey(
      issue.ruleId,
      issue.ruleVersion,
      issue.dimensions
    );

    const existing = seen.get(key);
    if (existing) {
      // Keep the one with higher severity or confidence
      if (shouldReplace(existing, issue)) {
        result.duplicates.push({ original: existing, duplicate: issue });
        seen.set(key, issue);
      } else {
        result.duplicates.push({ original: issue, duplicate: existing });
      }
    } else {
      seen.set(key, issue);
    }
  }

  return Array.from(seen.values());
}

function shouldReplace(existing: RuleIssue, candidate: RuleIssue): boolean {
  // Prefer higher severity
  const severityRank = {
    info: 0,
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  if (severityRank[candidate.severity] > severityRank[existing.severity]) {
    return true;
  }
  if (severityRank[candidate.severity] < severityRank[existing.severity]) {
    return false;
  }

  // Same severity, prefer higher confidence
  return candidate.confidence > existing.confidence;
}

// ============================================
// Hierarchy Suppression
// ============================================

function applyHierarchySuppression(
  issues: RuleIssue[],
  result: DeduplicationResult
): RuleIssue[] {
  // Index issues by rule and entity
  const issueIndex = buildIssueIndex(issues);

  const finalIssues: RuleIssue[] = [];

  for (const issue of issues) {
    // Check if this issue's rule should be suppressed
    const suppressingRules = RULE_HIERARCHY[issue.ruleId];
    
    if (suppressingRules && suppressingRules.length > 0) {
      // Look for child rules that fired for the same entity
      const suppressedBy = findSuppressingRule(issue, suppressingRules, issueIndex);
      
      if (suppressedBy) {
        result.suppressed.push({
          issue,
          suppressedBy,
        });
        continue; // Skip this issue
      }
    }

    finalIssues.push(issue);
  }

  return finalIssues;
}

// ============================================
// Index and Lookup Helpers
// ============================================

interface IssueIndex {
  byRule: Map<string, RuleIssue[]>;
  byContract: Map<string, RuleIssue[]>;
  byInvoice: Map<string, RuleIssue[]>;
  byPeriod: Map<string, RuleIssue[]>;
}

function buildIssueIndex(issues: RuleIssue[]): IssueIndex {
  const index: IssueIndex = {
    byRule: new Map(),
    byContract: new Map(),
    byInvoice: new Map(),
    byPeriod: new Map(),
  };

  for (const issue of issues) {
    // Index by rule
    const ruleIssues = index.byRule.get(issue.ruleId) || [];
    ruleIssues.push(issue);
    index.byRule.set(issue.ruleId, ruleIssues);

    // Index by contract
    if (issue.contractId) {
      const contractIssues = index.byContract.get(issue.contractId) || [];
      contractIssues.push(issue);
      index.byContract.set(issue.contractId, contractIssues);
    }

    // Index by invoice
    if (issue.invoiceId) {
      const invoiceIssues = index.byInvoice.get(issue.invoiceId) || [];
      invoiceIssues.push(issue);
      index.byInvoice.set(issue.invoiceId, invoiceIssues);
    }

    // Index by period
    const periodKey = `${issue.dimensions.periodStart || ''}_${issue.dimensions.periodEnd || ''}`;
    if (periodKey !== '_') {
      const periodIssues = index.byPeriod.get(periodKey) || [];
      periodIssues.push(issue);
      index.byPeriod.set(periodKey, periodIssues);
    }
  }

  return index;
}

function findSuppressingRule(
  issue: RuleIssue,
  suppressingRules: string[],
  index: IssueIndex
): string | null {
  for (const ruleId of suppressingRules) {
    const ruleIssues = index.byRule.get(ruleId);
    if (!ruleIssues) continue;

    // Check if any of these issues match the same entity
    for (const candidate of ruleIssues) {
      if (matchesEntity(issue, candidate)) {
        return ruleId;
      }
    }
  }

  return null;
}

function matchesEntity(a: RuleIssue, b: RuleIssue): boolean {
  // Same contract
  if (a.contractId && b.contractId && a.contractId === b.contractId) {
    // Check period overlap for billing rules
    if (a.dimensions.periodStart && b.dimensions.periodStart) {
      return a.dimensions.periodStart === b.dimensions.periodStart;
    }
    return true;
  }

  // Same invoice
  if (a.invoiceId && b.invoiceId && a.invoiceId === b.invoiceId) {
    return true;
  }

  // Same customer and period
  if (a.customerId && b.customerId && a.customerId === b.customerId) {
    if (a.dimensions.periodStart === b.dimensions.periodStart) {
      return true;
    }
  }

  return false;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get rules that would suppress a given rule
 */
export function getSuppressingRules(ruleId: string): string[] {
  return RULE_HIERARCHY[ruleId] || [];
}

/**
 * Get rules that a given rule suppresses
 */
export function getSuppressedRules(ruleId: string): string[] {
  return INVERSE_HIERARCHY[ruleId] || [];
}

/**
 * Check if a rule is in the hierarchy
 */
export function isInHierarchy(ruleId: string): boolean {
  return ruleId in RULE_HIERARCHY || ruleId in INVERSE_HIERARCHY;
}
