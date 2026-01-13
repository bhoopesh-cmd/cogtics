/**
 * Ingest Upsert Processor
 * 
 * Reads normalized staging records and upserts them into canonical tables.
 * Uses idempotent writes with ON CONFLICT DO NOTHING.
 */
import type { Logger } from 'pino';
import type { Kysely, Database } from '@cogtics/db';
import type { IngestUpsertJobPayload, JobResult } from '@cogtics/schemas';
import {
  createSyncRunId,
  createCustomerId,
  createContractId,
  createInvoiceId,
  createInvoiceLineId,
  createPaymentId,
  createProductId,
  createPricePlanId,
} from '@cogtics/schemas';
import type {
  NormalizedCustomer,
  NormalizedContract,
  NormalizedInvoice,
  NormalizedPayment,
  NormalizedProduct,
  NormalizedPricePlan,
} from '@cogtics/schemas';

interface IngestUpsertContext {
  db: Kysely<Database>;
  logger: Logger;
  snapshotId: string;
  tenantId: string;
  // Cache for customer/product ID lookups
  customerIdCache: Map<string, string>;
  productIdCache: Map<string, string>;
  contractIdCache: Map<string, string>;
  invoiceIdCache: Map<string, string>;
}

/**
 * Process ingest.upsert job
 */
