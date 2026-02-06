/**
 * Simulation Engine Schemas (Phase 9)
 *
 * Zod schemas for simulations, overrides, runs, results, and templates.
 */
import { z } from 'zod';
export type SimulationId = string & {
    readonly __brand: 'SimulationId';
};
export type SimulationOverrideId = string & {
    readonly __brand: 'SimulationOverrideId';
};
export type SimulationRunId = string & {
    readonly __brand: 'SimulationRunId';
};
export type SimulationResultId = string & {
    readonly __brand: 'SimulationResultId';
};
export type SimulationDeltaId = string & {
    readonly __brand: 'SimulationDeltaId';
};
export type SimulationTemplateId = string & {
    readonly __brand: 'SimulationTemplateId';
};
export type SimulationAuditId = string & {
    readonly __brand: 'SimulationAuditId';
};
export declare const generateSimulationId: () => SimulationId;
export declare const generateSimulationOverrideId: () => SimulationOverrideId;
export declare const generateSimulationRunId: () => SimulationRunId;
export declare const generateSimulationResultId: () => SimulationResultId;
export declare const generateSimulationDeltaId: () => SimulationDeltaId;
export declare const generateSimulationTemplateId: () => SimulationTemplateId;
export declare const generateSimulationAuditId: () => SimulationAuditId;
export declare const SimulationStatusSchema: z.ZodEnum<["draft", "pending", "running", "completed", "failed", "cancelled"]>;
export type SimulationStatus = z.infer<typeof SimulationStatusSchema>;
export declare const SimulationRunStatusSchema: z.ZodEnum<["pending", "running", "completed", "failed", "cancelled"]>;
export type SimulationRunStatus = z.infer<typeof SimulationRunStatusSchema>;
export declare const OverrideTypeSchema: z.ZodEnum<["contract_term", "usage_adjustment", "billing_adjustment", "timing_shift", "discount_change", "price_change"]>;
export type OverrideType = z.infer<typeof OverrideTypeSchema>;
export declare const TargetTypeSchema: z.ZodEnum<["contract", "invoice", "customer", "obligation", "line_item"]>;
export type TargetType = z.infer<typeof TargetTypeSchema>;
export declare const DeltaTypeSchema: z.ZodEnum<["revenue_total", "revenue_period", "recognized_shift", "deferred_shift", "contract_impact", "obligation_impact"]>;
export type DeltaType = z.infer<typeof DeltaTypeSchema>;
export declare const SimulationAuditActionSchema: z.ZodEnum<["created", "updated", "deleted", "override_added", "override_removed", "run_started", "run_completed", "run_failed", "template_applied"]>;
export type SimulationAuditAction = z.infer<typeof SimulationAuditActionSchema>;
export declare const ContractTermOverrideSchema: z.ZodObject<{
    targetId: z.ZodString;
    originalValue: z.ZodOptional<z.ZodUnknown>;
    sequenceNumber: z.ZodDefault<z.ZodNumber>;
} & {
    overrideType: z.ZodLiteral<"contract_term">;
    targetType: z.ZodLiteral<"contract">;
    fieldPath: z.ZodEnum<["arr", "discount_rate", "billing_frequency", "start_date", "end_date", "currency", "name"]>;
    overrideValue: z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodDate]>;
}, "strip", z.ZodTypeAny, {
    sequenceNumber: number;
    overrideValue: string | number | Date;
    targetId: string;
    targetType: "contract";
    fieldPath: "name" | "currency" | "start_date" | "end_date" | "arr" | "discount_rate" | "billing_frequency";
    overrideType: "contract_term";
    originalValue?: unknown;
}, {
    overrideValue: string | number | Date;
    targetId: string;
    targetType: "contract";
    fieldPath: "name" | "currency" | "start_date" | "end_date" | "arr" | "discount_rate" | "billing_frequency";
    overrideType: "contract_term";
    sequenceNumber?: number | undefined;
    originalValue?: unknown;
}>;
export type ContractTermOverride = z.infer<typeof ContractTermOverrideSchema>;
export declare const UsageAdjustmentOverrideSchema: z.ZodObject<{
    targetId: z.ZodString;
    fieldPath: z.ZodOptional<z.ZodString>;
    originalValue: z.ZodOptional<z.ZodUnknown>;
    overrideValue: z.ZodUnknown;
    sequenceNumber: z.ZodDefault<z.ZodNumber>;
} & {
    overrideType: z.ZodLiteral<"usage_adjustment">;
    targetType: z.ZodLiteral<"contract">;
    action: z.ZodEnum<["add", "remove", "modify"]>;
    usageEvents: z.ZodOptional<z.ZodArray<z.ZodObject<{
        eventId: z.ZodOptional<z.ZodString>;
        quantity: z.ZodNumber;
        unitPrice: z.ZodOptional<z.ZodNumber>;
        eventDate: z.ZodString;
        metricName: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        eventDate: string;
        quantity: number;
        eventId?: string | undefined;
        unitPrice?: number | undefined;
        metricName?: string | undefined;
    }, {
        eventDate: string;
        quantity: number;
        eventId?: string | undefined;
        unitPrice?: number | undefined;
        metricName?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    sequenceNumber: number;
    action: "add" | "remove" | "modify";
    targetId: string;
    targetType: "contract";
    overrideType: "usage_adjustment";
    overrideValue?: unknown;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    usageEvents?: {
        eventDate: string;
        quantity: number;
        eventId?: string | undefined;
        unitPrice?: number | undefined;
        metricName?: string | undefined;
    }[] | undefined;
}, {
    action: "add" | "remove" | "modify";
    targetId: string;
    targetType: "contract";
    overrideType: "usage_adjustment";
    sequenceNumber?: number | undefined;
    overrideValue?: unknown;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    usageEvents?: {
        eventDate: string;
        quantity: number;
        eventId?: string | undefined;
        unitPrice?: number | undefined;
        metricName?: string | undefined;
    }[] | undefined;
}>;
export type UsageAdjustmentOverride = z.infer<typeof UsageAdjustmentOverrideSchema>;
export declare const BillingAdjustmentOverrideSchema: z.ZodObject<{
    targetId: z.ZodString;
    fieldPath: z.ZodOptional<z.ZodString>;
    originalValue: z.ZodOptional<z.ZodUnknown>;
    overrideValue: z.ZodUnknown;
    sequenceNumber: z.ZodDefault<z.ZodNumber>;
} & {
    overrideType: z.ZodLiteral<"billing_adjustment">;
    targetType: z.ZodEnum<["invoice", "line_item"]>;
    adjustmentType: z.ZodEnum<["credit", "discount", "fee", "correction"]>;
    adjustmentAmount: z.ZodNumber;
    adjustmentPct: z.ZodOptional<z.ZodNumber>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sequenceNumber: number;
    targetId: string;
    targetType: "invoice" | "line_item";
    overrideType: "billing_adjustment";
    adjustmentType: "discount" | "credit" | "fee" | "correction";
    adjustmentAmount: number;
    overrideValue?: unknown;
    reason?: string | undefined;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    adjustmentPct?: number | undefined;
}, {
    targetId: string;
    targetType: "invoice" | "line_item";
    overrideType: "billing_adjustment";
    adjustmentType: "discount" | "credit" | "fee" | "correction";
    adjustmentAmount: number;
    sequenceNumber?: number | undefined;
    overrideValue?: unknown;
    reason?: string | undefined;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    adjustmentPct?: number | undefined;
}>;
export type BillingAdjustmentOverride = z.infer<typeof BillingAdjustmentOverrideSchema>;
export declare const TimingShiftOverrideSchema: z.ZodObject<{
    targetId: z.ZodString;
    fieldPath: z.ZodOptional<z.ZodString>;
    originalValue: z.ZodOptional<z.ZodUnknown>;
    overrideValue: z.ZodUnknown;
    sequenceNumber: z.ZodDefault<z.ZodNumber>;
} & {
    overrideType: z.ZodLiteral<"timing_shift">;
    targetType: z.ZodEnum<["contract", "obligation"]>;
    shiftType: z.ZodEnum<["start_date", "end_date", "recognition_start", "recognition_end"]>;
    shiftDays: z.ZodOptional<z.ZodNumber>;
    newDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sequenceNumber: number;
    targetId: string;
    targetType: "contract" | "obligation";
    overrideType: "timing_shift";
    shiftType: "start_date" | "end_date" | "recognition_start" | "recognition_end";
    overrideValue?: unknown;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    shiftDays?: number | undefined;
    newDate?: string | undefined;
}, {
    targetId: string;
    targetType: "contract" | "obligation";
    overrideType: "timing_shift";
    shiftType: "start_date" | "end_date" | "recognition_start" | "recognition_end";
    sequenceNumber?: number | undefined;
    overrideValue?: unknown;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    shiftDays?: number | undefined;
    newDate?: string | undefined;
}>;
export type TimingShiftOverride = z.infer<typeof TimingShiftOverrideSchema>;
export declare const DiscountChangeOverrideSchema: z.ZodObject<{
    targetId: z.ZodString;
    fieldPath: z.ZodOptional<z.ZodString>;
    originalValue: z.ZodOptional<z.ZodUnknown>;
    overrideValue: z.ZodUnknown;
    sequenceNumber: z.ZodDefault<z.ZodNumber>;
} & {
    overrideType: z.ZodLiteral<"discount_change">;
    targetType: z.ZodEnum<["contract", "invoice", "line_item"]>;
    discountPct: z.ZodOptional<z.ZodNumber>;
    discountAmount: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    sequenceNumber: number;
    targetId: string;
    targetType: "invoice" | "contract" | "line_item";
    overrideType: "discount_change";
    overrideValue?: unknown;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    discountPct?: number | undefined;
    discountAmount?: number | undefined;
}, {
    targetId: string;
    targetType: "invoice" | "contract" | "line_item";
    overrideType: "discount_change";
    sequenceNumber?: number | undefined;
    overrideValue?: unknown;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    discountPct?: number | undefined;
    discountAmount?: number | undefined;
}>;
export type DiscountChangeOverride = z.infer<typeof DiscountChangeOverrideSchema>;
export declare const PriceChangeOverrideSchema: z.ZodObject<{
    targetId: z.ZodString;
    fieldPath: z.ZodOptional<z.ZodString>;
    originalValue: z.ZodOptional<z.ZodUnknown>;
    overrideValue: z.ZodUnknown;
    sequenceNumber: z.ZodDefault<z.ZodNumber>;
} & {
    overrideType: z.ZodLiteral<"price_change">;
    targetType: z.ZodEnum<["contract", "line_item", "obligation"]>;
    priceDelta: z.ZodOptional<z.ZodNumber>;
    pricePct: z.ZodOptional<z.ZodNumber>;
    newPrice: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    sequenceNumber: number;
    targetId: string;
    targetType: "contract" | "obligation" | "line_item";
    overrideType: "price_change";
    overrideValue?: unknown;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    priceDelta?: number | undefined;
    pricePct?: number | undefined;
    newPrice?: number | undefined;
}, {
    targetId: string;
    targetType: "contract" | "obligation" | "line_item";
    overrideType: "price_change";
    sequenceNumber?: number | undefined;
    overrideValue?: unknown;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    priceDelta?: number | undefined;
    pricePct?: number | undefined;
    newPrice?: number | undefined;
}>;
export type PriceChangeOverride = z.infer<typeof PriceChangeOverrideSchema>;
export declare const SimulationOverridePayloadSchema: z.ZodDiscriminatedUnion<"overrideType", [z.ZodObject<{
    targetId: z.ZodString;
    originalValue: z.ZodOptional<z.ZodUnknown>;
    sequenceNumber: z.ZodDefault<z.ZodNumber>;
} & {
    overrideType: z.ZodLiteral<"contract_term">;
    targetType: z.ZodLiteral<"contract">;
    fieldPath: z.ZodEnum<["arr", "discount_rate", "billing_frequency", "start_date", "end_date", "currency", "name"]>;
    overrideValue: z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodDate]>;
}, "strip", z.ZodTypeAny, {
    sequenceNumber: number;
    overrideValue: string | number | Date;
    targetId: string;
    targetType: "contract";
    fieldPath: "name" | "currency" | "start_date" | "end_date" | "arr" | "discount_rate" | "billing_frequency";
    overrideType: "contract_term";
    originalValue?: unknown;
}, {
    overrideValue: string | number | Date;
    targetId: string;
    targetType: "contract";
    fieldPath: "name" | "currency" | "start_date" | "end_date" | "arr" | "discount_rate" | "billing_frequency";
    overrideType: "contract_term";
    sequenceNumber?: number | undefined;
    originalValue?: unknown;
}>, z.ZodObject<{
    targetId: z.ZodString;
    fieldPath: z.ZodOptional<z.ZodString>;
    originalValue: z.ZodOptional<z.ZodUnknown>;
    overrideValue: z.ZodUnknown;
    sequenceNumber: z.ZodDefault<z.ZodNumber>;
} & {
    overrideType: z.ZodLiteral<"usage_adjustment">;
    targetType: z.ZodLiteral<"contract">;
    action: z.ZodEnum<["add", "remove", "modify"]>;
    usageEvents: z.ZodOptional<z.ZodArray<z.ZodObject<{
        eventId: z.ZodOptional<z.ZodString>;
        quantity: z.ZodNumber;
        unitPrice: z.ZodOptional<z.ZodNumber>;
        eventDate: z.ZodString;
        metricName: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        eventDate: string;
        quantity: number;
        eventId?: string | undefined;
        unitPrice?: number | undefined;
        metricName?: string | undefined;
    }, {
        eventDate: string;
        quantity: number;
        eventId?: string | undefined;
        unitPrice?: number | undefined;
        metricName?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    sequenceNumber: number;
    action: "add" | "remove" | "modify";
    targetId: string;
    targetType: "contract";
    overrideType: "usage_adjustment";
    overrideValue?: unknown;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    usageEvents?: {
        eventDate: string;
        quantity: number;
        eventId?: string | undefined;
        unitPrice?: number | undefined;
        metricName?: string | undefined;
    }[] | undefined;
}, {
    action: "add" | "remove" | "modify";
    targetId: string;
    targetType: "contract";
    overrideType: "usage_adjustment";
    sequenceNumber?: number | undefined;
    overrideValue?: unknown;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    usageEvents?: {
        eventDate: string;
        quantity: number;
        eventId?: string | undefined;
        unitPrice?: number | undefined;
        metricName?: string | undefined;
    }[] | undefined;
}>, z.ZodObject<{
    targetId: z.ZodString;
    fieldPath: z.ZodOptional<z.ZodString>;
    originalValue: z.ZodOptional<z.ZodUnknown>;
    overrideValue: z.ZodUnknown;
    sequenceNumber: z.ZodDefault<z.ZodNumber>;
} & {
    overrideType: z.ZodLiteral<"billing_adjustment">;
    targetType: z.ZodEnum<["invoice", "line_item"]>;
    adjustmentType: z.ZodEnum<["credit", "discount", "fee", "correction"]>;
    adjustmentAmount: z.ZodNumber;
    adjustmentPct: z.ZodOptional<z.ZodNumber>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sequenceNumber: number;
    targetId: string;
    targetType: "invoice" | "line_item";
    overrideType: "billing_adjustment";
    adjustmentType: "discount" | "credit" | "fee" | "correction";
    adjustmentAmount: number;
    overrideValue?: unknown;
    reason?: string | undefined;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    adjustmentPct?: number | undefined;
}, {
    targetId: string;
    targetType: "invoice" | "line_item";
    overrideType: "billing_adjustment";
    adjustmentType: "discount" | "credit" | "fee" | "correction";
    adjustmentAmount: number;
    sequenceNumber?: number | undefined;
    overrideValue?: unknown;
    reason?: string | undefined;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    adjustmentPct?: number | undefined;
}>, z.ZodObject<{
    targetId: z.ZodString;
    fieldPath: z.ZodOptional<z.ZodString>;
    originalValue: z.ZodOptional<z.ZodUnknown>;
    overrideValue: z.ZodUnknown;
    sequenceNumber: z.ZodDefault<z.ZodNumber>;
} & {
    overrideType: z.ZodLiteral<"timing_shift">;
    targetType: z.ZodEnum<["contract", "obligation"]>;
    shiftType: z.ZodEnum<["start_date", "end_date", "recognition_start", "recognition_end"]>;
    shiftDays: z.ZodOptional<z.ZodNumber>;
    newDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sequenceNumber: number;
    targetId: string;
    targetType: "contract" | "obligation";
    overrideType: "timing_shift";
    shiftType: "start_date" | "end_date" | "recognition_start" | "recognition_end";
    overrideValue?: unknown;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    shiftDays?: number | undefined;
    newDate?: string | undefined;
}, {
    targetId: string;
    targetType: "contract" | "obligation";
    overrideType: "timing_shift";
    shiftType: "start_date" | "end_date" | "recognition_start" | "recognition_end";
    sequenceNumber?: number | undefined;
    overrideValue?: unknown;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    shiftDays?: number | undefined;
    newDate?: string | undefined;
}>, z.ZodObject<{
    targetId: z.ZodString;
    fieldPath: z.ZodOptional<z.ZodString>;
    originalValue: z.ZodOptional<z.ZodUnknown>;
    overrideValue: z.ZodUnknown;
    sequenceNumber: z.ZodDefault<z.ZodNumber>;
} & {
    overrideType: z.ZodLiteral<"discount_change">;
    targetType: z.ZodEnum<["contract", "invoice", "line_item"]>;
    discountPct: z.ZodOptional<z.ZodNumber>;
    discountAmount: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    sequenceNumber: number;
    targetId: string;
    targetType: "invoice" | "contract" | "line_item";
    overrideType: "discount_change";
    overrideValue?: unknown;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    discountPct?: number | undefined;
    discountAmount?: number | undefined;
}, {
    targetId: string;
    targetType: "invoice" | "contract" | "line_item";
    overrideType: "discount_change";
    sequenceNumber?: number | undefined;
    overrideValue?: unknown;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    discountPct?: number | undefined;
    discountAmount?: number | undefined;
}>, z.ZodObject<{
    targetId: z.ZodString;
    fieldPath: z.ZodOptional<z.ZodString>;
    originalValue: z.ZodOptional<z.ZodUnknown>;
    overrideValue: z.ZodUnknown;
    sequenceNumber: z.ZodDefault<z.ZodNumber>;
} & {
    overrideType: z.ZodLiteral<"price_change">;
    targetType: z.ZodEnum<["contract", "line_item", "obligation"]>;
    priceDelta: z.ZodOptional<z.ZodNumber>;
    pricePct: z.ZodOptional<z.ZodNumber>;
    newPrice: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    sequenceNumber: number;
    targetId: string;
    targetType: "contract" | "obligation" | "line_item";
    overrideType: "price_change";
    overrideValue?: unknown;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    priceDelta?: number | undefined;
    pricePct?: number | undefined;
    newPrice?: number | undefined;
}, {
    targetId: string;
    targetType: "contract" | "obligation" | "line_item";
    overrideType: "price_change";
    sequenceNumber?: number | undefined;
    overrideValue?: unknown;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    priceDelta?: number | undefined;
    pricePct?: number | undefined;
    newPrice?: number | undefined;
}>]>;
export type SimulationOverridePayload = z.infer<typeof SimulationOverridePayloadSchema>;
export declare const SimulationOverrideSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    simulationId: z.ZodString;
    overrideType: z.ZodEnum<["contract_term", "usage_adjustment", "billing_adjustment", "timing_shift", "discount_change", "price_change"]>;
    targetType: z.ZodEnum<["contract", "invoice", "customer", "obligation", "line_item"]>;
    targetId: z.ZodString;
    fieldPath: z.ZodNullable<z.ZodString>;
    originalValueJson: z.ZodNullable<z.ZodUnknown>;
    overrideValueJson: z.ZodUnknown;
    sequenceNumber: z.ZodNumber;
    isValid: z.ZodBoolean;
    validationMessage: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenantId: string;
    sequenceNumber: number;
    createdAt: Date;
    targetId: string;
    targetType: "customer" | "invoice" | "contract" | "obligation" | "line_item";
    fieldPath: string | null;
    overrideType: "contract_term" | "usage_adjustment" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
    simulationId: string;
    isValid: boolean;
    validationMessage: string | null;
    originalValueJson?: unknown;
    overrideValueJson?: unknown;
}, {
    id: string;
    tenantId: string;
    sequenceNumber: number;
    createdAt: Date;
    targetId: string;
    targetType: "customer" | "invoice" | "contract" | "obligation" | "line_item";
    fieldPath: string | null;
    overrideType: "contract_term" | "usage_adjustment" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
    simulationId: string;
    isValid: boolean;
    validationMessage: string | null;
    originalValueJson?: unknown;
    overrideValueJson?: unknown;
}>;
export type SimulationOverride = z.infer<typeof SimulationOverrideSchema>;
export declare const SimulationSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    snapshotId: z.ZodString;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["draft", "pending", "running", "completed", "failed", "cancelled"]>;
    templateId: z.ZodNullable<z.ZodString>;
    createdBy: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "running" | "completed" | "failed" | "cancelled" | "draft";
    id: string;
    snapshotId: string;
    tenantId: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    templateId: string | null;
    createdBy: string | null;
}, {
    status: "pending" | "running" | "completed" | "failed" | "cancelled" | "draft";
    id: string;
    snapshotId: string;
    tenantId: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    templateId: string | null;
    createdBy: string | null;
}>;
export type Simulation = z.infer<typeof SimulationSchema>;
export declare const SimulationWithOverridesSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    snapshotId: z.ZodString;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["draft", "pending", "running", "completed", "failed", "cancelled"]>;
    templateId: z.ZodNullable<z.ZodString>;
    createdBy: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
} & {
    overrides: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        tenantId: z.ZodString;
        simulationId: z.ZodString;
        overrideType: z.ZodEnum<["contract_term", "usage_adjustment", "billing_adjustment", "timing_shift", "discount_change", "price_change"]>;
        targetType: z.ZodEnum<["contract", "invoice", "customer", "obligation", "line_item"]>;
        targetId: z.ZodString;
        fieldPath: z.ZodNullable<z.ZodString>;
        originalValueJson: z.ZodNullable<z.ZodUnknown>;
        overrideValueJson: z.ZodUnknown;
        sequenceNumber: z.ZodNumber;
        isValid: z.ZodBoolean;
        validationMessage: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        id: string;
        tenantId: string;
        sequenceNumber: number;
        createdAt: Date;
        targetId: string;
        targetType: "customer" | "invoice" | "contract" | "obligation" | "line_item";
        fieldPath: string | null;
        overrideType: "contract_term" | "usage_adjustment" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
        simulationId: string;
        isValid: boolean;
        validationMessage: string | null;
        originalValueJson?: unknown;
        overrideValueJson?: unknown;
    }, {
        id: string;
        tenantId: string;
        sequenceNumber: number;
        createdAt: Date;
        targetId: string;
        targetType: "customer" | "invoice" | "contract" | "obligation" | "line_item";
        fieldPath: string | null;
        overrideType: "contract_term" | "usage_adjustment" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
        simulationId: string;
        isValid: boolean;
        validationMessage: string | null;
        originalValueJson?: unknown;
        overrideValueJson?: unknown;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "running" | "completed" | "failed" | "cancelled" | "draft";
    id: string;
    snapshotId: string;
    tenantId: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    templateId: string | null;
    createdBy: string | null;
    overrides: {
        id: string;
        tenantId: string;
        sequenceNumber: number;
        createdAt: Date;
        targetId: string;
        targetType: "customer" | "invoice" | "contract" | "obligation" | "line_item";
        fieldPath: string | null;
        overrideType: "contract_term" | "usage_adjustment" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
        simulationId: string;
        isValid: boolean;
        validationMessage: string | null;
        originalValueJson?: unknown;
        overrideValueJson?: unknown;
    }[];
}, {
    status: "pending" | "running" | "completed" | "failed" | "cancelled" | "draft";
    id: string;
    snapshotId: string;
    tenantId: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    templateId: string | null;
    createdBy: string | null;
    overrides: {
        id: string;
        tenantId: string;
        sequenceNumber: number;
        createdAt: Date;
        targetId: string;
        targetType: "customer" | "invoice" | "contract" | "obligation" | "line_item";
        fieldPath: string | null;
        overrideType: "contract_term" | "usage_adjustment" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
        simulationId: string;
        isValid: boolean;
        validationMessage: string | null;
        originalValueJson?: unknown;
        overrideValueJson?: unknown;
    }[];
}>;
export type SimulationWithOverrides = z.infer<typeof SimulationWithOverridesSchema>;
export declare const SimulationRunSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    simulationId: z.ZodString;
    runNumber: z.ZodNumber;
    status: z.ZodEnum<["pending", "running", "completed", "failed", "cancelled"]>;
    startedAt: z.ZodNullable<z.ZodDate>;
    finishedAt: z.ZodNullable<z.ZodDate>;
    processingTimeMs: z.ZodNullable<z.ZodNumber>;
    triggeredBy: z.ZodNullable<z.ZodString>;
    optionsJson: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    errorCode: z.ZodNullable<z.ZodString>;
    errorMessage: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "running" | "completed" | "failed" | "cancelled";
    id: string;
    tenantId: string;
    createdAt: Date;
    errorCode: string | null;
    errorMessage: string | null;
    startedAt: Date | null;
    finishedAt: Date | null;
    processingTimeMs: number | null;
    simulationId: string;
    runNumber: number;
    triggeredBy: string | null;
    optionsJson: Record<string, unknown>;
}, {
    status: "pending" | "running" | "completed" | "failed" | "cancelled";
    id: string;
    tenantId: string;
    createdAt: Date;
    errorCode: string | null;
    errorMessage: string | null;
    startedAt: Date | null;
    finishedAt: Date | null;
    processingTimeMs: number | null;
    simulationId: string;
    runNumber: number;
    triggeredBy: string | null;
    optionsJson: Record<string, unknown>;
}>;
export type SimulationRun = z.infer<typeof SimulationRunSchema>;
export declare const SimulationResultSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    runId: z.ZodString;
    simulationId: z.ZodString;
    totalRevenueBaseline: z.ZodNullable<z.ZodNumber>;
    totalRevenueSimulated: z.ZodNullable<z.ZodNumber>;
    totalRevenueDelta: z.ZodNullable<z.ZodNumber>;
    totalRevenueDeltaPct: z.ZodNullable<z.ZodNumber>;
    totalRecognizedBaseline: z.ZodNullable<z.ZodNumber>;
    totalRecognizedSimulated: z.ZodNullable<z.ZodNumber>;
    totalDeferredBaseline: z.ZodNullable<z.ZodNumber>;
    totalDeferredSimulated: z.ZodNullable<z.ZodNumber>;
    contractsAffected: z.ZodNumber;
    obligationsAffected: z.ZodNumber;
    overridesApplied: z.ZodNumber;
    overridesSkipped: z.ZodNumber;
    summaryJson: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    warningsJson: z.ZodArray<z.ZodUnknown, "many">;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    runId: string;
    tenantId: string;
    createdAt: Date;
    simulationId: string;
    totalRevenueBaseline: number | null;
    totalRevenueSimulated: number | null;
    totalRevenueDelta: number | null;
    totalRevenueDeltaPct: number | null;
    totalRecognizedBaseline: number | null;
    totalRecognizedSimulated: number | null;
    totalDeferredBaseline: number | null;
    totalDeferredSimulated: number | null;
    contractsAffected: number;
    obligationsAffected: number;
    overridesApplied: number;
    overridesSkipped: number;
    summaryJson: Record<string, unknown>;
    warningsJson: unknown[];
}, {
    id: string;
    runId: string;
    tenantId: string;
    createdAt: Date;
    simulationId: string;
    totalRevenueBaseline: number | null;
    totalRevenueSimulated: number | null;
    totalRevenueDelta: number | null;
    totalRevenueDeltaPct: number | null;
    totalRecognizedBaseline: number | null;
    totalRecognizedSimulated: number | null;
    totalDeferredBaseline: number | null;
    totalDeferredSimulated: number | null;
    contractsAffected: number;
    obligationsAffected: number;
    overridesApplied: number;
    overridesSkipped: number;
    summaryJson: Record<string, unknown>;
    warningsJson: unknown[];
}>;
export type SimulationResult = z.infer<typeof SimulationResultSchema>;
export declare const SimulationDeltaSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    runId: z.ZodString;
    simulationId: z.ZodString;
    deltaType: z.ZodEnum<["revenue_total", "revenue_period", "recognized_shift", "deferred_shift", "contract_impact", "obligation_impact"]>;
    targetType: z.ZodNullable<z.ZodString>;
    targetId: z.ZodNullable<z.ZodString>;
    periodStart: z.ZodNullable<z.ZodDate>;
    periodEnd: z.ZodNullable<z.ZodDate>;
    baselineAmount: z.ZodNullable<z.ZodNumber>;
    simulatedAmount: z.ZodNullable<z.ZodNumber>;
    deltaAmount: z.ZodNumber;
    deltaPct: z.ZodNullable<z.ZodNumber>;
    currency: z.ZodString;
    detailsJson: z.ZodNullable<z.ZodUnknown>;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    runId: string;
    tenantId: string;
    currency: string;
    createdAt: Date;
    periodStart: Date | null;
    periodEnd: Date | null;
    targetId: string | null;
    targetType: string | null;
    simulationId: string;
    deltaType: "revenue_total" | "revenue_period" | "recognized_shift" | "deferred_shift" | "contract_impact" | "obligation_impact";
    baselineAmount: number | null;
    simulatedAmount: number | null;
    deltaAmount: number;
    deltaPct: number | null;
    detailsJson?: unknown;
}, {
    id: string;
    runId: string;
    tenantId: string;
    currency: string;
    createdAt: Date;
    periodStart: Date | null;
    periodEnd: Date | null;
    targetId: string | null;
    targetType: string | null;
    simulationId: string;
    deltaType: "revenue_total" | "revenue_period" | "recognized_shift" | "deferred_shift" | "contract_impact" | "obligation_impact";
    baselineAmount: number | null;
    simulatedAmount: number | null;
    deltaAmount: number;
    deltaPct: number | null;
    detailsJson?: unknown;
}>;
export type SimulationDelta = z.infer<typeof SimulationDeltaSchema>;
export declare const SimulationTemplateSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    templateJson: z.ZodObject<{
        overrides: z.ZodArray<z.ZodDiscriminatedUnion<"overrideType", [z.ZodObject<{
            targetId: z.ZodString;
            originalValue: z.ZodOptional<z.ZodUnknown>;
            sequenceNumber: z.ZodDefault<z.ZodNumber>;
        } & {
            overrideType: z.ZodLiteral<"contract_term">;
            targetType: z.ZodLiteral<"contract">;
            fieldPath: z.ZodEnum<["arr", "discount_rate", "billing_frequency", "start_date", "end_date", "currency", "name"]>;
            overrideValue: z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodDate]>;
        }, "strip", z.ZodTypeAny, {
            sequenceNumber: number;
            overrideValue: string | number | Date;
            targetId: string;
            targetType: "contract";
            fieldPath: "name" | "currency" | "start_date" | "end_date" | "arr" | "discount_rate" | "billing_frequency";
            overrideType: "contract_term";
            originalValue?: unknown;
        }, {
            overrideValue: string | number | Date;
            targetId: string;
            targetType: "contract";
            fieldPath: "name" | "currency" | "start_date" | "end_date" | "arr" | "discount_rate" | "billing_frequency";
            overrideType: "contract_term";
            sequenceNumber?: number | undefined;
            originalValue?: unknown;
        }>, z.ZodObject<{
            targetId: z.ZodString;
            fieldPath: z.ZodOptional<z.ZodString>;
            originalValue: z.ZodOptional<z.ZodUnknown>;
            overrideValue: z.ZodUnknown;
            sequenceNumber: z.ZodDefault<z.ZodNumber>;
        } & {
            overrideType: z.ZodLiteral<"usage_adjustment">;
            targetType: z.ZodLiteral<"contract">;
            action: z.ZodEnum<["add", "remove", "modify"]>;
            usageEvents: z.ZodOptional<z.ZodArray<z.ZodObject<{
                eventId: z.ZodOptional<z.ZodString>;
                quantity: z.ZodNumber;
                unitPrice: z.ZodOptional<z.ZodNumber>;
                eventDate: z.ZodString;
                metricName: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                eventDate: string;
                quantity: number;
                eventId?: string | undefined;
                unitPrice?: number | undefined;
                metricName?: string | undefined;
            }, {
                eventDate: string;
                quantity: number;
                eventId?: string | undefined;
                unitPrice?: number | undefined;
                metricName?: string | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            sequenceNumber: number;
            action: "add" | "remove" | "modify";
            targetId: string;
            targetType: "contract";
            overrideType: "usage_adjustment";
            overrideValue?: unknown;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            usageEvents?: {
                eventDate: string;
                quantity: number;
                eventId?: string | undefined;
                unitPrice?: number | undefined;
                metricName?: string | undefined;
            }[] | undefined;
        }, {
            action: "add" | "remove" | "modify";
            targetId: string;
            targetType: "contract";
            overrideType: "usage_adjustment";
            sequenceNumber?: number | undefined;
            overrideValue?: unknown;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            usageEvents?: {
                eventDate: string;
                quantity: number;
                eventId?: string | undefined;
                unitPrice?: number | undefined;
                metricName?: string | undefined;
            }[] | undefined;
        }>, z.ZodObject<{
            targetId: z.ZodString;
            fieldPath: z.ZodOptional<z.ZodString>;
            originalValue: z.ZodOptional<z.ZodUnknown>;
            overrideValue: z.ZodUnknown;
            sequenceNumber: z.ZodDefault<z.ZodNumber>;
        } & {
            overrideType: z.ZodLiteral<"billing_adjustment">;
            targetType: z.ZodEnum<["invoice", "line_item"]>;
            adjustmentType: z.ZodEnum<["credit", "discount", "fee", "correction"]>;
            adjustmentAmount: z.ZodNumber;
            adjustmentPct: z.ZodOptional<z.ZodNumber>;
            reason: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            sequenceNumber: number;
            targetId: string;
            targetType: "invoice" | "line_item";
            overrideType: "billing_adjustment";
            adjustmentType: "discount" | "credit" | "fee" | "correction";
            adjustmentAmount: number;
            overrideValue?: unknown;
            reason?: string | undefined;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            adjustmentPct?: number | undefined;
        }, {
            targetId: string;
            targetType: "invoice" | "line_item";
            overrideType: "billing_adjustment";
            adjustmentType: "discount" | "credit" | "fee" | "correction";
            adjustmentAmount: number;
            sequenceNumber?: number | undefined;
            overrideValue?: unknown;
            reason?: string | undefined;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            adjustmentPct?: number | undefined;
        }>, z.ZodObject<{
            targetId: z.ZodString;
            fieldPath: z.ZodOptional<z.ZodString>;
            originalValue: z.ZodOptional<z.ZodUnknown>;
            overrideValue: z.ZodUnknown;
            sequenceNumber: z.ZodDefault<z.ZodNumber>;
        } & {
            overrideType: z.ZodLiteral<"timing_shift">;
            targetType: z.ZodEnum<["contract", "obligation"]>;
            shiftType: z.ZodEnum<["start_date", "end_date", "recognition_start", "recognition_end"]>;
            shiftDays: z.ZodOptional<z.ZodNumber>;
            newDate: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            sequenceNumber: number;
            targetId: string;
            targetType: "contract" | "obligation";
            overrideType: "timing_shift";
            shiftType: "start_date" | "end_date" | "recognition_start" | "recognition_end";
            overrideValue?: unknown;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            shiftDays?: number | undefined;
            newDate?: string | undefined;
        }, {
            targetId: string;
            targetType: "contract" | "obligation";
            overrideType: "timing_shift";
            shiftType: "start_date" | "end_date" | "recognition_start" | "recognition_end";
            sequenceNumber?: number | undefined;
            overrideValue?: unknown;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            shiftDays?: number | undefined;
            newDate?: string | undefined;
        }>, z.ZodObject<{
            targetId: z.ZodString;
            fieldPath: z.ZodOptional<z.ZodString>;
            originalValue: z.ZodOptional<z.ZodUnknown>;
            overrideValue: z.ZodUnknown;
            sequenceNumber: z.ZodDefault<z.ZodNumber>;
        } & {
            overrideType: z.ZodLiteral<"discount_change">;
            targetType: z.ZodEnum<["contract", "invoice", "line_item"]>;
            discountPct: z.ZodOptional<z.ZodNumber>;
            discountAmount: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            sequenceNumber: number;
            targetId: string;
            targetType: "invoice" | "contract" | "line_item";
            overrideType: "discount_change";
            overrideValue?: unknown;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            discountPct?: number | undefined;
            discountAmount?: number | undefined;
        }, {
            targetId: string;
            targetType: "invoice" | "contract" | "line_item";
            overrideType: "discount_change";
            sequenceNumber?: number | undefined;
            overrideValue?: unknown;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            discountPct?: number | undefined;
            discountAmount?: number | undefined;
        }>, z.ZodObject<{
            targetId: z.ZodString;
            fieldPath: z.ZodOptional<z.ZodString>;
            originalValue: z.ZodOptional<z.ZodUnknown>;
            overrideValue: z.ZodUnknown;
            sequenceNumber: z.ZodDefault<z.ZodNumber>;
        } & {
            overrideType: z.ZodLiteral<"price_change">;
            targetType: z.ZodEnum<["contract", "line_item", "obligation"]>;
            priceDelta: z.ZodOptional<z.ZodNumber>;
            pricePct: z.ZodOptional<z.ZodNumber>;
            newPrice: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            sequenceNumber: number;
            targetId: string;
            targetType: "contract" | "obligation" | "line_item";
            overrideType: "price_change";
            overrideValue?: unknown;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            priceDelta?: number | undefined;
            pricePct?: number | undefined;
            newPrice?: number | undefined;
        }, {
            targetId: string;
            targetType: "contract" | "obligation" | "line_item";
            overrideType: "price_change";
            sequenceNumber?: number | undefined;
            overrideValue?: unknown;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            priceDelta?: number | undefined;
            pricePct?: number | undefined;
            newPrice?: number | undefined;
        }>]>, "many">;
        defaultOptions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        overrides: ({
            sequenceNumber: number;
            overrideValue: string | number | Date;
            targetId: string;
            targetType: "contract";
            fieldPath: "name" | "currency" | "start_date" | "end_date" | "arr" | "discount_rate" | "billing_frequency";
            overrideType: "contract_term";
            originalValue?: unknown;
        } | {
            sequenceNumber: number;
            action: "add" | "remove" | "modify";
            targetId: string;
            targetType: "contract";
            overrideType: "usage_adjustment";
            overrideValue?: unknown;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            usageEvents?: {
                eventDate: string;
                quantity: number;
                eventId?: string | undefined;
                unitPrice?: number | undefined;
                metricName?: string | undefined;
            }[] | undefined;
        } | {
            sequenceNumber: number;
            targetId: string;
            targetType: "invoice" | "line_item";
            overrideType: "billing_adjustment";
            adjustmentType: "discount" | "credit" | "fee" | "correction";
            adjustmentAmount: number;
            overrideValue?: unknown;
            reason?: string | undefined;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            adjustmentPct?: number | undefined;
        } | {
            sequenceNumber: number;
            targetId: string;
            targetType: "contract" | "obligation";
            overrideType: "timing_shift";
            shiftType: "start_date" | "end_date" | "recognition_start" | "recognition_end";
            overrideValue?: unknown;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            shiftDays?: number | undefined;
            newDate?: string | undefined;
        } | {
            sequenceNumber: number;
            targetId: string;
            targetType: "invoice" | "contract" | "line_item";
            overrideType: "discount_change";
            overrideValue?: unknown;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            discountPct?: number | undefined;
            discountAmount?: number | undefined;
        } | {
            sequenceNumber: number;
            targetId: string;
            targetType: "contract" | "obligation" | "line_item";
            overrideType: "price_change";
            overrideValue?: unknown;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            priceDelta?: number | undefined;
            pricePct?: number | undefined;
            newPrice?: number | undefined;
        })[];
        defaultOptions?: Record<string, unknown> | undefined;
    }, {
        overrides: ({
            overrideValue: string | number | Date;
            targetId: string;
            targetType: "contract";
            fieldPath: "name" | "currency" | "start_date" | "end_date" | "arr" | "discount_rate" | "billing_frequency";
            overrideType: "contract_term";
            sequenceNumber?: number | undefined;
            originalValue?: unknown;
        } | {
            action: "add" | "remove" | "modify";
            targetId: string;
            targetType: "contract";
            overrideType: "usage_adjustment";
            sequenceNumber?: number | undefined;
            overrideValue?: unknown;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            usageEvents?: {
                eventDate: string;
                quantity: number;
                eventId?: string | undefined;
                unitPrice?: number | undefined;
                metricName?: string | undefined;
            }[] | undefined;
        } | {
            targetId: string;
            targetType: "invoice" | "line_item";
            overrideType: "billing_adjustment";
            adjustmentType: "discount" | "credit" | "fee" | "correction";
            adjustmentAmount: number;
            sequenceNumber?: number | undefined;
            overrideValue?: unknown;
            reason?: string | undefined;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            adjustmentPct?: number | undefined;
        } | {
            targetId: string;
            targetType: "contract" | "obligation";
            overrideType: "timing_shift";
            shiftType: "start_date" | "end_date" | "recognition_start" | "recognition_end";
            sequenceNumber?: number | undefined;
            overrideValue?: unknown;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            shiftDays?: number | undefined;
            newDate?: string | undefined;
        } | {
            targetId: string;
            targetType: "invoice" | "contract" | "line_item";
            overrideType: "discount_change";
            sequenceNumber?: number | undefined;
            overrideValue?: unknown;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            discountPct?: number | undefined;
            discountAmount?: number | undefined;
        } | {
            targetId: string;
            targetType: "contract" | "obligation" | "line_item";
            overrideType: "price_change";
            sequenceNumber?: number | undefined;
            overrideValue?: unknown;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            priceDelta?: number | undefined;
            pricePct?: number | undefined;
            newPrice?: number | undefined;
        })[];
        defaultOptions?: Record<string, unknown> | undefined;
    }>;
    isActive: z.ZodBoolean;
    createdBy: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
    templateJson: {
        overrides: ({
            sequenceNumber: number;
            overrideValue: string | number | Date;
            targetId: string;
            targetType: "contract";
            fieldPath: "name" | "currency" | "start_date" | "end_date" | "arr" | "discount_rate" | "billing_frequency";
            overrideType: "contract_term";
            originalValue?: unknown;
        } | {
            sequenceNumber: number;
            action: "add" | "remove" | "modify";
            targetId: string;
            targetType: "contract";
            overrideType: "usage_adjustment";
            overrideValue?: unknown;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            usageEvents?: {
                eventDate: string;
                quantity: number;
                eventId?: string | undefined;
                unitPrice?: number | undefined;
                metricName?: string | undefined;
            }[] | undefined;
        } | {
            sequenceNumber: number;
            targetId: string;
            targetType: "invoice" | "line_item";
            overrideType: "billing_adjustment";
            adjustmentType: "discount" | "credit" | "fee" | "correction";
            adjustmentAmount: number;
            overrideValue?: unknown;
            reason?: string | undefined;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            adjustmentPct?: number | undefined;
        } | {
            sequenceNumber: number;
            targetId: string;
            targetType: "contract" | "obligation";
            overrideType: "timing_shift";
            shiftType: "start_date" | "end_date" | "recognition_start" | "recognition_end";
            overrideValue?: unknown;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            shiftDays?: number | undefined;
            newDate?: string | undefined;
        } | {
            sequenceNumber: number;
            targetId: string;
            targetType: "invoice" | "contract" | "line_item";
            overrideType: "discount_change";
            overrideValue?: unknown;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            discountPct?: number | undefined;
            discountAmount?: number | undefined;
        } | {
            sequenceNumber: number;
            targetId: string;
            targetType: "contract" | "obligation" | "line_item";
            overrideType: "price_change";
            overrideValue?: unknown;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            priceDelta?: number | undefined;
            pricePct?: number | undefined;
            newPrice?: number | undefined;
        })[];
        defaultOptions?: Record<string, unknown> | undefined;
    };
    isActive: boolean;
}, {
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
    templateJson: {
        overrides: ({
            overrideValue: string | number | Date;
            targetId: string;
            targetType: "contract";
            fieldPath: "name" | "currency" | "start_date" | "end_date" | "arr" | "discount_rate" | "billing_frequency";
            overrideType: "contract_term";
            sequenceNumber?: number | undefined;
            originalValue?: unknown;
        } | {
            action: "add" | "remove" | "modify";
            targetId: string;
            targetType: "contract";
            overrideType: "usage_adjustment";
            sequenceNumber?: number | undefined;
            overrideValue?: unknown;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            usageEvents?: {
                eventDate: string;
                quantity: number;
                eventId?: string | undefined;
                unitPrice?: number | undefined;
                metricName?: string | undefined;
            }[] | undefined;
        } | {
            targetId: string;
            targetType: "invoice" | "line_item";
            overrideType: "billing_adjustment";
            adjustmentType: "discount" | "credit" | "fee" | "correction";
            adjustmentAmount: number;
            sequenceNumber?: number | undefined;
            overrideValue?: unknown;
            reason?: string | undefined;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            adjustmentPct?: number | undefined;
        } | {
            targetId: string;
            targetType: "contract" | "obligation";
            overrideType: "timing_shift";
            shiftType: "start_date" | "end_date" | "recognition_start" | "recognition_end";
            sequenceNumber?: number | undefined;
            overrideValue?: unknown;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            shiftDays?: number | undefined;
            newDate?: string | undefined;
        } | {
            targetId: string;
            targetType: "invoice" | "contract" | "line_item";
            overrideType: "discount_change";
            sequenceNumber?: number | undefined;
            overrideValue?: unknown;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            discountPct?: number | undefined;
            discountAmount?: number | undefined;
        } | {
            targetId: string;
            targetType: "contract" | "obligation" | "line_item";
            overrideType: "price_change";
            sequenceNumber?: number | undefined;
            overrideValue?: unknown;
            fieldPath?: string | undefined;
            originalValue?: unknown;
            priceDelta?: number | undefined;
            pricePct?: number | undefined;
            newPrice?: number | undefined;
        })[];
        defaultOptions?: Record<string, unknown> | undefined;
    };
    isActive: boolean;
}>;
export type SimulationTemplate = z.infer<typeof SimulationTemplateSchema>;
export declare const SimulationAuditSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    simulationId: z.ZodNullable<z.ZodString>;
    runId: z.ZodNullable<z.ZodString>;
    action: z.ZodEnum<["created", "updated", "deleted", "override_added", "override_removed", "run_started", "run_completed", "run_failed", "template_applied"]>;
    actorUserId: z.ZodNullable<z.ZodString>;
    detailsJson: z.ZodNullable<z.ZodUnknown>;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    runId: string | null;
    tenantId: string;
    createdAt: Date;
    actorUserId: string | null;
    action: "created" | "updated" | "deleted" | "override_added" | "override_removed" | "run_started" | "run_completed" | "run_failed" | "template_applied";
    simulationId: string | null;
    detailsJson?: unknown;
}, {
    id: string;
    runId: string | null;
    tenantId: string;
    createdAt: Date;
    actorUserId: string | null;
    action: "created" | "updated" | "deleted" | "override_added" | "override_removed" | "run_started" | "run_completed" | "run_failed" | "template_applied";
    simulationId: string | null;
    detailsJson?: unknown;
}>;
export type SimulationAudit = z.infer<typeof SimulationAuditSchema>;
export declare const SimulationListQuerySchema: z.ZodObject<{
    snapshotId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["draft", "pending", "running", "completed", "failed", "cancelled"]>>;
    templateId: z.ZodOptional<z.ZodString>;
    createdBy: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodDefault<z.ZodEnum<["created_at", "updated_at", "name", "status"]>>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    sortBy: "status" | "name" | "created_at" | "updated_at";
    sortOrder: "asc" | "desc";
    status?: "pending" | "running" | "completed" | "failed" | "cancelled" | "draft" | undefined;
    snapshotId?: string | undefined;
    templateId?: string | undefined;
    createdBy?: string | undefined;
}, {
    status?: "pending" | "running" | "completed" | "failed" | "cancelled" | "draft" | undefined;
    snapshotId?: string | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    sortBy?: "status" | "name" | "created_at" | "updated_at" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    templateId?: string | undefined;
    createdBy?: string | undefined;
}>;
export type SimulationListQuery = z.infer<typeof SimulationListQuerySchema>;
export declare const CreateSimulationSchema: z.ZodObject<{
    snapshotId: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    templateId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    snapshotId: string;
    name: string;
    description?: string | undefined;
    templateId?: string | undefined;
}, {
    snapshotId: string;
    name: string;
    description?: string | undefined;
    templateId?: string | undefined;
}>;
export type CreateSimulation = z.infer<typeof CreateSimulationSchema>;
export declare const UpdateSimulationSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["draft", "cancelled"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "cancelled" | "draft" | undefined;
    name?: string | undefined;
    description?: string | undefined;
}, {
    status?: "cancelled" | "draft" | undefined;
    name?: string | undefined;
    description?: string | undefined;
}>;
export type UpdateSimulation = z.infer<typeof UpdateSimulationSchema>;
export declare const AddOverrideSchema: z.ZodDiscriminatedUnion<"overrideType", [z.ZodObject<{
    targetId: z.ZodString;
    originalValue: z.ZodOptional<z.ZodUnknown>;
    sequenceNumber: z.ZodDefault<z.ZodNumber>;
} & {
    overrideType: z.ZodLiteral<"contract_term">;
    targetType: z.ZodLiteral<"contract">;
    fieldPath: z.ZodEnum<["arr", "discount_rate", "billing_frequency", "start_date", "end_date", "currency", "name"]>;
    overrideValue: z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodDate]>;
}, "strip", z.ZodTypeAny, {
    sequenceNumber: number;
    overrideValue: string | number | Date;
    targetId: string;
    targetType: "contract";
    fieldPath: "name" | "currency" | "start_date" | "end_date" | "arr" | "discount_rate" | "billing_frequency";
    overrideType: "contract_term";
    originalValue?: unknown;
}, {
    overrideValue: string | number | Date;
    targetId: string;
    targetType: "contract";
    fieldPath: "name" | "currency" | "start_date" | "end_date" | "arr" | "discount_rate" | "billing_frequency";
    overrideType: "contract_term";
    sequenceNumber?: number | undefined;
    originalValue?: unknown;
}>, z.ZodObject<{
    targetId: z.ZodString;
    fieldPath: z.ZodOptional<z.ZodString>;
    originalValue: z.ZodOptional<z.ZodUnknown>;
    overrideValue: z.ZodUnknown;
    sequenceNumber: z.ZodDefault<z.ZodNumber>;
} & {
    overrideType: z.ZodLiteral<"usage_adjustment">;
    targetType: z.ZodLiteral<"contract">;
    action: z.ZodEnum<["add", "remove", "modify"]>;
    usageEvents: z.ZodOptional<z.ZodArray<z.ZodObject<{
        eventId: z.ZodOptional<z.ZodString>;
        quantity: z.ZodNumber;
        unitPrice: z.ZodOptional<z.ZodNumber>;
        eventDate: z.ZodString;
        metricName: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        eventDate: string;
        quantity: number;
        eventId?: string | undefined;
        unitPrice?: number | undefined;
        metricName?: string | undefined;
    }, {
        eventDate: string;
        quantity: number;
        eventId?: string | undefined;
        unitPrice?: number | undefined;
        metricName?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    sequenceNumber: number;
    action: "add" | "remove" | "modify";
    targetId: string;
    targetType: "contract";
    overrideType: "usage_adjustment";
    overrideValue?: unknown;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    usageEvents?: {
        eventDate: string;
        quantity: number;
        eventId?: string | undefined;
        unitPrice?: number | undefined;
        metricName?: string | undefined;
    }[] | undefined;
}, {
    action: "add" | "remove" | "modify";
    targetId: string;
    targetType: "contract";
    overrideType: "usage_adjustment";
    sequenceNumber?: number | undefined;
    overrideValue?: unknown;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    usageEvents?: {
        eventDate: string;
        quantity: number;
        eventId?: string | undefined;
        unitPrice?: number | undefined;
        metricName?: string | undefined;
    }[] | undefined;
}>, z.ZodObject<{
    targetId: z.ZodString;
    fieldPath: z.ZodOptional<z.ZodString>;
    originalValue: z.ZodOptional<z.ZodUnknown>;
    overrideValue: z.ZodUnknown;
    sequenceNumber: z.ZodDefault<z.ZodNumber>;
} & {
    overrideType: z.ZodLiteral<"billing_adjustment">;
    targetType: z.ZodEnum<["invoice", "line_item"]>;
    adjustmentType: z.ZodEnum<["credit", "discount", "fee", "correction"]>;
    adjustmentAmount: z.ZodNumber;
    adjustmentPct: z.ZodOptional<z.ZodNumber>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sequenceNumber: number;
    targetId: string;
    targetType: "invoice" | "line_item";
    overrideType: "billing_adjustment";
    adjustmentType: "discount" | "credit" | "fee" | "correction";
    adjustmentAmount: number;
    overrideValue?: unknown;
    reason?: string | undefined;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    adjustmentPct?: number | undefined;
}, {
    targetId: string;
    targetType: "invoice" | "line_item";
    overrideType: "billing_adjustment";
    adjustmentType: "discount" | "credit" | "fee" | "correction";
    adjustmentAmount: number;
    sequenceNumber?: number | undefined;
    overrideValue?: unknown;
    reason?: string | undefined;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    adjustmentPct?: number | undefined;
}>, z.ZodObject<{
    targetId: z.ZodString;
    fieldPath: z.ZodOptional<z.ZodString>;
    originalValue: z.ZodOptional<z.ZodUnknown>;
    overrideValue: z.ZodUnknown;
    sequenceNumber: z.ZodDefault<z.ZodNumber>;
} & {
    overrideType: z.ZodLiteral<"timing_shift">;
    targetType: z.ZodEnum<["contract", "obligation"]>;
    shiftType: z.ZodEnum<["start_date", "end_date", "recognition_start", "recognition_end"]>;
    shiftDays: z.ZodOptional<z.ZodNumber>;
    newDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sequenceNumber: number;
    targetId: string;
    targetType: "contract" | "obligation";
    overrideType: "timing_shift";
    shiftType: "start_date" | "end_date" | "recognition_start" | "recognition_end";
    overrideValue?: unknown;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    shiftDays?: number | undefined;
    newDate?: string | undefined;
}, {
    targetId: string;
    targetType: "contract" | "obligation";
    overrideType: "timing_shift";
    shiftType: "start_date" | "end_date" | "recognition_start" | "recognition_end";
    sequenceNumber?: number | undefined;
    overrideValue?: unknown;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    shiftDays?: number | undefined;
    newDate?: string | undefined;
}>, z.ZodObject<{
    targetId: z.ZodString;
    fieldPath: z.ZodOptional<z.ZodString>;
    originalValue: z.ZodOptional<z.ZodUnknown>;
    overrideValue: z.ZodUnknown;
    sequenceNumber: z.ZodDefault<z.ZodNumber>;
} & {
    overrideType: z.ZodLiteral<"discount_change">;
    targetType: z.ZodEnum<["contract", "invoice", "line_item"]>;
    discountPct: z.ZodOptional<z.ZodNumber>;
    discountAmount: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    sequenceNumber: number;
    targetId: string;
    targetType: "invoice" | "contract" | "line_item";
    overrideType: "discount_change";
    overrideValue?: unknown;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    discountPct?: number | undefined;
    discountAmount?: number | undefined;
}, {
    targetId: string;
    targetType: "invoice" | "contract" | "line_item";
    overrideType: "discount_change";
    sequenceNumber?: number | undefined;
    overrideValue?: unknown;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    discountPct?: number | undefined;
    discountAmount?: number | undefined;
}>, z.ZodObject<{
    targetId: z.ZodString;
    fieldPath: z.ZodOptional<z.ZodString>;
    originalValue: z.ZodOptional<z.ZodUnknown>;
    overrideValue: z.ZodUnknown;
    sequenceNumber: z.ZodDefault<z.ZodNumber>;
} & {
    overrideType: z.ZodLiteral<"price_change">;
    targetType: z.ZodEnum<["contract", "line_item", "obligation"]>;
    priceDelta: z.ZodOptional<z.ZodNumber>;
    pricePct: z.ZodOptional<z.ZodNumber>;
    newPrice: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    sequenceNumber: number;
    targetId: string;
    targetType: "contract" | "obligation" | "line_item";
    overrideType: "price_change";
    overrideValue?: unknown;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    priceDelta?: number | undefined;
    pricePct?: number | undefined;
    newPrice?: number | undefined;
}, {
    targetId: string;
    targetType: "contract" | "obligation" | "line_item";
    overrideType: "price_change";
    sequenceNumber?: number | undefined;
    overrideValue?: unknown;
    fieldPath?: string | undefined;
    originalValue?: unknown;
    priceDelta?: number | undefined;
    pricePct?: number | undefined;
    newPrice?: number | undefined;
}>]>;
export type AddOverride = z.infer<typeof AddOverrideSchema>;
export declare const RunSimulationSchema: z.ZodObject<{
    recomputeRevRec: z.ZodDefault<z.ZodBoolean>;
    includeIssueAnalysis: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    recomputeRevRec: boolean;
    includeIssueAnalysis: boolean;
}, {
    recomputeRevRec?: boolean | undefined;
    includeIssueAnalysis?: boolean | undefined;
}>;
export type RunSimulationRequest = z.infer<typeof RunSimulationSchema>;
export declare const SimulationRunListQuerySchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["pending", "running", "completed", "failed", "cancelled"]>>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    status?: "pending" | "running" | "completed" | "failed" | "cancelled" | undefined;
}, {
    status?: "pending" | "running" | "completed" | "failed" | "cancelled" | undefined;
    limit?: number | undefined;
    page?: number | undefined;
}>;
export type SimulationRunListQuery = z.infer<typeof SimulationRunListQuerySchema>;
export declare const SimulationDeltasQuerySchema: z.ZodObject<{
    deltaType: z.ZodOptional<z.ZodEnum<["revenue_total", "revenue_period", "recognized_shift", "deferred_shift", "contract_impact", "obligation_impact"]>>;
    targetType: z.ZodOptional<z.ZodEnum<["contract", "invoice", "customer", "obligation", "line_item"]>>;
    targetId: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    targetId?: string | undefined;
    targetType?: "customer" | "invoice" | "contract" | "obligation" | "line_item" | undefined;
    deltaType?: "revenue_total" | "revenue_period" | "recognized_shift" | "deferred_shift" | "contract_impact" | "obligation_impact" | undefined;
}, {
    limit?: number | undefined;
    page?: number | undefined;
    targetId?: string | undefined;
    targetType?: "customer" | "invoice" | "contract" | "obligation" | "line_item" | undefined;
    deltaType?: "revenue_total" | "revenue_period" | "recognized_shift" | "deferred_shift" | "contract_impact" | "obligation_impact" | undefined;
}>;
export type SimulationDeltasQuery = z.infer<typeof SimulationDeltasQuerySchema>;
export declare const TemplateListQuerySchema: z.ZodObject<{
    isActive: z.ZodOptional<z.ZodBoolean>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    isActive?: boolean | undefined;
}, {
    limit?: number | undefined;
    page?: number | undefined;
    isActive?: boolean | undefined;
}>;
export type TemplateListQuery = z.infer<typeof TemplateListQuerySchema>;
export declare const CreateTemplateSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    overrides: z.ZodArray<z.ZodDiscriminatedUnion<"overrideType", [z.ZodObject<{
        targetId: z.ZodString;
        originalValue: z.ZodOptional<z.ZodUnknown>;
        sequenceNumber: z.ZodDefault<z.ZodNumber>;
    } & {
        overrideType: z.ZodLiteral<"contract_term">;
        targetType: z.ZodLiteral<"contract">;
        fieldPath: z.ZodEnum<["arr", "discount_rate", "billing_frequency", "start_date", "end_date", "currency", "name"]>;
        overrideValue: z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodDate]>;
    }, "strip", z.ZodTypeAny, {
        sequenceNumber: number;
        overrideValue: string | number | Date;
        targetId: string;
        targetType: "contract";
        fieldPath: "name" | "currency" | "start_date" | "end_date" | "arr" | "discount_rate" | "billing_frequency";
        overrideType: "contract_term";
        originalValue?: unknown;
    }, {
        overrideValue: string | number | Date;
        targetId: string;
        targetType: "contract";
        fieldPath: "name" | "currency" | "start_date" | "end_date" | "arr" | "discount_rate" | "billing_frequency";
        overrideType: "contract_term";
        sequenceNumber?: number | undefined;
        originalValue?: unknown;
    }>, z.ZodObject<{
        targetId: z.ZodString;
        fieldPath: z.ZodOptional<z.ZodString>;
        originalValue: z.ZodOptional<z.ZodUnknown>;
        overrideValue: z.ZodUnknown;
        sequenceNumber: z.ZodDefault<z.ZodNumber>;
    } & {
        overrideType: z.ZodLiteral<"usage_adjustment">;
        targetType: z.ZodLiteral<"contract">;
        action: z.ZodEnum<["add", "remove", "modify"]>;
        usageEvents: z.ZodOptional<z.ZodArray<z.ZodObject<{
            eventId: z.ZodOptional<z.ZodString>;
            quantity: z.ZodNumber;
            unitPrice: z.ZodOptional<z.ZodNumber>;
            eventDate: z.ZodString;
            metricName: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            eventDate: string;
            quantity: number;
            eventId?: string | undefined;
            unitPrice?: number | undefined;
            metricName?: string | undefined;
        }, {
            eventDate: string;
            quantity: number;
            eventId?: string | undefined;
            unitPrice?: number | undefined;
            metricName?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        sequenceNumber: number;
        action: "add" | "remove" | "modify";
        targetId: string;
        targetType: "contract";
        overrideType: "usage_adjustment";
        overrideValue?: unknown;
        fieldPath?: string | undefined;
        originalValue?: unknown;
        usageEvents?: {
            eventDate: string;
            quantity: number;
            eventId?: string | undefined;
            unitPrice?: number | undefined;
            metricName?: string | undefined;
        }[] | undefined;
    }, {
        action: "add" | "remove" | "modify";
        targetId: string;
        targetType: "contract";
        overrideType: "usage_adjustment";
        sequenceNumber?: number | undefined;
        overrideValue?: unknown;
        fieldPath?: string | undefined;
        originalValue?: unknown;
        usageEvents?: {
            eventDate: string;
            quantity: number;
            eventId?: string | undefined;
            unitPrice?: number | undefined;
            metricName?: string | undefined;
        }[] | undefined;
    }>, z.ZodObject<{
        targetId: z.ZodString;
        fieldPath: z.ZodOptional<z.ZodString>;
        originalValue: z.ZodOptional<z.ZodUnknown>;
        overrideValue: z.ZodUnknown;
        sequenceNumber: z.ZodDefault<z.ZodNumber>;
    } & {
        overrideType: z.ZodLiteral<"billing_adjustment">;
        targetType: z.ZodEnum<["invoice", "line_item"]>;
        adjustmentType: z.ZodEnum<["credit", "discount", "fee", "correction"]>;
        adjustmentAmount: z.ZodNumber;
        adjustmentPct: z.ZodOptional<z.ZodNumber>;
        reason: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        sequenceNumber: number;
        targetId: string;
        targetType: "invoice" | "line_item";
        overrideType: "billing_adjustment";
        adjustmentType: "discount" | "credit" | "fee" | "correction";
        adjustmentAmount: number;
        overrideValue?: unknown;
        reason?: string | undefined;
        fieldPath?: string | undefined;
        originalValue?: unknown;
        adjustmentPct?: number | undefined;
    }, {
        targetId: string;
        targetType: "invoice" | "line_item";
        overrideType: "billing_adjustment";
        adjustmentType: "discount" | "credit" | "fee" | "correction";
        adjustmentAmount: number;
        sequenceNumber?: number | undefined;
        overrideValue?: unknown;
        reason?: string | undefined;
        fieldPath?: string | undefined;
        originalValue?: unknown;
        adjustmentPct?: number | undefined;
    }>, z.ZodObject<{
        targetId: z.ZodString;
        fieldPath: z.ZodOptional<z.ZodString>;
        originalValue: z.ZodOptional<z.ZodUnknown>;
        overrideValue: z.ZodUnknown;
        sequenceNumber: z.ZodDefault<z.ZodNumber>;
    } & {
        overrideType: z.ZodLiteral<"timing_shift">;
        targetType: z.ZodEnum<["contract", "obligation"]>;
        shiftType: z.ZodEnum<["start_date", "end_date", "recognition_start", "recognition_end"]>;
        shiftDays: z.ZodOptional<z.ZodNumber>;
        newDate: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        sequenceNumber: number;
        targetId: string;
        targetType: "contract" | "obligation";
        overrideType: "timing_shift";
        shiftType: "start_date" | "end_date" | "recognition_start" | "recognition_end";
        overrideValue?: unknown;
        fieldPath?: string | undefined;
        originalValue?: unknown;
        shiftDays?: number | undefined;
        newDate?: string | undefined;
    }, {
        targetId: string;
        targetType: "contract" | "obligation";
        overrideType: "timing_shift";
        shiftType: "start_date" | "end_date" | "recognition_start" | "recognition_end";
        sequenceNumber?: number | undefined;
        overrideValue?: unknown;
        fieldPath?: string | undefined;
        originalValue?: unknown;
        shiftDays?: number | undefined;
        newDate?: string | undefined;
    }>, z.ZodObject<{
        targetId: z.ZodString;
        fieldPath: z.ZodOptional<z.ZodString>;
        originalValue: z.ZodOptional<z.ZodUnknown>;
        overrideValue: z.ZodUnknown;
        sequenceNumber: z.ZodDefault<z.ZodNumber>;
    } & {
        overrideType: z.ZodLiteral<"discount_change">;
        targetType: z.ZodEnum<["contract", "invoice", "line_item"]>;
        discountPct: z.ZodOptional<z.ZodNumber>;
        discountAmount: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        sequenceNumber: number;
        targetId: string;
        targetType: "invoice" | "contract" | "line_item";
        overrideType: "discount_change";
        overrideValue?: unknown;
        fieldPath?: string | undefined;
        originalValue?: unknown;
        discountPct?: number | undefined;
        discountAmount?: number | undefined;
    }, {
        targetId: string;
        targetType: "invoice" | "contract" | "line_item";
        overrideType: "discount_change";
        sequenceNumber?: number | undefined;
        overrideValue?: unknown;
        fieldPath?: string | undefined;
        originalValue?: unknown;
        discountPct?: number | undefined;
        discountAmount?: number | undefined;
    }>, z.ZodObject<{
        targetId: z.ZodString;
        fieldPath: z.ZodOptional<z.ZodString>;
        originalValue: z.ZodOptional<z.ZodUnknown>;
        overrideValue: z.ZodUnknown;
        sequenceNumber: z.ZodDefault<z.ZodNumber>;
    } & {
        overrideType: z.ZodLiteral<"price_change">;
        targetType: z.ZodEnum<["contract", "line_item", "obligation"]>;
        priceDelta: z.ZodOptional<z.ZodNumber>;
        pricePct: z.ZodOptional<z.ZodNumber>;
        newPrice: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        sequenceNumber: number;
        targetId: string;
        targetType: "contract" | "obligation" | "line_item";
        overrideType: "price_change";
        overrideValue?: unknown;
        fieldPath?: string | undefined;
        originalValue?: unknown;
        priceDelta?: number | undefined;
        pricePct?: number | undefined;
        newPrice?: number | undefined;
    }, {
        targetId: string;
        targetType: "contract" | "obligation" | "line_item";
        overrideType: "price_change";
        sequenceNumber?: number | undefined;
        overrideValue?: unknown;
        fieldPath?: string | undefined;
        originalValue?: unknown;
        priceDelta?: number | undefined;
        pricePct?: number | undefined;
        newPrice?: number | undefined;
    }>]>, "many">;
    defaultOptions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    overrides: ({
        sequenceNumber: number;
        overrideValue: string | number | Date;
        targetId: string;
        targetType: "contract";
        fieldPath: "name" | "currency" | "start_date" | "end_date" | "arr" | "discount_rate" | "billing_frequency";
        overrideType: "contract_term";
        originalValue?: unknown;
    } | {
        sequenceNumber: number;
        action: "add" | "remove" | "modify";
        targetId: string;
        targetType: "contract";
        overrideType: "usage_adjustment";
        overrideValue?: unknown;
        fieldPath?: string | undefined;
        originalValue?: unknown;
        usageEvents?: {
            eventDate: string;
            quantity: number;
            eventId?: string | undefined;
            unitPrice?: number | undefined;
            metricName?: string | undefined;
        }[] | undefined;
    } | {
        sequenceNumber: number;
        targetId: string;
        targetType: "invoice" | "line_item";
        overrideType: "billing_adjustment";
        adjustmentType: "discount" | "credit" | "fee" | "correction";
        adjustmentAmount: number;
        overrideValue?: unknown;
        reason?: string | undefined;
        fieldPath?: string | undefined;
        originalValue?: unknown;
        adjustmentPct?: number | undefined;
    } | {
        sequenceNumber: number;
        targetId: string;
        targetType: "contract" | "obligation";
        overrideType: "timing_shift";
        shiftType: "start_date" | "end_date" | "recognition_start" | "recognition_end";
        overrideValue?: unknown;
        fieldPath?: string | undefined;
        originalValue?: unknown;
        shiftDays?: number | undefined;
        newDate?: string | undefined;
    } | {
        sequenceNumber: number;
        targetId: string;
        targetType: "invoice" | "contract" | "line_item";
        overrideType: "discount_change";
        overrideValue?: unknown;
        fieldPath?: string | undefined;
        originalValue?: unknown;
        discountPct?: number | undefined;
        discountAmount?: number | undefined;
    } | {
        sequenceNumber: number;
        targetId: string;
        targetType: "contract" | "obligation" | "line_item";
        overrideType: "price_change";
        overrideValue?: unknown;
        fieldPath?: string | undefined;
        originalValue?: unknown;
        priceDelta?: number | undefined;
        pricePct?: number | undefined;
        newPrice?: number | undefined;
    })[];
    description?: string | undefined;
    defaultOptions?: Record<string, unknown> | undefined;
}, {
    name: string;
    overrides: ({
        overrideValue: string | number | Date;
        targetId: string;
        targetType: "contract";
        fieldPath: "name" | "currency" | "start_date" | "end_date" | "arr" | "discount_rate" | "billing_frequency";
        overrideType: "contract_term";
        sequenceNumber?: number | undefined;
        originalValue?: unknown;
    } | {
        action: "add" | "remove" | "modify";
        targetId: string;
        targetType: "contract";
        overrideType: "usage_adjustment";
        sequenceNumber?: number | undefined;
        overrideValue?: unknown;
        fieldPath?: string | undefined;
        originalValue?: unknown;
        usageEvents?: {
            eventDate: string;
            quantity: number;
            eventId?: string | undefined;
            unitPrice?: number | undefined;
            metricName?: string | undefined;
        }[] | undefined;
    } | {
        targetId: string;
        targetType: "invoice" | "line_item";
        overrideType: "billing_adjustment";
        adjustmentType: "discount" | "credit" | "fee" | "correction";
        adjustmentAmount: number;
        sequenceNumber?: number | undefined;
        overrideValue?: unknown;
        reason?: string | undefined;
        fieldPath?: string | undefined;
        originalValue?: unknown;
        adjustmentPct?: number | undefined;
    } | {
        targetId: string;
        targetType: "contract" | "obligation";
        overrideType: "timing_shift";
        shiftType: "start_date" | "end_date" | "recognition_start" | "recognition_end";
        sequenceNumber?: number | undefined;
        overrideValue?: unknown;
        fieldPath?: string | undefined;
        originalValue?: unknown;
        shiftDays?: number | undefined;
        newDate?: string | undefined;
    } | {
        targetId: string;
        targetType: "invoice" | "contract" | "line_item";
        overrideType: "discount_change";
        sequenceNumber?: number | undefined;
        overrideValue?: unknown;
        fieldPath?: string | undefined;
        originalValue?: unknown;
        discountPct?: number | undefined;
        discountAmount?: number | undefined;
    } | {
        targetId: string;
        targetType: "contract" | "obligation" | "line_item";
        overrideType: "price_change";
        sequenceNumber?: number | undefined;
        overrideValue?: unknown;
        fieldPath?: string | undefined;
        originalValue?: unknown;
        priceDelta?: number | undefined;
        pricePct?: number | undefined;
        newPrice?: number | undefined;
    })[];
    description?: string | undefined;
    defaultOptions?: Record<string, unknown> | undefined;
}>;
export type CreateTemplate = z.infer<typeof CreateTemplateSchema>;
export declare const ApplyTemplateSchema: z.ZodObject<{
    snapshotId: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    snapshotId: string;
    name: string;
    description?: string | undefined;
}, {
    snapshotId: string;
    name: string;
    description?: string | undefined;
}>;
export type ApplyTemplate = z.infer<typeof ApplyTemplateSchema>;
export declare const SimulationRunJobPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"simulation.run">;
    simulationId: z.ZodString;
    runId: z.ZodString;
    options: z.ZodOptional<z.ZodObject<{
        recomputeRevRec: z.ZodDefault<z.ZodBoolean>;
        includeIssueAnalysis: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        recomputeRevRec: boolean;
        includeIssueAnalysis: boolean;
    }, {
        recomputeRevRec?: boolean | undefined;
        includeIssueAnalysis?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "simulation.run";
    runId: string;
    tenantId: string;
    simulationId: string;
    options?: {
        recomputeRevRec: boolean;
        includeIssueAnalysis: boolean;
    } | undefined;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}, {
    type: "simulation.run";
    runId: string;
    tenantId: string;
    simulationId: string;
    options?: {
        recomputeRevRec?: boolean | undefined;
        includeIssueAnalysis?: boolean | undefined;
    } | undefined;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}>;
