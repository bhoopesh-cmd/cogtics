import { z } from 'zod';
import { TenantIdSchema, generateId } from './ids.js';
export const createExportId = () => generateId('exp');
export const createExportFileId = () => generateId('expf');
export const createExportItemId = () => generateId('expi');
export const createExportScheduleId = () => generateId('exps');
export const createExportRunId = () => generateId('expr');
export const createExportAuditId = () => generateId('expa');
export const createDigestSubscriptionId = () => generateId('digs');
export const createDigestRunId = () => generateId('digr');
// ID validation schemas
const ID_PATTERNS = {
    export: /^exp_[a-zA-Z0-9]+$/,
    exportFile: /^expf_[a-zA-Z0-9]+$/,
    exportItem: /^expi_[a-zA-Z0-9]+$/,
    exportSchedule: /^exps_[a-zA-Z0-9]+$/,
    exportRun: /^expr_[a-zA-Z0-9]+$/,
    exportAudit: /^expa_[a-zA-Z0-9]+$/,
    digestSubscription: /^digs_[a-zA-Z0-9]+$/,
    digestRun: /^digr_[a-zA-Z0-9]+$/,
};
export const ExportIdSchema = z
    .string()
    .regex(ID_PATTERNS.export, 'Invalid export ID format')
    .transform((v) => v);
export const ExportFileIdSchema = z
    .string()
    .regex(ID_PATTERNS.exportFile, 'Invalid export file ID format')
    .transform((v) => v);
export const DigestSubscriptionIdSchema = z
    .string()
    .regex(ID_PATTERNS.digestSubscription, 'Invalid digest subscription ID format')
    .transform((v) => v);
export const DigestRunIdSchema = z
    .string()
    .regex(ID_PATTERNS.digestRun, 'Invalid digest run ID format')
    .transform((v) => v);
// ============================================
// Export Enums
// ============================================
export const ExportTypeSchema = z.enum([
    'issues_csv',
    'revrec_csv',
    'contracts_csv',
    'contracts_pdf',
    'audit_bundle_pdf',
    'executive_summary_pdf',
]);
export const ExportFormatSchema = z.enum(['csv', 'pdf', 'xlsx']);
export const ExportStatusSchema = z.enum([
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled',
]);
export const CadenceSchema = z.enum(['daily', 'weekly', 'monthly']);
export const ExportAuditActionSchema = z.enum([
    'requested',
    'started',
    'completed',
    'failed',
    'downloaded',
    'regenerated',
    'cancelled',
    'deleted',
]);
export const DigestRunStatusSchema = z.enum([
    'pending',
    'running',
    'completed',
    'failed',
    'skipped',
]);
// ============================================
// Export Schemas
// ============================================
export const ExportOptionsSchema = z.object({
    includeEvidence: z.boolean().default(false),
    dateRange: z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
    }).optional(),
    filters: z.record(z.unknown()).optional(),
    compression: z.boolean().default(false),
});
export const ExportSchema = z.object({
    id: z.string(),
    tenantId: z.string(),
    snapshotId: z.string(),
    exportType: ExportTypeSchema,
    format: ExportFormatSchema,
    status: ExportStatusSchema,
    requestedBy: z.string().nullable(),
    options: ExportOptionsSchema.optional(),
    errorCode: z.string().nullable(),
    errorMessage: z.string().nullable(),
    processingLock: z.string().datetime().nullable().optional(),
    createdAt: z.string().datetime(),
    completedAt: z.string().datetime().nullable(),
});
export const ExportFileSchema = z.object({
    id: z.string(),
    tenantId: z.string(),
    exportId: z.string(),
    s3Key: z.string(),
    fileName: z.string(),
    contentType: z.string(),
    sizeBytes: z.number(),
    checksumSha256: z.string().nullable(),
    createdAt: z.string().datetime(),
});
export const ExportItemSchema = z.object({
    id: z.string(),
    tenantId: z.string(),
    exportId: z.string(),
    itemType: z.string(),
    itemId: z.string(),
    metadata: z.record(z.unknown()).optional(),
    createdAt: z.string().datetime(),
});
export const ExportScheduleSchema = z.object({
    id: z.string(),
    tenantId: z.string(),
    name: z.string(),
    exportType: ExportTypeSchema,
    cadence: CadenceSchema,
    scope: z.record(z.unknown()).optional(),
    isActive: z.boolean(),
    createdBy: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});
