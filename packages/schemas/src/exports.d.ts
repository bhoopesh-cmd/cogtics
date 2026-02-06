import { z } from 'zod';
declare const brand: unique symbol;
type Brand<T, B> = T & {
    readonly [brand]: B;
};
export type ExportId = Brand<string, 'ExportId'>;
export type ExportFileId = Brand<string, 'ExportFileId'>;
export type ExportItemId = Brand<string, 'ExportItemId'>;
export type ExportScheduleId = Brand<string, 'ExportScheduleId'>;
export type ExportRunId = Brand<string, 'ExportRunId'>;
export type ExportAuditId = Brand<string, 'ExportAuditId'>;
export type DigestSubscriptionId = Brand<string, 'DigestSubscriptionId'>;
export type DigestRunId = Brand<string, 'DigestRunId'>;
export declare const createExportId: () => ExportId;
export declare const createExportFileId: () => ExportFileId;
export declare const createExportItemId: () => ExportItemId;
export declare const createExportScheduleId: () => ExportScheduleId;
export declare const createExportRunId: () => ExportRunId;
export declare const createExportAuditId: () => ExportAuditId;
export declare const createDigestSubscriptionId: () => DigestSubscriptionId;
export declare const createDigestRunId: () => DigestRunId;
export declare const ExportIdSchema: z.ZodEffects<z.ZodString, ExportId, string>;
export declare const ExportFileIdSchema: z.ZodEffects<z.ZodString, ExportFileId, string>;
export declare const DigestSubscriptionIdSchema: z.ZodEffects<z.ZodString, DigestSubscriptionId, string>;
export declare const DigestRunIdSchema: z.ZodEffects<z.ZodString, DigestRunId, string>;
export declare const ExportTypeSchema: z.ZodEnum<["issues_csv", "revrec_csv", "contracts_csv", "contracts_pdf", "audit_bundle_pdf", "executive_summary_pdf"]>;
export type ExportType = z.infer<typeof ExportTypeSchema>;
export declare const ExportFormatSchema: z.ZodEnum<["csv", "pdf", "xlsx"]>;
export type ExportFormat = z.infer<typeof ExportFormatSchema>;
export declare const ExportStatusSchema: z.ZodEnum<["pending", "processing", "completed", "failed", "cancelled"]>;
export type ExportStatus = z.infer<typeof ExportStatusSchema>;
export declare const CadenceSchema: z.ZodEnum<["daily", "weekly", "monthly"]>;
export type Cadence = z.infer<typeof CadenceSchema>;
export declare const ExportAuditActionSchema: z.ZodEnum<["requested", "started", "completed", "failed", "downloaded", "regenerated", "cancelled", "deleted"]>;
export type ExportAuditAction = z.infer<typeof ExportAuditActionSchema>;
export declare const DigestRunStatusSchema: z.ZodEnum<["pending", "running", "completed", "failed", "skipped"]>;
export type DigestRunStatus = z.infer<typeof DigestRunStatusSchema>;
export declare const ExportOptionsSchema: z.ZodObject<{
    includeEvidence: z.ZodDefault<z.ZodBoolean>;
    dateRange: z.ZodOptional<z.ZodObject<{
        start: z.ZodString;
        end: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        start: string;
        end: string;
    }, {
        start: string;
        end: string;
    }>>;
    filters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    compression: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    includeEvidence: boolean;
    compression: boolean;
    dateRange?: {
        start: string;
        end: string;
    } | undefined;
    filters?: Record<string, unknown> | undefined;
}, {
    includeEvidence?: boolean | undefined;
    dateRange?: {
        start: string;
        end: string;
    } | undefined;
    filters?: Record<string, unknown> | undefined;
    compression?: boolean | undefined;
}>;
export type ExportOptions = z.infer<typeof ExportOptionsSchema>;
export declare const ExportSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    snapshotId: z.ZodString;
    exportType: z.ZodEnum<["issues_csv", "revrec_csv", "contracts_csv", "contracts_pdf", "audit_bundle_pdf", "executive_summary_pdf"]>;
    format: z.ZodEnum<["csv", "pdf", "xlsx"]>;
    status: z.ZodEnum<["pending", "processing", "completed", "failed", "cancelled"]>;
    requestedBy: z.ZodNullable<z.ZodString>;
    options: z.ZodOptional<z.ZodObject<{
        includeEvidence: z.ZodDefault<z.ZodBoolean>;
        dateRange: z.ZodOptional<z.ZodObject<{
            start: z.ZodString;
            end: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            start: string;
            end: string;
        }, {
            start: string;
            end: string;
        }>>;
        filters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        compression: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        includeEvidence: boolean;
        compression: boolean;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
        filters?: Record<string, unknown> | undefined;
    }, {
        includeEvidence?: boolean | undefined;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
        filters?: Record<string, unknown> | undefined;
        compression?: boolean | undefined;
    }>>;
    errorCode: z.ZodNullable<z.ZodString>;
    errorMessage: z.ZodNullable<z.ZodString>;
    processingLock: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodString;
    completedAt: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "completed" | "failed" | "processing" | "cancelled";
    id: string;
    snapshotId: string;
    tenantId: string;
    createdAt: string;
    errorCode: string | null;
    errorMessage: string | null;
    exportType: "issues_csv" | "revrec_csv" | "contracts_csv" | "contracts_pdf" | "audit_bundle_pdf" | "executive_summary_pdf";
    format: "csv" | "pdf" | "xlsx";
    requestedBy: string | null;
    completedAt: string | null;
    options?: {
        includeEvidence: boolean;
        compression: boolean;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
        filters?: Record<string, unknown> | undefined;
    } | undefined;
    processingLock?: string | null | undefined;
}, {
    status: "pending" | "completed" | "failed" | "processing" | "cancelled";
    id: string;
    snapshotId: string;
    tenantId: string;
    createdAt: string;
    errorCode: string | null;
    errorMessage: string | null;
    exportType: "issues_csv" | "revrec_csv" | "contracts_csv" | "contracts_pdf" | "audit_bundle_pdf" | "executive_summary_pdf";
    format: "csv" | "pdf" | "xlsx";
    requestedBy: string | null;
    completedAt: string | null;
    options?: {
        includeEvidence?: boolean | undefined;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
        filters?: Record<string, unknown> | undefined;
        compression?: boolean | undefined;
    } | undefined;
    processingLock?: string | null | undefined;
}>;
export type Export = z.infer<typeof ExportSchema>;
export declare const ExportFileSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    exportId: z.ZodString;
    s3Key: z.ZodString;
    fileName: z.ZodString;
    contentType: z.ZodString;
    sizeBytes: z.ZodNumber;
    checksumSha256: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenantId: string;
    fileName: string;
    contentType: string;
    s3Key: string;
    createdAt: string;
    exportId: string;
    sizeBytes: number;
    checksumSha256: string | null;
}, {
    id: string;
    tenantId: string;
    fileName: string;
    contentType: string;
    s3Key: string;
    createdAt: string;
    exportId: string;
    sizeBytes: number;
    checksumSha256: string | null;
}>;
export type ExportFile = z.infer<typeof ExportFileSchema>;
export declare const ExportItemSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    exportId: z.ZodString;
    itemType: z.ZodString;
    itemId: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenantId: string;
    createdAt: string;
    exportId: string;
    itemType: string;
    itemId: string;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    tenantId: string;
    createdAt: string;
    exportId: string;
    itemType: string;
    itemId: string;
    metadata?: Record<string, unknown> | undefined;
}>;
export type ExportItem = z.infer<typeof ExportItemSchema>;
export declare const ExportScheduleSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    name: z.ZodString;
    exportType: z.ZodEnum<["issues_csv", "revrec_csv", "contracts_csv", "contracts_pdf", "audit_bundle_pdf", "executive_summary_pdf"]>;
    cadence: z.ZodEnum<["daily", "weekly", "monthly"]>;
    scope: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    isActive: z.ZodBoolean;
    createdBy: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenantId: string;
    name: string;
    cadence: "monthly" | "daily" | "weekly";
    createdAt: string;
    updatedAt: string;
    createdBy: string | null;
    isActive: boolean;
    exportType: "issues_csv" | "revrec_csv" | "contracts_csv" | "contracts_pdf" | "audit_bundle_pdf" | "executive_summary_pdf";
    scope?: Record<string, unknown> | undefined;
}, {
    id: string;
    tenantId: string;
    name: string;
    cadence: "monthly" | "daily" | "weekly";
    createdAt: string;
    updatedAt: string;
    createdBy: string | null;
    isActive: boolean;
    exportType: "issues_csv" | "revrec_csv" | "contracts_csv" | "contracts_pdf" | "audit_bundle_pdf" | "executive_summary_pdf";
    scope?: Record<string, unknown> | undefined;
}>;
export type ExportSchedule = z.infer<typeof ExportScheduleSchema>;
export declare const ExportRunSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    scheduleId: z.ZodString;
    exportId: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["pending", "running", "completed", "failed"]>;
    startedAt: z.ZodNullable<z.ZodString>;
    finishedAt: z.ZodNullable<z.ZodString>;
    errorCode: z.ZodNullable<z.ZodString>;
    errorMessage: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "running" | "completed" | "failed";
    id: string;
    tenantId: string;
    createdAt: string;
    scheduleId: string;
    errorCode: string | null;
    errorMessage: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    exportId: string | null;
}, {
    status: "pending" | "running" | "completed" | "failed";
    id: string;
    tenantId: string;
    createdAt: string;
    scheduleId: string;
    errorCode: string | null;
    errorMessage: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    exportId: string | null;
}>;
export type ExportRun = z.infer<typeof ExportRunSchema>;
export declare const ExportAuditSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    exportId: z.ZodString;
    action: z.ZodEnum<["requested", "started", "completed", "failed", "downloaded", "regenerated", "cancelled", "deleted"]>;
    actorUserId: z.ZodNullable<z.ZodString>;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenantId: string;
    createdAt: string;
    actorUserId: string | null;
    action: "completed" | "failed" | "cancelled" | "regenerated" | "deleted" | "requested" | "started" | "downloaded";
    exportId: string;
    details?: Record<string, unknown> | undefined;
}, {
    id: string;
    tenantId: string;
    createdAt: string;
    actorUserId: string | null;
    action: "completed" | "failed" | "cancelled" | "regenerated" | "deleted" | "requested" | "started" | "downloaded";
    exportId: string;
    details?: Record<string, unknown> | undefined;
}>;
export type ExportAudit = z.infer<typeof ExportAuditSchema>;
export declare const DigestScopeSchema: z.ZodObject<{
    issuesSeverity: z.ZodOptional<z.ZodArray<z.ZodEnum<["low", "medium", "high", "critical"]>, "many">>;
    issuesCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    includeResolved: z.ZodDefault<z.ZodBoolean>;
    includeSimulationDeltas: z.ZodDefault<z.ZodBoolean>;
    deltaThreshold: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    includeResolved: boolean;
    includeSimulationDeltas: boolean;
    issuesSeverity?: ("low" | "medium" | "high" | "critical")[] | undefined;
    issuesCategories?: string[] | undefined;
    deltaThreshold?: number | undefined;
}, {
    issuesSeverity?: ("low" | "medium" | "high" | "critical")[] | undefined;
    issuesCategories?: string[] | undefined;
    includeResolved?: boolean | undefined;
    includeSimulationDeltas?: boolean | undefined;
    deltaThreshold?: number | undefined;
}>;
export type DigestScope = z.infer<typeof DigestScopeSchema>;
export declare const DigestSubscriptionSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    name: z.ZodString;
    cadence: z.ZodEnum<["daily", "weekly", "monthly"]>;
    scope: z.ZodOptional<z.ZodObject<{
        issuesSeverity: z.ZodOptional<z.ZodArray<z.ZodEnum<["low", "medium", "high", "critical"]>, "many">>;
        issuesCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        includeResolved: z.ZodDefault<z.ZodBoolean>;
        includeSimulationDeltas: z.ZodDefault<z.ZodBoolean>;
        deltaThreshold: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        includeResolved: boolean;
        includeSimulationDeltas: boolean;
        issuesSeverity?: ("low" | "medium" | "high" | "critical")[] | undefined;
        issuesCategories?: string[] | undefined;
        deltaThreshold?: number | undefined;
    }, {
        issuesSeverity?: ("low" | "medium" | "high" | "critical")[] | undefined;
        issuesCategories?: string[] | undefined;
        includeResolved?: boolean | undefined;
        includeSimulationDeltas?: boolean | undefined;
        deltaThreshold?: number | undefined;
    }>>;
    recipients: z.ZodArray<z.ZodString, "many">;
    isActive: z.ZodBoolean;
    createdBy: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenantId: string;
    name: string;
    cadence: "monthly" | "daily" | "weekly";
    createdAt: string;
    updatedAt: string;
    createdBy: string | null;
    isActive: boolean;
    recipients: string[];
    scope?: {
        includeResolved: boolean;
        includeSimulationDeltas: boolean;
        issuesSeverity?: ("low" | "medium" | "high" | "critical")[] | undefined;
        issuesCategories?: string[] | undefined;
        deltaThreshold?: number | undefined;
    } | undefined;
}, {
    id: string;
    tenantId: string;
    name: string;
    cadence: "monthly" | "daily" | "weekly";
    createdAt: string;
    updatedAt: string;
    createdBy: string | null;
    isActive: boolean;
    recipients: string[];
    scope?: {
        issuesSeverity?: ("low" | "medium" | "high" | "critical")[] | undefined;
        issuesCategories?: string[] | undefined;
        includeResolved?: boolean | undefined;
        includeSimulationDeltas?: boolean | undefined;
        deltaThreshold?: number | undefined;
    } | undefined;
}>;
export type DigestSubscription = z.infer<typeof DigestSubscriptionSchema>;
export declare const DigestRunSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    subscriptionId: z.ZodString;
    status: z.ZodEnum<["pending", "running", "completed", "failed", "skipped"]>;
    itemsCount: z.ZodNumber;
    recipientsCount: z.ZodNumber;
    emailsSent: z.ZodNumber;
    emailsFailed: z.ZodNumber;
    snapshotId: z.ZodNullable<z.ZodString>;
    periodStart: z.ZodNullable<z.ZodString>;
    periodEnd: z.ZodNullable<z.ZodString>;
    startedAt: z.ZodNullable<z.ZodString>;
    finishedAt: z.ZodNullable<z.ZodString>;
    errorCode: z.ZodNullable<z.ZodString>;
    errorMessage: z.ZodNullable<z.ZodString>;
    content: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "running" | "completed" | "failed" | "skipped";
    id: string;
    snapshotId: string | null;
    tenantId: string;
    createdAt: string;
    periodStart: string | null;
    periodEnd: string | null;
    errorCode: string | null;
    errorMessage: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    subscriptionId: string;
    itemsCount: number;
    recipientsCount: number;
    emailsSent: number;
    emailsFailed: number;
    content?: Record<string, unknown> | undefined;
}, {
    status: "pending" | "running" | "completed" | "failed" | "skipped";
    id: string;
    snapshotId: string | null;
    tenantId: string;
    createdAt: string;
    periodStart: string | null;
    periodEnd: string | null;
    errorCode: string | null;
    errorMessage: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    subscriptionId: string;
    itemsCount: number;
    recipientsCount: number;
    emailsSent: number;
    emailsFailed: number;
    content?: Record<string, unknown> | undefined;
}>;
export type DigestRun = z.infer<typeof DigestRunSchema>;
export declare const CreateExportRequestSchema: z.ZodObject<{
    snapshotId: z.ZodString;
    exportType: z.ZodEnum<["issues_csv", "revrec_csv", "contracts_csv", "contracts_pdf", "audit_bundle_pdf", "executive_summary_pdf"]>;
    options: z.ZodOptional<z.ZodObject<{
        includeEvidence: z.ZodDefault<z.ZodBoolean>;
        dateRange: z.ZodOptional<z.ZodObject<{
            start: z.ZodString;
            end: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            start: string;
            end: string;
        }, {
            start: string;
            end: string;
        }>>;
        filters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        compression: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        includeEvidence: boolean;
        compression: boolean;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
        filters?: Record<string, unknown> | undefined;
    }, {
        includeEvidence?: boolean | undefined;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
        filters?: Record<string, unknown> | undefined;
        compression?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    snapshotId: string;
    exportType: "issues_csv" | "revrec_csv" | "contracts_csv" | "contracts_pdf" | "audit_bundle_pdf" | "executive_summary_pdf";
    options?: {
        includeEvidence: boolean;
        compression: boolean;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
        filters?: Record<string, unknown> | undefined;
    } | undefined;
}, {
    snapshotId: string;
    exportType: "issues_csv" | "revrec_csv" | "contracts_csv" | "contracts_pdf" | "audit_bundle_pdf" | "executive_summary_pdf";
    options?: {
        includeEvidence?: boolean | undefined;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
        filters?: Record<string, unknown> | undefined;
        compression?: boolean | undefined;
    } | undefined;
}>;
export type CreateExportRequest = z.infer<typeof CreateExportRequestSchema>;
export declare const ExportListQuerySchema: z.ZodObject<{
    snapshotId: z.ZodOptional<z.ZodString>;
    exportType: z.ZodOptional<z.ZodEnum<["issues_csv", "revrec_csv", "contracts_csv", "contracts_pdf", "audit_bundle_pdf", "executive_summary_pdf"]>>;
    status: z.ZodOptional<z.ZodEnum<["pending", "processing", "completed", "failed", "cancelled"]>>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    status?: "pending" | "completed" | "failed" | "processing" | "cancelled" | undefined;
    snapshotId?: string | undefined;
    exportType?: "issues_csv" | "revrec_csv" | "contracts_csv" | "contracts_pdf" | "audit_bundle_pdf" | "executive_summary_pdf" | undefined;
}, {
    status?: "pending" | "completed" | "failed" | "processing" | "cancelled" | undefined;
    snapshotId?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    exportType?: "issues_csv" | "revrec_csv" | "contracts_csv" | "contracts_pdf" | "audit_bundle_pdf" | "executive_summary_pdf" | undefined;
}>;
export type ExportListQuery = z.infer<typeof ExportListQuerySchema>;
export declare const ExportListResponseSchema: z.ZodObject<{
    exports: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        tenantId: z.ZodString;
        snapshotId: z.ZodString;
        exportType: z.ZodEnum<["issues_csv", "revrec_csv", "contracts_csv", "contracts_pdf", "audit_bundle_pdf", "executive_summary_pdf"]>;
        format: z.ZodEnum<["csv", "pdf", "xlsx"]>;
        status: z.ZodEnum<["pending", "processing", "completed", "failed", "cancelled"]>;
        requestedBy: z.ZodNullable<z.ZodString>;
        options: z.ZodOptional<z.ZodObject<{
            includeEvidence: z.ZodDefault<z.ZodBoolean>;
            dateRange: z.ZodOptional<z.ZodObject<{
                start: z.ZodString;
                end: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                start: string;
                end: string;
            }, {
                start: string;
                end: string;
            }>>;
            filters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            compression: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            includeEvidence: boolean;
            compression: boolean;
            dateRange?: {
                start: string;
                end: string;
            } | undefined;
            filters?: Record<string, unknown> | undefined;
        }, {
            includeEvidence?: boolean | undefined;
            dateRange?: {
                start: string;
                end: string;
            } | undefined;
            filters?: Record<string, unknown> | undefined;
            compression?: boolean | undefined;
        }>>;
        errorCode: z.ZodNullable<z.ZodString>;
        errorMessage: z.ZodNullable<z.ZodString>;
        processingLock: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        createdAt: z.ZodString;
        completedAt: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "pending" | "completed" | "failed" | "processing" | "cancelled";
        id: string;
        snapshotId: string;
        tenantId: string;
        createdAt: string;
        errorCode: string | null;
        errorMessage: string | null;
        exportType: "issues_csv" | "revrec_csv" | "contracts_csv" | "contracts_pdf" | "audit_bundle_pdf" | "executive_summary_pdf";
        format: "csv" | "pdf" | "xlsx";
        requestedBy: string | null;
        completedAt: string | null;
        options?: {
            includeEvidence: boolean;
            compression: boolean;
            dateRange?: {
                start: string;
                end: string;
            } | undefined;
            filters?: Record<string, unknown> | undefined;
        } | undefined;
        processingLock?: string | null | undefined;
    }, {
        status: "pending" | "completed" | "failed" | "processing" | "cancelled";
        id: string;
        snapshotId: string;
        tenantId: string;
        createdAt: string;
        errorCode: string | null;
        errorMessage: string | null;
        exportType: "issues_csv" | "revrec_csv" | "contracts_csv" | "contracts_pdf" | "audit_bundle_pdf" | "executive_summary_pdf";
        format: "csv" | "pdf" | "xlsx";
        requestedBy: string | null;
        completedAt: string | null;
        options?: {
            includeEvidence?: boolean | undefined;
            dateRange?: {
                start: string;
                end: string;
            } | undefined;
            filters?: Record<string, unknown> | undefined;
            compression?: boolean | undefined;
        } | undefined;
        processingLock?: string | null | undefined;
    }>, "many">;
    total: z.ZodNumber;
    limit: z.ZodNumber;
    offset: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    total: number;
    exports: {
        status: "pending" | "completed" | "failed" | "processing" | "cancelled";
        id: string;
        snapshotId: string;
        tenantId: string;
        createdAt: string;
        errorCode: string | null;
        errorMessage: string | null;
        exportType: "issues_csv" | "revrec_csv" | "contracts_csv" | "contracts_pdf" | "audit_bundle_pdf" | "executive_summary_pdf";
        format: "csv" | "pdf" | "xlsx";
        requestedBy: string | null;
        completedAt: string | null;
        options?: {
            includeEvidence: boolean;
            compression: boolean;
            dateRange?: {
                start: string;
                end: string;
            } | undefined;
            filters?: Record<string, unknown> | undefined;
        } | undefined;
        processingLock?: string | null | undefined;
    }[];
}, {
    limit: number;
    offset: number;
    total: number;
    exports: {
        status: "pending" | "completed" | "failed" | "processing" | "cancelled";
        id: string;
        snapshotId: string;
        tenantId: string;
        createdAt: string;
        errorCode: string | null;
        errorMessage: string | null;
        exportType: "issues_csv" | "revrec_csv" | "contracts_csv" | "contracts_pdf" | "audit_bundle_pdf" | "executive_summary_pdf";
        format: "csv" | "pdf" | "xlsx";
        requestedBy: string | null;
        completedAt: string | null;
        options?: {
            includeEvidence?: boolean | undefined;
            dateRange?: {
                start: string;
                end: string;
            } | undefined;
            filters?: Record<string, unknown> | undefined;
            compression?: boolean | undefined;
        } | undefined;
        processingLock?: string | null | undefined;
    }[];
}>;
export type ExportListResponse = z.infer<typeof ExportListResponseSchema>;
export declare const ExportDetailResponseSchema: z.ZodObject<{
    export: z.ZodObject<{
        id: z.ZodString;
        tenantId: z.ZodString;
        snapshotId: z.ZodString;
        exportType: z.ZodEnum<["issues_csv", "revrec_csv", "contracts_csv", "contracts_pdf", "audit_bundle_pdf", "executive_summary_pdf"]>;
        format: z.ZodEnum<["csv", "pdf", "xlsx"]>;
        status: z.ZodEnum<["pending", "processing", "completed", "failed", "cancelled"]>;
        requestedBy: z.ZodNullable<z.ZodString>;
        options: z.ZodOptional<z.ZodObject<{
            includeEvidence: z.ZodDefault<z.ZodBoolean>;
            dateRange: z.ZodOptional<z.ZodObject<{
                start: z.ZodString;
                end: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                start: string;
                end: string;
            }, {
                start: string;
                end: string;
            }>>;
            filters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            compression: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            includeEvidence: boolean;
            compression: boolean;
            dateRange?: {
                start: string;
                end: string;
            } | undefined;
            filters?: Record<string, unknown> | undefined;
        }, {
            includeEvidence?: boolean | undefined;
            dateRange?: {
                start: string;
                end: string;
            } | undefined;
            filters?: Record<string, unknown> | undefined;
            compression?: boolean | undefined;
        }>>;
        errorCode: z.ZodNullable<z.ZodString>;
        errorMessage: z.ZodNullable<z.ZodString>;
        processingLock: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        createdAt: z.ZodString;
        completedAt: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "pending" | "completed" | "failed" | "processing" | "cancelled";
        id: string;
        snapshotId: string;
        tenantId: string;
        createdAt: string;
        errorCode: string | null;
        errorMessage: string | null;
        exportType: "issues_csv" | "revrec_csv" | "contracts_csv" | "contracts_pdf" | "audit_bundle_pdf" | "executive_summary_pdf";
        format: "csv" | "pdf" | "xlsx";
        requestedBy: string | null;
        completedAt: string | null;
        options?: {
            includeEvidence: boolean;
            compression: boolean;
            dateRange?: {
                start: string;
                end: string;
            } | undefined;
            filters?: Record<string, unknown> | undefined;
        } | undefined;
        processingLock?: string | null | undefined;
    }, {
        status: "pending" | "completed" | "failed" | "processing" | "cancelled";
        id: string;
        snapshotId: string;
        tenantId: string;
        createdAt: string;
        errorCode: string | null;
        errorMessage: string | null;
        exportType: "issues_csv" | "revrec_csv" | "contracts_csv" | "contracts_pdf" | "audit_bundle_pdf" | "executive_summary_pdf";
        format: "csv" | "pdf" | "xlsx";
        requestedBy: string | null;
        completedAt: string | null;
        options?: {
            includeEvidence?: boolean | undefined;
            dateRange?: {
                start: string;
                end: string;
            } | undefined;
            filters?: Record<string, unknown> | undefined;
            compression?: boolean | undefined;
        } | undefined;
        processingLock?: string | null | undefined;
    }>;
    files: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        tenantId: z.ZodString;
        exportId: z.ZodString;
        s3Key: z.ZodString;
        fileName: z.ZodString;
        contentType: z.ZodString;
        sizeBytes: z.ZodNumber;
        checksumSha256: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        tenantId: string;
        fileName: string;
        contentType: string;
        s3Key: string;
        createdAt: string;
        exportId: string;
        sizeBytes: number;
        checksumSha256: string | null;
    }, {
        id: string;
        tenantId: string;
        fileName: string;
        contentType: string;
        s3Key: string;
        createdAt: string;
        exportId: string;
        sizeBytes: number;
        checksumSha256: string | null;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    export: {
        status: "pending" | "completed" | "failed" | "processing" | "cancelled";
        id: string;
        snapshotId: string;
        tenantId: string;
        createdAt: string;
        errorCode: string | null;
        errorMessage: string | null;
        exportType: "issues_csv" | "revrec_csv" | "contracts_csv" | "contracts_pdf" | "audit_bundle_pdf" | "executive_summary_pdf";
        format: "csv" | "pdf" | "xlsx";
        requestedBy: string | null;
        completedAt: string | null;
        options?: {
            includeEvidence: boolean;
            compression: boolean;
            dateRange?: {
                start: string;
                end: string;
            } | undefined;
            filters?: Record<string, unknown> | undefined;
        } | undefined;
        processingLock?: string | null | undefined;
    };
    files: {
        id: string;
        tenantId: string;
        fileName: string;
        contentType: string;
        s3Key: string;
        createdAt: string;
        exportId: string;
        sizeBytes: number;
        checksumSha256: string | null;
    }[];
}, {
    export: {
        status: "pending" | "completed" | "failed" | "processing" | "cancelled";
        id: string;
        snapshotId: string;
        tenantId: string;
        createdAt: string;
        errorCode: string | null;
        errorMessage: string | null;
        exportType: "issues_csv" | "revrec_csv" | "contracts_csv" | "contracts_pdf" | "audit_bundle_pdf" | "executive_summary_pdf";
        format: "csv" | "pdf" | "xlsx";
        requestedBy: string | null;
        completedAt: string | null;
        options?: {
            includeEvidence?: boolean | undefined;
            dateRange?: {
                start: string;
                end: string;
            } | undefined;
            filters?: Record<string, unknown> | undefined;
            compression?: boolean | undefined;
        } | undefined;
        processingLock?: string | null | undefined;
    };
    files: {
        id: string;
        tenantId: string;
        fileName: string;
        contentType: string;
        s3Key: string;
        createdAt: string;
        exportId: string;
        sizeBytes: number;
        checksumSha256: string | null;
    }[];
}>;
export type ExportDetailResponse = z.infer<typeof ExportDetailResponseSchema>;
export declare const ExportDownloadResponseSchema: z.ZodObject<{
    downloadUrl: z.ZodString;
    expiresAt: z.ZodString;
    fileName: z.ZodString;
    contentType: z.ZodString;
    sizeBytes: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    fileName: string;
    contentType: string;
    downloadUrl: string;
    sizeBytes: number;
    expiresAt: string;
}, {
    fileName: string;
    contentType: string;
    downloadUrl: string;
    sizeBytes: number;
    expiresAt: string;
}>;
export type ExportDownloadResponse = z.infer<typeof ExportDownloadResponseSchema>;
export declare const CreateDigestSubscriptionRequestSchema: z.ZodObject<{
    name: z.ZodString;
    cadence: z.ZodEnum<["daily", "weekly", "monthly"]>;
    scope: z.ZodOptional<z.ZodObject<{
        issuesSeverity: z.ZodOptional<z.ZodArray<z.ZodEnum<["low", "medium", "high", "critical"]>, "many">>;
        issuesCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        includeResolved: z.ZodDefault<z.ZodBoolean>;
        includeSimulationDeltas: z.ZodDefault<z.ZodBoolean>;
        deltaThreshold: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        includeResolved: boolean;
        includeSimulationDeltas: boolean;
        issuesSeverity?: ("low" | "medium" | "high" | "critical")[] | undefined;
        issuesCategories?: string[] | undefined;
        deltaThreshold?: number | undefined;
    }, {
        issuesSeverity?: ("low" | "medium" | "high" | "critical")[] | undefined;
        issuesCategories?: string[] | undefined;
        includeResolved?: boolean | undefined;
        includeSimulationDeltas?: boolean | undefined;
        deltaThreshold?: number | undefined;
    }>>;
    recipients: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    name: string;
    cadence: "monthly" | "daily" | "weekly";
    recipients: string[];
    scope?: {
        includeResolved: boolean;
        includeSimulationDeltas: boolean;
        issuesSeverity?: ("low" | "medium" | "high" | "critical")[] | undefined;
        issuesCategories?: string[] | undefined;
        deltaThreshold?: number | undefined;
    } | undefined;
}, {
    name: string;
    cadence: "monthly" | "daily" | "weekly";
    recipients: string[];
    scope?: {
        issuesSeverity?: ("low" | "medium" | "high" | "critical")[] | undefined;
        issuesCategories?: string[] | undefined;
        includeResolved?: boolean | undefined;
        includeSimulationDeltas?: boolean | undefined;
        deltaThreshold?: number | undefined;
    } | undefined;
}>;
export type CreateDigestSubscriptionRequest = z.infer<typeof CreateDigestSubscriptionRequestSchema>;
export declare const UpdateDigestSubscriptionRequestSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    cadence: z.ZodOptional<z.ZodEnum<["daily", "weekly", "monthly"]>>;
    scope: z.ZodOptional<z.ZodObject<{
        issuesSeverity: z.ZodOptional<z.ZodArray<z.ZodEnum<["low", "medium", "high", "critical"]>, "many">>;
        issuesCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        includeResolved: z.ZodDefault<z.ZodBoolean>;
        includeSimulationDeltas: z.ZodDefault<z.ZodBoolean>;
        deltaThreshold: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        includeResolved: boolean;
        includeSimulationDeltas: boolean;
        issuesSeverity?: ("low" | "medium" | "high" | "critical")[] | undefined;
        issuesCategories?: string[] | undefined;
        deltaThreshold?: number | undefined;
    }, {
        issuesSeverity?: ("low" | "medium" | "high" | "critical")[] | undefined;
        issuesCategories?: string[] | undefined;
        includeResolved?: boolean | undefined;
        includeSimulationDeltas?: boolean | undefined;
        deltaThreshold?: number | undefined;
    }>>;
    recipients: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    cadence?: "monthly" | "daily" | "weekly" | undefined;
    isActive?: boolean | undefined;
    scope?: {
        includeResolved: boolean;
        includeSimulationDeltas: boolean;
        issuesSeverity?: ("low" | "medium" | "high" | "critical")[] | undefined;
        issuesCategories?: string[] | undefined;
        deltaThreshold?: number | undefined;
    } | undefined;
    recipients?: string[] | undefined;
}, {
    name?: string | undefined;
    cadence?: "monthly" | "daily" | "weekly" | undefined;
    isActive?: boolean | undefined;
    scope?: {
        issuesSeverity?: ("low" | "medium" | "high" | "critical")[] | undefined;
        issuesCategories?: string[] | undefined;
        includeResolved?: boolean | undefined;
        includeSimulationDeltas?: boolean | undefined;
        deltaThreshold?: number | undefined;
    } | undefined;
    recipients?: string[] | undefined;
}>;
export type UpdateDigestSubscriptionRequest = z.infer<typeof UpdateDigestSubscriptionRequestSchema>;
export declare const DigestListQuerySchema: z.ZodObject<{
    isActive: z.ZodOptional<z.ZodBoolean>;
    cadence: z.ZodOptional<z.ZodEnum<["daily", "weekly", "monthly"]>>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    cadence?: "monthly" | "daily" | "weekly" | undefined;
    isActive?: boolean | undefined;
}, {
    limit?: number | undefined;
    offset?: number | undefined;
    cadence?: "monthly" | "daily" | "weekly" | undefined;
    isActive?: boolean | undefined;
}>;
export type DigestListQuery = z.infer<typeof DigestListQuerySchema>;
export declare const DigestListResponseSchema: z.ZodObject<{
    subscriptions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        tenantId: z.ZodString;
        name: z.ZodString;
        cadence: z.ZodEnum<["daily", "weekly", "monthly"]>;
        scope: z.ZodOptional<z.ZodObject<{
            issuesSeverity: z.ZodOptional<z.ZodArray<z.ZodEnum<["low", "medium", "high", "critical"]>, "many">>;
            issuesCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            includeResolved: z.ZodDefault<z.ZodBoolean>;
            includeSimulationDeltas: z.ZodDefault<z.ZodBoolean>;
            deltaThreshold: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            includeResolved: boolean;
            includeSimulationDeltas: boolean;
            issuesSeverity?: ("low" | "medium" | "high" | "critical")[] | undefined;
            issuesCategories?: string[] | undefined;
            deltaThreshold?: number | undefined;
        }, {
            issuesSeverity?: ("low" | "medium" | "high" | "critical")[] | undefined;
            issuesCategories?: string[] | undefined;
            includeResolved?: boolean | undefined;
            includeSimulationDeltas?: boolean | undefined;
            deltaThreshold?: number | undefined;
        }>>;
        recipients: z.ZodArray<z.ZodString, "many">;
        isActive: z.ZodBoolean;
        createdBy: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        tenantId: string;
        name: string;
        cadence: "monthly" | "daily" | "weekly";
        createdAt: string;
        updatedAt: string;
        createdBy: string | null;
        isActive: boolean;
        recipients: string[];
        scope?: {
            includeResolved: boolean;
            includeSimulationDeltas: boolean;
            issuesSeverity?: ("low" | "medium" | "high" | "critical")[] | undefined;
            issuesCategories?: string[] | undefined;
            deltaThreshold?: number | undefined;
        } | undefined;
    }, {
        id: string;
        tenantId: string;
        name: string;
        cadence: "monthly" | "daily" | "weekly";
        createdAt: string;
        updatedAt: string;
        createdBy: string | null;
        isActive: boolean;
        recipients: string[];
        scope?: {
            issuesSeverity?: ("low" | "medium" | "high" | "critical")[] | undefined;
            issuesCategories?: string[] | undefined;
            includeResolved?: boolean | undefined;
            includeSimulationDeltas?: boolean | undefined;
            deltaThreshold?: number | undefined;
        } | undefined;
    }>, "many">;
    total: z.ZodNumber;
    limit: z.ZodNumber;
    offset: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    total: number;
    subscriptions: {
        id: string;
        tenantId: string;
        name: string;
        cadence: "monthly" | "daily" | "weekly";
        createdAt: string;
        updatedAt: string;
        createdBy: string | null;
        isActive: boolean;
        recipients: string[];
        scope?: {
            includeResolved: boolean;
            includeSimulationDeltas: boolean;
            issuesSeverity?: ("low" | "medium" | "high" | "critical")[] | undefined;
            issuesCategories?: string[] | undefined;
            deltaThreshold?: number | undefined;
        } | undefined;
    }[];
}, {
    limit: number;
    offset: number;
    total: number;
    subscriptions: {
        id: string;
        tenantId: string;
        name: string;
        cadence: "monthly" | "daily" | "weekly";
        createdAt: string;
        updatedAt: string;
        createdBy: string | null;
        isActive: boolean;
        recipients: string[];
        scope?: {
            issuesSeverity?: ("low" | "medium" | "high" | "critical")[] | undefined;
            issuesCategories?: string[] | undefined;
            includeResolved?: boolean | undefined;
            includeSimulationDeltas?: boolean | undefined;
            deltaThreshold?: number | undefined;
        } | undefined;
    }[];
}>;
export type DigestListResponse = z.infer<typeof DigestListResponseSchema>;
export declare const DigestRunListResponseSchema: z.ZodObject<{
    runs: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        tenantId: z.ZodString;
        subscriptionId: z.ZodString;
        status: z.ZodEnum<["pending", "running", "completed", "failed", "skipped"]>;
        itemsCount: z.ZodNumber;
        recipientsCount: z.ZodNumber;
        emailsSent: z.ZodNumber;
        emailsFailed: z.ZodNumber;
        snapshotId: z.ZodNullable<z.ZodString>;
        periodStart: z.ZodNullable<z.ZodString>;
        periodEnd: z.ZodNullable<z.ZodString>;
        startedAt: z.ZodNullable<z.ZodString>;
        finishedAt: z.ZodNullable<z.ZodString>;
        errorCode: z.ZodNullable<z.ZodString>;
        errorMessage: z.ZodNullable<z.ZodString>;
        content: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status: "pending" | "running" | "completed" | "failed" | "skipped";
        id: string;
        snapshotId: string | null;
        tenantId: string;
        createdAt: string;
        periodStart: string | null;
        periodEnd: string | null;
        errorCode: string | null;
        errorMessage: string | null;
        startedAt: string | null;
        finishedAt: string | null;
        subscriptionId: string;
        itemsCount: number;
        recipientsCount: number;
        emailsSent: number;
        emailsFailed: number;
        content?: Record<string, unknown> | undefined;
    }, {
        status: "pending" | "running" | "completed" | "failed" | "skipped";
        id: string;
        snapshotId: string | null;
        tenantId: string;
        createdAt: string;
        periodStart: string | null;
        periodEnd: string | null;
        errorCode: string | null;
        errorMessage: string | null;
        startedAt: string | null;
        finishedAt: string | null;
        subscriptionId: string;
        itemsCount: number;
        recipientsCount: number;
        emailsSent: number;
        emailsFailed: number;
        content?: Record<string, unknown> | undefined;
    }>, "many">;
    total: z.ZodNumber;
    limit: z.ZodNumber;
    offset: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    total: number;
    runs: {
        status: "pending" | "running" | "completed" | "failed" | "skipped";
        id: string;
        snapshotId: string | null;
        tenantId: string;
        createdAt: string;
        periodStart: string | null;
        periodEnd: string | null;
        errorCode: string | null;
        errorMessage: string | null;
        startedAt: string | null;
        finishedAt: string | null;
        subscriptionId: string;
        itemsCount: number;
        recipientsCount: number;
        emailsSent: number;
        emailsFailed: number;
        content?: Record<string, unknown> | undefined;
    }[];
}, {
    limit: number;
    offset: number;
    total: number;
    runs: {
        status: "pending" | "running" | "completed" | "failed" | "skipped";
        id: string;
        snapshotId: string | null;
        tenantId: string;
        createdAt: string;
        periodStart: string | null;
        periodEnd: string | null;
        errorCode: string | null;
        errorMessage: string | null;
        startedAt: string | null;
        finishedAt: string | null;
        subscriptionId: string;
        itemsCount: number;
        recipientsCount: number;
        emailsSent: number;
        emailsFailed: number;
        content?: Record<string, unknown> | undefined;
    }[];
}>;
export type DigestRunListResponse = z.infer<typeof DigestRunListResponseSchema>;
export declare const ExportCsvGenerateJobPayloadSchema: z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, import("./ids.js").TenantId, string>;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"export.csv.generate">;
    exportId: z.ZodString;
    snapshotId: z.ZodString;
    exportType: z.ZodEnum<["issues_csv", "revrec_csv", "contracts_csv", "contracts_pdf", "audit_bundle_pdf", "executive_summary_pdf"]>;
    options: z.ZodOptional<z.ZodObject<{
        includeEvidence: z.ZodDefault<z.ZodBoolean>;
        dateRange: z.ZodOptional<z.ZodObject<{
            start: z.ZodString;
            end: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            start: string;
            end: string;
        }, {
            start: string;
            end: string;
        }>>;
        filters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        compression: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        includeEvidence: boolean;
        compression: boolean;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
        filters?: Record<string, unknown> | undefined;
    }, {
        includeEvidence?: boolean | undefined;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
        filters?: Record<string, unknown> | undefined;
        compression?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "export.csv.generate";
    snapshotId: string;
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    exportType: "issues_csv" | "revrec_csv" | "contracts_csv" | "contracts_pdf" | "audit_bundle_pdf" | "executive_summary_pdf";
    exportId: string;
    options?: {
        includeEvidence: boolean;
        compression: boolean;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
        filters?: Record<string, unknown> | undefined;
    } | undefined;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}, {
    type: "export.csv.generate";
    snapshotId: string;
    tenantId: string;
    exportType: "issues_csv" | "revrec_csv" | "contracts_csv" | "contracts_pdf" | "audit_bundle_pdf" | "executive_summary_pdf";
    exportId: string;
    options?: {
        includeEvidence?: boolean | undefined;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
        filters?: Record<string, unknown> | undefined;
        compression?: boolean | undefined;
    } | undefined;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}>;
