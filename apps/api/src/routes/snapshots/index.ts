/**
 * Snapshot Routes
 * 
 * API endpoints for managing data snapshots.
 */
import { FastifyPluginAsync } from 'fastify';
import { sql } from '@cogtics/db';
import {
  createSnapshotId,
  createJobId,
  SnapshotStatusSchema,
} from '@cogtics/schemas';

export const snapshotRoutes: FastifyPluginAsync = async (fastify) => {
  // Authentication is handled globally by the auth plugin

  // ============================================
  // List snapshots
  // ============================================
  fastify.get('/', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const queryParams = request.query as { limit?: string; offset?: string; status?: string };
      const limit = Math.min(Math.max(1, parseInt(queryParams.limit ?? '20', 10) || 20), 100);
      const offset = Math.max(0, parseInt(queryParams.offset ?? '0', 10) || 0);
      const status = queryParams.status;

      let query = fastify.db
        .selectFrom('snapshots')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .orderBy('started_at', 'desc')
        .limit(limit)
        .offset(offset);

      if (status) {
        const validStatus = SnapshotStatusSchema.safeParse(status);
        if (validStatus.success) {
          query = query.where('status', '=', validStatus.data);
        }
      }

      const snapshots = await query.execute();

      // Get total count
      const countResult = await fastify.db
        .selectFrom('snapshots')
        .select(sql<number>`count(*)`.as('count'))
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      return reply.send({
        snapshots: snapshots.map(mapSnapshotToResponse),
        total: Number(countResult?.count ?? 0),
      });
    },
  });

  // ============================================
  // Get snapshot detail
  // ============================================
  fastify.get<{ Params: { snapshotId: string } }>('/:snapshotId', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { snapshotId } = request.params;

      const snapshot = await fastify.db
        .selectFrom('snapshots')
        .selectAll()
        .where('id', '=', snapshotId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!snapshot) {
        throw fastify.httpErrors.notFound('Snapshot not found');
      }

      // Get sync runs for this snapshot
      const syncRuns = await fastify.db
        .selectFrom('sync_runs')
        .selectAll()
        .where('snapshot_id', '=', snapshotId)
        .orderBy('started_at', 'desc')
        .execute();

      return reply.send({
        ...mapSnapshotToResponse(snapshot),
        syncRuns: syncRuns.map((run) => ({
          id: run.id,
          tenantId: run.tenant_id,
          snapshotId: run.snapshot_id,
          runType: run.run_type,
          status: run.status,
          startedAt: run.started_at.toISOString(),
          finishedAt: run.finished_at?.toISOString() ?? null,
          recordsProcessed: run.records_processed,
          errorCode: run.error_code,
          errorMessage: run.error_message,
          metadata: run.metadata_json as Record<string, unknown>,
        })),
      });
    },
  });

  // ============================================
  // Trigger new snapshot
  // ============================================
  fastify.post('/trigger', {
    preHandler: [fastify.requirePermission('data.manage')],
    handler: async (request, reply) => {
      const { tenantId, userId } = request.auth!;
      const { connectionIds, runType } = request.body as { connectionIds?: string[]; runType: string };

      // Create new snapshot
      const snapshotId = createSnapshotId();
      await fastify.db
        .insertInto('snapshots')
        .values({
          id: snapshotId as string,
          tenant_id: tenantId,
          status: 'pending',
          metadata_json: {
            triggeredBy: userId,
            connectionIds,
            runType,
          },
        })
        .execute();

      // Enqueue full ingestion job
      const jobId = createJobId();
      await fastify.queues['ingest.full'].add('ingest.full', {
        type: 'ingest.full',
        tenantId,
        snapshotId: snapshotId as string,
        connectionIds,
        runType,
      }, {
        jobId,
      });

      await request.audit.log({
        action: 'snapshot.trigger' as any,
        resource: `snapshots/${snapshotId}`,
        metadata: { connectionIds, runType },
      });

      return reply.status(202).send({
        snapshotId: snapshotId as string,
        status: 'pending',
      });
    },
  });

  // ============================================
  // Get latest complete snapshot
  // ============================================
  fastify.get('/latest', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;

      const snapshot = await fastify.db
        .selectFrom('snapshots')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('status', '=', 'complete')
        .orderBy('completed_at', 'desc')
        .executeTakeFirst();

      if (!snapshot) {
        throw fastify.httpErrors.notFound('No complete snapshot found');
      }

      return reply.send(mapSnapshotToResponse(snapshot));
    },
  });

  // ============================================
  // Get sync runs for snapshot
  // ============================================
  fastify.get<{ Params: { snapshotId: string } }>('/:snapshotId/runs', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { snapshotId } = request.params;

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

      const runs = await fastify.db
        .selectFrom('sync_runs')
        .selectAll()
        .where('snapshot_id', '=', snapshotId)
        .orderBy('started_at', 'desc')
        .execute();

      return reply.send({
        runs: runs.map((run) => ({
          id: run.id,
          tenantId: run.tenant_id,
          snapshotId: run.snapshot_id,
          runType: run.run_type,
          status: run.status,
          startedAt: run.started_at.toISOString(),
          finishedAt: run.finished_at?.toISOString() ?? null,
          recordsProcessed: run.records_processed,
          errorCode: run.error_code,
          errorMessage: run.error_message,
          metadata: run.metadata_json as Record<string, unknown>,
        })),
        total: runs.length,
      });
    },
  });
};

// ============================================
// Helper functions
// ============================================

function mapSnapshotToResponse(snapshot: any) {
  return {
    id: snapshot.id,
    tenantId: snapshot.tenant_id,
    sourceRunId: snapshot.source_run_id,
    status: snapshot.status,
    startedAt: snapshot.started_at.toISOString(),
    completedAt: snapshot.completed_at?.toISOString() ?? null,
    metadata: snapshot.metadata_json,
    recordCounts: snapshot.record_counts,
    qualityResults: Array.isArray(snapshot.quality_results) ? snapshot.quality_results : [],
    createdAt: snapshot.created_at.toISOString(),
  };
}

