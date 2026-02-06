/**
 * Stripe Mappers
 *
 * Pure functions that transform raw Stripe API data into normalized shapes.
 * All mappers validate output with Zod and return validated results.
 */
import { NormalizedCustomerSchema, NormalizedContractSchema, NormalizedInvoiceSchema, NormalizedPaymentSchema, NormalizedProductSchema, NormalizedPricePlanSchema, } from '@cogtics/schemas';
// ============================================
// Helper Functions
// ============================================
function unixToDate(unix) {
    return new Date(unix * 1000);
}
function createSourceInfo(batchId, recordId) {
    return {
        system: 'stripe',
        batchId,
        recordId,
    };
}
function mapStripeSubscriptionStatus(status) {
    switch (status) {
        case 'active':
        case 'trialing':
            return 'active';
        case 'canceled':
        case 'incomplete_expired':
            return 'cancelled';
        case 'past_due':
        case 'unpaid':
            return 'active'; // Still active but payment issues
        case 'incomplete':
            return 'draft';
        default:
            return 'active';
    }
}
function mapStripeInvoiceStatus(status, paid) {
    if (paid)
        return 'paid';
    switch (status) {
        case 'draft':
            return 'draft';
        case 'open':
            return 'open';
        case 'paid':
            return 'paid';
        case 'void':
            return 'void';
        case 'uncollectible':
            return 'uncollectible';
        default:
            return 'open';
    }
}
function mapStripeChargeStatus(charge) {
    if (charge.refunded && charge.amount_refunded === charge.amount) {
        return 'refunded';
    }
    if (charge.amount_refunded && charge.amount_refunded > 0) {
        return 'partially_refunded';
    }
    switch (charge.status) {
        case 'succeeded':
            return 'succeeded';
        case 'pending':
            return 'pending';
        case 'failed':
            return 'failed';
        default:
            return 'pending';
    }
}
function mapBillingInterval(interval) {
    switch (interval) {
        case 'month':
            return 'monthly';
        case 'year':
            return 'annually';
        case 'week':
        case 'day':
            return 'monthly'; // Approximate
        default:
            return null;
    }
}
// ============================================
// Mapper Functions
// ============================================
export function mapStripeCustomer(raw, batchId) {
    const normalized = {
        externalId: raw.id,
        externalIds: { stripe: raw.id },
        name: raw.name || raw.email || raw.id,
        email: raw.email || null,
        status: raw.delinquent ? 'inactive' : 'active',
        metadata: {
            phone: raw.phone,
            description: raw.description,
            address: raw.address,
            balance: raw.balance,
            currency: raw.currency,
            ...raw.metadata,
        },
        source: createSourceInfo(batchId, raw.id),
    };
    return NormalizedCustomerSchema.parse(normalized);
}
export function mapStripeSubscription(raw, batchId) {
    // Calculate ARR from subscription items
    let arr = 0;
    const currency = raw.items.data[0]?.price?.currency?.toUpperCase() || 'USD';
    for (const item of raw.items.data) {
        const unitAmount = (item.price.unit_amount || 0) / 100; // Convert from cents
        const quantity = item.quantity || 1;
        const interval = item.price.recurring?.interval;
        const intervalCount = item.price.recurring?.interval_count || 1;
        let annualMultiplier = 1;
        switch (interval) {
            case 'day':
                annualMultiplier = 365 / intervalCount;
                break;
            case 'week':
                annualMultiplier = 52 / intervalCount;
                break;
            case 'month':
                annualMultiplier = 12 / intervalCount;
                break;
            case 'year':
                annualMultiplier = 1 / intervalCount;
                break;
        }
        arr += unitAmount * quantity * annualMultiplier;
    }
    const normalized = {
        externalId: raw.id,
        externalIds: { stripe: raw.id },
        customerExternalId: raw.customer,
        name: `Subscription ${raw.id}`,
        status: mapStripeSubscriptionStatus(raw.status),
        startDate: unixToDate(raw.current_period_start),
        endDate: raw.ended_at ? unixToDate(raw.ended_at) : unixToDate(raw.current_period_end),
        arr,
        currency,
        billingFrequency: mapBillingInterval(raw.items.data[0]?.price?.recurring?.interval),
        autoRenew: !raw.canceled_at,
        metadata: {
            stripeStatus: raw.status,
            trialStart: raw.trial_start,
            trialEnd: raw.trial_end,
            ...raw.metadata,
        },
        source: createSourceInfo(batchId, raw.id),
    };
    return NormalizedContractSchema.parse(normalized);
}
export function mapStripeInvoice(raw, batchId) {
    const lines = raw.lines.data.map((line) => ({
        externalId: line.id,
        productExternalId: line.price?.product || null,
        description: line.description || null,
        quantity: line.quantity || 1,
        unitPrice: line.price?.unit_amount ? line.price.unit_amount / 100 : null,
        amount: line.amount / 100, // Convert from cents
        currency: line.currency.toUpperCase(),
        serviceStart: line.period?.start ? unixToDate(line.period.start) : null,
        serviceEnd: line.period?.end ? unixToDate(line.period.end) : null,
        metadata: {},
    }));
    const normalized = {
        externalId: raw.id,
        externalIds: { stripe: raw.id },
        customerExternalId: raw.customer,
        contractExternalId: raw.subscription || null,
        invoiceNumber: raw.number || null,
        invoiceDate: unixToDate(raw.created),
        dueDate: raw.due_date ? unixToDate(raw.due_date) : null,
        currency: raw.currency.toUpperCase(),
        subtotal: raw.subtotal / 100,
        tax: (raw.tax || 0) / 100,
        total: raw.total / 100,
        amountPaid: raw.amount_paid / 100,
        amountDue: raw.amount_remaining / 100,
        status: mapStripeInvoiceStatus(raw.status, raw.paid),
        periodStart: unixToDate(raw.period_start),
        periodEnd: unixToDate(raw.period_end),
        lines,
        metadata: raw.metadata || {},
        source: createSourceInfo(batchId, raw.id),
    };
    return NormalizedInvoiceSchema.parse(normalized);
}
export function mapStripeCharge(raw, batchId) {
    const normalized = {
        externalId: raw.id,
        externalIds: { stripe: raw.id },
        invoiceExternalId: raw.invoice || null,
        customerExternalId: raw.customer || null,
        amount: raw.amount / 100, // Convert from cents
        currency: raw.currency.toUpperCase(),
        paymentDate: unixToDate(raw.created),
        method: raw.payment_method_details?.type || raw.payment_method || null,
        status: mapStripeChargeStatus(raw),
        metadata: {
            description: raw.description,
            ...raw.metadata,
        },
        source: createSourceInfo(batchId, raw.id),
    };
    return NormalizedPaymentSchema.parse(normalized);
}
export function mapStripeProduct(raw, batchId) {
    const normalized = {
        externalId: raw.id,
        externalIds: { stripe: raw.id },
        sku: null,
        name: raw.name,
        description: raw.description || null,
        category: null,
        status: raw.active ? 'active' : 'inactive',
        metadata: raw.metadata || {},
        source: createSourceInfo(batchId, raw.id),
    };
    return NormalizedProductSchema.parse(normalized);
}
export function mapStripePrice(raw, batchId) {
    let billingCadence = null;
    if (raw.type === 'one_time') {
        billingCadence = 'one_time';
    }
    else if (raw.recurring) {
        billingCadence = mapBillingInterval(raw.recurring.interval);
    }
    const priceData = {
        type: raw.billing_scheme === 'tiered' ? 'tiered' : 'flat',
        amount: raw.unit_amount ? raw.unit_amount / 100 : undefined,
    };
    if (raw.tiers) {
        priceData.tiers = raw.tiers.map((tier) => ({
            upTo: tier.up_to,
            unitAmount: tier.unit_amount / 100,
            flatAmount: tier.flat_amount ? tier.flat_amount / 100 : undefined,
        }));
    }
    const normalized = {
        externalId: raw.id,
        externalIds: { stripe: raw.id },
        productExternalId: raw.product,
        name: null,
        billingCadence,
        currency: raw.currency.toUpperCase(),
        price: priceData,
        status: raw.active ? 'active' : 'inactive',
        metadata: raw.metadata || {},
        source: createSourceInfo(batchId, raw.id),
    };
    return NormalizedPricePlanSchema.parse(normalized);
}
export function mapStripeRecord(objectType, raw, batchId) {
    switch (objectType) {
        case 'customers':
            return mapStripeCustomer(raw, batchId);
        case 'subscriptions':
            return mapStripeSubscription(raw, batchId);
        case 'invoices':
            return mapStripeInvoice(raw, batchId);
        case 'charges':
            return mapStripeCharge(raw, batchId);
        case 'products':
            return mapStripeProduct(raw, batchId);
        case 'prices':
            return mapStripePrice(raw, batchId);
        default:
            throw new Error(`Unknown Stripe object type: ${objectType}`);
    }
}
// Map Stripe object types to canonical types
export const STRIPE_TO_CANONICAL_TYPE = {
    customers: 'customer',
    subscriptions: 'contract',
    invoices: 'invoice',
    charges: 'payment',
    products: 'product',
    prices: 'pricePlan',
};
//# sourceMappingURL=mappers.js.map