/**
 * Review Queue Routes
 * 
 * API endpoints for managing the human review queue for
 * low-confidence terms, conflicts, and validation issues.
 */
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createReviewQueueItemId, createTermConflictId } from '@cogtics/schemas';

// ============================================
// Request Schemas
// ============================================

const ListReviewItemsQuerySchema = z.object({
  status: z.enum(['pending', 'in_review', 'resolved', 'skipped', 'escalated']).optional(),
  itemType: z.enum(['low_confidence_term', 'conflict', 'missing_required_term', 'validation_error', 'llm_extraction', 'ocr_required']).optional(),
  contractVersionId: z.string().optional(),
  bundleId: z.string().optional(),
  assignedTo: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

const ResolveReviewItemSchema = z.object({
  resolution: z.object({
    action: z.enum(['accept', 'reject', 'modify']),
    newValue: z.unknown().optional(),
    reason: z.string().optional(),
  }),
  // Optimistic locking: if provided, the update will only succeed if updated_at matches
  expectedUpdatedAt: z.string().datetime().optional(),
});

const AssignReviewItemSchema = z.object({
  userId: z.string().nullable(),
});

const CreateConflictSchema = z.object({
  bundleId: z.string().optional(),
  contractVersionId: z.string().optional(),
  termType: z.string(),
  termIds: z.array(z.string()).min(2),
});

const ResolveConflictSchema = z.object({
  winningTermId: z.string(),
  reason: z.string().optional(),
  // Optimistic locking: if provided, the update will only succeed if updated_at matches
  expectedUpdatedAt: z.string().datetime().optional(),
});

// ============================================
// Review Queue Routes
// ============================================

export const reviewRoutes: FastifyPluginAsync = async (fastify) => {
  // ============================================
  // List Review Queue Items
  // ============================================
  fastify.get('/review', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const query = ListReviewItemsQuerySchema.parse(request.query);

      let builder = fastify.db
        .selectFrom('review_queue')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .orderBy('priority', 'desc')
        .orderBy('created_at', 'asc')
        .limit(query.limit)
        .offset(query.offset);

      if (query.status) {
        builder = builder.where('status', '=', query.status);
      }
      if (query.itemType) {
        builder = builder.where('item_type', '=', query.itemType);
      }
      if (query.contractVersionId) {
        builder = builder.where('contract_version_id', '=', query.contractVersionId);
      }
      if (query.bundleId) {
        builder = builder.where('bundle_id', '=', query.bundleId);
      }
      if (query.assignedTo) {
        builder = builder.where('assigned_to', '=', query.assignedTo);
      }

      const items = await builder.execute();

      // Get counts by status
      const counts = await fastify.db
        .selectFrom('review_queue')
        .select([
          'status',
          fastify.db.fn.count<string>('id').as('count'),
        ])
        .where('tenant_id', '=', tenantId)
        .groupBy('status')
        .execute();

      const countsByStatus = Object.fromEntries(
        counts.map(c => [c.status, parseInt(c.count)])
      );

      return {
        items: items.map(formatReviewItem),
        total: items.length,
        counts: countsByStatus,
        pagination: {
          limit: query.limit,
          offset: query.offset,
        },
      };
    },
  });

  // ============================================
  // Get Single Review Item
  // ============================================
  fastify.get<{ Params: { id: string } }>('/review/:id', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { id } = request.params;

      const item = await fastify.db
        .selectFrom('review_queue')
        .selectAll()
        .where('id', '=', id)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!item) {
        return reply.status(404).send({ error: 'Review item not found' });
      }

      // Get related data based on item type
      let relatedData: Record<string, unknown> = {};

      if (item.term_id) {
        const term = await fastify.db
          .selectFrom('contract_terms')
          .selectAll()
          .where('id', '=', item.term_id)
          .executeTakeFirst();
        relatedData.term = term;
      }

      if (item.conflict_id) {
        const conflict = await fastify.db
          .selectFrom('term_conflicts')
          .selectAll()
          .where('id', '=', item.conflict_id)
          .executeTakeFirst();
        
        if (conflict) {
          const candidates = await fastify.db
            .selectFrom('term_conflict_candidates')
            .innerJoin('contract_terms', 'contract_terms.id', 'term_conflict_candidates.term_id')
            .selectAll('term_conflict_candidates')
            .select(['contract_terms.term_type', 'contract_terms.value_json', 'contract_terms.matched_text'])
            .where('conflict_id', '=', conflict.id)
            .execute();
          
          relatedData.conflict = conflict;
          relatedData.conflictCandidates = candidates;
        }
      }

      if (item.document_id) {
        const document = await fastify.db
          .selectFrom('contract_documents')
          .select(['id', 'file_name', 'document_type', 'status'])
          .where('id', '=', item.document_id)
          .executeTakeFirst();
        relatedData.document = document;
      }

      return {
        ...formatReviewItem(item),
        ...relatedData,
      };
    },
  });

  // ============================================
  // Assign Review Item
  // ============================================
  fastify.patch<{ Params: { id: string } }>('/review/:id/assign', {
    handler: async (request, reply) => {
      const { tenantId, userId } = request.auth!;
      const { id } = request.params;
      const body = AssignReviewItemSchema.parse(request.body);

      const item = await fastify.db
        .selectFrom('review_queue')
        .select(['id', 'status'])
        .where('id', '=', id)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!item) {
        return reply.status(404).send({ error: 'Review item not found' });
      }

      await fastify.db
        .updateTable('review_queue')
        .set({
          assigned_to: body.userId,
          status: body.userId ? 'in_review' : 'pending',
        })
        .where('id', '=', id)
        .execute();

      return { success: true, assignedTo: body.userId };
    },
  });

  // ============================================
  // Resolve Review Item
  // ============================================
  fastify.post<{ Params: { id: string } }>('/review/:id/resolve', {
    handler: async (request, reply) => {
      const { tenantId, userId } = request.auth!;
      const { id } = request.params;
      const body = ResolveReviewItemSchema.parse(request.body);

      const item = await fastify.db
        .selectFrom('review_queue')
        .selectAll()
        .where('id', '=', id)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!item) {
        return reply.status(404).send({ error: 'Review item not found' });
      }

      // Check for already resolved
      if (item.status === 'resolved') {
        return reply.status(409).send({ 
          error: 'Review item already resolved',
          resolvedBy: item.resolved_by,
          resolvedAt: item.resolved_at,
        });
      }

      // Optimistic locking: verify no concurrent modification
      if (body.expectedUpdatedAt && item.updated_at) {
        const expectedTime = new Date(body.expectedUpdatedAt).getTime();
        const actualTime = new Date(item.updated_at).getTime();
        if (expectedTime !== actualTime) {
          return reply.status(409).send({
            error: 'Review item was modified by another user',
            message: 'The item has been updated since you loaded it. Please refresh and try again.',
            currentUpdatedAt: item.updated_at,
          });
        }
      }

      // Handle resolution based on action
      if (body.resolution.action === 'modify' && item.term_id && body.resolution.newValue !== undefined) {
        // Update the term value
        await fastify.db
          .updateTable('contract_terms')
          .set({
            value_json: body.resolution.newValue,
            is_overridden: true,
          })
          .where('id', '=', item.term_id)
          .execute();
      }

      // Mark review item as resolved
      await fastify.db
        .updateTable('review_queue')
        .set({
          status: 'resolved',
          resolution_json: body.resolution,
          resolved_by: userId,
          resolved_at: new Date(),
        })
        .where('id', '=', id)
        .execute();

      return { success: true };
    },
  });

  // ============================================
  // Skip Review Item
  // ============================================
  fastify.post<{ Params: { id: string } }>('/review/:id/skip', {
    handler: async (request, reply) => {
      const { tenantId, userId } = request.auth!;
      const { id } = request.params;

      const result = await fastify.db
        .updateTable('review_queue')
        .set({
          status: 'skipped',
          resolved_by: userId,
          resolved_at: new Date(),
        })
        .where('id', '=', id)
        .where('tenant_id', '=', tenantId)
        .execute();

      if (result.length === 0) {
        return reply.status(404).send({ error: 'Review item not found' });
      }

      return { success: true };
    },
  });

  // ============================================
  // Escalate Review Item
  // ============================================
  fastify.post<{ Params: { id: string } }>('/review/:id/escalate', {
    handler: async (request, reply) => {
      const { tenantId, userId } = request.auth!;
      const { id } = request.params;

      const result = await fastify.db
        .updateTable('review_queue')
        .set({
          status: 'escalated',
          priority: fastify.db.raw('priority + 1'),
        })
        .where('id', '=', id)
        .where('tenant_id', '=', tenantId)
        .execute();

      if (result.length === 0) {
        return reply.status(404).send({ error: 'Review item not found' });
      }

      return { success: true };
    },
  });

  // ============================================
  // List Term Conflicts
  // ============================================
  fastify.get('/conflicts', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const query = ListReviewItemsQuerySchema.parse(request.query);

      const conflicts = await fastify.db
        .selectFrom('term_conflicts')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .orderBy('created_at', 'desc')
        .limit(query.limit)
        .offset(query.offset)
        .execute();

      return {
        conflicts: conflicts.map(c => ({
          id: c.id,
          bundleId: c.bundle_id,
          contractVersionId: c.contract_version_id,
          termType: c.term_type,
          status: c.status,
          resolutionMethod: c.resolution_method,
          resolvedTermId: c.resolved_term_id,
          resolvedBy: c.resolved_by,
          resolvedAt: c.resolved_at,
          createdAt: c.created_at,
        })),
        total: conflicts.length,
      };
    },
  });

  // ============================================
  // Get Single Conflict with Candidates
  // ============================================
  fastify.get<{ Params: { id: string } }>('/conflicts/:id', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { id } = request.params;

      const conflict = await fastify.db
        .selectFrom('term_conflicts')
        .selectAll()
        .where('id', '=', id)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!conflict) {
        return reply.status(404).send({ error: 'Conflict not found' });
      }

      const candidates = await fastify.db
        .selectFrom('term_conflict_candidates')
        .innerJoin('contract_terms', 'contract_terms.id', 'term_conflict_candidates.term_id')
        .leftJoin('contract_documents', 'contract_documents.id', 'term_conflict_candidates.document_id')
        .select([
          'term_conflict_candidates.id',
          'term_conflict_candidates.term_id',
          'term_conflict_candidates.document_id',
          'term_conflict_candidates.precedence_score',
          'term_conflict_candidates.is_winning_term',
          'term_conflict_candidates.evidence_json',
          'contract_terms.term_type',
          'contract_terms.value_json',
          'contract_terms.confidence',
          'contract_terms.matched_text',
          'contract_documents.file_name',
          'contract_documents.document_type',
        ])
        .where('conflict_id', '=', id)
        .orderBy('precedence_score', 'desc')
        .execute();

      return {
        id: conflict.id,
        bundleId: conflict.bundle_id,
        contractVersionId: conflict.contract_version_id,
        termType: conflict.term_type,
        status: conflict.status,
        resolutionMethod: conflict.resolution_method,
        resolvedTermId: conflict.resolved_term_id,
        appliedRules: conflict.applied_precedence_rules,
        resolutionReason: conflict.resolution_reason,
        resolvedBy: conflict.resolved_by,
        resolvedAt: conflict.resolved_at,
        createdAt: conflict.created_at,
        candidates: candidates.map(c => ({
          id: c.id,
          termId: c.term_id,
          documentId: c.document_id,
          documentName: c.file_name,
          documentType: c.document_type,
          precedenceScore: c.precedence_score,
          isWinningTerm: c.is_winning_term,
          evidence: c.evidence_json,
          termType: c.term_type,
          value: c.value_json,
          confidence: c.confidence,
          matchedText: c.matched_text,
        })),
      };
    },
  });

  // ============================================
  // Resolve Conflict
  // ============================================
  fastify.post<{ Params: { id: string } }>('/conflicts/:id/resolve', {
    handler: async (request, reply) => {
      const { tenantId, userId } = request.auth!;
      const { id } = request.params;
      const body = ResolveConflictSchema.parse(request.body);

      const conflict = await fastify.db
        .selectFrom('term_conflicts')
        .select(['id', 'status', 'updated_at'])
        .where('id', '=', id)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!conflict) {
        return reply.status(404).send({ error: 'Conflict not found' });
      }

      // Check for already resolved
      if (conflict.status !== 'pending' && conflict.status !== 'in_progress') {
        return reply.status(409).send({ 
          error: 'Conflict already resolved',
          currentStatus: conflict.status,
        });
      }

      // Optimistic locking: verify no concurrent modification
      if (body.expectedUpdatedAt && conflict.updated_at) {
        const expectedTime = new Date(body.expectedUpdatedAt).getTime();
        const actualTime = new Date(conflict.updated_at).getTime();
        if (expectedTime !== actualTime) {
          return reply.status(409).send({
            error: 'Conflict was modified by another user',
            message: 'The conflict has been updated since you loaded it. Please refresh and try again.',
            currentUpdatedAt: conflict.updated_at,
          });
        }
      }

      // Verify the winning term is a valid candidate
      const candidate = await fastify.db
        .selectFrom('term_conflict_candidates')
        .select(['id'])
        .where('conflict_id', '=', id)
        .where('term_id', '=', body.winningTermId)
        .executeTakeFirst();

      if (!candidate) {
        return reply.status(400).send({ error: 'Invalid winning term - not a conflict candidate' });
      }

      // Update conflict as resolved
      await fastify.db
        .updateTable('term_conflicts')
        .set({
          status: 'human_resolved',
          resolution_method: 'human_review',
          resolved_term_id: body.winningTermId,
          resolution_reason: body.reason || null,
          resolved_by: userId,
          resolved_at: new Date(),
        })
        .where('id', '=', id)
        .execute();

      // Mark winning candidate
      await fastify.db
        .updateTable('term_conflict_candidates')
        .set({ is_winning_term: false })
        .where('conflict_id', '=', id)
        .execute();

      await fastify.db
        .updateTable('term_conflict_candidates')
        .set({ is_winning_term: true })
        .where('conflict_id', '=', id)
        .where('term_id', '=', body.winningTermId)
        .execute();

      // Mark any related review queue items as resolved
      await fastify.db
        .updateTable('review_queue')
        .set({
          status: 'resolved',
          resolved_by: userId,
          resolved_at: new Date(),
        })
        .where('conflict_id', '=', id)
        .where('tenant_id', '=', tenantId)
        .execute();

      return { success: true };
    },
  });

  // ============================================
  // Get Review Queue Stats
  // ============================================
  fastify.get('/review/stats', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;

      const stats = await fastify.db
        .selectFrom('review_queue')
        .select([
          'status',
          'item_type',
          fastify.db.fn.count<string>('id').as('count'),
        ])
        .where('tenant_id', '=', tenantId)
        .groupBy(['status', 'item_type'])
        .execute();

      // Group by status
      const byStatus: Record<string, number> = {};
      const byType: Record<string, number> = {};

      for (const row of stats) {
        const count = parseInt(row.count);
        byStatus[row.status] = (byStatus[row.status] || 0) + count;
        byType[row.item_type] = (byType[row.item_type] || 0) + count;
      }

      // Get pending conflicts count
      const conflictStats = await fastify.db
        .selectFrom('term_conflicts')
        .select([
          'status',
          fastify.db.fn.count<string>('id').as('count'),
        ])
        .where('tenant_id', '=', tenantId)
        .groupBy('status')
        .execute();

      const conflictsByStatus = Object.fromEntries(
        conflictStats.map(c => [c.status, parseInt(c.count)])
      );

      return {
        reviewQueue: {
          byStatus,
          byType,
          total: Object.values(byStatus).reduce((a, b) => a + b, 0),
        },
        conflicts: conflictsByStatus,
      };
    },
  });
};

// ============================================
// Helper Functions
// ============================================

function formatReviewItem(item: Record<string, unknown>) {
  return {
    id: item.id,
    itemType: item.item_type,
    termId: item.term_id,
    conflictId: item.conflict_id,
    documentId: item.document_id,
    contractVersionId: item.contract_version_id,
    bundleId: item.bundle_id,
    priority: item.priority,
    status: item.status,
    assignedTo: item.assigned_to,
    resolution: item.resolution_json,
    resolvedBy: item.resolved_by,
    createdAt: item.created_at,
    resolvedAt: item.resolved_at,
  };
}
