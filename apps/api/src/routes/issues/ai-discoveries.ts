/**
 * AI Discoveries API Routes (Tier 3)
 * 
 * Endpoints for managing AI-discovered issues that rules might have missed.
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { nanoid } from 'nanoid';

// Schemas
const AIDiscoveryListQuerySchema = z.object({
  snapshotId: z.string().optional(),
  runId: z.string().optional(),
  category: z.enum(['semantic', 'pattern', 'anomaly', 'contextual']).optional(),
  severity: z.enum(['info', 'low', 'medium', 'high', 'critical']).optional(),
  reviewStatus: z.enum(['pending', 'confirmed', 'dismissed']).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

const PromoteDiscoverySchema = z.object({
  severity: z.enum(['info', 'low', 'medium', 'high', 'critical']).optional(),
  notes: z.string().optional(),
});

const DismissDiscoverySchema = z.object({
  notes: z.string().optional(),
});

const aiDiscoveryRoutes: FastifyPluginAsync = async (fastify) => {
  const { db } = fastify;

  // ============================================
  // GET /issues/ai-discoveries - List AI discoveries
  // ============================================
  fastify.get('/ai-discoveries', async (request, reply) => {
    const tenantId = request.tenantId;
    const query = AIDiscoveryListQuerySchema.parse(request.query);

    let dbQuery = db
      .selectFrom('ai_discovered_issues')
      .selectAll()
      .where('tenant_id', '=', tenantId);

    // Apply filters
    if (query.snapshotId) {
      dbQuery = dbQuery.where('snapshot_id', '=', query.snapshotId);
    }
    if (query.runId) {
      dbQuery = dbQuery.where('run_id', '=', query.runId);
    }
    if (query.category) {
      dbQuery = dbQuery.where('category', '=', query.category);
    }
    if (query.severity) {
      dbQuery = dbQuery.where('severity', '=', query.severity);
    }
    if (query.reviewStatus) {
      dbQuery = dbQuery.where('review_status', '=', query.reviewStatus);
    }

    // Get total count
    let countQuery = db
      .selectFrom('ai_discovered_issues')
      .select(db.fn.countAll().as('count'))
      .where('tenant_id', '=', tenantId);

    if (query.snapshotId) {
      countQuery = countQuery.where('snapshot_id', '=', query.snapshotId);
    }
    if (query.runId) {
      countQuery = countQuery.where('run_id', '=', query.runId);
    }
    if (query.reviewStatus) {
      countQuery = countQuery.where('review_status', '=', query.reviewStatus);
    }

    const countResult = await countQuery.executeTakeFirst();
    const total = Number(countResult?.count || 0);

    // Apply pagination and ordering
    const discoveries = await dbQuery
      .orderBy('created_at', 'desc')
      .limit(query.limit)
      .offset(query.offset)
      .execute();

    return {
      discoveries: discoveries.map(mapDiscoveryFromDb),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  });

  // ============================================
  // GET /issues/ai-discoveries/summary - Get summary stats
  // ============================================
  fastify.get('/ai-discoveries/summary', async (request, reply) => {
    const tenantId = request.tenantId;
    const { snapshotId } = request.query as { snapshotId?: string };

    let baseQuery = db
      .selectFrom('ai_discovered_issues')
      .where('tenant_id', '=', tenantId);

    if (snapshotId) {
      baseQuery = baseQuery.where('snapshot_id', '=', snapshotId);
    }

    // Get counts by status
    const byStatus = await baseQuery
      .select(['review_status', db.fn.countAll().as('count')])
      .groupBy('review_status')
      .execute();

    // Get counts by category
    const byCategory = await baseQuery
      .select(['category', db.fn.countAll().as('count')])
      .groupBy('category')
      .execute();

    // Get counts by severity
    const bySeverity = await baseQuery
      .select(['severity', db.fn.countAll().as('count')])
      .groupBy('severity')
      .execute();

    // Get total
    const totalResult = await baseQuery
      .select(db.fn.countAll().as('count'))
      .executeTakeFirst();

    return {
      total: Number(totalResult?.count || 0),
      byStatus: Object.fromEntries(byStatus.map(r => [r.review_status, Number(r.count)])),
      byCategory: Object.fromEntries(byCategory.map(r => [r.category, Number(r.count)])),
      bySeverity: Object.fromEntries(bySeverity.map(r => [r.severity, Number(r.count)])),
    };
  });

  // ============================================
  // GET /issues/ai-discoveries/:id - Get single discovery
  // ============================================
  fastify.get('/ai-discoveries/:id', async (request, reply) => {
    const tenantId = request.tenantId;
    const { id } = request.params as { id: string };

    const discovery = await db
      .selectFrom('ai_discovered_issues')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!discovery) {
      return reply.status(404).send({ error: 'AI discovery not found' });
    }

    // If promoted, get the linked issue
    let promotedIssue = null;
    if (discovery.promoted_to_issue_id) {
      promotedIssue = await db
        .selectFrom('issues')
        .select(['id', 'rule_id', 'category', 'severity', 'status'])
        .where('id', '=', discovery.promoted_to_issue_id)
        .executeTakeFirst();
    }

    return {
      ...mapDiscoveryFromDb(discovery),
      promotedIssue,
    };
  });

  // ============================================
  // POST /issues/ai-discoveries/:id/promote - Convert to regular issue
  // ============================================
  fastify.post('/ai-discoveries/:id/promote', async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;
    const { id } = request.params as { id: string };
    const body = PromoteDiscoverySchema.parse(request.body || {});

    // Get discovery
    const discovery = await db
      .selectFrom('ai_discovered_issues')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!discovery) {
      return reply.status(404).send({ error: 'AI discovery not found' });
    }

    if (discovery.promoted_to_issue_id) {
      return reply.status(400).send({ 
        error: 'Discovery already promoted',
        issueId: discovery.promoted_to_issue_id 
      });
    }

    // Create issue from discovery
    const issueId = `iss_${nanoid(16)}`;
    const now = new Date();

    await db.insertInto('issues').values({
      id: issueId,
      tenant_id: tenantId,
      snapshot_id: discovery.snapshot_id,
      run_id: discovery.run_id,
      rule_id: `AI_${discovery.category.toUpperCase()}`,
      rule_version: '1.0.0',
      issue_key: `ai_${discovery.category}_${id}`,
      category: mapAICategoryToIssueCategory(discovery.category),
      status: 'open',
      severity: body.severity || discovery.severity,
      confidence: Number(discovery.confidence),
      expected_json: {},
      actual_json: discovery.evidence_json,
      dimensions_json: {
        contractIds: (discovery.evidence_json as any)?.contractIds || [],
        invoiceIds: (discovery.evidence_json as any)?.invoiceIds || [],
      },
      data_quality_flags: [],
      rule_metadata_json: {
        aiDiscoveryId: id,
        aiCategory: discovery.category,
        aiReasoning: discovery.reasoning,
        promotedBy: userId,
        promotionNotes: body.notes,
      },
      ai_analysis_json: {
        rootCause: discovery.description,
        businessImpact: discovery.reasoning,
        suggestedFix: 'Review and investigate this AI-detected pattern',
        confidence: Number(discovery.confidence),
        relatedIssueIds: [],
        explanation: discovery.title,
        priority: severityToPriority(discovery.severity),
        tags: [discovery.category, 'ai-discovered'],
      },
      ai_enriched_at: now,
      created_at: now,
      updated_at: now,
    }).execute();

    // Update discovery
    await db
      .updateTable('ai_discovered_issues')
      .set({
        review_status: 'confirmed',
        reviewed_by: userId,
        reviewed_at: now,
        review_notes: body.notes,
        promoted_to_issue_id: issueId,
        updated_at: now,
      })
      .where('id', '=', id)
      .execute();

    return { 
      success: true, 
      issueId,
      message: 'Discovery promoted to issue' 
    };
  });

  // ============================================
  // POST /issues/ai-discoveries/:id/dismiss - Mark as false positive
  // ============================================
  fastify.post('/ai-discoveries/:id/dismiss', async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;
    const { id } = request.params as { id: string };
    const body = DismissDiscoverySchema.parse(request.body || {});

    // Get discovery
    const discovery = await db
      .selectFrom('ai_discovered_issues')
      .select(['id', 'review_status'])
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!discovery) {
      return reply.status(404).send({ error: 'AI discovery not found' });
    }

    if (discovery.review_status !== 'pending') {
      return reply.status(400).send({ 
        error: 'Discovery already reviewed',
        status: discovery.review_status 
      });
    }

    // Update discovery
    await db
      .updateTable('ai_discovered_issues')
      .set({
        review_status: 'dismissed',
        reviewed_by: userId,
        reviewed_at: new Date(),
        review_notes: body.notes,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .execute();

    return { success: true, message: 'Discovery dismissed' };
  });

  // ============================================
  // POST /issues/ai-discoveries/bulk-dismiss - Bulk dismiss
  // ============================================
  fastify.post('/ai-discoveries/bulk-dismiss', async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;
    const { ids, notes } = request.body as { ids: string[]; notes?: string };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return reply.status(400).send({ error: 'ids array required' });
    }

    if (ids.length > 100) {
      return reply.status(400).send({ error: 'Maximum 100 ids per request' });
    }

    const now = new Date();

    await db
      .updateTable('ai_discovered_issues')
      .set({
        review_status: 'dismissed',
        reviewed_by: userId,
        reviewed_at: now,
        review_notes: notes,
        updated_at: now,
      })
      .where('id', 'in', ids)
      .where('tenant_id', '=', tenantId)
      .where('review_status', '=', 'pending')
      .execute();

    return { success: true, dismissed: ids.length };
  });
};

// Helper to map discovery from DB
function mapDiscoveryFromDb(discovery: any) {
  return {
    id: discovery.id,
    tenantId: discovery.tenant_id,
    snapshotId: discovery.snapshot_id,
    runId: discovery.run_id,
    category: discovery.category,
    severity: discovery.severity,
    confidence: Number(discovery.confidence),
    title: discovery.title,
    description: discovery.description,
    evidence: discovery.evidence_json,
    reasoning: discovery.reasoning,
    reviewStatus: discovery.review_status,
    reviewedBy: discovery.reviewed_by,
    reviewedAt: discovery.reviewed_at,
    reviewNotes: discovery.review_notes,
    promotedToIssueId: discovery.promoted_to_issue_id,
    createdAt: discovery.created_at,
    updatedAt: discovery.updated_at,
  };
}

// Map AI category to issue category
function mapAICategoryToIssueCategory(category: string): string {
  switch (category) {
    case 'semantic':
      return 'billing';
    case 'pattern':
      return 'cross_snapshot';
    case 'anomaly':
      return 'data_quality';
    case 'contextual':
      return 'billing';
    default:
      return 'data_quality';
  }
}

// Map severity to priority
function severityToPriority(severity: string): string {
  switch (severity) {
    case 'critical': return 'critical';
    case 'high': return 'high';
    case 'medium': return 'medium';
    default: return 'low';
  }
}

export default aiDiscoveryRoutes;
