/**
 * Tier 5: Usage-Based Billing Rules
 * R150-R154 - Usage data integrity and billing accuracy
 */
import type { Rule, RuleContext, RuleIssue } from '../../types.js';
import { groupBy, sum, formatDateKey, toDate, isDateInRange } from '../../utils.js';

// R150: Missing Usage Period
export const R150_MissingUsagePeriod: Rule = {
  id: 'R150',
  version: '1.0.0',
  name: 'Missing Usage Period',
  description: 'No usage data for expected billing period',
  category: 'usage',
  tier: 'usage',
  severity: 'high',
  priority: 1,
  requiresData: ['contracts', 'usage_events'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, usageEvents, snapshotId, snapshotDate } = ctx;
    const issues: RuleIssue[] = [];

    // Find usage-based contracts
    const usageContracts = contracts.filter(c => 
      c.billing_frequency === 'usage_based' ||
      c.terms.some(t => t.term_type === 'usage' || t.term_type === 'metered')
    );

    for (const contract of usageContracts) {
      if (!contract.start_date) continue;

      // Get usage for this contract
      const contractUsage = usageEvents.filter(u => u.contract_id === contract.id);
      
      // Check if we have usage for the current month
      const currentMonthStart = new Date(snapshotDate.getFullYear(), snapshotDate.getMonth(), 1);
      const hasCurrentMonthUsage = contractUsage.some(u => 
        u.event_time >= currentMonthStart
      );

      if (!hasCurrentMonthUsage && contract.status === 'active') {
        issues.push({
          ruleId: 'R150',
          ruleVersion: '1.0.0',
          category: 'usage',
          severity: 'high',
          confidence: 0.85,
          expected: { hasUsageData: true, period: formatDateKey(currentMonthStart) },
          actual: { hasUsageData: false },
          dimensions: {
            snapshotId,
            contractId: contract.id,
            periodStart: formatDateKey(currentMonthStart),
          },
          contractId: contract.id,
          customerId: contract.customer_id || undefined,
          dataQualityFlags: ['missing_usage'],
        });
      }
    }

    return issues;
  },
};

