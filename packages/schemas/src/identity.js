/**
 * Identity Resolution Schemas
 *
 * Zod schemas for identity matching, scoring, and decisions.
 */
import { z } from 'zod';
// ============================================
// ID Generators
// ============================================
export function createIdentityRunId() {
    return `irun_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`;
}
export function createCustomerIdentityId() {
    return `ident_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`;
}
export function createIdentityMemberId() {
    return `imem_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`;
}
export function createIdentityCandidateId() {
    return `icand_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`;
}
export function createIdentityTaskId() {
    return `itask_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`;
}
export function createIdentityDecisionId() {
    return `idec_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`;
}
export function createIdentityOverrideId() {
    return `iovr_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`;
}
export function createIdentitySuppressionId() {
    return `isup_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`;
}
// ============================================
// Match Features Schema
// ============================================
export const MatchFeaturesSchema = z.object({
    name_similarity: z.number().min(0).max(1).describe('Jaro-Winkler similarity of normalized names'),
    domain_match: z.boolean().describe('Email domains match'),
    tax_id_match: z.boolean().describe('Tax IDs match exactly'),
    address_match: z.boolean().describe('Billing addresses match'),
    external_id_overlap: z.boolean().describe('Share external ID across systems'),
    phone_match: z.boolean().optional().describe('Phone numbers match'),
    name_tokens_overlap: z.number().min(0).max(1).optional().describe('Overlap of name tokens'),
});
// ============================================
// Identity Config Schema
// ============================================
export const IdentityConfigSchema = z.object({
    auto_merge_threshold: z.number().min(0).max(100).default(90),
    review_threshold: z.number().min(0).max(100).default(70),
    primary_crm_source: z.enum(['salesforce', 'hubspot', 'stripe']).optional(),
    blocking_keys: z.array(z.enum(['domain', 'tax_id', 'normalized_name', 'address'])).default(['domain', 'normalized_name']),
    scoring_weights: z.object({
        name_similarity: z.number().default(40),
        domain_match: z.number().default(25),
        tax_id_match: z.number().default(20),
        address_match: z.number().default(10),
        external_id_overlap: z.number().default(5),
    }).optional(),
});
export const DEFAULT_IDENTITY_CONFIG = {
    auto_merge_threshold: 90,
    review_threshold: 70,
    blocking_keys: ['domain', 'normalized_name'],
    scoring_weights: {
        name_similarity: 40,
        domain_match: 25,
        tax_id_match: 20,
        address_match: 10,
        external_id_overlap: 5,
    },
};
// ============================================
// Identity Run Schema
// ============================================
export const IdentityRunStatusSchema = z.enum(['pending', 'running', 'completed', 'failed']);
export const IdentityRunStatsSchema = z.object({
    total_customers: z.number().default(0),
    candidates_generated: z.number().default(0),
    auto_merged: z.number().default(0),
    queued_for_review: z.number().default(0),
    skipped: z.number().default(0),
    suppressed: z.number().default(0),
    identities_created: z.number().default(0),
    duration_ms: z.number().optional(),
});
// ============================================
// Identity Candidate Schema
// ============================================
export const IdentityCandidateStatusSchema = z.enum(['pending', 'confirmed', 'rejected', 'auto_merged', 'suppressed']);
export const IdentityCandidateSchema = z.object({
    id: z.string(),
    customer_id_a: z.string(),
    customer_id_b: z.string(),
    score: z.number().min(0).max(100),
    features: MatchFeaturesSchema,
    blocking_keys: z.array(z.string()),
    status: IdentityCandidateStatusSchema,
});
// ============================================
// Identity Task Schema
// ============================================
export const IdentityTaskStatusSchema = z.enum(['pending', 'assigned', 'resolved', 'skipped']);
// ============================================
// Identity Decision Schema
// ============================================
export const IdentityDecisionTypeSchema = z.enum(['confirm', 'reject', 'merge', 'split']);
export const IdentityDecisionInputSchema = z.object({
    taskId: z.string().min(1),
    decision: IdentityDecisionTypeSchema,
    notes: z.string().max(1000).optional(),
});
// ============================================
// API Request/Response Schemas
// ============================================
export const IdentityQueueQuerySchema = z.object({
    snapshotId: z.string().optional(),
    status: IdentityTaskStatusSchema.optional(),
    limit: z.coerce.number().min(1).max(100).default(50),
    offset: z.coerce.number().min(0).default(0),
});
export const IdentitySummarySchema = z.object({
    snapshotId: z.string(),
    runId: z.string().nullable(),
    runStatus: IdentityRunStatusSchema.nullable(),
    stats: IdentityRunStatsSchema,
    queue: z.object({
        pending: z.number(),
        assigned: z.number(),
        resolved: z.number(),
        total: z.number(),
    }),
});
export const TriggerIdentityResolutionSchema = z.object({
    snapshotId: z.string().min(1),
    config: IdentityConfigSchema.optional(),
});
// ============================================
// Job Payload Schemas
// ============================================
export const IdentityResolveJobPayloadSchema = z.object({
    type: z.literal('identity.resolve'),
    tenantId: z.string(),
    snapshotId: z.string(),
    runId: z.string(),
    config: IdentityConfigSchema.optional(),
});
export const IdentityApplyJobPayloadSchema = z.object({
    type: z.literal('identity.apply'),
    tenantId: z.string(),
    snapshotId: z.string(),
    decisionIds: z.array(z.string()).optional(),
});
//# sourceMappingURL=identity.js.map