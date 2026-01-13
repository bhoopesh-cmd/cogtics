/**
 * Canonical Schemas
 * 
 * Final shapes matching the canonical database tables.
 * Used for API responses and database reads.
 */
import { z } from 'zod';

// ============================================
// Snapshot
// ============================================

export const SnapshotStatusSchema = z.enum(['pending', 'building', 'validating', 'complete', 'failed']);
export type SnapshotStatus = z.infer<typeof SnapshotStatusSchema>;

export const SnapshotRecordCountsSchema = z.record(z.number());

export const SnapshotQualityResultSchema = z.object({
  checkName: z.string(),
  status: z.enum(['passed', 'warning', 'failed']),
  message: z.string().optional(),
  affectedCount: z.number().optional(),
});

export const SnapshotMetadataSchema = z.record(z.unknown());

export const SnapshotSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  sourceRunId: z.string().nullable(),
  status: SnapshotStatusSchema,
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  metadata: SnapshotMetadataSchema.optional(),
  recordCounts: SnapshotRecordCountsSchema.optional(),
  qualityResults: z.array(SnapshotQualityResultSchema).optional(),
  createdAt: z.string().datetime(),
});

export type Snapshot = z.infer<typeof SnapshotSchema>;

// ============================================
// Sync Run
// ============================================

export const SyncRunTypeSchema = z.enum(['load', 'normalize', 'upsert', 'finalize', 'full']);
export type SyncRunType = z.infer<typeof SyncRunTypeSchema>;

export const SyncRunStatusSchema = z.enum(['running', 'completed', 'failed']);
export type SyncRunStatus = z.infer<typeof SyncRunStatusSchema>;

export const SyncRunSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  snapshotId: z.string().nullable(),
  runType: SyncRunTypeSchema,
  status: SyncRunStatusSchema,
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable(),
  recordsProcessed: z.number(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export type SyncRun = z.infer<typeof SyncRunSchema>;

// ============================================
// Customer
// ============================================

export const CustomerStatusSchema = z.enum(['active', 'inactive', 'churned', 'prospect']);

export const CanonicalCustomerSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  snapshotId: z.string(),
  externalId: z.string(),
  externalIds: z.record(z.string()).optional(),
  name: z.string(),
  email: z.string().nullable(),
  status: CustomerStatusSchema,
  metadata: z.record(z.unknown()).optional(),
  sourceSystem: z.string(),
  sourceBatchId: z.string().nullable(),
  sourceRecordId: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type CanonicalCustomer = z.infer<typeof CanonicalCustomerSchema>;

// ============================================
// Contract
// ============================================

export const ContractStatusSchema = z.enum(['draft', 'active', 'expired', 'cancelled', 'renewed']);
export const BillingFrequencySchema = z.enum(['monthly', 'quarterly', 'annually', 'one_time']);

export const CanonicalContractSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  snapshotId: z.string(),
  customerId: z.string().nullable(),
  externalId: z.string(),
  externalIds: z.record(z.string()).optional(),
  name: z.string().nullable(),
  status: ContractStatusSchema,
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  arr: z.number().nullable(),
  currency: z.string(),
  billingFrequency: BillingFrequencySchema.nullable(),
  autoRenew: z.boolean(),
  metadata: z.record(z.unknown()).optional(),
  sourceSystem: z.string(),
  sourceBatchId: z.string().nullable(),
  sourceRecordId: z.string().nullable(),
  createdAt: z.string().datetime(),
  // Nested relations (optional, for detail views)
  customer: CanonicalCustomerSchema.optional(),
});

export type CanonicalContract = z.infer<typeof CanonicalContractSchema>;

// ============================================
// Invoice
// ============================================

export const InvoiceStatusSchema = z.enum(['draft', 'open', 'paid', 'void', 'uncollectible', 'past_due']);

export const CanonicalInvoiceSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  snapshotId: z.string(),
  customerId: z.string().nullable(),
  contractId: z.string().nullable(),
  externalId: z.string(),
  externalIds: z.record(z.string()).optional(),
  invoiceNumber: z.string().nullable(),
  invoiceDate: z.string(),
  dueDate: z.string().nullable(),
  currency: z.string(),
  subtotal: z.number().nullable(),
  tax: z.number(),
  total: z.number(),
  amountPaid: z.number(),
  amountDue: z.number().nullable(),
  status: InvoiceStatusSchema,
  periodStart: z.string().nullable(),
  periodEnd: z.string().nullable(),
  metadata: z.record(z.unknown()).optional(),
  sourceSystem: z.string(),
  sourceBatchId: z.string().nullable(),
  sourceRecordId: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type CanonicalInvoice = z.infer<typeof CanonicalInvoiceSchema>;

// ============================================
// Invoice Line
// ============================================

export const CanonicalInvoiceLineSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  snapshotId: z.string(),
  invoiceId: z.string(),
  productId: z.string().nullable(),
  externalId: z.string().nullable(),
  description: z.string().nullable(),
  quantity: z.number(),
  unitPrice: z.number().nullable(),
  amount: z.number(),
  currency: z.string(),
  serviceStart: z.string().nullable(),
  serviceEnd: z.string().nullable(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
});

export type CanonicalInvoiceLine = z.infer<typeof CanonicalInvoiceLineSchema>;

// ============================================
// Product
// ============================================

export const ProductStatusSchema = z.enum(['active', 'inactive', 'archived']);

export const CanonicalProductSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  snapshotId: z.string(),
  externalId: z.string(),
  externalIds: z.record(z.string()).optional(),
  sku: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  status: ProductStatusSchema,
  metadata: z.record(z.unknown()).optional(),
  sourceSystem: z.string(),
  sourceBatchId: z.string().nullable(),
  sourceRecordId: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type CanonicalProduct = z.infer<typeof CanonicalProductSchema>;

