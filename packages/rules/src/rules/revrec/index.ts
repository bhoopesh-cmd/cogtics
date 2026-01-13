/**
 * Tier 3: Revenue Recognition Rules
 * R020-R027 - Rev-rec compliance and accuracy
 */
import type { Rule, RuleContext, RuleIssue } from '../../types.js';
import { compareWithTolerance, formatDateKey, sum } from '../../utils.js';

// R020: Recognized vs Invoiced Gap
export const R020_RecognizedVsInvoicedGap: Rule = {
  id: 'R020',
  version: '1.0.0',
  name: 'Recognized vs Invoiced Gap',
  description: 'Revenue recognized does not match invoiced amount for period',
  category: 'revrec',
  tier: 'revrec',
  severity: 'high',
  priority: 1,
  requiresData: ['schedules', 'invoices', 'contracts'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { schedules, invoices, contracts, config, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    // Group schedules by contract
    const schedulesByContract = new Map<string, typeof schedules>();
    for (const schedule of schedules) {
      const contractId = schedule.obligation?.contract_id;
      if (!contractId) continue;
      const list = schedulesByContract.get(contractId) || [];
      list.push(schedule);
      schedulesByContract.set(contractId, list);
    }

    for (const [contractId, contractSchedules] of schedulesByContract) {
      const contractInvoices = invoices.filter(i => i.contract_id === contractId);
      
      const totalRecognized = sum(contractSchedules, s => s.recognized_amount);
      const totalInvoiced = sum(contractInvoices, i => i.total);

      const comparison = compareWithTolerance(
        totalInvoiced,
        totalRecognized,
        config.thresholds.amountVariancePct,
        config.thresholds.amountVarianceAbs
      );

      if (!comparison.matches) {
        const contract = contracts.find(c => c.id === contractId);
        
        issues.push({
          ruleId: 'R020',
          ruleVersion: '1.0.0',
          category: 'revrec',
          severity: 'high',
          confidence: 0.9,
          impactAmount: Math.abs(comparison.variance),
          currency: contract?.currency || 'USD',
          expected: { invoiced: totalInvoiced },
          actual: { recognized: totalRecognized },
          dimensions: { snapshotId, contractId },
          contractId,
          customerId: contract?.customer_id || undefined,
          metadata: { variancePct: comparison.variancePct },
        });
      }
    }

    return issues;
  },
};

// R021: Deferred Balance Imbalance
export const R021_DeferredBalanceImbalance: Rule = {
  id: 'R021',
  version: '1.0.0',
  name: 'Deferred Balance Imbalance',
  description: 'Deferred revenue balance does not reconcile correctly',
  category: 'revrec',
  tier: 'revrec',
  severity: 'high',
  priority: 2,
  requiresData: ['schedules', 'obligations'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { schedules, config, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    // Group by obligation
    const byObligation = new Map<string, typeof schedules>();
    for (const schedule of schedules) {
      const list = byObligation.get(schedule.obligation_id) || [];
      list.push(schedule);
      byObligation.set(schedule.obligation_id, list);
    }

    for (const [obligationId, oblSchedules] of byObligation) {
      const totalScheduled = sum(oblSchedules, s => s.scheduled_amount);
      const totalRecognized = sum(oblSchedules, s => s.recognized_amount);
      const totalDeferred = sum(oblSchedules, s => s.deferred_amount);

      // Deferred should equal scheduled - recognized
      const expectedDeferred = totalScheduled - totalRecognized;
      
      const comparison = compareWithTolerance(
        expectedDeferred,
        totalDeferred,
        config.thresholds.amountVariancePct,
        config.thresholds.amountVarianceAbs
      );

      if (!comparison.matches) {
        const obligation = oblSchedules[0]?.obligation;
        
        issues.push({
          ruleId: 'R021',
          ruleVersion: '1.0.0',
          category: 'revrec',
          severity: 'high',
          confidence: 0.95,
          impactAmount: Math.abs(comparison.variance),
          currency: obligation?.currency || 'USD',
          expected: { deferred: expectedDeferred, formula: 'scheduled - recognized' },
          actual: { deferred: totalDeferred, scheduled: totalScheduled, recognized: totalRecognized },
          dimensions: { snapshotId, obligationId },
          contractId: obligation?.contract_id,
        });
      }
    }

    return issues;
  },
};

// R022: Schedule Exceeds Contract Value
export const R022_ScheduleExceedsContractValue: Rule = {
  id: 'R022',
  version: '1.0.0',
  name: 'Schedule Exceeds Contract Value',
  description: 'Total scheduled revenue exceeds contract TCV',
  category: 'revrec',
  tier: 'revrec',
  severity: 'critical',
  priority: 1,
  requiresData: ['schedules', 'contracts', 'obligations'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { schedules, contracts, config, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    // Group schedules by contract
    const byContract = new Map<string, number>();
    for (const schedule of schedules) {
      const contractId = schedule.obligation?.contract_id;
      if (!contractId) continue;
      byContract.set(contractId, (byContract.get(contractId) || 0) + schedule.scheduled_amount);
    }

    for (const [contractId, totalScheduled] of byContract) {
      const contract = contracts.find(c => c.id === contractId);
      if (!contract || contract.arr === null) continue;

      // TCV approximation: ARR * term years
      const termYears = contract.start_date && contract.end_date
        ? (contract.end_date.getTime() - contract.start_date.getTime()) / (365 * 24 * 60 * 60 * 1000)
        : 1;
      const estimatedTCV = contract.arr * termYears;

      if (totalScheduled > estimatedTCV * 1.05) { // 5% buffer
        issues.push({
          ruleId: 'R022',
          ruleVersion: '1.0.0',
          category: 'revrec',
          severity: 'critical',
          confidence: 0.85,
          impactAmount: totalScheduled - estimatedTCV,
          currency: contract.currency,
          expected: { maxScheduled: estimatedTCV },
          actual: { totalScheduled },
          dimensions: { snapshotId, contractId },
          contractId,
          customerId: contract.customer_id || undefined,
        });
      }
    }

    return issues;
  },
};

// R023: Missing Recognition Schedule
export const R023_MissingRecognitionSchedule: Rule = {
  id: 'R023',
  version: '1.0.0',
  name: 'Missing Recognition Schedule',
  description: 'Contract with invoices has no recognition schedule',
  category: 'revrec',
  tier: 'revrec',
  severity: 'high',
  priority: 1,
  requiresData: ['contracts', 'invoices', 'schedules', 'obligations'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, obligations, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    // Find contracts with invoices
    const contractsWithInvoices = new Set(invoices.map(i => i.contract_id).filter(Boolean));
    
    // Find contracts with obligations/schedules
    const contractsWithSchedules = new Set(obligations.map(o => o.contract_id));

    for (const contractId of contractsWithInvoices) {
      if (!contractId) continue;
      if (contractsWithSchedules.has(contractId)) continue;

      const contract = contracts.find(c => c.id === contractId);
      const contractInvoices = invoices.filter(i => i.contract_id === contractId);
      const totalInvoiced = sum(contractInvoices, i => i.total);

      issues.push({
        ruleId: 'R023',
        ruleVersion: '1.0.0',
        category: 'revrec',
        severity: 'high',
        confidence: 1.0,
        impactAmount: totalInvoiced,
        currency: contract?.currency || 'USD',
        expected: { hasSchedule: true },
        actual: { hasSchedule: false, invoiceCount: contractInvoices.length },
        dimensions: { snapshotId, contractId },
        contractId,
        customerId: contract?.customer_id || undefined,
      });
    }

    return issues;
  },
};

// R024: Recognition Beyond Service Period
export const R024_RecognitionBeyondServicePeriod: Rule = {
  id: 'R024',
  version: '1.0.0',
  name: 'Recognition Beyond Service Period',
  description: 'Revenue recognized after service end date',
  category: 'revrec',
  tier: 'revrec',
  severity: 'critical',
  priority: 1,
  requiresData: ['schedules', 'obligations'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { schedules, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    for (const schedule of schedules) {
      const obligation = schedule.obligation;
      if (!obligation?.service_end_date) continue;

      if (schedule.period_end > obligation.service_end_date && schedule.recognized_amount > 0) {
        issues.push({
          ruleId: 'R024',
          ruleVersion: '1.0.0',
          category: 'revrec',
          severity: 'critical',
          confidence: 1.0,
          impactAmount: schedule.recognized_amount,
          currency: obligation.currency,
          expected: { 
            periodEnd: '<=', 
            serviceEnd: formatDateKey(obligation.service_end_date),
          },
          actual: { 
            periodEnd: formatDateKey(schedule.period_end),
            recognizedAmount: schedule.recognized_amount,
          },
          dimensions: { 
            snapshotId, 
            scheduleId: schedule.id,
            obligationId: schedule.obligation_id,
          },
          contractId: obligation.contract_id,
        });
      }
    }

    return issues;
  },
};

// R025: Premature Recognition
export const R025_PrematureRecognition: Rule = {
  id: 'R025',
  version: '1.0.0',
  name: 'Premature Recognition',
  description: 'Revenue recognized before service start or obligation met',
  category: 'revrec',
  tier: 'revrec',
  severity: 'critical',
  priority: 1,
  requiresData: ['schedules', 'obligations'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { schedules, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    for (const schedule of schedules) {
      const obligation = schedule.obligation;
      if (!obligation?.service_start_date) continue;

      if (schedule.period_start < obligation.service_start_date && schedule.recognized_amount > 0) {
        issues.push({
          ruleId: 'R025',
          ruleVersion: '1.0.0',
          category: 'revrec',
          severity: 'critical',
          confidence: 1.0,
          impactAmount: schedule.recognized_amount,
          currency: obligation.currency,
          expected: { 
            periodStart: '>=', 
            serviceStart: formatDateKey(obligation.service_start_date),
          },
          actual: { 
            periodStart: formatDateKey(schedule.period_start),
            recognizedAmount: schedule.recognized_amount,
          },
          dimensions: { 
            snapshotId, 
            scheduleId: schedule.id,
            obligationId: schedule.obligation_id,
          },
          contractId: obligation.contract_id,
        });
      }
    }

    return issues;
  },
};

// R026: Allocation Sum Mismatch
export const R026_AllocationSumMismatch: Rule = {
  id: 'R026',
  version: '1.0.0',
  name: 'Allocation Sum Mismatch',
  description: 'Sum of allocations does not equal transaction price',
  category: 'revrec',
  tier: 'revrec',
  severity: 'high',
  priority: 2,
  requiresData: ['obligations', 'contracts'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { obligations, contracts, config, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    // Group by contract
    const byContract = new Map<string, typeof obligations>();
    for (const obl of obligations) {
      const list = byContract.get(obl.contract_id) || [];
      list.push(obl);
      byContract.set(obl.contract_id, list);
    }

    for (const [contractId, contractObligations] of byContract) {
      const contract = contracts.find(c => c.id === contractId);
      if (!contract) continue;

      const totalAllocated = sum(contractObligations, o => o.transaction_price);
      
      // Compare with contract ARR (as proxy for TCV)
      const expectedTotal = contract.arr || 0;
      
      const comparison = compareWithTolerance(
        expectedTotal,
        totalAllocated,
        config.thresholds.amountVariancePct,
        config.thresholds.amountVarianceAbs
      );

      if (!comparison.matches && expectedTotal > 0) {
        issues.push({
          ruleId: 'R026',
          ruleVersion: '1.0.0',
          category: 'revrec',
          severity: 'high',
          confidence: 0.8,
          impactAmount: Math.abs(comparison.variance),
          currency: contract.currency,
          expected: { transactionPrice: expectedTotal },
          actual: { totalAllocated, obligationCount: contractObligations.length },
          dimensions: { snapshotId, contractId },
          contractId,
          customerId: contract.customer_id || undefined,
        });
      }
    }

    return issues;
  },
};

// R027: SSP Outlier
export const R027_SSPOutlier: Rule = {
  id: 'R027',
  version: '1.0.0',
  name: 'SSP Outlier',
  description: 'Standalone selling price is outside normal range',
  category: 'revrec',
  tier: 'revrec',
  severity: 'medium',
  priority: 3,
  requiresData: ['obligations'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { obligations, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    // Group by obligation type to find outliers
    const byType = new Map<string, typeof obligations>();
    for (const obl of obligations) {
      const list = byType.get(obl.obligation_type) || [];
      list.push(obl);
      byType.set(obl.obligation_type, list);
    }

    for (const [type, typeObligations] of byType) {
      const ssps = typeObligations
        .filter(o => o.standalone_selling_price !== null)
        .map(o => o.standalone_selling_price as number);

      if (ssps.length < 5) continue; // Need enough data

      const mean = sum(ssps.map(s => ({ s })), x => x.s) / ssps.length;
      const stdDev = Math.sqrt(
        ssps.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / ssps.length
      );

      for (const obl of typeObligations) {
        if (obl.standalone_selling_price === null) continue;

        const zScore = Math.abs((obl.standalone_selling_price - mean) / stdDev);
        
        if (zScore > 2.5) { // More than 2.5 standard deviations
          issues.push({
            ruleId: 'R027',
            ruleVersion: '1.0.0',
            category: 'revrec',
            severity: 'medium',
            confidence: 0.7,
            expected: { sspRange: `${(mean - 2 * stdDev).toFixed(2)} - ${(mean + 2 * stdDev).toFixed(2)}` },
            actual: { ssp: obl.standalone_selling_price, zScore: zScore.toFixed(2) },
            dimensions: { 
              snapshotId, 
              obligationId: obl.id,
              obligationType: type,
            },
            contractId: obl.contract_id,
            metadata: { mean, stdDev },
          });
        }
      }
    }

    return issues;
  },
};

// Export all revrec rules
export const revrecRules: Rule[] = [
  R020_RecognizedVsInvoicedGap,
  R021_DeferredBalanceImbalance,
  R022_ScheduleExceedsContractValue,
  R023_MissingRecognitionSchedule,
  R024_RecognitionBeyondServicePeriod,
  R025_PrematureRecognition,
  R026_AllocationSumMismatch,
  R027_SSPOutlier,
];
