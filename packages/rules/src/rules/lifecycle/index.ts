/**
 * Tier 6: Contract Lifecycle Rules
 * R060-R064, R160-R161 - Contract status and billing alignment
 */
import type { Rule, RuleContext, RuleIssue } from '../../types.js';
import { formatDateKey, groupBy, isContractActive } from '../../utils.js';
import { addDays } from 'date-fns';

// R060: Amended Contract No Adjustment
export const R060_AmendedContractNoAdjustment: Rule = {
  id: 'R060',
  version: '1.0.0',
  name: 'Amended Contract No Adjustment',
  description: 'Contract was amended but billing was not adjusted',
  category: 'lifecycle',
  tier: 'lifecycle',
  severity: 'high',
  priority: 1,
  requiresData: ['contracts', 'invoices'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    for (const contract of contracts) {
      if (contract.status !== ('amended' as string) && contract.status !== 'active') continue;

      // Look for amendment terms
      const amendments = contract.terms.filter(t => t.term_type === 'amendment');
      if (amendments.length === 0) continue;

      for (const amendment of amendments) {
        const value = amendment.value_json as Record<string, unknown>;
        const effectiveDate = value.effectiveDate 
          ? new Date(value.effectiveDate as string) 
          : null;
        
        if (!effectiveDate) continue;

        // Find invoices after amendment date
        const postAmendmentInvoices = invoices.filter(i =>
          i.contract_id === contract.id &&
          i.invoice_date >= effectiveDate
        );

        // Check if amounts changed
        const preAmendmentInvoices = invoices.filter(i =>
          i.contract_id === contract.id &&
          i.invoice_date < effectiveDate
        );

        if (postAmendmentInvoices.length > 0 && preAmendmentInvoices.length > 0) {
          const avgPre = preAmendmentInvoices.reduce((s, i) => s + i.total, 0) / preAmendmentInvoices.length;
          const avgPost = postAmendmentInvoices.reduce((s, i) => s + i.total, 0) / postAmendmentInvoices.length;

          // If amounts are the same, amendment may not have been applied
          if (Math.abs(avgPre - avgPost) < 1) {
            issues.push({
              ruleId: 'R060',
              ruleVersion: '1.0.0',
              category: 'lifecycle',
              severity: 'high',
              confidence: 0.7,
              expected: { billingChanged: true, amendmentDate: formatDateKey(effectiveDate) },
              actual: { billingChanged: false, avgPreAmount: avgPre, avgPostAmount: avgPost },
              dimensions: {
                snapshotId,
                contractId: contract.id,
                amendmentDate: formatDateKey(effectiveDate),
              },
              contractId: contract.id,
              customerId: contract.customer_id || undefined,
            });
          }
        }
      }
    }

    return issues;
  },
};

// R061: Cancelled Contract Still Billing
export const R061_CancelledContractStillBilling: Rule = {
  id: 'R061',
  version: '1.0.0',
  name: 'Cancelled Contract Still Billing',
  description: 'Invoices issued for cancelled contract',
  category: 'lifecycle',
  tier: 'lifecycle',
  severity: 'critical',
  priority: 1,
  requiresData: ['contracts', 'invoices'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    const cancelledContracts = contracts.filter(c => c.status === 'cancelled');

    for (const contract of cancelledContracts) {
      // Get cancellation date from terms or metadata
      const cancelTerms = contract.terms.filter(t => t.term_type === 'cancellation');
      let cancelDate = contract.end_date;
      
      if (cancelTerms.length > 0) {
        const value = cancelTerms[0].value_json as Record<string, unknown>;
        if (value.effectiveDate) {
          cancelDate = new Date(value.effectiveDate as string);
        }
      }

      // Find invoices after cancellation
      const postCancelInvoices = invoices.filter(i =>
        i.contract_id === contract.id &&
        cancelDate &&
        i.invoice_date > cancelDate
      );

      for (const invoice of postCancelInvoices) {
        issues.push({
          ruleId: 'R061',
          ruleVersion: '1.0.0',
          category: 'lifecycle',
          severity: 'critical',
          confidence: 1.0,
          impactAmount: invoice.total,
          currency: invoice.currency,
          expected: { 
            noInvoicesAfter: cancelDate ? formatDateKey(cancelDate) : 'cancellation',
          },
          actual: { 
            invoiceDate: formatDateKey(invoice.invoice_date),
            contractStatus: 'cancelled',
          },
          dimensions: {
            snapshotId,
            contractId: contract.id,
            invoiceId: invoice.id,
          },
          contractId: contract.id,
          invoiceId: invoice.id,
          customerId: contract.customer_id || undefined,
          sources: [
            { sourceType: 'contract', sourceId: contract.id, fieldName: 'status' },
            { sourceType: 'invoice', sourceId: invoice.id },
          ],
        });
      }
    }

    return issues;
  },
};