export const ExportRunSchema = z.object({
    id: z.string(),
    tenantId: z.string(),
    scheduleId: z.string(),
    exportId: z.string().nullable(),
    status: z.enum(['pending', 'running', 'completed', 'failed']),
    startedAt: z.string().datetime().nullable(),
    finishedAt: z.string().datetime().nullable(),
    errorCode: z.string().nullable(),
    errorMessage: z.string().nullable(),
    createdAt: z.string().datetime(),
});
export const ExportAuditSchema = z.object({
    id: z.string(),
    tenantId: z.string(),
    exportId: z.string(),
    action: ExportAuditActionSchema,
    actorUserId: z.string().nullable(),
    details: z.record(z.unknown()).optional(),
    createdAt: z.string().datetime(),
});
// ============================================
// Digest Schemas
// ============================================
export const DigestScopeSchema = z.object({
    issuesSeverity: z.array(z.enum(['low', 'medium', 'high', 'critical'])).optional(),
    issuesCategories: z.array(z.string()).optional(),
    includeResolved: z.boolean().default(false),
    includeSimulationDeltas: z.boolean().default(true),
    deltaThreshold: z.number().optional(),
});
export const DigestSubscriptionSchema = z.object({
    id: z.string(),
    tenantId: z.string(),
    name: z.string(),
    cadence: CadenceSchema,
    scope: DigestScopeSchema.optional(),
    recipients: z.array(z.string().email()),
    isActive: z.boolean(),
    createdBy: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});
