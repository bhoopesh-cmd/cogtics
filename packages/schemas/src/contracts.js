/**
 * Contract Intelligence Schemas (Phase 5)
 *
 * Zod schemas for contract documents, clauses, terms, overrides, and readiness.
 */
import { z } from 'zod';
import { nanoid } from 'nanoid';
// ============================================
// ID Generators
// ============================================
export function createContractDocumentId() {
    return `cdoc_${nanoid(16)}`;
}
export function createClauseId() {
    return `clau_${nanoid(16)}`;
}
export function createTermOverrideId() {
    return `tovr_${nanoid(16)}`;
}
export function createReadinessId() {
    return `crdy_${nanoid(16)}`;
}
export function createBundleId() {
    return `bndl_${nanoid(16)}`;
}
export function createTermConflictId() {
    return `tcnf_${nanoid(16)}`;
}
export function createReviewQueueItemId() {
    return `rvqi_${nanoid(16)}`;
}
export function createDefinedTermId() {
    return `dtrm_${nanoid(16)}`;
}
export function createOverrideClauseId() {
    return `ovrc_${nanoid(16)}`;
}
export function createConflictCandidateId() {
    return `ccnd_${nanoid(16)}`;
}
// Note: createContractTermId is already exported from ids.ts
// ============================================
// Enums
// ============================================
export const ClauseTypeSchema = z.enum(['heading', 'section', 'paragraph', 'list_item']);
export const TermTypeSchema = z.enum([
    'pricing_model',
    'billing_cadence',
    'discount',
    'renewal_terms',
    'termination_terms',
    'usage_caps',
    'payment_terms',
    'uplift',
    'auto_renew',
    'notice_period',
    'contract_value',
    'start_date',
    'end_date',
    'term_length',
]);
export const ExtractionMethodSchema = z.enum(['rule', 'pattern', 'llm']);
export const ReadinessStatusSchema = z.enum(['ready', 'needs_review', 'incomplete']);
export const DocumentStatusSchema = z.enum(['pending', 'extracting', 'extracted', 'failed']);
export const DocumentTypeSchema = z.enum([
    'msa', 'order_form', 'amendment', 'sow', 'addendum',
    'exhibit', 'schedule', 'renewal', 'termination', 'other'
]);
export const OverrideTypeSchema = z.enum([
    'notwithstanding', 'except_as', 'prevails_over', 'controls',
    'supersedes', 'in_event_of_conflict', 'explicit_precedence'
]);
export const ConflictStatusSchema = z.enum([
    'pending', 'auto_resolved', 'human_resolved', 'accepted', 'escalated'
]);
export const ResolutionMethodSchema = z.enum([
    'auto_precedence', 'human_review', 'llm_suggestion', 'manual_override'
]);
export const ReviewItemTypeSchema = z.enum([
    'low_confidence_term', 'conflict', 'missing_required_term',
    'validation_error', 'llm_extraction', 'ocr_required'
]);
export const ReviewStatusSchema = z.enum([
    'pending', 'in_review', 'resolved', 'skipped', 'escalated'
]);
export const ValidationStatusSchema = z.enum(['valid', 'warning', 'error']);
// Document type precedence order (lower = higher precedence)
export const DOCUMENT_TYPE_PRECEDENCE = {
    'amendment': 1,
    'order_form': 2,
    'addendum': 3,
    'msa': 4,
    'sow': 5,
    'exhibit': 6,
    'schedule': 7,
    'renewal': 8,
    'termination': 9,
    'other': 10,
};
// ============================================
// Term Type Configurations
// ============================================
// Required terms for standard contracts
export const REQUIRED_TERMS = [
    'pricing_model',
    'billing_cadence',
    'contract_value',
    'start_date',
    'term_length',
];
// Minimum confidence threshold for a term to be considered "extracted"
export const MIN_CONFIDENCE_THRESHOLD = 0.7;
// Low confidence threshold for flagging review
export const LOW_CONFIDENCE_THRESHOLD = 0.5;
// ============================================
// Clause Segment Schema
// ============================================
export const ClauseSegmentSchema = z.object({
    type: ClauseTypeSchema,
    label: z.string().nullable(),
    text: z.string(),
    startOffset: z.number(),
    endOffset: z.number(),
    pageNumber: z.number().nullable(),
    sequenceNumber: z.number(),
    parentIndex: z.number().nullable(),
});
// ============================================
// Extracted Term Schema
// ============================================
export const ExtractedTermSchema = z.object({
    termType: TermTypeSchema,
    value: z.unknown(),
    confidence: z.number().min(0).max(1),
    sourceClauseIndex: z.number(),
    extractionMethod: ExtractionMethodSchema,
    matchedText: z.string(),
    startOffset: z.number(),
    endOffset: z.number(),
});
// ============================================
// Readiness Result Schema
// ============================================
export const ReadinessResultSchema = z.object({
    status: ReadinessStatusSchema,
    confidenceScore: z.number().min(0).max(1),
    requiredTermsCount: z.number(),
    extractedTermsCount: z.number(),
    missingTerms: z.array(z.string()),
    lowConfidenceTerms: z.array(z.object({
        termType: z.string(),
        confidence: z.number(),
    })),
});
// ============================================
// Job Payloads
// ============================================
export const ContractExtractJobPayloadSchema = z.object({
    type: z.literal('contracts.pdf.extract'),
    tenantId: z.string(),
    snapshotId: z.string(),
    documentId: z.string(),
    contractId: z.string().optional(),
    contractVersionId: z.string().optional(),
    s3Key: z.string(),
});
export const ClauseSegmentJobPayloadSchema = z.object({
    type: z.literal('contracts.clause.segment'),
    tenantId: z.string(),
    snapshotId: z.string(),
    documentId: z.string(),
    contractVersionId: z.string(),
});
export const TermExtractJobPayloadSchema = z.object({
    type: z.literal('contracts.terms.extract'),
    tenantId: z.string(),
    snapshotId: z.string(),
    documentId: z.string(),
    contractVersionId: z.string(),
});
export const ReadinessComputeJobPayloadSchema = z.object({
    type: z.literal('contracts.readiness.compute'),
    tenantId: z.string(),
    snapshotId: z.string(),
    contractVersionId: z.string(),
});
// ============================================
// API Request/Response Schemas
// ============================================
export const TermOverrideRequestSchema = z.object({
    overrideValue: z.unknown(),
    reason: z.string().optional(),
});
export const MarkReviewedRequestSchema = z.object({
    notes: z.string().optional(),
});
export const ReprocessRequestSchema = z.object({
    forceReextract: z.boolean().optional().default(false),
});
// ============================================
// Value Schemas for Term Types
// ============================================
export const PricingModelValueSchema = z.object({
    model: z.enum(['per_user', 'flat_fee', 'usage_based', 'tiered', 'hybrid', 'custom']),
    details: z.string().optional(),
});
export const BillingCadenceValueSchema = z.object({
    cadence: z.enum(['monthly', 'quarterly', 'annually', 'one_time', 'usage_based']),
    details: z.string().optional(),
});
export const DiscountValueSchema = z.object({
    percentage: z.number().min(0).max(100).optional(),
    amount: z.number().optional(),
    currency: z.string().optional(),
    description: z.string().optional(),
});
export const RenewalTermsValueSchema = z.object({
    autoRenew: z.boolean(),
    renewalPeriod: z.string().optional(),
    noticePeriodDays: z.number().optional(),
});
export const TerminationTermsValueSchema = z.object({
    noticePeriodDays: z.number().optional(),
    terminationForCause: z.boolean().optional(),
    terminationForConvenience: z.boolean().optional(),
    details: z.string().optional(),
});
export const PaymentTermsValueSchema = z.object({
    netDays: z.number().optional(),
    dueOnReceipt: z.boolean().optional(),
    details: z.string().optional(),
});
export const ContractValueSchema = z.object({
    amount: z.number(),
    currency: z.string().default('USD'),
    period: z.enum(['monthly', 'quarterly', 'annually', 'total']).optional(),
});
export const DateValueSchema = z.object({
    date: z.string(), // ISO date string
});
export const TermLengthValueSchema = z.object({
    months: z.number().optional(),
    years: z.number().optional(),
    description: z.string().optional(),
});
// ============================================
// Helpers
// ============================================
/**
 * Get all required term types
 */
export function getRequiredTermTypes() {
    return [...REQUIRED_TERMS];
}
/**
 * Check if a term type is required
 */
export function isRequiredTerm(termType) {
    return REQUIRED_TERMS.includes(termType);
}
/**
 * Validate term value based on term type
 */
export function getTermValueSchema(termType) {
    switch (termType) {
        case 'pricing_model':
            return PricingModelValueSchema;
        case 'billing_cadence':
            return BillingCadenceValueSchema;
        case 'discount':
        case 'uplift':
            return DiscountValueSchema;
        case 'renewal_terms':
        case 'auto_renew':
            return RenewalTermsValueSchema;
        case 'termination_terms':
            return TerminationTermsValueSchema;
        case 'payment_terms':
            return PaymentTermsValueSchema;
        case 'contract_value':
        case 'usage_caps':
            return ContractValueSchema;
        case 'start_date':
        case 'end_date':
            return DateValueSchema;
        case 'term_length':
        case 'notice_period':
            return TermLengthValueSchema;
        default:
            return z.unknown();
    }
}
//# sourceMappingURL=contracts.js.map