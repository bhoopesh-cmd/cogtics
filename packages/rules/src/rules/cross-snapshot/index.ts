/**
 * Tier 8: Cross-Snapshot Consistency Rules
 * R080-R083 - Snapshot-over-snapshot validation
 */
import type { Rule, RuleContext, RuleIssue } from '../../types.js';
import { formatDateKey } from '../../utils.js';

// R080: Issue Regression
export const R080_IssueRegression: Rule = {
  id: 'R080',
  version: '1.0.0',
  name: 'Issue Regression',
  description: 'Previously resolved issue has reappeared',
  category: 'cross_snapshot',
  tier: 'cross_snapshot',
  severity: 'high',
  priority: 1,
  requiresData: ['prior_issues'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { priorIssues, currentRunIssues, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    if (!priorIssues || priorIssues.length === 0) return issues;

    // Find previously resolved issues
    const resolvedIssues = priorIssues.filter(i => i.status === 'resolved');
    
    // Build a map of current issue keys
    const currentKeys = new Set(
      currentRunIssues.map(i => `${i.ruleId}_${JSON.stringify(i.dimensions)}`)
    );

    for (const resolved of resolvedIssues) {
      const dims = resolved.dimensions_json as Record<string, string>;
      const key = `${resolved.rule_id}_${JSON.stringify(dims)}`;

      if (currentKeys.has(key)) {
        issues.push({
          ruleId: 'R080',
          ruleVersion: '1.0.0',
          category: 'cross_snapshot',
          severity: 'high',
          confidence: 0.95,
          expected: { issueStaysResolved: true },
          actual: { 
            issueReappeared: true,
            originalRuleId: resolved.rule_id,
            resolvedInSnapshot: resolved.snapshot_id,
          },
          dimensions: {
            snapshotId,
            originalIssueId: resolved.id,
            contractId: dims.contractId,
          },
          contractId: dims.contractId,
          customerId: dims.customerId,
          metadata: {
            priorIssueId: resolved.id,
            priorSnapshotId: resolved.snapshot_id,
          },
        });
      }
    }

    return issues;
  },
};

// R081: New Issue on Unchanged Data
export const R081_NewIssueUnchangedData: Rule = {
  id: 'R081',
  version: '1.0.0',
  name: 'New Issue on Unchanged Data',
  description: 'Issue detected on data that has not changed since last run',
  category: 'cross_snapshot',
  tier: 'cross_snapshot',
  severity: 'medium',
  priority: 2,
  requiresData: ['contracts', 'invoices', 'prior_snapshot', 'prior_issues'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, dataQuality, priorIssues, currentRunIssues, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    if (!dataQuality.priorSnapshot || !priorIssues) return issues;

    // Build set of prior issue keys
    const priorKeys = new Set(
      priorIssues.map(i => {
        const dims = i.dimensions_json as Record<string, string>;
        return `${i.rule_id}_${dims.contractId || ''}_${dims.invoiceId || ''}`;
      })
    );

    // Check current issues that weren't in prior
    for (const current of currentRunIssues) {
      const key = `${current.ruleId}_${current.dimensions.contractId || ''}_${current.dimensions.invoiceId || ''}`;
      
      if (priorKeys.has(key)) continue; // Already existed

      // Check if the underlying entity has changed
      // (simplified: check if contract updated_at or invoice created_at is after prior snapshot)
      const contract = current.contractId 
        ? contracts.find(c => c.id === current.contractId)
        : null;
      const invoice = current.invoiceId
        ? invoices.find(i => i.id === current.invoiceId)
        : null;

      const priorSnapshotDate = dataQuality.priorSnapshot.completed_at;
      if (!priorSnapshotDate) continue;

      const contractUnchanged = !contract || contract.created_at <= priorSnapshotDate;
      const invoiceUnchanged = !invoice || invoice.created_at <= priorSnapshotDate;

      if (contractUnchanged && invoiceUnchanged) {
        issues.push({
          ruleId: 'R081',
          ruleVersion: '1.0.0',
          category: 'cross_snapshot',
          severity: 'medium',
          confidence: 0.7,
          expected: { 
            newIssueRequiresDataChange: true,
          },
          actual: { 
            dataUnchanged: true,
            originalRuleId: current.ruleId,
          },
          dimensions: {
            snapshotId,
            newIssueRuleId: current.ruleId,
            contractId: current.dimensions.contractId,
          },
          contractId: current.contractId,
          metadata: {
            priorSnapshotId: dataQuality.priorSnapshot.id,
            newIssueDetails: current,
          },
        });
      }
    }

    return issues;
  },
};

// R082: Contract Value Change Without Amendment
export const R082_ContractValueChangeNoAmendment: Rule = {
  id: 'R082',
  version: '1.0.0',
  name: 'Contract Value Change Without Amendment',
  description: 'Contract TCV changed without corresponding amendment record',
  category: 'cross_snapshot',
  tier: 'cross_snapshot',
  severity: 'high',
  priority: 1,
  requiresData: ['contracts', 'prior_snapshot'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, dataQuality, config, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    // This would require access to prior contract values
    // For now, check for contracts with ARR changes in metadata
    for (const contract of contracts) {
      const metadata = contract.metadata_json as Record<string, unknown> | null;
      if (!metadata) continue;

      const priorArr = metadata._priorArr as number | undefined;
      if (priorArr === undefined || contract.arr === null) continue;

      const variance = Math.abs(contract.arr - priorArr);
      const toleranceAbs = config.thresholds.amountVarianceAbs;

      if (variance > toleranceAbs) {
        // Check for amendment term
        const hasAmendment = contract.terms.some(t => 
          t.term_type === 'amendment' || t.term_type === 'renewal'
        );

        if (!hasAmendment) {
          issues.push({
            ruleId: 'R082',
            ruleVersion: '1.0.0',
            category: 'cross_snapshot',
            severity: 'high',
            confidence: 0.8,
            impactAmount: variance,
            currency: contract.currency,
            expected: { 
              valueChangeRequiresAmendment: true,
            },
            actual: { 
              valueChanged: true,
              hasAmendment: false,
              priorArr,
              currentArr: contract.arr,
            },
            dimensions: {
              snapshotId,
              contractId: contract.id,
            },
            contractId: contract.id,
            customerId: contract.customer_id || undefined,
          });
        }
      }
    }

    return issues;
  },
};

// R083: Snapshot Gap Detected
export const R083_SnapshotGapDetected: Rule = {
  id: 'R083',
  version: '1.0.0',
  name: 'Snapshot Gap Detected',
  description: 'Missing snapshot in sequence',
  category: 'cross_snapshot',
  tier: 'cross_snapshot',
  severity: 'medium',
  priority: 3,
  requiresData: ['prior_snapshot'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { dataQuality, snapshotId, snapshotDate } = ctx;
    const issues: RuleIssue[] = [];

    if (!dataQuality.priorSnapshot) return issues;

    const priorDate = dataQuality.priorSnapshot.completed_at;
    if (!priorDate) return issues;

    // Check if gap is too large (more than 2 days for daily snapshots)
    const gapMs = snapshotDate.getTime() - priorDate.getTime();
    const gapDays = gapMs / (1000 * 60 * 60 * 24);

    if (gapDays > 2) {
      issues.push({
        ruleId: 'R083',
        ruleVersion: '1.0.0',
        category: 'cross_snapshot',
        severity: 'medium',
        confidence: 1.0,
        expected: { maxGapDays: 2 },
        actual: { gapDays: Math.round(gapDays) },
        dimensions: {
          snapshotId,
          priorSnapshotId: dataQuality.priorSnapshot.id,
        },
        metadata: {
          currentSnapshotDate: formatDateKey(snapshotDate),
          priorSnapshotDate: formatDateKey(priorDate),
        },
      });
    }

    return issues;
  },
};

// Export all cross-snapshot rules
export const crossSnapshotRules: Rule[] = [
  R080_IssueRegression,
  R081_NewIssueUnchangedData,
  R082_ContractValueChangeNoAmendment,
  R083_SnapshotGapDetected,
];
