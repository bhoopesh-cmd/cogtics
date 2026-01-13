/**
 * Canonical Data Routes
 * 
 * API endpoints for querying canonical data by snapshot.
 */
import { FastifyPluginAsync } from 'fastify';
import { sql } from '@cogtics/db';
import {
  CustomerStatusSchema,
  InvoiceStatusSchema,
  ProductStatusSchema,
  PaymentStatusSchema,
  DbContractStatusSchema,
  PricePlanStatusSchema,
} from '@cogtics/schemas';

export const dataRoutes: FastifyPluginAsync = async (fastify) => {
  // Authentication is handled globally by the auth plugin

  // ============================================
  // Helper: Get snapshot ID (latest if not provided)
  // ============================================
  async function resolveSnapshotId(tenantId: string, snapshotId?: string): Promise<string> {
    if (snapshotId) {
      // Verify snapshot exists and belongs to tenant
      const snapshot = await fastify.db
        .selectFrom('snapshots')
        .select('id')
        .where('id', '=', snapshotId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!snapshot) {
        throw fastify.httpErrors.notFound('Snapshot not found');
      }

      return snapshotId;
    }

    // Get latest complete snapshot
    const latest = await fastify.db
      .selectFrom('snapshots')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where('status', '=', 'complete')
      .orderBy('completed_at', 'desc')
      .executeTakeFirst();

    if (!latest) {
      throw fastify.httpErrors.notFound('No complete snapshot found');
    }

    return latest.id;
  }

  // Helper to parse query params
  function parseQueryParams(query: any) {
    return {
      snapshotId: query.snapshotId as string | undefined,
      limit: Math.min(Math.max(1, parseInt(query.limit ?? '50', 10) || 50), 100),
      offset: Math.max(0, parseInt(query.offset ?? '0', 10) || 0),
      search: query.search as string | undefined,
      status: query.status as string | undefined,
    };
  }

  // ============================================
  // Summary Stats
  // ============================================
  fastify.get('/summary', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { snapshotId: requestedSnapshotId } = request.query as { snapshotId?: string };

      const snapshotId = await resolveSnapshotId(tenantId, requestedSnapshotId);

      // Get snapshot info
      const snapshot = await fastify.db
        .selectFrom('snapshots')
        .selectAll()
        .where('id', '=', snapshotId)
        .executeTakeFirst();

      // Customer counts
      const totalCustomers = await fastify.db
        .selectFrom('customers')
        .select(sql<number>`count(*)`.as('count'))
        .where('snapshot_id', '=', snapshotId)
        .executeTakeFirst();

      const activeCustomers = await fastify.db
        .selectFrom('customers')
        .select(sql<number>`count(*)`.as('count'))
        .where('snapshot_id', '=', snapshotId)
        .where('status', '=', 'active')
        .executeTakeFirst();

      // Contract counts and ARR
      const totalContracts = await fastify.db
        .selectFrom('contracts')
        .select(sql<number>`count(*)`.as('count'))
        .where('snapshot_id', '=', snapshotId)
        .executeTakeFirst();

      const activeContracts = await fastify.db
        .selectFrom('contracts')
        .select(sql<number>`count(*)`.as('count'))
        .where('snapshot_id', '=', snapshotId)
        .where('status', '=', 'active')
        .executeTakeFirst();

      const totalArr = await fastify.db
        .selectFrom('contracts')
        .select(sql<number>`coalesce(sum(arr), 0)`.as('total'))
        .where('snapshot_id', '=', snapshotId)
        .where('status', '=', 'active')
        .executeTakeFirst();

      // Invoice counts and totals
      const totalInvoices = await fastify.db
        .selectFrom('invoices')
        .select(sql<number>`count(*)`.as('count'))
        .where('snapshot_id', '=', snapshotId)
        .executeTakeFirst();

      const openInvoices = await fastify.db
        .selectFrom('invoices')
        .select(sql<number>`count(*)`.as('count'))
        .where('snapshot_id', '=', snapshotId)
        .where('status', 'in', ['open', 'past_due'])
        .executeTakeFirst();

      const totalRevenue = await fastify.db
        .selectFrom('invoices')
        .select(sql<number>`coalesce(sum(total), 0)`.as('total'))
        .where('snapshot_id', '=', snapshotId)
        .where('status', '=', 'paid')
        .executeTakeFirst();

      const amountDue = await fastify.db
        .selectFrom('invoices')
        .select(sql<number>`coalesce(sum(amount_due), 0)`.as('total'))
        .where('snapshot_id', '=', snapshotId)
        .where('status', 'in', ['open', 'past_due'])
        .executeTakeFirst();

      return reply.send({
        snapshotId,
        snapshotStatus: snapshot?.status ?? 'unknown',
        snapshotCompletedAt: snapshot?.completed_at?.toISOString() ?? null,
        totalCustomers: Number(totalCustomers?.count ?? 0),
        activeCustomers: Number(activeCustomers?.count ?? 0),
        totalContracts: Number(totalContracts?.count ?? 0),
        activeContracts: Number(activeContracts?.count ?? 0),
        totalArr: Number(totalArr?.total ?? 0),
        totalInvoices: Number(totalInvoices?.count ?? 0),
        openInvoices: Number(openInvoices?.count ?? 0),
        totalRevenue: Number(totalRevenue?.total ?? 0),
        amountDue: Number(amountDue?.total ?? 0),
      });
    },
  });

  // ============================================
  // List Customers
  // ============================================
  fastify.get('/customers', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { snapshotId: requestedSnapshotId, limit, offset, search, status } = parseQueryParams(request.query);

      const snapshotId = await resolveSnapshotId(tenantId, requestedSnapshotId);

      let query = fastify.db
        .selectFrom('customers')
        .selectAll()
        .where('snapshot_id', '=', snapshotId)
        .orderBy('name', 'asc')
        .limit(limit)
        .offset(offset);

      if (search) {
        query = query.where((eb) =>
          eb.or([
            eb('name', 'ilike', `%${search}%`),
            eb('email', 'ilike', `%${search}%`),
            eb('external_id', 'ilike', `%${search}%`),
          ])
        );
      }

      if (status) {
        const validStatus = CustomerStatusSchema.safeParse(status);
        if (validStatus.success) {
          query = query.where('status', '=', validStatus.data);
        }
      }

      const customers = await query.execute();

      // Get total count
      const countResult = await fastify.db
        .selectFrom('customers')
        .select(sql<number>`count(*)`.as('count'))
        .where('snapshot_id', '=', snapshotId)
        .executeTakeFirst();

      return reply.send({
        customers: customers.map(mapCustomerToResponse),
        total: Number(countResult?.count ?? 0),
        snapshotId,
      });
    },
  });

  // ============================================
  // List Contracts
  // ============================================
  fastify.get('/contracts', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { snapshotId: requestedSnapshotId, limit, offset, search, status } = parseQueryParams(request.query);

      const snapshotId = await resolveSnapshotId(tenantId, requestedSnapshotId);

      let query = fastify.db
        .selectFrom('contracts')
        .selectAll()
        .where('snapshot_id', '=', snapshotId)
        .orderBy('start_date', 'desc')
        .limit(limit)
        .offset(offset);

      if (search) {
        query = query.where((eb) =>
          eb.or([
            eb('name', 'ilike', `%${search}%`),
            eb('external_id', 'ilike', `%${search}%`),
          ])
        );
      }

      if (status) {
        const validStatus = DbContractStatusSchema.safeParse(status);
        if (validStatus.success) {
          query = query.where('status', '=', validStatus.data);
        }
      }

      const contracts = await query.execute();

      // Get total count
      const countResult = await fastify.db
        .selectFrom('contracts')
        .select(sql<number>`count(*)`.as('count'))
        .where('snapshot_id', '=', snapshotId)
        .executeTakeFirst();

      return reply.send({
        contracts: contracts.map(mapContractToResponse),
        total: Number(countResult?.count ?? 0),
        snapshotId,
      });
    },
  });

  // ============================================
  // List Invoices
  // ============================================
  fastify.get('/invoices', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { snapshotId: requestedSnapshotId, limit, offset, search, status } = parseQueryParams(request.query);

      const snapshotId = await resolveSnapshotId(tenantId, requestedSnapshotId);

      let query = fastify.db
        .selectFrom('invoices')
        .selectAll()
        .where('snapshot_id', '=', snapshotId)
        .orderBy('invoice_date', 'desc')
        .limit(limit)
        .offset(offset);

      if (search) {
        query = query.where((eb) =>
          eb.or([
            eb('invoice_number', 'ilike', `%${search}%`),
            eb('external_id', 'ilike', `%${search}%`),
          ])
        );
      }

      if (status) {
        const validStatus = InvoiceStatusSchema.safeParse(status);
        if (validStatus.success) {
          query = query.where('status', '=', validStatus.data);
        }
      }

      const invoices = await query.execute();

      // Get total count
      const countResult = await fastify.db
        .selectFrom('invoices')
        .select(sql<number>`count(*)`.as('count'))
        .where('snapshot_id', '=', snapshotId)
        .executeTakeFirst();

      return reply.send({
        invoices: invoices.map(mapInvoiceToResponse),
        total: Number(countResult?.count ?? 0),
        snapshotId,
      });
    },
  });

  // ============================================
  // Get Invoice Detail with Lines
  // ============================================
  fastify.get<{ Params: { invoiceId: string } }>('/invoices/:invoiceId', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { invoiceId } = request.params;
      const { snapshotId: requestedSnapshotId } = request.query as { snapshotId?: string };

      const snapshotId = await resolveSnapshotId(tenantId, requestedSnapshotId);

      const invoice = await fastify.db
        .selectFrom('invoices')
        .selectAll()
        .where('id', '=', invoiceId)
        .where('snapshot_id', '=', snapshotId)
        .executeTakeFirst();

      if (!invoice) {
        throw fastify.httpErrors.notFound('Invoice not found');
      }

      const lines = await fastify.db
        .selectFrom('invoice_lines')
        .selectAll()
        .where('invoice_id', '=', invoiceId)
        .orderBy('created_at', 'asc')
        .execute();

      return reply.send({
        ...mapInvoiceToResponse(invoice),
        lines: lines.map((line) => ({
          id: line.id,
          tenantId: line.tenant_id,
          snapshotId: line.snapshot_id,
          invoiceId: line.invoice_id,
          productId: line.product_id,
          externalId: line.external_id,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unit_price,
          amount: line.amount,
          currency: line.currency,
          serviceStart: line.service_start?.toISOString().split('T')[0] ?? null,
          serviceEnd: line.service_end?.toISOString().split('T')[0] ?? null,
          metadata: line.metadata_json as Record<string, unknown>,
          createdAt: line.created_at.toISOString(),
        })),
      });
    },
  });

  // ============================================
  // List Products
  // ============================================
  fastify.get('/products', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { snapshotId: requestedSnapshotId, limit, offset, search, status } = parseQueryParams(request.query);

      const snapshotId = await resolveSnapshotId(tenantId, requestedSnapshotId);

      let query = fastify.db
        .selectFrom('products')
        .selectAll()
        .where('snapshot_id', '=', snapshotId)
        .orderBy('name', 'asc')
        .limit(limit)
        .offset(offset);

      if (search) {
        query = query.where((eb) =>
          eb.or([
            eb('name', 'ilike', `%${search}%`),
            eb('sku', 'ilike', `%${search}%`),
            eb('external_id', 'ilike', `%${search}%`),
          ])
        );
      }

      if (status) {
        const validStatus = ProductStatusSchema.safeParse(status);
        if (validStatus.success) {
          query = query.where('status', '=', validStatus.data);
        }
      }

      const products = await query.execute();

      const countResult = await fastify.db
        .selectFrom('products')
        .select(sql<number>`count(*)`.as('count'))
        .where('snapshot_id', '=', snapshotId)
        .executeTakeFirst();

      return reply.send({
        products: products.map(mapProductToResponse),
        total: Number(countResult?.count ?? 0),
        snapshotId,
      });
    },
  });

  // ============================================
  // Get Product Detail with Price Plans
  // ============================================
  fastify.get<{ Params: { productId: string } }>('/products/:productId', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { productId } = request.params;
      const { snapshotId: requestedSnapshotId } = request.query as { snapshotId?: string };

      const snapshotId = await resolveSnapshotId(tenantId, requestedSnapshotId);

      const product = await fastify.db
        .selectFrom('products')
        .selectAll()
        .where('id', '=', productId)
        .where('snapshot_id', '=', snapshotId)
        .executeTakeFirst();

      if (!product) {
        throw fastify.httpErrors.notFound('Product not found');
      }

      const pricePlans = await fastify.db
        .selectFrom('price_plans')
        .selectAll()
        .where('product_id', '=', productId)
        .where('snapshot_id', '=', snapshotId)
        .orderBy('created_at', 'asc')
        .execute();

      return reply.send({
        ...mapProductToResponse(product),
        pricePlans: pricePlans.map(mapPricePlanToResponse),
      });
    },
  });

  // ============================================
  // List Payments
  // ============================================
  fastify.get('/payments', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { snapshotId: requestedSnapshotId, limit, offset, status } = parseQueryParams(request.query);

      const snapshotId = await resolveSnapshotId(tenantId, requestedSnapshotId);

      let query = fastify.db
        .selectFrom('payments')
        .selectAll()
        .where('snapshot_id', '=', snapshotId)
        .orderBy('payment_date', 'desc')
        .limit(limit)
        .offset(offset);

      if (status) {
        const validStatus = PaymentStatusSchema.safeParse(status);
        if (validStatus.success) {
          query = query.where('status', '=', validStatus.data);
        }
      }

      const payments = await query.execute();

      const countResult = await fastify.db
        .selectFrom('payments')
        .select(sql<number>`count(*)`.as('count'))
        .where('snapshot_id', '=', snapshotId)
        .executeTakeFirst();

      return reply.send({
        payments: payments.map(mapPaymentToResponse),
        total: Number(countResult?.count ?? 0),
        snapshotId,
      });
    },
  });

  // ============================================
  // Get Payment Detail
  // ============================================
  fastify.get<{ Params: { paymentId: string } }>('/payments/:paymentId', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { paymentId } = request.params;
      const { snapshotId: requestedSnapshotId } = request.query as { snapshotId?: string };

      const snapshotId = await resolveSnapshotId(tenantId, requestedSnapshotId);

      const payment = await fastify.db
        .selectFrom('payments')
        .selectAll()
        .where('id', '=', paymentId)
        .where('snapshot_id', '=', snapshotId)
        .executeTakeFirst();

      if (!payment) {
        throw fastify.httpErrors.notFound('Payment not found');
      }

      return reply.send(mapPaymentToResponse(payment));
    },
  });

  // ============================================
  // List Price Plans
  // ============================================
  fastify.get('/price-plans', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { snapshotId: requestedSnapshotId, limit, offset, status } = parseQueryParams(request.query);

      const snapshotId = await resolveSnapshotId(tenantId, requestedSnapshotId);

      let query = fastify.db
        .selectFrom('price_plans')
        .selectAll()
        .where('snapshot_id', '=', snapshotId)
        .orderBy('name', 'asc')
        .limit(limit)
        .offset(offset);

      if (status) {
        const validStatus = PricePlanStatusSchema.safeParse(status);
        if (validStatus.success) {
          query = query.where('status', '=', validStatus.data);
        }
      }

      const pricePlans = await query.execute();

      const countResult = await fastify.db
        .selectFrom('price_plans')
        .select(sql<number>`count(*)`.as('count'))
        .where('snapshot_id', '=', snapshotId)
        .executeTakeFirst();

      return reply.send({
        pricePlans: pricePlans.map(mapPricePlanToResponse),
        total: Number(countResult?.count ?? 0),
        snapshotId,
      });
    },
  });

  // ============================================
  // Get Customer Detail with Contracts and Invoices
  // ============================================
  fastify.get<{ Params: { customerId: string } }>('/customers/:customerId', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { customerId } = request.params;
      const { snapshotId: requestedSnapshotId } = request.query as { snapshotId?: string };

      const snapshotId = await resolveSnapshotId(tenantId, requestedSnapshotId);

      const customer = await fastify.db
        .selectFrom('customers')
        .selectAll()
        .where('id', '=', customerId)
        .where('snapshot_id', '=', snapshotId)
        .executeTakeFirst();

      if (!customer) {
        throw fastify.httpErrors.notFound('Customer not found');
      }

      // Get related contracts
      const contracts = await fastify.db
        .selectFrom('contracts')
        .selectAll()
        .where('customer_id', '=', customerId)
        .where('snapshot_id', '=', snapshotId)
        .orderBy('start_date', 'desc')
        .execute();

      // Get related invoices
      const invoices = await fastify.db
        .selectFrom('invoices')
        .selectAll()
        .where('customer_id', '=', customerId)
        .where('snapshot_id', '=', snapshotId)
        .orderBy('invoice_date', 'desc')
        .limit(10)
        .execute();

      // Get related payments
      const payments = await fastify.db
        .selectFrom('payments')
        .selectAll()
        .where('customer_id', '=', customerId)
        .where('snapshot_id', '=', snapshotId)
        .orderBy('payment_date', 'desc')
        .limit(10)
        .execute();

      return reply.send({
        ...mapCustomerToResponse(customer),
        contracts: contracts.map(mapContractToResponse),
        invoices: invoices.map(mapInvoiceToResponse),
        payments: payments.map(mapPaymentToResponse),
      });
    },
  });

  // ============================================
  // Get Contract Detail with Versions and Terms
  // ============================================
  fastify.get<{ Params: { contractId: string } }>('/contracts/:contractId', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { contractId } = request.params;
      const { snapshotId: requestedSnapshotId } = request.query as { snapshotId?: string };

      const snapshotId = await resolveSnapshotId(tenantId, requestedSnapshotId);

      const contract = await fastify.db
        .selectFrom('contracts')
        .selectAll()
        .where('id', '=', contractId)
        .where('snapshot_id', '=', snapshotId)
        .executeTakeFirst();

      if (!contract) {
        throw fastify.httpErrors.notFound('Contract not found');
      }

      // Get related customer
      let customer = null;
      if (contract.customer_id) {
        customer = await fastify.db
          .selectFrom('customers')
          .selectAll()
          .where('id', '=', contract.customer_id)
          .where('snapshot_id', '=', snapshotId)
          .executeTakeFirst();
      }

      // Get contract versions
      const versions = await fastify.db
        .selectFrom('contract_versions')
        .selectAll()
        .where('contract_id', '=', contractId)
        .where('snapshot_id', '=', snapshotId)
        .orderBy('version', 'desc')
        .execute();

      // Get related invoices
      const invoices = await fastify.db
        .selectFrom('invoices')
        .selectAll()
        .where('contract_id', '=', contractId)
        .where('snapshot_id', '=', snapshotId)
        .orderBy('invoice_date', 'desc')
        .limit(10)
        .execute();

      return reply.send({
        ...mapContractToResponse(contract),
        customer: customer ? mapCustomerToResponse(customer) : null,
        versions: versions.map((v) => ({
          id: v.id,
          version: v.version,
          effectiveDate: v.effective_date?.toISOString().split('T')[0] ?? null,
          source: v.source,
          changes: v.changes_json,
          createdAt: v.created_at.toISOString(),
        })),
        invoices: invoices.map(mapInvoiceToResponse),
      });
    },
  });
};