export const DigestRunSchema = z.object({
    id: z.string(),
    tenantId: z.string(),
    subscriptionId: z.string(),
    status: DigestRunStatusSchema,
    itemsCount: z.number(),
    recipientsCount: z.number(),
    emailsSent: z.number(),
    emailsFailed: z.number(),
    snapshotId: z.string().nullable(),
    periodStart: z.string().datetime().nullable(),
    periodEnd: z.string().datetime().nullable(),
    startedAt: z.string().datetime().nullable(),
    finishedAt: z.string().datetime().nullable(),
    errorCode: z.string().nullable(),
    errorMessage: z.string().nullable(),
    content: z.record(z.unknown()).optional(),
    createdAt: z.string().datetime(),
});
// ============================================
// API Request/Response Schemas
// ============================================
export const CreateExportRequestSchema = z.object({
    snapshotId: z.string(),
    exportType: ExportTypeSchema,
    options: ExportOptionsSchema.optional(),
});
export const ExportListQuerySchema = z.object({
    snapshotId: z.string().optional(),
    exportType: ExportTypeSchema.optional(),
    status: ExportStatusSchema.optional(),
    limit: z.coerce.number().min(1).max(100).default(20),
    offset: z.coerce.number().min(0).default(0),
});
export const ExportListResponseSchema = z.object({
    exports: z.array(ExportSchema),
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
});
export const ExportDetailResponseSchema = z.object({
    export: ExportSchema,
    files: z.array(ExportFileSchema),
});
export const ExportDownloadResponseSchema = z.object({
    downloadUrl: z.string().url(),
    expiresAt: z.string().datetime(),
    fileName: z.string(),
    contentType: z.string(),
    sizeBytes: z.number(),
});
export const CreateDigestSubscriptionRequestSchema = z.object({
    name: z.string().min(1).max(100),
    cadence: CadenceSchema,
    scope: DigestScopeSchema.optional(),
    recipients: z.array(z.string().email()).min(1),
});
export const UpdateDigestSubscriptionRequestSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    cadence: CadenceSchema.optional(),
    scope: DigestScopeSchema.optional(),
    recipients: z.array(z.string().email()).optional(),
    isActive: z.boolean().optional(),
});
export const DigestListQuerySchema = z.object({
    isActive: z.coerce.boolean().optional(),
    cadence: CadenceSchema.optional(),
    limit: z.coerce.number().min(1).max(100).default(20),
    offset: z.coerce.number().min(0).default(0),
});
export const DigestListResponseSchema = z.object({
    subscriptions: z.array(DigestSubscriptionSchema),
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
});
export const DigestRunListResponseSchema = z.object({
    runs: z.array(DigestRunSchema),
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
});
// ============================================
// Job Payloads
// ============================================
const BaseJobPayload = z.object({
    tenantId: TenantIdSchema,
    requestId: z.string().optional(),
    idempotencyKey: z.string().optional(),
});
export const ExportCsvGenerateJobPayloadSchema = BaseJobPayload.extend({
    type: z.literal('export.csv.generate'),
    exportId: z.string(),
    snapshotId: z.string(),
    exportType: ExportTypeSchema,
    options: ExportOptionsSchema.optional(),
});
export const ExportPdfRenderJobPayloadSchema = BaseJobPayload.extend({
    type: z.literal('export.pdf.render'),
    exportId: z.string(),
    snapshotId: z.string(),
    exportType: ExportTypeSchema,
    templateName: z.string(),
    options: ExportOptionsSchema.optional(),
});
export const DigestSendJobPayloadSchema = BaseJobPayload.extend({
    type: z.literal('digest.send'),
    subscriptionId: z.string(),
    runId: z.string(),
});
// ============================================
// CSV Column Definitions
// ============================================
export const IssuesCsvColumnsSchema = z.object({
    id: z.string(),
    severity: z.string(),
    category: z.string(),
    status: z.string(),
    ruleId: z.string(),
    message: z.string().optional(),
    confidence: z.number(),
    impactAmount: z.number().nullable(),
    currency: z.string(),
    contractId: z.string().nullable(),
    customerId: z.string().nullable(),
    createdAt: z.string(),
});
export const RevRecCsvColumnsSchema = z.object({
    contractId: z.string(),
    obligationId: z.string(),
    periodStart: z.string(),
    periodEnd: z.string(),
    scheduledAmount: z.number(),
    recognizedAmount: z.number(),
    deferredAmount: z.number(),
    status: z.string(),
    recognitionMethod: z.string(),
});
export const ContractsCsvColumnsSchema = z.object({
    id: z.string(),
    name: z.string().nullable(),
    customerId: z.string().nullable(),
    status: z.string(),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
    arr: z.number().nullable(),
    currency: z.string(),
    billingFrequency: z.string().nullable(),
    autoRenew: z.boolean(),
    readinessScore: z.number().nullable(),
    readinessStatus: z.string().nullable(),
});
// ============================================
// Digest Content Schemas
// ============================================
export const DigestContentSchema = z.object({
    periodLabel: z.string(),
    issuesSummary: z.object({
        newIssues: z.number(),
        resolvedIssues: z.number(),
        totalOpen: z.number(),
        bySeverity: z.record(z.number()),
        byCategory: z.record(z.number()),
        highImpactItems: z.array(z.object({
            issueId: z.string(),
            severity: z.string(),
            category: z.string(),
            impactAmount: z.number().nullable(),
            message: z.string().optional(),
        })),
    }),
    simulationDeltas: z.array(z.object({
        simulationId: z.string(),
        simulationName: z.string(),
        totalDelta: z.number(),
        deltaPct: z.number().nullable(),
    })).optional(),
    snapshotId: z.string().nullable(),
    generatedAt: z.string().datetime(),
});
//# sourceMappingURL=exports.js.map