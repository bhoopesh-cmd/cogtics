/**
 * Zod Schemas for LLM Response Validation
 *
 * Runtime validation for all AI-generated responses to ensure
 * type safety and graceful handling of malformed outputs.
 */
import { z } from 'zod';
// ============================================
// Common Schemas
// ============================================
export const SeveritySchema = z.enum(['info', 'low', 'medium', 'high', 'critical']);
export const PrioritySchema = z.enum(['critical', 'high', 'medium', 'low']);
export const UrgencySchema = z.enum(['immediate', 'this_week', 'this_month', 'monitor']);
export const ConfidenceSchema = z.number().min(0).max(1);
// ============================================
// Detection Enrichment Schemas
// ============================================
export const IssueEnrichmentSchema = z.object({
    issueIndex: z.number().int().min(0),
    rootCause: z.string().min(1).max(2000),
    businessImpact: z.string().min(1).max(2000),
    suggestedFix: z.string().min(1).max(2000),
    confidence: ConfidenceSchema,
    relatedIssueIndices: z.array(z.number().int().min(0)).default([]),
    explanation: z.string().min(1).max(1000),
    priority: PrioritySchema,
    tags: z.array(z.string()).default([]),
});
export const IssueEnrichmentResponseSchema = z.object({
    enrichments: z.array(IssueEnrichmentSchema).default([]),
});
export const ExplanationResponseSchema = z.object({
    headline: z.string().min(1).max(100),
    explanation: z.string().min(1).max(500),
    whyItMatters: z.string().min(1).max(300),
    recommendation: z.string().max(500).optional(),
    urgency: UrgencySchema,
});
export const SystemChangeSchema = z.object({
    type: z.enum(['simulation_override', 'contract_update', 'invoice_adjustment', 'credit_memo']),
    description: z.string().min(1).max(500),
    parameters: z.record(z.unknown()).default({}),
});
export const FixSuggestionResponseSchema = z.object({
    immediateAction: z.string().min(1).max(1000),
    systemChanges: z.array(SystemChangeSchema).default([]),
    processImprovements: z.array(z.string()).default([]),
    estimatedImpact: z.object({
        revenueChange: z.number(),
        currency: z.string().default('USD'),
        confidence: ConfidenceSchema,
    }).optional(),
    riskAssessment: z.string().max(500).optional(),
});
// ============================================
// Anomaly Detection Schemas
// ============================================
export const AnomalyCategorySchema = z.enum(['semantic', 'pattern', 'anomaly', 'contextual', 'billing', 'pricing', 'compliance']);
export const EvidenceSchema = z.object({
    contractIds: z.array(z.string()).default([]),
    invoiceIds: z.array(z.string()).default([]),
    relevantFields: z.record(z.unknown()).default({}),
});
export const AIDiscoveredIssueSchema = z.object({
    category: z.string().min(1), // More lenient - AI may use custom categories
    severity: SeveritySchema.or(z.string()), // Allow fallback to string
    confidence: ConfidenceSchema,
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(2000),
    evidence: EvidenceSchema.optional(),
    reasoning: z.string().max(2000).optional(),
});
export const AnomalyDetectionResponseSchema = z.object({
    anomalies: z.array(AIDiscoveredIssueSchema).optional(),
    patterns: z.array(AIDiscoveredIssueSchema).optional(),
});
// ============================================
// Recommendation Schemas
// ============================================
export const EstimatedImpactSchema = z.object({
    revenueChange: z.number(),
    currency: z.string().default('USD'),
    confidence: ConfidenceSchema,
    timeHorizon: z.string().optional(),
});
export const SimulationOverrideSchema = z.object({
    type: z.enum(['contract_term', 'price_change', 'timing_shift', 'discount_change', 'billing_adjustment']),
    targetId: z.string().min(1),
    field: z.string().min(1),
    originalValue: z.unknown(),
    newValue: z.unknown(),
    effectiveDate: z.string().optional(),
    description: z.string().optional(),
});
export const SuggestedSimulationSchema = z.object({
    overrides: z.array(SimulationOverrideSchema).default([]),
    description: z.string().optional(),
    effectiveDate: z.string().optional(),
});
export const AIRecommendationSchema = z.object({
    issueIndices: z.array(z.number().int().min(0)).default([]),
    priority: PrioritySchema,
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(2000),
    estimatedImpact: EstimatedImpactSchema.optional(),
    // Support both formats: suggestedSimulation (new) and suggestedOverrides (legacy test)
    suggestedSimulation: SuggestedSimulationSchema.optional(),
    suggestedOverrides: z.array(SimulationOverrideSchema).optional(),
    steps: z.array(z.string()).default([]),
    effort: z.enum(['low', 'medium', 'high']).optional(),
    reasoning: z.string().max(2000).optional(),
    automationPossible: z.boolean().default(false),
    requiresApproval: z.boolean().default(true),
});
export const RecommendationResponseSchema = z.object({
    recommendations: z.array(AIRecommendationSchema).default([]),
});
export const ImpactEstimationResponseSchema = z.object({
    directImpact: z.object({
        amount: z.number(),
        currency: z.string().default('USD'),
        confidence: ConfidenceSchema,
    }),
    ongoingPrevention: z.object({
        annualAmount: z.number(),
        currency: z.string().default('USD'),
        confidence: ConfidenceSchema,
    }).optional(),
    summary: z.string().max(500).optional(),
});
// ============================================
// Low Confidence Review Threshold
// ============================================
export const LOW_CONFIDENCE_THRESHOLD = 0.7;
/**
 * Compute if a response needs human review based on confidence
 */