// R062: Expired Contract Active Billing
export const R062_ExpiredContractActiveBilling: Rule = {
  id: 'R062',
  version: '1.0.0',
  name: 'Expired Contract Active Billing',
  description: 'Contract past end date with no renewal but still billing',
  category: 'lifecycle',
  tier: 'lifecycle',
  severity: 'critical',
  priority: 1,
  suppressedBy: ['R061'],
  requiresData: ['contracts', 'invoices'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, config, snapshotId, snapshotDate } = ctx;
    const issues: RuleIssue[] = [];

    for (const contract of contracts) {
      // Skip if cancelled (R061 handles that)
      if (contract.status === 'cancelled') continue;
      
      // Skip if renewed
      if (contract.status === 'renewed') continue;
      
      // Skip if auto-renew
      if (contract.auto_renew) continue;

      // Check if past end date
      if (!contract.end_date || contract.end_date >= snapshotDate) continue;

      // Add grace period
      const gracePeriodEnd = addDays(contract.end_date, config.autoRenewal.renewalGraceDays);
      
      // Find invoices after end + grace
      const postExpireInvoices = invoices.filter(i =>
        i.contract_id === contract.id &&
        i.invoice_date > gracePeriodEnd
      );

      for (const invoice of postExpireInvoices) {
        issues.push({
          ruleId: 'R062',
          ruleVersion: '1.0.0',
          category: 'lifecycle',
          severity: 'critical',
          confidence: 0.9,
          impactAmount: invoice.total,
          currency: invoice.currency,
          expected: { 
            noInvoicesAfter: formatDateKey(gracePeriodEnd),
            contractEndDate: formatDateKey(contract.end_date),
          },
          actual: { 
            invoiceDate: formatDateKey(invoice.invoice_date),
            contractStatus: contract.status,
          },
          dimensions: {
            snapshotId,
            contractId: contract.id,
            invoiceId: invoice.id,
          },
          contractId: contract.id,
          invoiceId: invoice.id,
          customerId: contract.customer_id || undefined,
        });
      }
    }

    return issues;
  },
};

