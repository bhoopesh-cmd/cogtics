/**
 * Tier 4: Credits and Refunds Rules
 * R110-R113 - Credit memo and refund validation
 */
import type { Rule, RuleContext, RuleIssue } from '../../types.js';
import { sum, groupBy, formatDateKey } from '../../utils.js';

// R110: Unmatched Credit Memo
export const R110_UnmatchedCreditMemo: Rule = {
  id: 'R110',
  version: '1.0.0',
  name: 'Unmatched Credit Memo',
  description: 'Credit memo issued without matching original invoice',
  category: 'credits',
  tier: 'credits',
  severity: 'medium',
  priority: 1,
  requiresData: ['invoices'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { invoices, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    // Identify credits (negative totals)
    const credits = invoices.filter(i => i.total < 0);
    const regularInvoices = invoices.filter(i => i.total >= 0);

    for (const credit of credits) {
      // Try to match by contract + customer
      const matchingInvoices = regularInvoices.filter(inv =>
        inv.contract_id === credit.contract_id &&
        inv.customer_id === credit.customer_id &&
        inv.invoice_date <= credit.invoice_date
      );

      if (matchingInvoices.length === 0) {
        issues.push({
          ruleId: 'R110',
          ruleVersion: '1.0.0',
          category: 'credits',
          severity: 'medium',
          confidence: 0.85,
          impactAmount: Math.abs(credit.total),
          currency: credit.currency,
          expected: { hasMatchingInvoice: true },
          actual: { hasMatchingInvoice: false },
          dimensions: {
            snapshotId,
            invoiceId: credit.id,
          },
          invoiceId: credit.id,
          contractId: credit.contract_id || undefined,
          customerId: credit.customer_id || undefined,
          sources: [{
            sourceType: 'invoice',
            sourceId: credit.id,
            sourceSystem: credit.source_system,
          }],
        });
      }
    }

    return issues;
  },
};

// R111: Credit Exceeds Invoice
export const R111_CreditExceedsInvoice: Rule = {
  id: 'R111',
  version: '1.0.0',
  name: 'Credit Exceeds Invoice',
  description: 'Credit amount exceeds the original invoice amount',
  category: 'credits',
  tier: 'credits',
  severity: 'high',
  priority: 1,
  requiresData: ['invoices'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { invoices, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    // Group by contract + customer
    const grouped = groupBy(invoices, i => `${i.contract_id || 'none'}_${i.customer_id || 'none'}`);

    for (const [key, group] of grouped) {
      if (key.startsWith('none_')) continue;

      const credits = group.filter(i => i.total < 0);
      const regular = group.filter(i => i.total >= 0);

      const totalCredits = Math.abs(sum(credits, i => i.total));
      const totalInvoiced = sum(regular, i => i.total);

      if (totalCredits > totalInvoiced && totalInvoiced > 0) {
        const excess = totalCredits - totalInvoiced;
        const [contractId, customerId] = key.split('_');

        issues.push({
          ruleId: 'R111',
          ruleVersion: '1.0.0',
          category: 'credits',
          severity: 'high',
          confidence: 0.9,
          impactAmount: excess,
          currency: group[0].currency,
          expected: { maxCredits: totalInvoiced },
          actual: { totalCredits },
          dimensions: {
            snapshotId,
            contractId: contractId !== 'none' ? contractId : undefined,
            customerId: customerId !== 'none' ? customerId : undefined,
          },
          contractId: contractId !== 'none' ? contractId : undefined,
          customerId: customerId !== 'none' ? customerId : undefined,
          metadata: {
            creditCount: credits.length,
            invoiceCount: regular.length,
          },
        });
      }
    }

    return issues;
  },
};

// R112: Refund/Chargeback Unreconciled
export const R112_RefundChargebackUnreconciled: Rule = {
  id: 'R112',
  version: '1.0.0',
  name: 'Refund/Chargeback Unreconciled',
  description: 'Payment refund without corresponding credit memo',
  category: 'credits',
  tier: 'credits',
  severity: 'high',
  priority: 2,
  requiresData: ['payments', 'invoices'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { payments, invoices, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    // Find refunded payments
    const refunds = payments.filter(p => 
      p.status === 'refunded' || p.status === 'partially_refunded'
    );

    for (const refund of refunds) {
      // Look for corresponding credit memo
      const matchingCredits = invoices.filter(inv =>
        inv.total < 0 &&
        inv.customer_id === refund.customer_id &&
        Math.abs(inv.total) === refund.amount
      );

      if (matchingCredits.length === 0) {
        issues.push({
          ruleId: 'R112',
          ruleVersion: '1.0.0',
          category: 'credits',
          severity: 'high',
          confidence: 0.8,
          impactAmount: refund.amount,
          currency: refund.currency,
          expected: { hasCreditMemo: true },
          actual: { hasCreditMemo: false, paymentStatus: refund.status },
          dimensions: {
            snapshotId,
            paymentId: refund.id,
          },
          customerId: refund.customer_id || undefined,
          sources: [{
            sourceType: 'payment',
            sourceId: refund.id,
            sourceSystem: refund.source_system,
          }],
        });
      }
    }

    return issues;
  },
};

// R113: Net Revenue Negative
export const R113_NetRevenueNegative: Rule = {
  id: 'R113',
  version: '1.0.0',
  name: 'Net Revenue Negative',
  description: 'Net invoice total minus credits is negative for period',
  category: 'credits',
  tier: 'credits',
  severity: 'high',
  priority: 2,
  requiresData: ['invoices', 'contracts'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { invoices, contracts, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    // Group by contract
    const grouped = groupBy(invoices, i => i.contract_id || 'none');

    for (const [contractId, contractInvoices] of grouped) {
      if (contractId === 'none') continue;

      const netRevenue = sum(contractInvoices, i => i.total);

      if (netRevenue < 0) {
        const contract = contracts.find(c => c.id === contractId);
        
        issues.push({
          ruleId: 'R113',
          ruleVersion: '1.0.0',
          category: 'credits',
          severity: 'high',
          confidence: 1.0,
          impactAmount: Math.abs(netRevenue),
          currency: contract?.currency || 'USD',
          expected: { netRevenue: '>= 0' },
          actual: { netRevenue },
          dimensions: { snapshotId, contractId },
          contractId,
          customerId: contract?.customer_id || undefined,
          metadata: {
            invoiceCount: contractInvoices.length,
            totalCredits: Math.abs(sum(contractInvoices.filter(i => i.total < 0), i => i.total)),
            totalInvoiced: sum(contractInvoices.filter(i => i.total >= 0), i => i.total),
          },
        });
      }
    }

    return issues;
  },
};

// Export all credits rules
export const creditsRules: Rule[] = [
  R110_UnmatchedCreditMemo,
  R111_CreditExceedsInvoice,
  R112_RefundChargebackUnreconciled,
  R113_NetRevenueNegative,
];
