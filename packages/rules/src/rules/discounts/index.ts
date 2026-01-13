/**
 * Tier 2: Discount and Pricing Rules
 * R011-R016 - Discount application and pricing accuracy
 */
import type { Rule, RuleContext, RuleIssue } from '../../types.js';
import { compareWithTolerance, formatDateKey, toDate } from '../../utils.js';

// R011: Expired Discount Applied
export const R011_ExpiredDiscountApplied: Rule = {
  id: 'R011',
  version: '1.0.0',
  name: 'Expired Discount Applied',
  description: 'Discount applied after its expiration date',
  category: 'discount',
  tier: 'discount',
  severity: 'high',
  priority: 1,
  requiresData: ['contracts', 'invoices', 'contract_terms'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    for (const contract of contracts) {
      const discountTerms = contract.terms.filter(t => t.term_type === 'discount');
      const contractInvoices = invoices.filter(i => i.contract_id === contract.id);

      for (const term of discountTerms) {
        const value = term.value_json as Record<string, unknown>;
        const endDate = toDate(value.endDate as string);
        if (!endDate) continue;

        for (const invoice of contractInvoices) {
          if (invoice.invoice_date > endDate) {
            // Check if discount was applied
            const discountLines = invoice.lines.filter(l => 
              (l.description || '').toLowerCase().includes('discount') ||
              l.amount < 0
            );

            if (discountLines.length > 0) {
              const discountAmount = Math.abs(discountLines.reduce((s, l) => s + l.amount, 0));
              
              issues.push({
                ruleId: 'R011',
                ruleVersion: '1.0.0',
                category: 'discount',
                severity: 'high',
                confidence: 0.9,
                impactAmount: discountAmount,
                currency: invoice.currency,
                expected: { discountApplied: false, reason: 'expired' },
                actual: { discountApplied: true, amount: discountAmount },
                dimensions: {
                  snapshotId,
                  contractId: contract.id,
                  invoiceId: invoice.id,
                },
                contractId: contract.id,
                invoiceId: invoice.id,
                customerId: contract.customer_id || undefined,
                sources: [
                  { sourceType: 'contract_term', sourceId: term.id, fieldName: 'endDate' },
                  { sourceType: 'invoice', sourceId: invoice.id },
                ],
                metadata: { 
                  discountEndDate: formatDateKey(endDate),
                  invoiceDate: formatDateKey(invoice.invoice_date),
                },
              });
            }
          }
        }
      }
    }

    return issues;
  },
};

