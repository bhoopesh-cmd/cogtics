import type { FastifyPluginAsync } from 'fastify';
import { Queue } from 'bullmq';
import {
  CreateExportRequestSchema,
  ExportListQuerySchema,
  createExportId,
  createExportAuditId,
  createJobId,
} from '@cogtics/schemas';

const SIGNED_URL_TTL = 5 * 60; // 5 minutes

// Shared queue instances (created once per server lifecycle)
let exportCsvQueue: Queue | null = null;
let exportPdfQueue: Queue | null = null;

const exportRoutes: FastifyPluginAsync = async (fastify) => {
  const redis = fastify.redis;
  
  // Reuse queue instances if already created
  if (!exportCsvQueue) {
    exportCsvQueue = new Queue('export.csv.generate', { connection: redis });
  }
  if (!exportPdfQueue) {
    exportPdfQueue = new Queue('export.pdf.render', { connection: redis });
  }

  /**
   * POST /exports - Request a new export
   */
  fastify.post('/', async (request, reply) => {
    const { tenantId, userId } = request;
    const body = CreateExportRequestSchema.parse(request.body);

    // Verify snapshot exists
    const snapshot = await fastify.db
      .selectFrom('snapshots')
      .select(['id', 'status'])
      .where('id', '=', body.snapshotId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!snapshot) {
      return reply.status(404).send({ error: 'Snapshot not found' });
    }

    // Determine format from export type
    const format = body.exportType.endsWith('_csv') ? 'csv' : 'pdf';

    // Create export record
    const exportId = createExportId();
    await fastify.db
      .insertInto('exports')
      .values({
        id: exportId,
        tenant_id: tenantId,
        snapshot_id: body.snapshotId,
        export_type: body.exportType,
        format,
        status: 'pending',
        requested_by: userId ?? null,
        options_json: body.options ?? {},
        created_at: new Date(),
      })
      .execute();

    // Log audit event
    await fastify.db
      .insertInto('export_audit')
      .values({
        id: createExportAuditId(),
        tenant_id: tenantId,
        export_id: exportId,
        action: 'requested',
        actor_user_id: userId ?? null,
        details_json: { exportType: body.exportType, snapshotId: body.snapshotId },
        created_at: new Date(),
      })
      .execute();

    // Create job record
    const jobId = createJobId();
    const jobType = format === 'csv' ? 'export.csv.generate' : 'export.pdf.render';
    const templateName = getTemplateName(body.exportType);

    await fastify.db
      .insertInto('jobs')
      .values({
        id: jobId,
        tenant_id: tenantId,
        type: 'export',
        status: 'pending',
        payload_json: {
          type: jobType,
          tenantId,
          exportId,
          snapshotId: body.snapshotId,
          exportType: body.exportType,
          templateName,
          options: body.options,
        },
        created_at: new Date(),
        updated_at: new Date(),
      })
      .execute();

    // Enqueue job
    const queue = format === 'csv' ? exportCsvQueue : exportPdfQueue;
    await queue.add(jobType, {
      jobId,
      tenantId,
      payload: {
        type: jobType,
        tenantId,
        exportId,
        snapshotId: body.snapshotId,
        exportType: body.exportType,
        templateName,
        options: body.options,
      },
    });

    request.log.info({ exportId, jobId, exportType: body.exportType }, 'Export requested');

    return reply.status(201).send({
      export: {
        id: exportId,
        tenantId,
        snapshotId: body.snapshotId,
        exportType: body.exportType,
        format,
        status: 'pending',
        requestedBy: userId,
        createdAt: new Date().toISOString(),
        completedAt: null,
      },
      jobId,
    });
  });

  /**
   * GET /exports - List exports
   */
  fastify.get('/', async (request, reply) => {
    const { tenantId } = request;
    const query = ExportListQuerySchema.parse(request.query);

    let dbQuery = fastify.db
      .selectFrom('exports')
      .selectAll()
      .where('tenant_id', '=', tenantId);

    if (query.snapshotId) {
      dbQuery = dbQuery.where('snapshot_id', '=', query.snapshotId);
    }
    if (query.exportType) {
      dbQuery = dbQuery.where('export_type', '=', query.exportType);
    }
    if (query.status) {
      dbQuery = dbQuery.where('status', '=', query.status);
    }

    const [exports, countResult] = await Promise.all([
      dbQuery
        .orderBy('created_at', 'desc')
        .limit(query.limit)
        .offset(query.offset)
        .execute(),
      fastify.db
        .selectFrom('exports')
        .select(fastify.db.fn.count('id').as('count'))
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst(),
    ]);

    return reply.send({
      exports: exports.map(e => ({
        id: e.id,
        tenantId: e.tenant_id,
        snapshotId: e.snapshot_id,
        exportType: e.export_type,
        format: e.format,
        status: e.status,
        requestedBy: e.requested_by,
        options: e.options_json,
        errorCode: e.error_code,
        errorMessage: e.error_message,
        createdAt: e.created_at.toISOString(),
        completedAt: e.completed_at?.toISOString() ?? null,
      })),
      total: Number(countResult?.count ?? 0),
      limit: query.limit,
      offset: query.offset,
    });
  });

  /**
   * GET /exports/:id - Get export details with files
   */
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { tenantId } = request;
    const { id } = request.params;

    const exportRecord = await fastify.db
      .selectFrom('exports')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!exportRecord) {
      return reply.status(404).send({ error: 'Export not found' });
    }

    const files = await fastify.db
      .selectFrom('export_files')
      .selectAll()
      .where('export_id', '=', id)
      .where('tenant_id', '=', tenantId)
      .execute();

    return reply.send({
      export: {
        id: exportRecord.id,
        tenantId: exportRecord.tenant_id,
        snapshotId: exportRecord.snapshot_id,
        exportType: exportRecord.export_type,
        format: exportRecord.format,
        status: exportRecord.status,
        requestedBy: exportRecord.requested_by,
        options: exportRecord.options_json,
        errorCode: exportRecord.error_code,
        errorMessage: exportRecord.error_message,
        createdAt: exportRecord.created_at.toISOString(),
        completedAt: exportRecord.completed_at?.toISOString() ?? null,
      },
      files: files.map(f => ({
        id: f.id,
        exportId: f.export_id,
        s3Key: f.s3_key,
        fileName: f.file_name,
        contentType: f.content_type,
        sizeBytes: f.size_bytes,
        checksumSha256: f.checksum_sha256,
        createdAt: f.created_at.toISOString(),
      })),
    });
  });

  /**
   * GET /exports/:id/download - Get signed download URL
   */
  fastify.get<{ Params: { id: string }; Querystring: { fileId?: string } }>('/:id/download', async (request, reply) => {
    const { tenantId, userId } = request;
    const { id } = request.params;
    const { fileId } = request.query;

    // Verify export exists and is completed
    const exportRecord = await fastify.db
      .selectFrom('exports')
      .select(['id', 'status'])
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!exportRecord) {
      return reply.status(404).send({ error: 'Export not found' });
    }

    if (exportRecord.status !== 'completed') {
      return reply.status(400).send({ error: 'Export not completed' });
    }

    // Get file (or first file if not specified)
    let fileQuery = fastify.db
      .selectFrom('export_files')
      .selectAll()
      .where('export_id', '=', id)
      .where('tenant_id', '=', tenantId);

    if (fileId) {
      fileQuery = fileQuery.where('id', '=', fileId);
    }

    const file = await fileQuery.executeTakeFirst();

    if (!file) {
      return reply.status(404).send({ error: 'Export file not found' });
    }

    // Generate signed URL
    const downloadUrl = await fastify.storage.getPresignedGetUrl(file.s3_key, SIGNED_URL_TTL);
    const expiresAt = new Date(Date.now() + SIGNED_URL_TTL * 1000);

    // Log audit event
    await fastify.db
      .insertInto('export_audit')
      .values({
        id: createExportAuditId(),
        tenant_id: tenantId,
        export_id: id,
        action: 'downloaded',
        actor_user_id: userId ?? null,
        details_json: { fileId: file.id, fileName: file.file_name },
        created_at: new Date(),
      })
      .execute();

    return reply.send({
      downloadUrl,
      expiresAt: expiresAt.toISOString(),
      fileName: file.file_name,
      contentType: file.content_type,
      sizeBytes: file.size_bytes,
    });
  });

  /**
   * POST /exports/:id/regenerate - Regenerate an export
   */
  fastify.post<{ Params: { id: string } }>('/:id/regenerate', async (request, reply) => {
    const { tenantId, userId } = request;
    const { id } = request.params;

    const exportRecord = await fastify.db
      .selectFrom('exports')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!exportRecord) {
      return reply.status(404).send({ error: 'Export not found' });
    }

    if (exportRecord.status === 'processing') {
      return reply.status(409).send({ error: 'Export is already processing' });
    }

    if (exportRecord.processing_lock && new Date(exportRecord.processing_lock).getTime() > Date.now() - 60000) {
      return reply.status(423).send({ error: 'Export is locked for processing' });
    }

    // Reset status to pending
    await fastify.db
      .updateTable('exports')
      .set({
        status: 'pending',
        error_code: null,
        error_message: null,
        completed_at: null,
      })
      .where('id', '=', id)
      .execute();

    // Log audit event
    await fastify.db
      .insertInto('export_audit')
      .values({
        id: createExportAuditId(),
        tenant_id: tenantId,
        export_id: id,
        action: 'regenerated',
        actor_user_id: userId ?? null,
        details_json: {},
        created_at: new Date(),
      })
      .execute();

    // Create new job
    const jobId = createJobId();
    const format = exportRecord.format;
    const jobType = format === 'csv' ? 'export.csv.generate' : 'export.pdf.render';
    const templateName = getTemplateName(exportRecord.export_type);

    await fastify.db
      .insertInto('jobs')
      .values({
        id: jobId,
        tenant_id: tenantId,
        type: 'export',
        status: 'pending',
        payload_json: {
          type: jobType,
          tenantId,
          exportId: id,
          snapshotId: exportRecord.snapshot_id,
          exportType: exportRecord.export_type,
          templateName,
          options: exportRecord.options_json,
        },
        created_at: new Date(),
        updated_at: new Date(),
      })
      .execute();

    // Enqueue job
    const queue = format === 'csv' ? exportCsvQueue : exportPdfQueue;
    await queue.add(jobType, {
      jobId,
      tenantId,
      payload: {
        type: jobType,
        tenantId,
        exportId: id,
        snapshotId: exportRecord.snapshot_id,
        exportType: exportRecord.export_type,
        templateName,
        options: exportRecord.options_json,
      },
    });

    request.log.info({ exportId: id, jobId }, 'Export regeneration requested');

    return reply.send({ success: true, jobId });
  });

  /**
   * DELETE /exports/:id - Delete/cancel an export
   */
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { tenantId, userId } = request;
    const { id } = request.params;

    const exportRecord = await fastify.db
      .selectFrom('exports')
      .select(['id', 'status'])
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!exportRecord) {
      return reply.status(404).send({ error: 'Export not found' });
    }

    // Log audit event
    const action = exportRecord.status === 'processing' ? 'cancelled' : 'deleted';
    await fastify.db
      .insertInto('export_audit')
      .values({
        id: createExportAuditId(),
        tenant_id: tenantId,
        export_id: id,
        action,
        actor_user_id: userId ?? null,
        details_json: {},
        created_at: new Date(),
      })
      .execute();

    // Update status to cancelled or delete
    if (exportRecord.status === 'processing') {
      await fastify.db
        .updateTable('exports')
        .set({ status: 'cancelled' })
        .where('id', '=', id)
        .execute();
    } else {
      await fastify.db
        .deleteFrom('exports')
        .where('id', '=', id)
        .execute();
    }

    return reply.send({ success: true, action });
  });
};

function getTemplateName(exportType: string): string {
  switch (exportType) {
    case 'contracts_pdf':
      return 'contracts-report';
    case 'audit_bundle_pdf':
      return 'audit-bundle';
    case 'executive_summary_pdf':
      return 'executive-summary';
    default:
      return exportType;
  }
}

export default exportRoutes;