export type ExportCsvGenerateJobPayload = z.infer<typeof ExportCsvGenerateJobPayloadSchema>;
export declare const ExportPdfRenderJobPayloadSchema: z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, import("./ids.js").TenantId, string>;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"export.pdf.render">;
    exportId: z.ZodString;
    snapshotId: z.ZodString;
    exportType: z.ZodEnum<["issues_csv", "revrec_csv", "contracts_csv", "contracts_pdf", "audit_bundle_pdf", "executive_summary_pdf"]>;
    templateName: z.ZodString;
    options: z.ZodOptional<z.ZodObject<{
        includeEvidence: z.ZodDefault<z.ZodBoolean>;
        dateRange: z.ZodOptional<z.ZodObject<{
            start: z.ZodString;
            end: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            start: string;
            end: string;
        }, {
            start: string;
            end: string;
        }>>;
        filters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        compression: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        includeEvidence: boolean;
        compression: boolean;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
        filters?: Record<string, unknown> | undefined;
    }, {
        includeEvidence?: boolean | undefined;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
        filters?: Record<string, unknown> | undefined;
        compression?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "export.pdf.render";
    snapshotId: string;
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    exportType: "issues_csv" | "revrec_csv" | "contracts_csv" | "contracts_pdf" | "audit_bundle_pdf" | "executive_summary_pdf";
    exportId: string;
    templateName: string;
    options?: {
        includeEvidence: boolean;
        compression: boolean;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
        filters?: Record<string, unknown> | undefined;
    } | undefined;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}, {
    type: "export.pdf.render";
    snapshotId: string;
    tenantId: string;
    exportType: "issues_csv" | "revrec_csv" | "contracts_csv" | "contracts_pdf" | "audit_bundle_pdf" | "executive_summary_pdf";
    exportId: string;
    templateName: string;
    options?: {
        includeEvidence?: boolean | undefined;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
        filters?: Record<string, unknown> | undefined;
        compression?: boolean | undefined;
    } | undefined;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}>;