// ============================================
// Payment
// ============================================

export const PaymentStatusSchema = z.enum(['pending', 'succeeded', 'failed', 'refunded', 'partially_refunded']);

export const CanonicalPaymentSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  snapshotId: z.string(),
  invoiceId: z.string().nullable(),
  customerId: z.string().nullable(),
  externalId: z.string(),
  externalIds: z.record(z.string()).optional(),
  amount: z.number(),
  currency: z.string(),
  paymentDate: z.string().datetime(),
  method: z.string().nullable(),
  status: PaymentStatusSchema,
  metadata: z.record(z.unknown()).optional(),
  sourceSystem: z.string(),
  sourceBatchId: z.string().nullable(),
  sourceRecordId: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type CanonicalPayment = z.infer<typeof CanonicalPaymentSchema>;

// ============================================
// Usage Event
// ============================================

export const CanonicalUsageEventSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  snapshotId: z.string(),
  customerId: z.string().nullable(),
  contractId: z.string().nullable(),
  productId: z.string().nullable(),
  externalId: z.string().nullable(),
  metric: z.string(),
  quantity: z.number(),
  unit: z.string().nullable(),
  eventTime: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
  sourceSystem: z.string(),
  sourceBatchId: z.string().nullable(),
  sourceRecordId: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type CanonicalUsageEvent = z.infer<typeof CanonicalUsageEventSchema>;

// ============================================
// Price Plan
// ============================================

export const PricePlanStatusSchema = z.enum(['active', 'inactive', 'archived']);
export const PricePlanCadenceSchema = z.enum(['monthly', 'quarterly', 'annually', 'one_time', 'usage_based']);

export const CanonicalPricePlanSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  snapshotId: z.string(),
  productId: z.string(),
  externalId: z.string().nullable(),
  externalIds: z.record(z.string()).optional(),
  name: z.string().nullable(),
  billingCadence: PricePlanCadenceSchema.nullable(),
  currency: z.string(),
  price: z.record(z.unknown()),
  status: PricePlanStatusSchema,
  metadata: z.record(z.unknown()).optional(),
  sourceSystem: z.string(),
  sourceBatchId: z.string().nullable(),
  sourceRecordId: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type CanonicalPricePlan = z.infer<typeof CanonicalPricePlanSchema>;

// ============================================
// API Response Schemas
// ============================================

// Snapshot List Response
export const SnapshotListResponseSchema = z.object({
  snapshots: z.array(SnapshotSchema),
  total: z.number(),
});
export type SnapshotListResponse = z.infer<typeof SnapshotListResponseSchema>;

// Snapshot Detail Response
export const SnapshotDetailResponseSchema = SnapshotSchema.extend({
  syncRuns: z.array(SyncRunSchema).optional(),
});
export type SnapshotDetailResponse = z.infer<typeof SnapshotDetailResponseSchema>;

// Trigger Snapshot Request
export const TriggerSnapshotRequestSchema = z.object({
  connectionIds: z.array(z.string()).optional(),
  runType: z.enum(['full', 'incremental']).default('incremental'),
});
export type TriggerSnapshotRequest = z.infer<typeof TriggerSnapshotRequestSchema>;

// Trigger Snapshot Response
export const TriggerSnapshotResponseSchema = z.object({
  snapshotId: z.string(),
  status: SnapshotStatusSchema,
});
export type TriggerSnapshotResponse = z.infer<typeof TriggerSnapshotResponseSchema>;

// Canonical Data Query Params
export const CanonicalDataQueryParamsSchema = z.object({
  snapshotId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  search: z.string().optional(),
  status: z.string().optional(),
});
export type CanonicalDataQueryParams = z.infer<typeof CanonicalDataQueryParamsSchema>;

// Customer List Response
export const CustomerListResponseSchema = z.object({
  customers: z.array(CanonicalCustomerSchema),
  total: z.number(),
  snapshotId: z.string(),
});
export type CustomerListResponse = z.infer<typeof CustomerListResponseSchema>;

// Contract List Response
export const ContractListResponseSchema = z.object({
  contracts: z.array(CanonicalContractSchema),
  total: z.number(),
  snapshotId: z.string(),
});
export type ContractListResponse = z.infer<typeof ContractListResponseSchema>;

// Invoice List Response
export const InvoiceListResponseSchema = z.object({
  invoices: z.array(CanonicalInvoiceSchema),
  total: z.number(),
  snapshotId: z.string(),
});
export type InvoiceListResponse = z.infer<typeof InvoiceListResponseSchema>;

// Invoice Detail Response (with lines)
export const InvoiceDetailResponseSchema = CanonicalInvoiceSchema.extend({
  lines: z.array(CanonicalInvoiceLineSchema),
});
export type InvoiceDetailResponse = z.infer<typeof InvoiceDetailResponseSchema>;

// Summary Stats Response
export const SummaryStatsResponseSchema = z.object({
  snapshotId: z.string(),
  snapshotStatus: SnapshotStatusSchema,
  snapshotCompletedAt: z.string().datetime().nullable(),
  totalCustomers: z.number(),
  activeCustomers: z.number(),
  totalContracts: z.number(),
  activeContracts: z.number(),
  totalArr: z.number(),
  totalInvoices: z.number(),
  openInvoices: z.number(),
  totalRevenue: z.number(),
  amountDue: z.number(),
});
export type SummaryStats = z.infer<typeof SummaryStatsResponseSchema>;