export async function processIngestUpsertJob(
  payload: IngestUpsertJobPayload,
  logger: Logger,
  db: Kysely<Database>
): Promise<JobResult> {
  const { tenantId, snapshotId, objectTypes, batchSize } = payload;
  const startTime = Date.now();

  logger.info({ snapshotId, objectTypes, batchSize }, 'Starting ingest upsert');

  const ctx: IngestUpsertContext = {
    db,
    logger,
    snapshotId,
    tenantId: tenantId as string,
    customerIdCache: new Map(),
    productIdCache: new Map(),
    contractIdCache: new Map(),
    invoiceIdCache: new Map(),
  };

  // Create sync run record
  const syncRunId = createSyncRunId();
  await db
    .insertInto('sync_runs')
    .values({
      id: syncRunId,
      tenant_id: tenantId as string,
      snapshot_id: snapshotId,
      run_type: 'upsert',
      status: 'running',
      records_processed: 0,
      metadata_json: { objectTypes },
    })
    .execute();

  try {
    const stats = {
      customers: 0,
      contracts: 0,
      invoices: 0,
      invoiceLines: 0,
      payments: 0,
      products: 0,
      pricePlans: 0,
      failed: 0,
    };

    const limit = batchSize || 500;

    // Process in order: products -> customers -> contracts -> invoices -> payments
    // This ensures foreign key relationships are satisfied

    // 1. Products first (no dependencies)
    stats.products = await processCanonicalType(ctx, 'product', limit);

    // 2. Customers (no dependencies)
    stats.customers = await processCanonicalType(ctx, 'customer', limit);

    // 3. Contracts (depends on customers)
    stats.contracts = await processCanonicalType(ctx, 'contract', limit);

    // 4. Invoices (depends on customers, contracts)
    const invoiceResult = await processInvoices(ctx, limit);
    stats.invoices = invoiceResult.invoices;
    stats.invoiceLines = invoiceResult.lines;

    // 5. Payments (depends on invoices, customers)
    stats.payments = await processCanonicalType(ctx, 'payment', limit);

    // 6. Price Plans (depends on products)
    stats.pricePlans = await processCanonicalType(ctx, 'pricePlan', limit);

    // Update sync run
    await db
      .updateTable('sync_runs')
      .set({
        status: 'completed',
        finished_at: new Date(),
        records_processed: Object.values(stats).reduce((a, b) => a + b, 0),
        metadata_json: { objectTypes, stats },
      })
      .where('id', '=', syncRunId)
      .execute();

    logger.info({ stats }, 'Ingest upsert completed');

    return {
      success: true,
      message: `Upserted records to canonical tables`,
      data: {
        snapshotId,
        syncRunId,
        ...stats,
      },
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    logger.error({ error }, 'Ingest upsert failed');

    await db
      .updateTable('sync_runs')
      .set({
        status: 'failed',
        finished_at: new Date(),
        error_code: 'UPSERT_FAILED',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .where('id', '=', syncRunId)
      .execute();

    throw error;
  }
}

/**
 * Process canonical type records
 */
async function processCanonicalType(
  ctx: IngestUpsertContext,
  canonicalType: string,
  limit: number
): Promise<number> {
  let totalProcessed = 0;
  let offset = 0;

  while (true) {
    // Get normalized staging records for this type
    const records = await ctx.db
      .selectFrom('staging_records')
      .selectAll()
      .where('snapshot_id', '=', ctx.snapshotId)
      .where('status', '=', 'normalized')
      .orderBy('received_at', 'asc')
      .limit(limit)
      .offset(offset)
      .execute();

    // Filter to records matching canonical type
    const typeRecords = records.filter((r) => {
      const raw = r.raw_json as { _canonicalType?: string };
      return raw._canonicalType === canonicalType;
    });

    if (typeRecords.length === 0 && records.length < limit) {
      break;
    }

    if (typeRecords.length > 0) {
      ctx.logger.debug({ canonicalType, count: typeRecords.length }, 'Processing records');

      for (const record of typeRecords) {
        try {
          const rawJson = record.raw_json as { _normalized: unknown; _original: unknown };
          await upsertRecord(ctx, canonicalType, rawJson._normalized, record.batch_id);
          totalProcessed++;
        } catch (error) {
          ctx.logger.warn({ recordId: record.id, error }, 'Failed to upsert record');
        }
      }
    }

    offset += records.length;

    if (records.length < limit) {
      break;
    }
  }

  return totalProcessed;
}

/**
 * Process invoices with their line items
 */
async function processInvoices(
  ctx: IngestUpsertContext,
  limit: number
): Promise<{ invoices: number; lines: number }> {
  let totalInvoices = 0;
  let totalLines = 0;
  let offset = 0;

  while (true) {
    const records = await ctx.db
      .selectFrom('staging_records')
      .selectAll()
      .where('snapshot_id', '=', ctx.snapshotId)
      .where('status', '=', 'normalized')
      .orderBy('received_at', 'asc')
      .limit(limit)
      .offset(offset)
      .execute();

    const invoiceRecords = records.filter((r) => {
      const raw = r.raw_json as { _canonicalType?: string };
      return raw._canonicalType === 'invoice';
    });

    if (invoiceRecords.length === 0 && records.length < limit) {
      break;
    }

    for (const record of invoiceRecords) {
      try {
        const rawJson = record.raw_json as { _normalized: NormalizedInvoice };
        const result = await upsertInvoiceWithLines(ctx, rawJson._normalized, record.batch_id);
        totalInvoices++;
        totalLines += result.lines;
      } catch (error) {
        ctx.logger.warn({ recordId: record.id, error }, 'Failed to upsert invoice');
      }
    }

    offset += records.length;

    if (records.length < limit) {
      break;
    }
  }

  return { invoices: totalInvoices, lines: totalLines };
}

/**
 * Upsert a single record to the appropriate canonical table
 */
async function upsertRecord(
  ctx: IngestUpsertContext,
  canonicalType: string,
  normalized: unknown,
  batchId: string
): Promise<void> {
  switch (canonicalType) {
    case 'customer':
      await upsertCustomer(ctx, normalized as NormalizedCustomer, batchId);
      break;
    case 'contract':
      await upsertContract(ctx, normalized as NormalizedContract, batchId);
      break;
    case 'payment':
      await upsertPayment(ctx, normalized as NormalizedPayment, batchId);
      break;
    case 'product':
      await upsertProduct(ctx, normalized as NormalizedProduct, batchId);
      break;
    case 'pricePlan':
      await upsertPricePlan(ctx, normalized as NormalizedPricePlan, batchId);
      break;
    default:
      throw new Error(`Unknown canonical type: ${canonicalType}`);
  }
}

/**
 * Upsert customer
 */
async function upsertCustomer(
  ctx: IngestUpsertContext,
  data: NormalizedCustomer,
  batchId: string
): Promise<string> {
  const id = createCustomerId() as string;

  await ctx.db
    .insertInto('customers')
    .values({
      id,
      tenant_id: ctx.tenantId,
      snapshot_id: ctx.snapshotId,
      external_id: data.externalId,
      external_ids_json: data.externalIds,
      name: data.name,
      email: data.email,
      status: data.status,
      metadata_json: data.metadata,
      source_system: data.source.system,
      source_batch_id: batchId,
      source_record_id: data.source.recordId,
    })
    .onConflict((oc) =>
      oc.columns(['tenant_id', 'snapshot_id', 'external_id']).doNothing()
    )
    .execute();

  ctx.customerIdCache.set(data.externalId, id);
  return id;
}

/**
 * Upsert contract
 */
async function upsertContract(
  ctx: IngestUpsertContext,
  data: NormalizedContract,
  batchId: string
): Promise<string> {
  const id = createContractId() as string;

  // Lookup customer ID
  let customerId: string | null = null;
  if (data.customerExternalId) {
    customerId = await resolveCustomerId(ctx, data.customerExternalId);
  }

  await ctx.db
    .insertInto('contracts')
    .values({
      id,
      tenant_id: ctx.tenantId,
      snapshot_id: ctx.snapshotId,
      customer_id: customerId,
      external_id: data.externalId,
      external_ids_json: data.externalIds,
      name: data.name,
      status: data.status,
      start_date: data.startDate,
      end_date: data.endDate,
      arr: data.arr,
      currency: data.currency,
      billing_frequency: data.billingFrequency,
      auto_renew: data.autoRenew,
      metadata_json: data.metadata,
      source_system: data.source.system,
      source_batch_id: batchId,
      source_record_id: data.source.recordId,
    })
    .onConflict((oc) =>
      oc.columns(['tenant_id', 'snapshot_id', 'external_id']).doNothing()
    )
    .execute();

  ctx.contractIdCache.set(data.externalId, id);
  return id;
}

/**
 * Upsert invoice with lines
 */
async function upsertInvoiceWithLines(
  ctx: IngestUpsertContext,
  data: NormalizedInvoice,
  batchId: string
): Promise<{ invoiceId: string; lines: number }> {
  const invoiceId = createInvoiceId() as string;

  // Lookup customer and contract IDs
  let customerId: string | null = null;
  let contractId: string | null = null;

  if (data.customerExternalId) {
    customerId = await resolveCustomerId(ctx, data.customerExternalId);
  }
  if (data.contractExternalId) {
    contractId = await resolveContractId(ctx, data.contractExternalId);
  }

  await ctx.db
    .insertInto('invoices')
    .values({
      id: invoiceId,
      tenant_id: ctx.tenantId,
      snapshot_id: ctx.snapshotId,
      customer_id: customerId,
      contract_id: contractId,
      external_id: data.externalId,
      external_ids_json: data.externalIds,
      invoice_number: data.invoiceNumber,
      invoice_date: data.invoiceDate,
      due_date: data.dueDate,
      currency: data.currency,
      subtotal: data.subtotal,
      tax: data.tax,
      total: data.total,
      amount_paid: data.amountPaid,
      amount_due: data.amountDue,
      status: data.status,
      period_start: data.periodStart,
      period_end: data.periodEnd,
      metadata_json: data.metadata,
      source_system: data.source.system,
      source_batch_id: batchId,
      source_record_id: data.source.recordId,
    })
    .onConflict((oc) =>
      oc.columns(['tenant_id', 'snapshot_id', 'external_id']).doNothing()
    )
    .execute();

  ctx.invoiceIdCache.set(data.externalId, invoiceId);

  // Insert line items
  let linesInserted = 0;
  if (data.lines && data.lines.length > 0) {
    for (const line of data.lines) {
      const lineId = createInvoiceLineId() as string;

      // Lookup product ID
      let productId: string | null = null;
      if (line.productExternalId) {
        productId = await resolveProductId(ctx, line.productExternalId);
      }

      await ctx.db
        .insertInto('invoice_lines')
        .values({
          id: lineId,
          tenant_id: ctx.tenantId,
          snapshot_id: ctx.snapshotId,
          invoice_id: invoiceId,
          product_id: productId,
          external_id: line.externalId,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unitPrice,
          amount: line.amount,
          currency: line.currency,
          service_start: line.serviceStart,
          service_end: line.serviceEnd,
          metadata_json: line.metadata,
        })
        .execute();

      linesInserted++;
    }
  }

  return { invoiceId, lines: linesInserted };
}

/**
 * Upsert payment
 */
async function upsertPayment(
  ctx: IngestUpsertContext,
  data: NormalizedPayment,
  batchId: string
): Promise<string> {
  const id = createPaymentId() as string;

  // Lookup invoice and customer IDs
  let invoiceId: string | null = null;
  let customerId: string | null = null;

  if (data.invoiceExternalId) {
    invoiceId = await resolveInvoiceId(ctx, data.invoiceExternalId);
  }
  if (data.customerExternalId) {
    customerId = await resolveCustomerId(ctx, data.customerExternalId);
  }

  await ctx.db
    .insertInto('payments')
    .values({
      id,
      tenant_id: ctx.tenantId,
      snapshot_id: ctx.snapshotId,
      invoice_id: invoiceId,
      customer_id: customerId,
      external_id: data.externalId,
      external_ids_json: data.externalIds,
      amount: data.amount,
      currency: data.currency,
      payment_date: data.paymentDate,
      method: data.method,
      status: data.status,
      metadata_json: data.metadata,
      source_system: data.source.system,
      source_batch_id: batchId,
      source_record_id: data.source.recordId,
    })
    .onConflict((oc) =>
      oc.columns(['tenant_id', 'snapshot_id', 'external_id']).doNothing()
    )
    .execute();

  return id;
}

/**
 * Upsert product
 */
async function upsertProduct(
  ctx: IngestUpsertContext,
  data: NormalizedProduct,
  batchId: string
): Promise<string> {
  const id = createProductId() as string;

  await ctx.db
    .insertInto('products')
    .values({
      id,
      tenant_id: ctx.tenantId,
      snapshot_id: ctx.snapshotId,
      external_id: data.externalId,
      external_ids_json: data.externalIds,
      sku: data.sku,
      name: data.name,
      description: data.description,
      category: data.category,
      status: data.status,
      metadata_json: data.metadata,
      source_system: data.source.system,
      source_batch_id: batchId,
      source_record_id: data.source.recordId,
    })
    .onConflict((oc) =>
      oc.columns(['tenant_id', 'snapshot_id', 'external_id']).doNothing()
    )
    .execute();

  ctx.productIdCache.set(data.externalId, id);
  return id;
}

/**
 * Upsert price plan
 */
async function upsertPricePlan(
  ctx: IngestUpsertContext,
  data: NormalizedPricePlan,
  batchId: string
): Promise<string> {
  const id = createPricePlanId() as string;

  // Lookup product ID
  const productId = await resolveProductId(ctx, data.productExternalId);
  if (!productId) {
    throw new Error(`Product not found for price plan: ${data.productExternalId}`);
  }

  await ctx.db
    .insertInto('price_plans')
    .values({
      id,
      tenant_id: ctx.tenantId,
      snapshot_id: ctx.snapshotId,
      product_id: productId,
      external_id: data.externalId,
      external_ids_json: data.externalIds,
      name: data.name,
      billing_cadence: data.billingCadence,
      currency: data.currency,
      price_json: data.price,
      status: data.status,
      metadata_json: data.metadata,
      source_system: data.source.system,
      source_batch_id: batchId,
      source_record_id: data.source.recordId,
    })
    .onConflict((oc) =>
      oc.columns(['tenant_id', 'snapshot_id', 'external_id']).doNothing()
    )
    .execute();

  return id;
}

// ============================================
// ID Resolution Helpers
// ============================================

async function resolveCustomerId(ctx: IngestUpsertContext, externalId: string): Promise<string | null> {
  if (ctx.customerIdCache.has(externalId)) {
    return ctx.customerIdCache.get(externalId)!;
  }

  const customer = await ctx.db
    .selectFrom('customers')
    .select('id')
    .where('snapshot_id', '=', ctx.snapshotId)
    .where('external_id', '=', externalId)
    .executeTakeFirst();

  if (customer) {
    ctx.customerIdCache.set(externalId, customer.id);
    return customer.id;
  }

  return null;
}

async function resolveContractId(ctx: IngestUpsertContext, externalId: string): Promise<string | null> {
  if (ctx.contractIdCache.has(externalId)) {
    return ctx.contractIdCache.get(externalId)!;
  }

  const contract = await ctx.db
    .selectFrom('contracts')
    .select('id')
    .where('snapshot_id', '=', ctx.snapshotId)
    .where('external_id', '=', externalId)
    .executeTakeFirst();

  if (contract) {
    ctx.contractIdCache.set(externalId, contract.id);
    return contract.id;
  }

  return null;
}

async function resolveInvoiceId(ctx: IngestUpsertContext, externalId: string): Promise<string | null> {
  if (ctx.invoiceIdCache.has(externalId)) {
    return ctx.invoiceIdCache.get(externalId)!;
  }

  const invoice = await ctx.db
    .selectFrom('invoices')
    .select('id')
    .where('snapshot_id', '=', ctx.snapshotId)
    .where('external_id', '=', externalId)
    .executeTakeFirst();

  if (invoice) {
    ctx.invoiceIdCache.set(externalId, invoice.id);
    return invoice.id;
  }

  return null;
}

async function resolveProductId(ctx: IngestUpsertContext, externalId: string): Promise<string | null> {
  if (ctx.productIdCache.has(externalId)) {
    return ctx.productIdCache.get(externalId)!;
  }

  const product = await ctx.db
    .selectFrom('products')
    .select('id')
    .where('snapshot_id', '=', ctx.snapshotId)
    .where('external_id', '=', externalId)
    .executeTakeFirst();

  if (product) {
    ctx.productIdCache.set(externalId, product.id);
    return product.id;
  }

  return null;
}