// R063: Contract Version Gap
export const R063_ContractVersionGap: Rule = {
  id: 'R063',
  version: '1.0.0',
  name: 'Contract Version Gap',
  description: 'Missing amendment version in contract history',
  category: 'lifecycle',
  tier: 'lifecycle',
  severity: 'medium',
  priority: 2,
  requiresData: ['contracts'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    for (const contract of contracts) {
      const versionTerms = contract.terms.filter(t => t.term_type === 'version');
      if (versionTerms.length < 2) continue;

      // Sort by version number
      const versions = versionTerms
        .map(t => {
          const value = t.value_json as Record<string, unknown>;
          return (value.version as number) || 0;
        })
        .sort((a, b) => a - b);

      // Check for gaps
      for (let i = 1; i < versions.length; i++) {
        if (versions[i] - versions[i - 1] > 1) {
          issues.push({
            ruleId: 'R063',
            ruleVersion: '1.0.0',
            category: 'lifecycle',
            severity: 'medium',
            confidence: 0.95,
            expected: { consecutiveVersions: true },
            actual: { 
              missingBetween: [versions[i - 1], versions[i]],
              gap: versions[i] - versions[i - 1] - 1,
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

// R064: Auto-Renewal Not Reflected
export const R064_AutoRenewalNotReflected: Rule = {
  id: 'R064',
  version: '1.0.0',
  name: 'Auto-Renewal Not Reflected',
  description: 'Contract marked for auto-renewal but no new term reflected',
  category: 'lifecycle',
  tier: 'lifecycle',
  severity: 'medium',
  priority: 2,
  requiresData: ['contracts'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, config, snapshotId, snapshotDate } = ctx;
    const issues: RuleIssue[] = [];

    for (const contract of contracts) {
      if (!contract.auto_renew) continue;
      if (!contract.end_date) continue;

      // Check if past end date + grace period
      const gracePeriodEnd = addDays(contract.end_date, config.autoRenewal.renewalGraceDays);
      
      if (snapshotDate > gracePeriodEnd && contract.status !== 'renewed') {
        issues.push({
          ruleId: 'R064',
          ruleVersion: '1.0.0',
          category: 'lifecycle',
          severity: 'medium',
          confidence: 0.75,
          expected: { 
            status: 'renewed',
            byDate: formatDateKey(gracePeriodEnd),
          },
          actual: { 
            status: contract.status,
            endDate: formatDateKey(contract.end_date),
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

    return issues;
  },
};

// R160: Contract Paused/Billing Active
export const R160_ContractPausedBillingActive: Rule = {
  id: 'R160',
  version: '1.0.0',
  name: 'Contract Paused/Billing Active',
  description: 'Contract has billing hold but invoices still being issued',
  category: 'lifecycle',
  tier: 'lifecycle',
  severity: 'high',
  priority: 1,
  requiresData: ['contracts', 'invoices'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    for (const contract of contracts) {
      const metadata = contract.metadata_json as Record<string, unknown> | null;
      if (!metadata?.billingHold) continue;

      const holdStartDate = metadata.billingHoldStartDate 
        ? new Date(metadata.billingHoldStartDate as string)
        : null;

      const postHoldInvoices = invoices.filter(i =>
        i.contract_id === contract.id &&
        (!holdStartDate || i.invoice_date >= holdStartDate)
      );

      for (const invoice of postHoldInvoices) {
        issues.push({
          ruleId: 'R160',
          ruleVersion: '1.0.0',
          category: 'lifecycle',
          severity: 'high',
          confidence: 0.95,
          impactAmount: invoice.total,
          currency: invoice.currency,
          expected: { noBillingDuringHold: true },
          actual: { 
            invoiceIssued: true,
            billingHold: true,
          },
          dimensions: {
            snapshotId,
            contractId: contract.id,
            invoiceId: invoice.id,
          },
          contractId: contract.id,
          invoiceId: invoice.id,
          customerId: contract.customer_id || undefined,
        });
      }
    }

    return issues;
  },
};

// R161: Payment Hold Mismatch
export const R161_PaymentHoldMismatch: Rule = {
  id: 'R161',
  version: '1.0.0',
  name: 'Payment Hold Mismatch',
  description: 'Payment status does not match payment hold setting',
  category: 'lifecycle',
  tier: 'lifecycle',
  severity: 'medium',
  priority: 2,
  requiresData: ['contracts', 'invoices', 'payments'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, payments, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    for (const contract of contracts) {
      const metadata = contract.metadata_json as Record<string, unknown> | null;
      if (!metadata?.paymentHold) continue;

      const contractInvoices = invoices.filter(i => i.contract_id === contract.id);
      const invoiceIds = new Set(contractInvoices.map(i => i.id));

      // Find payments for these invoices
      const contractPayments = payments.filter(p => 
        p.invoice_id && invoiceIds.has(p.invoice_id) &&
        p.status === 'succeeded'
      );

      if (contractPayments.length > 0) {
        issues.push({
          ruleId: 'R161',
          ruleVersion: '1.0.0',
          category: 'lifecycle',
          severity: 'medium',
          confidence: 0.8,
          expected: { noPaymentsDuringHold: true },
          actual: { 
            paymentsReceived: contractPayments.length,
            paymentHold: true,
          },
          dimensions: {
            snapshotId,
            contractId: contract.id,
          },
          contractId: contract.id,
          customerId: contract.customer_id || undefined,
          metadata: { paymentIds: contractPayments.map(p => p.id) },
        });
      }
    }

    return issues;
  },
};

// Export all lifecycle rules
export const lifecycleRules: Rule[] = [
  R060_AmendedContractNoAdjustment,
  R061_CancelledContractStillBilling,
  R062_ExpiredContractActiveBilling,
  R063_ContractVersionGap,
  R064_AutoRenewalNotReflected,
  R160_ContractPausedBillingActive,
  R161_PaymentHoldMismatch,
];
