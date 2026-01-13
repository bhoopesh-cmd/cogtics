/**
 * Tier 1: Billing vs Contract Rules
 * R001-R010 - Core billing discrepancy detection
 */
import type { Rule, RuleContext, RuleIssue, ContractWithTerms, InvoiceWithLines } from '../../types.js';
import { 
  isContractActive, 
  isInvoiceWithinTerm, 
  compareWithTolerance, 
  groupBy, 
  sum, 
  formatDateKey,
  toDate,
} from '../../utils.js';
import { addMonths, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';

// R001: Missing Invoice
export const R001_MissingInvoice: Rule = {
  id: 'R001',
  version: '1.0.0',
  name: 'Missing Invoice',
  description: 'Contract is active but no invoice found for expected billing period',
  category: 'billing',
  tier: 'billing',
  severity: 'high',
  priority: 1,
  requiresData: ['contracts', 'invoices'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, config, snapshotId, snapshotDate } = ctx;
    const issues: RuleIssue[] = [];

    for (const contract of contracts) {
      // Skip zero-value contracts if configured
      if (config.zeroValue.skipBillingRules && (contract.arr === 0 || contract.arr === null)) {
        continue;
      }

      // Skip if contract not active
      if (!isContractActive(contract, snapshotDate)) {
        continue;
      }

      // Check for billing hold in metadata
      const metadata = contract.metadata_json as Record<string, unknown> | null;
      if (metadata?.billingHold === true) {
        continue;
      }

      // Find invoices for this contract
      const contractInvoices = invoices.filter(i => i.contract_id === contract.id);
      
      // Determine expected billing periods based on frequency
      const expectedPeriods = getExpectedBillingPeriods(contract, snapshotDate);
      
      for (const period of expectedPeriods) {
        const periodInvoices = contractInvoices.filter(inv => {
          const invDate = inv.invoice_date;
          return invDate >= period.start && invDate <= period.end;
        });

        if (periodInvoices.length === 0) {
          const expectedAmount = calculateExpectedAmount(contract, period);
          
          issues.push({
            ruleId: 'R001',
            ruleVersion: '1.0.0',
            category: 'billing',
            severity: 'high',
            confidence: 1.0,
            impactAmount: expectedAmount,
            currency: contract.currency,
            expected: { 
              invoiceCount: 1, 
              amount: expectedAmount,
              periodStart: formatDateKey(period.start),
              periodEnd: formatDateKey(period.end),
            },
            actual: { invoiceCount: 0, amount: 0 },
            dimensions: {
              snapshotId,
              contractId: contract.id,
              periodStart: formatDateKey(period.start),
              periodEnd: formatDateKey(period.end),
            },
            contractId: contract.id,
            customerId: contract.customer_id || undefined,
            sources: [{
              sourceType: 'contract',
              sourceId: contract.id,
              sourceSystem: contract.source_system,
            }],
          });
        }
      }
    }

    return issues;
  },
};

// R002: Underbilling
export const R002_Underbilling: Rule = {
  id: 'R002',
  version: '1.0.0',
  name: 'Underbilling',
  description: 'Invoice amount is less than expected based on contract terms',
  category: 'billing',
  tier: 'billing',
  severity: 'high',
  priority: 2,
  suppressedBy: ['R004', 'R005'],
  requiresData: ['contracts', 'invoices'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, config, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    for (const contract of contracts) {
      if (contract.arr === null || contract.arr === 0) continue;

      const contractInvoices = invoices.filter(i => i.contract_id === contract.id);
      
      for (const invoice of contractInvoices) {
        const expectedAmount = calculateInvoiceExpected(contract, invoice);
        const comparison = compareWithTolerance(
          expectedAmount,
          invoice.total,
          config.thresholds.amountVariancePct,
          config.thresholds.amountVarianceAbs
        );

        if (!comparison.matches && comparison.variance < 0) {
          issues.push({
            ruleId: 'R002',
            ruleVersion: '1.0.0',
            category: 'billing',
            severity: 'high',
            confidence: 0.9,
            impactAmount: Math.abs(comparison.variance),
            currency: invoice.currency,
            expected: { amount: expectedAmount },
            actual: { amount: invoice.total },
            dimensions: {
              snapshotId,
              contractId: contract.id,
              invoiceId: invoice.id,
            },
            contractId: contract.id,
            invoiceId: invoice.id,
            customerId: contract.customer_id || undefined,
            sources: [
              { sourceType: 'contract', sourceId: contract.id, sourceSystem: contract.source_system },
              { sourceType: 'invoice', sourceId: invoice.id, sourceSystem: invoice.source_system },
            ],
            metadata: { variancePct: comparison.variancePct },
          });
        }
      }
    }

    return issues;
  },
};

