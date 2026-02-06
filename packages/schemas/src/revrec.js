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
export function createObligationId() {
    return `obl_${nanoid(16)}`;
}
export function createAllocationId() {
    return `alc_${nanoid(16)}`;
}
export function createScheduleId() {
    return `sch_${nanoid(16)}`;
}
export function createRecognitionEventId() {
    return `rev_${nanoid(16)}`;
}
export function createDeferredBalanceId() {
    return `def_${nanoid(16)}`;
}
export function createReconciliationId() {
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
export const AllocationMethodSchema = z.enum([
    'ssp',
    'residual',
    'straight_line',
    'custom',
]);
export const RecognitionMethodSchema = z.enum([
    'straight_line',
    'usage_based',
    'milestone',
    'as_invoiced',
]);
export const ObligationStatusSchema = z.enum([
    'active',
    'completed',
    'cancelled',
    'amended',
]);
export const ScheduleStatusSchema = z.enum([
    'pending',
    'partial',
    'recognized',
    'cancelled',
]);
export const RecognitionEventTypeSchema = z.enum([
    'scheduled',
    'usage',
    'milestone',
    'adjustment',
    'cancellation',
    'amendment',
]);
export const ReconciliationStatusSchema = z.enum([
    'matched',
    'timing_variance',
    'amount_variance',
    'missing_invoice',
    'unmatched',
]);
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
export const RevRecReconcileJobPayloadSchema = z.object({
    type: z.literal('revrec.reconcile'),
    tenantId: z.string(),
    snapshotId: z.string(),
    periodStart: z.string(),
    periodEnd: z.string(),
});
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
export const TriggerRevRecComputeRequestSchema = z.object({
    snapshotId: z.string(),
    contractIds: z.array(z.string()).optional(),
    forceRecompute: z.boolean().optional(),
});
export const TriggerRevRecReconcileRequestSchema = z.object({
    snapshotId: z.string(),
    periodStart: z.string(),
    periodEnd: z.string(),
});
//# sourceMappingURL=revrec.js.map