// R012: Discount Not Applied
export const R012_DiscountNotApplied: Rule = {
  id: 'R012',
  version: '1.0.0',
  name: 'Discount Not Applied',
  description: 'Active discount not reflected on invoice',
  category: 'discount',
  tier: 'discount',
  severity: 'high',
  priority: 1,
  requiresData: ['contracts', 'invoices', 'contract_terms'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    for (const contract of contracts) {
      const discountTerms = contract.terms.filter(t => t.term_type === 'discount');
      const contractInvoices = invoices.filter(i => i.contract_id === contract.id);

      for (const term of discountTerms) {
        const value = term.value_json as Record<string, unknown>;
        const startDate = toDate(value.startDate as string) || contract.start_date;
        const endDate = toDate(value.endDate as string) || contract.end_date;
        const discountPct = (value.percentage as number) || 0;

        if (discountPct === 0) continue;

        for (const invoice of contractInvoices) {
          // Check if invoice is within discount period
          if (startDate && invoice.invoice_date < startDate) continue;
          if (endDate && invoice.invoice_date > endDate) continue;

          // Check if discount was applied
          const discountLines = invoice.lines.filter(l => 
            (l.description || '').toLowerCase().includes('discount') ||
            l.amount < 0
          );

          if (discountLines.length === 0) {
            const expectedDiscount = invoice.total * (discountPct / 100);
            
            issues.push({
              ruleId: 'R012',
              ruleVersion: '1.0.0',
              category: 'discount',
              severity: 'high',
              confidence: 0.85,
              impactAmount: expectedDiscount,
              currency: invoice.currency,
              expected: { discountApplied: true, percentage: discountPct },
              actual: { discountApplied: false },
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
      }
    }

    return issues;
  },
};

// R013: Wrong Discount Rate
export const R013_WrongDiscountRate: Rule = {
  id: 'R013',
  version: '1.0.0',
  name: 'Wrong Discount Rate',
  description: 'Applied discount percentage does not match contract',
  category: 'discount',
  tier: 'discount',
  severity: 'high',
  priority: 2,
  requiresData: ['contracts', 'invoices', 'contract_terms'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, config, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    for (const contract of contracts) {
      const discountTerms = contract.terms.filter(t => t.term_type === 'discount');
      const contractInvoices = invoices.filter(i => i.contract_id === contract.id);

      for (const term of discountTerms) {
        const value = term.value_json as Record<string, unknown>;
        const expectedPct = (value.percentage as number) || 0;
        if (expectedPct === 0) continue;

        for (const invoice of contractInvoices) {
          const discountLines = invoice.lines.filter(l => l.amount < 0);
          if (discountLines.length === 0) continue;

          const subtotal = invoice.lines.filter(l => l.amount > 0).reduce((s, l) => s + l.amount, 0);
          const discountAmount = Math.abs(discountLines.reduce((s, l) => s + l.amount, 0));
          const actualPct = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;

          const comparison = compareWithTolerance(
            expectedPct,
            actualPct,
            0.01, // 1% tolerance on percentage
            1 // 1 percentage point absolute
          );

          if (!comparison.matches) {
            const impact = Math.abs(subtotal * ((expectedPct - actualPct) / 100));
            
            issues.push({
              ruleId: 'R013',
              ruleVersion: '1.0.0',
              category: 'discount',
              severity: 'high',
              confidence: 0.9,
              impactAmount: impact,
              currency: invoice.currency,
              expected: { discountPct: expectedPct },
              actual: { discountPct: actualPct },
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
      }
    }

    return issues;
  },
};

// R014: Discount Exceeds Maximum
export const R014_DiscountExceedsMaximum: Rule = {
  id: 'R014',
  version: '1.0.0',
  name: 'Discount Exceeds Maximum',
  description: 'Applied discount exceeds maximum allowed',
  category: 'discount',
  tier: 'discount',
  severity: 'high',
  priority: 2,
  requiresData: ['invoices', 'products'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { invoices, products, snapshotId } = ctx;
    const issues: RuleIssue[] = [];
    const MAX_DISCOUNT_PCT = 50; // Default max discount

    for (const invoice of invoices) {
      const discountLines = invoice.lines.filter(l => l.amount < 0);
      if (discountLines.length === 0) continue;

      const subtotal = invoice.lines.filter(l => l.amount > 0).reduce((s, l) => s + l.amount, 0);
      const discountAmount = Math.abs(discountLines.reduce((s, l) => s + l.amount, 0));
      const discountPct = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;

      if (discountPct > MAX_DISCOUNT_PCT) {
        issues.push({
          ruleId: 'R014',
          ruleVersion: '1.0.0',
          category: 'discount',
          severity: 'high',
          confidence: 0.95,
          impactAmount: discountAmount - (subtotal * MAX_DISCOUNT_PCT / 100),
          currency: invoice.currency,
          expected: { maxDiscountPct: MAX_DISCOUNT_PCT },
          actual: { discountPct },
          dimensions: {
            snapshotId,
            invoiceId: invoice.id,
          },
          invoiceId: invoice.id,
          customerId: invoice.customer_id || undefined,
        });
      }
    }

    return issues;
  },
};

// R015: Uplift Not Applied
export const R015_UpliftNotApplied: Rule = {
  id: 'R015',
  version: '1.0.0',
  name: 'Uplift Not Applied',
  description: 'Contractual annual price increase not reflected',
  category: 'discount',
  tier: 'discount',
  severity: 'medium',
  priority: 3,
  requiresData: ['contracts', 'invoices', 'contract_terms'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, config, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    for (const contract of contracts) {
      const upliftTerms = contract.terms.filter(t => t.term_type === 'uplift');
      if (upliftTerms.length === 0) continue;

      const upliftValue = upliftTerms[0].value_json as Record<string, unknown>;
      const upliftPct = (upliftValue.percentage as number) || 0;
      if (upliftPct === 0) continue;

      const contractInvoices = invoices
        .filter(i => i.contract_id === contract.id)
        .sort((a, b) => a.invoice_date.getTime() - b.invoice_date.getTime());

      // Check year-over-year
      for (let i = 12; i < contractInvoices.length; i++) {
        const currentInv = contractInvoices[i];
        const priorInv = contractInvoices[i - 12]; // ~1 year ago

        if (!priorInv) continue;

        const expectedTotal = priorInv.total * (1 + upliftPct / 100);
        const comparison = compareWithTolerance(
          expectedTotal,
          currentInv.total,
          config.thresholds.amountVariancePct,
          config.thresholds.amountVarianceAbs
        );

        if (!comparison.matches && currentInv.total < expectedTotal) {
          issues.push({
            ruleId: 'R015',
            ruleVersion: '1.0.0',
            category: 'discount',
            severity: 'medium',
            confidence: 0.75,
            impactAmount: expectedTotal - currentInv.total,
            currency: currentInv.currency,
            expected: { total: expectedTotal, upliftPct },
            actual: { total: currentInv.total },
            dimensions: {
              snapshotId,
              contractId: contract.id,
              invoiceId: currentInv.id,
            },
            contractId: contract.id,
            invoiceId: currentInv.id,
            customerId: contract.customer_id || undefined,
            metadata: { priorInvoiceId: priorInv.id },
          });
        }
      }
    }

    return issues;
  },
};

// R016: Ramp Pricing Mismatch
export const R016_RampPricingMismatch: Rule = {
  id: 'R016',
  version: '1.0.0',
  name: 'Ramp Pricing Mismatch',
  description: 'Invoice amount does not match ramp schedule',
  category: 'discount',
  tier: 'discount',
  severity: 'high',
  priority: 3,
  requiresData: ['contracts', 'invoices', 'contract_terms'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, config, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    for (const contract of contracts) {
      const rampTerms = contract.terms.filter(t => 
        t.term_type === 'ramp' || t.term_type === 'ramp_schedule'
      );
      if (rampTerms.length === 0) continue;

      const rampValue = rampTerms[0].value_json as Record<string, unknown>;
      const schedule = rampValue.schedule as Array<{ startDate: string; amount: number }>;
      if (!schedule || !Array.isArray(schedule)) continue;

      const contractInvoices = invoices.filter(i => i.contract_id === contract.id);

      for (const invoice of contractInvoices) {
        // Find applicable ramp period
        const rampPeriod = schedule.find((p, idx) => {
          const startDate = toDate(p.startDate);
          const nextStart = schedule[idx + 1] ? toDate(schedule[idx + 1].startDate) : null;
          
          if (!startDate) return false;
          if (invoice.invoice_date < startDate) return false;
          if (nextStart && invoice.invoice_date >= nextStart) return false;
          return true;
        });

        if (rampPeriod) {
          const comparison = compareWithTolerance(
            rampPeriod.amount,
            invoice.total,
            config.thresholds.amountVariancePct,
            config.thresholds.amountVarianceAbs
          );

          if (!comparison.matches) {
            issues.push({
              ruleId: 'R016',
              ruleVersion: '1.0.0',
              category: 'discount',
              severity: 'high',
              confidence: 0.85,
              impactAmount: Math.abs(comparison.variance),
              currency: invoice.currency,
              expected: { rampAmount: rampPeriod.amount },
              actual: { invoiceTotal: invoice.total },
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
      }
    }

    return issues;
  },
};

// Export all discount rules
export const discountRules: Rule[] = [
  R011_ExpiredDiscountApplied,
  R012_DiscountNotApplied,
  R013_WrongDiscountRate,
  R014_DiscountExceedsMaximum,
  R015_UpliftNotApplied,
  R016_RampPricingMismatch,
];
