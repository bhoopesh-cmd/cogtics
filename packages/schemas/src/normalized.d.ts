/**
 * Normalized Schemas
 *
 * Intermediate shapes between raw provider data and canonical tables.
 * These are the output of mapper functions and input to canonical upsert.
 */
import { z } from 'zod';
export declare const ExternalIdSchema: z.ZodObject<{
    provider: z.ZodString;
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    provider: string;
}, {
    id: string;
    provider: string;
}>;
export type ExternalId = z.infer<typeof ExternalIdSchema>;
export declare const SourceInfoSchema: z.ZodObject<{
    system: z.ZodString;
    batchId: z.ZodOptional<z.ZodString>;
    recordId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    system: string;
    batchId?: string | undefined;
    recordId?: string | undefined;
}, {
    system: string;
    batchId?: string | undefined;
    recordId?: string | undefined;
}>;
export type SourceInfo = z.infer<typeof SourceInfoSchema>;
export declare const NormalizedCustomerSchema: z.ZodObject<{
    externalId: z.ZodString;
    externalIds: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    name: z.ZodString;
    email: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodDefault<z.ZodEnum<["active", "inactive", "churned", "prospect"]>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    source: z.ZodObject<{
        system: z.ZodString;
        batchId: z.ZodOptional<z.ZodString>;
        recordId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    }, {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "inactive" | "churned" | "prospect";
    name: string;
    metadata: Record<string, unknown>;
    source: {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    };
    externalId: string;
    externalIds: Record<string, string>;
    email?: string | null | undefined;
}, {
    name: string;
    source: {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    };
    externalId: string;
    status?: "active" | "inactive" | "churned" | "prospect" | undefined;
    email?: string | null | undefined;
    metadata?: Record<string, unknown> | undefined;
    externalIds?: Record<string, string> | undefined;
}>;
export type NormalizedCustomer = z.infer<typeof NormalizedCustomerSchema>;
export declare const NormalizedContractSchema: z.ZodObject<{
    externalId: z.ZodString;
    externalIds: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    customerExternalId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    name: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodDefault<z.ZodEnum<["draft", "active", "expired", "cancelled", "renewed"]>>;
    startDate: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
    endDate: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
    arr: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    currency: z.ZodDefault<z.ZodString>;
    billingFrequency: z.ZodNullable<z.ZodOptional<z.ZodEnum<["monthly", "quarterly", "annually", "one_time"]>>>;
    autoRenew: z.ZodDefault<z.ZodBoolean>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    source: z.ZodObject<{
        system: z.ZodString;
        batchId: z.ZodOptional<z.ZodString>;
        recordId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    }, {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "cancelled" | "expired" | "draft" | "renewed";
    currency: string;
    autoRenew: boolean;
    metadata: Record<string, unknown>;
    source: {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    };
    externalId: string;
    externalIds: Record<string, string>;
    name?: string | null | undefined;
    arr?: number | null | undefined;
    startDate?: Date | null | undefined;
    endDate?: Date | null | undefined;
    billingFrequency?: "monthly" | "quarterly" | "annually" | "one_time" | null | undefined;
    customerExternalId?: string | null | undefined;
}, {
    source: {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    };
    externalId: string;
    status?: "active" | "cancelled" | "expired" | "draft" | "renewed" | undefined;
    name?: string | null | undefined;
    currency?: string | undefined;
    autoRenew?: boolean | undefined;
    metadata?: Record<string, unknown> | undefined;
    arr?: number | null | undefined;
    startDate?: Date | null | undefined;
    endDate?: Date | null | undefined;
    billingFrequency?: "monthly" | "quarterly" | "annually" | "one_time" | null | undefined;
    externalIds?: Record<string, string> | undefined;
    customerExternalId?: string | null | undefined;
}>;
export type NormalizedContract = z.infer<typeof NormalizedContractSchema>;
export declare const NormalizedInvoiceSchema: z.ZodObject<{
    externalId: z.ZodString;
    externalIds: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    customerExternalId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    contractExternalId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    invoiceNumber: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    invoiceDate: z.ZodDate;
    dueDate: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
    currency: z.ZodDefault<z.ZodString>;
    subtotal: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    tax: z.ZodDefault<z.ZodNumber>;
    total: z.ZodNumber;
    amountPaid: z.ZodDefault<z.ZodNumber>;
    amountDue: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    status: z.ZodDefault<z.ZodEnum<["draft", "open", "paid", "void", "uncollectible", "past_due"]>>;
    periodStart: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
    periodEnd: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
    lines: z.ZodDefault<z.ZodArray<z.ZodLazy<z.ZodObject<{
        externalId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        productExternalId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        quantity: z.ZodDefault<z.ZodNumber>;
        unitPrice: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        amount: z.ZodNumber;
        currency: z.ZodDefault<z.ZodString>;
        serviceStart: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
        serviceEnd: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        amount: number;
        metadata: Record<string, unknown>;
        quantity: number;
        description?: string | null | undefined;
        externalId?: string | null | undefined;
        unitPrice?: number | null | undefined;
        serviceStart?: Date | null | undefined;
        serviceEnd?: Date | null | undefined;
        productExternalId?: string | null | undefined;
    }, {
        amount: number;
        description?: string | null | undefined;
        currency?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
        externalId?: string | null | undefined;
        quantity?: number | undefined;
        unitPrice?: number | null | undefined;
        serviceStart?: Date | null | undefined;
        serviceEnd?: Date | null | undefined;
        productExternalId?: string | null | undefined;
    }>>, "many">>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    source: z.ZodObject<{
        system: z.ZodString;
        batchId: z.ZodOptional<z.ZodString>;
        recordId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    }, {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    status: "void" | "open" | "draft" | "paid" | "uncollectible" | "past_due";
    total: number;
    currency: string;
    metadata: Record<string, unknown>;
    source: {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    };
    externalId: string;
    invoiceDate: Date;
    externalIds: Record<string, string>;
    tax: number;
    amountPaid: number;
    lines: {
        currency: string;
        amount: number;
        metadata: Record<string, unknown>;
        quantity: number;
        description?: string | null | undefined;
        externalId?: string | null | undefined;
        unitPrice?: number | null | undefined;
        serviceStart?: Date | null | undefined;
        serviceEnd?: Date | null | undefined;
        productExternalId?: string | null | undefined;
    }[];
    periodStart?: Date | null | undefined;
    periodEnd?: Date | null | undefined;
    invoiceNumber?: string | null | undefined;
    dueDate?: Date | null | undefined;
    subtotal?: number | null | undefined;
    amountDue?: number | null | undefined;
    customerExternalId?: string | null | undefined;
    contractExternalId?: string | null | undefined;
}, {
    total: number;
    source: {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    };
    externalId: string;
    invoiceDate: Date;
    status?: "void" | "open" | "draft" | "paid" | "uncollectible" | "past_due" | undefined;
    currency?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    periodStart?: Date | null | undefined;
    periodEnd?: Date | null | undefined;
    externalIds?: Record<string, string> | undefined;
    invoiceNumber?: string | null | undefined;
    dueDate?: Date | null | undefined;
    subtotal?: number | null | undefined;
    tax?: number | undefined;
    amountPaid?: number | undefined;
    amountDue?: number | null | undefined;
    lines?: {
        amount: number;
        description?: string | null | undefined;
        currency?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
        externalId?: string | null | undefined;
        quantity?: number | undefined;
        unitPrice?: number | null | undefined;
        serviceStart?: Date | null | undefined;
        serviceEnd?: Date | null | undefined;
        productExternalId?: string | null | undefined;
    }[] | undefined;
    customerExternalId?: string | null | undefined;
    contractExternalId?: string | null | undefined;
}>;
export type NormalizedInvoice = z.infer<typeof NormalizedInvoiceSchema>;
export declare const NormalizedInvoiceLineSchema: z.ZodObject<{
    externalId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    productExternalId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    quantity: z.ZodDefault<z.ZodNumber>;
    unitPrice: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    amount: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    serviceStart: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
    serviceEnd: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    currency: string;
    amount: number;
    metadata: Record<string, unknown>;
    quantity: number;
    description?: string | null | undefined;
    externalId?: string | null | undefined;
    unitPrice?: number | null | undefined;
    serviceStart?: Date | null | undefined;
    serviceEnd?: Date | null | undefined;
    productExternalId?: string | null | undefined;
}, {
    amount: number;
    description?: string | null | undefined;
    currency?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    externalId?: string | null | undefined;
    quantity?: number | undefined;
    unitPrice?: number | null | undefined;
    serviceStart?: Date | null | undefined;
    serviceEnd?: Date | null | undefined;
    productExternalId?: string | null | undefined;
}>;
export type NormalizedInvoiceLine = z.infer<typeof NormalizedInvoiceLineSchema>;
export declare const NormalizedPaymentSchema: z.ZodObject<{
    externalId: z.ZodString;
    externalIds: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    invoiceExternalId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    customerExternalId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    amount: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    paymentDate: z.ZodDate;
    method: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodDefault<z.ZodEnum<["pending", "succeeded", "failed", "refunded", "partially_refunded"]>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    source: z.ZodObject<{
        system: z.ZodString;
        batchId: z.ZodOptional<z.ZodString>;
        recordId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    }, {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "failed" | "succeeded" | "refunded" | "partially_refunded";
    currency: string;
    amount: number;
    metadata: Record<string, unknown>;
    source: {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    };
    externalId: string;
    externalIds: Record<string, string>;
    paymentDate: Date;
    method?: string | null | undefined;
    customerExternalId?: string | null | undefined;
    invoiceExternalId?: string | null | undefined;
}, {
    amount: number;
    source: {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    };
    externalId: string;
    paymentDate: Date;
    status?: "pending" | "failed" | "succeeded" | "refunded" | "partially_refunded" | undefined;
    currency?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    method?: string | null | undefined;
    externalIds?: Record<string, string> | undefined;
    customerExternalId?: string | null | undefined;
    invoiceExternalId?: string | null | undefined;
}>;
export type NormalizedPayment = z.infer<typeof NormalizedPaymentSchema>;
export declare const NormalizedProductSchema: z.ZodObject<{
    externalId: z.ZodString;
    externalIds: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    sku: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    category: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodDefault<z.ZodEnum<["active", "inactive", "archived"]>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    source: z.ZodObject<{
        system: z.ZodString;
        batchId: z.ZodOptional<z.ZodString>;
        recordId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    }, {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "archived" | "inactive";
    name: string;
    metadata: Record<string, unknown>;
    source: {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    };
    externalId: string;
    externalIds: Record<string, string>;
    description?: string | null | undefined;
    category?: string | null | undefined;
    sku?: string | null | undefined;
}, {
    name: string;
    source: {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    };
    externalId: string;
    status?: "active" | "archived" | "inactive" | undefined;
    description?: string | null | undefined;
    metadata?: Record<string, unknown> | undefined;
    category?: string | null | undefined;
    externalIds?: Record<string, string> | undefined;
    sku?: string | null | undefined;
}>;
export type NormalizedProduct = z.infer<typeof NormalizedProductSchema>;
export declare const NormalizedPricePlanSchema: z.ZodObject<{
    externalId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    externalIds: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    productExternalId: z.ZodString;
    name: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    billingCadence: z.ZodNullable<z.ZodOptional<z.ZodEnum<["monthly", "quarterly", "annually", "one_time", "usage_based"]>>>;
    currency: z.ZodDefault<z.ZodString>;
    price: z.ZodObject<{
        type: z.ZodDefault<z.ZodEnum<["flat", "tiered", "volume", "graduated"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        tiers: z.ZodOptional<z.ZodArray<z.ZodObject<{
            upTo: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
            unitAmount: z.ZodNumber;
            flatAmount: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            unitAmount: number;
            upTo?: number | null | undefined;
            flatAmount?: number | undefined;
        }, {
            unitAmount: number;
            upTo?: number | null | undefined;
            flatAmount?: number | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "flat" | "tiered" | "volume" | "graduated";
        amount?: number | undefined;
        tiers?: {
            unitAmount: number;
            upTo?: number | null | undefined;
            flatAmount?: number | undefined;
        }[] | undefined;
    }, {
        type?: "flat" | "tiered" | "volume" | "graduated" | undefined;
        amount?: number | undefined;
        tiers?: {
            unitAmount: number;
            upTo?: number | null | undefined;
            flatAmount?: number | undefined;
        }[] | undefined;
    }>;
    status: z.ZodDefault<z.ZodEnum<["active", "inactive", "archived"]>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    source: z.ZodObject<{
        system: z.ZodString;
        batchId: z.ZodOptional<z.ZodString>;
        recordId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    }, {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    price: {
        type: "flat" | "tiered" | "volume" | "graduated";
        amount?: number | undefined;
        tiers?: {
            unitAmount: number;
            upTo?: number | null | undefined;
            flatAmount?: number | undefined;
        }[] | undefined;
    };
    status: "active" | "archived" | "inactive";
    currency: string;
    metadata: Record<string, unknown>;
    source: {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    };
    externalIds: Record<string, string>;
    productExternalId: string;
    name?: string | null | undefined;
    externalId?: string | null | undefined;
    billingCadence?: "usage_based" | "monthly" | "quarterly" | "annually" | "one_time" | null | undefined;
}, {
    price: {
        type?: "flat" | "tiered" | "volume" | "graduated" | undefined;
        amount?: number | undefined;
        tiers?: {
            unitAmount: number;
            upTo?: number | null | undefined;
            flatAmount?: number | undefined;
        }[] | undefined;
    };
    source: {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    };
    productExternalId: string;
    status?: "active" | "archived" | "inactive" | undefined;
    name?: string | null | undefined;
    currency?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    externalId?: string | null | undefined;
    externalIds?: Record<string, string> | undefined;
    billingCadence?: "usage_based" | "monthly" | "quarterly" | "annually" | "one_time" | null | undefined;
}>;
export type NormalizedPricePlan = z.infer<typeof NormalizedPricePlanSchema>;
export declare const NormalizedUsageEventSchema: z.ZodObject<{
    externalId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    customerExternalId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    contractExternalId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    productExternalId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    metric: z.ZodString;
    quantity: z.ZodNumber;
    unit: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    eventTime: z.ZodDate;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    source: z.ZodObject<{
        system: z.ZodString;
        batchId: z.ZodOptional<z.ZodString>;
        recordId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    }, {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    metadata: Record<string, unknown>;
    source: {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    };
    quantity: number;
    metric: string;
    eventTime: Date;
    externalId?: string | null | undefined;
    unit?: string | null | undefined;
    customerExternalId?: string | null | undefined;
    contractExternalId?: string | null | undefined;
    productExternalId?: string | null | undefined;
}, {
    source: {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    };
    quantity: number;
    metric: string;
    eventTime: Date;
    metadata?: Record<string, unknown> | undefined;
    externalId?: string | null | undefined;
    unit?: string | null | undefined;
    customerExternalId?: string | null | undefined;
    contractExternalId?: string | null | undefined;
    productExternalId?: string | null | undefined;
}>;
export type NormalizedUsageEvent = z.infer<typeof NormalizedUsageEventSchema>;
export declare const NormalizedRecordSchema: z.ZodDiscriminatedUnion<"_type", [z.ZodObject<{
    externalId: z.ZodString;
    externalIds: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    name: z.ZodString;
    email: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodDefault<z.ZodEnum<["active", "inactive", "churned", "prospect"]>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    source: z.ZodObject<{
        system: z.ZodString;
        batchId: z.ZodOptional<z.ZodString>;
        recordId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    }, {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    }>;
} & {
    _type: z.ZodLiteral<"customer">;
}, "strip", z.ZodTypeAny, {
    status: "active" | "inactive" | "churned" | "prospect";
    name: string;
    metadata: Record<string, unknown>;
    source: {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    };
    externalId: string;
    externalIds: Record<string, string>;
    _type: "customer";
    email?: string | null | undefined;
}, {
    name: string;
    source: {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    };
    externalId: string;
    _type: "customer";
    status?: "active" | "inactive" | "churned" | "prospect" | undefined;
    email?: string | null | undefined;
    metadata?: Record<string, unknown> | undefined;
    externalIds?: Record<string, string> | undefined;
}>, z.ZodObject<{
    externalId: z.ZodString;
    externalIds: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    customerExternalId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    name: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodDefault<z.ZodEnum<["draft", "active", "expired", "cancelled", "renewed"]>>;
    startDate: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
    endDate: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
    arr: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    currency: z.ZodDefault<z.ZodString>;
    billingFrequency: z.ZodNullable<z.ZodOptional<z.ZodEnum<["monthly", "quarterly", "annually", "one_time"]>>>;
    autoRenew: z.ZodDefault<z.ZodBoolean>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    source: z.ZodObject<{
        system: z.ZodString;
        batchId: z.ZodOptional<z.ZodString>;
        recordId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    }, {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    }>;
} & {
    _type: z.ZodLiteral<"contract">;
}, "strip", z.ZodTypeAny, {
    status: "active" | "cancelled" | "expired" | "draft" | "renewed";
    currency: string;
    autoRenew: boolean;
    metadata: Record<string, unknown>;
    source: {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    };
    externalId: string;
    externalIds: Record<string, string>;
    _type: "contract";
    name?: string | null | undefined;
    arr?: number | null | undefined;
    startDate?: Date | null | undefined;
    endDate?: Date | null | undefined;
    billingFrequency?: "monthly" | "quarterly" | "annually" | "one_time" | null | undefined;
    customerExternalId?: string | null | undefined;
}, {
    source: {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    };
    externalId: string;
    _type: "contract";
    status?: "active" | "cancelled" | "expired" | "draft" | "renewed" | undefined;
    name?: string | null | undefined;
    currency?: string | undefined;
    autoRenew?: boolean | undefined;
    metadata?: Record<string, unknown> | undefined;
    arr?: number | null | undefined;
    startDate?: Date | null | undefined;
    endDate?: Date | null | undefined;
    billingFrequency?: "monthly" | "quarterly" | "annually" | "one_time" | null | undefined;
    externalIds?: Record<string, string> | undefined;
    customerExternalId?: string | null | undefined;
}>, z.ZodObject<{
    externalId: z.ZodString;
    externalIds: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    customerExternalId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    contractExternalId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    invoiceNumber: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    invoiceDate: z.ZodDate;
    dueDate: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
    currency: z.ZodDefault<z.ZodString>;
    subtotal: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    tax: z.ZodDefault<z.ZodNumber>;
    total: z.ZodNumber;
    amountPaid: z.ZodDefault<z.ZodNumber>;
    amountDue: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    status: z.ZodDefault<z.ZodEnum<["draft", "open", "paid", "void", "uncollectible", "past_due"]>>;
    periodStart: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
    periodEnd: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
    lines: z.ZodDefault<z.ZodArray<z.ZodLazy<z.ZodObject<{
        externalId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        productExternalId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        quantity: z.ZodDefault<z.ZodNumber>;
        unitPrice: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        amount: z.ZodNumber;
        currency: z.ZodDefault<z.ZodString>;
        serviceStart: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
        serviceEnd: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        amount: number;
        metadata: Record<string, unknown>;
        quantity: number;
        description?: string | null | undefined;
        externalId?: string | null | undefined;
        unitPrice?: number | null | undefined;
        serviceStart?: Date | null | undefined;
        serviceEnd?: Date | null | undefined;
        productExternalId?: string | null | undefined;
    }, {
        amount: number;
        description?: string | null | undefined;
        currency?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
        externalId?: string | null | undefined;
        quantity?: number | undefined;
        unitPrice?: number | null | undefined;
        serviceStart?: Date | null | undefined;
        serviceEnd?: Date | null | undefined;
        productExternalId?: string | null | undefined;
    }>>, "many">>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    source: z.ZodObject<{
        system: z.ZodString;
        batchId: z.ZodOptional<z.ZodString>;
        recordId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    }, {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    }>;
} & {
    _type: z.ZodLiteral<"invoice">;
}, "strip", z.ZodTypeAny, {
    status: "void" | "open" | "draft" | "paid" | "uncollectible" | "past_due";
    total: number;
    currency: string;
    metadata: Record<string, unknown>;
    source: {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    };
    externalId: string;
    invoiceDate: Date;
    externalIds: Record<string, string>;
    tax: number;
    amountPaid: number;
    lines: {
        currency: string;
        amount: number;
        metadata: Record<string, unknown>;
        quantity: number;
        description?: string | null | undefined;
        externalId?: string | null | undefined;
        unitPrice?: number | null | undefined;
        serviceStart?: Date | null | undefined;
        serviceEnd?: Date | null | undefined;
        productExternalId?: string | null | undefined;
    }[];
    _type: "invoice";
    periodStart?: Date | null | undefined;
    periodEnd?: Date | null | undefined;
    invoiceNumber?: string | null | undefined;
    dueDate?: Date | null | undefined;
    subtotal?: number | null | undefined;
    amountDue?: number | null | undefined;
    customerExternalId?: string | null | undefined;
    contractExternalId?: string | null | undefined;
}, {
    total: number;
    source: {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    };
    externalId: string;
    invoiceDate: Date;
    _type: "invoice";
    status?: "void" | "open" | "draft" | "paid" | "uncollectible" | "past_due" | undefined;
    currency?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    periodStart?: Date | null | undefined;
    periodEnd?: Date | null | undefined;
    externalIds?: Record<string, string> | undefined;
    invoiceNumber?: string | null | undefined;
    dueDate?: Date | null | undefined;
    subtotal?: number | null | undefined;
    tax?: number | undefined;
    amountPaid?: number | undefined;
    amountDue?: number | null | undefined;
    lines?: {
        amount: number;
        description?: string | null | undefined;
        currency?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
        externalId?: string | null | undefined;
        quantity?: number | undefined;
        unitPrice?: number | null | undefined;
        serviceStart?: Date | null | undefined;
        serviceEnd?: Date | null | undefined;
        productExternalId?: string | null | undefined;
    }[] | undefined;
    customerExternalId?: string | null | undefined;
    contractExternalId?: string | null | undefined;
}>, z.ZodObject<{
    externalId: z.ZodString;
    externalIds: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    invoiceExternalId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    customerExternalId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    amount: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    paymentDate: z.ZodDate;
    method: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodDefault<z.ZodEnum<["pending", "succeeded", "failed", "refunded", "partially_refunded"]>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    source: z.ZodObject<{
        system: z.ZodString;
        batchId: z.ZodOptional<z.ZodString>;
        recordId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    }, {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    }>;
} & {
    _type: z.ZodLiteral<"payment">;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "failed" | "succeeded" | "refunded" | "partially_refunded";
    currency: string;
    amount: number;
    metadata: Record<string, unknown>;
    source: {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    };
    externalId: string;
    externalIds: Record<string, string>;
    paymentDate: Date;
    _type: "payment";
    method?: string | null | undefined;
    customerExternalId?: string | null | undefined;
    invoiceExternalId?: string | null | undefined;
}, {
    amount: number;
    source: {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    };
    externalId: string;
    paymentDate: Date;
    _type: "payment";
    status?: "pending" | "failed" | "succeeded" | "refunded" | "partially_refunded" | undefined;
    currency?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    method?: string | null | undefined;
    externalIds?: Record<string, string> | undefined;
    customerExternalId?: string | null | undefined;
    invoiceExternalId?: string | null | undefined;
}>, z.ZodObject<{
    externalId: z.ZodString;
    externalIds: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    sku: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    category: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodDefault<z.ZodEnum<["active", "inactive", "archived"]>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    source: z.ZodObject<{
        system: z.ZodString;
        batchId: z.ZodOptional<z.ZodString>;
        recordId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    }, {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    }>;
} & {
    _type: z.ZodLiteral<"product">;
}, "strip", z.ZodTypeAny, {
    status: "active" | "archived" | "inactive";
    name: string;
    metadata: Record<string, unknown>;
    source: {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    };
    externalId: string;
    externalIds: Record<string, string>;
    _type: "product";
    description?: string | null | undefined;
    category?: string | null | undefined;
    sku?: string | null | undefined;
}, {
    name: string;
    source: {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    };
    externalId: string;
    _type: "product";
    status?: "active" | "archived" | "inactive" | undefined;
    description?: string | null | undefined;
    metadata?: Record<string, unknown> | undefined;
    category?: string | null | undefined;
    externalIds?: Record<string, string> | undefined;
    sku?: string | null | undefined;
}>, z.ZodObject<{
    externalId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    externalIds: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    productExternalId: z.ZodString;
    name: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    billingCadence: z.ZodNullable<z.ZodOptional<z.ZodEnum<["monthly", "quarterly", "annually", "one_time", "usage_based"]>>>;
    currency: z.ZodDefault<z.ZodString>;
    price: z.ZodObject<{
        type: z.ZodDefault<z.ZodEnum<["flat", "tiered", "volume", "graduated"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        tiers: z.ZodOptional<z.ZodArray<z.ZodObject<{
            upTo: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
            unitAmount: z.ZodNumber;
            flatAmount: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            unitAmount: number;
            upTo?: number | null | undefined;
            flatAmount?: number | undefined;
        }, {
            unitAmount: number;
            upTo?: number | null | undefined;
            flatAmount?: number | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "flat" | "tiered" | "volume" | "graduated";
        amount?: number | undefined;
        tiers?: {
            unitAmount: number;
            upTo?: number | null | undefined;
            flatAmount?: number | undefined;
        }[] | undefined;
    }, {
        type?: "flat" | "tiered" | "volume" | "graduated" | undefined;
        amount?: number | undefined;
        tiers?: {
            unitAmount: number;
            upTo?: number | null | undefined;
            flatAmount?: number | undefined;
        }[] | undefined;
    }>;
    status: z.ZodDefault<z.ZodEnum<["active", "inactive", "archived"]>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    source: z.ZodObject<{
        system: z.ZodString;
        batchId: z.ZodOptional<z.ZodString>;
        recordId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    }, {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    }>;
} & {
    _type: z.ZodLiteral<"pricePlan">;
}, "strip", z.ZodTypeAny, {
    price: {
        type: "flat" | "tiered" | "volume" | "graduated";
        amount?: number | undefined;
        tiers?: {
            unitAmount: number;
            upTo?: number | null | undefined;
            flatAmount?: number | undefined;
        }[] | undefined;
    };
    status: "active" | "archived" | "inactive";
    currency: string;
    metadata: Record<string, unknown>;
    source: {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    };
    externalIds: Record<string, string>;
    productExternalId: string;
    _type: "pricePlan";
    name?: string | null | undefined;
    externalId?: string | null | undefined;
    billingCadence?: "usage_based" | "monthly" | "quarterly" | "annually" | "one_time" | null | undefined;
}, {
    price: {
        type?: "flat" | "tiered" | "volume" | "graduated" | undefined;
        amount?: number | undefined;
        tiers?: {
            unitAmount: number;
            upTo?: number | null | undefined;
            flatAmount?: number | undefined;
        }[] | undefined;
    };
    source: {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    };
    productExternalId: string;
    _type: "pricePlan";
    status?: "active" | "archived" | "inactive" | undefined;
    name?: string | null | undefined;
    currency?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    externalId?: string | null | undefined;
    externalIds?: Record<string, string> | undefined;
    billingCadence?: "usage_based" | "monthly" | "quarterly" | "annually" | "one_time" | null | undefined;
}>, z.ZodObject<{
    externalId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    customerExternalId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    contractExternalId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    productExternalId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    metric: z.ZodString;
    quantity: z.ZodNumber;
    unit: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    eventTime: z.ZodDate;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    source: z.ZodObject<{
        system: z.ZodString;
        batchId: z.ZodOptional<z.ZodString>;
        recordId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    }, {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    }>;
} & {
    _type: z.ZodLiteral<"usageEvent">;
}, "strip", z.ZodTypeAny, {
    metadata: Record<string, unknown>;
    source: {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    };
    quantity: number;
    metric: string;
    eventTime: Date;
    _type: "usageEvent";
    externalId?: string | null | undefined;
    unit?: string | null | undefined;
    customerExternalId?: string | null | undefined;
    contractExternalId?: string | null | undefined;
    productExternalId?: string | null | undefined;
}, {
    source: {
        system: string;
        batchId?: string | undefined;
        recordId?: string | undefined;
    };
    quantity: number;
    metric: string;
    eventTime: Date;
    _type: "usageEvent";
    metadata?: Record<string, unknown> | undefined;
    externalId?: string | null | undefined;
    unit?: string | null | undefined;
    customerExternalId?: string | null | undefined;
    contractExternalId?: string | null | undefined;
    productExternalId?: string | null | undefined;
}>]>;
export type NormalizedRecord = z.infer<typeof NormalizedRecordSchema>;
export declare const CANONICAL_OBJECT_TYPES: readonly ["customer", "contract", "invoice", "payment", "product", "pricePlan", "usageEvent"];
export type CanonicalObjectType = typeof CANONICAL_OBJECT_TYPES[number];
export declare const CanonicalObjectTypeSchema: z.ZodEnum<["customer", "contract", "invoice", "payment", "product", "pricePlan", "usageEvent"]>;
//# sourceMappingURL=normalized.d.ts.map