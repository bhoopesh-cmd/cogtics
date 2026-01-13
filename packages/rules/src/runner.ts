/**
 * Rule Runner
 * Executes rules in order and collects results
 */
import type { DetectionConfig } from '@cogtics/schemas';
import type {
  Rule,
  RuleContext,
  RuleIssue,
  RuleRunResult,
  DetectionRunResult,
  RunnerOptions,
} from './types.js';
import { getRegistry, TIER_ORDER } from './registry.js';
import { isRuleEnabled, RULESET_VERSION } from './config.js';
import { generateIssueKey } from './utils.js';
import { deduplicateIssues } from './deduplicator.js';
import { scoreIssues } from './scorer.js';

// ============================================
// Runner Implementation
// ============================================

/**
 * Run all rules against the provided context
 */
export async function runDetection(
  context: RuleContext,
  options: RunnerOptions = {}
): Promise<DetectionRunResult> {
  const startTime = Date.now();
  const registry = getRegistry();
  const ruleResults: RuleRunResult[] = [];
  const allIssues: RuleIssue[] = [];
  
  // Track which rules have fired for suppression
  const firedRules = new Set<string>();

  // Get rules in execution order
  let rulesToRun = registry.getInOrder();

  // Filter by specific rule IDs if provided
  if (options.ruleIds && options.ruleIds.length > 0) {
    rulesToRun = rulesToRun.filter(r => options.ruleIds!.includes(r.id));
  }

  // Skip specific rules if provided
  if (options.skipRuleIds && options.skipRuleIds.length > 0) {
    rulesToRun = rulesToRun.filter(r => !options.skipRuleIds!.includes(r.id));
  }

  // Run each rule
  for (const rule of rulesToRun) {
    const ruleStart = Date.now();

    try {
      // Check if rule is enabled by configuration
      if (!isRuleEnabled(rule.id, context.config, rule.enabled)) {
        ruleResults.push({
          ruleId: rule.id,
          ruleVersion: rule.version,
          issueCount: 0,
          durationMs: 0,
          skipped: true,
          skipReason: 'disabled by configuration',
        });
        continue;
      }

      // Check data quality gating
      const gatingResult = checkGating(rule, context);
      if (gatingResult.skip) {
        ruleResults.push({
          ruleId: rule.id,
          ruleVersion: rule.version,
          issueCount: 0,
          durationMs: 0,
          skipped: true,
          skipReason: gatingResult.reason,
        });
        continue;
      }

      // Check dependencies
      if (rule.dependsOn && rule.dependsOn.length > 0) {
        const unmetDeps = rule.dependsOn.filter(dep => !firedRules.has(dep));
        if (unmetDeps.length > 0) {
          // Dependencies didn't fire, which means they passed - rule can proceed
        }
      }

      // Check if this rule should be suppressed
      if (rule.suppressedBy && rule.suppressedBy.length > 0) {
        const suppressingRules = rule.suppressedBy.filter(id => firedRules.has(id));
        if (suppressingRules.length > 0) {
          ruleResults.push({
            ruleId: rule.id,
            ruleVersion: rule.version,
            issueCount: 0,
            durationMs: Date.now() - ruleStart,
            skipped: true,
            skipReason: `suppressed by ${suppressingRules.join(', ')}`,
          });
          continue;
        }
      }

      // Update context with current run issues for hierarchy checking
      context.currentRunIssues = allIssues;

      // Execute the rule
      let issues = rule.run(context);

      // Apply max issues limit if configured
      if (options.maxIssuesPerRule && issues.length > options.maxIssuesPerRule) {
        issues = issues.slice(0, options.maxIssuesPerRule);
      }

      // Track that this rule fired (if it produced issues)
      if (issues.length > 0) {
        firedRules.add(rule.id);
      }

      // Add issue keys
      for (const issue of issues) {
        const issueKey = generateIssueKey(
          issue.ruleId,
          issue.ruleVersion,
          issue.dimensions
        );
        (issue as any).issueKey = issueKey;
      }

      allIssues.push(...issues);

      ruleResults.push({
        ruleId: rule.id,
        ruleVersion: rule.version,
        issueCount: issues.length,
        durationMs: Date.now() - ruleStart,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      ruleResults.push({
        ruleId: rule.id,
        ruleVersion: rule.version,
        issueCount: 0,
        durationMs: Date.now() - ruleStart,
        error: errorMessage,
      });

      if (options.stopOnError) {
        return {
          runId: context.runId,
          snapshotId: context.snapshotId,
          rulesetVersion: RULESET_VERSION,
          status: 'failed',
          issuesTotal: allIssues.length,
          issuesBySeverity: countBySeverity(allIssues),
          issuesByCategory: countByCategory(allIssues),
          ruleResults,
          durationMs: Date.now() - startTime,
          errorCode: 'RULE_ERROR',
          errorMessage: `Rule ${rule.id} failed: ${errorMessage}`,
        };
      }
    }
  }

  // Deduplicate issues
  const deduplicationResult = deduplicateIssues(allIssues, context.config);
  const dedupedIssues = deduplicationResult.issues;

  // Score issues
  const scoredIssues = scoreIssues(dedupedIssues, context);

  return {
    runId: context.runId,
    snapshotId: context.snapshotId,
    rulesetVersion: RULESET_VERSION,
    status: 'completed',
    issuesTotal: scoredIssues.length,
    issuesBySeverity: countBySeverity(scoredIssues),
    issuesByCategory: countByCategory(scoredIssues),
    ruleResults,
    durationMs: Date.now() - startTime,
  };
}

// ============================================
// Helper Functions
// ============================================

interface GatingResult {
  skip: boolean;
  reason?: string;
}

function checkGating(rule: Rule, context: RuleContext): GatingResult {
  const { config, dataQuality } = context;

  // Check usage data staleness for usage rules
  if (rule.requiresData.includes('usage_events')) {
    if (config.gating.skipIfUsageStale && dataQuality.usageDataStale) {
      return {
        skip: true,
        reason: `usage data is stale (${dataQuality.usageDataAgeHours}h old)`,
      };
    }
  }

  // Check CRM staleness for contract-dependent rules
  if (rule.requiresData.includes('contracts')) {
    if (config.gating.skipIfCRMStale && dataQuality.crmDataStale) {
      return {
        skip: true,
        reason: `CRM data is stale (${dataQuality.crmDataAgeHours}h old)`,
      };
    }
  }

  return { skip: false };
}

function countBySeverity(issues: RuleIssue[]): Record<string, number> {
  const counts: Record<string, number> = {
    info: 0,
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  for (const issue of issues) {
    counts[issue.severity] = (counts[issue.severity] || 0) + 1;
  }

  return counts;
}

function countByCategory(issues: RuleIssue[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const issue of issues) {
    counts[issue.category] = (counts[issue.category] || 0) + 1;
  }

  return counts;
}
