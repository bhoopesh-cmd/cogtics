/**
 * Tier 7: Multi-Entity / Parent-Child Rules
 * R170-R173 - Multi-entity billing reconciliation
 */
import type { Rule, RuleContext, RuleIssue } from '../../types.js';
import { groupBy, sum } from '../../utils.js';

// R170: Bill-To vs Sold-To Mismatch
export const R170_BillToSoldToMismatch: Rule = {
  id: 'R170',
  version: '1.0.0',
  name: 'Bill-To vs Sold-To Mismatch',
  description: 'Invoice billing entity differs from contract sold-to entity',
  category: 'multi_entity',
  tier: 'multi_entity',
  severity: 'medium',
  priority: 1,
  requiresData: ['contracts', 'invoices', 'customers'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, customers, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    for (const contract of contracts) {
      if (!contract.customer_id) continue;

      const contractInvoices = invoices.filter(i => i.contract_id === contract.id);

      for (const invoice of contractInvoices) {
        if (!invoice.customer_id || invoice.customer_id === contract.customer_id) continue;

        // Check if entities are linked (parent-child relationship)
        const invoiceCustomer = customers.find(c => c.id === invoice.customer_id);
        const contractCustomer = customers.find(c => c.id === contract.customer_id);

        // Check external IDs for parent-child relationship
        const invoiceExtIds = invoiceCustomer?.external_ids_json as Record<string, string> || {};
        const contractExtIds = contractCustomer?.external_ids_json as Record<string, string> || {};

        const isLinked = invoiceExtIds.parentId === contract.customer_id ||
                        contractExtIds.parentId === invoice.customer_id;

        if (!isLinked) {
          issues.push({
            ruleId: 'R170',
            ruleVersion: '1.0.0',
            category: 'multi_entity',
            severity: 'medium',
            confidence: 0.85,
            expected: { 
              invoiceCustomer: contract.customer_id,
              orLinkedEntity: true,
            },
            actual: { 
              invoiceCustomer: invoice.customer_id,
              contractCustomer: contract.customer_id,
              isLinked: false,
            },
            dimensions: {
              snapshotId,
              contractId: contract.id,
              invoiceId: invoice.id,
            },
            contractId: contract.id,
            invoiceId: invoice.id,
            customerId: contract.customer_id,
            sources: [
              { sourceType: 'contract', sourceId: contract.id, fieldName: 'customer_id' },
              { sourceType: 'invoice', sourceId: invoice.id, fieldName: 'customer_id' },
            ],
          });
        }
      }
    }

    return issues;
  },
};

// R171: Split Billing Unreconciled
export const R171_SplitBillingUnreconciled: Rule = {
  id: 'R171',
  version: '1.0.0',
  name: 'Split Billing Unreconciled',
  description: 'Multi-entity invoices do not sum to contract value',
  category: 'multi_entity',
  tier: 'multi_entity',
  severity: 'high',
  priority: 1,
  requiresData: ['contracts', 'invoices', 'customers'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, customers, config, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    // Find parent customers with children
    const customerParents = new Map<string, string[]>();
    for (const customer of customers) {
      const extIds = customer.external_ids_json as Record<string, string> || {};
      if (extIds.parentId) {
        const children = customerParents.get(extIds.parentId) || [];
        children.push(customer.id);
        customerParents.set(extIds.parentId, children);
      }
    }

    for (const contract of contracts) {
      if (!contract.customer_id) continue;
      if (!contract.arr) continue;

      // Get all related customer IDs (parent + children)
      const children = customerParents.get(contract.customer_id) || [];
      const allCustomerIds = new Set([contract.customer_id, ...children]);

      // Get invoices for all related entities
      const relatedInvoices = invoices.filter(i => 
        i.contract_id === contract.id ||
        (i.customer_id && allCustomerIds.has(i.customer_id))
      );

      if (relatedInvoices.length > 0 && children.length > 0) {
        // Check if split invoices sum correctly
        const totalInvoiced = sum(relatedInvoices, i => i.total);
        const expectedAnnual = contract.arr;
        const expectedMonthly = expectedAnnual / 12;

        // Allow for partial year
        const monthsCovered = relatedInvoices.length;
        const expectedTotal = expectedMonthly * monthsCovered;

        const variance = Math.abs(totalInvoiced - expectedTotal);
        const toleranceAbs = config.thresholds.amountVarianceAbs * monthsCovered;

        if (variance > toleranceAbs) {
          issues.push({
            ruleId: 'R171',
            ruleVersion: '1.0.0',
            category: 'multi_entity',
            severity: 'high',
            confidence: 0.75,
            impactAmount: variance,
            currency: contract.currency,
            expected: { totalFromSplitBilling: expectedTotal },
            actual: { totalInvoiced, invoiceCount: relatedInvoices.length },
            dimensions: {
              snapshotId,
              contractId: contract.id,
            },
            contractId: contract.id,
            customerId: contract.customer_id,
            metadata: {
              childEntities: children,
              parentEntity: contract.customer_id,
            },
          });
        }
      }
    }

    return issues;
  },
};

