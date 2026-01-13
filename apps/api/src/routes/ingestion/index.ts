/**
 * Ingestion Pipeline Routes
 * 
 * API endpoints for monitoring ingestion pipeline status and progress.
 */
import { FastifyPluginAsync } from 'fastify';
import { sql } from '@cogtics/db';

export const ingestionRoutes: FastifyPluginAsync = async (fastify) => {
  // ============================================
  // Get Ingestion Status for a Snapshot
  // ============================================
  fastify.get<{ Params: { snapshotId: string } }>('/status/:snapshotId', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { snapshotId } = request.params;

      // Get snapshot
      const snapshot = await fastify.db
        .selectFrom('snapshots')
        .selectAll()
        .where('id', '=', snapshotId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!snapshot) {
        throw fastify.httpErrors.notFound('Snapshot not found');
      }

      // Get all sync runs for this snapshot
      const runs = await fastify.db
        .selectFrom('sync_runs')
        .selectAll()
        .where('snapshot_id', '=', snapshotId)
        .orderBy('started_at', 'asc')
        .execute();

      // Determine current stage based on runs
      const stages = ['load', 'normalize', 'upsert', 'finalize'] as const;
      let currentStage: string = 'pending';
      let currentStageProgress = 0;

      for (const stage of stages) {
        const stageRun = runs.find((r) => r.run_type === stage);
        if (!stageRun) {
          currentStage = stage;
          break;
        }
        if (stageRun.status === 'running') {
          currentStage = stage;
          currentStageProgress = 50; // Approximate
          break;
        }
        if (stageRun.status === 'failed') {
          currentStage = stage;
          currentStageProgress = 0;
          break;
        }
        if (stageRun.status === 'completed') {
          currentStageProgress = 100;
        }
      }

      // Calculate overall progress
      const stageWeights: Record<string, number> = {
        load: 0.2,
        normalize: 0.3,
        upsert: 0.4,
        finalize: 0.1,
      };

      let overallProgress = 0;
      for (const stage of stages) {
        const stageRun = runs.find((r) => r.run_type === stage);
        if (stageRun?.status === 'completed') {
          overallProgress += stageWeights[stage] * 100;
        } else if (stageRun?.status === 'running') {
          overallProgress += stageWeights[stage] * 50;
        }
      }

      // Get staging record counts
      const stagingStats = await fastify.db
        .selectFrom('staging_records')
        .select([
          'status',
          sql<number>`count(*)`.as('count'),
        ])
        .where('snapshot_id', '=', snapshotId)
        .groupBy('status')
        .execute();

      const stagingCounts: Record<string, number> = {};
      for (const stat of stagingStats) {
        stagingCounts[stat.status] = Number(stat.count);
      }

      return reply.send({
        snapshotId,
        snapshotStatus: snapshot.status,
        currentStage,
        currentStageProgress,
        overallProgress: Math.round(overallProgress),
        stages: stages.map((stage) => {
          const run = runs.find((r) => r.run_type === stage);
          return {
            name: stage,
            status: run?.status ?? 'pending',
            recordsProcessed: run?.records_processed ?? 0,
            startedAt: run?.started_at?.toISOString() ?? null,
            finishedAt: run?.finished_at?.toISOString() ?? null,
            errorMessage: run?.error_message ?? null,
          };
        }),
        staging: {
          pending: stagingCounts['pending'] ?? 0,
          normalized: stagingCounts['normalized'] ?? 0,
          failed: stagingCounts['failed'] ?? 0,
          skipped: stagingCounts['skipped'] ?? 0,
          total: Object.values(stagingCounts).reduce((a, b) => a + b, 0),
        },
        startedAt: snapshot.started_at.toISOString(),
        completedAt: snapshot.completed_at?.toISOString() ?? null,
      });
    },
  });

  // ============================================
  // Get All Sync Runs for a Snapshot
  // ============================================
  fastify.get<{ Params: { snapshotId: string } }>('/runs/:snapshotId', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { snapshotId } = request.params;

      // Verify snapshot access
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
          snapshotId: run.snapshot_id,
          runType: run.run_type,
          status: run.status,
          recordsProcessed: run.records_processed,
          startedAt: run.started_at.toISOString(),
          finishedAt: run.finished_at?.toISOString() ?? null,
          errorCode: run.error_code,
          errorMessage: run.error_message,
          metadata: run.metadata_json,
        })),
        total: runs.length,
      });
    },
  });

  // ============================================
  // Get Staging Record Stats
  // ============================================
  fastify.get<{ Params: { snapshotId: string } }>('/staging/:snapshotId/stats', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { snapshotId } = request.params;

      // Verify snapshot access
      const snapshot = await fastify.db
        .selectFrom('snapshots')
        .select('id')
        .where('id', '=', snapshotId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!snapshot) {
        throw fastify.httpErrors.notFound('Snapshot not found');
      }

      // Get counts by status and object type
      const byStatus = await fastify.db
        .selectFrom('staging_records')
        .select([
          'status',
          sql<number>`count(*)`.as('count'),
        ])
        .where('snapshot_id', '=', snapshotId)
        .groupBy('status')
        .execute();

      const byObjectType = await fastify.db
        .selectFrom('staging_records')
        .select([
          'object_type',
          sql<number>`count(*)`.as('count'),
        ])
        .where('snapshot_id', '=', snapshotId)
        .groupBy('object_type')
        .execute();

      // Get failed records sample
      const failedSample = await fastify.db
        .selectFrom('staging_records')
        .select(['id', 'object_type', 'external_id', 'error_message'])
        .where('snapshot_id', '=', snapshotId)
        .where('status', '=', 'failed')
        .limit(10)
        .execute();

      return reply.send({
        snapshotId,
        byStatus: Object.fromEntries(byStatus.map((s) => [s.status, Number(s.count)])),
        byObjectType: Object.fromEntries(byObjectType.map((s) => [s.object_type, Number(s.count)])),
        failedSample: failedSample.map((r) => ({
          id: r.id,
          objectType: r.object_type,
          externalId: r.external_id,
          errorMessage: r.error_message,
        })),
      });
    },
  });

  // ============================================
  // Get Active Ingestion Jobs
  // ============================================
  fastify.get('/active', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;

      // Get all building/pending snapshots
      const activeSnapshots = await fastify.db
        .selectFrom('snapshots')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('status', 'in', ['pending', 'building', 'validating'])
        .orderBy('started_at', 'desc')
        .execute();

      // Get running sync runs
      const runningRuns = await fastify.db
        .selectFrom('sync_runs')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('status', '=', 'running')
        .orderBy('started_at', 'desc')
        .execute();

      return reply.send({
        activeSnapshots: activeSnapshots.map((s) => ({
          id: s.id,
          status: s.status,
          startedAt: s.started_at.toISOString(),
          recordCounts: s.record_counts,
        })),
        runningRuns: runningRuns.map((r) => ({
          id: r.id,
          snapshotId: r.snapshot_id,
          runType: r.run_type,
          recordsProcessed: r.records_processed,
          startedAt: r.started_at.toISOString(),
        })),
      });
    },
  });
};
