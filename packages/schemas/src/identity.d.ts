/**
 * Identity Resolution Schemas
 *
 * Zod schemas for identity matching, scoring, and decisions.
 */
import { z } from 'zod';
export declare function createIdentityRunId(): string;
export declare function createCustomerIdentityId(): string;
export declare function createIdentityMemberId(): string;
export declare function createIdentityCandidateId(): string;
export declare function createIdentityTaskId(): string;
export declare function createIdentityDecisionId(): string;
export declare function createIdentityOverrideId(): string;
export declare function createIdentitySuppressionId(): string;
export declare const MatchFeaturesSchema: z.ZodObject<{
    name_similarity: z.ZodNumber;
    domain_match: z.ZodBoolean;
    tax_id_match: z.ZodBoolean;
    address_match: z.ZodBoolean;
    external_id_overlap: z.ZodBoolean;
    phone_match: z.ZodOptional<z.ZodBoolean>;
    name_tokens_overlap: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name_similarity: number;
    domain_match: boolean;
    tax_id_match: boolean;
    address_match: boolean;
    external_id_overlap: boolean;
    phone_match?: boolean | undefined;
    name_tokens_overlap?: number | undefined;
}, {
    name_similarity: number;
    domain_match: boolean;
    tax_id_match: boolean;
    address_match: boolean;
    external_id_overlap: boolean;
    phone_match?: boolean | undefined;
    name_tokens_overlap?: number | undefined;
}>;
export type MatchFeatures = z.infer<typeof MatchFeaturesSchema>;
export declare const IdentityConfigSchema: z.ZodObject<{
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
}>;
export type IdentityConfig = z.infer<typeof IdentityConfigSchema>;
export declare const DEFAULT_IDENTITY_CONFIG: IdentityConfig;
export declare const IdentityRunStatusSchema: z.ZodEnum<["pending", "running", "completed", "failed"]>;
export type IdentityRunStatus = z.infer<typeof IdentityRunStatusSchema>;
export declare const IdentityRunStatsSchema: z.ZodObject<{
    total_customers: z.ZodDefault<z.ZodNumber>;
    candidates_generated: z.ZodDefault<z.ZodNumber>;
    auto_merged: z.ZodDefault<z.ZodNumber>;
    queued_for_review: z.ZodDefault<z.ZodNumber>;
    skipped: z.ZodDefault<z.ZodNumber>;
    suppressed: z.ZodDefault<z.ZodNumber>;
    identities_created: z.ZodDefault<z.ZodNumber>;
    duration_ms: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    total_customers: number;
    candidates_generated: number;
    auto_merged: number;
    queued_for_review: number;
    skipped: number;
    suppressed: number;
    identities_created: number;
    duration_ms?: number | undefined;
}, {
    total_customers?: number | undefined;
    candidates_generated?: number | undefined;
    auto_merged?: number | undefined;
    queued_for_review?: number | undefined;
    skipped?: number | undefined;
    suppressed?: number | undefined;
    identities_created?: number | undefined;
    duration_ms?: number | undefined;
}>;
export type IdentityRunStats = z.infer<typeof IdentityRunStatsSchema>;
export declare const IdentityCandidateStatusSchema: z.ZodEnum<["pending", "confirmed", "rejected", "auto_merged", "suppressed"]>;
export type IdentityCandidateStatus = z.infer<typeof IdentityCandidateStatusSchema>;
export declare const IdentityCandidateSchema: z.ZodObject<{
    id: z.ZodString;
    customer_id_a: z.ZodString;
    customer_id_b: z.ZodString;
    score: z.ZodNumber;
    features: z.ZodObject<{
        name_similarity: z.ZodNumber;
        domain_match: z.ZodBoolean;
        tax_id_match: z.ZodBoolean;
        address_match: z.ZodBoolean;
        external_id_overlap: z.ZodBoolean;
        phone_match: z.ZodOptional<z.ZodBoolean>;
        name_tokens_overlap: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name_similarity: number;
        domain_match: boolean;
        tax_id_match: boolean;
        address_match: boolean;
        external_id_overlap: boolean;
        phone_match?: boolean | undefined;
        name_tokens_overlap?: number | undefined;
    }, {
        name_similarity: number;
        domain_match: boolean;
        tax_id_match: boolean;
        address_match: boolean;
        external_id_overlap: boolean;
        phone_match?: boolean | undefined;
        name_tokens_overlap?: number | undefined;
    }>;
    blocking_keys: z.ZodArray<z.ZodString, "many">;
    status: z.ZodEnum<["pending", "confirmed", "rejected", "auto_merged", "suppressed"]>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "auto_merged" | "suppressed" | "confirmed" | "rejected";
    blocking_keys: string[];
    id: string;
    customer_id_a: string;
    customer_id_b: string;
    score: number;
    features: {
        name_similarity: number;
        domain_match: boolean;
        tax_id_match: boolean;
        address_match: boolean;
        external_id_overlap: boolean;
        phone_match?: boolean | undefined;
        name_tokens_overlap?: number | undefined;
    };
}, {
    status: "pending" | "auto_merged" | "suppressed" | "confirmed" | "rejected";
    blocking_keys: string[];
    id: string;
    customer_id_a: string;
    customer_id_b: string;
    score: number;
    features: {
        name_similarity: number;
        domain_match: boolean;
        tax_id_match: boolean;
        address_match: boolean;
        external_id_overlap: boolean;
        phone_match?: boolean | undefined;
        name_tokens_overlap?: number | undefined;
    };
}>;
export type IdentityCandidateData = z.infer<typeof IdentityCandidateSchema>;
export declare const IdentityTaskStatusSchema: z.ZodEnum<["pending", "assigned", "resolved", "skipped"]>;
export type IdentityTaskStatus = z.infer<typeof IdentityTaskStatusSchema>;
export declare const IdentityDecisionTypeSchema: z.ZodEnum<["confirm", "reject", "merge", "split"]>;
export type IdentityDecisionType = z.infer<typeof IdentityDecisionTypeSchema>;
export declare const IdentityDecisionInputSchema: z.ZodObject<{
    taskId: z.ZodString;
    decision: z.ZodEnum<["confirm", "reject", "merge", "split"]>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    taskId: string;
    decision: "confirm" | "reject" | "merge" | "split";
    notes?: string | undefined;
}, {
    taskId: string;
    decision: "confirm" | "reject" | "merge" | "split";
    notes?: string | undefined;
}>;
export type IdentityDecisionInput = z.infer<typeof IdentityDecisionInputSchema>;
export declare const IdentityQueueQuerySchema: z.ZodObject<{
    snapshotId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["pending", "assigned", "resolved", "skipped"]>>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    status?: "pending" | "skipped" | "assigned" | "resolved" | undefined;
    snapshotId?: string | undefined;
}, {
    status?: "pending" | "skipped" | "assigned" | "resolved" | undefined;
    snapshotId?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}>;
