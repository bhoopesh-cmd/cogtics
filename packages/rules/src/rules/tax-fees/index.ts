/**
 * Tier 9: Tax/Fee Exclusion Rules
 * R120-R121 - Tax and fee validation
 */
import type { Rule, RuleContext, RuleIssue } from '../../types.js';

// R120: Unexpected Tax Line
export const R120_UnexpectedTaxLine: Rule = {
  id: 'R120',
  version: '1.0.0',
  name: 'Unexpected Tax Line',
  description: 'Tax line on tax-exempt contract or customer',
  category: 'tax_fees',
  tier: 'tax_fees',
  severity: 'medium',
  priority: 1,
  requiresData: ['contracts', 'invoices', 'customers'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, customers, config, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    for (const contract of contracts) {
      // Check if contract/customer is tax exempt
      const metadata = contract.metadata_json as Record<string, unknown> | null;
      const customer = contract.customer_id 
        ? customers.find(c => c.id === contract.customer_id)
        : null;
      const customerMeta = customer?.metadata_json as Record<string, unknown> | null;

      const isTaxExempt = metadata?.taxExempt === true || 
                          customerMeta?.taxExempt === true ||
                          customerMeta?.taxId !== undefined;

      if (!isTaxExempt) continue;

      const contractInvoices = invoices.filter(i => i.contract_id === contract.id);

      for (const invoice of contractInvoices) {
        // Find tax lines
        const taxLines = invoice.lines.filter(l => {
          const desc = (l.description || '').toUpperCase();
          return config.taxFees.taxLineItemCodes.some(code => 
            desc.includes(code.toUpperCase())
          );
        });

        if (taxLines.length > 0) {
          const taxAmount = taxLines.reduce((s, l) => s + l.amount, 0);
          
          issues.push({
            ruleId: 'R120',
            ruleVersion: '1.0.0',
            category: 'tax_fees',
            severity: 'medium',
            confidence: 0.9,
            impactAmount: taxAmount,
            currency: invoice.currency,
            expected: { taxLines: 0, reason: 'tax-exempt entity' },
            actual: { taxLines: taxLines.length, taxAmount },
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

    return issues;
  },
};

// R121: Tax Rate Mismatch
export const R121_TaxRateMismatch: Rule = {
  id: 'R121',
  version: '1.0.0',
  name: 'Tax Rate Mismatch',
  description: 'Tax percentage does not match expected jurisdiction rate',
  category: 'tax_fees',
  tier: 'tax_fees',
  severity: 'medium',
  priority: 2,
  requiresData: ['invoices', 'customers'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { invoices, customers, config, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    // Common tax rates by jurisdiction (simplified)
    const TAX_RATES: Record<string, number> = {
      'US': 0, // Varies by state
      'US-CA': 7.25,
      'US-NY': 8.0,
      'US-TX': 6.25,
      'UK': 20,
      'DE': 19,
      'FR': 20,
      'AU': 10,
      'CA': 5,
    };

    for (const invoice of invoices) {
      const customer = invoice.customer_id 
        ? customers.find(c => c.id === invoice.customer_id)
        : null;
      
      if (!customer) continue;

      const customerMeta = customer.metadata_json as Record<string, unknown> | null;
      const jurisdiction = customerMeta?.jurisdiction as string || 
                          customerMeta?.country as string;
      
      if (!jurisdiction) continue;

      const expectedRate = TAX_RATES[jurisdiction];
      if (expectedRate === undefined) continue;

      // Find tax lines
      const taxLines = invoice.lines.filter(l => {
        const desc = (l.description || '').toUpperCase();
        return config.taxFees.taxLineItemCodes.some(code => 
          desc.includes(code.toUpperCase())
        );
      });

      if (taxLines.length === 0) continue;

      // Calculate actual tax rate
      const subtotal = invoice.lines
        .filter(l => l.amount > 0 && !config.taxFees.taxLineItemCodes.some(code => 
          (l.description || '').toUpperCase().includes(code)
        ))
        .reduce((s, l) => s + l.amount, 0);

      const taxAmount = taxLines.reduce((s, l) => s + l.amount, 0);
      const actualRate = subtotal > 0 ? (taxAmount / subtotal) * 100 : 0;

      // Check if rate matches (with 0.5% tolerance)
      if (Math.abs(actualRate - expectedRate) > 0.5) {
        issues.push({
          ruleId: 'R121',
          ruleVersion: '1.0.0',
          category: 'tax_fees',
          severity: 'medium',
          confidence: 0.75,
          impactAmount: Math.abs((expectedRate - actualRate) / 100 * subtotal),
          currency: invoice.currency,
          expected: { taxRate: expectedRate, jurisdiction },
          actual: { taxRate: actualRate },
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

// R122: Missing Expected Tax
export const R122_MissingExpectedTax: Rule = {
  id: 'R122',
  version: '1.0.0',
  name: 'Missing Expected Tax',
  description: 'Invoice for taxable customer/jurisdiction has no tax line',
  category: 'tax_fees',
  tier: 'tax_fees',
  severity: 'high',
  priority: 1,
  requiresData: ['contracts', 'invoices', 'customers'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, customers, config, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    // Jurisdictions that typically require tax
    const TAXABLE_JURISDICTIONS = new Set([
      'US-CA', 'US-NY', 'US-TX', 'US-FL', 'US-WA',
      'UK', 'DE', 'FR', 'AU', 'CA',
    ]);

    // Minimum invoice amount to flag (avoid noise on small invoices)
    const MIN_AMOUNT_TO_FLAG = 100;

    for (const invoice of invoices) {
      // Skip small invoices
      if (invoice.total < MIN_AMOUNT_TO_FLAG) continue;

      // Get customer info
      const customer = invoice.customer_id
        ? customers.find(c => c.id === invoice.customer_id)
        : null;
      
      const customerMeta = customer?.metadata_json as Record<string, unknown> | null;
      
      // Check if customer is tax exempt
      const isTaxExempt = customerMeta?.taxExempt === true ||
                          customerMeta?.tax_exempt === true;
      if (isTaxExempt) continue;

      // Get jurisdiction
      const jurisdiction = customerMeta?.jurisdiction as string ||
                          customerMeta?.country as string ||
                          customerMeta?.state as string;
      
      // Skip if no jurisdiction or not a taxable jurisdiction
      if (!jurisdiction) continue;
      
      // Check if this is a taxable jurisdiction
      const isTaxableJurisdiction = TAXABLE_JURISDICTIONS.has(jurisdiction) ||
                                    TAXABLE_JURISDICTIONS.has(`US-${jurisdiction}`) ||
                                    Array.from(TAXABLE_JURISDICTIONS).some(j => 
                                      jurisdiction.toUpperCase().includes(j)
                                    );
      
      if (!isTaxableJurisdiction) continue;

      // Find tax lines
      const taxLines = invoice.lines.filter(l => {
        const desc = (l.description || '').toUpperCase();
        return config.taxFees.taxLineItemCodes.some(code =>
          desc.includes(code.toUpperCase())
        );
      });

      // Check invoice-level tax field as well
      const hasTaxField = invoice.tax && Number(invoice.tax) > 0;

      if (taxLines.length === 0 && !hasTaxField) {
        // Calculate expected tax (estimate based on jurisdiction)
        const TAX_RATES: Record<string, number> = {
          'US-CA': 7.25, 'US-NY': 8.0, 'US-TX': 6.25, 'US-FL': 6.0, 'US-WA': 6.5,
          'UK': 20, 'DE': 19, 'FR': 20, 'AU': 10, 'CA': 5,
        };
        const rate = TAX_RATES[jurisdiction] || 5; // Default 5% if unknown
        const expectedTax = (invoice.subtotal ?? 0) * (rate / 100);

        issues.push({
          ruleId: 'R122',
          ruleVersion: '1.0.0',
          category: 'tax_fees',
          severity: 'high',
          confidence: 0.85,
          impactAmount: expectedTax,
          currency: invoice.currency,
          expected: { 
            hasTax: true, 
            jurisdiction,
            estimatedTaxRate: rate,
            estimatedTaxAmount: expectedTax,
          },
          actual: { 
            hasTax: false, 
            taxAmount: 0,
          },
          dimensions: {
            snapshotId,
            invoiceId: invoice.id,
            contractId: invoice.contract_id || undefined,
          },
          invoiceId: invoice.id,
          contractId: invoice.contract_id || undefined,
          customerId: invoice.customer_id || undefined,
          sources: [
            { sourceType: 'invoice', sourceId: invoice.id, fieldName: 'tax' },
            { sourceType: 'customer', sourceId: customer?.id || '', fieldName: 'jurisdiction' },
          ],
          metadata: {
            customerName: customer?.name,
            jurisdiction,
          },
        });
      }
    }

    return issues;
  },
};

// Export all tax/fees rules
export const taxFeesRules: Rule[] = [
  R120_UnexpectedTaxLine,
  R121_TaxRateMismatch,
  R122_MissingExpectedTax,
];
