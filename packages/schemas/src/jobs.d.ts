import { z } from 'zod';
import { type TenantId, type JobId } from './ids.js';
export declare const JobStatusSchema: z.ZodEnum<["pending", "processing", "completed", "failed", "cancelled"]>;
export type JobStatus = z.infer<typeof JobStatusSchema>;
export declare const QueueNameSchema: z.ZodEnum<["sync", "detect", "simulate", "export", "ingest.load", "ingest.normalize", "ingest.upsert", "ingest.finalize", "ingest.full", "identity.resolve", "identity.apply", "upload.csv.parse", "upload.csv.finalize", "upload.pdf.parse", "contracts.pdf.extract", "contracts.clause.segment", "contracts.terms.extract", "contracts.readiness.compute", "revrec.compute", "revrec.reconcile", "detect.run", "detect.replay", "evidence.generate", "evidence.regenerate", "simulation.run", "simulation.replay", "export.csv.generate", "export.pdf.render", "digest.send"]>;
export type QueueName = z.infer<typeof QueueNameSchema>;
export declare const LegacySyncJobPayloadSchema: z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"sync">;
    source: z.ZodEnum<["salesforce", "netsuite", "ironclad", "snowflake", "stripe", "zuora"]>;
    fullSync: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "sync";
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    source: "salesforce" | "stripe" | "netsuite" | "ironclad" | "snowflake" | "zuora";
    fullSync: boolean;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}, {
    type: "sync";
    tenantId: string;
    source: "salesforce" | "stripe" | "netsuite" | "ironclad" | "snowflake" | "zuora";
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    fullSync?: boolean | undefined;
}>;
export declare const ConnectorSyncJobPayloadSchema: z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"sync">;
    connectionId: z.ZodString;
    runId: z.ZodString;
    runType: z.ZodDefault<z.ZodEnum<["full", "incremental"]>>;
    objectTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "sync";
    runId: string;
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    connectionId: string;
    runType: "full" | "incremental";
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    objectTypes?: string[] | undefined;
}, {
    type: "sync";
    runId: string;
    tenantId: string;
    connectionId: string;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    runType?: "full" | "incremental" | undefined;
    objectTypes?: string[] | undefined;
}>;
export declare const SyncJobPayloadSchema: z.ZodUnion<[z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"sync">;
    connectionId: z.ZodString;
    runId: z.ZodString;
    runType: z.ZodDefault<z.ZodEnum<["full", "incremental"]>>;
    objectTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "sync";
    runId: string;
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    connectionId: string;
    runType: "full" | "incremental";
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    objectTypes?: string[] | undefined;
}, {
    type: "sync";
    runId: string;
    tenantId: string;
    connectionId: string;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    runType?: "full" | "incremental" | undefined;
    objectTypes?: string[] | undefined;
}>, z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"sync">;
    source: z.ZodEnum<["salesforce", "netsuite", "ironclad", "snowflake", "stripe", "zuora"]>;
    fullSync: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "sync";
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    source: "salesforce" | "stripe" | "netsuite" | "ironclad" | "snowflake" | "zuora";
    fullSync: boolean;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}, {
    type: "sync";
    tenantId: string;
    source: "salesforce" | "stripe" | "netsuite" | "ironclad" | "snowflake" | "zuora";
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    fullSync?: boolean | undefined;
}>]>;
export declare const DetectJobPayloadSchema: z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"detect">;
    scope: z.ZodDefault<z.ZodEnum<["all", "contracts", "billing", "usage"]>>;
}, "strip", z.ZodTypeAny, {
    type: "detect";
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    scope: "usage" | "billing" | "contracts" | "all";
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}, {
    type: "detect";
    tenantId: string;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    scope?: "usage" | "billing" | "contracts" | "all" | undefined;
}>;
export declare const SimulateJobPayloadSchema: z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"simulate">;
    scenarioId: z.ZodString;
    parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    type: "simulate";
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    scenarioId: string;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    parameters?: Record<string, unknown> | undefined;
}, {
    type: "simulate";
    tenantId: string;
    scenarioId: string;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    parameters?: Record<string, unknown> | undefined;
}>;
export declare const ExportJobPayloadSchema: z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"export">;
    format: z.ZodDefault<z.ZodEnum<["pdf", "csv", "xlsx"]>>;
    reportType: z.ZodEnum<["audit", "revrec", "issues", "summary"]>;
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
}, "strip", z.ZodTypeAny, {
    type: "export";
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    format: "csv" | "pdf" | "xlsx";
    reportType: "audit" | "issues" | "revrec" | "summary";
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    dateRange?: {
        start: string;
        end: string;
    } | undefined;
}, {
    type: "export";
    tenantId: string;
    reportType: "audit" | "issues" | "revrec" | "summary";
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    dateRange?: {
        start: string;
        end: string;
    } | undefined;
    format?: "csv" | "pdf" | "xlsx" | undefined;
}>;
export declare const IngestLoadJobPayloadSchema: z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"ingest.load">;
    snapshotId: z.ZodString;
    batchIds: z.ZodArray<z.ZodString, "many">;
    connectionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "ingest.load";
    snapshotId: string;
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    connectionId: string;
    batchIds: string[];
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}, {
    type: "ingest.load";
    snapshotId: string;
    tenantId: string;
    connectionId: string;
    batchIds: string[];
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}>;
export type IngestLoadJobPayload = z.infer<typeof IngestLoadJobPayloadSchema>;
export declare const IngestNormalizeJobPayloadSchema: z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"ingest.normalize">;
    snapshotId: z.ZodString;
    objectTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    batchSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "ingest.normalize";
    snapshotId: string;
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    batchSize: number;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    objectTypes?: string[] | undefined;
}, {
    type: "ingest.normalize";
    snapshotId: string;
    tenantId: string;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    objectTypes?: string[] | undefined;
    batchSize?: number | undefined;
}>;
export type IngestNormalizeJobPayload = z.infer<typeof IngestNormalizeJobPayloadSchema>;
export declare const IngestUpsertJobPayloadSchema: z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"ingest.upsert">;
    snapshotId: z.ZodString;
    objectTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    batchSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "ingest.upsert";
    snapshotId: string;
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    batchSize: number;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    objectTypes?: string[] | undefined;
}, {
    type: "ingest.upsert";
    snapshotId: string;
    tenantId: string;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    objectTypes?: string[] | undefined;
    batchSize?: number | undefined;
}>;
export type IngestUpsertJobPayload = z.infer<typeof IngestUpsertJobPayloadSchema>;
export declare const IngestFinalizeJobPayloadSchema: z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"ingest.finalize">;
    snapshotId: z.ZodString;
    runQualityChecks: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "ingest.finalize";
    snapshotId: string;
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    runQualityChecks: boolean;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}, {
    type: "ingest.finalize";
    snapshotId: string;
    tenantId: string;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    runQualityChecks?: boolean | undefined;
}>;
export type IngestFinalizeJobPayload = z.infer<typeof IngestFinalizeJobPayloadSchema>;
export declare const IngestFullJobPayloadSchema: z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"ingest.full">;
    snapshotId: z.ZodString;
    connectionIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    runType: z.ZodDefault<z.ZodEnum<["full", "incremental"]>>;
}, "strip", z.ZodTypeAny, {
    type: "ingest.full";
    snapshotId: string;
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    runType: "full" | "incremental";
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    connectionIds?: string[] | undefined;
}, {
    type: "ingest.full";
    snapshotId: string;
    tenantId: string;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    runType?: "full" | "incremental" | undefined;
    connectionIds?: string[] | undefined;
}>;
export type IngestFullJobPayload = z.infer<typeof IngestFullJobPayloadSchema>;
export declare const JobPayloadSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"sync">;
    connectionId: z.ZodString;
    runId: z.ZodString;
    runType: z.ZodDefault<z.ZodEnum<["full", "incremental"]>>;
    objectTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "sync";
    runId: string;
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    connectionId: string;
    runType: "full" | "incremental";
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    objectTypes?: string[] | undefined;
}, {
    type: "sync";
    runId: string;
    tenantId: string;
    connectionId: string;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    runType?: "full" | "incremental" | undefined;
    objectTypes?: string[] | undefined;
}>, z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"detect">;
    scope: z.ZodDefault<z.ZodEnum<["all", "contracts", "billing", "usage"]>>;
}, "strip", z.ZodTypeAny, {
    type: "detect";
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    scope: "usage" | "billing" | "contracts" | "all";
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}, {
    type: "detect";
    tenantId: string;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    scope?: "usage" | "billing" | "contracts" | "all" | undefined;
}>, z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"simulate">;
    scenarioId: z.ZodString;
    parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    type: "simulate";
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    scenarioId: string;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    parameters?: Record<string, unknown> | undefined;
}, {
    type: "simulate";
    tenantId: string;
    scenarioId: string;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    parameters?: Record<string, unknown> | undefined;
}>, z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"export">;
    format: z.ZodDefault<z.ZodEnum<["pdf", "csv", "xlsx"]>>;
    reportType: z.ZodEnum<["audit", "revrec", "issues", "summary"]>;
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
}, "strip", z.ZodTypeAny, {
    type: "export";
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    format: "csv" | "pdf" | "xlsx";
    reportType: "audit" | "issues" | "revrec" | "summary";
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    dateRange?: {
        start: string;
        end: string;
    } | undefined;
}, {
    type: "export";
    tenantId: string;
    reportType: "audit" | "issues" | "revrec" | "summary";
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    dateRange?: {
        start: string;
        end: string;
    } | undefined;
    format?: "csv" | "pdf" | "xlsx" | undefined;
}>, z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"ingest.load">;
    snapshotId: z.ZodString;
    batchIds: z.ZodArray<z.ZodString, "many">;
    connectionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "ingest.load";
    snapshotId: string;
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    connectionId: string;
    batchIds: string[];
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}, {
    type: "ingest.load";
    snapshotId: string;
    tenantId: string;
    connectionId: string;
    batchIds: string[];
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}>, z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"ingest.normalize">;
    snapshotId: z.ZodString;
    objectTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    batchSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "ingest.normalize";
    snapshotId: string;
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    batchSize: number;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    objectTypes?: string[] | undefined;
}, {
    type: "ingest.normalize";
    snapshotId: string;
    tenantId: string;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    objectTypes?: string[] | undefined;
    batchSize?: number | undefined;
}>, z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"ingest.upsert">;
    snapshotId: z.ZodString;
    objectTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    batchSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "ingest.upsert";
    snapshotId: string;
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    batchSize: number;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    objectTypes?: string[] | undefined;
}, {
    type: "ingest.upsert";
    snapshotId: string;
    tenantId: string;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    objectTypes?: string[] | undefined;
    batchSize?: number | undefined;
}>, z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"ingest.finalize">;
    snapshotId: z.ZodString;
    runQualityChecks: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "ingest.finalize";
    snapshotId: string;
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    runQualityChecks: boolean;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}, {
    type: "ingest.finalize";
    snapshotId: string;
    tenantId: string;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    runQualityChecks?: boolean | undefined;
}>, z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"ingest.full">;
    snapshotId: z.ZodString;
    connectionIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    runType: z.ZodDefault<z.ZodEnum<["full", "incremental"]>>;
}, "strip", z.ZodTypeAny, {
    type: "ingest.full";
    snapshotId: string;
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    runType: "full" | "incremental";
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    connectionIds?: string[] | undefined;
}, {
    type: "ingest.full";
    snapshotId: string;
    tenantId: string;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
    runType?: "full" | "incremental" | undefined;
    connectionIds?: string[] | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"identity.resolve">;
    tenantId: z.ZodString;
    snapshotId: z.ZodString;
    runId: z.ZodString;
    config: z.ZodOptional<z.ZodObject<{
        auto_merge_threshold: z.ZodDefault<z.ZodNumber>;
        review_threshold: z.ZodDefault<z.ZodNumber>;
        primary_crm_source: z.ZodOptional<z.ZodEnum<["salesforce", "hubspot", "stripe"]>>;
        blocking_keys: z.ZodDefault<z.ZodArray<z.ZodEnum<["domain", "tax_id", "normalized_name", "address"]>, "many">>;
        scoring_weights: z.ZodOptional<z.ZodObject<{
            name_similarity: z.ZodDefault<z.ZodNumber>;
            domain_match: z.ZodDefault<z.ZodNumber>;
            tax_id_match: z.ZodDefault<z.ZodNumber>;
            address_match: z.ZodDefault<z.ZodNumber>;
            external_id_overlap: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            name_similarity: number;
            domain_match: number;
            tax_id_match: number;
            address_match: number;
            external_id_overlap: number;
        }, {
            name_similarity?: number | undefined;
            domain_match?: number | undefined;
            tax_id_match?: number | undefined;
            address_match?: number | undefined;
            external_id_overlap?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        auto_merge_threshold: number;
        review_threshold: number;
        blocking_keys: ("domain" | "tax_id" | "normalized_name" | "address")[];
        primary_crm_source?: "salesforce" | "hubspot" | "stripe" | undefined;
        scoring_weights?: {
            name_similarity: number;
            domain_match: number;
            tax_id_match: number;
            address_match: number;
            external_id_overlap: number;
        } | undefined;
    }, {
        auto_merge_threshold?: number | undefined;
        review_threshold?: number | undefined;
        primary_crm_source?: "salesforce" | "hubspot" | "stripe" | undefined;
        blocking_keys?: ("domain" | "tax_id" | "normalized_name" | "address")[] | undefined;
        scoring_weights?: {
            name_similarity?: number | undefined;
            domain_match?: number | undefined;
            tax_id_match?: number | undefined;
            address_match?: number | undefined;
            external_id_overlap?: number | undefined;
        } | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "identity.resolve";
    snapshotId: string;
    runId: string;
    tenantId: string;
    config?: {
        auto_merge_threshold: number;
        review_threshold: number;
        blocking_keys: ("domain" | "tax_id" | "normalized_name" | "address")[];
        primary_crm_source?: "salesforce" | "hubspot" | "stripe" | undefined;
        scoring_weights?: {
            name_similarity: number;
            domain_match: number;
            tax_id_match: number;
            address_match: number;
            external_id_overlap: number;
        } | undefined;
    } | undefined;
}, {
    type: "identity.resolve";
    snapshotId: string;
    runId: string;
    tenantId: string;
    config?: {
        auto_merge_threshold?: number | undefined;
        review_threshold?: number | undefined;
        primary_crm_source?: "salesforce" | "hubspot" | "stripe" | undefined;
        blocking_keys?: ("domain" | "tax_id" | "normalized_name" | "address")[] | undefined;
        scoring_weights?: {
            name_similarity?: number | undefined;
            domain_match?: number | undefined;
            tax_id_match?: number | undefined;
            address_match?: number | undefined;
            external_id_overlap?: number | undefined;
        } | undefined;
    } | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"identity.apply">;
    tenantId: z.ZodString;
    snapshotId: z.ZodString;
    decisionIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "identity.apply";
    snapshotId: string;
    tenantId: string;
    decisionIds?: string[] | undefined;
}, {
    type: "identity.apply";
    snapshotId: string;
    tenantId: string;
    decisionIds?: string[] | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"upload.csv.parse">;
    tenantId: z.ZodString;
    uploadId: z.ZodString;
    fileId: z.ZodString;
    parseRunId: z.ZodString;
    mapping: z.ZodOptional<z.ZodObject<{
        entityType: z.ZodEnum<["customer", "invoice", "contract", "payment", "product"]>;
        columns: z.ZodArray<z.ZodObject<{
            sourceColumn: z.ZodString;
            targetField: z.ZodString;
            transform: z.ZodOptional<z.ZodEnum<["none", "date", "number", "boolean", "lowercase", "uppercase", "trim"]>>;
            defaultValue: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            sourceColumn: string;
            targetField: string;
            transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
            defaultValue?: string | undefined;
            required?: boolean | undefined;
        }, {
            sourceColumn: string;
            targetField: string;
            transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
            defaultValue?: string | undefined;
            required?: boolean | undefined;
        }>, "many">;
        skipHeaderRow: z.ZodDefault<z.ZodBoolean>;
        delimiter: z.ZodDefault<z.ZodString>;
        dateFormat: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        entityType: "customer" | "invoice" | "contract" | "payment" | "product";
        columns: {
            sourceColumn: string;
            targetField: string;
            transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
            defaultValue?: string | undefined;
            required?: boolean | undefined;
        }[];
        skipHeaderRow: boolean;
        delimiter: string;
        dateFormat?: string | undefined;
    }, {
        entityType: "customer" | "invoice" | "contract" | "payment" | "product";
        columns: {
            sourceColumn: string;
            targetField: string;
            transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
            defaultValue?: string | undefined;
            required?: boolean | undefined;
        }[];
        skipHeaderRow?: boolean | undefined;
        delimiter?: string | undefined;
        dateFormat?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "upload.csv.parse";
    tenantId: string;
    uploadId: string;
    fileId: string;
    parseRunId: string;
    mapping?: {
        entityType: "customer" | "invoice" | "contract" | "payment" | "product";
        columns: {
            sourceColumn: string;
            targetField: string;
            transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
            defaultValue?: string | undefined;
            required?: boolean | undefined;
        }[];
        skipHeaderRow: boolean;
        delimiter: string;
        dateFormat?: string | undefined;
    } | undefined;
}, {
    type: "upload.csv.parse";
    tenantId: string;
    uploadId: string;
    fileId: string;
    parseRunId: string;
    mapping?: {
        entityType: "customer" | "invoice" | "contract" | "payment" | "product";
        columns: {
            sourceColumn: string;
            targetField: string;
            transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
            defaultValue?: string | undefined;
            required?: boolean | undefined;
        }[];
        skipHeaderRow?: boolean | undefined;
        delimiter?: string | undefined;
        dateFormat?: string | undefined;
    } | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"upload.csv.finalize">;
    tenantId: z.ZodString;
    uploadId: z.ZodString;
    parseRunId: z.ZodString;
    triggerIngestion: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "upload.csv.finalize";
    tenantId: string;
    uploadId: string;
    parseRunId: string;
    triggerIngestion: boolean;
}, {
    type: "upload.csv.finalize";
    tenantId: string;
    uploadId: string;
    parseRunId: string;
    triggerIngestion?: boolean | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"upload.pdf.parse">;
    tenantId: z.ZodString;
    uploadId: z.ZodString;
    fileId: z.ZodString;
    parseRunId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "upload.pdf.parse";
    tenantId: string;
    uploadId: string;
    fileId: string;
    parseRunId: string;
}, {
    type: "upload.pdf.parse";
    tenantId: string;
    uploadId: string;
    fileId: string;
    parseRunId: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"contracts.pdf.extract">;
    tenantId: z.ZodString;
    snapshotId: z.ZodString;
    documentId: z.ZodString;
    contractId: z.ZodOptional<z.ZodString>;
    contractVersionId: z.ZodOptional<z.ZodString>;
    s3Key: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "contracts.pdf.extract";
    snapshotId: string;
    tenantId: string;
    documentId: string;
    s3Key: string;
    contractId?: string | undefined;
    contractVersionId?: string | undefined;
}, {
    type: "contracts.pdf.extract";
    snapshotId: string;
    tenantId: string;
    documentId: string;
    s3Key: string;
    contractId?: string | undefined;
    contractVersionId?: string | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"contracts.clause.segment">;
    tenantId: z.ZodString;
    snapshotId: z.ZodString;
    documentId: z.ZodString;
    contractVersionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "contracts.clause.segment";
    snapshotId: string;
    tenantId: string;
    documentId: string;
    contractVersionId: string;
}, {
    type: "contracts.clause.segment";
    snapshotId: string;
    tenantId: string;
    documentId: string;
    contractVersionId: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"contracts.terms.extract">;
    tenantId: z.ZodString;
    snapshotId: z.ZodString;
    documentId: z.ZodString;
    contractVersionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "contracts.terms.extract";
    snapshotId: string;
    tenantId: string;
    documentId: string;
    contractVersionId: string;
}, {
    type: "contracts.terms.extract";
    snapshotId: string;
    tenantId: string;
    documentId: string;
    contractVersionId: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"contracts.readiness.compute">;
    tenantId: z.ZodString;
    snapshotId: z.ZodString;
    contractVersionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "contracts.readiness.compute";
    snapshotId: string;
    tenantId: string;
    contractVersionId: string;
}, {
    type: "contracts.readiness.compute";
    snapshotId: string;
    tenantId: string;
    contractVersionId: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"revrec.compute">;
    tenantId: z.ZodString;
    snapshotId: z.ZodString;
    contractIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    forceRecompute: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "revrec.compute";
    snapshotId: string;
    tenantId: string;
    forceRecompute: boolean;
    contractIds?: string[] | undefined;
}, {
    type: "revrec.compute";
    snapshotId: string;
    tenantId: string;
    contractIds?: string[] | undefined;
    forceRecompute?: boolean | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"revrec.reconcile">;
    tenantId: z.ZodString;
    snapshotId: z.ZodString;
    periodStart: z.ZodString;
    periodEnd: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "revrec.reconcile";
    snapshotId: string;
    tenantId: string;
    periodStart: string;
    periodEnd: string;
}, {
    type: "revrec.reconcile";
    snapshotId: string;
    tenantId: string;
    periodStart: string;
    periodEnd: string;
}>, z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"detect.run">;
    snapshotId: z.ZodString;
    rulesetVersion: z.ZodOptional<z.ZodString>;
    config: z.ZodOptional<z.ZodObject<{
        fx: z.ZodDefault<z.ZodObject<{
            rateSource: z.ZodDefault<z.ZodEnum<["ecb", "snapshot_rate", "contract_rate", "manual"]>>;
            rateDate: z.ZodDefault<z.ZodEnum<["invoice_date", "period_end", "snapshot_date"]>>;
            tolerancePct: z.ZodDefault<z.ZodNumber>;
            baseCurrency: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            rateSource: "ecb" | "snapshot_rate" | "contract_rate" | "manual";
            rateDate: "invoice_date" | "period_end" | "snapshot_date";
            tolerancePct: number;
            baseCurrency: string;
        }, {
            rateSource?: "ecb" | "snapshot_rate" | "contract_rate" | "manual" | undefined;
            rateDate?: "invoice_date" | "period_end" | "snapshot_date" | undefined;
            tolerancePct?: number | undefined;
            baseCurrency?: string | undefined;
        }>>;
        proration: z.ZodDefault<z.ZodObject<{
            method: z.ZodDefault<z.ZodEnum<["daily_exact", "daily_30", "monthly_proportional", "none"]>>;
            midPeriodAmendmentHandling: z.ZodDefault<z.ZodEnum<["prorate", "full_period", "skip"]>>;
            rampScheduleRecognition: z.ZodDefault<z.ZodEnum<["as_invoiced", "straight_line"]>>;
        }, "strip", z.ZodTypeAny, {
            method: "none" | "daily_exact" | "daily_30" | "monthly_proportional";
            midPeriodAmendmentHandling: "prorate" | "full_period" | "skip";
            rampScheduleRecognition: "straight_line" | "as_invoiced";
        }, {
            method?: "none" | "daily_exact" | "daily_30" | "monthly_proportional" | undefined;
            midPeriodAmendmentHandling?: "prorate" | "full_period" | "skip" | undefined;
            rampScheduleRecognition?: "straight_line" | "as_invoiced" | undefined;
        }>>;
        taxFees: z.ZodDefault<z.ZodObject<{
            excludeFromComparison: z.ZodDefault<z.ZodBoolean>;
            taxLineItemCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            feeLineItemCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            excludeFromComparison: boolean;
            taxLineItemCodes: string[];
            feeLineItemCodes: string[];
        }, {
            excludeFromComparison?: boolean | undefined;
            taxLineItemCodes?: string[] | undefined;
            feeLineItemCodes?: string[] | undefined;
        }>>;
        credits: z.ZodDefault<z.ZodObject<{
            netWithInvoices: z.ZodDefault<z.ZodBoolean>;
            treatAsSeparateRevenue: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            netWithInvoices: boolean;
            treatAsSeparateRevenue: boolean;
        }, {
            netWithInvoices?: boolean | undefined;
            treatAsSeparateRevenue?: boolean | undefined;
        }>>;
        zeroValue: z.ZodDefault<z.ZodObject<{
            treatAsValid: z.ZodDefault<z.ZodBoolean>;
            skipBillingRules: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            treatAsValid: boolean;
            skipBillingRules: boolean;
        }, {
            treatAsValid?: boolean | undefined;
            skipBillingRules?: boolean | undefined;
        }>>;
        thresholds: z.ZodDefault<z.ZodObject<{
            amountVariancePct: z.ZodDefault<z.ZodNumber>;
            amountVarianceAbs: z.ZodDefault<z.ZodNumber>;
            timingVarianceDays: z.ZodDefault<z.ZodNumber>;
            highImpactThreshold: z.ZodDefault<z.ZodNumber>;
            criticalImpactThreshold: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            amountVariancePct: number;
            amountVarianceAbs: number;
            timingVarianceDays: number;
            highImpactThreshold: number;
            criticalImpactThreshold: number;
        }, {
            amountVariancePct?: number | undefined;
            amountVarianceAbs?: number | undefined;
            timingVarianceDays?: number | undefined;
            highImpactThreshold?: number | undefined;
            criticalImpactThreshold?: number | undefined;
        }>>;
        gating: z.ZodDefault<z.ZodObject<{
            skipIfContractNotReady: z.ZodDefault<z.ZodBoolean>;
            confidenceCapIfNotReady: z.ZodDefault<z.ZodNumber>;
            skipIfUsageStale: z.ZodDefault<z.ZodBoolean>;
            usageStalenessHours: z.ZodDefault<z.ZodNumber>;
            skipIfCRMStale: z.ZodDefault<z.ZodBoolean>;
            crmStalenessHours: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            skipIfContractNotReady: boolean;
            confidenceCapIfNotReady: number;
            skipIfUsageStale: boolean;
            usageStalenessHours: number;
            skipIfCRMStale: boolean;
            crmStalenessHours: number;
        }, {
            skipIfContractNotReady?: boolean | undefined;
            confidenceCapIfNotReady?: number | undefined;
            skipIfUsageStale?: boolean | undefined;
            usageStalenessHours?: number | undefined;
            skipIfCRMStale?: boolean | undefined;
            crmStalenessHours?: number | undefined;
        }>>;
        autoRenewal: z.ZodDefault<z.ZodObject<{
            detectImplicitRenewal: z.ZodDefault<z.ZodBoolean>;
            renewalGraceDays: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            detectImplicitRenewal: boolean;
            renewalGraceDays: number;
        }, {
            detectImplicitRenewal?: boolean | undefined;
            renewalGraceDays?: number | undefined;
        }>>;
        enabledRules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        disabledRules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        aiEnrichment: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            maxIssuesPerRun: z.ZodDefault<z.ZodNumber>;
            minConfidenceToEnrich: z.ZodDefault<z.ZodNumber>;
            includeRecommendations: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            maxIssuesPerRun: number;
            minConfidenceToEnrich: number;
            includeRecommendations: boolean;
        }, {
            enabled?: boolean | undefined;
            maxIssuesPerRun?: number | undefined;
            minConfidenceToEnrich?: number | undefined;
            includeRecommendations?: boolean | undefined;
        }>>;
        aiAnomalyDetection: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            minConfidenceToReport: z.ZodDefault<z.ZodNumber>;
            maxAnomaliesPerRun: z.ZodDefault<z.ZodNumber>;
            categories: z.ZodDefault<z.ZodArray<z.ZodEnum<["semantic", "pattern", "anomaly", "contextual"]>, "many">>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            minConfidenceToReport: number;
            maxAnomaliesPerRun: number;
            categories: ("pattern" | "semantic" | "anomaly" | "contextual")[];
        }, {
            enabled?: boolean | undefined;
            minConfidenceToReport?: number | undefined;
            maxAnomaliesPerRun?: number | undefined;
            categories?: ("pattern" | "semantic" | "anomaly" | "contextual")[] | undefined;
        }>>;
        llmCostControls: z.ZodOptional<z.ZodObject<{
            maxCostPerRunUsd: z.ZodDefault<z.ZodNumber>;
            preferredModel: z.ZodDefault<z.ZodEnum<["gpt-4o", "gpt-4o-mini"]>>;
            enableCaching: z.ZodDefault<z.ZodBoolean>;
            budgetAlertThresholdUsd: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            maxCostPerRunUsd: number;
            preferredModel: "gpt-4o" | "gpt-4o-mini";
            enableCaching: boolean;
            budgetAlertThresholdUsd?: number | undefined;
        }, {
            maxCostPerRunUsd?: number | undefined;
            preferredModel?: "gpt-4o" | "gpt-4o-mini" | undefined;
            enableCaching?: boolean | undefined;
            budgetAlertThresholdUsd?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        credits: {
            netWithInvoices: boolean;
            treatAsSeparateRevenue: boolean;
        };
        fx: {
            rateSource: "ecb" | "snapshot_rate" | "contract_rate" | "manual";
            rateDate: "invoice_date" | "period_end" | "snapshot_date";
            tolerancePct: number;
            baseCurrency: string;
        };
        proration: {
            method: "none" | "daily_exact" | "daily_30" | "monthly_proportional";
            midPeriodAmendmentHandling: "prorate" | "full_period" | "skip";
            rampScheduleRecognition: "straight_line" | "as_invoiced";
        };
        taxFees: {
            excludeFromComparison: boolean;
            taxLineItemCodes: string[];
            feeLineItemCodes: string[];
        };
        zeroValue: {
            treatAsValid: boolean;
            skipBillingRules: boolean;
        };
        thresholds: {
            amountVariancePct: number;
            amountVarianceAbs: number;
            timingVarianceDays: number;
            highImpactThreshold: number;
            criticalImpactThreshold: number;
        };
        gating: {
            skipIfContractNotReady: boolean;
            confidenceCapIfNotReady: number;
            skipIfUsageStale: boolean;
            usageStalenessHours: number;
            skipIfCRMStale: boolean;
            crmStalenessHours: number;
        };
        autoRenewal: {
            detectImplicitRenewal: boolean;
            renewalGraceDays: number;
        };
        enabledRules?: string[] | undefined;
        disabledRules?: string[] | undefined;
        aiEnrichment?: {
            enabled: boolean;
            maxIssuesPerRun: number;
            minConfidenceToEnrich: number;
            includeRecommendations: boolean;
        } | undefined;
        aiAnomalyDetection?: {
            enabled: boolean;
            minConfidenceToReport: number;
            maxAnomaliesPerRun: number;
            categories: ("pattern" | "semantic" | "anomaly" | "contextual")[];
        } | undefined;
        llmCostControls?: {
            maxCostPerRunUsd: number;
            preferredModel: "gpt-4o" | "gpt-4o-mini";
            enableCaching: boolean;
            budgetAlertThresholdUsd?: number | undefined;
        } | undefined;
    }, {
        credits?: {
            netWithInvoices?: boolean | undefined;
            treatAsSeparateRevenue?: boolean | undefined;
        } | undefined;
        fx?: {
            rateSource?: "ecb" | "snapshot_rate" | "contract_rate" | "manual" | undefined;
            rateDate?: "invoice_date" | "period_end" | "snapshot_date" | undefined;
            tolerancePct?: number | undefined;
            baseCurrency?: string | undefined;
        } | undefined;
        proration?: {
            method?: "none" | "daily_exact" | "daily_30" | "monthly_proportional" | undefined;
            midPeriodAmendmentHandling?: "prorate" | "full_period" | "skip" | undefined;
            rampScheduleRecognition?: "straight_line" | "as_invoiced" | undefined;
        } | undefined;
        taxFees?: {
            excludeFromComparison?: boolean | undefined;
            taxLineItemCodes?: string[] | undefined;
            feeLineItemCodes?: string[] | undefined;
        } | undefined;
        zeroValue?: {
            treatAsValid?: boolean | undefined;
            skipBillingRules?: boolean | undefined;
        } | undefined;
        thresholds?: {
            amountVariancePct?: number | undefined;
            amountVarianceAbs?: number | undefined;
            timingVarianceDays?: number | undefined;
            highImpactThreshold?: number | undefined;
            criticalImpactThreshold?: number | undefined;
        } | undefined;
        gating?: {
            skipIfContractNotReady?: boolean | undefined;
            confidenceCapIfNotReady?: number | undefined;
            skipIfUsageStale?: boolean | undefined;
            usageStalenessHours?: number | undefined;
            skipIfCRMStale?: boolean | undefined;
            crmStalenessHours?: number | undefined;
        } | undefined;
        autoRenewal?: {
            detectImplicitRenewal?: boolean | undefined;
            renewalGraceDays?: number | undefined;
        } | undefined;
        enabledRules?: string[] | undefined;
        disabledRules?: string[] | undefined;
        aiEnrichment?: {
            enabled?: boolean | undefined;
            maxIssuesPerRun?: number | undefined;
            minConfidenceToEnrich?: number | undefined;
            includeRecommendations?: boolean | undefined;
        } | undefined;
        aiAnomalyDetection?: {
            enabled?: boolean | undefined;
            minConfidenceToReport?: number | undefined;
            maxAnomaliesPerRun?: number | undefined;
            categories?: ("pattern" | "semantic" | "anomaly" | "contextual")[] | undefined;
        } | undefined;
        llmCostControls?: {
            maxCostPerRunUsd?: number | undefined;
            preferredModel?: "gpt-4o" | "gpt-4o-mini" | undefined;
            enableCaching?: boolean | undefined;
            budgetAlertThresholdUsd?: number | undefined;
        } | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "detect.run";
    snapshotId: string;
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    config?: {
        credits: {
            netWithInvoices: boolean;
            treatAsSeparateRevenue: boolean;
        };
        fx: {
            rateSource: "ecb" | "snapshot_rate" | "contract_rate" | "manual";
            rateDate: "invoice_date" | "period_end" | "snapshot_date";
            tolerancePct: number;
            baseCurrency: string;
        };
        proration: {
            method: "none" | "daily_exact" | "daily_30" | "monthly_proportional";
            midPeriodAmendmentHandling: "prorate" | "full_period" | "skip";
            rampScheduleRecognition: "straight_line" | "as_invoiced";
        };
        taxFees: {
            excludeFromComparison: boolean;
            taxLineItemCodes: string[];
            feeLineItemCodes: string[];
        };
        zeroValue: {
            treatAsValid: boolean;
            skipBillingRules: boolean;
        };
        thresholds: {
            amountVariancePct: number;
            amountVarianceAbs: number;
            timingVarianceDays: number;
            highImpactThreshold: number;
            criticalImpactThreshold: number;
        };
        gating: {
            skipIfContractNotReady: boolean;
            confidenceCapIfNotReady: number;
            skipIfUsageStale: boolean;
            usageStalenessHours: number;
            skipIfCRMStale: boolean;
            crmStalenessHours: number;
        };
        autoRenewal: {
            detectImplicitRenewal: boolean;
            renewalGraceDays: number;
        };
        enabledRules?: string[] | undefined;
        disabledRules?: string[] | undefined;
        aiEnrichment?: {
            enabled: boolean;
            maxIssuesPerRun: number;
            minConfidenceToEnrich: number;
            includeRecommendations: boolean;
        } | undefined;
        aiAnomalyDetection?: {
            enabled: boolean;
            minConfidenceToReport: number;
            maxAnomaliesPerRun: number;
            categories: ("pattern" | "semantic" | "anomaly" | "contextual")[];
        } | undefined;
        llmCostControls?: {
            maxCostPerRunUsd: number;
            preferredModel: "gpt-4o" | "gpt-4o-mini";
            enableCaching: boolean;
            budgetAlertThresholdUsd?: number | undefined;
        } | undefined;
    } | undefined;
    rulesetVersion?: string | undefined;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}, {
    type: "detect.run";
    snapshotId: string;
    tenantId: string;
    config?: {
        credits?: {
            netWithInvoices?: boolean | undefined;
            treatAsSeparateRevenue?: boolean | undefined;
        } | undefined;
        fx?: {
            rateSource?: "ecb" | "snapshot_rate" | "contract_rate" | "manual" | undefined;
            rateDate?: "invoice_date" | "period_end" | "snapshot_date" | undefined;
            tolerancePct?: number | undefined;
            baseCurrency?: string | undefined;
        } | undefined;
        proration?: {
            method?: "none" | "daily_exact" | "daily_30" | "monthly_proportional" | undefined;
            midPeriodAmendmentHandling?: "prorate" | "full_period" | "skip" | undefined;
            rampScheduleRecognition?: "straight_line" | "as_invoiced" | undefined;
        } | undefined;
        taxFees?: {
            excludeFromComparison?: boolean | undefined;
            taxLineItemCodes?: string[] | undefined;
            feeLineItemCodes?: string[] | undefined;
        } | undefined;
        zeroValue?: {
            treatAsValid?: boolean | undefined;
            skipBillingRules?: boolean | undefined;
        } | undefined;
        thresholds?: {
            amountVariancePct?: number | undefined;
            amountVarianceAbs?: number | undefined;
            timingVarianceDays?: number | undefined;
            highImpactThreshold?: number | undefined;
            criticalImpactThreshold?: number | undefined;
        } | undefined;
        gating?: {
            skipIfContractNotReady?: boolean | undefined;
            confidenceCapIfNotReady?: number | undefined;
            skipIfUsageStale?: boolean | undefined;
            usageStalenessHours?: number | undefined;
            skipIfCRMStale?: boolean | undefined;
            crmStalenessHours?: number | undefined;
        } | undefined;
        autoRenewal?: {
            detectImplicitRenewal?: boolean | undefined;
            renewalGraceDays?: number | undefined;
        } | undefined;
        enabledRules?: string[] | undefined;
        disabledRules?: string[] | undefined;
        aiEnrichment?: {
            enabled?: boolean | undefined;
            maxIssuesPerRun?: number | undefined;
            minConfidenceToEnrich?: number | undefined;
            includeRecommendations?: boolean | undefined;
        } | undefined;
        aiAnomalyDetection?: {
            enabled?: boolean | undefined;
            minConfidenceToReport?: number | undefined;
            maxAnomaliesPerRun?: number | undefined;
            categories?: ("pattern" | "semantic" | "anomaly" | "contextual")[] | undefined;
        } | undefined;
        llmCostControls?: {
            maxCostPerRunUsd?: number | undefined;
            preferredModel?: "gpt-4o" | "gpt-4o-mini" | undefined;
            enableCaching?: boolean | undefined;
            budgetAlertThresholdUsd?: number | undefined;
        } | undefined;
    } | undefined;
    rulesetVersion?: string | undefined;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}>, z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"detect.replay">;
    runId: z.ZodString;
    rulesetVersion: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "detect.replay";
    runId: string;
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    rulesetVersion?: string | undefined;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}, {
    type: "detect.replay";
    runId: string;
    tenantId: string;
    rulesetVersion?: string | undefined;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"evidence.generate">;
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    snapshotId: z.ZodString;
    detectionRunId: z.ZodOptional<z.ZodString>;
    issueIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    force: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    requestId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "evidence.generate";
    snapshotId: string;
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    force: boolean;
    issueIds?: string[] | undefined;
    requestId?: string | undefined;
    detectionRunId?: string | undefined;
}, {
    type: "evidence.generate";
    snapshotId: string;
    tenantId: string;
    issueIds?: string[] | undefined;
    requestId?: string | undefined;
    detectionRunId?: string | undefined;
    force?: boolean | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"evidence.regenerate">;
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    issueId: z.ZodString;
    force: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    actorUserId: z.ZodOptional<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
    requestId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "evidence.regenerate";
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    issueId: string;
    force: boolean;
    reason?: string | undefined;
    actorUserId?: string | undefined;
    requestId?: string | undefined;
}, {
    type: "evidence.regenerate";
    tenantId: string;
    issueId: string;
    reason?: string | undefined;
    actorUserId?: string | undefined;
    requestId?: string | undefined;
    force?: boolean | undefined;
}>, z.ZodObject<{
    tenantId: z.ZodString;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"simulation.run">;
    simulationId: z.ZodString;
    runId: z.ZodString;
    options: z.ZodOptional<z.ZodObject<{
        recomputeRevRec: z.ZodDefault<z.ZodBoolean>;
        includeIssueAnalysis: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        recomputeRevRec: boolean;
        includeIssueAnalysis: boolean;
    }, {
        recomputeRevRec?: boolean | undefined;
        includeIssueAnalysis?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "simulation.run";
    runId: string;
    tenantId: string;
    simulationId: string;
    options?: {
        recomputeRevRec: boolean;
        includeIssueAnalysis: boolean;
    } | undefined;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}, {
    type: "simulation.run";
    runId: string;
    tenantId: string;
    simulationId: string;
    options?: {
        recomputeRevRec?: boolean | undefined;
        includeIssueAnalysis?: boolean | undefined;
    } | undefined;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}>, z.ZodObject<{
    tenantId: z.ZodString;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"simulation.replay">;
    simulationId: z.ZodString;
    originalRunId: z.ZodString;
    newRunId: z.ZodString;
    options: z.ZodOptional<z.ZodObject<{
        recomputeRevRec: z.ZodDefault<z.ZodBoolean>;
        includeIssueAnalysis: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        recomputeRevRec: boolean;
        includeIssueAnalysis: boolean;
    }, {
        recomputeRevRec?: boolean | undefined;
        includeIssueAnalysis?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "simulation.replay";
    tenantId: string;
    simulationId: string;
    originalRunId: string;
    newRunId: string;
    options?: {
        recomputeRevRec: boolean;
        includeIssueAnalysis: boolean;
    } | undefined;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}, {
    type: "simulation.replay";
    tenantId: string;
    simulationId: string;
    originalRunId: string;
    newRunId: string;
    options?: {
        recomputeRevRec?: boolean | undefined;
        includeIssueAnalysis?: boolean | undefined;
    } | undefined;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}>, z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
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
}>, z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
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
}>, z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
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
}>]>;
export type LegacySyncJobPayload = z.infer<typeof LegacySyncJobPayloadSchema>;
export type ConnectorSyncJobPayload = z.infer<typeof ConnectorSyncJobPayloadSchema>;
export type SyncJobPayload = z.infer<typeof SyncJobPayloadSchema>;
export type DetectJobPayload = z.infer<typeof DetectJobPayloadSchema>;
export type SimulateJobPayload = z.infer<typeof SimulateJobPayloadSchema>;
export type ExportJobPayload = z.infer<typeof ExportJobPayloadSchema>;
export type JobPayload = z.infer<typeof JobPayloadSchema>;
export declare const JobResultSchema: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodOptional<z.ZodString>;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    error: z.ZodOptional<z.ZodString>;
    processingTimeMs: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    error?: string | undefined;
    message?: string | undefined;
    processingTimeMs?: number | undefined;
    data?: Record<string, unknown> | undefined;
}, {
    success: boolean;
    error?: string | undefined;
    message?: string | undefined;
    processingTimeMs?: number | undefined;
    data?: Record<string, unknown> | undefined;
}>;
export type JobResult = z.infer<typeof JobResultSchema>;
export declare const JobMetadataSchema: z.ZodObject<{
    id: z.ZodEffects<z.ZodString, JobId, string>;
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    type: z.ZodEnum<["sync", "detect", "simulate", "export", "ingest.load", "ingest.normalize", "ingest.upsert", "ingest.finalize", "ingest.full", "identity.resolve", "identity.apply", "upload.csv.parse", "upload.csv.finalize", "upload.pdf.parse", "contracts.pdf.extract", "contracts.clause.segment", "contracts.terms.extract", "contracts.readiness.compute", "revrec.compute", "revrec.reconcile", "detect.run", "detect.replay", "evidence.generate", "evidence.regenerate", "simulation.run", "simulation.replay", "export.csv.generate", "export.pdf.render", "digest.send"]>;
    status: z.ZodEnum<["pending", "processing", "completed", "failed", "cancelled"]>;
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    result: z.ZodNullable<z.ZodObject<{
        success: z.ZodBoolean;
        message: z.ZodOptional<z.ZodString>;
        data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        error: z.ZodOptional<z.ZodString>;
        processingTimeMs: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        success: boolean;
        error?: string | undefined;
        message?: string | undefined;
        processingTimeMs?: number | undefined;
        data?: Record<string, unknown> | undefined;
    }, {
        success: boolean;
        error?: string | undefined;
        message?: string | undefined;
        processingTimeMs?: number | undefined;
        data?: Record<string, unknown> | undefined;
    }>>;
    idempotencyKeyId: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    completedAt: z.ZodNullable<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    type: "identity.resolve" | "identity.apply" | "upload.csv.parse" | "upload.csv.finalize" | "upload.pdf.parse" | "contracts.pdf.extract" | "contracts.clause.segment" | "contracts.terms.extract" | "contracts.readiness.compute" | "revrec.compute" | "revrec.reconcile" | "detect.run" | "detect.replay" | "evidence.generate" | "evidence.regenerate" | "simulation.run" | "simulation.replay" | "export" | "export.csv.generate" | "export.pdf.render" | "digest.send" | "sync" | "detect" | "simulate" | "ingest.load" | "ingest.normalize" | "ingest.upsert" | "ingest.finalize" | "ingest.full";
    status: "pending" | "completed" | "failed" | "processing" | "cancelled";
    id: string & {
        readonly __nominal: "JobId";
    };
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
    payload: Record<string, unknown>;
    result: {
        success: boolean;
        error?: string | undefined;
        message?: string | undefined;
        processingTimeMs?: number | undefined;
        data?: Record<string, unknown> | undefined;
    } | null;
    idempotencyKeyId: string | null;
}, {
    type: "identity.resolve" | "identity.apply" | "upload.csv.parse" | "upload.csv.finalize" | "upload.pdf.parse" | "contracts.pdf.extract" | "contracts.clause.segment" | "contracts.terms.extract" | "contracts.readiness.compute" | "revrec.compute" | "revrec.reconcile" | "detect.run" | "detect.replay" | "evidence.generate" | "evidence.regenerate" | "simulation.run" | "simulation.replay" | "export" | "export.csv.generate" | "export.pdf.render" | "digest.send" | "sync" | "detect" | "simulate" | "ingest.load" | "ingest.normalize" | "ingest.upsert" | "ingest.finalize" | "ingest.full";
    status: "pending" | "completed" | "failed" | "processing" | "cancelled";
    id: string;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
    payload: Record<string, unknown>;
    result: {
        success: boolean;
        error?: string | undefined;
        message?: string | undefined;
        processingTimeMs?: number | undefined;
        data?: Record<string, unknown> | undefined;
    } | null;
    idempotencyKeyId: string | null;
}>;
export type JobMetadata = z.infer<typeof JobMetadataSchema>;
export declare const EnqueueJobRequestSchema: z.ZodObject<{
    payload: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
        requestId: z.ZodOptional<z.ZodString>;
        idempotencyKey: z.ZodOptional<z.ZodString>;
    } & {
        type: z.ZodLiteral<"sync">;
        connectionId: z.ZodString;
        runId: z.ZodString;
        runType: z.ZodDefault<z.ZodEnum<["full", "incremental"]>>;
        objectTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "sync";
        runId: string;
        tenantId: string & {
            readonly __nominal: "TenantId";
        };
        connectionId: string;
        runType: "full" | "incremental";
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
        objectTypes?: string[] | undefined;
    }, {
        type: "sync";
        runId: string;
        tenantId: string;
        connectionId: string;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
        runType?: "full" | "incremental" | undefined;
        objectTypes?: string[] | undefined;
    }>, z.ZodObject<{
        tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
        requestId: z.ZodOptional<z.ZodString>;
        idempotencyKey: z.ZodOptional<z.ZodString>;
    } & {
        type: z.ZodLiteral<"detect">;
        scope: z.ZodDefault<z.ZodEnum<["all", "contracts", "billing", "usage"]>>;
    }, "strip", z.ZodTypeAny, {
        type: "detect";
        tenantId: string & {
            readonly __nominal: "TenantId";
        };
        scope: "usage" | "billing" | "contracts" | "all";
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
    }, {
        type: "detect";
        tenantId: string;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
        scope?: "usage" | "billing" | "contracts" | "all" | undefined;
    }>, z.ZodObject<{
        tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
        requestId: z.ZodOptional<z.ZodString>;
        idempotencyKey: z.ZodOptional<z.ZodString>;
    } & {
        type: z.ZodLiteral<"simulate">;
        scenarioId: z.ZodString;
        parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        type: "simulate";
        tenantId: string & {
            readonly __nominal: "TenantId";
        };
        scenarioId: string;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
        parameters?: Record<string, unknown> | undefined;
    }, {
        type: "simulate";
        tenantId: string;
        scenarioId: string;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
        parameters?: Record<string, unknown> | undefined;
    }>, z.ZodObject<{
        tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
        requestId: z.ZodOptional<z.ZodString>;
        idempotencyKey: z.ZodOptional<z.ZodString>;
    } & {
        type: z.ZodLiteral<"export">;
        format: z.ZodDefault<z.ZodEnum<["pdf", "csv", "xlsx"]>>;
        reportType: z.ZodEnum<["audit", "revrec", "issues", "summary"]>;
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
    }, "strip", z.ZodTypeAny, {
        type: "export";
        tenantId: string & {
            readonly __nominal: "TenantId";
        };
        format: "csv" | "pdf" | "xlsx";
        reportType: "audit" | "issues" | "revrec" | "summary";
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
    }, {
        type: "export";
        tenantId: string;
        reportType: "audit" | "issues" | "revrec" | "summary";
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
        format?: "csv" | "pdf" | "xlsx" | undefined;
    }>, z.ZodObject<{
        tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
        requestId: z.ZodOptional<z.ZodString>;
        idempotencyKey: z.ZodOptional<z.ZodString>;
    } & {
        type: z.ZodLiteral<"ingest.load">;
        snapshotId: z.ZodString;
        batchIds: z.ZodArray<z.ZodString, "many">;
        connectionId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "ingest.load";
        snapshotId: string;
        tenantId: string & {
            readonly __nominal: "TenantId";
        };
        connectionId: string;
        batchIds: string[];
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
    }, {
        type: "ingest.load";
        snapshotId: string;
        tenantId: string;
        connectionId: string;
        batchIds: string[];
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
    }>, z.ZodObject<{
        tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
        requestId: z.ZodOptional<z.ZodString>;
        idempotencyKey: z.ZodOptional<z.ZodString>;
    } & {
        type: z.ZodLiteral<"ingest.normalize">;
        snapshotId: z.ZodString;
        objectTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        batchSize: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: "ingest.normalize";
        snapshotId: string;
        tenantId: string & {
            readonly __nominal: "TenantId";
        };
        batchSize: number;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
        objectTypes?: string[] | undefined;
    }, {
        type: "ingest.normalize";
        snapshotId: string;
        tenantId: string;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
        objectTypes?: string[] | undefined;
        batchSize?: number | undefined;
    }>, z.ZodObject<{
        tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
        requestId: z.ZodOptional<z.ZodString>;
        idempotencyKey: z.ZodOptional<z.ZodString>;
    } & {
        type: z.ZodLiteral<"ingest.upsert">;
        snapshotId: z.ZodString;
        objectTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        batchSize: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: "ingest.upsert";
        snapshotId: string;
        tenantId: string & {
            readonly __nominal: "TenantId";
        };
        batchSize: number;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
        objectTypes?: string[] | undefined;
    }, {
        type: "ingest.upsert";
        snapshotId: string;
        tenantId: string;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
        objectTypes?: string[] | undefined;
        batchSize?: number | undefined;
    }>, z.ZodObject<{
        tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
        requestId: z.ZodOptional<z.ZodString>;
        idempotencyKey: z.ZodOptional<z.ZodString>;
    } & {
        type: z.ZodLiteral<"ingest.finalize">;
        snapshotId: z.ZodString;
        runQualityChecks: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        type: "ingest.finalize";
        snapshotId: string;
        tenantId: string & {
            readonly __nominal: "TenantId";
        };
        runQualityChecks: boolean;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
    }, {
        type: "ingest.finalize";
        snapshotId: string;
        tenantId: string;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
        runQualityChecks?: boolean | undefined;
    }>, z.ZodObject<{
        tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
        requestId: z.ZodOptional<z.ZodString>;
        idempotencyKey: z.ZodOptional<z.ZodString>;
    } & {
        type: z.ZodLiteral<"ingest.full">;
        snapshotId: z.ZodString;
        connectionIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        runType: z.ZodDefault<z.ZodEnum<["full", "incremental"]>>;
    }, "strip", z.ZodTypeAny, {
        type: "ingest.full";
        snapshotId: string;
        tenantId: string & {
            readonly __nominal: "TenantId";
        };
        runType: "full" | "incremental";
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
        connectionIds?: string[] | undefined;
    }, {
        type: "ingest.full";
        snapshotId: string;
        tenantId: string;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
        runType?: "full" | "incremental" | undefined;
        connectionIds?: string[] | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"identity.resolve">;
        tenantId: z.ZodString;
        snapshotId: z.ZodString;
        runId: z.ZodString;
        config: z.ZodOptional<z.ZodObject<{
            auto_merge_threshold: z.ZodDefault<z.ZodNumber>;
            review_threshold: z.ZodDefault<z.ZodNumber>;
            primary_crm_source: z.ZodOptional<z.ZodEnum<["salesforce", "hubspot", "stripe"]>>;
            blocking_keys: z.ZodDefault<z.ZodArray<z.ZodEnum<["domain", "tax_id", "normalized_name", "address"]>, "many">>;
            scoring_weights: z.ZodOptional<z.ZodObject<{
                name_similarity: z.ZodDefault<z.ZodNumber>;
                domain_match: z.ZodDefault<z.ZodNumber>;
                tax_id_match: z.ZodDefault<z.ZodNumber>;
                address_match: z.ZodDefault<z.ZodNumber>;
                external_id_overlap: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                name_similarity: number;
                domain_match: number;
                tax_id_match: number;
                address_match: number;
                external_id_overlap: number;
            }, {
                name_similarity?: number | undefined;
                domain_match?: number | undefined;
                tax_id_match?: number | undefined;
                address_match?: number | undefined;
                external_id_overlap?: number | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            auto_merge_threshold: number;
            review_threshold: number;
            blocking_keys: ("domain" | "tax_id" | "normalized_name" | "address")[];
            primary_crm_source?: "salesforce" | "hubspot" | "stripe" | undefined;
            scoring_weights?: {
                name_similarity: number;
                domain_match: number;
                tax_id_match: number;
                address_match: number;
                external_id_overlap: number;
            } | undefined;
        }, {
            auto_merge_threshold?: number | undefined;
            review_threshold?: number | undefined;
            primary_crm_source?: "salesforce" | "hubspot" | "stripe" | undefined;
            blocking_keys?: ("domain" | "tax_id" | "normalized_name" | "address")[] | undefined;
            scoring_weights?: {
                name_similarity?: number | undefined;
                domain_match?: number | undefined;
                tax_id_match?: number | undefined;
                address_match?: number | undefined;
                external_id_overlap?: number | undefined;
            } | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        type: "identity.resolve";
        snapshotId: string;
        runId: string;
        tenantId: string;
        config?: {
            auto_merge_threshold: number;
            review_threshold: number;
            blocking_keys: ("domain" | "tax_id" | "normalized_name" | "address")[];
            primary_crm_source?: "salesforce" | "hubspot" | "stripe" | undefined;
            scoring_weights?: {
                name_similarity: number;
                domain_match: number;
                tax_id_match: number;
                address_match: number;
                external_id_overlap: number;
            } | undefined;
        } | undefined;
    }, {
        type: "identity.resolve";
        snapshotId: string;
        runId: string;
        tenantId: string;
        config?: {
            auto_merge_threshold?: number | undefined;
            review_threshold?: number | undefined;
            primary_crm_source?: "salesforce" | "hubspot" | "stripe" | undefined;
            blocking_keys?: ("domain" | "tax_id" | "normalized_name" | "address")[] | undefined;
            scoring_weights?: {
                name_similarity?: number | undefined;
                domain_match?: number | undefined;
                tax_id_match?: number | undefined;
                address_match?: number | undefined;
                external_id_overlap?: number | undefined;
            } | undefined;
        } | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"identity.apply">;
        tenantId: z.ZodString;
        snapshotId: z.ZodString;
        decisionIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "identity.apply";
        snapshotId: string;
        tenantId: string;
        decisionIds?: string[] | undefined;
    }, {
        type: "identity.apply";
        snapshotId: string;
        tenantId: string;
        decisionIds?: string[] | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"upload.csv.parse">;
        tenantId: z.ZodString;
        uploadId: z.ZodString;
        fileId: z.ZodString;
        parseRunId: z.ZodString;
        mapping: z.ZodOptional<z.ZodObject<{
            entityType: z.ZodEnum<["customer", "invoice", "contract", "payment", "product"]>;
            columns: z.ZodArray<z.ZodObject<{
                sourceColumn: z.ZodString;
                targetField: z.ZodString;
                transform: z.ZodOptional<z.ZodEnum<["none", "date", "number", "boolean", "lowercase", "uppercase", "trim"]>>;
                defaultValue: z.ZodOptional<z.ZodString>;
                required: z.ZodOptional<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                sourceColumn: string;
                targetField: string;
                transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
                defaultValue?: string | undefined;
                required?: boolean | undefined;
            }, {
                sourceColumn: string;
                targetField: string;
                transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
                defaultValue?: string | undefined;
                required?: boolean | undefined;
            }>, "many">;
            skipHeaderRow: z.ZodDefault<z.ZodBoolean>;
            delimiter: z.ZodDefault<z.ZodString>;
            dateFormat: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            entityType: "customer" | "invoice" | "contract" | "payment" | "product";
            columns: {
                sourceColumn: string;
                targetField: string;
                transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
                defaultValue?: string | undefined;
                required?: boolean | undefined;
            }[];
            skipHeaderRow: boolean;
            delimiter: string;
            dateFormat?: string | undefined;
        }, {
            entityType: "customer" | "invoice" | "contract" | "payment" | "product";
            columns: {
                sourceColumn: string;
                targetField: string;
                transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
                defaultValue?: string | undefined;
                required?: boolean | undefined;
            }[];
            skipHeaderRow?: boolean | undefined;
            delimiter?: string | undefined;
            dateFormat?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        type: "upload.csv.parse";
        tenantId: string;
        uploadId: string;
        fileId: string;
        parseRunId: string;
        mapping?: {
            entityType: "customer" | "invoice" | "contract" | "payment" | "product";
            columns: {
                sourceColumn: string;
                targetField: string;
                transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
                defaultValue?: string | undefined;
                required?: boolean | undefined;
            }[];
            skipHeaderRow: boolean;
            delimiter: string;
            dateFormat?: string | undefined;
        } | undefined;
    }, {
        type: "upload.csv.parse";
        tenantId: string;
        uploadId: string;
        fileId: string;
        parseRunId: string;
        mapping?: {
            entityType: "customer" | "invoice" | "contract" | "payment" | "product";
            columns: {
                sourceColumn: string;
                targetField: string;
                transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
                defaultValue?: string | undefined;
                required?: boolean | undefined;
            }[];
            skipHeaderRow?: boolean | undefined;
            delimiter?: string | undefined;
            dateFormat?: string | undefined;
        } | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"upload.csv.finalize">;
        tenantId: z.ZodString;
        uploadId: z.ZodString;
        parseRunId: z.ZodString;
        triggerIngestion: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        type: "upload.csv.finalize";
        tenantId: string;
        uploadId: string;
        parseRunId: string;
        triggerIngestion: boolean;
    }, {
        type: "upload.csv.finalize";
        tenantId: string;
        uploadId: string;
        parseRunId: string;
        triggerIngestion?: boolean | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"upload.pdf.parse">;
        tenantId: z.ZodString;
        uploadId: z.ZodString;
        fileId: z.ZodString;
        parseRunId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "upload.pdf.parse";
        tenantId: string;
        uploadId: string;
        fileId: string;
        parseRunId: string;
    }, {
        type: "upload.pdf.parse";
        tenantId: string;
        uploadId: string;
        fileId: string;
        parseRunId: string;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"contracts.pdf.extract">;
        tenantId: z.ZodString;
        snapshotId: z.ZodString;
        documentId: z.ZodString;
        contractId: z.ZodOptional<z.ZodString>;
        contractVersionId: z.ZodOptional<z.ZodString>;
        s3Key: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "contracts.pdf.extract";
        snapshotId: string;
        tenantId: string;
        documentId: string;
        s3Key: string;
        contractId?: string | undefined;
        contractVersionId?: string | undefined;
    }, {
        type: "contracts.pdf.extract";
        snapshotId: string;
        tenantId: string;
        documentId: string;
        s3Key: string;
        contractId?: string | undefined;
        contractVersionId?: string | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"contracts.clause.segment">;
        tenantId: z.ZodString;
        snapshotId: z.ZodString;
        documentId: z.ZodString;
        contractVersionId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "contracts.clause.segment";
        snapshotId: string;
        tenantId: string;
        documentId: string;
        contractVersionId: string;
    }, {
        type: "contracts.clause.segment";
        snapshotId: string;
        tenantId: string;
        documentId: string;
        contractVersionId: string;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"contracts.terms.extract">;
        tenantId: z.ZodString;
        snapshotId: z.ZodString;
        documentId: z.ZodString;
        contractVersionId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "contracts.terms.extract";
        snapshotId: string;
        tenantId: string;
        documentId: string;
        contractVersionId: string;
    }, {
        type: "contracts.terms.extract";
        snapshotId: string;
        tenantId: string;
        documentId: string;
        contractVersionId: string;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"contracts.readiness.compute">;
        tenantId: z.ZodString;
        snapshotId: z.ZodString;
        contractVersionId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "contracts.readiness.compute";
        snapshotId: string;
        tenantId: string;
        contractVersionId: string;
    }, {
        type: "contracts.readiness.compute";
        snapshotId: string;
        tenantId: string;
        contractVersionId: string;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"revrec.compute">;
        tenantId: z.ZodString;
        snapshotId: z.ZodString;
        contractIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        forceRecompute: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        type: "revrec.compute";
        snapshotId: string;
        tenantId: string;
        forceRecompute: boolean;
        contractIds?: string[] | undefined;
    }, {
        type: "revrec.compute";
        snapshotId: string;
        tenantId: string;
        contractIds?: string[] | undefined;
        forceRecompute?: boolean | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"revrec.reconcile">;
        tenantId: z.ZodString;
        snapshotId: z.ZodString;
        periodStart: z.ZodString;
        periodEnd: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "revrec.reconcile";
        snapshotId: string;
        tenantId: string;
        periodStart: string;
        periodEnd: string;
    }, {
        type: "revrec.reconcile";
        snapshotId: string;
        tenantId: string;
        periodStart: string;
        periodEnd: string;
    }>, z.ZodObject<{
        tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
        requestId: z.ZodOptional<z.ZodString>;
        idempotencyKey: z.ZodOptional<z.ZodString>;
    } & {
        type: z.ZodLiteral<"detect.run">;
        snapshotId: z.ZodString;
        rulesetVersion: z.ZodOptional<z.ZodString>;
        config: z.ZodOptional<z.ZodObject<{
            fx: z.ZodDefault<z.ZodObject<{
                rateSource: z.ZodDefault<z.ZodEnum<["ecb", "snapshot_rate", "contract_rate", "manual"]>>;
                rateDate: z.ZodDefault<z.ZodEnum<["invoice_date", "period_end", "snapshot_date"]>>;
                tolerancePct: z.ZodDefault<z.ZodNumber>;
                baseCurrency: z.ZodDefault<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                rateSource: "ecb" | "snapshot_rate" | "contract_rate" | "manual";
                rateDate: "invoice_date" | "period_end" | "snapshot_date";
                tolerancePct: number;
                baseCurrency: string;
            }, {
                rateSource?: "ecb" | "snapshot_rate" | "contract_rate" | "manual" | undefined;
                rateDate?: "invoice_date" | "period_end" | "snapshot_date" | undefined;
                tolerancePct?: number | undefined;
                baseCurrency?: string | undefined;
            }>>;
            proration: z.ZodDefault<z.ZodObject<{
                method: z.ZodDefault<z.ZodEnum<["daily_exact", "daily_30", "monthly_proportional", "none"]>>;
                midPeriodAmendmentHandling: z.ZodDefault<z.ZodEnum<["prorate", "full_period", "skip"]>>;
                rampScheduleRecognition: z.ZodDefault<z.ZodEnum<["as_invoiced", "straight_line"]>>;
            }, "strip", z.ZodTypeAny, {
                method: "none" | "daily_exact" | "daily_30" | "monthly_proportional";
                midPeriodAmendmentHandling: "prorate" | "full_period" | "skip";
                rampScheduleRecognition: "straight_line" | "as_invoiced";
            }, {
                method?: "none" | "daily_exact" | "daily_30" | "monthly_proportional" | undefined;
                midPeriodAmendmentHandling?: "prorate" | "full_period" | "skip" | undefined;
                rampScheduleRecognition?: "straight_line" | "as_invoiced" | undefined;
            }>>;
            taxFees: z.ZodDefault<z.ZodObject<{
                excludeFromComparison: z.ZodDefault<z.ZodBoolean>;
                taxLineItemCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                feeLineItemCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                excludeFromComparison: boolean;
                taxLineItemCodes: string[];
                feeLineItemCodes: string[];
            }, {
                excludeFromComparison?: boolean | undefined;
                taxLineItemCodes?: string[] | undefined;
                feeLineItemCodes?: string[] | undefined;
            }>>;
            credits: z.ZodDefault<z.ZodObject<{
                netWithInvoices: z.ZodDefault<z.ZodBoolean>;
                treatAsSeparateRevenue: z.ZodDefault<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                netWithInvoices: boolean;
                treatAsSeparateRevenue: boolean;
            }, {
                netWithInvoices?: boolean | undefined;
                treatAsSeparateRevenue?: boolean | undefined;
            }>>;
            zeroValue: z.ZodDefault<z.ZodObject<{
                treatAsValid: z.ZodDefault<z.ZodBoolean>;
                skipBillingRules: z.ZodDefault<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                treatAsValid: boolean;
                skipBillingRules: boolean;
            }, {
                treatAsValid?: boolean | undefined;
                skipBillingRules?: boolean | undefined;
            }>>;
            thresholds: z.ZodDefault<z.ZodObject<{
                amountVariancePct: z.ZodDefault<z.ZodNumber>;
                amountVarianceAbs: z.ZodDefault<z.ZodNumber>;
                timingVarianceDays: z.ZodDefault<z.ZodNumber>;
                highImpactThreshold: z.ZodDefault<z.ZodNumber>;
                criticalImpactThreshold: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                amountVariancePct: number;
                amountVarianceAbs: number;
                timingVarianceDays: number;
                highImpactThreshold: number;
                criticalImpactThreshold: number;
            }, {
                amountVariancePct?: number | undefined;
                amountVarianceAbs?: number | undefined;
                timingVarianceDays?: number | undefined;
                highImpactThreshold?: number | undefined;
                criticalImpactThreshold?: number | undefined;
            }>>;
            gating: z.ZodDefault<z.ZodObject<{
                skipIfContractNotReady: z.ZodDefault<z.ZodBoolean>;
                confidenceCapIfNotReady: z.ZodDefault<z.ZodNumber>;
                skipIfUsageStale: z.ZodDefault<z.ZodBoolean>;
                usageStalenessHours: z.ZodDefault<z.ZodNumber>;
                skipIfCRMStale: z.ZodDefault<z.ZodBoolean>;
                crmStalenessHours: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                skipIfContractNotReady: boolean;
                confidenceCapIfNotReady: number;
                skipIfUsageStale: boolean;
                usageStalenessHours: number;
                skipIfCRMStale: boolean;
                crmStalenessHours: number;
            }, {
                skipIfContractNotReady?: boolean | undefined;
                confidenceCapIfNotReady?: number | undefined;
                skipIfUsageStale?: boolean | undefined;
                usageStalenessHours?: number | undefined;
                skipIfCRMStale?: boolean | undefined;
                crmStalenessHours?: number | undefined;
            }>>;
            autoRenewal: z.ZodDefault<z.ZodObject<{
                detectImplicitRenewal: z.ZodDefault<z.ZodBoolean>;
                renewalGraceDays: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                detectImplicitRenewal: boolean;
                renewalGraceDays: number;
            }, {
                detectImplicitRenewal?: boolean | undefined;
                renewalGraceDays?: number | undefined;
            }>>;
            enabledRules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            disabledRules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            aiEnrichment: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodDefault<z.ZodBoolean>;
                maxIssuesPerRun: z.ZodDefault<z.ZodNumber>;
                minConfidenceToEnrich: z.ZodDefault<z.ZodNumber>;
                includeRecommendations: z.ZodDefault<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                enabled: boolean;
                maxIssuesPerRun: number;
                minConfidenceToEnrich: number;
                includeRecommendations: boolean;
            }, {
                enabled?: boolean | undefined;
                maxIssuesPerRun?: number | undefined;
                minConfidenceToEnrich?: number | undefined;
                includeRecommendations?: boolean | undefined;
            }>>;
            aiAnomalyDetection: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodDefault<z.ZodBoolean>;
                minConfidenceToReport: z.ZodDefault<z.ZodNumber>;
                maxAnomaliesPerRun: z.ZodDefault<z.ZodNumber>;
                categories: z.ZodDefault<z.ZodArray<z.ZodEnum<["semantic", "pattern", "anomaly", "contextual"]>, "many">>;
            }, "strip", z.ZodTypeAny, {
                enabled: boolean;
                minConfidenceToReport: number;
                maxAnomaliesPerRun: number;
                categories: ("pattern" | "semantic" | "anomaly" | "contextual")[];
            }, {
                enabled?: boolean | undefined;
                minConfidenceToReport?: number | undefined;
                maxAnomaliesPerRun?: number | undefined;
                categories?: ("pattern" | "semantic" | "anomaly" | "contextual")[] | undefined;
            }>>;
            llmCostControls: z.ZodOptional<z.ZodObject<{
                maxCostPerRunUsd: z.ZodDefault<z.ZodNumber>;
                preferredModel: z.ZodDefault<z.ZodEnum<["gpt-4o", "gpt-4o-mini"]>>;
                enableCaching: z.ZodDefault<z.ZodBoolean>;
                budgetAlertThresholdUsd: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                maxCostPerRunUsd: number;
                preferredModel: "gpt-4o" | "gpt-4o-mini";
                enableCaching: boolean;
                budgetAlertThresholdUsd?: number | undefined;
            }, {
                maxCostPerRunUsd?: number | undefined;
                preferredModel?: "gpt-4o" | "gpt-4o-mini" | undefined;
                enableCaching?: boolean | undefined;
                budgetAlertThresholdUsd?: number | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            credits: {
                netWithInvoices: boolean;
                treatAsSeparateRevenue: boolean;
            };
            fx: {
                rateSource: "ecb" | "snapshot_rate" | "contract_rate" | "manual";
                rateDate: "invoice_date" | "period_end" | "snapshot_date";
                tolerancePct: number;
                baseCurrency: string;
            };
            proration: {
                method: "none" | "daily_exact" | "daily_30" | "monthly_proportional";
                midPeriodAmendmentHandling: "prorate" | "full_period" | "skip";
                rampScheduleRecognition: "straight_line" | "as_invoiced";
            };
            taxFees: {
                excludeFromComparison: boolean;
                taxLineItemCodes: string[];
                feeLineItemCodes: string[];
            };
            zeroValue: {
                treatAsValid: boolean;
                skipBillingRules: boolean;
            };
            thresholds: {
                amountVariancePct: number;
                amountVarianceAbs: number;
                timingVarianceDays: number;
                highImpactThreshold: number;
                criticalImpactThreshold: number;
            };
            gating: {
                skipIfContractNotReady: boolean;
                confidenceCapIfNotReady: number;
                skipIfUsageStale: boolean;
                usageStalenessHours: number;
                skipIfCRMStale: boolean;
                crmStalenessHours: number;
            };
            autoRenewal: {
                detectImplicitRenewal: boolean;
                renewalGraceDays: number;
            };
            enabledRules?: string[] | undefined;
            disabledRules?: string[] | undefined;
            aiEnrichment?: {
                enabled: boolean;
                maxIssuesPerRun: number;
                minConfidenceToEnrich: number;
                includeRecommendations: boolean;
            } | undefined;
            aiAnomalyDetection?: {
                enabled: boolean;
                minConfidenceToReport: number;
                maxAnomaliesPerRun: number;
                categories: ("pattern" | "semantic" | "anomaly" | "contextual")[];
            } | undefined;
            llmCostControls?: {
                maxCostPerRunUsd: number;
                preferredModel: "gpt-4o" | "gpt-4o-mini";
                enableCaching: boolean;
                budgetAlertThresholdUsd?: number | undefined;
            } | undefined;
        }, {
            credits?: {
                netWithInvoices?: boolean | undefined;
                treatAsSeparateRevenue?: boolean | undefined;
            } | undefined;
            fx?: {
                rateSource?: "ecb" | "snapshot_rate" | "contract_rate" | "manual" | undefined;
                rateDate?: "invoice_date" | "period_end" | "snapshot_date" | undefined;
                tolerancePct?: number | undefined;
                baseCurrency?: string | undefined;
            } | undefined;
            proration?: {
                method?: "none" | "daily_exact" | "daily_30" | "monthly_proportional" | undefined;
                midPeriodAmendmentHandling?: "prorate" | "full_period" | "skip" | undefined;
                rampScheduleRecognition?: "straight_line" | "as_invoiced" | undefined;
            } | undefined;
            taxFees?: {
                excludeFromComparison?: boolean | undefined;
                taxLineItemCodes?: string[] | undefined;
                feeLineItemCodes?: string[] | undefined;
            } | undefined;
            zeroValue?: {
                treatAsValid?: boolean | undefined;
                skipBillingRules?: boolean | undefined;
            } | undefined;
            thresholds?: {
                amountVariancePct?: number | undefined;
                amountVarianceAbs?: number | undefined;
                timingVarianceDays?: number | undefined;
                highImpactThreshold?: number | undefined;
                criticalImpactThreshold?: number | undefined;
            } | undefined;
            gating?: {
                skipIfContractNotReady?: boolean | undefined;
                confidenceCapIfNotReady?: number | undefined;
                skipIfUsageStale?: boolean | undefined;
                usageStalenessHours?: number | undefined;
                skipIfCRMStale?: boolean | undefined;
                crmStalenessHours?: number | undefined;
            } | undefined;
            autoRenewal?: {
                detectImplicitRenewal?: boolean | undefined;
                renewalGraceDays?: number | undefined;
            } | undefined;
            enabledRules?: string[] | undefined;
            disabledRules?: string[] | undefined;
            aiEnrichment?: {
                enabled?: boolean | undefined;
                maxIssuesPerRun?: number | undefined;
                minConfidenceToEnrich?: number | undefined;
                includeRecommendations?: boolean | undefined;
            } | undefined;
            aiAnomalyDetection?: {
                enabled?: boolean | undefined;
                minConfidenceToReport?: number | undefined;
                maxAnomaliesPerRun?: number | undefined;
                categories?: ("pattern" | "semantic" | "anomaly" | "contextual")[] | undefined;
            } | undefined;
            llmCostControls?: {
                maxCostPerRunUsd?: number | undefined;
                preferredModel?: "gpt-4o" | "gpt-4o-mini" | undefined;
                enableCaching?: boolean | undefined;
                budgetAlertThresholdUsd?: number | undefined;
            } | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        type: "detect.run";
        snapshotId: string;
        tenantId: string & {
            readonly __nominal: "TenantId";
        };
        config?: {
            credits: {
                netWithInvoices: boolean;
                treatAsSeparateRevenue: boolean;
            };
            fx: {
                rateSource: "ecb" | "snapshot_rate" | "contract_rate" | "manual";
                rateDate: "invoice_date" | "period_end" | "snapshot_date";
                tolerancePct: number;
                baseCurrency: string;
            };
            proration: {
                method: "none" | "daily_exact" | "daily_30" | "monthly_proportional";
                midPeriodAmendmentHandling: "prorate" | "full_period" | "skip";
                rampScheduleRecognition: "straight_line" | "as_invoiced";
            };
            taxFees: {
                excludeFromComparison: boolean;
                taxLineItemCodes: string[];
                feeLineItemCodes: string[];
            };
            zeroValue: {
                treatAsValid: boolean;
                skipBillingRules: boolean;
            };
            thresholds: {
                amountVariancePct: number;
                amountVarianceAbs: number;
                timingVarianceDays: number;
                highImpactThreshold: number;
                criticalImpactThreshold: number;
            };
            gating: {
                skipIfContractNotReady: boolean;
                confidenceCapIfNotReady: number;
                skipIfUsageStale: boolean;
                usageStalenessHours: number;
                skipIfCRMStale: boolean;
                crmStalenessHours: number;
            };
            autoRenewal: {
                detectImplicitRenewal: boolean;
                renewalGraceDays: number;
            };
            enabledRules?: string[] | undefined;
            disabledRules?: string[] | undefined;
            aiEnrichment?: {
                enabled: boolean;
                maxIssuesPerRun: number;
                minConfidenceToEnrich: number;
                includeRecommendations: boolean;
            } | undefined;
            aiAnomalyDetection?: {
                enabled: boolean;
                minConfidenceToReport: number;
                maxAnomaliesPerRun: number;
                categories: ("pattern" | "semantic" | "anomaly" | "contextual")[];
            } | undefined;
            llmCostControls?: {
                maxCostPerRunUsd: number;
                preferredModel: "gpt-4o" | "gpt-4o-mini";
                enableCaching: boolean;
                budgetAlertThresholdUsd?: number | undefined;
            } | undefined;
        } | undefined;
        rulesetVersion?: string | undefined;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
    }, {
        type: "detect.run";
        snapshotId: string;
        tenantId: string;
        config?: {
            credits?: {
                netWithInvoices?: boolean | undefined;
                treatAsSeparateRevenue?: boolean | undefined;
            } | undefined;
            fx?: {
                rateSource?: "ecb" | "snapshot_rate" | "contract_rate" | "manual" | undefined;
                rateDate?: "invoice_date" | "period_end" | "snapshot_date" | undefined;
                tolerancePct?: number | undefined;
                baseCurrency?: string | undefined;
            } | undefined;
            proration?: {
                method?: "none" | "daily_exact" | "daily_30" | "monthly_proportional" | undefined;
                midPeriodAmendmentHandling?: "prorate" | "full_period" | "skip" | undefined;
                rampScheduleRecognition?: "straight_line" | "as_invoiced" | undefined;
            } | undefined;
            taxFees?: {
                excludeFromComparison?: boolean | undefined;
                taxLineItemCodes?: string[] | undefined;
                feeLineItemCodes?: string[] | undefined;
            } | undefined;
            zeroValue?: {
                treatAsValid?: boolean | undefined;
                skipBillingRules?: boolean | undefined;
            } | undefined;
            thresholds?: {
                amountVariancePct?: number | undefined;
                amountVarianceAbs?: number | undefined;
                timingVarianceDays?: number | undefined;
                highImpactThreshold?: number | undefined;
                criticalImpactThreshold?: number | undefined;
            } | undefined;
            gating?: {
                skipIfContractNotReady?: boolean | undefined;
                confidenceCapIfNotReady?: number | undefined;
                skipIfUsageStale?: boolean | undefined;
                usageStalenessHours?: number | undefined;
                skipIfCRMStale?: boolean | undefined;
                crmStalenessHours?: number | undefined;
            } | undefined;
            autoRenewal?: {
                detectImplicitRenewal?: boolean | undefined;
                renewalGraceDays?: number | undefined;
            } | undefined;
            enabledRules?: string[] | undefined;
            disabledRules?: string[] | undefined;
            aiEnrichment?: {
                enabled?: boolean | undefined;
                maxIssuesPerRun?: number | undefined;
                minConfidenceToEnrich?: number | undefined;
                includeRecommendations?: boolean | undefined;
            } | undefined;
            aiAnomalyDetection?: {
                enabled?: boolean | undefined;
                minConfidenceToReport?: number | undefined;
                maxAnomaliesPerRun?: number | undefined;
                categories?: ("pattern" | "semantic" | "anomaly" | "contextual")[] | undefined;
            } | undefined;
            llmCostControls?: {
                maxCostPerRunUsd?: number | undefined;
                preferredModel?: "gpt-4o" | "gpt-4o-mini" | undefined;
                enableCaching?: boolean | undefined;
                budgetAlertThresholdUsd?: number | undefined;
            } | undefined;
        } | undefined;
        rulesetVersion?: string | undefined;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
    }>, z.ZodObject<{
        tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
        requestId: z.ZodOptional<z.ZodString>;
        idempotencyKey: z.ZodOptional<z.ZodString>;
    } & {
        type: z.ZodLiteral<"detect.replay">;
        runId: z.ZodString;
        rulesetVersion: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "detect.replay";
        runId: string;
        tenantId: string & {
            readonly __nominal: "TenantId";
        };
        rulesetVersion?: string | undefined;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
    }, {
        type: "detect.replay";
        runId: string;
        tenantId: string;
        rulesetVersion?: string | undefined;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"evidence.generate">;
        tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
        snapshotId: z.ZodString;
        detectionRunId: z.ZodOptional<z.ZodString>;
        issueIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        force: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        requestId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "evidence.generate";
        snapshotId: string;
        tenantId: string & {
            readonly __nominal: "TenantId";
        };
        force: boolean;
        issueIds?: string[] | undefined;
        requestId?: string | undefined;
        detectionRunId?: string | undefined;
    }, {
        type: "evidence.generate";
        snapshotId: string;
        tenantId: string;
        issueIds?: string[] | undefined;
        requestId?: string | undefined;
        detectionRunId?: string | undefined;
        force?: boolean | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"evidence.regenerate">;
        tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
        issueId: z.ZodString;
        force: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        actorUserId: z.ZodOptional<z.ZodString>;
        reason: z.ZodOptional<z.ZodString>;
        requestId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "evidence.regenerate";
        tenantId: string & {
            readonly __nominal: "TenantId";
        };
        issueId: string;
        force: boolean;
        reason?: string | undefined;
        actorUserId?: string | undefined;
        requestId?: string | undefined;
    }, {
        type: "evidence.regenerate";
        tenantId: string;
        issueId: string;
        reason?: string | undefined;
        actorUserId?: string | undefined;
        requestId?: string | undefined;
        force?: boolean | undefined;
    }>, z.ZodObject<{
        tenantId: z.ZodString;
        requestId: z.ZodOptional<z.ZodString>;
        idempotencyKey: z.ZodOptional<z.ZodString>;
    } & {
        type: z.ZodLiteral<"simulation.run">;
        simulationId: z.ZodString;
        runId: z.ZodString;
        options: z.ZodOptional<z.ZodObject<{
            recomputeRevRec: z.ZodDefault<z.ZodBoolean>;
            includeIssueAnalysis: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            recomputeRevRec: boolean;
            includeIssueAnalysis: boolean;
        }, {
            recomputeRevRec?: boolean | undefined;
            includeIssueAnalysis?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        type: "simulation.run";
        runId: string;
        tenantId: string;
        simulationId: string;
        options?: {
            recomputeRevRec: boolean;
            includeIssueAnalysis: boolean;
        } | undefined;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
    }, {
        type: "simulation.run";
        runId: string;
        tenantId: string;
        simulationId: string;
        options?: {
            recomputeRevRec?: boolean | undefined;
            includeIssueAnalysis?: boolean | undefined;
        } | undefined;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
    }>, z.ZodObject<{
        tenantId: z.ZodString;
        requestId: z.ZodOptional<z.ZodString>;
        idempotencyKey: z.ZodOptional<z.ZodString>;
    } & {
        type: z.ZodLiteral<"simulation.replay">;
        simulationId: z.ZodString;
        originalRunId: z.ZodString;
        newRunId: z.ZodString;
        options: z.ZodOptional<z.ZodObject<{
            recomputeRevRec: z.ZodDefault<z.ZodBoolean>;
            includeIssueAnalysis: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            recomputeRevRec: boolean;
            includeIssueAnalysis: boolean;
        }, {
            recomputeRevRec?: boolean | undefined;
            includeIssueAnalysis?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        type: "simulation.replay";
        tenantId: string;
        simulationId: string;
        originalRunId: string;
        newRunId: string;
        options?: {
            recomputeRevRec: boolean;
            includeIssueAnalysis: boolean;
        } | undefined;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
    }, {
        type: "simulation.replay";
        tenantId: string;
        simulationId: string;
        originalRunId: string;
        newRunId: string;
        options?: {
            recomputeRevRec?: boolean | undefined;
            includeIssueAnalysis?: boolean | undefined;
        } | undefined;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
    }>, z.ZodObject<{
        tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
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
    }>, z.ZodObject<{
        tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
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
    }>, z.ZodObject<{
        tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
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
    }>]>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    payload: {
        type: "identity.resolve";
        snapshotId: string;
        runId: string;
        tenantId: string;
        config?: {
            auto_merge_threshold: number;
            review_threshold: number;
            blocking_keys: ("domain" | "tax_id" | "normalized_name" | "address")[];
            primary_crm_source?: "salesforce" | "hubspot" | "stripe" | undefined;
            scoring_weights?: {
                name_similarity: number;
                domain_match: number;
                tax_id_match: number;
                address_match: number;
                external_id_overlap: number;
            } | undefined;
        } | undefined;
    } | {
        type: "identity.apply";
        snapshotId: string;
        tenantId: string;
        decisionIds?: string[] | undefined;
    } | {
        type: "upload.csv.parse";
        tenantId: string;
        uploadId: string;
        fileId: string;
        parseRunId: string;
        mapping?: {
            entityType: "customer" | "invoice" | "contract" | "payment" | "product";
            columns: {
                sourceColumn: string;
                targetField: string;
                transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
                defaultValue?: string | undefined;
                required?: boolean | undefined;
            }[];
            skipHeaderRow: boolean;
            delimiter: string;
            dateFormat?: string | undefined;
        } | undefined;
    } | {
        type: "upload.csv.finalize";
        tenantId: string;
        uploadId: string;
        parseRunId: string;
        triggerIngestion: boolean;
    } | {
        type: "upload.pdf.parse";
        tenantId: string;
        uploadId: string;
        fileId: string;
        parseRunId: string;
    } | {
        type: "contracts.pdf.extract";
        snapshotId: string;
        tenantId: string;
        documentId: string;
        s3Key: string;
        contractId?: string | undefined;
        contractVersionId?: string | undefined;
    } | {
        type: "contracts.clause.segment";
        snapshotId: string;
        tenantId: string;
        documentId: string;
        contractVersionId: string;
    } | {
        type: "contracts.terms.extract";
        snapshotId: string;
        tenantId: string;
        documentId: string;
        contractVersionId: string;
    } | {
        type: "contracts.readiness.compute";
        snapshotId: string;
        tenantId: string;
        contractVersionId: string;
    } | {
        type: "revrec.compute";
        snapshotId: string;
        tenantId: string;
        forceRecompute: boolean;
        contractIds?: string[] | undefined;
    } | {
        type: "revrec.reconcile";
        snapshotId: string;
        tenantId: string;
        periodStart: string;
        periodEnd: string;
    } | {
        type: "detect.run";
        snapshotId: string;
        tenantId: string & {
            readonly __nominal: "TenantId";
        };
        config?: {
            credits: {
                netWithInvoices: boolean;
                treatAsSeparateRevenue: boolean;
            };
            fx: {
                rateSource: "ecb" | "snapshot_rate" | "contract_rate" | "manual";
                rateDate: "invoice_date" | "period_end" | "snapshot_date";
                tolerancePct: number;
                baseCurrency: string;
            };
            proration: {
                method: "none" | "daily_exact" | "daily_30" | "monthly_proportional";
                midPeriodAmendmentHandling: "prorate" | "full_period" | "skip";
                rampScheduleRecognition: "straight_line" | "as_invoiced";
            };
            taxFees: {
                excludeFromComparison: boolean;
                taxLineItemCodes: string[];
                feeLineItemCodes: string[];
            };
            zeroValue: {
                treatAsValid: boolean;
                skipBillingRules: boolean;
            };
            thresholds: {
                amountVariancePct: number;
                amountVarianceAbs: number;
                timingVarianceDays: number;
                highImpactThreshold: number;
                criticalImpactThreshold: number;
            };
            gating: {
                skipIfContractNotReady: boolean;
                confidenceCapIfNotReady: number;
                skipIfUsageStale: boolean;
                usageStalenessHours: number;
                skipIfCRMStale: boolean;
                crmStalenessHours: number;
            };
            autoRenewal: {
                detectImplicitRenewal: boolean;
                renewalGraceDays: number;
            };
            enabledRules?: string[] | undefined;
            disabledRules?: string[] | undefined;
            aiEnrichment?: {
                enabled: boolean;
                maxIssuesPerRun: number;
                minConfidenceToEnrich: number;
                includeRecommendations: boolean;
            } | undefined;
            aiAnomalyDetection?: {
                enabled: boolean;
                minConfidenceToReport: number;
                maxAnomaliesPerRun: number;
                categories: ("pattern" | "semantic" | "anomaly" | "contextual")[];
            } | undefined;
            llmCostControls?: {
                maxCostPerRunUsd: number;
                preferredModel: "gpt-4o" | "gpt-4o-mini";
                enableCaching: boolean;
                budgetAlertThresholdUsd?: number | undefined;
            } | undefined;
        } | undefined;
        rulesetVersion?: string | undefined;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
    } | {
        type: "detect.replay";
        runId: string;
        tenantId: string & {
            readonly __nominal: "TenantId";
        };
        rulesetVersion?: string | undefined;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
    } | {
        type: "evidence.generate";
        snapshotId: string;
        tenantId: string & {
            readonly __nominal: "TenantId";
        };
        force: boolean;
        issueIds?: string[] | undefined;
        requestId?: string | undefined;
        detectionRunId?: string | undefined;
    } | {
        type: "evidence.regenerate";
        tenantId: string & {
            readonly __nominal: "TenantId";
        };
        issueId: string;
        force: boolean;
        reason?: string | undefined;
        actorUserId?: string | undefined;
        requestId?: string | undefined;
    } | {
        type: "simulation.run";
        runId: string;
        tenantId: string;
        simulationId: string;
        options?: {
            recomputeRevRec: boolean;
            includeIssueAnalysis: boolean;
        } | undefined;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
    } | {
        type: "simulation.replay";
        tenantId: string;
        simulationId: string;
        originalRunId: string;
        newRunId: string;
        options?: {
            recomputeRevRec: boolean;
            includeIssueAnalysis: boolean;
        } | undefined;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
    } | {
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
    } | {
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
    } | {
        type: "digest.send";
        runId: string;
        tenantId: string & {
            readonly __nominal: "TenantId";
        };
        subscriptionId: string;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
    } | {
        type: "sync";
        runId: string;
        tenantId: string & {
            readonly __nominal: "TenantId";
        };
        connectionId: string;
        runType: "full" | "incremental";
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
        objectTypes?: string[] | undefined;
    } | {
        type: "detect";
        tenantId: string & {
            readonly __nominal: "TenantId";
        };
        scope: "usage" | "billing" | "contracts" | "all";
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
    } | {
        type: "simulate";
        tenantId: string & {
            readonly __nominal: "TenantId";
        };
        scenarioId: string;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
        parameters?: Record<string, unknown> | undefined;
    } | {
        type: "export";
        tenantId: string & {
            readonly __nominal: "TenantId";
        };
        format: "csv" | "pdf" | "xlsx";
        reportType: "audit" | "issues" | "revrec" | "summary";
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
    } | {
        type: "ingest.load";
        snapshotId: string;
        tenantId: string & {
            readonly __nominal: "TenantId";
        };
        connectionId: string;
        batchIds: string[];
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
    } | {
        type: "ingest.normalize";
        snapshotId: string;
        tenantId: string & {
            readonly __nominal: "TenantId";
        };
        batchSize: number;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
        objectTypes?: string[] | undefined;
    } | {
        type: "ingest.upsert";
        snapshotId: string;
        tenantId: string & {
            readonly __nominal: "TenantId";
        };
        batchSize: number;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
        objectTypes?: string[] | undefined;
    } | {
        type: "ingest.finalize";
        snapshotId: string;
        tenantId: string & {
            readonly __nominal: "TenantId";
        };
        runQualityChecks: boolean;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
    } | {
        type: "ingest.full";
        snapshotId: string;
        tenantId: string & {
            readonly __nominal: "TenantId";
        };
        runType: "full" | "incremental";
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
        connectionIds?: string[] | undefined;
    };
    idempotencyKey?: string | undefined;
}, {
    payload: {
        type: "identity.resolve";
        snapshotId: string;
        runId: string;
        tenantId: string;
        config?: {
            auto_merge_threshold?: number | undefined;
            review_threshold?: number | undefined;
            primary_crm_source?: "salesforce" | "hubspot" | "stripe" | undefined;
            blocking_keys?: ("domain" | "tax_id" | "normalized_name" | "address")[] | undefined;
            scoring_weights?: {
                name_similarity?: number | undefined;
                domain_match?: number | undefined;
                tax_id_match?: number | undefined;
                address_match?: number | undefined;
                external_id_overlap?: number | undefined;
            } | undefined;
        } | undefined;
    } | {
        type: "identity.apply";
        snapshotId: string;
        tenantId: string;
        decisionIds?: string[] | undefined;
    } | {
        type: "upload.csv.parse";
        tenantId: string;
        uploadId: string;
        fileId: string;
        parseRunId: string;
        mapping?: {
            entityType: "customer" | "invoice" | "contract" | "payment" | "product";
            columns: {
                sourceColumn: string;
                targetField: string;
                transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
                defaultValue?: string | undefined;
                required?: boolean | undefined;
            }[];
            skipHeaderRow?: boolean | undefined;
            delimiter?: string | undefined;
            dateFormat?: string | undefined;
        } | undefined;
    } | {
        type: "upload.csv.finalize";
        tenantId: string;
        uploadId: string;
        parseRunId: string;
        triggerIngestion?: boolean | undefined;
    } | {
        type: "upload.pdf.parse";
        tenantId: string;
        uploadId: string;
        fileId: string;
        parseRunId: string;
    } | {
        type: "contracts.pdf.extract";
        snapshotId: string;
        tenantId: string;
        documentId: string;
        s3Key: string;
        contractId?: string | undefined;
        contractVersionId?: string | undefined;
    } | {
        type: "contracts.clause.segment";
        snapshotId: string;
        tenantId: string;
        documentId: string;
        contractVersionId: string;
    } | {
        type: "contracts.terms.extract";
        snapshotId: string;
        tenantId: string;
        documentId: string;
        contractVersionId: string;
    } | {
        type: "contracts.readiness.compute";
        snapshotId: string;
        tenantId: string;
        contractVersionId: string;
    } | {
        type: "revrec.compute";
        snapshotId: string;
        tenantId: string;
        contractIds?: string[] | undefined;
        forceRecompute?: boolean | undefined;
    } | {
        type: "revrec.reconcile";
        snapshotId: string;
        tenantId: string;
        periodStart: string;
        periodEnd: string;
    } | {
        type: "detect.run";
        snapshotId: string;
        tenantId: string;
        config?: {
            credits?: {
                netWithInvoices?: boolean | undefined;
                treatAsSeparateRevenue?: boolean | undefined;
            } | undefined;
            fx?: {
                rateSource?: "ecb" | "snapshot_rate" | "contract_rate" | "manual" | undefined;
                rateDate?: "invoice_date" | "period_end" | "snapshot_date" | undefined;
                tolerancePct?: number | undefined;
                baseCurrency?: string | undefined;
            } | undefined;
            proration?: {
                method?: "none" | "daily_exact" | "daily_30" | "monthly_proportional" | undefined;
                midPeriodAmendmentHandling?: "prorate" | "full_period" | "skip" | undefined;
                rampScheduleRecognition?: "straight_line" | "as_invoiced" | undefined;
            } | undefined;
            taxFees?: {
                excludeFromComparison?: boolean | undefined;
                taxLineItemCodes?: string[] | undefined;
                feeLineItemCodes?: string[] | undefined;
            } | undefined;
            zeroValue?: {
                treatAsValid?: boolean | undefined;
                skipBillingRules?: boolean | undefined;
            } | undefined;
            thresholds?: {
                amountVariancePct?: number | undefined;
                amountVarianceAbs?: number | undefined;
                timingVarianceDays?: number | undefined;
                highImpactThreshold?: number | undefined;
                criticalImpactThreshold?: number | undefined;
            } | undefined;
            gating?: {
                skipIfContractNotReady?: boolean | undefined;
                confidenceCapIfNotReady?: number | undefined;
                skipIfUsageStale?: boolean | undefined;
                usageStalenessHours?: number | undefined;
                skipIfCRMStale?: boolean | undefined;
                crmStalenessHours?: number | undefined;
            } | undefined;
            autoRenewal?: {
                detectImplicitRenewal?: boolean | undefined;
                renewalGraceDays?: number | undefined;
            } | undefined;
            enabledRules?: string[] | undefined;
            disabledRules?: string[] | undefined;
            aiEnrichment?: {
                enabled?: boolean | undefined;
                maxIssuesPerRun?: number | undefined;
                minConfidenceToEnrich?: number | undefined;
                includeRecommendations?: boolean | undefined;
            } | undefined;
            aiAnomalyDetection?: {
                enabled?: boolean | undefined;
                minConfidenceToReport?: number | undefined;
                maxAnomaliesPerRun?: number | undefined;
                categories?: ("pattern" | "semantic" | "anomaly" | "contextual")[] | undefined;
            } | undefined;
            llmCostControls?: {
                maxCostPerRunUsd?: number | undefined;
                preferredModel?: "gpt-4o" | "gpt-4o-mini" | undefined;
                enableCaching?: boolean | undefined;
                budgetAlertThresholdUsd?: number | undefined;
            } | undefined;
        } | undefined;
        rulesetVersion?: string | undefined;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
    } | {
        type: "detect.replay";
        runId: string;
        tenantId: string;
        rulesetVersion?: string | undefined;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
    } | {
        type: "evidence.generate";
        snapshotId: string;
        tenantId: string;
        issueIds?: string[] | undefined;
        requestId?: string | undefined;
        detectionRunId?: string | undefined;
        force?: boolean | undefined;
    } | {
        type: "evidence.regenerate";
        tenantId: string;
        issueId: string;
        reason?: string | undefined;
        actorUserId?: string | undefined;
        requestId?: string | undefined;
        force?: boolean | undefined;
    } | {
        type: "simulation.run";
        runId: string;
        tenantId: string;
        simulationId: string;
        options?: {
            recomputeRevRec?: boolean | undefined;
            includeIssueAnalysis?: boolean | undefined;
        } | undefined;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
    } | {
        type: "simulation.replay";
        tenantId: string;
        simulationId: string;
        originalRunId: string;
        newRunId: string;
        options?: {
            recomputeRevRec?: boolean | undefined;
            includeIssueAnalysis?: boolean | undefined;
        } | undefined;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
    } | {
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
    } | {
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
    } | {
        type: "digest.send";
        runId: string;
        tenantId: string;
        subscriptionId: string;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
    } | {
        type: "sync";
        runId: string;
        tenantId: string;
        connectionId: string;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
        runType?: "full" | "incremental" | undefined;
        objectTypes?: string[] | undefined;
    } | {
        type: "detect";
        tenantId: string;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
        scope?: "usage" | "billing" | "contracts" | "all" | undefined;
    } | {
        type: "simulate";
        tenantId: string;
        scenarioId: string;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
        parameters?: Record<string, unknown> | undefined;
    } | {
        type: "export";
        tenantId: string;
        reportType: "audit" | "issues" | "revrec" | "summary";
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
        format?: "csv" | "pdf" | "xlsx" | undefined;
    } | {
        type: "ingest.load";
        snapshotId: string;
        tenantId: string;
        connectionId: string;
        batchIds: string[];
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
    } | {
        type: "ingest.normalize";
        snapshotId: string;
        tenantId: string;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
        objectTypes?: string[] | undefined;
        batchSize?: number | undefined;
    } | {
        type: "ingest.upsert";
        snapshotId: string;
        tenantId: string;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
        objectTypes?: string[] | undefined;
        batchSize?: number | undefined;
    } | {
        type: "ingest.finalize";
        snapshotId: string;
        tenantId: string;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
        runQualityChecks?: boolean | undefined;
    } | {
        type: "ingest.full";
        snapshotId: string;
        tenantId: string;
        requestId?: string | undefined;
        idempotencyKey?: string | undefined;
        runType?: "full" | "incremental" | undefined;
        connectionIds?: string[] | undefined;
    };
    idempotencyKey?: string | undefined;
}>;
export type EnqueueJobRequest = z.infer<typeof EnqueueJobRequestSchema>;
//# sourceMappingURL=jobs.d.ts.map