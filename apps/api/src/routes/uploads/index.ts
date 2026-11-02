/**
 * Upload Routes
 * 
 * API endpoints for CSV/PDF manual uploads.
 */
import { FastifyPluginAsync } from 'fastify';
import { sql } from '@cogtics/db';
import {
  createUploadId,
  createUploadFileId,
  createUploadMappingId,
  createParseRunId,
  StartUploadRequestSchema,
  CompleteUploadRequestSchema,
  ListUploadsQuerySchema,
  UploadMappingSchema,
} from '@cogtics/schemas';

export const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  
  // ============================================
  // POST /uploads/csv/start - Get presigned URL for CSV upload
  // ============================================
  fastify.post('/csv/start', {
    handler: async (request, reply) => {
      const { tenantId, userId } = request.auth!;
      const body = StartUploadRequestSchema.parse(request.body);

      if (body.type !== 'csv') {
        throw fastify.httpErrors.badRequest('This endpoint is for CSV uploads only');
      }

      const uploadId = createUploadId();
      const fileId = createUploadFileId();
      const s3Key = `uploads/${tenantId}/${uploadId}/${body.fileName}`;

      // Create upload record
      await fastify.db
        .insertInto('uploads')
        .values({
          id: uploadId,
          tenant_id: tenantId,
          type: 'csv',
          status: 'pending',
          entity_type: body.entityType ?? null,
          display_name: body.displayName ?? body.fileName,
          file_count: 1,
          created_by: userId,
          metadata_json: {},
        } as any)
        .execute();

      // Create file record
      await fastify.db
        .insertInto('upload_files')
        .values({
          id: fileId,
          tenant_id: tenantId,
          upload_id: uploadId,
          file_name: body.fileName,
          content_type: body.contentType,
          s3_key: s3Key,
          size_bytes: body.fileSize ?? 0,
          metadata_json: {},
        } as any)
        .execute();

      // Generate presigned URL (using MinIO/S3 client)
      const presignedUrl = await fastify.storage.getPresignedPutUrl(s3Key, {
        contentType: body.contentType,
        expiresIn: 3600, // 1 hour
      });

      return reply.status(201).send({
        uploadId,
        fileId,
        presignedUrl,
        s3Key,
      });
    },
  });

  // ============================================
  // POST /uploads/csv/complete - Mark upload complete and start processing
  // ============================================
  fastify.post('/csv/complete', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const body = CompleteUploadRequestSchema.parse(request.body);

      // Get upload record
      const upload = await fastify.db
        .selectFrom('uploads')
        .selectAll()
        .where('id', '=', body.uploadId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!upload) {
        throw fastify.httpErrors.notFound('Upload not found');
      }

      if (upload.type !== 'csv') {
        throw fastify.httpErrors.badRequest('This upload is not a CSV');
      }

      // Get file record
      const file = await fastify.db
        .selectFrom('upload_files')
        .selectAll()
        .where('upload_id', '=', body.uploadId)
        .executeTakeFirst();

      if (!file) {
        throw fastify.httpErrors.notFound('Upload file not found');
      }

      // Save mapping if provided
      if (body.mapping) {
        const mappingId = createUploadMappingId();
        await fastify.db
          .insertInto('upload_mappings')
          .values({
            id: mappingId,
            tenant_id: tenantId,
            upload_id: body.uploadId,
            entity_type: body.mapping.entityType,
            mapping_json: body.mapping,
            validation_rules_json: {},
          })
          .execute();
      }

      // Create parse run
      const parseRunId = createParseRunId();
      await fastify.db
        .insertInto('upload_parse_runs')
        .values({
          id: parseRunId,
          tenant_id: tenantId,
          upload_id: body.uploadId,
          file_id: file.id,
          status: 'pending',
          run_number: 1,
          stats_json: {},
        })
        .execute();

      // Update upload status to processing (file is uploaded, now being parsed)
      // If autoProcess is false, mark as completed immediately
      await fastify.db
        .updateTable('uploads')
        .set({
          status: body.autoProcess ? 'processing' : 'completed',
          started_at: new Date(),
          completed_at: body.autoProcess ? null : new Date(),
        })
        .where('id', '=', body.uploadId)
        .execute();

      // Enqueue parse job (with backpressure check)
      if (body.autoProcess) {
        // Phase 2: Check queue depth before enqueuing
        const { canEnqueueJob } = await import('../../lib/queue-depth.js');
        const queueCheck = await canEnqueueJob(fastify, 'upload.csv.parse');

        if (!queueCheck.canEnqueue) {
          // Queue is full - return HTTP 429
          return reply.status(429).send({
            error: 'Too Many Requests',
            message: `Upload queue is currently at capacity (${queueCheck.currentDepth}/${queueCheck.limit} jobs). Please try again in ${queueCheck.retryAfterSeconds} seconds.`,
            retryAfter: queueCheck.retryAfterSeconds,
            queueDepth: queueCheck.currentDepth,
            queueLimit: queueCheck.limit,
          });
        }

        await fastify.jobQueue.add('upload.csv.parse', {
          tenantId,
          payload: {
            type: 'upload.csv.parse',
            tenantId,
            uploadId: body.uploadId,
            fileId: file.id,
            parseRunId,
            mapping: body.mapping,
          },
        });
      }

      return reply.status(201).send({
        uploadId: body.uploadId,
        parseRunId,
        status: 'processing',
      });
    },
  });

  // ============================================
  // POST /uploads/pdf/start - Get presigned URL for PDF upload
  // ============================================
  fastify.post('/pdf/start', {
    handler: async (request, reply) => {
      const { tenantId, userId } = request.auth!;
      const body = StartUploadRequestSchema.parse(request.body);

      if (body.type !== 'pdf') {
        throw fastify.httpErrors.badRequest('This endpoint is for PDF uploads only');
      }

      const uploadId = createUploadId();
      const fileId = createUploadFileId();
      const s3Key = `uploads/${tenantId}/${uploadId}/${body.fileName}`;

      // Create upload record
      await fastify.db
        .insertInto('uploads')
        .values({
          id: uploadId,
          tenant_id: tenantId,
          type: 'pdf',
          status: 'pending',
          entity_type: body.entityType ?? 'contract',
          display_name: body.displayName ?? body.fileName,
          file_count: 1,
          created_by: userId,
          metadata_json: {},
        } as any)
        .execute();

      // Create file record
      await fastify.db
        .insertInto('upload_files')
        .values({
          id: fileId,
          tenant_id: tenantId,
          upload_id: uploadId,
          file_name: body.fileName,
          content_type: body.contentType,
          s3_key: s3Key,
          size_bytes: body.fileSize ?? 0,
          metadata_json: {},
        } as any)
        .execute();

      // Generate presigned URL
      const presignedUrl = await fastify.storage.getPresignedPutUrl(s3Key, {
        contentType: body.contentType,
        expiresIn: 3600,
      });

      return reply.status(201).send({
        uploadId,
        fileId,
        presignedUrl,
        s3Key,
      });
    },
  });

  // ============================================
  // POST /uploads/pdf/complete - Mark PDF upload complete and start processing
  // ============================================
  fastify.post('/pdf/complete', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const body = CompleteUploadRequestSchema.parse(request.body);

      // Get upload record
      const upload = await fastify.db
        .selectFrom('uploads')
        .selectAll()
        .where('id', '=', body.uploadId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!upload) {
        throw fastify.httpErrors.notFound('Upload not found');
      }

      if (upload.type !== 'pdf') {
        throw fastify.httpErrors.badRequest('This upload is not a PDF');
      }

      // Get file record
      const file = await fastify.db
        .selectFrom('upload_files')
        .selectAll()
        .where('upload_id', '=', body.uploadId)
        .executeTakeFirst();

      if (!file) {
        throw fastify.httpErrors.notFound('Upload file not found');
      }

      // Create parse run
      const parseRunId = createParseRunId();
      await fastify.db
        .insertInto('upload_parse_runs')
        .values({
          id: parseRunId,
          tenant_id: tenantId,
          upload_id: body.uploadId,
          file_id: file.id,
          status: 'pending',
          run_number: 1,
          stats_json: {},
        })
        .execute();

      // Update upload status to processing (file is uploaded, now being parsed)
      // If autoProcess is false, mark as completed immediately
      await fastify.db
        .updateTable('uploads')
        .set({
          status: body.autoProcess ? 'processing' : 'completed',
          started_at: new Date(),
          completed_at: body.autoProcess ? null : new Date(),
        })
        .where('id', '=', body.uploadId)
        .execute();

      // Enqueue PDF parse job (with backpressure check)
      if (body.autoProcess) {
        // Phase 2: Check queue depth before enqueuing
        const { canEnqueueJob } = await import('../../lib/queue-depth.js');
        const queueCheck = await canEnqueueJob(fastify, 'upload.pdf.parse');

        if (!queueCheck.canEnqueue) {
          // Queue is full - return HTTP 429
          return reply.status(429).send({
            error: 'Too Many Requests',
            message: `Upload queue is currently at capacity (${queueCheck.currentDepth}/${queueCheck.limit} jobs). Please try again in ${queueCheck.retryAfterSeconds} seconds.`,
            retryAfter: queueCheck.retryAfterSeconds,
            queueDepth: queueCheck.currentDepth,
            queueLimit: queueCheck.limit,
          });
        }

        await fastify.jobQueue.add('upload.pdf.parse', {
          tenantId,
          payload: {
            type: 'upload.pdf.parse',
            tenantId,
            uploadId: body.uploadId,
            fileId: file.id,
            parseRunId,
          },
        });
      }

      return reply.status(201).send({
        uploadId: body.uploadId,
        parseRunId,
        status: 'processing',
      });
    },
  });

  // ============================================
  // GET /uploads - List uploads for tenant
  // ============================================
  fastify.get('/', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const query = ListUploadsQuerySchema.parse(request.query);

      let dbQuery = fastify.db
        .selectFrom('uploads')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .orderBy('created_at', 'desc')
        .limit(query.limit)
        .offset(query.offset);

      if (query.type) {
        dbQuery = dbQuery.where('type', '=', query.type);
      }

      if (query.status) {
        dbQuery = dbQuery.where('status', '=', query.status);
      }

      const uploads = await dbQuery.execute();

      // Get total count
      let countQuery = fastify.db
        .selectFrom('uploads')
        .select(sql<number>`count(*)`.as('count'))
        .where('tenant_id', '=', tenantId);

      if (query.type) {
        countQuery = countQuery.where('type', '=', query.type);
      }
      if (query.status) {
        countQuery = countQuery.where('status', '=', query.status);
      }

      const { count } = await countQuery.executeTakeFirstOrThrow();

      return reply.send({
        uploads: uploads.map(u => ({
          id: u.id,
          type: u.type,
          status: u.status,
          entityType: u.entity_type,
          displayName: u.display_name,
          fileCount: u.file_count,
          totalRows: u.total_rows,
          validRows: u.valid_rows,
          errorCount: u.error_count,
          createdAt: u.created_at,
          completedAt: u.completed_at,
        })),
        total: Number(count),
        limit: query.limit,
        offset: query.offset,
      });
    },
  });

  // ============================================
  // GET /uploads/:id - Get upload details
  // ============================================
  fastify.get('/:id', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { id } = request.params as { id: string };

      const upload = await fastify.db
        .selectFrom('uploads')
        .selectAll()
        .where('id', '=', id)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!upload) {
        throw fastify.httpErrors.notFound('Upload not found');
      }

      // Get files
      const files = await fastify.db
        .selectFrom('upload_files')
        .selectAll()
        .where('upload_id', '=', id)
        .execute();

      // Get parse runs
      const parseRuns = await fastify.db
        .selectFrom('upload_parse_runs')
        .selectAll()
        .where('upload_id', '=', id)
        .orderBy('run_number', 'desc')
        .execute();

      // Get mapping
      const mapping = await fastify.db
        .selectFrom('upload_mappings')
        .selectAll()
        .where('upload_id', '=', id)
        .executeTakeFirst();

      return reply.send({
        id: upload.id,
        type: upload.type,
        status: upload.status,
        entityType: upload.entity_type,
        displayName: upload.display_name,
        fileCount: upload.file_count,
        totalRows: upload.total_rows,
        validRows: upload.valid_rows,
        errorCount: upload.error_count,
        errorCode: upload.error_code,
        errorMessage: upload.error_message,
        createdAt: upload.created_at,
        startedAt: upload.started_at,
        completedAt: upload.completed_at,
        files: files.map(f => ({
          id: f.id,
          fileName: f.file_name,
          contentType: f.content_type,
          sizeBytes: f.size_bytes,
        })),
        parseRuns: parseRuns.map(r => ({
          id: r.id,
          runNumber: r.run_number,
          status: r.status,
          stats: r.stats_json,
          startedAt: r.started_at,
          finishedAt: r.finished_at,
        })),
        mapping: mapping?.mapping_json ?? null,
      });
    },
  });

  // ============================================
  // GET /uploads/:id/errors - Get parse errors with pagination
  // ============================================
  fastify.get('/:id/errors', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { id } = request.params as { id: string };
      const { limit = 50, offset = 0 } = request.query as { limit?: number; offset?: number };

      // Verify upload exists
      const upload = await fastify.db
        .selectFrom('uploads')
        .select('id')
        .where('id', '=', id)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!upload) {
        throw fastify.httpErrors.notFound('Upload not found');
      }

      const errors = await fastify.db
        .selectFrom('upload_parse_errors')
        .selectAll()
        .where('upload_id', '=', id)
        .orderBy('row_number', 'asc')
        .limit(limit)
        .offset(offset)
        .execute();

      const { count } = await fastify.db
        .selectFrom('upload_parse_errors')
        .select(sql<number>`count(*)`.as('count'))
        .where('upload_id', '=', id)
        .executeTakeFirstOrThrow();

      return reply.send({
        errors: errors.map(e => ({
          id: e.id,
          rowNumber: e.row_number,
          field: e.field,
          errorType: e.error_type,
          errorMessage: e.error_message,
          rawValue: e.raw_value,
        })),
        total: Number(count),
        limit,
        offset,
      });
    },
  });

  // ============================================
  // DELETE /uploads/:id - Delete upload and files
  // ============================================
  fastify.delete('/:id', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { id } = request.params as { id: string };

      // Verify upload exists
      const upload = await fastify.db
        .selectFrom('uploads')
        .selectAll()
        .where('id', '=', id)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!upload) {
        throw fastify.httpErrors.notFound('Upload not found');
      }

      // Get files to delete from S3
      const files = await fastify.db
        .selectFrom('upload_files')
        .select('s3_key')
        .where('upload_id', '=', id)
        .execute();

      // Delete from S3
      for (const file of files) {
        try {
          await fastify.storage.deleteObject(file.s3_key);
        } catch (err) {
          fastify.log.warn({ err, s3Key: file.s3_key }, 'Failed to delete file from S3');
        }
      }

      // Delete upload (cascades to files, mappings, parse runs, errors)
      await fastify.db
        .deleteFrom('uploads')
        .where('id', '=', id)
        .execute();

      return reply.status(204).send();
    },
  });

  // ============================================
  // POST /uploads/:id/reprocess - Re-run parsing
  // ============================================
  fastify.post('/:id/reprocess', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { id } = request.params as { id: string };

      const upload = await fastify.db
        .selectFrom('uploads')
        .selectAll()
        .where('id', '=', id)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!upload) {
        throw fastify.httpErrors.notFound('Upload not found');
      }

      // Get latest run number
      const latestRun = await fastify.db
        .selectFrom('upload_parse_runs')
        .select('run_number')
        .where('upload_id', '=', id)
        .orderBy('run_number', 'desc')
        .executeTakeFirst();

      const file = await fastify.db
        .selectFrom('upload_files')
        .selectAll()
        .where('upload_id', '=', id)
        .executeTakeFirst();

      if (!file) {
        throw fastify.httpErrors.notFound('Upload file not found');
      }

      // Get mapping
      const mapping = await fastify.db
        .selectFrom('upload_mappings')
        .select('mapping_json')
        .where('upload_id', '=', id)
        .executeTakeFirst();

      // Create new parse run
      const parseRunId = createParseRunId();
      const runNumber = (latestRun?.run_number ?? 0) + 1;

      await fastify.db
        .insertInto('upload_parse_runs')
        .values({
          id: parseRunId,
          tenant_id: tenantId,
          upload_id: id,
          file_id: file.id,
          status: 'pending',
          run_number: runNumber,
          stats_json: {},
        })
        .execute();

      // Update upload status
      await fastify.db
        .updateTable('uploads')
        .set({
          status: 'processing',
          error_code: null,
          error_message: null,
        })
        .where('id', '=', id)
        .execute();

      // Enqueue job based on type
      const jobType = upload.type === 'csv' ? 'upload.csv.parse' : 'upload.pdf.parse';
      await fastify.jobQueue.add(jobType, {
        tenantId,
        payload: {
          type: jobType,
          tenantId,
          uploadId: id,
          fileId: file.id,
          parseRunId,
          mapping: mapping?.mapping_json,
        },
      });

      return reply.send({
        uploadId: id,
        parseRunId,
        runNumber,
        status: 'processing',
      });
    },
  });

  // ============================================
  // POST /uploads/analyze - AI-powered CSV analysis
  // ============================================
  fastify.post('/analyze', {
    handler: async (request, reply) => {
      const body = request.body as {
        headers: string[];
        sampleRows: string[][];
        fileName?: string;
        userHint?: string;
      };

      if (!body.headers || !Array.isArray(body.headers) || body.headers.length === 0) {
        throw fastify.httpErrors.badRequest('headers array is required');
      }

      // Dynamically import the analyzer to avoid bundling issues
      let analyzeCSV: typeof import('@cogtics/utils').llm.analyzeCSV;
      try {
        const utils = await import('@cogtics/utils');
        analyzeCSV = utils.llm.analyzeCSV;
      } catch (err) {
        console.error('Failed to import analyzeCSV:', err);
        // Fall back to basic analysis if module not available
        return reply.send({
          entityType: 'customer',
          entityTypeConfidence: 0.3,
          entityTypeReasoning: 'Default fallback - analyzer not available',
          columnMappings: body.headers.map((h: string) => ({
            sourceColumn: h,
            targetField: null,
            confidence: 0.1,
            reasoning: 'Manual configuration required',
          })),
          suggestions: ['Please configure column mappings manually'],
          warnings: ['AI analysis is not available'],
          aiPowered: false,
        });
      }

      if (typeof analyzeCSV !== 'function') {
        console.error('analyzeCSV is not a function, got:', typeof analyzeCSV);
        return reply.send({
          entityType: 'customer',
          entityTypeConfidence: 0.3,
          entityTypeReasoning: 'Analyzer function not available',
          columnMappings: body.headers.map((h: string) => ({
            sourceColumn: h,
            targetField: null,
            confidence: 0.1,
            reasoning: 'Manual configuration required',
          })),
          suggestions: ['Please configure column mappings manually'],
          warnings: ['AI analysis module error'],
          aiPowered: false,
        });
      }

      const result = await analyzeCSV(
        body.headers,
        body.sampleRows || [],
        {
          fileName: body.fileName,
          userHint: body.userHint,
        }
      );

      return reply.send(result);
    },
  });

  // ============================================
  // GET /uploads/templates - Get CSV template definitions
  // ============================================
  fastify.get('/templates', {
    handler: async (_request, reply) => {
      const templates = await fastify.db
        .selectFrom('upload_templates')
        .selectAll()
        .orderBy('display_name', 'asc')
        .execute();

      return reply.send({
        templates: templates.map(t => ({
          id: t.id,
          entityType: t.entity_type,
          displayName: t.display_name,
          description: t.description,
          columns: t.columns_json,
          sampleData: t.sample_data_json,
        })),
      });
    },
  });
};
