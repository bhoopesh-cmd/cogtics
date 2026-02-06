/**
 * Revenue Recognition Schemas (Phase 6)
 *
 * Zod schemas for ASC 606-compliant revenue recognition.
 */
import { z } from 'zod';
export declare function createObligationId(): string;
export declare function createAllocationId(): string;
export declare function createScheduleId(): string;
export declare function createRecognitionEventId(): string;
export declare function createDeferredBalanceId(): string;
export declare function createReconciliationId(): string;
export declare const ObligationTypeSchema: z.ZodEnum<["subscription", "usage", "one_time", "professional_services", "support"]>;
export type ObligationType = z.infer<typeof ObligationTypeSchema>;
export declare const AllocationMethodSchema: z.ZodEnum<["ssp", "residual", "straight_line", "custom"]>;
export type AllocationMethod = z.infer<typeof AllocationMethodSchema>;
export declare const RecognitionMethodSchema: z.ZodEnum<["straight_line", "usage_based", "milestone", "as_invoiced"]>;
export type RecognitionMethod = z.infer<typeof RecognitionMethodSchema>;
export declare const ObligationStatusSchema: z.ZodEnum<["active", "completed", "cancelled", "amended"]>;
export type ObligationStatus = z.infer<typeof ObligationStatusSchema>;
export declare const ScheduleStatusSchema: z.ZodEnum<["pending", "partial", "recognized", "cancelled"]>;
export type ScheduleStatus = z.infer<typeof ScheduleStatusSchema>;
export declare const RecognitionEventTypeSchema: z.ZodEnum<["scheduled", "usage", "milestone", "adjustment", "cancellation", "amendment"]>;
export type RecognitionEventType = z.infer<typeof RecognitionEventTypeSchema>;
export declare const ReconciliationStatusSchema: z.ZodEnum<["matched", "timing_variance", "amount_variance", "missing_invoice", "unmatched"]>;
export type ReconciliationStatus = z.infer<typeof ReconciliationStatusSchema>;
export declare const RevenueObligationSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    snapshotId: z.ZodString;
    contractId: z.ZodString;
    contractVersionId: z.ZodNullable<z.ZodString>;
    obligationType: z.ZodEnum<["subscription", "usage", "one_time", "professional_services", "support"]>;
    description: z.ZodNullable<z.ZodString>;
    transactionPrice: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    allocationMethod: z.ZodEnum<["ssp", "residual", "straight_line", "custom"]>;
    standaloneSellIingPrice: z.ZodNullable<z.ZodNumber>;
    serviceStartDate: z.ZodNullable<z.ZodString>;
    serviceEndDate: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["active", "completed", "cancelled", "amended"]>;
    sourceTermIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "completed" | "active" | "cancelled" | "amended";
    id: string;
    snapshotId: string;
    tenantId: string;
    description: string | null;
    currency: string;
    contractId: string;
    contractVersionId: string | null;
    obligationType: "one_time" | "subscription" | "usage" | "professional_services" | "support";
    transactionPrice: number;
    allocationMethod: "custom" | "ssp" | "residual" | "straight_line";
    standaloneSellIingPrice: number | null;
    serviceStartDate: string | null;
    serviceEndDate: string | null;
    sourceTermIds: string[];
    createdAt: string;
    metadata?: Record<string, unknown> | undefined;
}, {
    status: "completed" | "active" | "cancelled" | "amended";
    id: string;
    snapshotId: string;
    tenantId: string;
    description: string | null;
    contractId: string;
    contractVersionId: string | null;
    obligationType: "one_time" | "subscription" | "usage" | "professional_services" | "support";
    transactionPrice: number;
    allocationMethod: "custom" | "ssp" | "residual" | "straight_line";
    standaloneSellIingPrice: number | null;
    serviceStartDate: string | null;
    serviceEndDate: string | null;
    createdAt: string;
    currency?: string | undefined;
    sourceTermIds?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type RevenueObligation = z.infer<typeof RevenueObligationSchema>;
export declare const RevenueAllocationSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    snapshotId: z.ZodString;
    obligationId: z.ZodString;
    allocationPct: z.ZodNumber;
    allocatedAmount: z.ZodNumber;
    allocationBasis: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    snapshotId: string;
    tenantId: string;
    createdAt: string;
    obligationId: string;
    allocationPct: number;
    allocatedAmount: number;
    allocationBasis: string | null;
}, {
    id: string;
    snapshotId: string;
    tenantId: string;
    createdAt: string;
    obligationId: string;
    allocationPct: number;
    allocatedAmount: number;
    allocationBasis: string | null;
}>;
export type RevenueAllocation = z.infer<typeof RevenueAllocationSchema>;
export declare const RevenueScheduleSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    snapshotId: z.ZodString;
    obligationId: z.ZodString;
    periodStart: z.ZodString;
    periodEnd: z.ZodString;
    scheduledAmount: z.ZodNumber;
    recognizedAmount: z.ZodNumber;
    deferredAmount: z.ZodNumber;
    recognitionMethod: z.ZodEnum<["straight_line", "usage_based", "milestone", "as_invoiced"]>;
    status: z.ZodEnum<["pending", "partial", "recognized", "cancelled"]>;
    periodDays: z.ZodNullable<z.ZodNumber>;
    dailyRate: z.ZodNullable<z.ZodNumber>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "cancelled" | "partial" | "recognized";
    id: string;
    snapshotId: string;
    tenantId: string;
    createdAt: string;
    obligationId: string;
    periodStart: string;
    periodEnd: string;
    scheduledAmount: number;
    recognizedAmount: number;
    deferredAmount: number;
    recognitionMethod: "usage_based" | "straight_line" | "milestone" | "as_invoiced";
    periodDays: number | null;
    dailyRate: number | null;
}, {
    status: "pending" | "cancelled" | "partial" | "recognized";
    id: string;
    snapshotId: string;
    tenantId: string;
    createdAt: string;
    obligationId: string;
    periodStart: string;
    periodEnd: string;
    scheduledAmount: number;
    recognizedAmount: number;
    deferredAmount: number;
    recognitionMethod: "usage_based" | "straight_line" | "milestone" | "as_invoiced";
    periodDays: number | null;
    dailyRate: number | null;
}>;
export type RevenueSchedule = z.infer<typeof RevenueScheduleSchema>;
export declare const RecognitionEventSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    snapshotId: z.ZodString;
    obligationId: z.ZodString;
    scheduleId: z.ZodNullable<z.ZodString>;
    eventDate: z.ZodString;
    recognizedAmount: z.ZodNumber;
    eventType: z.ZodEnum<["scheduled", "usage", "milestone", "adjustment", "cancellation", "amendment"]>;
    sourceInvoiceId: z.ZodNullable<z.ZodString>;
    description: z.ZodNullable<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    snapshotId: string;
    tenantId: string;
    description: string | null;
    createdAt: string;
    obligationId: string;
    recognizedAmount: number;
    scheduleId: string | null;
    eventDate: string;
    eventType: "amendment" | "usage" | "milestone" | "scheduled" | "adjustment" | "cancellation";
    sourceInvoiceId: string | null;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    snapshotId: string;
    tenantId: string;
    description: string | null;
    createdAt: string;
    obligationId: string;
    recognizedAmount: number;
    scheduleId: string | null;
    eventDate: string;
    eventType: "amendment" | "usage" | "milestone" | "scheduled" | "adjustment" | "cancellation";
    sourceInvoiceId: string | null;
    metadata?: Record<string, unknown> | undefined;
}>;
export type RecognitionEvent = z.infer<typeof RecognitionEventSchema>;
export declare const DeferredRevenueBalanceSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    snapshotId: z.ZodString;
    obligationId: z.ZodString;
    periodEnd: z.ZodString;
    openingBalance: z.ZodNumber;
    additions: z.ZodNumber;
    recognized: z.ZodNumber;
    adjustments: z.ZodNumber;
    closingBalance: z.ZodNumber;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    snapshotId: string;
    tenantId: string;
    recognized: number;
    createdAt: string;
    obligationId: string;
    periodEnd: string;
    openingBalance: number;
    additions: number;
    adjustments: number;
    closingBalance: number;
}, {
    id: string;
    snapshotId: string;
    tenantId: string;
    recognized: number;
    createdAt: string;
    obligationId: string;
    periodEnd: string;
    openingBalance: number;
    additions: number;
    adjustments: number;
    closingBalance: number;
}>;
export type DeferredRevenueBalance = z.infer<typeof DeferredRevenueBalanceSchema>;
export declare const RevRecReconciliationSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    snapshotId: z.ZodString;
    contractId: z.ZodString;
    periodStart: z.ZodString;
    periodEnd: z.ZodString;
    status: z.ZodEnum<["matched", "timing_variance", "amount_variance", "missing_invoice", "unmatched"]>;
    scheduledAmount: z.ZodNumber;
    invoicedAmount: z.ZodNumber;
    varianceAmount: z.ZodNumber;
    variancePct: z.ZodNullable<z.ZodNumber>;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "matched" | "timing_variance" | "amount_variance" | "missing_invoice" | "unmatched";
    id: string;
    snapshotId: string;
    tenantId: string;
    contractId: string;
    createdAt: string;
    periodStart: string;
    periodEnd: string;
    scheduledAmount: number;
    invoicedAmount: number;
    varianceAmount: number;
    variancePct: number | null;
    details?: Record<string, unknown> | undefined;
}, {
    status: "matched" | "timing_variance" | "amount_variance" | "missing_invoice" | "unmatched";
    id: string;
    snapshotId: string;
    tenantId: string;
    contractId: string;
    createdAt: string;
    periodStart: string;
    periodEnd: string;
    scheduledAmount: number;
    invoicedAmount: number;
    varianceAmount: number;
    variancePct: number | null;
    details?: Record<string, unknown> | undefined;
}>;
export type RevRecReconciliation = z.infer<typeof RevRecReconciliationSchema>;
export declare const RevRecComputeJobPayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<"revrec.compute">;
    tenantId: z.ZodString;
    snapshotId: z.ZodString;
    contractIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    forceRecompute: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "revrec.compute";
    snapshotId: string;
    tenantId: string;
    forceRecompute: boolean;
    contractIds?: string[] | undefined;
}, {
    type: "revrec.compute";
    snapshotId: string;
    tenantId: string;
    contractIds?: string[] | undefined;
    forceRecompute?: boolean | undefined;
}>;
export type RevRecComputeJobPayload = z.infer<typeof RevRecComputeJobPayloadSchema>;
export declare const RevRecReconcileJobPayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<"revrec.reconcile">;
    tenantId: z.ZodString;
    snapshotId: z.ZodString;
    periodStart: z.ZodString;
    periodEnd: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "revrec.reconcile";
    snapshotId: string;
    tenantId: string;
    periodStart: string;
    periodEnd: string;
}, {
    type: "revrec.reconcile";
    snapshotId: string;
    tenantId: string;
    periodStart: string;
    periodEnd: string;
}>;
export type RevRecReconcileJobPayload = z.infer<typeof RevRecReconcileJobPayloadSchema>;
export declare const RevRecSummarySchema: z.ZodObject<{
    snapshotId: z.ZodString;
    totalObligations: z.ZodNumber;
    totalTransactionValue: z.ZodNumber;
    totalRecognized: z.ZodNumber;
    totalDeferred: z.ZodNumber;
    reconciliationStatus: z.ZodObject<{
        matched: z.ZodNumber;
        timingVariance: z.ZodNumber;
        amountVariance: z.ZodNumber;
        unmatched: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        matched: number;
        unmatched: number;
        timingVariance: number;
        amountVariance: number;
    }, {
        matched: number;
        unmatched: number;
        timingVariance: number;
        amountVariance: number;
    }>;
    periodSummary: z.ZodOptional<z.ZodArray<z.ZodObject<{
        period: z.ZodString;
        recognized: z.ZodNumber;
        deferred: z.ZodNumber;
        invoiced: z.ZodNumber;
        variance: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        period: string;
        recognized: number;
        deferred: number;
        invoiced: number;
        variance: number;
    }, {
        period: string;
        recognized: number;
        deferred: number;
        invoiced: number;
        variance: number;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    snapshotId: string;
    totalObligations: number;
    totalTransactionValue: number;
    totalRecognized: number;
    totalDeferred: number;
    reconciliationStatus: {
        matched: number;
        unmatched: number;
        timingVariance: number;
        amountVariance: number;
    };
    periodSummary?: {
        period: string;
        recognized: number;
        deferred: number;
        invoiced: number;
        variance: number;
    }[] | undefined;
}, {
    snapshotId: string;
    totalObligations: number;
    totalTransactionValue: number;
    totalRecognized: number;
    totalDeferred: number;
    reconciliationStatus: {
        matched: number;
        unmatched: number;
        timingVariance: number;
        amountVariance: number;
    };
    periodSummary?: {
        period: string;
        recognized: number;
        deferred: number;
        invoiced: number;
        variance: number;
    }[] | undefined;
}>;
export type RevRecSummary = z.infer<typeof RevRecSummarySchema>;
export declare const TriggerRevRecComputeRequestSchema: z.ZodObject<{
    snapshotId: z.ZodString;
    contractIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    forceRecompute: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    snapshotId: string;
    contractIds?: string[] | undefined;
    forceRecompute?: boolean | undefined;
}, {
    snapshotId: string;
    contractIds?: string[] | undefined;
    forceRecompute?: boolean | undefined;
}>;
export type TriggerRevRecComputeRequest = z.infer<typeof TriggerRevRecComputeRequestSchema>;
export declare const TriggerRevRecReconcileRequestSchema: z.ZodObject<{
    snapshotId: z.ZodString;
    periodStart: z.ZodString;
    periodEnd: z.ZodString;
}, "strip", z.ZodTypeAny, {
    snapshotId: string;
    periodStart: string;
    periodEnd: string;
}, {
    snapshotId: string;
    periodStart: string;
    periodEnd: string;
}>;
export type TriggerRevRecReconcileRequest = z.infer<typeof TriggerRevRecReconcileRequestSchema>;
//# sourceMappingURL=revrec.d.ts.map