// ============================================
// Helper functions
// ============================================

function mapCustomerToResponse(customer: any) {
  return {
    id: customer.id,
    tenantId: customer.tenant_id,
    snapshotId: customer.snapshot_id,
    externalId: customer.external_id,
    externalIds: customer.external_ids_json,
    name: customer.name,
    email: customer.email,
    status: customer.status,
    metadata: customer.metadata_json,
    sourceSystem: customer.source_system,
    sourceBatchId: customer.source_batch_id,
    sourceRecordId: customer.source_record_id,
    createdAt: customer.created_at.toISOString(),
  };
}

function mapContractToResponse(contract: any) {
  return {
    id: contract.id,
    tenantId: contract.tenant_id,
    snapshotId: contract.snapshot_id,
    customerId: contract.customer_id,
    externalId: contract.external_id,
    externalIds: contract.external_ids_json,
    name: contract.name,
    status: contract.status,
    startDate: contract.start_date?.toISOString().split('T')[0] ?? null,
    endDate: contract.end_date?.toISOString().split('T')[0] ?? null,
    arr: contract.arr,
    currency: contract.currency,
    billingFrequency: contract.billing_frequency,
    autoRenew: contract.auto_renew,
    metadata: contract.metadata_json,
    sourceSystem: contract.source_system,
    sourceBatchId: contract.source_batch_id,
    sourceRecordId: contract.source_record_id,
    createdAt: contract.created_at.toISOString(),
  };
}

