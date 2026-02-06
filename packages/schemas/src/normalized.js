/**
 * Normalized Schemas
 *
 * Intermediate shapes between raw provider data and canonical tables.
 * These are the output of mapper functions and input to canonical upsert.
 */
import { z } from 'zod';
// ============================================
// Common Types
// ============================================
export const ExternalIdSchema = z.object({
    provider: z.string(),
    id: z.string(),
});
export const SourceInfoSchema = z.object({
    system: z.string(),
    batchId: z.string().optional(),
    recordId: z.string().optional(),
});
// ============================================
// Normalized Customer
// ============================================
export const NormalizedCustomerSchema = z.object({
    externalId: z.string(),
    externalIds: z.record(z.string()).default({}),
    name: z.string(),
    email: z.string().email().optional().nullable(),
    status: z.enum(['active', 'inactive', 'churned', 'prospect']).default('active'),
    metadata: z.record(z.unknown()).default({}),
    source: SourceInfoSchema,
});
// ============================================
// Normalized Contract
// ============================================
export const NormalizedContractSchema = z.object({
    externalId: z.string(),
    externalIds: z.record(z.string()).default({}),
    customerExternalId: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    status: z.enum(['draft', 'active', 'expired', 'cancelled', 'renewed']).default('active'),
    startDate: z.coerce.date().optional().nullable(),
    endDate: z.coerce.date().optional().nullable(),
    arr: z.number().optional().nullable(),
    currency: z.string().default('USD'),
    billingFrequency: z.enum(['monthly', 'quarterly', 'annually', 'one_time']).optional().nullable(),
    autoRenew: z.boolean().default(false),
    metadata: z.record(z.unknown()).default({}),
    source: SourceInfoSchema,
});
// ============================================
// Normalized Invoice
// ============================================
export const NormalizedInvoiceSchema = z.object({
    externalId: z.string(),
    externalIds: z.record(z.string()).default({}),
    customerExternalId: z.string().optional().nullable(),
    contractExternalId: z.string().optional().nullable(),
    invoiceNumber: z.string().optional().nullable(),
    invoiceDate: z.coerce.date(),
    dueDate: z.coerce.date().optional().nullable(),
    currency: z.string().default('USD'),
    subtotal: z.number().optional().nullable(),
    tax: z.number().default(0),
    total: z.number(),
    amountPaid: z.number().default(0),
    amountDue: z.number().optional().nullable(),
    status: z.enum(['draft', 'open', 'paid', 'void', 'uncollectible', 'past_due']).default('open'),
    periodStart: z.coerce.date().optional().nullable(),
    periodEnd: z.coerce.date().optional().nullable(),
    lines: z.array(z.lazy(() => NormalizedInvoiceLineSchema)).default([]),
    metadata: z.record(z.unknown()).default({}),
    source: SourceInfoSchema,
});
// ============================================
// Normalized Invoice Line
// ============================================
export const NormalizedInvoiceLineSchema = z.object({
    externalId: z.string().optional().nullable(),
    productExternalId: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    quantity: z.number().default(1),
    unitPrice: z.number().optional().nullable(),
    amount: z.number(),
    currency: z.string().default('USD'),
    serviceStart: z.coerce.date().optional().nullable(),
    serviceEnd: z.coerce.date().optional().nullable(),
    metadata: z.record(z.unknown()).default({}),
});
// ============================================
// Normalized Payment
// ============================================
export const NormalizedPaymentSchema = z.object({
    externalId: z.string(),
    externalIds: z.record(z.string()).default({}),
    invoiceExternalId: z.string().optional().nullable(),
    customerExternalId: z.string().optional().nullable(),
    amount: z.number(),
    currency: z.string().default('USD'),
    paymentDate: z.coerce.date(),
    method: z.string().optional().nullable(),
    status: z.enum(['pending', 'succeeded', 'failed', 'refunded', 'partially_refunded']).default('pending'),
    metadata: z.record(z.unknown()).default({}),
    source: SourceInfoSchema,
});
// ============================================
// Normalized Product
// ============================================
export const NormalizedProductSchema = z.object({
    externalId: z.string(),
    externalIds: z.record(z.string()).default({}),
    sku: z.string().optional().nullable(),
    name: z.string(),
    description: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    status: z.enum(['active', 'inactive', 'archived']).default('active'),
    metadata: z.record(z.unknown()).default({}),
    source: SourceInfoSchema,
});
// ============================================
// Normalized Price Plan
// ============================================
export const NormalizedPricePlanSchema = z.object({
    externalId: z.string().optional().nullable(),
    externalIds: z.record(z.string()).default({}),
    productExternalId: z.string(),
    name: z.string().optional().nullable(),
    billingCadence: z.enum(['monthly', 'quarterly', 'annually', 'one_time', 'usage_based']).optional().nullable(),
    currency: z.string().default('USD'),
    price: z.object({
        type: z.enum(['flat', 'tiered', 'volume', 'graduated']).default('flat'),
        amount: z.number().optional(),
        tiers: z.array(z.object({
            upTo: z.number().optional().nullable(),
            unitAmount: z.number(),
            flatAmount: z.number().optional(),
        })).optional(),
    }),
    status: z.enum(['active', 'inactive', 'archived']).default('active'),
    metadata: z.record(z.unknown()).default({}),
    source: SourceInfoSchema,
});
// ============================================
// Normalized Usage Event
// ============================================
export const NormalizedUsageEventSchema = z.object({
    externalId: z.string().optional().nullable(),
    customerExternalId: z.string().optional().nullable(),
    contractExternalId: z.string().optional().nullable(),
    productExternalId: z.string().optional().nullable(),
    metric: z.string(),
    quantity: z.number(),
    unit: z.string().optional().nullable(),
    eventTime: z.coerce.date(),
    metadata: z.record(z.unknown()).default({}),
    source: SourceInfoSchema,
});
// ============================================
// Union type for all normalized records
// ============================================
export const NormalizedRecordSchema = z.discriminatedUnion('_type', [
    NormalizedCustomerSchema.extend({ _type: z.literal('customer') }),
    NormalizedContractSchema.extend({ _type: z.literal('contract') }),
    NormalizedInvoiceSchema.extend({ _type: z.literal('invoice') }),
    NormalizedPaymentSchema.extend({ _type: z.literal('payment') }),
    NormalizedProductSchema.extend({ _type: z.literal('product') }),
    NormalizedPricePlanSchema.extend({ _type: z.literal('pricePlan') }),
    NormalizedUsageEventSchema.extend({ _type: z.literal('usageEvent') }),
]);
// ============================================
// Object type mapping
// ============================================
export const CANONICAL_OBJECT_TYPES = [
    'customer',
    'contract',
    'invoice',
    'payment',
    'product',
    'pricePlan',
    'usageEvent',
];
export const CanonicalObjectTypeSchema = z.enum(CANONICAL_OBJECT_TYPES);
//# sourceMappingURL=normalized.js.map