// R003: Overbilling
export const R003_Overbilling: Rule = {
  id: 'R003',
  version: '1.0.0',
  name: 'Overbilling',
  description: 'Invoice amount exceeds expected based on contract terms',
  category: 'billing',
  tier: 'billing',
  severity: 'high',
  priority: 2,
  suppressedBy: ['R004', 'R005'],
  requiresData: ['contracts', 'invoices'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, config, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    for (const contract of contracts) {
      if (contract.arr === null || contract.arr === 0) continue;

      const contractInvoices = invoices.filter(i => i.contract_id === contract.id);
      
      for (const invoice of contractInvoices) {
        const expectedAmount = calculateInvoiceExpected(contract, invoice);
        const comparison = compareWithTolerance(
          expectedAmount,
          invoice.total,
          config.thresholds.amountVariancePct,
          config.thresholds.amountVarianceAbs
        );

        if (!comparison.matches && comparison.variance > 0) {
          issues.push({
            ruleId: 'R003',
            ruleVersion: '1.0.0',
            category: 'billing',
            severity: 'high',
            confidence: 0.9,
            impactAmount: comparison.variance,
            currency: invoice.currency,
            expected: { amount: expectedAmount },
            actual: { amount: invoice.total },
            dimensions: {
              snapshotId,
              contractId: contract.id,
              invoiceId: invoice.id,
            },
            contractId: contract.id,
            invoiceId: invoice.id,
            customerId: contract.customer_id || undefined,
            sources: [
              { sourceType: 'contract', sourceId: contract.id, sourceSystem: contract.source_system },
              { sourceType: 'invoice', sourceId: invoice.id, sourceSystem: invoice.source_system },
            ],
            metadata: { variancePct: comparison.variancePct },
          });
        }
      }
    }

    return issues;
  },
};

// R004: Wrong Unit Price
export const R004_WrongUnitPrice: Rule = {
  id: 'R004',
  version: '1.0.0',
  name: 'Wrong Unit Price',
  description: 'Invoice line item unit price does not match contracted price',
  category: 'billing',
  tier: 'billing',
  severity: 'high',
  priority: 3,
  requiresData: ['contracts', 'invoices', 'contract_terms'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, config, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    for (const contract of contracts) {
      const contractInvoices = invoices.filter(i => i.contract_id === contract.id);
      const pricingTerms = contract.terms.filter(t => 
        t.term_type === 'unit_price' || t.term_type === 'pricing_model'
      );

      for (const invoice of contractInvoices) {
        for (const line of invoice.lines) {
          const expectedPrice = findExpectedPrice(pricingTerms, line.product_id);
          if (expectedPrice === null || line.unit_price === null) continue;

          const comparison = compareWithTolerance(
            expectedPrice,
            line.unit_price,
            config.thresholds.amountVariancePct,
            config.thresholds.amountVarianceAbs / 10 // Tighter for unit price
          );

          if (!comparison.matches) {
            issues.push({
              ruleId: 'R004',
              ruleVersion: '1.0.0',
              category: 'billing',
              severity: 'high',
              confidence: 0.95,
              impactAmount: comparison.variance * line.quantity,
              currency: invoice.currency,
              expected: { unitPrice: expectedPrice },
              actual: { unitPrice: line.unit_price },
              dimensions: {
                snapshotId,
                contractId: contract.id,
                invoiceId: invoice.id,
                lineItemId: line.id,
              },
              contractId: contract.id,
              invoiceId: invoice.id,
              customerId: contract.customer_id || undefined,
              sources: [
                { sourceType: 'invoice_line', sourceId: line.id, fieldName: 'unit_price' },
              ],
            });
          }
        }
      }
    }

    return issues;
  },
};