export function computeNeedsReview(confidence) {
    if (confidence === undefined)
        return true;
    return confidence < LOW_CONFIDENCE_THRESHOLD;
}
// ============================================
// CSV Analysis Schemas
// ============================================
export const FieldCategorySchema = z.enum(['required', 'standard', 'metadata']);
export const ColumnMappingSuggestionSchema = z.object({
    sourceColumn: z.string(),
    targetField: z.string(),
    category: FieldCategorySchema,
    metadataKey: z.string().optional(),
    confidence: ConfidenceSchema,
    reasoning: z.string(),
});
export const CSVEntityTypeSchema = z.enum([
    'customer', 'invoice', 'contract', 'payment',
    'product', 'subscription', 'usage', 'credit_memo', 'unknown'
]);
export const CSVAnalysisResultSchema = z.object({
    entityType: CSVEntityTypeSchema,
    entityTypeConfidence: ConfidenceSchema,
    entityTypeReasoning: z.string().optional(),
    columnMappings: z.array(ColumnMappingSuggestionSchema).default([]),
    requiredMissing: z.array(z.string()).default([]),
    suggestions: z.array(z.string()).default([]),
    warnings: z.array(z.string()).default([]),
});
// Legacy schema for backwards compatibility
export const ColumnMappingSchema = z.object({
    sourceColumn: z.string(),
    targetField: z.string(),
    confidence: ConfidenceSchema,
    transformation: z.string().optional(),
});
export const CSVAnalysisResponseSchema = z.object({
    entityType: z.string(),
    columnMappings: z.array(ColumnMappingSchema).default([]),
    dateFormat: z.string().optional(),
    currencyCode: z.string().optional(),
    warnings: z.array(z.string()).default([]),
});
// ============================================
// Document Extraction Schemas
// ============================================
export const PartyInfoSchema = z.object({
    name: z.string(),
    type: z.enum(['company', 'individual']).optional(),
    address: z.string().optional(),
    jurisdiction: z.string().optional(),
});
export const DocumentTypeSchema = z.enum([
    'msa', 'order_form', 'amendment', 'sow', 'addendum', 'other'
]);
export const RawTermSchema = z.object({
    type: z.string(),
    value: z.unknown(),
    matchedText: z.string(),
    confidence: ConfidenceSchema,
});
export const ProductInfoSchema = z.object({
    name: z.string(),
    quantity: z.number().optional(),
    unitPrice: z.object({
        amount: z.number(),
        currency: z.string(),
    }).optional(),
    description: z.string().optional(),
});
export const StructuredContractDataSchema = z.object({
    documentType: DocumentTypeSchema.or(z.string()),
    parties: z.object({
        customer: PartyInfoSchema.optional(),
        vendor: PartyInfoSchema.optional(),
    }).default({}),
    dates: z.object({
        effectiveDate: z.string().optional(),
        expirationDate: z.string().optional(),
        signedDate: z.string().optional(),
    }).default({}),
    financials: z.object({
        contractValue: z.object({
            amount: z.number(),
            currency: z.string(),
            period: z.string().optional(),
        }).optional(),
        paymentTerms: z.string().optional(),
        billingCadence: z.enum(['monthly', 'quarterly', 'annually']).or(z.string()).optional(),
        discount: z.object({
            percentage: z.number().optional(),
            amount: z.number().optional(),
        }).optional(),
    }).default({}),
    terms: z.object({
        termLength: z.string().optional(),
        autoRenew: z.boolean().optional(),
        noticePeriod: z.string().optional(),
        terminationTerms: z.string().optional(),
    }).default({}),
    products: z.array(ProductInfoSchema).default([]),
    rawTerms: z.array(RawTermSchema).default([]),
    summary: z.string().default(''),
});
// Legacy schema for backwards compatibility
export const ExtractedTermSchema = z.object({
    type: z.string(),
    value: z.unknown(),
    confidence: ConfidenceSchema,
    sourceText: z.string().optional(),
});
// ============================================
// Contract LLM Client Schemas
// ============================================
export const LLMExtractionSchema = z.object({
    termType: z.string(),
    value: z.unknown(),
    confidence: ConfidenceSchema,
    matchedText: z.string(),
    reasoning: z.string(),
    startOffset: z.number().int().optional(),
    endOffset: z.number().int().optional(),
});
export const ExtractTermsResponseSchema = z.object({
    extractions: z.array(LLMExtractionSchema).default([]),
});
export const ConflictResolutionSchema = z.object({
    winningTermIndex: z.number().int().min(0),
    reasoning: z.string(),
    confidence: ConfidenceSchema,
    appliedRules: z.array(z.string()).default([]),
    suggestedAction: z.enum(['accept', 'review', 'reject']),
});
export const OverrideTypeSchema = z.enum([
    'notwithstanding', 'except_as', 'prevails_over', 'controls', 'supersedes'
]);
export const OverrideDetectionSchema = z.object({
    type: OverrideTypeSchema,
    matchedText: z.string(),
    targetSection: z.string().optional(),
    confidence: ConfidenceSchema,
});
export const DetectOverrideResponseSchema = z.object({
    overrides: z.array(OverrideDetectionSchema).default([]),
});
// ============================================
// Safe Parsing Utilities
// ============================================
/**
 * Safely parse LLM JSON response with Zod validation
 * Returns parsed data or undefined if validation fails
 */
export function safeParseLLMResponse(schema, content, fallback) {
    try {
        const json = JSON.parse(content);
        const result = schema.safeParse(json);
        if (result.success) {
            return result.data;
        }
        console.warn('LLM response validation failed:', result.error.issues);
        return fallback;
    }
    catch (error) {
        console.warn('LLM response JSON parse failed:', error);
        return fallback;
    }
}
/**
 * Parse LLM response with validation, throwing on failure
 */
export function parseLLMResponse(schema, content) {
    const json = JSON.parse(content);
    return schema.parse(json);
}
/**
 * Validate and coerce LLM response with defaults
 * More lenient - fills in missing fields with defaults where possible
 */
export function coerceLLMResponse(schema, content) {
    try {
        const json = JSON.parse(content);
        const result = schema.safeParse(json);
        if (result.success) {
            return { data: result.data, errors: [] };
        }
        return { data: null, errors: result.error.issues };
    }
    catch {
        return {
            data: null,
            errors: [{ code: 'custom', message: 'Invalid JSON', path: [] }]
        };
    }
}
//# sourceMappingURL=schemas.js.map