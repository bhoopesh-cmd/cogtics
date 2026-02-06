import { z } from 'zod';
import { TenantIdSchema, JobIdSchema } from './ids.js';
import { IdentityResolveJobPayloadSchema, IdentityApplyJobPayloadSchema } from './identity.js';
import { CsvParseJobPayloadSchema, CsvFinalizeJobPayloadSchema, PdfParseJobPayloadSchema } from './uploads.js';
import { ContractExtractJobPayloadSchema, ClauseSegmentJobPayloadSchema, TermExtractJobPayloadSchema, ReadinessComputeJobPayloadSchema, } from './contracts.js';
import { RevRecComputeJobPayloadSchema, RevRecReconcileJobPayloadSchema, } from './revrec.js';
import { DetectRunJobPayloadSchema, DetectReplayJobPayloadSchema, EvidenceGenerateJobPayloadSchema, EvidenceRegenerateJobPayloadSchema, } from './detection.js';
import { SimulationRunJobPayloadSchema, SimulationReplayJobPayloadSchema, } from './simulation.js';
import { ExportCsvGenerateJobPayloadSchema, ExportPdfRenderJobPayloadSchema, DigestSendJobPayloadSchema, } from './exports.js';
// Job status enum
export const JobStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']);
// Queue names
export const QueueNameSchema = z.enum([
    'sync',
    'detect',
    'simulate',
    'export',
    'ingest.load',
    'ingest.normalize',
    'ingest.upsert',
    'ingest.finalize',
    'ingest.full',
    'identity.resolve',
    'identity.apply',
    'upload.csv.parse',
    'upload.csv.finalize',
    'upload.pdf.parse',
    // Phase 5 contract intelligence jobs
    'contracts.pdf.extract',
    'contracts.clause.segment',
    'contracts.terms.extract',
    'contracts.readiness.compute',
    // Phase 6 revenue recognition jobs
    'revrec.compute',
    'revrec.reconcile',
    // Phase 7 detection engine jobs
    'detect.run',
    'detect.replay',
    // Phase 8 evidence generation jobs
    'evidence.generate',
    'evidence.regenerate',
    // Phase 9 simulation engine jobs
    'simulation.run',
    'simulation.replay',
    // Phase 10 exports & digests jobs
    'export.csv.generate',
    'export.pdf.render',
    'digest.send',
]);
// Base job payload (all jobs must have these)
const BaseJobPayload = z.object({
    tenantId: TenantIdSchema,
    requestId: z.string().optional(),
    idempotencyKey: z.string().optional(),
});
// Sync job payload - legacy (Phase 0 stub)
export const LegacySyncJobPayloadSchema = BaseJobPayload.extend({
    type: z.literal('sync'),
    source: z.enum(['salesforce', 'netsuite', 'ironclad', 'snowflake', 'stripe', 'zuora']),
    fullSync: z.boolean().default(false),
});
// Connector sync job payload (Phase 1)
export const ConnectorSyncJobPayloadSchema = BaseJobPayload.extend({
    type: z.literal('sync'),
    connectionId: z.string(),
    runId: z.string(),
    runType: z.enum(['full', 'incremental']).default('incremental'),
    objectTypes: z.array(z.string()).optional(),
});
// Sync job can be either legacy or connector-based
export const SyncJobPayloadSchema = z.union([
    ConnectorSyncJobPayloadSchema,
    LegacySyncJobPayloadSchema,
]);
// Detect job payload (Phase 0 stub)
export const DetectJobPayloadSchema = BaseJobPayload.extend({
    type: z.literal('detect'),
    scope: z.enum(['all', 'contracts', 'billing', 'usage']).default('all'),
});
// Simulate job payload (Phase 0 stub)
export const SimulateJobPayloadSchema = BaseJobPayload.extend({
    type: z.literal('simulate'),
    scenarioId: z.string(),
    parameters: z.record(z.unknown()).optional(),
});
// Export job payload (Phase 0 stub)
export const ExportJobPayloadSchema = BaseJobPayload.extend({
    type: z.literal('export'),
    format: z.enum(['pdf', 'csv', 'xlsx']).default('pdf'),
    reportType: z.enum(['audit', 'revrec', 'issues', 'summary']),
    dateRange: z
        .object({
        start: z.string().datetime(),
        end: z.string().datetime(),
    })
        .optional(),
});
// ============================================
// Phase 2: Ingestion Job Payloads
// ============================================
// Ingest Load - Read S3 batches and write to staging_records
export const IngestLoadJobPayloadSchema = BaseJobPayload.extend({
    type: z.literal('ingest.load'),
    snapshotId: z.string(),
    batchIds: z.array(z.string()), // raw_batches IDs to process
    connectionId: z.string(),
});
// Ingest Normalize - Transform staging records via mappers
export const IngestNormalizeJobPayloadSchema = BaseJobPayload.extend({
    type: z.literal('ingest.normalize'),
    snapshotId: z.string(),
    objectTypes: z.array(z.string()).optional(), // Filter to specific object types
    batchSize: z.number().default(1000),
});
// Ingest Upsert - Write normalized records to canonical tables
export const IngestUpsertJobPayloadSchema = BaseJobPayload.extend({
    type: z.literal('ingest.upsert'),
    snapshotId: z.string(),
    objectTypes: z.array(z.string()).optional(), // Filter to specific object types
    batchSize: z.number().default(500),
});
// Ingest Finalize - Mark snapshot complete and compute metrics
export const IngestFinalizeJobPayloadSchema = BaseJobPayload.extend({
    type: z.literal('ingest.finalize'),
    snapshotId: z.string(),
    runQualityChecks: z.boolean().default(true),
});
// Ingest Full - Orchestrates complete ingestion pipeline
export const IngestFullJobPayloadSchema = BaseJobPayload.extend({
    type: z.literal('ingest.full'),
    snapshotId: z.string(),
    connectionIds: z.array(z.string()).optional(), // All connections if not specified
    runType: z.enum(['full', 'incremental']).default('incremental'),
});
// Union of all job payloads
export const JobPayloadSchema = z.discriminatedUnion('type', [
    // Note: We use ConnectorSyncJobPayloadSchema as the primary sync schema
    // since discriminatedUnion requires unique discriminator values
    ConnectorSyncJobPayloadSchema,
    DetectJobPayloadSchema,
    SimulateJobPayloadSchema,
    ExportJobPayloadSchema,
    // Phase 2 ingestion jobs
    IngestLoadJobPayloadSchema,
    IngestNormalizeJobPayloadSchema,
    IngestUpsertJobPayloadSchema,
    IngestFinalizeJobPayloadSchema,
    IngestFullJobPayloadSchema,
    // Phase 3 identity jobs
    IdentityResolveJobPayloadSchema,
    IdentityApplyJobPayloadSchema,
    // Phase 4 upload jobs
    CsvParseJobPayloadSchema,
    CsvFinalizeJobPayloadSchema,
    PdfParseJobPayloadSchema,
    // Phase 5 contract intelligence jobs
    ContractExtractJobPayloadSchema,
    ClauseSegmentJobPayloadSchema,
    TermExtractJobPayloadSchema,
    ReadinessComputeJobPayloadSchema,
    // Phase 6 revenue recognition jobs
    RevRecComputeJobPayloadSchema,
    RevRecReconcileJobPayloadSchema,
    // Phase 7 detection engine jobs
    DetectRunJobPayloadSchema,
    DetectReplayJobPayloadSchema,
    // Phase 8 evidence generation jobs
    EvidenceGenerateJobPayloadSchema,
    EvidenceRegenerateJobPayloadSchema,
    // Phase 9 simulation engine jobs
    SimulationRunJobPayloadSchema,
    SimulationReplayJobPayloadSchema,
    // Phase 10 exports & digests jobs
    ExportCsvGenerateJobPayloadSchema,
    ExportPdfRenderJobPayloadSchema,
    DigestSendJobPayloadSchema,
]);
// Job result schemas (Phase 0 stubs)
export const JobResultSchema = z.object({
    success: z.boolean(),
    message: z.string().optional(),
    data: z.record(z.unknown()).optional(),
    error: z.string().optional(),
    processingTimeMs: z.number().optional(),
});
// Job metadata (stored in DB)
export const JobMetadataSchema = z.object({
    id: JobIdSchema,
    tenantId: TenantIdSchema,
    type: QueueNameSchema,
    status: JobStatusSchema,
    payload: z.record(z.unknown()),
    result: JobResultSchema.nullable(),
    idempotencyKeyId: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    completedAt: z.date().nullable(),
});
// Enqueue job request
export const EnqueueJobRequestSchema = z.object({
    payload: JobPayloadSchema,
    idempotencyKey: z.string().optional(),
});
//# sourceMappingURL=jobs.js.map