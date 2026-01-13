/**
 * Test fixtures for Phase 7 Detection Engine rules
 * Uses database-style snake_case column names to match rule implementations
 */

import type { RuleContext } from '../types.js';
import { DEFAULT_DETECTION_CONFIG } from '../config.js';

// Base snapshot date for fixtures
export const SNAPSHOT_DATE = new Date('2024-01-15');

// ============================================
// Contract Fixtures (database-style)
// ============================================

export const baseContract = {
  id: 'contract_001',
  tenant_id: 'tenant_001',
  snapshot_id: 'snapshot_001',
  customer_id: 'customer_001',
  external_id: 'ext_contract_001',
  name: 'Enterprise Agreement',
  status: 'active' as const,
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-12-31'),
  arr: 120000,
  currency: 'USD',
  billing_frequency: 'monthly' as const,
  auto_renew: false,
  source_system: 'salesforce',
  created_at: new Date('2024-01-01'),
  metadata_json: {},
  external_ids_json: {},
  line_items: [
    {
      id: 'line_001',
      product_id: 'product_001',
      product_name: 'Pro Plan',
      quantity: 10,
      unit_price: 100,
      amount: 1000,
      currency: 'USD',
      discount_pct: 0,
      service_start: new Date('2024-01-01'),
      service_end: new Date('2024-12-31'),
    }
  ],
  terms: [] as Array<{
    id: string;
    term_type: string;
    value_json: Record<string, unknown>;
    confidence: number | null;
  }>,
  amendments: [],
  discounts: [],
};

export const contractWithDiscount = {
  ...baseContract,
  id: 'contract_002',
  discounts: [
    {
      id: 'discount_001',
      type: 'percentage',
      rate: 10,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-06-30'),
      applies_to: ['product_001'],
      max_discount: 500,
    }
  ],
};

export const expiredContract = {
  ...baseContract,
  id: 'contract_003',
  status: 'expired' as const,
  end_date: new Date('2024-01-10'),
};

export const cancelledContract = {
  ...baseContract,
  id: 'contract_004',
  status: 'cancelled' as const,
  end_date: new Date('2024-01-05'),
  metadata_json: { cancellation_date: '2024-01-05' },
};

// ============================================
// Invoice Fixtures (database-style)
// ============================================

export const baseInvoice = {
  id: 'invoice_001',
  tenant_id: 'tenant_001',
  snapshot_id: 'snapshot_001',
  customer_id: 'customer_001',
  contract_id: 'contract_001',
  external_id: 'ext_invoice_001',
  invoice_number: 'INV-2024-001',
  invoice_date: new Date('2024-01-15'),
  due_date: new Date('2024-02-15'),
  currency: 'USD',
  subtotal: 10000,
  tax: 500,
  total: 10500,
  amount_paid: 10500,
  amount_due: 0,
  status: 'paid' as const,
  period_start: new Date('2024-01-01'),
  period_end: new Date('2024-01-31'),
  source_system: 'stripe',
  created_at: new Date('2024-01-15'),
  metadata_json: {},
  external_ids_json: {},
  lines: [
    {
      id: 'line_001',
      product_id: 'product_001',
      product_name: 'Pro Plan',
      description: 'Monthly subscription',
      quantity: 10,
      unit_price: 100,
      amount: 1000,
      currency: 'USD',
      service_start: new Date('2024-01-01'),
      service_end: new Date('2024-01-31'),
      metadata_json: {},
    }
  ],
};

export const underbilledInvoice = {
  ...baseInvoice,
  id: 'invoice_002',
  subtotal: 9000, // Should be 10000
  total: 9450, // Missing $500
};

export const overbilledInvoice = {
  ...baseInvoice,
  id: 'invoice_003',
  subtotal: 11000, // Should be 10000
  total: 11550,
};

export const duplicateInvoice1 = {
  ...baseInvoice,
  id: 'invoice_dup_1',
  invoice_number: 'INV-DUP-001',
};

export const duplicateInvoice2 = {
  ...baseInvoice,
  id: 'invoice_dup_2',
  invoice_number: 'INV-DUP-001', // Same number
};

export const creditMemo = {
  ...baseInvoice,
  id: 'credit_001',
  invoice_number: 'CM-2024-001',
  subtotal: -500,
  tax: -25,
  total: -525,
  metadata_json: { is_credit_memo: true },
};

// ============================================
// Payment Fixtures (database-style)
// ============================================

export const basePayment = {
  id: 'payment_001',
  tenant_id: 'tenant_001',
  snapshot_id: 'snapshot_001',
  invoice_id: 'invoice_001',
  customer_id: 'customer_001',
  external_id: 'ext_payment_001',
  amount: 10500,
  currency: 'USD',
  payment_date: new Date('2024-01-20'),
  method: 'card',
  status: 'succeeded' as const,
  source_system: 'stripe',
  created_at: new Date('2024-01-20'),
  metadata_json: {},
  external_ids_json: {},
};

export const refundPayment = {
  ...basePayment,
  id: 'refund_001',
  amount: -500,
  status: 'refunded' as const,
};

// ============================================
// Usage Event Fixtures (database-style)
// ============================================

