/**
 * Contract Intelligence Routes (Phase 5)
 * 
 * API endpoints for contract documents, clauses, terms, overrides, readiness,
 * and the human review queue.
 */
import { FastifyPluginAsync } from 'fastify';
import { sql } from '@cogtics/db';
import {
  createContractDocumentId,
  createTermOverrideId,
  TermOverrideRequestSchema,
  MarkReviewedRequestSchema,
  ReprocessRequestSchema,
  ClauseTypeSchema,
} from '@cogtics/schemas';
import { reviewRoutes } from './review.js';

export const contractRoutes: FastifyPluginAsync = async (fastify) => {
  // ============================================
  // Get Contract Document
  // ============================================
  fastify.get<{ Params: { id: string } }>('/:id/document', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { id: contractId } = request.params;

      // Get latest version for this contract
      const version = await fastify.db
        .selectFrom('contract_versions')
        .select(['id', 'version'])
        .where('contract_id', '=', contractId)
        .orderBy('version', 'desc')
        .executeTakeFirst();

      if (!version) {
        return reply.status(404).send({ error: 'Contract version not found' });
      }

      // Get document for this version
      const document = await fastify.db
        .selectFrom('contract_documents')
        .selectAll()
        .where('contract_version_id', '=', version.id)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!document) {
        return reply.status(404).send({ error: 'No document found for this contract' });
      }

      return {
        id: document.id,
        contractId,
        versionId: version.id,
        version: version.version,
        fileName: document.file_name,
        status: document.status,
        pageCount: document.page_count,
        extractedTextLength: document.extracted_text_length,
        uploadedAt: document.uploaded_at,
        extractedAt: document.extracted_at,
        errorMessage: document.error_message,
      };
    },
  });

  // ============================================
  // Get Contract Clauses
  // ============================================
  fastify.get<{ 
    Params: { id: string };
    Querystring: { versionId?: string; type?: string };
  }>('/:id/clauses', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { id: contractId } = request.params;
      const { versionId, type } = request.query;

      // Get version ID
      let targetVersionId = versionId;
      if (!targetVersionId) {
        const version = await fastify.db
          .selectFrom('contract_versions')
          .select('id')
          .where('contract_id', '=', contractId)
          .orderBy('version', 'desc')
          .executeTakeFirst();
        
        if (!version) {
          return reply.status(404).send({ error: 'Contract version not found' });
        }
        targetVersionId = version.id;
      }

      // Get clauses
      let query = fastify.db
        .selectFrom('contract_clauses')
        .selectAll()
        .where('contract_version_id', '=', targetVersionId)
        .where('tenant_id', '=', tenantId)
        .orderBy('sequence_number', 'asc');

      if (type) {
        const validType = ClauseTypeSchema.safeParse(type);
        if (validType.success) {
          query = query.where('clause_type', '=', validType.data);
        }
      }

      const clauses = await query.execute();

      return {
        contractId,
        versionId: targetVersionId,
        clauses: clauses.map(c => ({
          id: c.id,
          type: c.clause_type,
          label: c.clause_label,
          text: c.text,
          startOffset: c.start_offset,
          endOffset: c.end_offset,
          pageNumber: c.page_number,
          sequenceNumber: c.sequence_number,
          parentClauseId: c.parent_clause_id,
        })),
        total: clauses.length,
      };
    },
  });

  // ============================================
  // Get Contract Terms
  // ============================================
  fastify.get<{
    Params: { id: string };
    Querystring: { versionId?: string; type?: string; minConfidence?: string };
  }>('/:id/terms', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { id: contractId } = request.params;
      const { versionId, type, minConfidence } = request.query;

      // Get version ID
      let targetVersionId = versionId;
      if (!targetVersionId) {
        const version = await fastify.db
          .selectFrom('contract_versions')
          .select('id')
          .where('contract_id', '=', contractId)
          .orderBy('version', 'desc')
          .executeTakeFirst();
        
        if (!version) {
          return reply.status(404).send({ error: 'Contract version not found' });
        }
        targetVersionId = version.id;
      }

      // Get terms
      let query = fastify.db
        .selectFrom('contract_terms')
        .leftJoin('contract_term_overrides', 'contract_term_overrides.term_id', 'contract_terms.id')
        .select([
          'contract_terms.id',
          'contract_terms.term_type',
          'contract_terms.value_json',
          'contract_terms.confidence',
          'contract_terms.extraction_method',
          'contract_terms.matched_text',
          'contract_terms.is_overridden',
          'contract_terms.source_clause_id',
          'contract_terms.start_offset',
          'contract_terms.end_offset',
          'contract_terms.created_at',
          'contract_term_overrides.override_value_json',
          'contract_term_overrides.reason as override_reason',
          'contract_term_overrides.actor_user_id as override_actor_id',
          'contract_term_overrides.created_at as override_created_at',
        ])
        .where('contract_terms.contract_version_id', '=', targetVersionId)
        .where('contract_terms.tenant_id', '=', tenantId);

      if (type) {
        query = query.where('contract_terms.term_type', '=', type);
      }

      if (minConfidence) {
        query = query.where('contract_terms.confidence', '>=', parseInt(minConfidence, 10));
      }

      const terms = await query.execute();

      return {
        contractId,
        versionId: targetVersionId,
        terms: terms.map(t => ({
          id: t.id,
          termType: t.term_type,
          value: t.is_overridden ? t.override_value_json : t.value_json,
          originalValue: t.value_json,
          confidence: t.confidence,
          extractionMethod: t.extraction_method,
          matchedText: t.matched_text,
          isOverridden: t.is_overridden,
          sourceClauseId: t.source_clause_id,
          startOffset: t.start_offset,
          endOffset: t.end_offset,
          override: t.is_overridden ? {
            value: t.override_value_json,
            reason: t.override_reason,
            actorId: t.override_actor_id,
            createdAt: t.override_created_at,
          } : null,
        })),
        total: terms.length,
      };
    },
  });

  // ============================================
  // Create Term Override
  // ============================================
  fastify.post<{
    Params: { id: string; termId: string };
    Body: { overrideValue: unknown; reason?: string };
  }>('/:id/terms/:termId/override', {
    handler: async (request, reply) => {
      const { tenantId, userId } = request.auth!;
      const { termId } = request.params;
      const body = TermOverrideRequestSchema.parse(request.body);
      const { overrideValue, reason } = body;

      // Get the term
      const term = await fastify.db
        .selectFrom('contract_terms')
        .selectAll()
        .where('id', '=', termId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!term) {
        return reply.status(404).send({ error: 'Term not found' });
      }

      // Create override record
      const overrideId = createTermOverrideId();
      
      await fastify.db
        .insertInto('contract_term_overrides')
        .values({
          id: overrideId,
          tenant_id: tenantId,
          snapshot_id: term.snapshot_id,
          term_id: termId,
          original_value_json: term.value_json,
          override_value_json: overrideValue,
          actor_user_id: userId,
          reason: reason || null,
        })
        .execute();

      // Update the term
      await fastify.db
        .updateTable('contract_terms')
        .set({
          is_overridden: true,
          override_id: overrideId,
        })
        .where('id', '=', termId)
        .execute();

      // Log audit event
      await fastify.db
        .insertInto('audit_logs')
        .values({
          id: `aud_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`,
          tenant_id: tenantId,
          actor_user_id: userId,
          action: 'contract.term.override',
          resource: termId,
          metadata_json: {
            termType: term.term_type,
            originalValue: term.value_json,
            overrideValue,
            reason,
          },
          request_id: null,
        })
        .execute();

      return {
        success: true,
        overrideId,
        termId,
        message: 'Term override created',
      };
    },
  });

  // ============================================
  // Delete Term Override
  // ============================================
  fastify.delete<{ Params: { id: string; termId: string } }>('/:id/terms/:termId/override', {
    handler: async (request, reply) => {
      const { tenantId, userId } = request.auth!;
      const { termId } = request.params;

      // Get the term
      const term = await fastify.db
        .selectFrom('contract_terms')
        .selectAll()
        .where('id', '=', termId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!term || !term.override_id) {
        return reply.status(404).send({ error: 'Override not found' });
      }

      // Delete the override
      await fastify.db
        .deleteFrom('contract_term_overrides')
        .where('id', '=', term.override_id)
        .execute();

      // Update the term
      await fastify.db
        .updateTable('contract_terms')
        .set({
          is_overridden: false,
          override_id: null,
        })
        .where('id', '=', termId)
        .execute();

      // Log audit event
      await fastify.db
        .insertInto('audit_logs')
        .values({
          id: `aud_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`,
          tenant_id: tenantId,
          actor_user_id: userId,
          action: 'contract.term.override.removed',
          resource: termId,
          metadata_json: { termType: term.term_type },
          request_id: null,
        })
        .execute();

      return {
        success: true,
        termId,
        message: 'Term override removed',
      };
    },
  });

  // ============================================
  // Get Contract Readiness
  // ============================================
  fastify.get<{ Params: { id: string }; Querystring: { versionId?: string } }>('/:id/readiness', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { id: contractId } = request.params;
      const { versionId } = request.query;

      // Get version ID
      let targetVersionId = versionId;
      if (!targetVersionId) {
        const version = await fastify.db
          .selectFrom('contract_versions')
          .select('id')
          .where('contract_id', '=', contractId)
          .orderBy('version', 'desc')
          .executeTakeFirst();
        
        if (!version) {
          return reply.status(404).send({ error: 'Contract version not found' });
        }
        targetVersionId = version.id;
      }

      // Get readiness record
      const readiness = await fastify.db
        .selectFrom('contract_readiness')
        .selectAll()
        .where('contract_version_id', '=', targetVersionId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!readiness) {
        return {
          contractId,
          versionId: targetVersionId,
          status: 'incomplete',
          confidenceScore: 0,
          requiredTermsCount: 0,
          extractedTermsCount: 0,
          missingTerms: [],
          lowConfidenceTerms: [],
          reviewedBy: null,
          reviewedAt: null,
        };
      }

      return {
        contractId,
        versionId: targetVersionId,
        status: readiness.readiness_status,
        confidenceScore: readiness.confidence_score,
        requiredTermsCount: readiness.required_terms_count,
        extractedTermsCount: readiness.extracted_terms_count,
        missingTerms: readiness.missing_terms_json,
        lowConfidenceTerms: readiness.low_confidence_terms_json,
        reviewedBy: readiness.reviewed_by,
        reviewedAt: readiness.reviewed_at,
      };
    },
  });

  // ============================================
  // Mark Contract as Reviewed
  // ============================================
  fastify.post<{
    Params: { id: string };
    Body: { notes?: string };
  }>('/:id/readiness/review', {
    handler: async (request, reply) => {
      const { tenantId, userId } = request.auth!;
      const { id: contractId } = request.params;
      const body = MarkReviewedRequestSchema.parse(request.body || {});
      const { notes } = body;

      // Get latest version
      const version = await fastify.db
        .selectFrom('contract_versions')
        .select('id')
        .where('contract_id', '=', contractId)
        .orderBy('version', 'desc')
        .executeTakeFirst();

      if (!version) {
        return reply.status(404).send({ error: 'Contract version not found' });
      }

      // Update readiness record
      const result = await fastify.db
        .updateTable('contract_readiness')
        .set({
          readiness_status: 'ready',
          reviewed_by: userId,
          reviewed_at: new Date(),
          updated_at: new Date(),
        })
        .where('contract_version_id', '=', version.id)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      // Log audit event
      await fastify.db
        .insertInto('audit_logs')
        .values({
          id: `aud_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`,
          tenant_id: tenantId,
          actor_user_id: userId,
          action: 'contract.readiness.reviewed',
          resource: contractId,
          metadata_json: { versionId: version.id, notes },
          request_id: null,
        })
        .execute();

      return {
        success: true,
        contractId,
        versionId: version.id,
        message: 'Contract marked as reviewed',
      };
    },
  });

  // ============================================
  // Reprocess Contract
  // ============================================
  fastify.post<{
    Params: { id: string };
    Body: { forceReextract?: boolean };
  }>('/:id/reprocess', {
    handler: async (request, reply) => {
      const { tenantId } = request.auth!;
      const { id: contractId } = request.params;
      const body = ReprocessRequestSchema.parse(request.body || {});
      const { forceReextract } = body;

      // Get latest version
      const version = await fastify.db
        .selectFrom('contract_versions')
        .select(['id', 'snapshot_id'])
        .where('contract_id', '=', contractId)
        .orderBy('version', 'desc')
        .executeTakeFirst();

      if (!version) {
        return reply.status(404).send({ error: 'Contract version not found' });
      }

      // Get document
      const document = await fastify.db
        .selectFrom('contract_documents')
        .select(['id', 's3_key', 'status'])
        .where('contract_version_id', '=', version.id)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!document) {
        return reply.status(404).send({ error: 'No document found for this contract' });
      }

      // Prevent concurrent reprocessing
      if (document.status === 'extracting') {
        return reply.status(409).send({ 
          error: 'Processing already in progress',
          message: 'Please wait for the current extraction to complete before reprocessing.',
        });
      }

      // Update document status to indicate processing is starting
      await fastify.db
        .updateTable('contract_documents')
        .set({ status: 'extracting' })
        .where('id', '=', document.id)
        .execute();

      // Enqueue appropriate job based on current state
      const jobQueue = fastify.jobQueue;
      
      if (forceReextract) {
        // Re-extract from PDF
        await jobQueue.add('contracts.pdf.extract', {
          tenantId,
          payload: {
            type: 'contracts.pdf.extract',
            tenantId,
            snapshotId: version.snapshot_id,
            documentId: document.id,
            contractVersionId: version.id,
            s3Key: document.s3_key,
          },
        });
      } else {
        // Just re-segment and extract terms
        await jobQueue.add('contracts.clause.segment', {
          tenantId,
          payload: {
            type: 'contracts.clause.segment',
            tenantId,
            snapshotId: version.snapshot_id,
            documentId: document.id,
            contractVersionId: version.id,
          },
        });
      }

      return {
        success: true,
        contractId,
        versionId: version.id,
        message: forceReextract 
          ? 'Contract queued for full reprocessing' 
          : 'Contract queued for term re-extraction',
      };
    },
  });

  // ============================================
  // Register Review Queue Routes
  // ============================================
  await fastify.register(reviewRoutes);
};
