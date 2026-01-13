/**
 * Revenue Recognition API Routes
 * 
 * Phase 6: ASC 606 revenue recognition endpoints.
 */
import { type FastifyPluginAsync } from 'fastify';
import {
  TriggerRevRecComputeRequestSchema,
  TriggerRevRecReconcileRequestSchema,
  ObligationStatusSchema,
  ScheduleStatusSchema,
  ReconciliationStatusSchema,
} from '@cogtics/schemas';
const revrecRoutes: FastifyPluginAsync = async (fastify) => {

  // ============================================
  // GET /revrec/summary
  // ============================================
  fastify.get('/summary', async (request, reply) => {
    const { snapshotId } = request.query as { snapshotId?: string };
    const tenantId = (request as any).tenantId;

    // Get the snapshot ID (use provided or latest)
    let targetSnapshotId = snapshotId;
    if (!targetSnapshotId) {
      const latestSnapshot = await fastify.db
        .selectFrom('snapshots')
        .select('id')
        .where('tenant_id', '=', tenantId)
        .where('status', '=', 'complete')
        .orderBy('completed_at', 'desc')
        .limit(1)
        .executeTakeFirst();

      if (!latestSnapshot) {
        return reply.status(404).send({ error: 'No completed snapshot found' });
      }
      targetSnapshotId = latestSnapshot.id;
    }

    // Get obligations summary
    const obligationStats = await fastify.db
      .selectFrom('revenue_obligations')
      .select([
        fastify.db.fn.count('id').as('total'),
        fastify.db.fn.sum('transaction_price').as('totalTransactionValue'),
      ])
      .where('tenant_id', '=', tenantId)
      .where('snapshot_id', '=', targetSnapshotId)
      .executeTakeFirst();

    // Get schedules summary
    const scheduleStats = await fastify.db
      .selectFrom('revenue_schedules')
      .select([
        fastify.db.fn.sum('recognized_amount').as('totalRecognized'),
        fastify.db.fn.sum('deferred_amount').as('totalDeferred'),
      ])
      .where('tenant_id', '=', tenantId)
      .where('snapshot_id', '=', targetSnapshotId)
      .executeTakeFirst();

    // Get reconciliation summary
    const reconciliationStats = await fastify.db
      .selectFrom('revrec_reconciliations')
      .select(['status'])
      .select(fastify.db.fn.count('id').as('count'))
      .where('tenant_id', '=', tenantId)
      .where('snapshot_id', '=', targetSnapshotId)
      .groupBy('status')
      .execute();

    const reconByStatus = {
      matched: 0,
      timingVariance: 0,
      amountVariance: 0,
      unmatched: 0,
    };

    for (const row of reconciliationStats) {
      const count = Number(row.count);
      switch (row.status) {
        case 'matched':
          reconByStatus.matched = count;
          break;
        case 'timing_variance':
          reconByStatus.timingVariance = count;
          break;
        case 'amount_variance':
          reconByStatus.amountVariance = count;
          break;
        case 'missing_invoice':
        case 'unmatched':
          reconByStatus.unmatched += count;
          break;
      }
    }

    return {
      snapshotId: targetSnapshotId,
      totalObligations: Number(obligationStats?.total ?? 0),
      totalTransactionValue: Number(obligationStats?.totalTransactionValue ?? 0),
      totalRecognized: Number(scheduleStats?.totalRecognized ?? 0),
      totalDeferred: Number(scheduleStats?.totalDeferred ?? 0),
      reconciliationStatus: reconByStatus,
    };
  });

  // ============================================
  // GET /revrec/obligations
  // ============================================
  fastify.get('/obligations', async (request, reply) => {
    const { snapshotId, contractId, status, limit = '50', offset = '0' } = request.query as {
      snapshotId?: string;
      contractId?: string;
      status?: string;
      limit?: string;
      offset?: string;
    };
    const tenantId = (request as any).tenantId;

    // Validate status if provided
    if (status) {
      const parsed = ObligationStatusSchema.safeParse(status);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid status value' });
      }
    }

    // Build query
    let query = fastify.db
      .selectFrom('revenue_obligations as ro')
      .leftJoin('contracts as c', 'c.id', 'ro.contract_id')
      .leftJoin('customers as cust', 'cust.id', 'c.customer_id')
      .leftJoin('revenue_allocations as ra', 'ra.obligation_id', 'ro.id')
      .select([
        'ro.id',
        'ro.contract_id as contractId',
        'c.name as contractName',
        'cust.name as customerName',
        'ro.obligation_type as obligationType',
        'ro.description',
        'ro.transaction_price as transactionPrice',
        'ra.allocated_amount as allocatedAmount',
        'ro.currency',
        'ro.service_start_date as serviceStartDate',
        'ro.service_end_date as serviceEndDate',
        'ro.status',
        'ro.created_at as createdAt',
      ])
      .where('ro.tenant_id', '=', tenantId);

    if (snapshotId) {
      query = query.where('ro.snapshot_id', '=', snapshotId);
    }
    if (contractId) {
      query = query.where('ro.contract_id', '=', contractId);
    }
    if (status) {
      query = query.where('ro.status', '=', status);
    }

    const obligations = await query
      .orderBy('ro.created_at', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset))
      .execute();

    // Get total count
    let countQuery = fastify.db
      .selectFrom('revenue_obligations')
      .select(fastify.db.fn.count('id').as('count'))
      .where('tenant_id', '=', tenantId);

    if (snapshotId) {
      countQuery = countQuery.where('snapshot_id', '=', snapshotId);
    }
    if (contractId) {
      countQuery = countQuery.where('contract_id', '=', contractId);
    }
    if (status) {
      countQuery = countQuery.where('status', '=', status);
    }

    const countResult = await countQuery.executeTakeFirst();

    return {
      obligations,
      total: Number(countResult?.count ?? 0),
    };
  });

  // ============================================
  // GET /revrec/obligations/:id
  // ============================================
  fastify.get('/obligations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = (request as any).tenantId;

    // Get obligation
    const obligation = await fastify.db
      .selectFrom('revenue_obligations as ro')
      .leftJoin('contracts as c', 'c.id', 'ro.contract_id')
      .leftJoin('customers as cust', 'cust.id', 'c.customer_id')
      .leftJoin('revenue_allocations as ra', 'ra.obligation_id', 'ro.id')
      .selectAll('ro')
      .select([
        'c.name as contractName',
        'cust.name as customerName',
        'ra.allocated_amount as allocatedAmount',
        'ra.allocation_pct as allocationPct',
        'ra.allocation_basis as allocationBasis',
      ])
      .where('ro.id', '=', id)
      .where('ro.tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!obligation) {
      return reply.status(404).send({ error: 'Obligation not found' });
    }

    // Get schedules for this obligation
    const schedules = await fastify.db
      .selectFrom('revenue_schedules')
      .selectAll()
      .where('obligation_id', '=', id)
      .orderBy('period_start', 'asc')
      .execute();

    // Get events for this obligation
    const events = await fastify.db
      .selectFrom('recognition_events')
      .selectAll()
      .where('obligation_id', '=', id)
      .orderBy('event_date', 'asc')
      .execute();

    return {
      ...obligation,
      schedules,
      events,
    };
  });

  // ============================================
  // GET /revrec/schedules
  // ============================================
  fastify.get('/schedules', async (request, reply) => {
    const { snapshotId, obligationId, periodStart, periodEnd, status, limit = '100', offset = '0' } = request.query as {
      snapshotId?: string;
      obligationId?: string;
      periodStart?: string;
      periodEnd?: string;
      status?: string;
      limit?: string;
      offset?: string;
    };
    const tenantId = (request as any).tenantId;

    // Validate status if provided
    if (status) {
      const parsed = ScheduleStatusSchema.safeParse(status);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid status value' });
      }
    }

    let query = fastify.db
      .selectFrom('revenue_schedules as rs')
      .leftJoin('revenue_obligations as ro', 'ro.id', 'rs.obligation_id')
      .select([
        'rs.id',
        'rs.obligation_id as obligationId',
        'ro.contract_id as contractId',
        'rs.period_start as periodStart',
        'rs.period_end as periodEnd',
        'rs.scheduled_amount as scheduledAmount',
        'rs.recognized_amount as recognizedAmount',
        'rs.deferred_amount as deferredAmount',
        'rs.recognition_method as recognitionMethod',
        'rs.status',
        'rs.period_days as periodDays',
        'rs.daily_rate as dailyRate',
      ])
      .where('rs.tenant_id', '=', tenantId);

    if (snapshotId) {
      query = query.where('rs.snapshot_id', '=', snapshotId);
    }
    if (obligationId) {
      query = query.where('rs.obligation_id', '=', obligationId);
    }
    if (periodStart) {
      query = query.where('rs.period_start', '>=', periodStart);
    }
    if (periodEnd) {
      query = query.where('rs.period_end', '<=', periodEnd);
    }
    if (status) {
      query = query.where('rs.status', '=', status);
    }

    const schedules = await query
      .orderBy('rs.period_start', 'asc')
      .limit(parseInt(limit))
      .offset(parseInt(offset))
      .execute();

    return { schedules, total: schedules.length };
  });

  // ============================================
  // GET /revrec/reconciliations
  // ============================================
  fastify.get('/reconciliations', async (request, reply) => {
    const { snapshotId, contractId, status, limit = '50', offset = '0' } = request.query as {
      snapshotId?: string;
      contractId?: string;
      status?: string;
      limit?: string;
      offset?: string;
    };
    const tenantId = (request as any).tenantId;

    // Validate status if provided
    if (status) {
      const parsed = ReconciliationStatusSchema.safeParse(status);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid status value' });
      }
    }

    let query = fastify.db
      .selectFrom('revrec_reconciliations as rr')
      .leftJoin('contracts as c', 'c.id', 'rr.contract_id')
      .select([
        'rr.id',
        'rr.contract_id as contractId',
        'c.name as contractName',
        'rr.period_start as periodStart',
        'rr.period_end as periodEnd',
        'rr.status',
        'rr.scheduled_amount as scheduledAmount',
        'rr.invoiced_amount as invoicedAmount',
        'rr.variance_amount as varianceAmount',
        'rr.variance_pct as variancePct',
        'rr.details_json as details',
        'rr.created_at as createdAt',
      ])
      .where('rr.tenant_id', '=', tenantId);

    if (snapshotId) {
      query = query.where('rr.snapshot_id', '=', snapshotId);
    }
    if (contractId) {
      query = query.where('rr.contract_id', '=', contractId);
    }
    if (status) {
      query = query.where('rr.status', '=', status);
    }

    const reconciliations = await query
      .orderBy('rr.period_start', 'asc')
      .limit(parseInt(limit))
      .offset(parseInt(offset))
      .execute();

    // Get total count
    let countQuery = fastify.db
      .selectFrom('revrec_reconciliations')
      .select(fastify.db.fn.count('id').as('count'))
      .where('tenant_id', '=', tenantId);

    if (snapshotId) {
      countQuery = countQuery.where('snapshot_id', '=', snapshotId);
    }
    if (contractId) {
      countQuery = countQuery.where('contract_id', '=', contractId);
    }
    if (status) {
      countQuery = countQuery.where('status', '=', status);
    }

    const countResult = await countQuery.executeTakeFirst();

    return {
      reconciliations,
      total: Number(countResult?.count ?? 0),
    };
  });

  // ============================================
  // POST /revrec/compute
  // ============================================
  fastify.post('/compute', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    const body = request.body;

    // Validate request body
    const parsed = TriggerRevRecComputeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.issues });
    }

    const { snapshotId, contractIds, forceRecompute } = parsed.data;

    // Verify snapshot exists
    const snapshot = await fastify.db
      .selectFrom('snapshots')
      .select('id')
      .where('id', '=', snapshotId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!snapshot) {
      return reply.status(404).send({ error: 'Snapshot not found' });
    }

    // Queue the job
    const queue = fastify.queues['revrec.compute'];
    if (!queue) {
      return reply.status(500).send({ error: 'RevRec compute queue not available' });
    }

    const job = await queue.add('compute', {
      payload: {
        type: 'revrec.compute',
        tenantId,
        snapshotId,
        contractIds,
        forceRecompute: forceRecompute ?? false,
      },
    });

    return { jobId: job.id, message: 'Rev-rec computation queued' };
  });

  // ============================================
  // POST /revrec/reconcile
  // ============================================
  fastify.post('/reconcile', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    const body = request.body;

    // Validate request body
    const parsed = TriggerRevRecReconcileRequestSchema.safeParse(body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.issues });
    }

    const { snapshotId, periodStart, periodEnd } = parsed.data;

    // Verify snapshot exists
    const snapshot = await fastify.db
      .selectFrom('snapshots')
      .select('id')
      .where('id', '=', snapshotId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!snapshot) {
      return reply.status(404).send({ error: 'Snapshot not found' });
    }

    // Queue the job
    const queue = fastify.queues['revrec.reconcile'];
    if (!queue) {
      return reply.status(500).send({ error: 'RevRec reconcile queue not available' });
    }

    const job = await queue.add('reconcile', {
      payload: {
        type: 'revrec.reconcile',
        tenantId,
        snapshotId,
        periodStart,
        periodEnd,
      },
    });

    return { jobId: job.id, message: 'Rev-rec reconciliation queued' };
  });
};

export default revrecRoutes;