export type SimulationRunJobPayload = z.infer<typeof SimulationRunJobPayloadSchema>;
export declare const SimulationReplayJobPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"simulation.replay">;
    simulationId: z.ZodString;
    originalRunId: z.ZodString;
    newRunId: z.ZodString;
    options: z.ZodOptional<z.ZodObject<{
        recomputeRevRec: z.ZodDefault<z.ZodBoolean>;
        includeIssueAnalysis: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        recomputeRevRec: boolean;
        includeIssueAnalysis: boolean;
    }, {
        recomputeRevRec?: boolean | undefined;
        includeIssueAnalysis?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "simulation.replay";
    tenantId: string;
    simulationId: string;
    originalRunId: string;
    newRunId: string;
    options?: {
        recomputeRevRec: boolean;
        includeIssueAnalysis: boolean;
    } | undefined;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}, {
    type: "simulation.replay";
    tenantId: string;
    simulationId: string;
    originalRunId: string;
    newRunId: string;
    options?: {
        recomputeRevRec?: boolean | undefined;
        includeIssueAnalysis?: boolean | undefined;
    } | undefined;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}>;
export type SimulationReplayJobPayload = z.infer<typeof SimulationReplayJobPayloadSchema>;
export declare const SimulationContextSchema: z.ZodObject<{
    snapshotId: z.ZodString;
    tenantId: z.ZodString;
    contracts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        customerId: z.ZodNullable<z.ZodString>;
        name: z.ZodNullable<z.ZodString>;
        startDate: z.ZodNullable<z.ZodDate>;
        endDate: z.ZodNullable<z.ZodDate>;
        arr: z.ZodNullable<z.ZodNumber>;
        currency: z.ZodString;
        billingFrequency: z.ZodNullable<z.ZodString>;
        status: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: string | null;
        id: string;
        name: string | null;
        currency: string;
        customerId: string | null;
        arr: number | null;
        startDate: Date | null;
        endDate: Date | null;
        billingFrequency: string | null;
    }, {
        status: string | null;
        id: string;
        name: string | null;
        currency: string;
        customerId: string | null;
        arr: number | null;
        startDate: Date | null;
        endDate: Date | null;
        billingFrequency: string | null;
    }>, "many">;
    invoices: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        contractId: z.ZodNullable<z.ZodString>;
        customerId: z.ZodNullable<z.ZodString>;
        invoiceDate: z.ZodDate;
        total: z.ZodNumber;
        currency: z.ZodString;
        status: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: string | null;
        id: string;
        total: number;
        currency: string;
        contractId: string | null;
        customerId: string | null;
        invoiceDate: Date;
    }, {
        status: string | null;
        id: string;
        total: number;
        currency: string;
        contractId: string | null;
        customerId: string | null;
        invoiceDate: Date;
    }>, "many">;
    obligations: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        contractId: z.ZodString;
        obligationType: z.ZodString;
        transactionPrice: z.ZodNumber;
        serviceStartDate: z.ZodNullable<z.ZodDate>;
        serviceEndDate: z.ZodNullable<z.ZodDate>;
        status: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status: string;
        id: string;
        contractId: string;
        obligationType: string;
        transactionPrice: number;
        serviceStartDate: Date | null;
        serviceEndDate: Date | null;
    }, {
        status: string;
        id: string;
        contractId: string;
        obligationType: string;
        transactionPrice: number;
        serviceStartDate: Date | null;
        serviceEndDate: Date | null;
    }>, "many">;
    schedules: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        obligationId: z.ZodString;
        periodStart: z.ZodDate;
        periodEnd: z.ZodDate;
        scheduledAmount: z.ZodNumber;
        recognizedAmount: z.ZodNumber;
        deferredAmount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        obligationId: string;
        periodStart: Date;
        periodEnd: Date;
        scheduledAmount: number;
        recognizedAmount: number;
        deferredAmount: number;
    }, {
        id: string;
        obligationId: string;
        periodStart: Date;
        periodEnd: Date;
        scheduledAmount: number;
        recognizedAmount: number;
        deferredAmount: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    snapshotId: string;
    tenantId: string;
    contracts: {
        status: string | null;
        id: string;
        name: string | null;
        currency: string;
        customerId: string | null;
        arr: number | null;
        startDate: Date | null;
        endDate: Date | null;
        billingFrequency: string | null;
    }[];
    invoices: {
        status: string | null;
        id: string;
        total: number;
        currency: string;
        contractId: string | null;
        customerId: string | null;
        invoiceDate: Date;
    }[];
    schedules: {
        id: string;
        obligationId: string;
        periodStart: Date;
        periodEnd: Date;
        scheduledAmount: number;
        recognizedAmount: number;
        deferredAmount: number;
    }[];
    obligations: {
        status: string;
        id: string;
        contractId: string;
        obligationType: string;
        transactionPrice: number;
        serviceStartDate: Date | null;
        serviceEndDate: Date | null;
    }[];
}, {
    snapshotId: string;
    tenantId: string;
    contracts: {
        status: string | null;
        id: string;
        name: string | null;
        currency: string;
        customerId: string | null;
        arr: number | null;
        startDate: Date | null;
        endDate: Date | null;
        billingFrequency: string | null;
    }[];
    invoices: {
        status: string | null;
        id: string;
        total: number;
        currency: string;
        contractId: string | null;
        customerId: string | null;
        invoiceDate: Date;
    }[];
    schedules: {
        id: string;
        obligationId: string;
        periodStart: Date;
        periodEnd: Date;
        scheduledAmount: number;
        recognizedAmount: number;
        deferredAmount: number;
    }[];
    obligations: {
        status: string;
        id: string;
        contractId: string;
        obligationType: string;
        transactionPrice: number;
        serviceStartDate: Date | null;
        serviceEndDate: Date | null;
    }[];
}>;
export type SimulationContext = z.infer<typeof SimulationContextSchema>;
export declare const SimulationWarningSchema: z.ZodObject<{
    code: z.ZodString;
    message: z.ZodString;
    targetId: z.ZodOptional<z.ZodString>;
    overrideId: z.ZodOptional<z.ZodString>;
    severity: z.ZodEnum<["info", "warning", "error"]>;
}, "strip", z.ZodTypeAny, {
    code: string;
    message: string;
    severity: "info" | "error" | "warning";
    targetId?: string | undefined;
    overrideId?: string | undefined;
}, {
    code: string;
    message: string;
    severity: "info" | "error" | "warning";
    targetId?: string | undefined;
    overrideId?: string | undefined;
}>;
export type SimulationWarning = z.infer<typeof SimulationWarningSchema>;
export declare const SimulationSummarySchema: z.ZodObject<{
    totalRevenueDelta: z.ZodNumber;
    totalRecognizedDelta: z.ZodNumber;
    totalDeferredDelta: z.ZodNumber;
    contractsAffected: z.ZodNumber;
    obligationsAffected: z.ZodNumber;
    overridesApplied: z.ZodNumber;
    overridesSkipped: z.ZodNumber;
    periodImpacts: z.ZodArray<z.ZodObject<{
        periodStart: z.ZodDate;
        periodEnd: z.ZodDate;
        revenueDelta: z.ZodNumber;
        recognizedDelta: z.ZodNumber;
        deferredDelta: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        periodStart: Date;
        periodEnd: Date;
        revenueDelta: number;
        recognizedDelta: number;
        deferredDelta: number;
    }, {
        periodStart: Date;
        periodEnd: Date;
        revenueDelta: number;
        recognizedDelta: number;
        deferredDelta: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    totalRevenueDelta: number;
    contractsAffected: number;
    obligationsAffected: number;
    overridesApplied: number;
    overridesSkipped: number;
    totalRecognizedDelta: number;
    totalDeferredDelta: number;
    periodImpacts: {
        periodStart: Date;
        periodEnd: Date;
        revenueDelta: number;
        recognizedDelta: number;
        deferredDelta: number;
    }[];
}, {
    totalRevenueDelta: number;
    contractsAffected: number;
    obligationsAffected: number;
    overridesApplied: number;
    overridesSkipped: number;
    totalRecognizedDelta: number;
    totalDeferredDelta: number;
    periodImpacts: {
        periodStart: Date;
        periodEnd: Date;
        revenueDelta: number;
        recognizedDelta: number;
        deferredDelta: number;
    }[];
}>;
export type SimulationSummary = z.infer<typeof SimulationSummarySchema>;
export declare const DeltaRecordSchema: z.ZodObject<{
    deltaType: z.ZodEnum<["revenue_total", "revenue_period", "recognized_shift", "deferred_shift", "contract_impact", "obligation_impact"]>;
    targetType: z.ZodOptional<z.ZodString>;
    targetId: z.ZodOptional<z.ZodString>;
    periodStart: z.ZodOptional<z.ZodDate>;
    periodEnd: z.ZodOptional<z.ZodDate>;
    baselineAmount: z.ZodNumber;
    simulatedAmount: z.ZodNumber;
    deltaAmount: z.ZodNumber;
    deltaPct: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodString;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    currency: string;
    deltaType: "revenue_total" | "revenue_period" | "recognized_shift" | "deferred_shift" | "contract_impact" | "obligation_impact";
    baselineAmount: number;
    simulatedAmount: number;
    deltaAmount: number;
    details?: Record<string, unknown> | undefined;
    periodStart?: Date | undefined;
    periodEnd?: Date | undefined;
    targetId?: string | undefined;
    targetType?: string | undefined;
    deltaPct?: number | undefined;
}, {
    currency: string;
    deltaType: "revenue_total" | "revenue_period" | "recognized_shift" | "deferred_shift" | "contract_impact" | "obligation_impact";
    baselineAmount: number;
    simulatedAmount: number;
    deltaAmount: number;
    details?: Record<string, unknown> | undefined;
    periodStart?: Date | undefined;
    periodEnd?: Date | undefined;
    targetId?: string | undefined;
    targetType?: string | undefined;
    deltaPct?: number | undefined;
}>;
export type DeltaRecord = z.infer<typeof DeltaRecordSchema>;
export declare const SimulationEngineResultSchema: z.ZodObject<{
    modifiedContext: z.ZodObject<{
        snapshotId: z.ZodString;
        tenantId: z.ZodString;
        contracts: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            customerId: z.ZodNullable<z.ZodString>;
            name: z.ZodNullable<z.ZodString>;
            startDate: z.ZodNullable<z.ZodDate>;
            endDate: z.ZodNullable<z.ZodDate>;
            arr: z.ZodNullable<z.ZodNumber>;
            currency: z.ZodString;
            billingFrequency: z.ZodNullable<z.ZodString>;
            status: z.ZodNullable<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            status: string | null;
            id: string;
            name: string | null;
            currency: string;
            customerId: string | null;
            arr: number | null;
            startDate: Date | null;
            endDate: Date | null;
            billingFrequency: string | null;
        }, {
            status: string | null;
            id: string;
            name: string | null;
            currency: string;
            customerId: string | null;
            arr: number | null;
            startDate: Date | null;
            endDate: Date | null;
            billingFrequency: string | null;
        }>, "many">;
        invoices: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            contractId: z.ZodNullable<z.ZodString>;
            customerId: z.ZodNullable<z.ZodString>;
            invoiceDate: z.ZodDate;
            total: z.ZodNumber;
            currency: z.ZodString;
            status: z.ZodNullable<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            status: string | null;
            id: string;
            total: number;
            currency: string;
            contractId: string | null;
            customerId: string | null;
            invoiceDate: Date;
        }, {
            status: string | null;
            id: string;
            total: number;
            currency: string;
            contractId: string | null;
            customerId: string | null;
            invoiceDate: Date;
        }>, "many">;
        obligations: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            contractId: z.ZodString;
            obligationType: z.ZodString;
            transactionPrice: z.ZodNumber;
            serviceStartDate: z.ZodNullable<z.ZodDate>;
            serviceEndDate: z.ZodNullable<z.ZodDate>;
            status: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            status: string;
            id: string;
            contractId: string;
            obligationType: string;
            transactionPrice: number;
            serviceStartDate: Date | null;
            serviceEndDate: Date | null;
        }, {
            status: string;
            id: string;
            contractId: string;
            obligationType: string;
            transactionPrice: number;
            serviceStartDate: Date | null;
            serviceEndDate: Date | null;
        }>, "many">;
        schedules: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            obligationId: z.ZodString;
            periodStart: z.ZodDate;
            periodEnd: z.ZodDate;
            scheduledAmount: z.ZodNumber;
            recognizedAmount: z.ZodNumber;
            deferredAmount: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            id: string;
            obligationId: string;
            periodStart: Date;
            periodEnd: Date;
            scheduledAmount: number;
            recognizedAmount: number;
            deferredAmount: number;
        }, {
            id: string;
            obligationId: string;
            periodStart: Date;
            periodEnd: Date;
            scheduledAmount: number;
            recognizedAmount: number;
            deferredAmount: number;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        snapshotId: string;
        tenantId: string;
        contracts: {
            status: string | null;
            id: string;
            name: string | null;
            currency: string;
            customerId: string | null;
            arr: number | null;
            startDate: Date | null;
            endDate: Date | null;
            billingFrequency: string | null;
        }[];
        invoices: {
            status: string | null;
            id: string;
            total: number;
            currency: string;
            contractId: string | null;
            customerId: string | null;
            invoiceDate: Date;
        }[];
        schedules: {
            id: string;
            obligationId: string;
            periodStart: Date;
            periodEnd: Date;
            scheduledAmount: number;
            recognizedAmount: number;
            deferredAmount: number;
        }[];
        obligations: {
            status: string;
            id: string;
            contractId: string;
            obligationType: string;
            transactionPrice: number;
            serviceStartDate: Date | null;
            serviceEndDate: Date | null;
        }[];
    }, {
        snapshotId: string;
        tenantId: string;
        contracts: {
            status: string | null;
            id: string;
            name: string | null;
            currency: string;
            customerId: string | null;
            arr: number | null;
            startDate: Date | null;
            endDate: Date | null;
            billingFrequency: string | null;
        }[];
        invoices: {
            status: string | null;
            id: string;
            total: number;
            currency: string;
            contractId: string | null;
            customerId: string | null;
            invoiceDate: Date;
        }[];
        schedules: {
            id: string;
            obligationId: string;
            periodStart: Date;
            periodEnd: Date;
            scheduledAmount: number;
            recognizedAmount: number;
            deferredAmount: number;
        }[];
        obligations: {
            status: string;
            id: string;
            contractId: string;
            obligationType: string;
            transactionPrice: number;
            serviceStartDate: Date | null;
            serviceEndDate: Date | null;
        }[];
    }>;
    deltas: z.ZodArray<z.ZodObject<{
        deltaType: z.ZodEnum<["revenue_total", "revenue_period", "recognized_shift", "deferred_shift", "contract_impact", "obligation_impact"]>;
        targetType: z.ZodOptional<z.ZodString>;
        targetId: z.ZodOptional<z.ZodString>;
        periodStart: z.ZodOptional<z.ZodDate>;
        periodEnd: z.ZodOptional<z.ZodDate>;
        baselineAmount: z.ZodNumber;
        simulatedAmount: z.ZodNumber;
        deltaAmount: z.ZodNumber;
        deltaPct: z.ZodOptional<z.ZodNumber>;
        currency: z.ZodString;
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        deltaType: "revenue_total" | "revenue_period" | "recognized_shift" | "deferred_shift" | "contract_impact" | "obligation_impact";
        baselineAmount: number;
        simulatedAmount: number;
        deltaAmount: number;
        details?: Record<string, unknown> | undefined;
        periodStart?: Date | undefined;
        periodEnd?: Date | undefined;
        targetId?: string | undefined;
        targetType?: string | undefined;
        deltaPct?: number | undefined;
    }, {
        currency: string;
        deltaType: "revenue_total" | "revenue_period" | "recognized_shift" | "deferred_shift" | "contract_impact" | "obligation_impact";
        baselineAmount: number;
        simulatedAmount: number;
        deltaAmount: number;
        details?: Record<string, unknown> | undefined;
        periodStart?: Date | undefined;
        periodEnd?: Date | undefined;
        targetId?: string | undefined;
        targetType?: string | undefined;
        deltaPct?: number | undefined;
    }>, "many">;
    summary: z.ZodObject<{
        totalRevenueDelta: z.ZodNumber;
        totalRecognizedDelta: z.ZodNumber;
        totalDeferredDelta: z.ZodNumber;
        contractsAffected: z.ZodNumber;
        obligationsAffected: z.ZodNumber;
        overridesApplied: z.ZodNumber;
        overridesSkipped: z.ZodNumber;
        periodImpacts: z.ZodArray<z.ZodObject<{
            periodStart: z.ZodDate;
            periodEnd: z.ZodDate;
            revenueDelta: z.ZodNumber;
            recognizedDelta: z.ZodNumber;
            deferredDelta: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            periodStart: Date;
            periodEnd: Date;
            revenueDelta: number;
            recognizedDelta: number;
            deferredDelta: number;
        }, {
            periodStart: Date;
            periodEnd: Date;
            revenueDelta: number;
            recognizedDelta: number;
            deferredDelta: number;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        totalRevenueDelta: number;
        contractsAffected: number;
        obligationsAffected: number;
        overridesApplied: number;
        overridesSkipped: number;
        totalRecognizedDelta: number;
        totalDeferredDelta: number;
        periodImpacts: {
            periodStart: Date;
            periodEnd: Date;
            revenueDelta: number;
            recognizedDelta: number;
            deferredDelta: number;
        }[];
    }, {
        totalRevenueDelta: number;
        contractsAffected: number;
        obligationsAffected: number;
        overridesApplied: number;
        overridesSkipped: number;
        totalRecognizedDelta: number;
        totalDeferredDelta: number;
        periodImpacts: {
            periodStart: Date;
            periodEnd: Date;
            revenueDelta: number;
            recognizedDelta: number;
            deferredDelta: number;
        }[];
    }>;
    appliedOverrides: z.ZodArray<z.ZodString, "many">;
    skippedOverrides: z.ZodArray<z.ZodObject<{
        overrideId: z.ZodString;
        reason: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        reason: string;
        overrideId: string;
    }, {
        reason: string;
        overrideId: string;
    }>, "many">;
    warnings: z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        targetId: z.ZodOptional<z.ZodString>;
        overrideId: z.ZodOptional<z.ZodString>;
        severity: z.ZodEnum<["info", "warning", "error"]>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        severity: "info" | "error" | "warning";
        targetId?: string | undefined;
        overrideId?: string | undefined;
    }, {
        code: string;
        message: string;
        severity: "info" | "error" | "warning";
        targetId?: string | undefined;
        overrideId?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    summary: {
        totalRevenueDelta: number;
        contractsAffected: number;
        obligationsAffected: number;
        overridesApplied: number;
        overridesSkipped: number;
        totalRecognizedDelta: number;
        totalDeferredDelta: number;
        periodImpacts: {
            periodStart: Date;
            periodEnd: Date;
            revenueDelta: number;
            recognizedDelta: number;
            deferredDelta: number;
        }[];
    };
    modifiedContext: {
        snapshotId: string;
        tenantId: string;
        contracts: {
            status: string | null;
            id: string;
            name: string | null;
            currency: string;
            customerId: string | null;
            arr: number | null;
            startDate: Date | null;
            endDate: Date | null;
            billingFrequency: string | null;
        }[];
        invoices: {
            status: string | null;
            id: string;
            total: number;
            currency: string;
            contractId: string | null;
            customerId: string | null;
            invoiceDate: Date;
        }[];
        schedules: {
            id: string;
            obligationId: string;
            periodStart: Date;
            periodEnd: Date;
            scheduledAmount: number;
            recognizedAmount: number;
            deferredAmount: number;
        }[];
        obligations: {
            status: string;
            id: string;
            contractId: string;
            obligationType: string;
            transactionPrice: number;
            serviceStartDate: Date | null;
            serviceEndDate: Date | null;
        }[];
    };
    deltas: {
        currency: string;
        deltaType: "revenue_total" | "revenue_period" | "recognized_shift" | "deferred_shift" | "contract_impact" | "obligation_impact";
        baselineAmount: number;
        simulatedAmount: number;
        deltaAmount: number;
        details?: Record<string, unknown> | undefined;
        periodStart?: Date | undefined;
        periodEnd?: Date | undefined;
        targetId?: string | undefined;
        targetType?: string | undefined;
        deltaPct?: number | undefined;
    }[];
    appliedOverrides: string[];
    skippedOverrides: {
        reason: string;
        overrideId: string;
    }[];
    warnings: {
        code: string;
        message: string;
        severity: "info" | "error" | "warning";
        targetId?: string | undefined;
        overrideId?: string | undefined;
    }[];
}, {
    summary: {
        totalRevenueDelta: number;
        contractsAffected: number;
        obligationsAffected: number;
        overridesApplied: number;
        overridesSkipped: number;
        totalRecognizedDelta: number;
        totalDeferredDelta: number;
        periodImpacts: {
            periodStart: Date;
            periodEnd: Date;
            revenueDelta: number;
            recognizedDelta: number;
            deferredDelta: number;
        }[];
    };
    modifiedContext: {
        snapshotId: string;
        tenantId: string;
        contracts: {
            status: string | null;
            id: string;
            name: string | null;
            currency: string;
            customerId: string | null;
            arr: number | null;
            startDate: Date | null;
            endDate: Date | null;
            billingFrequency: string | null;
        }[];
        invoices: {
            status: string | null;
            id: string;
            total: number;
            currency: string;
            contractId: string | null;
            customerId: string | null;
            invoiceDate: Date;
        }[];
        schedules: {
            id: string;
            obligationId: string;
            periodStart: Date;
            periodEnd: Date;
            scheduledAmount: number;
            recognizedAmount: number;
            deferredAmount: number;
        }[];
        obligations: {
            status: string;
            id: string;
            contractId: string;
            obligationType: string;
            transactionPrice: number;
            serviceStartDate: Date | null;
            serviceEndDate: Date | null;
        }[];
    };
    deltas: {
        currency: string;
        deltaType: "revenue_total" | "revenue_period" | "recognized_shift" | "deferred_shift" | "contract_impact" | "obligation_impact";
        baselineAmount: number;
        simulatedAmount: number;
        deltaAmount: number;
        details?: Record<string, unknown> | undefined;
        periodStart?: Date | undefined;
        periodEnd?: Date | undefined;
        targetId?: string | undefined;
        targetType?: string | undefined;
        deltaPct?: number | undefined;
    }[];
    appliedOverrides: string[];
    skippedOverrides: {
        reason: string;
        overrideId: string;
    }[];
    warnings: {
        code: string;
        message: string;
        severity: "info" | "error" | "warning";
        targetId?: string | undefined;
        overrideId?: string | undefined;
    }[];
}>;
export type SimulationEngineResult = z.infer<typeof SimulationEngineResultSchema>;
//# sourceMappingURL=simulation.d.ts.map