// R151: Late Usage Events
export const R151_LateUsageEvents: Rule = {
  id: 'R151',
  version: '1.0.0',
  name: 'Late Usage Events',
  description: 'Usage events received after billing cutoff',
  category: 'usage',
  tier: 'usage',
  severity: 'medium',
  priority: 2,
  requiresData: ['usage_events', 'invoices'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { usageEvents, invoices, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    // Group invoices by contract and period
    const invoicesByContractPeriod = new Map<string, Date>();
    for (const inv of invoices) {
      if (inv.contract_id && inv.period_end) {
        invoicesByContractPeriod.set(
          `${inv.contract_id}_${formatDateKey(inv.period_end)}`,
          inv.invoice_date
        );
      }
    }

    // Check for usage events that came after billing
    for (const usage of usageEvents) {
      if (!usage.contract_id) continue;

      // Find if there's an invoice for this period
      const periodKey = `${usage.contract_id}_${formatDateKey(usage.event_time)}`;
      
      // Look for invoices where the event would be in the period
      for (const [key, invoiceDate] of invoicesByContractPeriod) {
        if (!key.startsWith(usage.contract_id)) continue;

        // If usage event was recorded after invoice date, it's late
        if (usage.created_at > invoiceDate) {
          issues.push({
            ruleId: 'R151',
            ruleVersion: '1.0.0',
            category: 'usage',
            severity: 'medium',
            confidence: 0.9,
            expected: { 
              usageRecordedBefore: formatDateKey(invoiceDate),
            },
            actual: { 
              usageRecordedAt: formatDateKey(usage.created_at),
              eventTime: formatDateKey(usage.event_time),
            },
            dimensions: {
              snapshotId,
              contractId: usage.contract_id,
              usageEventId: usage.id,
            },
            contractId: usage.contract_id,
            customerId: usage.customer_id || undefined,
            sources: [{
              sourceType: 'usage_event',
              sourceId: usage.id,
              sourceSystem: usage.source_system,
            }],
          });
          break;
        }
      }
    }

    return issues;
  },
};

// R152: Usage Exceeds Cap
export const R152_UsageExceedsCap: Rule = {
  id: 'R152',
  version: '1.0.0',
  name: 'Usage Exceeds Cap',
  description: 'Usage exceeds contracted cap without overage handling',
  category: 'usage',
  tier: 'usage',
  severity: 'medium',
  priority: 2,
  requiresData: ['contracts', 'usage_events', 'invoices'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, usageEvents, invoices, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    for (const contract of contracts) {
      // Find cap terms
      const capTerms = contract.terms.filter(t => 
        t.term_type === 'usage_cap' || t.term_type === 'included_units'
      );
      if (capTerms.length === 0) continue;

      const capValue = capTerms[0].value_json as Record<string, unknown>;
      const cap = (capValue.cap as number) || (capValue.units as number) || 0;
      if (cap === 0) continue;

      // Sum usage for this contract
      const contractUsage = usageEvents.filter(u => u.contract_id === contract.id);
      const totalUsage = sum(contractUsage, u => u.quantity);

      if (totalUsage > cap) {
        // Check if overage was billed
        const contractInvoices = invoices.filter(i => i.contract_id === contract.id);
        const hasOverageLine = contractInvoices.some(inv =>
          inv.lines.some(l => 
            (l.description || '').toLowerCase().includes('overage')
          )
        );

        if (!hasOverageLine) {
          issues.push({
            ruleId: 'R152',
            ruleVersion: '1.0.0',
            category: 'usage',
            severity: 'medium',
            confidence: 0.8,
            expected: { maxUsage: cap },
            actual: { totalUsage, overage: totalUsage - cap },
            dimensions: {
              snapshotId,
              contractId: contract.id,
            },
            contractId: contract.id,
            customerId: contract.customer_id || undefined,
            metadata: { usageEventCount: contractUsage.length },
          });
        }
      }
    }

    return issues;
  },
};

// R153: Usage Outside Contract Term
export const R153_UsageOutsideContractTerm: Rule = {
  id: 'R153',
  version: '1.0.0',
  name: 'Usage Outside Contract Term',
  description: 'Usage events recorded outside contract start/end dates',
  category: 'usage',
  tier: 'usage',
  severity: 'high',
  priority: 1,
  requiresData: ['contracts', 'usage_events'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, usageEvents, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    for (const usage of usageEvents) {
      if (!usage.contract_id) continue;

      const contract = contracts.find(c => c.id === usage.contract_id);
      if (!contract) continue;

      const isOutside = 
        (contract.start_date && usage.event_time < contract.start_date) ||
        (contract.end_date && usage.event_time > contract.end_date);

      if (isOutside) {
        issues.push({
          ruleId: 'R153',
          ruleVersion: '1.0.0',
          category: 'usage',
          severity: 'high',
          confidence: 1.0,
          expected: {
            contractStart: contract.start_date ? formatDateKey(contract.start_date) : null,
            contractEnd: contract.end_date ? formatDateKey(contract.end_date) : null,
          },
          actual: { eventTime: formatDateKey(usage.event_time) },
          dimensions: {
            snapshotId,
            contractId: contract.id,
            usageEventId: usage.id,
          },
          contractId: contract.id,
          customerId: usage.customer_id || undefined,
          sources: [{
            sourceType: 'usage_event',
            sourceId: usage.id,
            sourceSystem: usage.source_system,
          }],
        });
      }
    }

    return issues;
  },
};

// R154: Usage Rate Mismatch
export const R154_UsageRateMismatch: Rule = {
  id: 'R154',
  version: '1.0.0',
  name: 'Usage Rate Mismatch',
  description: 'Billed usage rate does not match contracted rate',
  category: 'usage',
  tier: 'usage',
  severity: 'high',
  priority: 2,
  requiresData: ['contracts', 'invoices', 'contract_terms'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, config, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    for (const contract of contracts) {
      const rateTerms = contract.terms.filter(t => 
        t.term_type === 'usage_rate' || t.term_type === 'per_unit_price'
      );
      if (rateTerms.length === 0) continue;

      const rateValue = rateTerms[0].value_json as Record<string, unknown>;
      const expectedRate = (rateValue.rate as number) || (rateValue.price as number) || 0;
      if (expectedRate === 0) continue;

      const contractInvoices = invoices.filter(i => i.contract_id === contract.id);

      for (const invoice of contractInvoices) {
        // Find usage lines
        const usageLines = invoice.lines.filter(l =>
          (l.description || '').toLowerCase().includes('usage') ||
          (l.description || '').toLowerCase().includes('metered')
        );

        for (const line of usageLines) {
          if (!line.unit_price || line.quantity === 0) continue;

          const actualRate = line.unit_price;
          const variance = Math.abs(actualRate - expectedRate);
          const toleranceAbs = config.thresholds.amountVarianceAbs / 100;

          if (variance > toleranceAbs) {
            issues.push({
              ruleId: 'R154',
              ruleVersion: '1.0.0',
              category: 'usage',
              severity: 'high',
              confidence: 0.9,
              impactAmount: variance * line.quantity,
              currency: invoice.currency,
              expected: { rate: expectedRate },
              actual: { rate: actualRate },
              dimensions: {
                snapshotId,
                contractId: contract.id,
                invoiceId: invoice.id,
                lineItemId: line.id,
              },
              contractId: contract.id,
              invoiceId: invoice.id,
              customerId: contract.customer_id || undefined,
              sources: [{
                sourceType: 'invoice_line',
                sourceId: line.id,
                fieldName: 'unit_price',
              }],
            });
          }
        }
      }
    }

    return issues;
  },
};

// Export all usage rules
export const usageRules: Rule[] = [
  R150_MissingUsagePeriod,
  R151_LateUsageEvents,
  R152_UsageExceedsCap,
  R153_UsageOutsideContractTerm,
  R154_UsageRateMismatch,
];