function mapInvoiceToResponse(invoice: any) {
  return {
    id: invoice.id,
    tenantId: invoice.tenant_id,
    snapshotId: invoice.snapshot_id,
    customerId: invoice.customer_id,
    contractId: invoice.contract_id,
    externalId: invoice.external_id,
    externalIds: invoice.external_ids_json,
    invoiceNumber: invoice.invoice_number,
    invoiceDate: invoice.invoice_date?.toISOString().split('T')[0] ?? null,
    dueDate: invoice.due_date?.toISOString().split('T')[0] ?? null,
    currency: invoice.currency,
    subtotal: invoice.subtotal,
    tax: invoice.tax,
    total: invoice.total,
    amountPaid: invoice.amount_paid,
    amountDue: invoice.amount_due,
    status: invoice.status,
    periodStart: invoice.period_start?.toISOString().split('T')[0] ?? null,
    periodEnd: invoice.period_end?.toISOString().split('T')[0] ?? null,
    metadata: invoice.metadata_json,
    sourceSystem: invoice.source_system,
    sourceBatchId: invoice.source_batch_id,
    sourceRecordId: invoice.source_record_id,
    createdAt: invoice.created_at.toISOString(),
  };
}

function mapProductToResponse(product: any) {
  return {
    id: product.id,
    tenantId: product.tenant_id,
    snapshotId: product.snapshot_id,
    externalId: product.external_id,
    externalIds: product.external_ids_json,
    sku: product.sku,
    name: product.name,
    description: product.description,
    category: product.category,
    status: product.status,
    metadata: product.metadata_json,
    sourceSystem: product.source_system,
    sourceBatchId: product.source_batch_id,
    sourceRecordId: product.source_record_id,
    createdAt: product.created_at.toISOString(),
  };
}

