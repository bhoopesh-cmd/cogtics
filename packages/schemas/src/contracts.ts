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

export function createContractDocumentId(): string {
  return `cdoc_${nanoid(16)}`;
}

export function createClauseId(): string {
  return `clau_${nanoid(16)}`;
}

export function createTermOverrideId(): string {
  return `tovr_${nanoid(16)}`;
}

export function createReadinessId(): string {
  return `crdy_${nanoid(16)}`;
}

// Note: createContractTermId is already exported from ids.ts

// ============================================
// Enums
// ============================================

export const ClauseTypeSchema = z.enum(['heading', 'section', 'paragraph', 'list_item']);
export type ClauseType = z.infer<typeof ClauseTypeSchema>;

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
export type TermType = z.infer<typeof TermTypeSchema>;

export const ExtractionMethodSchema = z.enum(['rule', 'pattern', 'llm']);
export type ExtractionMethod = z.infer<typeof ExtractionMethodSchema>;

export const ReadinessStatusSchema = z.enum(['ready', 'needs_review', 'incomplete']);
export type ReadinessStatus = z.infer<typeof ReadinessStatusSchema>;

export const DocumentStatusSchema = z.enum(['pending', 'extracting', 'extracted', 'failed']);
export type DocumentStatus = z.infer<typeof DocumentStatusSchema>;

// ============================================
// Term Type Configurations
// ============================================

// Required terms for standard contracts
export const REQUIRED_TERMS: TermType[] = [
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
export type ClauseSegment = z.infer<typeof ClauseSegmentSchema>;

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
export type ExtractedTerm = z.infer<typeof ExtractedTermSchema>;

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
export type ReadinessResult = z.infer<typeof ReadinessResultSchema>;

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
export type ContractExtractJobPayload = z.infer<typeof ContractExtractJobPayloadSchema>;

export const ClauseSegmentJobPayloadSchema = z.object({
  type: z.literal('contracts.clause.segment'),
  tenantId: z.string(),
  snapshotId: z.string(),
  documentId: z.string(),
  contractVersionId: z.string(),
});
export type ClauseSegmentJobPayload = z.infer<typeof ClauseSegmentJobPayloadSchema>;

export const TermExtractJobPayloadSchema = z.object({
  type: z.literal('contracts.terms.extract'),
  tenantId: z.string(),
  snapshotId: z.string(),
  documentId: z.string(),
  contractVersionId: z.string(),
});
export type TermExtractJobPayload = z.infer<typeof TermExtractJobPayloadSchema>;

export const ReadinessComputeJobPayloadSchema = z.object({
  type: z.literal('contracts.readiness.compute'),
  tenantId: z.string(),
  snapshotId: z.string(),
  contractVersionId: z.string(),
});
export type ReadinessComputeJobPayload = z.infer<typeof ReadinessComputeJobPayloadSchema>;

// ============================================
// API Request/Response Schemas
// ============================================

export const TermOverrideRequestSchema = z.object({
  overrideValue: z.unknown(),
  reason: z.string().optional(),
});
export type TermOverrideRequest = z.infer<typeof TermOverrideRequestSchema>;

export const MarkReviewedRequestSchema = z.object({
  notes: z.string().optional(),
});
export type MarkReviewedRequest = z.infer<typeof MarkReviewedRequestSchema>;

export const ReprocessRequestSchema = z.object({
  forceReextract: z.boolean().optional().default(false),
});
export type ReprocessRequest = z.infer<typeof ReprocessRequestSchema>;

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
export function getRequiredTermTypes(): TermType[] {
  return [...REQUIRED_TERMS];
}

/**
 * Check if a term type is required
 */
export function isRequiredTerm(termType: string): boolean {
  return REQUIRED_TERMS.includes(termType as TermType);
}

/**
 * Validate term value based on term type
 */
export function getTermValueSchema(termType: TermType) {
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
