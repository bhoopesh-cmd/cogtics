/**
 * Revenue Recognition Schemas (Phase 6)
 * 
 * Zod schemas for ASC 606-compliant revenue recognition.
 */
import { z } from 'zod';
import { nanoid } from 'nanoid';

// ============================================
// ID Generators
// ============================================

export function createObligationId(): string {
  return `obl_${nanoid(16)}`;
}

export function createAllocationId(): string {
  return `alc_${nanoid(16)}`;
}

export function createScheduleId(): string {
  return `sch_${nanoid(16)}`;
}

export function createRecognitionEventId(): string {
  return `rev_${nanoid(16)}`;
}

export function createDeferredBalanceId(): string {
  return `def_${nanoid(16)}`;
}

export function createReconciliationId(): string {
  return `rec_${nanoid(16)}`;
}

// ============================================
// Enum Schemas
// ============================================

export const ObligationTypeSchema = z.enum([
  'subscription',
  'usage',
  'one_time',
  'professional_services',
  'support',
]);
export type ObligationType = z.infer<typeof ObligationTypeSchema>;

export const AllocationMethodSchema = z.enum([
  'ssp',
  'residual',
  'straight_line',
  'custom',
]);
export type AllocationMethod = z.infer<typeof AllocationMethodSchema>;

export const RecognitionMethodSchema = z.enum([
  'straight_line',
  'usage_based',
  'milestone',
  'as_invoiced',
]);
export type RecognitionMethod = z.infer<typeof RecognitionMethodSchema>;

export const ObligationStatusSchema = z.enum([
  'active',
  'completed',
  'cancelled',
  'amended',
]);
export type ObligationStatus = z.infer<typeof ObligationStatusSchema>;

export const ScheduleStatusSchema = z.enum([
  'pending',
  'partial',
  'recognized',
  'cancelled',
]);
export type ScheduleStatus = z.infer<typeof ScheduleStatusSchema>;

export const RecognitionEventTypeSchema = z.enum([
  'scheduled',
  'usage',
  'milestone',
  'adjustment',
  'cancellation',
  'amendment',
]);
export type RecognitionEventType = z.infer<typeof RecognitionEventTypeSchema>;

export const ReconciliationStatusSchema = z.enum([
  'matched',
  'timing_variance',
  'amount_variance',
  'missing_invoice',
  'unmatched',
]);
export type ReconciliationStatus = z.infer<typeof ReconciliationStatusSchema>;

// ============================================
// Entity Schemas
// ============================================

export const RevenueObligationSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  snapshotId: z.string(),
  contractId: z.string(),
  contractVersionId: z.string().nullable(),
  obligationType: ObligationTypeSchema,
  description: z.string().nullable(),
  transactionPrice: z.number(),
  currency: z.string().default('USD'),
  allocationMethod: AllocationMethodSchema,
  standaloneSellIingPrice: z.number().nullable(),
  serviceStartDate: z.string().nullable(),
  serviceEndDate: z.string().nullable(),
  status: ObligationStatusSchema,
  sourceTermIds: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
});
export type RevenueObligation = z.infer<typeof RevenueObligationSchema>;

export const RevenueAllocationSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  snapshotId: z.string(),
  obligationId: z.string(),
  allocationPct: z.number().min(0).max(100),
  allocatedAmount: z.number(),
  allocationBasis: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type RevenueAllocation = z.infer<typeof RevenueAllocationSchema>;

export const RevenueScheduleSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  snapshotId: z.string(),
  obligationId: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  scheduledAmount: z.number(),
  recognizedAmount: z.number(),
  deferredAmount: z.number(),
  recognitionMethod: RecognitionMethodSchema,
  status: ScheduleStatusSchema,
  periodDays: z.number().nullable(),
  dailyRate: z.number().nullable(),
  createdAt: z.string().datetime(),
});
export type RevenueSchedule = z.infer<typeof RevenueScheduleSchema>;

export const RecognitionEventSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  snapshotId: z.string(),
  obligationId: z.string(),
  scheduleId: z.string().nullable(),
  eventDate: z.string(),
  recognizedAmount: z.number(),
  eventType: RecognitionEventTypeSchema,
  sourceInvoiceId: z.string().nullable(),
  description: z.string().nullable(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
});
export type RecognitionEvent = z.infer<typeof RecognitionEventSchema>;

export const DeferredRevenueBalanceSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  snapshotId: z.string(),
  obligationId: z.string(),
  periodEnd: z.string(),
  openingBalance: z.number(),
  additions: z.number(),
  recognized: z.number(),
  adjustments: z.number(),
  closingBalance: z.number(),
  createdAt: z.string().datetime(),
});
export type DeferredRevenueBalance = z.infer<typeof DeferredRevenueBalanceSchema>;

export const RevRecReconciliationSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  snapshotId: z.string(),
  contractId: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  status: ReconciliationStatusSchema,
  scheduledAmount: z.number(),
  invoicedAmount: z.number(),
  varianceAmount: z.number(),
  variancePct: z.number().nullable(),
  details: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
});
export type RevRecReconciliation = z.infer<typeof RevRecReconciliationSchema>;

// ============================================
// Job Payload Schemas
// ============================================

export const RevRecComputeJobPayloadSchema = z.object({
  type: z.literal('revrec.compute'),
  tenantId: z.string(),
  snapshotId: z.string(),
  contractIds: z.array(z.string()).optional(),
  forceRecompute: z.boolean().default(false),
});
export type RevRecComputeJobPayload = z.infer<typeof RevRecComputeJobPayloadSchema>;

export const RevRecReconcileJobPayloadSchema = z.object({
  type: z.literal('revrec.reconcile'),
  tenantId: z.string(),
  snapshotId: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
});
export type RevRecReconcileJobPayload = z.infer<typeof RevRecReconcileJobPayloadSchema>;

// ============================================
// API Request/Response Schemas
// ============================================

export const RevRecSummarySchema = z.object({
  snapshotId: z.string(),
  totalObligations: z.number(),
  totalTransactionValue: z.number(),
  totalRecognized: z.number(),
  totalDeferred: z.number(),
  reconciliationStatus: z.object({
    matched: z.number(),
    timingVariance: z.number(),
    amountVariance: z.number(),
    unmatched: z.number(),
  }),
  periodSummary: z.array(z.object({
    period: z.string(),
    recognized: z.number(),
    deferred: z.number(),
    invoiced: z.number(),
    variance: z.number(),
  })).optional(),
});
export type RevRecSummary = z.infer<typeof RevRecSummarySchema>;

export const TriggerRevRecComputeRequestSchema = z.object({
  snapshotId: z.string(),
  contractIds: z.array(z.string()).optional(),
  forceRecompute: z.boolean().optional(),
});
export type TriggerRevRecComputeRequest = z.infer<typeof TriggerRevRecComputeRequestSchema>;

export const TriggerRevRecReconcileRequestSchema = z.object({
  snapshotId: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
});
export type TriggerRevRecReconcileRequest = z.infer<typeof TriggerRevRecReconcileRequestSchema>;
