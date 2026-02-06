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
  GetEvidenceQuerySchema,
  RegenerateEvidenceRequestSchema,
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
    
    // Validate snapshot exists and is completed
    const snapshot = await db
      .selectFrom('snapshots')
      .select(['id', 'status'])
      .where('id', '=', body.snapshotId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!snapshot) {
      return reply.status(404).send({ error: 'Snapshot not found' });
    }

    if (snapshot.status !== 'complete') {
      return reply.status(400).send({
        error: 'Snapshot must be complete before running detection',
        status: snapshot.status
      });
    }

    // Check if snapshot has any data to run detection on
    const [contractsCount, invoicesCount, customersCount] = await Promise.all([
      db.selectFrom('contracts')
        .select(db.fn.count<number>('id').as('count'))
        .where('snapshot_id', '=', body.snapshotId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst(),
      db.selectFrom('invoices')
        .select(db.fn.count<number>('id').as('count'))
        .where('snapshot_id', '=', body.snapshotId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst(),
      db.selectFrom('customers')
        .select(db.fn.count<number>('id').as('count'))
        .where('snapshot_id', '=', body.snapshotId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst(),
    ]);

    const hasData = (contractsCount?.count ?? 0) > 0 || 
                    (invoicesCount?.count ?? 0) > 0 || 
                    (customersCount?.count ?? 0) > 0;

    if (!hasData) {
      return reply.status(400).send({ 
        error: 'Snapshot has no data to run detection on. Please sync data first.',
        snapshotId: body.snapshotId
      });
    }

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

  // ============================================
  // Phase 8: Evidence Endpoints
  // ============================================

  // GET /issues/:id/evidence - Get full evidence pack
  fastify.get('/:id/evidence', async (request, reply) => {
    const tenantId = request.tenantId;
    const { id } = request.params as { id: string };
    const query = GetEvidenceQuerySchema.parse(request.query);

    // Verify issue exists
    const issue = await db
      .selectFrom('issues')
      .select(['id', 'snapshot_id'])
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!issue) {
      return reply.status(404).send({ error: 'Issue not found' });
    }

    // Get latest evidence
    const evidence = await db
      .selectFrom('issue_evidence')
      .selectAll()
      .where('issue_id', '=', id)
      .orderBy('evidence_version', 'desc')
      .executeTakeFirst();

    if (!evidence) {
      return reply.status(404).send({ error: 'Evidence not found for this issue' });
    }

    // Get sources if requested
    let sources: any[] = [];
    if (query.includeSources) {
      sources = await db
        .selectFrom('issue_evidence_sources')
        .selectAll()
        .where('evidence_id', '=', evidence.id)
        .execute();
    }

    // Get calculations if requested
    let calculations: any[] = [];
    if (query.includeCalculations) {
      calculations = await db
        .selectFrom('issue_evidence_calculations')
        .selectAll()
        .where('evidence_id', '=', evidence.id)
        .orderBy('sequence_number', 'asc')
        .execute();
    }

    // Get clauses if requested
    let clauses: any[] = [];
    if (query.includeClauses) {
      clauses = await db
        .selectFrom('issue_evidence_clauses')
        .selectAll()
        .where('evidence_id', '=', evidence.id)
        .execute();
    }

    // Get audit if requested
    let audit: any[] = [];
    if (query.includeAudit) {
      audit = await db
        .selectFrom('issue_evidence_audit')
        .selectAll()
        .where('issue_id', '=', id)
        .orderBy('created_at', 'desc')
        .limit(10)
        .execute();
    }

    // Generate download URL if S3 key exists
    let downloadUrl = null;
    if (evidence.s3_key && fastify.storage) {
      try {
        downloadUrl = await fastify.storage.getPresignedGetUrl(evidence.s3_key, 3600);
      } catch (e) {
        // Log but don't fail if S3 is unavailable
      }
    }

    return {
      evidence: mapEvidenceFromDb(evidence),
      sources: sources.map(mapEvidenceSourceFromDb),
      calculations: calculations.map(mapEvidenceCalculationFromDb),
      clauses: clauses.map(mapEvidenceClauseFromDb),
      audit: audit.map(mapEvidenceAuditFromDb),
      downloadUrl,
    };
  });

  // GET /issues/:id/evidence/summary - Get evidence summary only
  fastify.get('/:id/evidence/summary', async (request, reply) => {
    const tenantId = request.tenantId;
    const { id } = request.params as { id: string };

    // Get latest evidence
    const evidence = await db
      .selectFrom('issue_evidence')
      .selectAll()
      .where('issue_id', '=', id)
      .orderBy('evidence_version', 'desc')
      .executeTakeFirst();

    if (!evidence) {
      return reply.status(404).send({ error: 'Evidence not found for this issue' });
    }

    // Get counts
    const sourcesCount = await db
      .selectFrom('issue_evidence_sources')
      .select(db.fn.countAll().as('count'))
      .where('evidence_id', '=', evidence.id)
      .executeTakeFirst();

    const calculationsCount = await db
      .selectFrom('issue_evidence_calculations')
      .select(db.fn.countAll().as('count'))
      .where('evidence_id', '=', evidence.id)
      .executeTakeFirst();

    const clausesCount = await db
      .selectFrom('issue_evidence_clauses')
      .select(db.fn.countAll().as('count'))
      .where('evidence_id', '=', evidence.id)
      .executeTakeFirst();

    return {
      issueId: id,
      evidenceVersion: evidence.evidence_version,
      title: evidence.title,
      summary: evidence.summary,
      completenessScore: Number(evidence.completeness_score),
      completenessBreakdown: evidence.completeness_breakdown as Record<string, number>,
      hasS3Artifact: !!evidence.s3_key,
      sourcesCount: Number(sourcesCount?.count || 0),
      calculationsCount: Number(calculationsCount?.count || 0),
      clausesCount: Number(clausesCount?.count || 0),
      generatedAt: evidence.created_at,
    };
  });

  // GET /issues/:id/evidence/download - Get pre-signed download URL
  fastify.get('/:id/evidence/download', async (request, reply) => {
    const tenantId = request.tenantId;
    const { id } = request.params as { id: string };

    // Get latest evidence with S3 key
    const evidence = await db
      .selectFrom('issue_evidence')
      .select(['s3_key'])
      .where('issue_id', '=', id)
      .orderBy('evidence_version', 'desc')
      .executeTakeFirst();

    if (!evidence) {
      return reply.status(404).send({ error: 'Evidence not found for this issue' });
    }

    if (!evidence.s3_key) {
      return reply.status(404).send({ error: 'No downloadable artifact for this evidence' });
    }

    if (!fastify.storage) {
      return reply.status(503).send({ error: 'Storage service unavailable' });
    }

    try {
      const downloadUrl = await fastify.storage.getPresignedGetUrl(evidence.s3_key, 3600);
      return { downloadUrl, expiresIn: 3600 };
    } catch (e) {
      return reply.status(500).send({ error: 'Failed to generate download URL' });
    }
  });

  // POST /issues/:id/evidence/regenerate - Regenerate evidence (Admin only)
  fastify.post('/:id/evidence/regenerate', async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;
    const { id } = request.params as { id: string };
    const body = RegenerateEvidenceRequestSchema.parse(request.body || {});

    // Verify issue exists
    const issue = await db
      .selectFrom('issues')
      .select(['id', 'snapshot_id'])
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!issue) {
      return reply.status(404).send({ error: 'Issue not found' });
    }

    const queue = fastify.queues['evidence.regenerate'];
    if (!queue) {
      return reply.status(503).send({ error: 'Evidence queue not available' });
    }

    // Create job record
    const jobId = `job_${Date.now()}`;
    await db.insertInto('jobs').values({
      id: jobId,
      tenant_id: tenantId,
      type: 'evidence',
      status: 'pending',
      payload_json: { issueId: id, force: body.force, reason: body.reason },
    }).execute();

    // Queue the job
    await queue.add('evidence.regenerate', {
      jobId,
      tenantId,
      payload: {
        type: 'evidence.regenerate',
        tenantId,
        issueId: id,
        force: body.force,
        actorUserId: userId,
        reason: body.reason,
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

// Helper to map DB evidence to API response
function mapEvidenceFromDb(evidence: any) {
  return {
    id: evidence.id,
    tenantId: evidence.tenant_id,
    snapshotId: evidence.snapshot_id,
    issueId: evidence.issue_id,
    evidenceVersion: evidence.evidence_version,
    evidenceType: evidence.evidence_type,
    title: evidence.title,
    summary: evidence.summary,
    dataJson: evidence.data_json,
    completenessScore: Number(evidence.completeness_score),
    completenessBreakdown: evidence.completeness_breakdown,
    s3Key: evidence.s3_key,
    ruleId: evidence.rule_id,
    ruleVersion: evidence.rule_version,
    createdAt: evidence.created_at,
  };
}

// Helper to map evidence source from DB
function mapEvidenceSourceFromDb(source: any) {
  return {
    id: source.id,
    tenantId: source.tenant_id,
    evidenceId: source.evidence_id,
    issueId: source.issue_id,
    sourceType: source.source_type,
    sourceId: source.source_id,
    sourceSystem: source.source_system,
    sourceExternalId: source.source_external_id,
    fieldName: source.field_name,
    fieldValueJson: source.field_value_json,
    s3Key: source.s3_key,
    snapshotValueJson: source.snapshot_value_json,
    createdAt: source.created_at,
  };
}

// Helper to map evidence calculation from DB
function mapEvidenceCalculationFromDb(calc: any) {
  return {
    id: calc.id,
    tenantId: calc.tenant_id,
    evidenceId: calc.evidence_id,
    issueId: calc.issue_id,
    calcName: calc.calc_name,
    calcType: calc.calc_type,
    formula: calc.formula,
    inputsJson: calc.inputs_json,
    outputsJson: calc.outputs_json,
    ruleId: calc.rule_id,
    ruleVersion: calc.rule_version,
    sequenceNumber: calc.sequence_number,
    isReproducible: calc.is_reproducible,
    notes: calc.notes,
    createdAt: calc.created_at,
  };
}

// Helper to map evidence clause from DB
function mapEvidenceClauseFromDb(clause: any) {
  return {
    id: clause.id,
    tenantId: clause.tenant_id,
    evidenceId: clause.evidence_id,
    issueId: clause.issue_id,
    clauseId: clause.clause_id,
    contractId: clause.contract_id,
    contractVersionId: clause.contract_version_id,
    documentId: clause.document_id,
    clauseType: clause.clause_type,
    clauseLabel: clause.clause_label,
    excerpt: clause.excerpt,
    fullTextS3Key: clause.full_text_s3_key,
    startOffset: clause.start_offset,
    endOffset: clause.end_offset,
    pageNumber: clause.page_number,
    relevanceScore: clause.relevance_score ? Number(clause.relevance_score) : null,
    createdAt: clause.created_at,
  };
}

// Helper to map evidence audit from DB
function mapEvidenceAuditFromDb(audit: any) {
  return {
    id: audit.id,
    tenantId: audit.tenant_id,
    issueId: audit.issue_id,
    evidenceId: audit.evidence_id,
    evidenceVersion: audit.evidence_version,
    action: audit.action,
    status: audit.status,
    triggerType: audit.trigger_type,
    actorUserId: audit.actor_user_id,
    previousVersion: audit.previous_version,
    completenessScore: audit.completeness_score ? Number(audit.completeness_score) : null,
    processingTimeMs: audit.processing_time_ms,
    errorCode: audit.error_code,
    errorMessage: audit.error_message,
    metadataJson: audit.metadata_json,
    generatedAt: audit.generated_at,
    createdAt: audit.created_at,
  };
}

export default issueRoutes;