// R172: Consolidated Invoice Missing Breakdown
export const R172_ConsolidatedInvoiceMissingBreakdown: Rule = {
  id: 'R172',
  version: '1.0.0',
  name: 'Consolidated Invoice Missing Breakdown',
  description: 'Parent invoice lacks child entity breakdown',
  category: 'multi_entity',
  tier: 'multi_entity',
  severity: 'medium',
  priority: 2,
  requiresData: ['invoices', 'customers'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { invoices, customers, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    // Find parent customers
    const parentCustomers = new Set<string>();
    for (const customer of customers) {
      const extIds = customer.external_ids_json as Record<string, string> || {};
      if (extIds.parentId) {
        parentCustomers.add(extIds.parentId);
      }
    }

    for (const invoice of invoices) {
      if (!invoice.customer_id || !parentCustomers.has(invoice.customer_id)) continue;

      // Check if invoice has breakdown by entity
      const hasBreakdown = invoice.lines.some(l => {
        const metadata = l.metadata_json as Record<string, unknown> || {};
        return metadata.entityId || metadata.subsidiaryId;
      });

      if (!hasBreakdown && invoice.lines.length > 0) {
        issues.push({
          ruleId: 'R172',
          ruleVersion: '1.0.0',
          category: 'multi_entity',
          severity: 'medium',
          confidence: 0.7,
          expected: { hasEntityBreakdown: true },
          actual: { hasEntityBreakdown: false },
          dimensions: {
            snapshotId,
            invoiceId: invoice.id,
          },
          invoiceId: invoice.id,
          customerId: invoice.customer_id,
        });
      }
    }

    return issues;
  },
};

// R173: Subsidiary Invoice Orphan
export const R173_SubsidiaryInvoiceOrphan: Rule = {
  id: 'R173',
  version: '1.0.0',
  name: 'Subsidiary Invoice Orphan',
  description: 'Subsidiary invoice without parent contract',
  category: 'multi_entity',
  tier: 'multi_entity',
  severity: 'medium',
  priority: 2,
  requiresData: ['contracts', 'invoices', 'customers'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, invoices, customers, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    // Build child -> parent mapping
    const childToParent = new Map<string, string>();
    for (const customer of customers) {
      const extIds = customer.external_ids_json as Record<string, string> || {};
      if (extIds.parentId) {
        childToParent.set(customer.id, extIds.parentId);
      }
    }

    // Build set of contract customer IDs
    const contractCustomerIds = new Set(contracts.map(c => c.customer_id).filter(Boolean));

    for (const invoice of invoices) {
      if (!invoice.customer_id) continue;
      if (invoice.contract_id) continue; // Has a contract

      const parentId = childToParent.get(invoice.customer_id);
      if (!parentId) continue; // Not a subsidiary

      // Check if parent has a contract
      if (!contractCustomerIds.has(parentId)) {
        issues.push({
          ruleId: 'R173',
          ruleVersion: '1.0.0',
          category: 'multi_entity',
          severity: 'medium',
          confidence: 0.75,
          impactAmount: invoice.total,
          currency: invoice.currency,
          expected: { 
            hasParentContract: true,
            orDirectContract: true,
          },
          actual: { 
            hasParentContract: false,
            hasDirectContract: false,
            parentCustomerId: parentId,
          },
          dimensions: {
            snapshotId,
            invoiceId: invoice.id,
          },
          invoiceId: invoice.id,
          customerId: invoice.customer_id,
        });
      }
    }

    return issues;
  },
};

// Export all multi-entity rules
export const multiEntityRules: Rule[] = [
  R170_BillToSoldToMismatch,
  R171_SplitBillingUnreconciled,
  R172_ConsolidatedInvoiceMissingBreakdown,
  R173_SubsidiaryInvoiceOrphan,
];