function mapPaymentToResponse(payment: any) {
  return {
    id: payment.id,
    tenantId: payment.tenant_id,
    snapshotId: payment.snapshot_id,
    invoiceId: payment.invoice_id,
    customerId: payment.customer_id,
    externalId: payment.external_id,
    externalIds: payment.external_ids_json,
    amount: payment.amount,
    currency: payment.currency,
    paymentDate: payment.payment_date?.toISOString().split('T')[0] ?? null,
    method: payment.method,
    status: payment.status,
    metadata: payment.metadata_json,
    sourceSystem: payment.source_system,
    sourceBatchId: payment.source_batch_id,
    sourceRecordId: payment.source_record_id,
    createdAt: payment.created_at.toISOString(),
  };
}

function mapPricePlanToResponse(plan: any) {
  return {
    id: plan.id,
    tenantId: plan.tenant_id,
    snapshotId: plan.snapshot_id,
    productId: plan.product_id,
    externalId: plan.external_id,
    externalIds: plan.external_ids_json,
    name: plan.name,
    billingCadence: plan.billing_cadence,
    currency: plan.currency,
    price: plan.price_json,
    status: plan.status,
    metadata: plan.metadata_json,
    sourceSystem: plan.source_system,
    createdAt: plan.created_at.toISOString(),
  };
}
