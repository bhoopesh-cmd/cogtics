/**
 * Issues and Detection API Routes (Phase 7)
 * Endpoints for issue management and detection runs
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  DetectionIssueListQuerySchema as IssueListQuerySchema,
  UpdateIssueStatusSchema,
  BulkUpdateIssueStatusSchema,
  CreateDetectionRunSchema,
  generateIssueStatusHistoryId,
  generateDetectionRunId,
} from '@cogtics/schemas';

const issueRoutes: FastifyPluginAsync = async (fastify) => {
  const { db } = fastify;

  // ============================================
  // Issue Endpoints
  // ============================================

  // GET /issues - List issues with filters
  fastify.get('/', async (request, reply) => {
    const tenantId = request.tenantId;
    const query = IssueListQuerySchema.parse(request.query);

    let dbQuery = db
      .selectFrom('issues')
      .selectAll()
      .where('tenant_id', '=', tenantId);

    // Apply filters
    if (query.snapshotId) {
      dbQuery = dbQuery.where('snapshot_id', '=', query.snapshotId);
    }
    if (query.status) {
      dbQuery = dbQuery.where('status', '=', query.status);
    }
    if (query.severity) {
      dbQuery = dbQuery.where('severity', '=', query.severity);
    }
    if (query.category) {
      dbQuery = dbQuery.where('category', '=', query.category);
    }
    if (query.ruleId) {
      dbQuery = dbQuery.where('rule_id', '=', query.ruleId);
    }
    if (query.contractId) {
      dbQuery = dbQuery.where('contract_id', '=', query.contractId);
    }
    if (query.customerId) {
      dbQuery = dbQuery.where('customer_id', '=', query.customerId);
    }
    if (query.invoiceId) {
      dbQuery = dbQuery.where('invoice_id', '=', query.invoiceId);
    }

    // Count total
    const countResult = await db
      .selectFrom('issues')
      .select(db.fn.countAll().as('count'))
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();
    
    const total = Number(countResult?.count || 0);

    // Apply sorting
    if (query.sortBy === 'severity') {
      // Custom severity order
      dbQuery = dbQuery.orderBy(
        db.raw(`CASE severity 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
          WHEN 'info' THEN 5 
          ELSE 6 END`) as any,
        query.sortOrder
      );
    } else if (query.sortBy === 'impactAmount') {
      dbQuery = dbQuery.orderBy('impact_amount', query.sortOrder);
    } else if (query.sortBy === 'status') {
      dbQuery = dbQuery.orderBy('status', query.sortOrder);
    } else {
      dbQuery = dbQuery.orderBy('created_at', query.sortOrder);
    }

    // Pagination
    const offset = (query.page - 1) * query.pageSize;
    dbQuery = dbQuery.limit(query.pageSize).offset(offset);

    const issues = await dbQuery.execute();

    return {
      issues: issues.map(mapIssueFromDb),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    };
  });

  // GET /issues/summary - Get issue summary/aggregates
  fastify.get('/summary', async (request, reply) => {
    const tenantId = request.tenantId;
    const { snapshotId } = request.query as { snapshotId?: string };

    let query = db
      .selectFrom('issues')
      .select([
        db.fn.countAll().as('total'),
      ])
      .where('tenant_id', '=', tenantId);

    if (snapshotId) {
      query = query.where('snapshot_id', '=', snapshotId);
    }

    const totalResult = await query.executeTakeFirst();

    // Get counts by status
    const byStatus = await db
      .selectFrom('issues')
      .select(['status', db.fn.countAll().as('count')])
      .where('tenant_id', '=', tenantId)
      .$if(!!snapshotId, (q) => q.where('snapshot_id', '=', snapshotId!))
      .groupBy('status')
      .execute();

    // Get counts by severity
    const bySeverity = await db
      .selectFrom('issues')
      .select(['severity', db.fn.countAll().as('count')])
      .where('tenant_id', '=', tenantId)
      .$if(!!snapshotId, (q) => q.where('snapshot_id', '=', snapshotId!))
      .groupBy('severity')
      .execute();

    // Get counts by category
    const byCategory = await db
      .selectFrom('issues')
      .select(['category', db.fn.countAll().as('count')])
      .where('tenant_id', '=', tenantId)
      .$if(!!snapshotId, (q) => q.where('snapshot_id', '=', snapshotId!))
      .groupBy('category')
      .execute();

    // Get total impact
    const impactResult = await db
      .selectFrom('issues')
      .select(db.fn.sum('impact_amount').as('total_impact'))
      .where('tenant_id', '=', tenantId)
      .$if(!!snapshotId, (q) => q.where('snapshot_id', '=', snapshotId!))
      .executeTakeFirst();

    // Get average confidence
    const confidenceResult = await db
      .selectFrom('issues')
      .select(db.fn.avg('confidence').as('avg_confidence'))
      .where('tenant_id', '=', tenantId)
      .$if(!!snapshotId, (q) => q.where('snapshot_id', '=', snapshotId!))
      .executeTakeFirst();

    return {
      totalCount: Number(totalResult?.total || 0),
      byStatus: Object.fromEntries(byStatus.map(r => [r.status, Number(r.count)])),
      bySeverity: Object.fromEntries(bySeverity.map(r => [r.severity, Number(r.count)])),
      byCategory: Object.fromEntries(byCategory.map(r => [r.category, Number(r.count)])),
      totalImpact: Number(impactResult?.total_impact || 0),
      avgConfidence: Number(confidenceResult?.avg_confidence || 0),
    };
  });

  // GET /issues/:id - Get issue detail
  fastify.get('/:id', async (request, reply) => {
    const tenantId = request.tenantId;
    const { id } = request.params as { id: string };

    const issue = await db
      .selectFrom('issues')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!issue) {
      return reply.status(404).send({ error: 'Issue not found' });
    }

    // Get sources
    const sources = await db
      .selectFrom('issue_sources')
      .selectAll()
      .where('issue_id', '=', id)
      .execute();

    // Get history
    const history = await db
      .selectFrom('issue_status_history')
      .selectAll()
      .where('issue_id', '=', id)
      .orderBy('created_at', 'desc')
      .execute();

    return {
      ...mapIssueFromDb(issue),
      sources: sources.map(s => ({
        id: s.id,
        sourceType: s.source_type,
        sourceId: s.source_id,
        sourceSystem: s.source_system,
        fieldName: s.field_name,
        fieldValue: s.field_value_json,
        createdAt: s.created_at,
      })),
      history: history.map(h => ({
        id: h.id,
        fromStatus: h.from_status,
        toStatus: h.to_status,
        actorUserId: h.actor_user_id,
        reason: h.reason,
        metadata: h.metadata_json,
        createdAt: h.created_at,
      })),
    };
  });

  // POST /issues/:id/status - Update issue status
  fastify.post('/:id/status', async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;
    const { id } = request.params as { id: string };
    const body = UpdateIssueStatusSchema.parse(request.body);

    // Get current issue
    const issue = await db
      .selectFrom('issues')
      .select(['status'])
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!issue) {
      return reply.status(404).send({ error: 'Issue not found' });
    }

    const fromStatus = issue.status;

    // Update issue
    await db
      .updateTable('issues')
      .set({
        status: body.status,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .execute();

    // Record history
    await db.insertInto('issue_status_history').values({
      id: generateIssueStatusHistoryId(),
      tenant_id: tenantId,
      issue_id: id,
      from_status: fromStatus,
      to_status: body.status,
      actor_user_id: userId,
      reason: body.reason,
      metadata_json: {},
    }).execute();

    return { success: true, id, status: body.status };
  });

  // POST /issues/bulk-status - Bulk update issue status
  fastify.post('/bulk-status', async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;
    const body = BulkUpdateIssueStatusSchema.parse(request.body);

    let updated = 0;

    for (const issueId of body.issueIds) {
      // Get current status
      const issue = await db
        .selectFrom('issues')
        .select(['status'])
        .where('id', '=', issueId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!issue) continue;

      // Update
      await db
        .updateTable('issues')
        .set({
          status: body.status,
          updated_at: new Date(),
        })
        .where('id', '=', issueId)
        .execute();

      // Record history
      await db.insertInto('issue_status_history').values({
        id: generateIssueStatusHistoryId(),
        tenant_id: tenantId,
        issue_id: issueId,
        from_status: issue.status,
        to_status: body.status,
        actor_user_id: userId,
        reason: body.reason,
        metadata_json: { bulk: true },
      }).execute();

      updated++;
    }

    return { success: true, updated, total: body.issueIds.length };
  });

  // ============================================
  // Detection Run Endpoints
  // ============================================

  // GET /detection-runs - List detection runs
  fastify.get('/detection-runs', async (request, reply) => {
    const tenantId = request.tenantId;
    const { snapshotId, limit = 20 } = request.query as { snapshotId?: string; limit?: number };

    let query = db
      .selectFrom('detection_runs')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .orderBy('created_at', 'desc')
      .limit(Math.min(limit, 100));

    if (snapshotId) {
      query = query.where('snapshot_id', '=', snapshotId);
    }

    const runs = await query.execute();

    return {
      runs: runs.map(r => ({
        id: r.id,
        snapshotId: r.snapshot_id,
        rulesetVersion: r.ruleset_version,
        status: r.status,
        issuesTotal: r.issues_total,
        issuesBySeverity: r.issues_by_severity,
        issuesByCategory: r.issues_by_category,
        config: r.config_json,
        stats: r.stats_json,
        errorCode: r.error_code,
        errorMessage: r.error_message,
        startedAt: r.started_at,
        finishedAt: r.finished_at,
        createdAt: r.created_at,
      })),
      total: runs.length,
    };
  });

  // GET /detection-runs/:id - Get detection run detail
  fastify.get('/detection-runs/:id', async (request, reply) => {
    const tenantId = request.tenantId;
    const { id } = request.params as { id: string };

    const run = await db
      .selectFrom('detection_runs')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!run) {
      return reply.status(404).send({ error: 'Detection run not found' });
    }

    // Get rule breakdown
    const ruleBreakdown = await db
      .selectFrom('issues')
      .select(['rule_id', db.fn.countAll().as('count')])
      .where('run_id', '=', id)
      .groupBy('rule_id')
      .execute();

    return {
      id: run.id,
      snapshotId: run.snapshot_id,
      rulesetVersion: run.ruleset_version,
      status: run.status,
      issuesTotal: run.issues_total,
      issuesBySeverity: run.issues_by_severity,
      issuesByCategory: run.issues_by_category,
      ruleBreakdown: Object.fromEntries(ruleBreakdown.map(r => [r.rule_id, Number(r.count)])),
      config: run.config_json,
      stats: run.stats_json,
      errorCode: run.error_code,
      errorMessage: run.error_message,
      startedAt: run.started_at,
      finishedAt: run.finished_at,
      createdAt: run.created_at,
    };
  });

  // POST /detection-runs - Trigger new detection run
  fastify.post('/detection-runs', async (request, reply) => {
    const tenantId = request.tenantId;
    const body = CreateDetectionRunSchema.parse(request.body);
    
    const queue = fastify.queues['detect.run'];

    // Create job record
    const jobId = `job_${Date.now()}`;
    await db.insertInto('jobs').values({
      id: jobId,
      tenant_id: tenantId,
      type: 'detect',
      status: 'pending',
      payload_json: body,
    }).execute();

    // Queue the job
    await queue.add('detect.run', {
      jobId,
      tenantId,
      payload: {
        type: 'detect.run',
        tenantId,
        snapshotId: body.snapshotId,
        rulesetVersion: body.rulesetVersion,
        config: body.config,
      },
    });

    return { success: true, jobId };
  });

  // POST /detection-runs/:id/replay - Replay detection run
  fastify.post('/detection-runs/:id/replay', async (request, reply) => {
    const tenantId = request.tenantId;
    const { id } = request.params as { id: string };
    const { rulesetVersion } = request.body as { rulesetVersion?: string };

    const queue = fastify.queues['detect.replay'];

    // Create job record
    const jobId = `job_${Date.now()}`;
    await db.insertInto('jobs').values({
      id: jobId,
      tenant_id: tenantId,
      type: 'detect',
      status: 'pending',
      payload_json: { runId: id, rulesetVersion },
    }).execute();

    // Queue the job
    await queue.add('detect.replay', {
      jobId,
      tenantId,
      payload: {
        type: 'detect.replay',
        tenantId,
        runId: id,
        rulesetVersion,
      },
    });

    return { success: true, jobId };
  });
};

// Helper to map DB issue to API response
function mapIssueFromDb(issue: any) {
  return {
    id: issue.id,
    tenantId: issue.tenant_id,
    snapshotId: issue.snapshot_id,
    runId: issue.run_id,
    ruleId: issue.rule_id,
    ruleVersion: issue.rule_version,
    issueKey: issue.issue_key,
    category: issue.category,
    status: issue.status,
    severity: issue.severity,
    confidence: issue.confidence,
    impactAmount: issue.impact_amount,
    currency: issue.currency,
    expected: issue.expected_json,
    actual: issue.actual_json,
    dimensions: issue.dimensions_json,
    contractId: issue.contract_id,
    invoiceId: issue.invoice_id,
    customerId: issue.customer_id,
    dataQualityFlags: issue.data_quality_flags,
    suppressedByRule: issue.suppressed_by_rule,
    ruleMetadata: issue.rule_metadata_json,
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
  };
}

export default issueRoutes;