export type ExportPdfRenderJobPayload = z.infer<typeof ExportPdfRenderJobPayloadSchema>;
export declare const DigestSendJobPayloadSchema: z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, import("./ids.js").TenantId, string>;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"digest.send">;
    subscriptionId: z.ZodString;
    runId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "digest.send";
    runId: string;
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    subscriptionId: string;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}, {
    type: "digest.send";
    runId: string;
    tenantId: string;
    subscriptionId: string;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}>;
export type DigestSendJobPayload = z.infer<typeof DigestSendJobPayloadSchema>;
export declare const IssuesCsvColumnsSchema: z.ZodObject<{
    id: z.ZodString;
    severity: z.ZodString;
    category: z.ZodString;
    status: z.ZodString;
    ruleId: z.ZodString;
    message: z.ZodOptional<z.ZodString>;
    confidence: z.ZodNumber;
    impactAmount: z.ZodNullable<z.ZodNumber>;
    currency: z.ZodString;
    contractId: z.ZodNullable<z.ZodString>;
    customerId: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: string;
    id: string;
    currency: string;
    confidence: number;
    contractId: string | null;
    createdAt: string;
    ruleId: string;
    category: string;
    severity: string;
    impactAmount: number | null;
    customerId: string | null;
    message?: string | undefined;
}, {
    status: string;
    id: string;
    currency: string;
    confidence: number;
    contractId: string | null;
    createdAt: string;
    ruleId: string;
    category: string;
    severity: string;
    impactAmount: number | null;
    customerId: string | null;
    message?: string | undefined;
}>;
export declare const RevRecCsvColumnsSchema: z.ZodObject<{
    contractId: z.ZodString;
    obligationId: z.ZodString;
    periodStart: z.ZodString;
    periodEnd: z.ZodString;
    scheduledAmount: z.ZodNumber;
    recognizedAmount: z.ZodNumber;
    deferredAmount: z.ZodNumber;
    status: z.ZodString;
    recognitionMethod: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: string;
    contractId: string;
    obligationId: string;
    periodStart: string;
    periodEnd: string;
    scheduledAmount: number;
    recognizedAmount: number;
    deferredAmount: number;
    recognitionMethod: string;
}, {
    status: string;
    contractId: string;
    obligationId: string;
    periodStart: string;
    periodEnd: string;
    scheduledAmount: number;
    recognizedAmount: number;
    deferredAmount: number;
    recognitionMethod: string;
}>;
export declare const ContractsCsvColumnsSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodNullable<z.ZodString>;
    customerId: z.ZodNullable<z.ZodString>;
    status: z.ZodString;
    startDate: z.ZodNullable<z.ZodString>;
    endDate: z.ZodNullable<z.ZodString>;
    arr: z.ZodNullable<z.ZodNumber>;
    currency: z.ZodString;
    billingFrequency: z.ZodNullable<z.ZodString>;
    autoRenew: z.ZodBoolean;
    readinessScore: z.ZodNullable<z.ZodNumber>;
    readinessStatus: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: string;
    id: string;
    name: string | null;
    currency: string;
    autoRenew: boolean;
    customerId: string | null;
    arr: number | null;
    startDate: string | null;
    endDate: string | null;
    billingFrequency: string | null;
    readinessScore: number | null;
    readinessStatus: string | null;
}, {
    status: string;
    id: string;
    name: string | null;
    currency: string;
    autoRenew: boolean;
    customerId: string | null;
    arr: number | null;
    startDate: string | null;
    endDate: string | null;
    billingFrequency: string | null;
    readinessScore: number | null;
    readinessStatus: string | null;
}>;
export declare const DigestContentSchema: z.ZodObject<{
    periodLabel: z.ZodString;
    issuesSummary: z.ZodObject<{
        newIssues: z.ZodNumber;
        resolvedIssues: z.ZodNumber;
        totalOpen: z.ZodNumber;
        bySeverity: z.ZodRecord<z.ZodString, z.ZodNumber>;
        byCategory: z.ZodRecord<z.ZodString, z.ZodNumber>;
        highImpactItems: z.ZodArray<z.ZodObject<{
            issueId: z.ZodString;
            severity: z.ZodString;
            category: z.ZodString;
            impactAmount: z.ZodNullable<z.ZodNumber>;
            message: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            category: string;
            severity: string;
            impactAmount: number | null;
            issueId: string;
            message?: string | undefined;
        }, {
            category: string;
            severity: string;
            impactAmount: number | null;
            issueId: string;
            message?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        bySeverity: Record<string, number>;
        byCategory: Record<string, number>;
        newIssues: number;
        resolvedIssues: number;
        totalOpen: number;
        highImpactItems: {
            category: string;
            severity: string;
            impactAmount: number | null;
            issueId: string;
            message?: string | undefined;
        }[];
    }, {
        bySeverity: Record<string, number>;
        byCategory: Record<string, number>;
        newIssues: number;
        resolvedIssues: number;
        totalOpen: number;
        highImpactItems: {
            category: string;
            severity: string;
            impactAmount: number | null;
            issueId: string;
            message?: string | undefined;
        }[];
    }>;
    simulationDeltas: z.ZodOptional<z.ZodArray<z.ZodObject<{
        simulationId: z.ZodString;
        simulationName: z.ZodString;
        totalDelta: z.ZodNumber;
        deltaPct: z.ZodNullable<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        simulationId: string;
        deltaPct: number | null;
        simulationName: string;
        totalDelta: number;
    }, {
        simulationId: string;
        deltaPct: number | null;
        simulationName: string;
        totalDelta: number;
    }>, "many">>;
    snapshotId: z.ZodNullable<z.ZodString>;
    generatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    snapshotId: string | null;
    generatedAt: string;
    periodLabel: string;
    issuesSummary: {
        bySeverity: Record<string, number>;
        byCategory: Record<string, number>;
        newIssues: number;
        resolvedIssues: number;
        totalOpen: number;
        highImpactItems: {
            category: string;
            severity: string;
            impactAmount: number | null;
            issueId: string;
            message?: string | undefined;
        }[];
    };
    simulationDeltas?: {
        simulationId: string;
        deltaPct: number | null;
        simulationName: string;
        totalDelta: number;
    }[] | undefined;
}, {
    snapshotId: string | null;
    generatedAt: string;
    periodLabel: string;
    issuesSummary: {
        bySeverity: Record<string, number>;
        byCategory: Record<string, number>;
        newIssues: number;
        resolvedIssues: number;
        totalOpen: number;
        highImpactItems: {
            category: string;
            severity: string;
            impactAmount: number | null;
            issueId: string;
            message?: string | undefined;
        }[];
    };
    simulationDeltas?: {
        simulationId: string;
        deltaPct: number | null;
        simulationName: string;
        totalDelta: number;
    }[] | undefined;
}>;
export type DigestContent = z.infer<typeof DigestContentSchema>;
export {};
//# sourceMappingURL=exports.d.ts.map