export type IdentityQueueQuery = z.infer<typeof IdentityQueueQuerySchema>;
export declare const IdentitySummarySchema: z.ZodObject<{
    snapshotId: z.ZodString;
    runId: z.ZodNullable<z.ZodString>;
    runStatus: z.ZodNullable<z.ZodEnum<["pending", "running", "completed", "failed"]>>;
    stats: z.ZodObject<{
        total_customers: z.ZodDefault<z.ZodNumber>;
        candidates_generated: z.ZodDefault<z.ZodNumber>;
        auto_merged: z.ZodDefault<z.ZodNumber>;
        queued_for_review: z.ZodDefault<z.ZodNumber>;
        skipped: z.ZodDefault<z.ZodNumber>;
        suppressed: z.ZodDefault<z.ZodNumber>;
        identities_created: z.ZodDefault<z.ZodNumber>;
        duration_ms: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        total_customers: number;
        candidates_generated: number;
        auto_merged: number;
        queued_for_review: number;
        skipped: number;
        suppressed: number;
        identities_created: number;
        duration_ms?: number | undefined;
    }, {
        total_customers?: number | undefined;
        candidates_generated?: number | undefined;
        auto_merged?: number | undefined;
        queued_for_review?: number | undefined;
        skipped?: number | undefined;
        suppressed?: number | undefined;
        identities_created?: number | undefined;
        duration_ms?: number | undefined;
    }>;
    queue: z.ZodObject<{
        pending: z.ZodNumber;
        assigned: z.ZodNumber;
        resolved: z.ZodNumber;
        total: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        pending: number;
        assigned: number;
        resolved: number;
        total: number;
    }, {
        pending: number;
        assigned: number;
        resolved: number;
        total: number;
    }>;
}, "strip", z.ZodTypeAny, {
    snapshotId: string;
    runId: string | null;
    runStatus: "pending" | "running" | "completed" | "failed" | null;
    stats: {
        total_customers: number;
        candidates_generated: number;
        auto_merged: number;
        queued_for_review: number;
        skipped: number;
        suppressed: number;
        identities_created: number;
        duration_ms?: number | undefined;
    };
    queue: {
        pending: number;
        assigned: number;
        resolved: number;
        total: number;
    };
}, {
    snapshotId: string;
    runId: string | null;
    runStatus: "pending" | "running" | "completed" | "failed" | null;
    stats: {
        total_customers?: number | undefined;
        candidates_generated?: number | undefined;
        auto_merged?: number | undefined;
        queued_for_review?: number | undefined;
        skipped?: number | undefined;
        suppressed?: number | undefined;
        identities_created?: number | undefined;
        duration_ms?: number | undefined;
    };
    queue: {
        pending: number;
        assigned: number;
        resolved: number;
        total: number;
    };
}>;
export type IdentitySummary = z.infer<typeof IdentitySummarySchema>;
export declare const TriggerIdentityResolutionSchema: z.ZodObject<{
    snapshotId: z.ZodString;
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
    snapshotId: string;
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
    snapshotId: string;
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
}>;
export type TriggerIdentityResolutionInput = z.infer<typeof TriggerIdentityResolutionSchema>;
export declare const IdentityResolveJobPayloadSchema: z.ZodObject<{
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
}>;
export type IdentityResolveJobPayload = z.infer<typeof IdentityResolveJobPayloadSchema>;
export declare const IdentityApplyJobPayloadSchema: z.ZodObject<{
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
}>;
export type IdentityApplyJobPayload = z.infer<typeof IdentityApplyJobPayloadSchema>;
//# sourceMappingURL=identity.d.ts.map