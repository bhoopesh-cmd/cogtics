/**
 * Contract Intelligence Schemas (Phase 5)
 *
 * Zod schemas for contract documents, clauses, terms, overrides, and readiness.
 */
import { z } from 'zod';
export declare function createContractDocumentId(): string;
export declare function createClauseId(): string;
export declare function createTermOverrideId(): string;
export declare function createReadinessId(): string;
export declare function createBundleId(): string;
export declare function createTermConflictId(): string;
export declare function createReviewQueueItemId(): string;
export declare function createDefinedTermId(): string;
export declare function createOverrideClauseId(): string;
export declare function createConflictCandidateId(): string;
export declare const ClauseTypeSchema: z.ZodEnum<["heading", "section", "paragraph", "list_item"]>;
export type ClauseType = z.infer<typeof ClauseTypeSchema>;
export declare const TermTypeSchema: z.ZodEnum<["pricing_model", "billing_cadence", "discount", "renewal_terms", "termination_terms", "usage_caps", "payment_terms", "uplift", "auto_renew", "notice_period", "contract_value", "start_date", "end_date", "term_length"]>;
export type TermType = z.infer<typeof TermTypeSchema>;
export declare const ExtractionMethodSchema: z.ZodEnum<["rule", "pattern", "llm"]>;
export type ExtractionMethod = z.infer<typeof ExtractionMethodSchema>;
export declare const ReadinessStatusSchema: z.ZodEnum<["ready", "needs_review", "incomplete"]>;
export type ReadinessStatus = z.infer<typeof ReadinessStatusSchema>;
export declare const DocumentStatusSchema: z.ZodEnum<["pending", "extracting", "extracted", "failed"]>;
export type DocumentStatus = z.infer<typeof DocumentStatusSchema>;
export declare const DocumentTypeSchema: z.ZodEnum<["msa", "order_form", "amendment", "sow", "addendum", "exhibit", "schedule", "renewal", "termination", "other"]>;
export type DocumentType = z.infer<typeof DocumentTypeSchema>;
export declare const OverrideTypeSchema: z.ZodEnum<["notwithstanding", "except_as", "prevails_over", "controls", "supersedes", "in_event_of_conflict", "explicit_precedence"]>;
export type OverrideType = z.infer<typeof OverrideTypeSchema>;
export declare const ConflictStatusSchema: z.ZodEnum<["pending", "auto_resolved", "human_resolved", "accepted", "escalated"]>;
export type ConflictStatus = z.infer<typeof ConflictStatusSchema>;
export declare const ResolutionMethodSchema: z.ZodEnum<["auto_precedence", "human_review", "llm_suggestion", "manual_override"]>;
export type ResolutionMethod = z.infer<typeof ResolutionMethodSchema>;
export declare const ReviewItemTypeSchema: z.ZodEnum<["low_confidence_term", "conflict", "missing_required_term", "validation_error", "llm_extraction", "ocr_required"]>;
export type ReviewItemType = z.infer<typeof ReviewItemTypeSchema>;
export declare const ReviewStatusSchema: z.ZodEnum<["pending", "in_review", "resolved", "skipped", "escalated"]>;
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;
export declare const ValidationStatusSchema: z.ZodEnum<["valid", "warning", "error"]>;
export type ValidationStatus = z.infer<typeof ValidationStatusSchema>;
export declare const DOCUMENT_TYPE_PRECEDENCE: Record<DocumentType, number>;
export declare const REQUIRED_TERMS: TermType[];
export declare const MIN_CONFIDENCE_THRESHOLD = 0.7;
export declare const LOW_CONFIDENCE_THRESHOLD = 0.5;
export declare const ClauseSegmentSchema: z.ZodObject<{
    type: z.ZodEnum<["heading", "section", "paragraph", "list_item"]>;
    label: z.ZodNullable<z.ZodString>;
    text: z.ZodString;
    startOffset: z.ZodNumber;
    endOffset: z.ZodNumber;
    pageNumber: z.ZodNullable<z.ZodNumber>;
    sequenceNumber: z.ZodNumber;
    parentIndex: z.ZodNullable<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "heading" | "section" | "paragraph" | "list_item";
    label: string | null;
    text: string;
    startOffset: number;
    endOffset: number;
    pageNumber: number | null;
    sequenceNumber: number;
    parentIndex: number | null;
}, {
    type: "heading" | "section" | "paragraph" | "list_item";
    label: string | null;
    text: string;
    startOffset: number;
    endOffset: number;
    pageNumber: number | null;
    sequenceNumber: number;
    parentIndex: number | null;
}>;
export type ClauseSegment = z.infer<typeof ClauseSegmentSchema>;
export declare const ExtractedTermSchema: z.ZodObject<{
    termType: z.ZodEnum<["pricing_model", "billing_cadence", "discount", "renewal_terms", "termination_terms", "usage_caps", "payment_terms", "uplift", "auto_renew", "notice_period", "contract_value", "start_date", "end_date", "term_length"]>;
    value: z.ZodUnknown;
    confidence: z.ZodNumber;
    sourceClauseIndex: z.ZodNumber;
    extractionMethod: z.ZodEnum<["rule", "pattern", "llm"]>;
    matchedText: z.ZodString;
    startOffset: z.ZodNumber;
    endOffset: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    startOffset: number;
    endOffset: number;
    termType: "start_date" | "end_date" | "pricing_model" | "billing_cadence" | "discount" | "renewal_terms" | "termination_terms" | "usage_caps" | "payment_terms" | "uplift" | "auto_renew" | "notice_period" | "contract_value" | "term_length";
    confidence: number;
    sourceClauseIndex: number;
    extractionMethod: "rule" | "pattern" | "llm";
    matchedText: string;
    value?: unknown;
}, {
    startOffset: number;
    endOffset: number;
    termType: "start_date" | "end_date" | "pricing_model" | "billing_cadence" | "discount" | "renewal_terms" | "termination_terms" | "usage_caps" | "payment_terms" | "uplift" | "auto_renew" | "notice_period" | "contract_value" | "term_length";
    confidence: number;
    sourceClauseIndex: number;
    extractionMethod: "rule" | "pattern" | "llm";
    matchedText: string;
    value?: unknown;
}>;
export type ExtractedTerm = z.infer<typeof ExtractedTermSchema>;
export declare const ReadinessResultSchema: z.ZodObject<{
    status: z.ZodEnum<["ready", "needs_review", "incomplete"]>;
    confidenceScore: z.ZodNumber;
    requiredTermsCount: z.ZodNumber;
    extractedTermsCount: z.ZodNumber;
    missingTerms: z.ZodArray<z.ZodString, "many">;
    lowConfidenceTerms: z.ZodArray<z.ZodObject<{
        termType: z.ZodString;
        confidence: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        termType: string;
        confidence: number;
    }, {
        termType: string;
        confidence: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    status: "ready" | "needs_review" | "incomplete";
    confidenceScore: number;
    requiredTermsCount: number;
    extractedTermsCount: number;
    missingTerms: string[];
    lowConfidenceTerms: {
        termType: string;
        confidence: number;
    }[];
}, {
    status: "ready" | "needs_review" | "incomplete";
    confidenceScore: number;
    requiredTermsCount: number;
    extractedTermsCount: number;
    missingTerms: string[];
    lowConfidenceTerms: {
        termType: string;
        confidence: number;
    }[];
}>;
export type ReadinessResult = z.infer<typeof ReadinessResultSchema>;
export declare const ContractExtractJobPayloadSchema: z.ZodObject<{
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
}>;
export type ContractExtractJobPayload = z.infer<typeof ContractExtractJobPayloadSchema>;
export declare const ClauseSegmentJobPayloadSchema: z.ZodObject<{
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
}>;
export type ClauseSegmentJobPayload = z.infer<typeof ClauseSegmentJobPayloadSchema>;
export declare const TermExtractJobPayloadSchema: z.ZodObject<{
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
}>;
export type TermExtractJobPayload = z.infer<typeof TermExtractJobPayloadSchema>;
export declare const ReadinessComputeJobPayloadSchema: z.ZodObject<{
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
}>;
export type ReadinessComputeJobPayload = z.infer<typeof ReadinessComputeJobPayloadSchema>;
export declare const TermOverrideRequestSchema: z.ZodObject<{
    overrideValue: z.ZodUnknown;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    overrideValue?: unknown;
    reason?: string | undefined;
}, {
    overrideValue?: unknown;
    reason?: string | undefined;
}>;
export type TermOverrideRequest = z.infer<typeof TermOverrideRequestSchema>;
export declare const MarkReviewedRequestSchema: z.ZodObject<{
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    notes?: string | undefined;
}, {
    notes?: string | undefined;
}>;
export type MarkReviewedRequest = z.infer<typeof MarkReviewedRequestSchema>;
export declare const ReprocessRequestSchema: z.ZodObject<{
    forceReextract: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    forceReextract: boolean;
}, {
    forceReextract?: boolean | undefined;
}>;
export type ReprocessRequest = z.infer<typeof ReprocessRequestSchema>;
export declare const PricingModelValueSchema: z.ZodObject<{
    model: z.ZodEnum<["per_user", "flat_fee", "usage_based", "tiered", "hybrid", "custom"]>;
    details: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    model: "custom" | "per_user" | "flat_fee" | "usage_based" | "tiered" | "hybrid";
    details?: string | undefined;
}, {
    model: "custom" | "per_user" | "flat_fee" | "usage_based" | "tiered" | "hybrid";
    details?: string | undefined;
}>;
export declare const BillingCadenceValueSchema: z.ZodObject<{
    cadence: z.ZodEnum<["monthly", "quarterly", "annually", "one_time", "usage_based"]>;
    details: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    cadence: "usage_based" | "monthly" | "quarterly" | "annually" | "one_time";
    details?: string | undefined;
}, {
    cadence: "usage_based" | "monthly" | "quarterly" | "annually" | "one_time";
    details?: string | undefined;
}>;
export declare const DiscountValueSchema: z.ZodObject<{
    percentage: z.ZodOptional<z.ZodNumber>;
    amount: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    currency?: string | undefined;
    percentage?: number | undefined;
    amount?: number | undefined;
}, {
    description?: string | undefined;
    currency?: string | undefined;
    percentage?: number | undefined;
    amount?: number | undefined;
}>;
export declare const RenewalTermsValueSchema: z.ZodObject<{
    autoRenew: z.ZodBoolean;
    renewalPeriod: z.ZodOptional<z.ZodString>;
    noticePeriodDays: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    autoRenew: boolean;
    renewalPeriod?: string | undefined;
    noticePeriodDays?: number | undefined;
}, {
    autoRenew: boolean;
    renewalPeriod?: string | undefined;
    noticePeriodDays?: number | undefined;
}>;
export declare const TerminationTermsValueSchema: z.ZodObject<{
    noticePeriodDays: z.ZodOptional<z.ZodNumber>;
    terminationForCause: z.ZodOptional<z.ZodBoolean>;
    terminationForConvenience: z.ZodOptional<z.ZodBoolean>;
    details: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    details?: string | undefined;
    noticePeriodDays?: number | undefined;
    terminationForCause?: boolean | undefined;
    terminationForConvenience?: boolean | undefined;
}, {
    details?: string | undefined;
    noticePeriodDays?: number | undefined;
    terminationForCause?: boolean | undefined;
    terminationForConvenience?: boolean | undefined;
}>;
export declare const PaymentTermsValueSchema: z.ZodObject<{
    netDays: z.ZodOptional<z.ZodNumber>;
    dueOnReceipt: z.ZodOptional<z.ZodBoolean>;
    details: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    details?: string | undefined;
    netDays?: number | undefined;
    dueOnReceipt?: boolean | undefined;
}, {
    details?: string | undefined;
    netDays?: number | undefined;
    dueOnReceipt?: boolean | undefined;
}>;
export declare const ContractValueSchema: z.ZodObject<{
    amount: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    period: z.ZodOptional<z.ZodEnum<["monthly", "quarterly", "annually", "total"]>>;
}, "strip", z.ZodTypeAny, {
    currency: string;
    amount: number;
    period?: "total" | "monthly" | "quarterly" | "annually" | undefined;
}, {
    amount: number;
    currency?: string | undefined;
    period?: "total" | "monthly" | "quarterly" | "annually" | undefined;
}>;
export declare const DateValueSchema: z.ZodObject<{
    date: z.ZodString;
}, "strip", z.ZodTypeAny, {
    date: string;
}, {
    date: string;
}>;
export declare const TermLengthValueSchema: z.ZodObject<{
    months: z.ZodOptional<z.ZodNumber>;
    years: z.ZodOptional<z.ZodNumber>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    months?: number | undefined;
    years?: number | undefined;
}, {
    description?: string | undefined;
    months?: number | undefined;
    years?: number | undefined;
}>;
/**
 * Get all required term types
 */
export declare function getRequiredTermTypes(): TermType[];
/**
 * Check if a term type is required
 */
export declare function isRequiredTerm(termType: string): boolean;
/**
 * Validate term value based on term type
 */
export declare function getTermValueSchema(termType: TermType): z.ZodUnknown | z.ZodObject<{
    model: z.ZodEnum<["per_user", "flat_fee", "usage_based", "tiered", "hybrid", "custom"]>;
    details: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    model: "custom" | "per_user" | "flat_fee" | "usage_based" | "tiered" | "hybrid";
    details?: string | undefined;
}, {
    model: "custom" | "per_user" | "flat_fee" | "usage_based" | "tiered" | "hybrid";
    details?: string | undefined;
}> | z.ZodObject<{
    cadence: z.ZodEnum<["monthly", "quarterly", "annually", "one_time", "usage_based"]>;
    details: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    cadence: "usage_based" | "monthly" | "quarterly" | "annually" | "one_time";
    details?: string | undefined;
}, {
    cadence: "usage_based" | "monthly" | "quarterly" | "annually" | "one_time";
    details?: string | undefined;
}> | z.ZodObject<{
    percentage: z.ZodOptional<z.ZodNumber>;
    amount: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    currency?: string | undefined;
    percentage?: number | undefined;
    amount?: number | undefined;
}, {
    description?: string | undefined;
    currency?: string | undefined;
    percentage?: number | undefined;
    amount?: number | undefined;
}> | z.ZodObject<{
    autoRenew: z.ZodBoolean;
    renewalPeriod: z.ZodOptional<z.ZodString>;
    noticePeriodDays: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    autoRenew: boolean;
    renewalPeriod?: string | undefined;
    noticePeriodDays?: number | undefined;
}, {
    autoRenew: boolean;
    renewalPeriod?: string | undefined;
    noticePeriodDays?: number | undefined;
}> | z.ZodObject<{
    noticePeriodDays: z.ZodOptional<z.ZodNumber>;
    terminationForCause: z.ZodOptional<z.ZodBoolean>;
    terminationForConvenience: z.ZodOptional<z.ZodBoolean>;
    details: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    details?: string | undefined;
    noticePeriodDays?: number | undefined;
    terminationForCause?: boolean | undefined;
    terminationForConvenience?: boolean | undefined;
}, {
    details?: string | undefined;
    noticePeriodDays?: number | undefined;
    terminationForCause?: boolean | undefined;
    terminationForConvenience?: boolean | undefined;
}> | z.ZodObject<{
    netDays: z.ZodOptional<z.ZodNumber>;
    dueOnReceipt: z.ZodOptional<z.ZodBoolean>;
    details: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    details?: string | undefined;
    netDays?: number | undefined;
    dueOnReceipt?: boolean | undefined;
}, {
    details?: string | undefined;
    netDays?: number | undefined;
    dueOnReceipt?: boolean | undefined;
}> | z.ZodObject<{
    amount: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    period: z.ZodOptional<z.ZodEnum<["monthly", "quarterly", "annually", "total"]>>;
}, "strip", z.ZodTypeAny, {
    currency: string;
    amount: number;
    period?: "total" | "monthly" | "quarterly" | "annually" | undefined;
}, {
    amount: number;
    currency?: string | undefined;
    period?: "total" | "monthly" | "quarterly" | "annually" | undefined;
}> | z.ZodObject<{
    date: z.ZodString;
}, "strip", z.ZodTypeAny, {
    date: string;
}, {
    date: string;
}> | z.ZodObject<{
    months: z.ZodOptional<z.ZodNumber>;
    years: z.ZodOptional<z.ZodNumber>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    months?: number | undefined;
    years?: number | undefined;
}, {
    description?: string | undefined;
    months?: number | undefined;
    years?: number | undefined;
}>;
//# sourceMappingURL=contracts.d.ts.map