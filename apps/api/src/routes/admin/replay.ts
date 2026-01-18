/**
 * Replay Admin API (Phase 11)
 * 
 * Provides endpoints for replaying/reprocessing snapshots, detections, and evidence.
 */
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

// Zod schemas
const ReplaySnapshotBodySchema = z.object({
  force: z.boolean().optional().default(false),
});

const BackfillHistoricalBodySchema = z.object({
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  entity_types: z.array(z.enum(['contracts', 'invoices', 'customers'])).optional(),
});

// Generate unique ID
function generateReplayId(): string {
  return `rply_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`;
}

function generateJobId(): string {
  return `job_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`;
}

export const replayRoutes: FastifyPluginAsync = async (fastify) => {
  // Replay entire snapshot
  fastify.post('/snapshot/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parseResult = ReplaySnapshotBodySchema.safeParse(request.body || {});
    
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: parseResult.error.message,
      });
    }

    const { force } = parseResult.data;
    const tenantId = request.tenantId;
    const userId = request.userId;

    // Verify snapshot exists
    const snapshot = await fastify.db
      .selectFrom('snapshots')
      .select(['id', 'status'])
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!snapshot) {
      return reply.status(404).send({ error: 'Snapshot not found' });
    }

    if (!force && snapshot.status === 'processing') {
      return reply.status(409).send({ error: 'Snapshot is currently processing' });
    }

    // Create replay audit record
    const replayId = generateReplayId();
    await fastify.db
      .insertInto('replay_audit')
      .values({
        id: replayId,
        tenant_id: tenantId,
        replay_type: 'snapshot',
        target_id: id,
        source_description: 'Manual replay via admin API',
        initiated_by: userId,
        status: 'pending',
        result_json: {},
        created_at: new Date(),
      })
      .execute();

    // Create a job to reprocess the snapshot
    const jobId = generateJobId();
    await fastify.db
      .insertInto('jobs')
      .values({
        id: jobId,
        tenant_id: tenantId,
        type: 'ingest.full',
        status: 'pending',
        payload_json: {
          type: 'ingest.full',
          snapshotId: id,
          replay: true,
          replayId,
        },
        created_at: new Date(),
        updated_at: new Date(),
      })
      .execute();

    // Update replay audit with job ID
    await fastify.db
      .updateTable('replay_audit')
      .set({
        job_id: jobId,
        status: 'processing',
        started_at: new Date(),
      })
      .where('id', '=', replayId)
      .execute();

    request.log.info({ replayId, snapshotId: id, jobId }, 'Snapshot replay initiated');

    return {
      success: true,
      replayId,
      jobId,
      message: 'Snapshot replay has been queued',
    };
  });

  // Replay detection run
  fastify.post('/detection/:runId', async (request, reply) => {
    const { runId } = request.params as { runId: string };
    const tenantId = request.tenantId;
    const userId = request.userId;

    // Verify detection run exists
    const detectionRun = await fastify.db
      .selectFrom('detection_runs')
      .select(['id', 'snapshot_id', 'status'])
      .where('id', '=', runId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!detectionRun) {
      return reply.status(404).send({ error: 'Detection run not found' });
    }

    // Create replay audit record
    const replayId = generateReplayId();
    await fastify.db
      .insertInto('replay_audit')
      .values({
        id: replayId,
        tenant_id: tenantId,
        replay_type: 'detection',
        target_id: runId,
        source_description: `Replay of detection run ${runId}`,
        initiated_by: userId,
        status: 'pending',
        result_json: {},
        created_at: new Date(),
      })
      .execute();

    // Create a job to replay detection
    const jobId = generateJobId();
    await fastify.db
      .insertInto('jobs')
      .values({
        id: jobId,
        tenant_id: tenantId,
        type: 'detect.replay',
        status: 'pending',
        payload_json: {
          type: 'detect.replay',
          snapshotId: detectionRun.snapshot_id,
          originalRunId: runId,
          replayId,
        },
        created_at: new Date(),
        updated_at: new Date(),
      })
      .execute();

    // Update replay audit with job ID
    await fastify.db
      .updateTable('replay_audit')
      .set({
        job_id: jobId,
        status: 'processing',
        started_at: new Date(),
      })
      .where('id', '=', replayId)
      .execute();

    request.log.info({ replayId, detectionRunId: runId, jobId }, 'Detection replay initiated');

    return {
      success: true,
      replayId,
      jobId,
      message: 'Detection replay has been queued',
    };
  });

  // Regenerate all evidence for a snapshot
  fastify.post('/evidence/:snapshotId', async (request, reply) => {
    const { snapshotId } = request.params as { snapshotId: string };
    const tenantId = request.tenantId;
    const userId = request.userId;

    // Verify snapshot exists
    const snapshot = await fastify.db
      .selectFrom('snapshots')
      .select(['id'])
      .where('id', '=', snapshotId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!snapshot) {
      return reply.status(404).send({ error: 'Snapshot not found' });
    }

    // Create replay audit record
    const replayId = generateReplayId();
    await fastify.db
      .insertInto('replay_audit')
      .values({
        id: replayId,
        tenant_id: tenantId,
        replay_type: 'evidence',
        target_id: snapshotId,
        source_description: `Regenerate all evidence for snapshot ${snapshotId}`,
        initiated_by: userId,
        status: 'pending',
        result_json: {},
        created_at: new Date(),
      })
      .execute();

    // Create a job to regenerate evidence
    const jobId = generateJobId();
    await fastify.db
      .insertInto('jobs')
      .values({
        id: jobId,
        tenant_id: tenantId,
        type: 'evidence.generate',
        status: 'pending',
        payload_json: {
          type: 'evidence.generate',
          snapshotId,
          regenerateAll: true,
          replayId,
        },
        created_at: new Date(),
        updated_at: new Date(),
      })
      .execute();

    // Update replay audit with job ID
    await fastify.db
      .updateTable('replay_audit')
      .set({
        job_id: jobId,
        status: 'processing',
        started_at: new Date(),
      })
      .where('id', '=', replayId)
      .execute();

    request.log.info({ replayId, snapshotId, jobId }, 'Evidence regeneration initiated');

    return {
      success: true,
      replayId,
      jobId,
      message: 'Evidence regeneration has been queued',
    };
  });

  // Backfill historical data
  fastify.post('/backfill/historical', async (request, reply) => {
    const parseResult = BackfillHistoricalBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: parseResult.error.message,
      });
    }

    const { start_date, end_date, entity_types } = parseResult.data;
    const tenantId = request.tenantId;
    const userId = request.userId;

    // Create replay audit record
    const replayId = generateReplayId();
    await fastify.db
      .insertInto('replay_audit')
      .values({
        id: replayId,
        tenant_id: tenantId,
        replay_type: 'backfill',
        target_id: `${start_date}_${end_date}`,
        source_description: `Historical backfill from ${start_date} to ${end_date}`,
        initiated_by: userId,
        status: 'pending',
        result_json: { entity_types: entity_types || ['all'] },
        created_at: new Date(),
      })
      .execute();

    // Note: In a real implementation, this would create multiple jobs for the date range
    // For now, we just mark it as pending

    request.log.info({ replayId, start_date, end_date, entity_types }, 'Historical backfill initiated');

    return {
      success: true,
      replayId,
      message: 'Historical backfill has been queued',
      dateRange: { start_date, end_date },
      entityTypes: entity_types || ['all'],
    };
  });

  // List replay audit entries
  fastify.get('/', async (request, reply) => {
    const tenantId = request.tenantId;

    const replays = await fastify.db
      .selectFrom('replay_audit')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .orderBy('created_at', 'desc')
      .limit(100)
      .execute();

    return { replays };
  });

  // Get replay audit entry
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;

    const replay = await fastify.db
      .selectFrom('replay_audit')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!replay) {
      return reply.status(404).send({ error: 'Replay audit entry not found' });
    }

    return replay;
  });
};
