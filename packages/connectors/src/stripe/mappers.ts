/**
 * Stripe Mappers
 * 
 * Pure functions that transform raw Stripe API data into normalized shapes.
 * All mappers validate output with Zod and return validated results.
 */
import {
  NormalizedCustomerSchema,
  NormalizedContractSchema,
  NormalizedInvoiceSchema,
  NormalizedPaymentSchema,
  NormalizedProductSchema,
  NormalizedPricePlanSchema,
  type NormalizedCustomer,
  type NormalizedContract,
  type NormalizedInvoice,
  type NormalizedInvoiceLine,
  type NormalizedPayment,
  type NormalizedProduct,
  type NormalizedPricePlan,
  type SourceInfo,
} from '@cogtics/schemas';

// ============================================
// Raw Stripe Types (from API)
// ============================================

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

// ============================================
// Helper Functions
// ============================================

function unixToDate(unix: number): Date {
  return new Date(unix * 1000);
}

function createSourceInfo(batchId?: string, recordId?: string): SourceInfo {
  return {
    system: 'stripe',
    batchId,
    recordId,
  };
}

function mapStripeSubscriptionStatus(status: string): 'draft' | 'active' | 'expired' | 'cancelled' | 'renewed' {
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

function mapStripeInvoiceStatus(status: string, paid: boolean): 'draft' | 'open' | 'paid' | 'void' | 'uncollectible' | 'past_due' {
  if (paid) return 'paid';
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

function mapStripeChargeStatus(charge: StripeCharge): 'pending' | 'succeeded' | 'failed' | 'refunded' | 'partially_refunded' {
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

function mapBillingInterval(interval?: string): 'monthly' | 'quarterly' | 'annually' | 'one_time' | null {
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

export function mapStripeCustomer(
  raw: StripeCustomer,
  batchId?: string,
): NormalizedCustomer {
  const normalized = {
    externalId: raw.id,
    externalIds: { stripe: raw.id },
    name: raw.name || raw.email || raw.id,
    email: raw.email || null,
    status: raw.delinquent ? 'inactive' : 'active' as const,
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

export function mapStripeSubscription(
  raw: StripeSubscription,
  batchId?: string,
): NormalizedContract {
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

export function mapStripeInvoice(
  raw: StripeInvoice,
  batchId?: string,
): NormalizedInvoice {
  const lines: NormalizedInvoiceLine[] = raw.lines.data.map((line) => ({
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

export function mapStripeCharge(
  raw: StripeCharge,
  batchId?: string,
): NormalizedPayment {
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

export function mapStripeProduct(
  raw: StripeProduct,
  batchId?: string,
): NormalizedProduct {
  const normalized = {
    externalId: raw.id,
    externalIds: { stripe: raw.id },
    sku: null,
    name: raw.name,
    description: raw.description || null,
    category: null,
    status: raw.active ? 'active' : 'inactive' as const,
    metadata: raw.metadata || {},
    source: createSourceInfo(batchId, raw.id),
  };

  return NormalizedProductSchema.parse(normalized);
}

export function mapStripePrice(
  raw: StripePrice,
  batchId?: string,
): NormalizedPricePlan {
  let billingCadence: 'monthly' | 'quarterly' | 'annually' | 'one_time' | 'usage_based' | null = null;
  
  if (raw.type === 'one_time') {
    billingCadence = 'one_time';
  } else if (raw.recurring) {
    billingCadence = mapBillingInterval(raw.recurring.interval);
  }

  const priceData: Record<string, unknown> = {
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
    status: raw.active ? 'active' : 'inactive' as const,
    metadata: raw.metadata || {},
    source: createSourceInfo(batchId, raw.id),
  };

  return NormalizedPricePlanSchema.parse(normalized);
}

// ============================================
// Mapper Registry
// ============================================

export type StripeObjectType = 'customers' | 'subscriptions' | 'invoices' | 'charges' | 'products' | 'prices';

export function mapStripeRecord(
  objectType: StripeObjectType,
  raw: unknown,
  batchId?: string,
): NormalizedCustomer | NormalizedContract | NormalizedInvoice | NormalizedPayment | NormalizedProduct | NormalizedPricePlan {
  switch (objectType) {
    case 'customers':
      return mapStripeCustomer(raw as StripeCustomer, batchId);
    case 'subscriptions':
      return mapStripeSubscription(raw as StripeSubscription, batchId);
    case 'invoices':
      return mapStripeInvoice(raw as StripeInvoice, batchId);
    case 'charges':
      return mapStripeCharge(raw as StripeCharge, batchId);
    case 'products':
      return mapStripeProduct(raw as StripeProduct, batchId);
    case 'prices':
      return mapStripePrice(raw as StripePrice, batchId);
    default:
      throw new Error(`Unknown Stripe object type: ${objectType}`);
  }
}

// Map Stripe object types to canonical types
export const STRIPE_TO_CANONICAL_TYPE: Record<StripeObjectType, string> = {
  customers: 'customer',
  subscriptions: 'contract',
  invoices: 'invoice',
  charges: 'payment',
  products: 'product',
  prices: 'pricePlan',
};