// R005: Wrong Quantity
export const R005_WrongQuantity: Rule = {
  id: 'R005',
  version: '1.0.0',
  name: 'Wrong Quantity',
  description: 'Invoice line item quantity does not match expected',
  category: 'billing',
  tier: 'billing',
  severity: 'high',
  priority: 3,
  requiresData: ['contracts', 'invoices', 'contract_terms'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, config, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    for (const contract of contracts) {
      const contractInvoices = invoices.filter(i => i.contract_id === contract.id);
      const quantityTerms = contract.terms.filter(t => 
        t.term_type === 'quantity' || t.term_type === 'seats' || t.term_type === 'licenses'
      );

      for (const invoice of contractInvoices) {
        for (const line of invoice.lines) {
          const expectedQty = findExpectedQuantity(quantityTerms, line.product_id);
          if (expectedQty === null) continue;

          if (Math.abs(line.quantity - expectedQty) > 0.01) {
            const unitPrice = line.unit_price || 0;
            const impact = (line.quantity - expectedQty) * unitPrice;

            issues.push({
              ruleId: 'R005',
              ruleVersion: '1.0.0',
              category: 'billing',
              severity: 'high',
              confidence: 0.95,
              impactAmount: impact,
              currency: invoice.currency,
              expected: { quantity: expectedQty },
              actual: { quantity: line.quantity },
              dimensions: {
                snapshotId,
                contractId: contract.id,
                invoiceId: invoice.id,
                lineItemId: line.id,
              },
              contractId: contract.id,
              invoiceId: invoice.id,
              customerId: contract.customer_id || undefined,
              sources: [
                { sourceType: 'invoice_line', sourceId: line.id, fieldName: 'quantity' },
              ],
            });
          }
        }
      }
    }

    return issues;
  },
};