export const baseUsageEvent = {
  id: 'usage_001',
  tenant_id: 'tenant_001',
  snapshot_id: 'snapshot_001',
  customer_id: 'customer_001',
  contract_id: 'contract_001',
  external_id: 'ext_usage_001',
  metric_name: 'api_calls',
  quantity: 1000,
  unit_of_measure: 'calls',
  event_date: new Date('2024-01-15'),
  processed_at: new Date('2024-01-15'),
  source_system: 'usage_api',
  created_at: new Date('2024-01-15'),
  metadata_json: {},
};

export const staleUsageEvent = {
  ...baseUsageEvent,
  id: 'usage_stale',
  event_date: new Date('2024-01-01'),
  processed_at: new Date('2024-01-01'),
};

// ============================================
// RevRec Fixtures (database-style)
// ============================================

export const baseObligation = {
  id: 'obligation_001',
  tenant_id: 'tenant_001',
  snapshot_id: 'snapshot_001',
  contract_id: 'contract_001',
  obligation_type: 'subscription' as const,
  description: 'Pro Plan - Annual',
  transaction_price: 120000,
  allocated_amount: 120000,
  currency: 'USD',
  service_start_date: new Date('2024-01-01'),
  service_end_date: new Date('2024-12-31'),
  status: 'active' as const,
  created_at: new Date('2024-01-01'),
};

export const baseSchedule = {
  id: 'schedule_001',
  tenant_id: 'tenant_001',
  snapshot_id: 'snapshot_001',
  obligation_id: 'obligation_001',
  contract_id: 'contract_001',
  period_start: new Date('2024-01-01'),
  period_end: new Date('2024-01-31'),
  scheduled_amount: 10000,
  recognized_amount: 10000,
  deferred_amount: 0,
  recognition_method: 'straight_line' as const,
  status: 'recognized' as const,
  period_days: 31,
  daily_rate: 322.58,
};

export const baseDeferredBalance = {
  id: 'deferred_001',
  tenant_id: 'tenant_001',
  snapshot_id: 'snapshot_001',
  obligation_id: 'obligation_001',
  contract_id: 'contract_001',
  as_of_date: new Date('2024-01-31'),
  opening_balance: 120000,
  additions_amount: 0,
  recognized_amount: 10000,
  adjustments_amount: 0,
  closing_balance: 110000,
  currency: 'USD',
};

// ============================================
// Customer Fixtures (database-style)
// ============================================

export const baseCustomer = {
  id: 'customer_001',
  tenant_id: 'tenant_001',
  snapshot_id: 'snapshot_001',
  external_id: 'ext_customer_001',
  name: 'Acme Corporation',
  email: 'billing@acme.com',
  status: 'active' as const,
  source_system: 'salesforce',
  created_at: new Date('2023-01-01'),
  metadata_json: { tax_exempt: false },
  external_ids_json: {},
};

export const taxExemptCustomer = {
  ...baseCustomer,
  id: 'customer_002',
  name: 'NonProfit Org',
  metadata_json: { tax_exempt: true },
};

// ============================================
// Data Quality Fixtures
// ============================================

export const healthyDataQuality = {
  usageDataLastUpdated: new Date('2024-01-15'),
  crmDataLastUpdated: new Date('2024-01-15'),
  snapshotCompleteness: 1.0,
  contractReadinessPct: 0.95,
  contractReadiness: new Map<string, number>([['contract_001', 0.95]]),
  missingFxRates: [] as string[],
  missingMasterData: [] as string[],
};

export const staleDataQuality = {
  usageDataLastUpdated: new Date('2024-01-01'), // 14 days stale
  crmDataLastUpdated: new Date('2024-01-01'),
  snapshotCompleteness: 0.5,
  contractReadinessPct: 0.3,
  contractReadiness: new Map<string, number>([['contract_001', 0.3]]),
  missingFxRates: ['EUR', 'GBP'],
  missingMasterData: ['product_orphan_001'],
};

// ============================================
// FX Rate Fixtures
// ============================================

export const fxRates: Record<string, number> = {
  'EUR:USD:2024-01-15': 1.08,
  'GBP:USD:2024-01-15': 1.27,
  'USD:USD:2024-01-15': 1.0,
};

// ============================================
// Context Builders
// ============================================

export function createTestContext(overrides: Partial<RuleContext> = {}): RuleContext {
  return {
    tenantId: 'tenant_001',
    snapshotId: 'snapshot_001',
    snapshotDate: SNAPSHOT_DATE,
    contracts: [baseContract],
    invoices: [baseInvoice],
    payments: [basePayment],
    usageEvents: [baseUsageEvent],
    obligations: [baseObligation],
    schedules: [baseSchedule],
    deferredBalances: [baseDeferredBalance],
    customers: [baseCustomer],
    products: [],
    fxRates,
    priorIssues: [],
    priorSnapshots: [],
    config: DEFAULT_DETECTION_CONFIG,
    dataQuality: healthyDataQuality,
    ...overrides,
  } as RuleContext;
}

export function createEmptyContext(): RuleContext {
  return {
    tenantId: 'tenant_001',
    snapshotId: 'snapshot_001',
    snapshotDate: SNAPSHOT_DATE,
    contracts: [],
    invoices: [],
    payments: [],
    usageEvents: [],
    obligations: [],
    schedules: [],
    deferredBalances: [],
    customers: [],
    products: [],
    fxRates: {},
    priorIssues: [],
    priorSnapshots: [],
    config: DEFAULT_DETECTION_CONFIG,
    dataQuality: healthyDataQuality,
  } as RuleContext;
}
