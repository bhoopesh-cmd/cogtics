/**
 * Stripe Mappers
 *
 * Pure functions that transform raw Stripe API data into normalized shapes.
 * All mappers validate output with Zod and return validated results.
 */
import { type NormalizedCustomer, type NormalizedContract, type NormalizedInvoice, type NormalizedPayment, type NormalizedProduct, type NormalizedPricePlan } from '@cogtics/schemas';
interface StripeCustomer {
    id: string;
    email?: string | null;
    name?: string | null;
    phone?: string | null;
    description?: string | null;
    created: number;
    metadata?: Record<string, string>;
    address?: Record<string, unknown>;
    balance?: number;
    currency?: string;
    delinquent?: boolean;
    livemode: boolean;
}
interface StripeSubscription {
    id: string;
    customer: string;
    status: string;
    current_period_start: number;
    current_period_end: number;
    created: number;
    canceled_at?: number | null;
    ended_at?: number | null;
    trial_start?: number | null;
    trial_end?: number | null;
    items: {
        data: Array<{
            id: string;
            price: {
                id: string;
                unit_amount?: number;
                currency: string;
                recurring?: {
                    interval: string;
                    interval_count: number;
                };
            };
            quantity: number;
        }>;
    };
    metadata?: Record<string, string>;
    livemode: boolean;
}
interface StripeInvoice {
    id: string;
    customer: string;
    subscription?: string | null;
    status: string;
    number?: string | null;
    amount_due: number;
    amount_paid: number;
    amount_remaining: number;
    subtotal: number;
    tax?: number | null;
    total: number;
    currency: string;
    created: number;
    due_date?: number | null;
    paid: boolean;
    period_start: number;
    period_end: number;
    lines: {
        data: Array<{
            id: string;
            description?: string | null;
            amount: number;
            currency: string;
            quantity?: number | null;
            price?: {
                id: string;
                product: string;
                unit_amount?: number | null;
            };
            period?: {
                start: number;
                end: number;
            };
        }>;
    };
    metadata?: Record<string, string>;
    livemode: boolean;
}
interface StripeCharge {
    id: string;
    customer?: string | null;
    invoice?: string | null;
    amount: number;
    currency: string;
    status: string;
    paid: boolean;
    refunded: boolean;
    amount_refunded?: number;
    created: number;
    description?: string | null;
    payment_method?: string | null;
    payment_method_details?: {
        type: string;
    };
    metadata?: Record<string, string>;
    livemode: boolean;
}
interface StripeProduct {
    id: string;
    name: string;
    active: boolean;
    description?: string | null;
    created: number;
    updated: number;
    metadata?: Record<string, string>;
    livemode: boolean;
}
interface StripePrice {
    id: string;
    product: string;
    active: boolean;
    currency: string;
    unit_amount?: number | null;
    type: 'one_time' | 'recurring';
    billing_scheme: string;
    created: number;
    recurring?: {
        interval: 'day' | 'week' | 'month' | 'year';
        interval_count: number;
    };
    tiers?: Array<{
        up_to: number | null;
        unit_amount: number;
        flat_amount?: number;
    }>;
    metadata?: Record<string, string>;
    livemode: boolean;
}
export declare function mapStripeCustomer(raw: StripeCustomer, batchId?: string): NormalizedCustomer;
export declare function mapStripeSubscription(raw: StripeSubscription, batchId?: string): NormalizedContract;
export declare function mapStripeInvoice(raw: StripeInvoice, batchId?: string): NormalizedInvoice;
export declare function mapStripeCharge(raw: StripeCharge, batchId?: string): NormalizedPayment;
export declare function mapStripeProduct(raw: StripeProduct, batchId?: string): NormalizedProduct;
export declare function mapStripePrice(raw: StripePrice, batchId?: string): NormalizedPricePlan;
export type StripeObjectType = 'customers' | 'subscriptions' | 'invoices' | 'charges' | 'products' | 'prices';
export declare function mapStripeRecord(objectType: StripeObjectType, raw: unknown, batchId?: string): NormalizedCustomer | NormalizedContract | NormalizedInvoice | NormalizedPayment | NormalizedProduct | NormalizedPricePlan;
export declare const STRIPE_TO_CANONICAL_TYPE: Record<StripeObjectType, string>;
export {};
//# sourceMappingURL=mappers.d.ts.map