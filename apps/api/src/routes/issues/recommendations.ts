/**
 * AI Recommendations API Routes (Tier 4)
 * 
 * Endpoints for managing AI-generated recommendations and simulation integration.
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { nanoid } from 'nanoid';

// Schemas
const RecommendationListQuerySchema = z.object({
  snapshotId: z.string().optional(),
  runId: z.string().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  status: z.enum(['pending', 'accepted', 'dismissed', 'simulated', 'applied']).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

const CreateSimulationSchema = z.object({
  name: z.string().optional(),
  notes: z.string().optional(),
});

const DismissRecommendationSchema = z.object({
  notes: z.string().optional(),
});

const ApplyRecommendationSchema = z.object({
  notes: z.string().optional(),
  skipSimulation: z.boolean().optional(),
});

const recommendationRoutes: FastifyPluginAsync = async (fastify) => {
  const { db } = fastify;

  // ============================================
  // GET /issues/:id/recommendations - Get recommendations for issue
  // ============================================
  fastify.get('/:id/recommendations', async (request, reply) => {
    const tenantId = request.tenantId;
    const { id } = request.params as { id: string };

    // Verify issue exists
    const issue = await db
      .selectFrom('issues')
      .select(['id'])
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!issue) {
      return reply.status(404).send({ error: 'Issue not found' });
    }

    // Get recommendations that include this issue
    const recommendations = await db
      .selectFrom('ai_recommendations')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where((db as any).raw(`issue_ids @> ?::jsonb`, [`["${id}"]`]) as any)
      .orderBy('created_at', 'desc')
      .execute();

    return {
      recommendations: recommendations.map(mapRecommendationFromDb),
      total: recommendations.length,
    };
  });

  // ============================================
  // GET /detection-runs/:id/recommendations - Get all recommendations for run
  // ============================================
  fastify.get('/detection-runs/:id/recommendations', async (request, reply) => {
    const tenantId = request.tenantId;
    const { id } = request.params as { id: string };

    // Verify run exists
    const run = await db
      .selectFrom('detection_runs')
      .select(['id'])
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!run) {
      return reply.status(404).send({ error: 'Detection run not found' });
    }

    const recommendations = await db
      .selectFrom('ai_recommendations')
      .selectAll()
      .where('run_id', '=', id)
      .where('tenant_id', '=', tenantId)
      .orderBy('priority', 'asc')
      .orderBy('created_at', 'desc')
      .execute();

    return {
      recommendations: recommendations.map(mapRecommendationFromDb),
      total: recommendations.length,
    };
  });

  // ============================================
  // GET /recommendations - List all recommendations
  // ============================================
  fastify.get('/recommendations', async (request, reply) => {
    const tenantId = request.tenantId;
    const query = RecommendationListQuerySchema.parse(request.query);

    let dbQuery = db
      .selectFrom('ai_recommendations')
      .selectAll()
      .where('tenant_id', '=', tenantId);

    // Apply filters
    if (query.snapshotId) {
      dbQuery = dbQuery.where('snapshot_id', '=', query.snapshotId);
    }
    if (query.runId) {
      dbQuery = dbQuery.where('run_id', '=', query.runId);
    }
    if (query.priority) {
      dbQuery = dbQuery.where('priority', '=', query.priority);
    }
    if (query.status) {
      dbQuery = dbQuery.where('status', '=', query.status);
    }

    // Get total count
    let countQuery = db
      .selectFrom('ai_recommendations')
      .select(db.fn.countAll().as('count'))
      .where('tenant_id', '=', tenantId);

    if (query.snapshotId) {
      countQuery = countQuery.where('snapshot_id', '=', query.snapshotId);
    }
    if (query.status) {
      countQuery = countQuery.where('status', '=', query.status);
    }

    const countResult = await countQuery.executeTakeFirst();
    const total = Number(countResult?.count || 0);

    const recommendations = await dbQuery
      .orderBy('priority', 'asc')
      .orderBy('created_at', 'desc')
      .limit(query.limit)
      .offset(query.offset)
      .execute();

    return {
      recommendations: recommendations.map(mapRecommendationFromDb),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  });

  // ============================================
  // GET /recommendations/summary - Get summary stats
  // ============================================
  fastify.get('/recommendations/summary', async (request, reply) => {
    const tenantId = request.tenantId;
    const { snapshotId } = request.query as { snapshotId?: string };

    let baseQuery = db
      .selectFrom('ai_recommendations')
      .where('tenant_id', '=', tenantId);

    if (snapshotId) {
      baseQuery = baseQuery.where('snapshot_id', '=', snapshotId);
    }

    // Get counts by status
    const byStatus = await baseQuery
      .select(['status', db.fn.countAll().as('count')])
      .groupBy('status')
      .execute();

    // Get counts by priority
    const byPriority = await baseQuery
      .select(['priority', db.fn.countAll().as('count')])
      .groupBy('priority')
      .execute();

    // Get total estimated impact
    const impactResult = await baseQuery
      .select((db as any).raw(`SUM((estimated_impact_json->>'revenueChange')::numeric) as total_impact`) as any)
      .executeTakeFirst();

    // Get total count
    const totalResult = await baseQuery
      .select(db.fn.countAll().as('count'))
      .executeTakeFirst();

    return {
      total: Number(totalResult?.count || 0),
      byStatus: Object.fromEntries(byStatus.map(r => [r.status, Number(r.count)])),
      byPriority: Object.fromEntries(byPriority.map(r => [r.priority, Number(r.count)])),
      totalEstimatedImpact: Number((impactResult as any)?.total_impact || 0),
    };
  });

  // ============================================
  // GET /recommendations/:id - Get single recommendation
  // ============================================
  fastify.get('/recommendations/:id', async (request, reply) => {
    const tenantId = request.tenantId;
    const { id } = request.params as { id: string };

    const recommendation = await db
      .selectFrom('ai_recommendations')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!recommendation) {
      return reply.status(404).send({ error: 'Recommendation not found' });
    }

    // Get related issues
    const issueIds = (recommendation.issue_ids as string[]) || [];
    let issues: any[] = [];
    if (issueIds.length > 0) {
      issues = await db
        .selectFrom('issues')
        .select(['id', 'rule_id', 'category', 'severity', 'status', 'impact_amount'])
        .where('id', 'in', issueIds)
        .execute();
    }

    // Get simulation if exists
    let simulation = null;
    if (recommendation.simulation_id) {
      simulation = await db
        .selectFrom('simulations')
        .select(['id', 'name', 'status', 'created_at'])
        .where('id', '=', recommendation.simulation_id)
        .executeTakeFirst();
    }

    return {
      ...mapRecommendationFromDb(recommendation),
      issues,
      simulation,
    };
  });

  // ============================================
  // POST /recommendations/:id/simulate - Create simulation from recommendation
  // ============================================
  fastify.post('/recommendations/:id/simulate', async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;
    const { id } = request.params as { id: string };
    const body = CreateSimulationSchema.parse(request.body || {});

    // Get recommendation
    const recommendation = await db
      .selectFrom('ai_recommendations')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!recommendation) {
      return reply.status(404).send({ error: 'Recommendation not found' });
    }

    if (recommendation.simulation_id) {
      return reply.status(400).send({ 
        error: 'Simulation already exists for this recommendation',
        simulationId: recommendation.simulation_id 
      });
    }

    const suggestedSim = recommendation.suggested_simulation_json as any;
    if (!suggestedSim?.overrides || suggestedSim.overrides.length === 0) {
      return reply.status(400).send({ 
        error: 'Recommendation has no simulation configuration' 
      });
    }

    // Create simulation
    const simulationId = `sim_${nanoid(16)}`;
    const now = new Date();

    await db.insertInto('simulations').values({
      id: simulationId,
      tenant_id: tenantId,
      snapshot_id: recommendation.snapshot_id,
      name: body.name || `AI: ${recommendation.title}`,
      description: suggestedSim.description || recommendation.description,
      status: 'draft',
      overrides_json: suggestedSim.overrides as any,
      metadata_json: {
        recommendationId: id,
        createdBy: userId,
        notes: body.notes,
      },
      created_by: userId,
      created_at: now,
      updated_at: now,
    } as any).execute();

    // Update recommendation
    await db
      .updateTable('ai_recommendations')
      .set({
        status: 'simulated',
        simulation_id: simulationId,
        actioned_by: userId,
        actioned_at: now,
        action_notes: body.notes,
        updated_at: now,
      })
      .where('id', '=', id)
      .execute();

    // Queue simulation job
    const queue = fastify.queues['simulation.run'];
    if (queue) {
      await queue.add('simulation.run', {
        tenantId,
        payload: {
          type: 'simulation.run',
          tenantId,
          simulationId,
        },
      });
    }

    return { 
      success: true, 
      simulationId,
      message: 'Simulation created and queued' 
    };
  });

  // ============================================
  // POST /recommendations/:id/apply - Apply recommendation directly
  // ============================================
  fastify.post('/recommendations/:id/apply', async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;
    const { id } = request.params as { id: string };
    const body = ApplyRecommendationSchema.parse(request.body || {});

    // Get recommendation
    const recommendation = await db
      .selectFrom('ai_recommendations')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!recommendation) {
      return reply.status(404).send({ error: 'Recommendation not found' });
    }

    if (recommendation.status === 'applied') {
      return reply.status(400).send({ error: 'Recommendation already applied' });
    }

    // For now, just mark as accepted/applied
    // In a real implementation, this would apply the changes
    const now = new Date();

    await db
      .updateTable('ai_recommendations')
      .set({
        status: 'applied',
        actioned_by: userId,
        actioned_at: now,
        action_notes: body.notes,
        updated_at: now,
      })
      .where('id', '=', id)
      .execute();

    // Update related issues to acknowledged
    const issueIds = (recommendation.issue_ids as string[]) || [];
    if (issueIds.length > 0) {
      await db
        .updateTable('issues')
        .set({
          status: 'acknowledged',
          updated_at: now,
        })
        .where('id', 'in', issueIds)
        .where('tenant_id', '=', tenantId)
        .execute();
    }

    return { 
      success: true, 
      message: 'Recommendation applied',
      issuesUpdated: issueIds.length,
    };
  });

  // ============================================
  // POST /recommendations/:id/dismiss - Dismiss recommendation
  // ============================================
  fastify.post('/recommendations/:id/dismiss', async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;
    const { id } = request.params as { id: string };
    const body = DismissRecommendationSchema.parse(request.body || {});

    // Get recommendation
    const recommendation = await db
      .selectFrom('ai_recommendations')
      .select(['id', 'status'])
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!recommendation) {
      return reply.status(404).send({ error: 'Recommendation not found' });
    }

    if (recommendation.status !== 'pending') {
      return reply.status(400).send({ 
        error: 'Only pending recommendations can be dismissed',
        status: recommendation.status 
      });
    }

    const now = new Date();

    await db
      .updateTable('ai_recommendations')
      .set({
        status: 'dismissed',
        actioned_by: userId,
        actioned_at: now,
        action_notes: body.notes,
        updated_at: now,
      })
      .where('id', '=', id)
      .execute();

    return { success: true, message: 'Recommendation dismissed' };
  });

  // ============================================
  // POST /recommendations/:id/accept - Accept recommendation (no simulation)
  // ============================================
  fastify.post('/recommendations/:id/accept', async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;
    const { id } = request.params as { id: string };
    const { notes } = request.body as { notes?: string } || {};

    const recommendation = await db
      .selectFrom('ai_recommendations')
      .select(['id', 'status'])
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!recommendation) {
      return reply.status(404).send({ error: 'Recommendation not found' });
    }

    const now = new Date();

    await db
      .updateTable('ai_recommendations')
      .set({
        status: 'accepted',
        actioned_by: userId,
        actioned_at: now,
        action_notes: notes,
        updated_at: now,
      })
      .where('id', '=', id)
      .execute();

    return { success: true, message: 'Recommendation accepted' };
  });
};

// Helper to map recommendation from DB
function mapRecommendationFromDb(rec: any) {
  return {
    id: rec.id,
    tenantId: rec.tenant_id,
    snapshotId: rec.snapshot_id,
    runId: rec.run_id,
    issueIds: rec.issue_ids,
    priority: rec.priority,
    title: rec.title,
    description: rec.description,
    estimatedImpact: rec.estimated_impact_json,
    suggestedSimulation: rec.suggested_simulation_json,
    effort: rec.effort,
    reasoning: rec.reasoning,
    status: rec.status,
    simulationId: rec.simulation_id,
    actionedBy: rec.actioned_by,
    actionedAt: rec.actioned_at,
    actionNotes: rec.action_notes,
    createdAt: rec.created_at,
    updatedAt: rec.updated_at,
  };
}

export default recommendationRoutes;
