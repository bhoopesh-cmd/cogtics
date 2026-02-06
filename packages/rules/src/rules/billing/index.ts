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
          // Check if invoice_date falls within period
          if (invDate >= period.start && invDate <= period.end) return true;
          
          // Also check if invoice period overlaps with expected period
          if (inv.period_start && inv.period_end) {
            const invPeriodStart = new Date(inv.period_start);
            const invPeriodEnd = new Date(inv.period_end);
            // Check for overlap
            return invPeriodStart <= period.end && invPeriodEnd >= period.start;
          }
          
          return false;
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
  version: '1.1.0',
  name: 'Duplicate Billing',
  description: 'Multiple invoices for the same contract and period, or overlapping/adjacent periods with same amount',
  category: 'billing',
  tier: 'billing',
  severity: 'high',
  priority: 1,
  requiresData: ['invoices'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { invoices, config, snapshotId } = ctx;
    const issues: RuleIssue[] = [];
    const flaggedPairs = new Set<string>();

    // Group by contract + period (original logic)
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
        const pairKey = group.map(i => i.id).sort().join('_');
        flaggedPairs.add(pairKey);
        
        issues.push({
          ruleId: 'R006',
          ruleVersion: '1.1.0',
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
          metadata: { invoiceIds: group.map(i => i.id), matchType: 'same_period' },
        });
      }
    }

    // NEW: Also check for adjacent/overlapping periods with same amount (common duplicate pattern)
    const byContract = groupBy(invoices, inv => inv.contract_id || 'none');
    
    for (const [contractId, contractInvoices] of byContract.entries()) {
      if (contractId === 'none' || contractInvoices.length < 2) continue;

      // Sort by invoice date
      const sorted = [...contractInvoices].sort((a, b) => 
        new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime()
      );

      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const inv1 = sorted[i];
          const inv2 = sorted[j];

          // Skip if already flagged
          const pairKey = [inv1.id, inv2.id].sort().join('_');
          if (flaggedPairs.has(pairKey)) continue;

          // Check if amounts are similar (within tolerance)
          const amountVariance = Math.abs(inv1.total - inv2.total);
          const maxAmount = Math.max(inv1.total, inv2.total);
          const isSimilarAmount = maxAmount > 0 && 
            amountVariance / maxAmount < config.thresholds.amountVariancePct * 2;

          if (!isSimilarAmount) continue;

          // Check if periods are adjacent or overlapping
          const period1End = inv1.period_end ? new Date(inv1.period_end) : null;
          const period2Start = inv2.period_start ? new Date(inv2.period_start) : null;
          const period1Start = inv1.period_start ? new Date(inv1.period_start) : null;
          const period2End = inv2.period_end ? new Date(inv2.period_end) : null;

          let isAdjacentOrOverlapping = false;
          let matchType = '';

          // Check for overlapping periods
          if (period1Start && period1End && period2Start && period2End) {
            const overlaps = period1Start <= period2End && period2Start <= period1End;
            if (overlaps) {
              isAdjacentOrOverlapping = true;
              matchType = 'overlapping_periods';
            }
          }

          // Check for adjacent periods (end of one = start of next, +/- 1 day)
          if (!isAdjacentOrOverlapping && period1End && period2Start) {
            const daysDiff = Math.abs(
              (period2Start.getTime() - period1End.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysDiff <= 1) {
              isAdjacentOrOverlapping = true;
              matchType = 'adjacent_periods';
            }
          }

          // Check for invoices within short timeframe with same amount
          const invoiceDateDiff = Math.abs(
            (new Date(inv2.invoice_date).getTime() - new Date(inv1.invoice_date).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (!isAdjacentOrOverlapping && invoiceDateDiff <= 7 && inv1.total === inv2.total) {
            isAdjacentOrOverlapping = true;
            matchType = 'same_amount_within_week';
          }

          if (isAdjacentOrOverlapping) {
            flaggedPairs.add(pairKey);
            
            issues.push({
              ruleId: 'R006',
              ruleVersion: '1.1.0',
              category: 'billing',
              severity: 'high',
              confidence: matchType === 'overlapping_periods' ? 0.9 : 0.75,
              impactAmount: inv2.total,
              currency: inv1.currency,
              expected: { invoiceCount: 1 },
              actual: { invoiceCount: 2 },
              dimensions: {
                snapshotId,
                contractId,
                invoiceId: inv2.id,
              },
              contractId,
              invoiceId: inv2.id,
              customerId: inv1.customer_id || undefined,
              sources: [
                { sourceType: 'invoice' as const, sourceId: inv1.id, sourceSystem: inv1.source_system },
                { sourceType: 'invoice' as const, sourceId: inv2.id, sourceSystem: inv2.source_system },
              ],
              metadata: { 
                invoiceIds: [inv1.id, inv2.id], 
                matchType,
                invoice1Date: formatDateKey(inv1.invoice_date),
                invoice2Date: formatDateKey(inv2.invoice_date),
              },
            });
          }
        }
      }
    }

    // NEW: Check for duplicate invoice numbers (strongest signal of duplicate)
    const invoicesByNumber = groupBy(
      invoices.filter(inv => inv.invoice_number && inv.contract_id),
      inv => `${inv.contract_id}_${inv.invoice_number}`
    );
    
    for (const [key, group] of invoicesByNumber.entries()) {
      if (group.length <= 1) continue;
      
      const pairKey = group.map(i => i.id).sort().join('_');
      if (flaggedPairs.has(pairKey)) continue;
      
      flaggedPairs.add(pairKey);
      const duplicateAmount = sum(group.slice(1), i => i.total);
      
      issues.push({
        ruleId: 'R006',
        ruleVersion: '1.1.0',
        category: 'billing',
        severity: 'critical',
        confidence: 0.95,
        impactAmount: duplicateAmount,
        currency: group[0].currency,
        expected: { invoiceCount: 1 },
        actual: { invoiceCount: group.length },
        dimensions: {
          snapshotId,
          contractId: group[0].contract_id || undefined,
          invoiceNumber: group[0].invoice_number || undefined,
        },
        contractId: group[0].contract_id || undefined,
        customerId: group[0].customer_id || undefined,
        sources: group.map(i => ({
          sourceType: 'invoice' as const,
          sourceId: i.id,
          sourceSystem: i.source_system,
        })),
        metadata: { 
          invoiceIds: group.map(i => i.id), 
          matchType: 'same_invoice_number',
          invoiceNumber: group[0].invoice_number,
        },
      });
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

// R017: Invoice Period Span Mismatch
export const R017_InvoicePeriodSpanMismatch: Rule = {
  id: 'R017',
  version: '1.0.0',
  name: 'Invoice Period Span Mismatch',
  description: 'Invoice service period length does not match contract billing frequency',
  category: 'billing',
  tier: 'billing',
  severity: 'medium',
  priority: 2,
  requiresData: ['contracts', 'invoices'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, snapshotId, config } = ctx;
    const issues: RuleIssue[] = [];

    // Expected days per billing frequency (with tolerance)
    const FREQUENCY_DAYS: Record<string, { min: number; max: number; expected: number }> = {
      'monthly': { min: 28, max: 31, expected: 30 },
      'quarterly': { min: 89, max: 92, expected: 91 },
      'annually': { min: 364, max: 366, expected: 365 },
      'semi-annually': { min: 180, max: 184, expected: 182 },
    };

    for (const contract of contracts) {
      if (!contract.billing_frequency) continue;

      const expectedRange = FREQUENCY_DAYS[contract.billing_frequency];
      if (!expectedRange) continue;

      const contractInvoices = invoices.filter(i => i.contract_id === contract.id);

      for (const invoice of contractInvoices) {
        // Skip if no period dates
        if (!invoice.period_start || !invoice.period_end) continue;

        const periodStart = new Date(invoice.period_start);
        const periodEnd = new Date(invoice.period_end);
        
        // Calculate actual period span in days
        const periodDays = Math.round(
          (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Check if period span is outside expected range
        if (periodDays < expectedRange.min || periodDays > expectedRange.max) {
          // Calculate impact - if period is longer than expected, we may be underbilling
          // If period is shorter, we may be overbilling
          const expectedAmount = calculateInvoiceExpected(contract, invoice);
          const periodRatio = periodDays / expectedRange.expected;
          const adjustedAmount = expectedAmount * periodRatio;
          const impact = Math.abs(expectedAmount - adjustedAmount);

          issues.push({
            ruleId: 'R017',
            ruleVersion: '1.0.0',
            category: 'billing',
            severity: 'medium',
            confidence: 0.9,
            impactAmount: impact > config.thresholds.amountVarianceAbs ? impact : undefined,
            currency: invoice.currency,
            expected: {
              frequency: contract.billing_frequency,
              periodDaysMin: expectedRange.min,
              periodDaysMax: expectedRange.max,
              expectedDays: expectedRange.expected,
            },
            actual: {
              periodDays,
              periodStart: formatDateKey(periodStart),
              periodEnd: formatDateKey(periodEnd),
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
              { sourceType: 'contract', sourceId: contract.id, fieldName: 'billing_frequency' },
              { sourceType: 'invoice', sourceId: invoice.id, fieldName: 'period_start' },
              { sourceType: 'invoice', sourceId: invoice.id, fieldName: 'period_end' },
            ],
            metadata: {
              invoiceNumber: invoice.invoice_number,
              deviation: periodDays > expectedRange.max 
                ? `${periodDays - expectedRange.expected} days longer than expected`
                : `${expectedRange.expected - periodDays} days shorter than expected`,
            },
          });
        }
      }
    }

    return issues;
  },
};

// R018: Invoice Timing Variance
export const R018_InvoiceTimingVariance: Rule = {
  id: 'R018',
  version: '1.0.0',
  name: 'Invoice Timing Variance',
  description: 'Invoice date significantly after expected billing date for the period',
  category: 'billing',
  tier: 'billing',
  severity: 'medium',
  priority: 2,
  requiresData: ['contracts', 'invoices'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, snapshotId, snapshotDate } = ctx;
    const issues: RuleIssue[] = [];

    // Threshold for flagging late invoices (days after expected)
    const LATE_THRESHOLD_DAYS = 5;

    for (const contract of contracts) {
      if (!contract.start_date || !contract.billing_frequency) continue;

      const contractInvoices = invoices.filter(i => i.contract_id === contract.id);
      if (contractInvoices.length === 0) continue;

      // Calculate expected billing periods
      const expectedPeriods = getExpectedBillingPeriods(contract, snapshotDate);

      for (const invoice of contractInvoices) {
        // Find which expected period this invoice belongs to
        const invoiceDate = new Date(invoice.invoice_date);
        
        // Use invoice's period_start to find matching expected period
        const invPeriodStart = invoice.period_start ? new Date(invoice.period_start) : null;
        
        const matchingPeriod = expectedPeriods.find(p => {
          if (invPeriodStart) {
            // Match by invoice's period_start overlapping with expected period
            return invPeriodStart >= p.start && invPeriodStart < p.end;
          }
          // Fallback: match by invoice_date being within period
          return invoiceDate >= p.start && invoiceDate <= p.end;
        });

        if (matchingPeriod) {
          // Expected invoice date is the period start
          const expectedDate = matchingPeriod.start;
          const daysDiff = Math.floor(
            (invoiceDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysDiff > LATE_THRESHOLD_DAYS) {
            issues.push({
              ruleId: 'R018',
              ruleVersion: '1.0.0',
              category: 'billing',
              severity: 'medium',
              confidence: 0.85,
              expected: {
                invoiceDate: formatDateKey(expectedDate),
                daysLate: 0,
              },
              actual: {
                invoiceDate: formatDateKey(invoiceDate),
                daysLate: daysDiff,
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
                { sourceType: 'contract', sourceId: contract.id, fieldName: 'start_date' },
                { sourceType: 'invoice', sourceId: invoice.id, fieldName: 'invoice_date' },
              ],
              metadata: {
                invoiceNumber: invoice.invoice_number,
                periodStart: formatDateKey(matchingPeriod.start),
                periodEnd: formatDateKey(matchingPeriod.end),
                deviation: `Invoice issued ${daysDiff} days after expected date`,
              },
            });
          }
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
    // Break if period starts after contract end (match synthetic data behavior)
    if (contract.end_date && periodStart > contract.end_date) {
      break;
    }
    
    const periodEnd = addMonths(periodStart, monthsPerPeriod);
    
    // Only include completed periods (periodEnd <= asOf)
    if (periodEnd <= asOf) {
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
  // Helper to extract unit price from various field names
  const extractUnitPrice = (value: Record<string, unknown> | null): number | null => {
    if (!value) return null;
    const price = value?.unitPrice ?? value?.unit_price ?? value?.price;
    return typeof price === 'number' ? price : null;
  };

  // First, try exact product ID match (supporting both camelCase and snake_case)
  const exactMatch = terms.find(t => {
    const value = t.value_json as Record<string, unknown>;
    if (!value) return false;
    const termProductId = value?.productId || value?.product_id;
    return termProductId === productId && productId !== null;
  });
  
  if (exactMatch) {
    return extractUnitPrice(exactMatch.value_json as Record<string, unknown>);
  }
  
  // Fallback: if invoice line has no product_id, use first pricing term with a unit price
  if (!productId) {
    const pricingTerm = terms.find(t => {
      const value = t.value_json as Record<string, unknown>;
      return extractUnitPrice(value) !== null;
    });
    
    if (pricingTerm) {
      return extractUnitPrice(pricingTerm.value_json as Record<string, unknown>);
    }
  }
  
  // Fallback: if no exact match and term has no product ID, use it
  const fallbackTerm = terms.find(t => {
    const value = t.value_json as Record<string, unknown>;
    if (!value) return false;
    const termProductId = value?.productId || value?.product_id;
    return !termProductId && extractUnitPrice(value) !== null;
  });
  
  if (fallbackTerm) {
    return extractUnitPrice(fallbackTerm.value_json as Record<string, unknown>);
  }
  
  return null;
}

function findExpectedQuantity(terms: any[], productId: string | null): number | null {
  // Helper to match product ID (supports both camelCase and snake_case)
  const matchesProductId = (value: Record<string, unknown> | null): boolean => {
    if (!value) return !productId;
    const termProductId = value?.productId || value?.product_id;
    return termProductId === productId || !productId || !termProductId;
  };

  // Helper to extract quantity from various field names
  const extractQuantity = (value: Record<string, unknown> | null): number | null => {
    if (!value) return null;
    // Try common field names
    const qty = value?.quantity ?? value?.seats ?? value?.licenseCount ?? value?.count ?? value?.licenses;
    return typeof qty === 'number' ? qty : null;
  };

  // First, look in explicit quantity/seats/licenses terms
  const quantityTerm = terms.find(t => {
    const termType = t.term_type;
    if (termType !== 'quantity' && termType !== 'seats' && termType !== 'licenses') return false;
    
    // Handle direct numeric value (not wrapped in object)
    if (typeof t.value_json === 'number') return true;
    
    const value = t.value_json as Record<string, unknown>;
    return matchesProductId(value);
  });
  
  if (quantityTerm) {
    // Handle direct numeric value
    if (typeof quantityTerm.value_json === 'number') {
      return quantityTerm.value_json;
    }
    const value = quantityTerm.value_json as Record<string, unknown>;
    const qty = extractQuantity(value);
    if (qty !== null) return qty;
  }
  
  // Also check unit_price terms for embedded quantity (common in synthetic data)
  const pricingTerm = terms.find(t => {
    if (t.term_type !== 'unit_price' && t.term_type !== 'pricing_model') return false;
    const value = t.value_json as Record<string, unknown>;
    return matchesProductId(value) && extractQuantity(value) !== null;
  });
  
  if (pricingTerm) {
    const value = pricingTerm.value_json as Record<string, unknown>;
    return extractQuantity(value);
  }
  
  // Fallback: check any term with quantity-like fields
  const anyTermWithQty = terms.find(t => {
    const value = t.value_json as Record<string, unknown>;
    return extractQuantity(value) !== null && matchesProductId(value);
  });
  
  if (anyTermWithQty) {
    const value = anyTermWithQty.value_json as Record<string, unknown>;
    return extractQuantity(value);
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
  R017_InvoicePeriodSpanMismatch,
  R018_InvoiceTimingVariance,
];