// R006: Duplicate Billing
export const R006_DuplicateBilling: Rule = {
  id: 'R006',
  version: '1.0.0',
  name: 'Duplicate Billing',
  description: 'Multiple invoices for the same contract and period',
  category: 'billing',
  tier: 'billing',
  severity: 'high',
  priority: 1,
  requiresData: ['invoices'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { invoices, config, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    // Group by contract + period
    const grouped = groupBy(invoices, (inv) => {
      const periodStart = inv.period_start ? formatDateKey(inv.period_start) : '';
      return `${inv.contract_id || 'none'}_${periodStart}`;
    });

    for (const [key, group] of grouped.entries()) {
      if (group.length <= 1) continue;
      if (key.startsWith('none_')) continue;

      // Check if amounts are similar (potential duplicates)
      const amounts = group.map(i => i.total);
      const maxAmount = Math.max(...amounts);
      const minAmount = Math.min(...amounts);
      
      const isSimilar = maxAmount > 0 && 
        (maxAmount - minAmount) / maxAmount < config.thresholds.amountVariancePct * 2;

      if (isSimilar) {
        const duplicateAmount = sum(group.slice(1), i => i.total);
        
        issues.push({
          ruleId: 'R006',
          ruleVersion: '1.0.0',
          category: 'billing',
          severity: 'high',
          confidence: 0.85,
          impactAmount: duplicateAmount,
          currency: group[0].currency,
          expected: { invoiceCount: 1 },
          actual: { invoiceCount: group.length },
          dimensions: {
            snapshotId,
            contractId: group[0].contract_id || undefined,
            periodStart: group[0].period_start ? formatDateKey(group[0].period_start) : undefined,
          },
          contractId: group[0].contract_id || undefined,
          customerId: group[0].customer_id || undefined,
          sources: group.map(i => ({
            sourceType: 'invoice' as const,
            sourceId: i.id,
            sourceSystem: i.source_system,
          })),
          metadata: { invoiceIds: group.map(i => i.id) },
        });
      }
    }

    return issues;
  },
};

// R007: Billing Beyond Term
export const R007_BillingBeyondTerm: Rule = {
  id: 'R007',
  version: '1.0.0',
  name: 'Billing Beyond Term',
  description: 'Invoice date is after contract end date',
  category: 'billing',
  tier: 'billing',
  severity: 'critical',
  priority: 1,
  requiresData: ['contracts', 'invoices'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    for (const contract of contracts) {
      if (!contract.end_date) continue;

      const contractInvoices = invoices.filter(i => i.contract_id === contract.id);
      
      for (const invoice of contractInvoices) {
        const termCheck = isInvoiceWithinTerm(
          invoice.invoice_date,
          contract.start_date,
          contract.end_date
        );

        if (termCheck.afterEnd) {
          issues.push({
            ruleId: 'R007',
            ruleVersion: '1.0.0',
            category: 'billing',
            severity: 'critical',
            confidence: 1.0,
            impactAmount: invoice.total,
            currency: invoice.currency,
            expected: { invoiceDate: '<=', contractEnd: formatDateKey(contract.end_date) },
            actual: { invoiceDate: formatDateKey(invoice.invoice_date) },
            dimensions: {
              snapshotId,
              contractId: contract.id,
              invoiceId: invoice.id,
            },
            contractId: contract.id,
            invoiceId: invoice.id,
            customerId: contract.customer_id || undefined,
            sources: [
              { sourceType: 'contract', sourceId: contract.id, fieldName: 'end_date' },
              { sourceType: 'invoice', sourceId: invoice.id, fieldName: 'invoice_date' },
            ],
          });
        }
      }
    }

    return issues;
  },
};

// R008: Billing Before Start
export const R008_BillingBeforeStart: Rule = {
  id: 'R008',
  version: '1.0.0',
  name: 'Billing Before Start',
  description: 'Invoice date is before contract start date',
  category: 'billing',
  tier: 'billing',
  severity: 'high',
  priority: 1,
  requiresData: ['contracts', 'invoices'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    for (const contract of contracts) {
      if (!contract.start_date) continue;

      const contractInvoices = invoices.filter(i => i.contract_id === contract.id);
      
      for (const invoice of contractInvoices) {
        const termCheck = isInvoiceWithinTerm(
          invoice.invoice_date,
          contract.start_date,
          contract.end_date
        );

        if (termCheck.beforeStart) {
          issues.push({
            ruleId: 'R008',
            ruleVersion: '1.0.0',
            category: 'billing',
            severity: 'high',
            confidence: 1.0,
            impactAmount: invoice.total,
            currency: invoice.currency,
            expected: { invoiceDate: '>=', contractStart: formatDateKey(contract.start_date) },
            actual: { invoiceDate: formatDateKey(invoice.invoice_date) },
            dimensions: {
              snapshotId,
              contractId: contract.id,
              invoiceId: invoice.id,
            },
            contractId: contract.id,
            invoiceId: invoice.id,
            customerId: contract.customer_id || undefined,
            sources: [
              { sourceType: 'contract', sourceId: contract.id, fieldName: 'start_date' },
              { sourceType: 'invoice', sourceId: invoice.id, fieldName: 'invoice_date' },
            ],
          });
        }
      }
    }

    return issues;
  },
};

// R009: Currency Mismatch
export const R009_CurrencyMismatch: Rule = {
  id: 'R009',
  version: '1.0.0',
  name: 'Currency Mismatch',
  description: 'Invoice currency does not match contract currency',
  category: 'billing',
  tier: 'billing',
  severity: 'medium',
  priority: 1,
  requiresData: ['contracts', 'invoices'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    for (const contract of contracts) {
      const contractInvoices = invoices.filter(i => i.contract_id === contract.id);
      
      for (const invoice of contractInvoices) {
        if (invoice.currency !== contract.currency) {
          issues.push({
            ruleId: 'R009',
            ruleVersion: '1.0.0',
            category: 'billing',
            severity: 'medium',
            confidence: 1.0,
            expected: { currency: contract.currency },
            actual: { currency: invoice.currency },
            dimensions: {
              snapshotId,
              contractId: contract.id,
              invoiceId: invoice.id,
            },
            contractId: contract.id,
            invoiceId: invoice.id,
            customerId: contract.customer_id || undefined,
            sources: [
              { sourceType: 'contract', sourceId: contract.id, fieldName: 'currency' },
              { sourceType: 'invoice', sourceId: invoice.id, fieldName: 'currency' },
            ],
          });
        }
      }
    }

    return issues;
  },
};

// R010: Billing Frequency Mismatch
export const R010_BillingFrequencyMismatch: Rule = {
  id: 'R010',
  version: '1.0.0',
  name: 'Billing Frequency Mismatch',
  description: 'Invoice timing does not match contract billing frequency',
  category: 'billing',
  tier: 'billing',
  severity: 'medium',
  priority: 2,
  requiresData: ['contracts', 'invoices'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    for (const contract of contracts) {
      if (!contract.billing_frequency) continue;

      const contractInvoices = invoices
        .filter(i => i.contract_id === contract.id)
        .sort((a, b) => a.invoice_date.getTime() - b.invoice_date.getTime());
      
      if (contractInvoices.length < 2) continue;

      const expectedMonths = getExpectedMonthsBetween(contract.billing_frequency);
      
      for (let i = 1; i < contractInvoices.length; i++) {
        const prev = contractInvoices[i - 1];
        const curr = contractInvoices[i];
        const monthsBetween = getMonthsBetween(prev.invoice_date, curr.invoice_date);

        if (Math.abs(monthsBetween - expectedMonths) > 1) {
          issues.push({
            ruleId: 'R010',
            ruleVersion: '1.0.0',
            category: 'billing',
            severity: 'medium',
            confidence: 0.8,
            expected: { 
              frequency: contract.billing_frequency, 
              expectedMonths,
            },
            actual: { monthsBetween },
            dimensions: {
              snapshotId,
              contractId: contract.id,
              invoiceId: curr.id,
            },
            contractId: contract.id,
            invoiceId: curr.id,
            customerId: contract.customer_id || undefined,
            metadata: { 
              previousInvoiceId: prev.id,
              previousInvoiceDate: formatDateKey(prev.invoice_date),
            },
          });
        }
      }
    }

    return issues;
  },
};

// Helper functions
function getExpectedBillingPeriods(contract: ContractWithTerms, asOf: Date) {
  const periods: { start: Date; end: Date }[] = [];
  if (!contract.start_date) return periods;

  const frequency = contract.billing_frequency || 'monthly';
  const monthsPerPeriod = frequency === 'annually' ? 12 : frequency === 'quarterly' ? 3 : 1;
  
  let periodStart = new Date(contract.start_date);
  while (periodStart < asOf) {
    const periodEnd = addMonths(periodStart, monthsPerPeriod);
    if (periodEnd <= asOf && (!contract.end_date || periodStart <= contract.end_date)) {
      periods.push({ start: periodStart, end: periodEnd });
    }
    periodStart = periodEnd;
  }

  return periods;
}

function calculateExpectedAmount(contract: ContractWithTerms, period: { start: Date; end: Date }): number {
  const arr = contract.arr || 0;
  const frequency = contract.billing_frequency || 'monthly';
  
  if (frequency === 'annually') return arr;
  if (frequency === 'quarterly') return arr / 4;
  return arr / 12;
}

function calculateInvoiceExpected(contract: ContractWithTerms, invoice: InvoiceWithLines): number {
  const arr = contract.arr || 0;
  const frequency = contract.billing_frequency || 'monthly';
  
  if (frequency === 'annually') return arr;
  if (frequency === 'quarterly') return arr / 4;
  return arr / 12;
}

function findExpectedPrice(terms: any[], productId: string | null): number | null {
  const term = terms.find(t => {
    const value = t.value_json as Record<string, unknown>;
    return value?.productId === productId || !productId;
  });
  
  if (term) {
    const value = term.value_json as Record<string, unknown>;
    return typeof value?.unitPrice === 'number' ? value.unitPrice : null;
  }
  return null;
}

function findExpectedQuantity(terms: any[], productId: string | null): number | null {
  const term = terms.find(t => {
    const value = t.value_json as Record<string, unknown>;
    return value?.productId === productId || !productId;
  });
  
  if (term) {
    const value = term.value_json as Record<string, unknown>;
    return typeof value?.quantity === 'number' ? value.quantity : null;
  }
  return null;
}

function getExpectedMonthsBetween(frequency: string): number {
  if (frequency === 'annually') return 12;
  if (frequency === 'quarterly') return 3;
  return 1;
}

function getMonthsBetween(date1: Date, date2: Date): number {
  return (date2.getFullYear() - date1.getFullYear()) * 12 + 
         (date2.getMonth() - date1.getMonth());
}

// Export all billing rules
export const billingRules: Rule[] = [
  R001_MissingInvoice,
  R002_Underbilling,
  R003_Overbilling,
  R004_WrongUnitPrice,
  R005_WrongQuantity,
  R006_DuplicateBilling,
  R007_BillingBeyondTerm,
  R008_BillingBeforeStart,
  R009_CurrencyMismatch,
  R010_BillingFrequencyMismatch,
];
