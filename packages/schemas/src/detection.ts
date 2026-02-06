/**
 * Detection Engine Schemas (Phase 7)
 * Zod schemas for detection runs, issues, and configuration
 */
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { TenantIdSchema } from './ids.js';

// ============================================
// ID Generators
// ============================================

export function generateDetectionRunId(): string {
  return `run_${nanoid(16)}`;
}

export function generateIssueId(): string {
  return `iss_${nanoid(16)}`;
}

export function generateIssueStatusHistoryId(): string {
  return `ish_${nanoid(16)}`;
}

export function generateIssueSourceId(): string {
  return `src_${nanoid(16)}`;
}

export function generateDetectionConfigId(): string {
  return `dcfg_${nanoid(16)}`;
}

export function generateFxRateId(): string {
  return `fxr_${nanoid(16)}`;
}

// ============================================
// Enums
// ============================================

export const DetectionRunStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
]);
export type DetectionRunStatus = z.infer<typeof DetectionRunStatusSchema>;

export const IssueSeveritySchema = z.enum([
  'info',
  'low',
  'medium',
  'high',
  'critical',
]);
export type IssueSeverity = z.infer<typeof IssueSeveritySchema>;

export const IssueStatusSchema = z.enum([
  'open',
  'resolved',
  'dismissed',
  'acknowledged',
]);
export type IssueStatus = z.infer<typeof IssueStatusSchema>;

export const IssueCategorySchema = z.enum([
  'data_quality',
  'billing',
  'discount',
  'revrec',
  'credits',
  'usage',
  'lifecycle',
  'multi_entity',
  'cross_snapshot',
  'tax_fees',
  'fx_currency',
]);
export type IssueCategory = z.infer<typeof IssueCategorySchema>;

export const IssueSourceTypeSchema = z.enum([
  'contract',
  'invoice',
  'invoice_line',
  'payment',
  'usage_event',
  'schedule',
  'obligation',
  'customer',
  'product',
  'contract_term',
]);
export type IssueSourceType = z.infer<typeof IssueSourceTypeSchema>;

export const FxRateSourceSchema = z.enum(['ecb', 'snapshot_rate', 'contract_rate', 'manual']);
export type FxRateSource = z.infer<typeof FxRateSourceSchema>;

export const ProrationMethodSchema = z.enum([
  'daily_exact',
  'daily_30',
  'monthly_proportional',
  'none',
]);
export type ProrationMethod = z.infer<typeof ProrationMethodSchema>;

// ============================================
// Configuration Schemas
// ============================================

export const FxConfigSchema = z.object({
  rateSource: FxRateSourceSchema.default('ecb'),
  rateDate: z.enum(['invoice_date', 'period_end', 'snapshot_date']).default('invoice_date'),
  tolerancePct: z.number().min(0).max(1).default(0.02),
  baseCurrency: z.string().length(3).default('USD'),
});
export type FxConfig = z.infer<typeof FxConfigSchema>;

export const ProrationConfigSchema = z.object({
  method: ProrationMethodSchema.default('daily_exact'),
  midPeriodAmendmentHandling: z.enum(['prorate', 'full_period', 'skip']).default('prorate'),
  rampScheduleRecognition: z.enum(['as_invoiced', 'straight_line']).default('as_invoiced'),
});
export type ProrationConfig = z.infer<typeof ProrationConfigSchema>;

export const TaxFeesConfigSchema = z.object({
  excludeFromComparison: z.boolean().default(true),
  taxLineItemCodes: z.array(z.string()).default(['TAX', 'VAT', 'GST']),
  feeLineItemCodes: z.array(z.string()).default(['SHIPPING', 'HANDLING']),
});
export type TaxFeesConfig = z.infer<typeof TaxFeesConfigSchema>;

export const CreditsConfigSchema = z.object({
  netWithInvoices: z.boolean().default(true),
  treatAsSeparateRevenue: z.boolean().default(false),
});
export type CreditsConfig = z.infer<typeof CreditsConfigSchema>;

export const ZeroValueConfigSchema = z.object({
  treatAsValid: z.boolean().default(true),
  skipBillingRules: z.boolean().default(true),
});
export type ZeroValueConfig = z.infer<typeof ZeroValueConfigSchema>;

export const ThresholdsConfigSchema = z.object({
  amountVariancePct: z.number().min(0).max(1).default(0.01),
  amountVarianceAbs: z.number().min(0).default(100),
  timingVarianceDays: z.number().min(0).default(5),
  highImpactThreshold: z.number().min(0).default(10000),
  criticalImpactThreshold: z.number().min(0).default(50000),
});
export type ThresholdsConfig = z.infer<typeof ThresholdsConfigSchema>;

export const GatingConfigSchema = z.object({
  skipIfContractNotReady: z.boolean().default(false),
  confidenceCapIfNotReady: z.number().min(0).max(1).default(0.3),
  skipIfUsageStale: z.boolean().default(true),
  usageStalenessHours: z.number().min(0).default(24),
  skipIfCRMStale: z.boolean().default(true),
  crmStalenessHours: z.number().min(0).default(48),
});
export type GatingConfig = z.infer<typeof GatingConfigSchema>;

export const AutoRenewalConfigSchema = z.object({
  detectImplicitRenewal: z.boolean().default(true),
  renewalGraceDays: z.number().min(0).default(30),
});
export type AutoRenewalConfig = z.infer<typeof AutoRenewalConfigSchema>;

// ============================================
// AI Detection Configuration Schemas
// ============================================

export const AIEnrichmentConfigSchema = z.object({
  enabled: z.boolean().default(false),
  maxIssuesPerRun: z.number().min(1).max(100).default(50),
  minConfidenceToEnrich: z.number().min(0).max(1).default(0.5),
  includeRecommendations: z.boolean().default(true),
});
export type AIEnrichmentConfig = z.infer<typeof AIEnrichmentConfigSchema>;

export const AIAnomalyDetectionConfigSchema = z.object({
  enabled: z.boolean().default(false),
  minConfidenceToReport: z.number().min(0).max(1).default(0.7),
  maxAnomaliesPerRun: z.number().min(1).max(50).default(20),
  categories: z.array(z.enum(['semantic', 'pattern', 'anomaly', 'contextual'])).default(['semantic', 'pattern']),
});
export type AIAnomalyDetectionConfig = z.infer<typeof AIAnomalyDetectionConfigSchema>;

export const LLMCostControlsConfigSchema = z.object({
  maxCostPerRunUsd: z.number().min(0).default(1.0),
  preferredModel: z.enum(['gpt-4o', 'gpt-4o-mini']).default('gpt-4o-mini'),
  enableCaching: z.boolean().default(true),
  budgetAlertThresholdUsd: z.number().optional(),
});
export type LLMCostControlsConfig = z.infer<typeof LLMCostControlsConfigSchema>;

export const DetectionConfigSchema = z.object({
  fx: FxConfigSchema.default({}),
  proration: ProrationConfigSchema.default({}),
  taxFees: TaxFeesConfigSchema.default({}),
  credits: CreditsConfigSchema.default({}),
  zeroValue: ZeroValueConfigSchema.default({}),
  thresholds: ThresholdsConfigSchema.default({}),
  gating: GatingConfigSchema.default({}),
  autoRenewal: AutoRenewalConfigSchema.default({}),
  enabledRules: z.array(z.string()).optional(),
  disabledRules: z.array(z.string()).optional(),
  // AI Detection Configuration (Tier 2-4)
  aiEnrichment: AIEnrichmentConfigSchema.optional(),
  aiAnomalyDetection: AIAnomalyDetectionConfigSchema.optional(),
  llmCostControls: LLMCostControlsConfigSchema.optional(),
});
export type DetectionConfig = z.infer<typeof DetectionConfigSchema>;

// ============================================
// Detection Run Schemas
// ============================================

export const DetectionRunSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  snapshotId: z.string(),
  rulesetVersion: z.string(),
  status: DetectionRunStatusSchema,
  config: DetectionConfigSchema.optional(),
  stats: z.record(z.unknown()).optional(),
  issuesTotal: z.number().default(0),
  issuesBySeverity: z.record(z.number()).optional(),
  issuesByCategory: z.record(z.number()).optional(),
  errorCode: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  startedAt: z.date().nullable().optional(),
  finishedAt: z.date().nullable().optional(),
  createdAt: z.date(),
});
export type DetectionRun = z.infer<typeof DetectionRunSchema>;

export const CreateDetectionRunSchema = z.object({
  snapshotId: z.string(),
  rulesetVersion: z.string().optional().default('1.0.0'),
  config: DetectionConfigSchema.optional(),
});
export type CreateDetectionRun = z.infer<typeof CreateDetectionRunSchema>;

// ============================================
// Issue Schemas
// ============================================

export const IssueSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  snapshotId: z.string(),
  runId: z.string(),
  ruleId: z.string(),
  ruleVersion: z.string(),
  issueKey: z.string(),
  category: IssueCategorySchema,
  status: IssueStatusSchema,
  severity: IssueSeveritySchema,
  confidence: z.number().min(0).max(1),
  impactAmount: z.number().nullable().optional(),
  currency: z.string().length(3).default('USD'),
  expected: z.record(z.unknown()),
  actual: z.record(z.unknown()),
  dimensions: z.record(z.unknown()),
  contractId: z.string().nullable().optional(),
  invoiceId: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  dataQualityFlags: z.array(z.string()).optional(),
  suppressedByRule: z.string().nullable().optional(),
  ruleMetadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Issue = z.infer<typeof IssueSchema>;

export const IssueListQuerySchema = z.object({
  snapshotId: z.string().optional(),
  status: IssueStatusSchema.optional(),
  severity: IssueSeveritySchema.optional(),
  category: IssueCategorySchema.optional(),
  ruleId: z.string().optional(),
  contractId: z.string().optional(),
  customerId: z.string().optional(),
  invoiceId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'severity', 'impactAmount', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type IssueListQuery = z.infer<typeof IssueListQuerySchema>;

export const UpdateIssueStatusSchema = z.object({
  status: IssueStatusSchema,
  reason: z.string().optional(),
});
export type UpdateIssueStatus = z.infer<typeof UpdateIssueStatusSchema>;

export const BulkUpdateIssueStatusSchema = z.object({
  issueIds: z.array(z.string()).min(1).max(100),
  status: IssueStatusSchema,
  reason: z.string().optional(),
});
export type BulkUpdateIssueStatus = z.infer<typeof BulkUpdateIssueStatusSchema>;

// ============================================
// Issue Status History Schemas
// ============================================

export const IssueStatusHistorySchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  issueId: z.string(),
  fromStatus: IssueStatusSchema,
  toStatus: IssueStatusSchema,
  actorUserId: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
});
export type IssueStatusHistory = z.infer<typeof IssueStatusHistorySchema>;

// ============================================
// Issue Source Schemas
// ============================================

export const IssueSourceSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  issueId: z.string(),
  sourceType: IssueSourceTypeSchema,
  sourceId: z.string(),
  sourceSystem: z.string().nullable().optional(),
  fieldName: z.string().nullable().optional(),
  fieldValue: z.unknown().optional(),
  createdAt: z.date(),
});
export type IssueSource = z.infer<typeof IssueSourceSchema>;

// ============================================
// Issue Summary Schemas
// ============================================

export const IssueSummarySchema = z.object({
  totalCount: z.number(),
  byStatus: z.record(z.number()),
  bySeverity: z.record(z.number()),
  byCategory: z.record(z.number()),
  totalImpact: z.number(),
  avgConfidence: z.number(),
});
export type IssueSummary = z.infer<typeof IssueSummarySchema>;

// ============================================
// FX Rate Schemas
// ============================================

export const FxRateSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  sourceCurrency: z.string().length(3),
  targetCurrency: z.string().length(3),
  rate: z.number().positive(),
  rateDate: z.date(),
  rateSource: FxRateSourceSchema,
  createdAt: z.date(),
});
export type FxRate = z.infer<typeof FxRateSchema>;

// ============================================
// Job Payloads
// ============================================

const BaseJobPayload = z.object({
  tenantId: TenantIdSchema,
  requestId: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const DetectRunJobPayloadSchema = BaseJobPayload.extend({
  type: z.literal('detect.run'),
  snapshotId: z.string(),
  rulesetVersion: z.string().optional(),
  config: DetectionConfigSchema.optional(),
});
export type DetectRunJobPayload = z.infer<typeof DetectRunJobPayloadSchema>;

export const DetectReplayJobPayloadSchema = BaseJobPayload.extend({
  type: z.literal('detect.replay'),
  runId: z.string(),
  rulesetVersion: z.string().optional(),
});
export type DetectReplayJobPayload = z.infer<typeof DetectReplayJobPayloadSchema>;

// ============================================
// Rule Definition Schemas (for registry)
// ============================================

export const RuleTierSchema = z.enum([
  'data_quality',
  'billing',
  'discount',
  'revrec',
  'credits',
  'usage',
  'lifecycle',
  'multi_entity',
  'cross_snapshot',
  'tax_fees',
  'fx_currency',
]);
export type RuleTier = z.infer<typeof RuleTierSchema>;

export const DataRequirementSchema = z.enum([
  'contracts',
  'invoices',
  'invoice_lines',
  'payments',
  'usage_events',
  'schedules',
  'obligations',
  'customers',
  'products',
  'contract_terms',
  'fx_rates',
  'prior_snapshot',
  'prior_issues',
]);
export type DataRequirement = z.infer<typeof DataRequirementSchema>;

export const RuleDefinitionSchema = z.object({
  id: z.string(),
  version: z.string(),
  name: z.string(),
  description: z.string(),
  category: IssueCategorySchema,
  tier: RuleTierSchema,
  severity: IssueSeveritySchema,
  dependsOn: z.array(z.string()).optional(),
  suppressedBy: z.array(z.string()).optional(),
  requiresData: z.array(DataRequirementSchema),
  enabled: z.boolean().default(true),
});
export type RuleDefinition = z.infer<typeof RuleDefinitionSchema>;

// ============================================
// API Response Schemas
// ============================================

export const IssueListResponseSchema = z.object({
  issues: z.array(IssueSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});
export type IssueListResponse = z.infer<typeof IssueListResponseSchema>;

export const DetectionRunListResponseSchema = z.object({
  runs: z.array(DetectionRunSchema),
  total: z.number(),
});
export type DetectionRunListResponse = z.infer<typeof DetectionRunListResponseSchema>;

// ============================================
// Phase 8: Evidence Generation Schemas
// ============================================

// ID Generators for Evidence
export function generateEvidenceId(): string {
  return `evd_${nanoid(16)}`;
}

export function generateEvidenceSourceId(): string {
  return `evs_${nanoid(16)}`;
}

export function generateEvidenceCalcId(): string {
  return `evc_${nanoid(16)}`;
}

export function generateEvidenceClauseId(): string {
  return `evcl_${nanoid(16)}`;
}

export function generateEvidenceAuditId(): string {
  return `eva_${nanoid(16)}`;
}

export function generateEvidenceRunId(): string {
  return `evr_${nanoid(16)}`;
}

// Evidence Type Enum
export const EvidenceTypeSchema = z.enum([
  'full',
  'summary',
  'calculation',
  'clause',
  'source',
]);
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;

// Evidence Source Type (extends Issue Source Type)
export const EvidenceSourceTypeSchema = z.enum([
  'contract',
  'invoice',
  'invoice_line',
  'payment',
  'usage_event',
  'schedule',
  'obligation',
  'customer',
  'product',
  'contract_term',
  'contract_version',
  'contract_document',
]);
export type EvidenceSourceType = z.infer<typeof EvidenceSourceTypeSchema>;

// Calculation Type Enum
export const CalculationTypeSchema = z.enum([
  'expected_amount',
  'actual_amount',
  'variance',
  'proration',
  'discount',
  'fx_conversion',
  'revenue_allocation',
  'custom',
]);
export type CalculationType = z.infer<typeof CalculationTypeSchema>;

// Evidence Action Enum
export const EvidenceActionSchema = z.enum([
  'generated',
  'regenerated',
  'failed',
  'expired',
  'archived',
]);
export type EvidenceAction = z.infer<typeof EvidenceActionSchema>;

// Evidence Trigger Type Enum
export const EvidenceTriggerTypeSchema = z.enum([
  'auto',
  'manual',
  'scheduled',
  'detection_run',
]);
export type EvidenceTriggerType = z.infer<typeof EvidenceTriggerTypeSchema>;

// Completeness Category
export const CompletenessCategory = z.enum([
  'source_coverage',
  'contract_ready',
  'calculation_reproducible',
  'clause_linked',
]);
export type CompletenessCategory = z.infer<typeof CompletenessCategory>;

// Issue Evidence Schema
export const IssueEvidenceSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  snapshotId: z.string(),
  issueId: z.string(),
  evidenceVersion: z.number(),
  evidenceType: EvidenceTypeSchema,
  title: z.string(),
  summary: z.string(),
  dataJson: z.record(z.unknown()),
  completenessScore: z.number().min(0).max(1),
  completenessBreakdown: z.record(z.number()),
  s3Key: z.string().nullable(),
  ruleId: z.string().nullable().optional(),
  ruleVersion: z.string().nullable().optional(),
  createdAt: z.date(),
});
export type IssueEvidence = z.infer<typeof IssueEvidenceSchema>;

// Issue Evidence Source Schema
export const IssueEvidenceSourceSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  evidenceId: z.string(),
  issueId: z.string(),
  sourceType: EvidenceSourceTypeSchema,
  sourceId: z.string(),
  sourceSystem: z.string().nullable().optional(),
  sourceExternalId: z.string().nullable().optional(),
  fieldName: z.string().nullable().optional(),
  fieldValueJson: z.unknown().optional(),
  s3Key: z.string().nullable().optional(),
  snapshotValueJson: z.unknown().optional(),
  createdAt: z.date(),
});
export type IssueEvidenceSource = z.infer<typeof IssueEvidenceSourceSchema>;

// Issue Evidence Calculation Schema
export const IssueEvidenceCalculationSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  evidenceId: z.string(),
  issueId: z.string(),
  calcName: z.string(),
  calcType: CalculationTypeSchema,
  formula: z.string().nullable().optional(),
  inputsJson: z.record(z.unknown()),
  outputsJson: z.record(z.unknown()),
  ruleId: z.string().nullable().optional(),
  ruleVersion: z.string().nullable().optional(),
  sequenceNumber: z.number(),
  isReproducible: z.boolean(),
  notes: z.string().nullable().optional(),
  createdAt: z.date(),
});
export type IssueEvidenceCalculation = z.infer<typeof IssueEvidenceCalculationSchema>;

// Issue Evidence Clause Schema
export const IssueEvidenceClauseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  evidenceId: z.string(),
  issueId: z.string(),
  clauseId: z.string().nullable().optional(),
  contractId: z.string().nullable().optional(),
  contractVersionId: z.string().nullable().optional(),
  documentId: z.string().nullable().optional(),
  clauseType: z.string().nullable().optional(),
  clauseLabel: z.string().nullable().optional(),
  excerpt: z.string(),
  fullTextS3Key: z.string().nullable().optional(),
  startOffset: z.number().nullable().optional(),
  endOffset: z.number().nullable().optional(),
  pageNumber: z.number().nullable().optional(),
  relevanceScore: z.number().min(0).max(1).nullable().optional(),
  createdAt: z.date(),
});
export type IssueEvidenceClause = z.infer<typeof IssueEvidenceClauseSchema>;

// Issue Evidence Audit Schema
export const IssueEvidenceAuditSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  issueId: z.string(),
  evidenceId: z.string().nullable().optional(),
  evidenceVersion: z.number(),
  action: EvidenceActionSchema,
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  triggerType: EvidenceTriggerTypeSchema,
  actorUserId: z.string().nullable().optional(),
  previousVersion: z.number().nullable().optional(),
  completenessScore: z.number().min(0).max(1).nullable().optional(),
  processingTimeMs: z.number().nullable().optional(),
  errorCode: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  metadataJson: z.record(z.unknown()).optional(),
  generatedAt: z.date(),
  createdAt: z.date(),
});
export type IssueEvidenceAudit = z.infer<typeof IssueEvidenceAuditSchema>;

// Evidence Generation Run Schema
export const EvidenceGenerationRunSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  snapshotId: z.string(),
  detectionRunId: z.string().nullable().optional(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  totalIssues: z.number(),
  processedIssues: z.number(),
  failedIssues: z.number(),
  skippedIssues: z.number(),
  avgCompletenessScore: z.number().min(0).max(1).nullable().optional(),
  statsJson: z.record(z.unknown()).optional(),
  errorCode: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  startedAt: z.date().nullable().optional(),
  finishedAt: z.date().nullable().optional(),
  createdAt: z.date(),
});
export type EvidenceGenerationRun = z.infer<typeof EvidenceGenerationRunSchema>;

// Calculation Step (used by rules)
export const CalculationStepSchema = z.object({
  name: z.string(),
  formula: z.string(),
  inputs: z.record(z.number()),
  output: z.number(),
  ruleId: z.string(),
  ruleVersion: z.string(),
});
export type CalculationStep = z.infer<typeof CalculationStepSchema>;

// Evidence Pack Structure
export const EvidencePackSchema = z.object({
  summary: z.string(),
  expected: z.record(z.unknown()),
  actual: z.record(z.unknown()),
  variance: z.object({
    amount: z.number().nullable().optional(),
    percentage: z.number().nullable().optional(),
    direction: z.enum(['over', 'under', 'none']).optional(),
    description: z.string().optional(),
  }),
  calculations: z.array(CalculationStepSchema),
  contractClauses: z.array(z.object({
    clauseId: z.string().optional(),
    type: z.string(),
    label: z.string().nullable().optional(),
    excerpt: z.string(),
    startOffset: z.number().optional(),
    endOffset: z.number().optional(),
    pageNumber: z.number().optional(),
  })),
  sourceRecords: z.array(z.object({
    sourceType: EvidenceSourceTypeSchema,
    sourceId: z.string(),
    sourceSystem: z.string().optional(),
    externalId: z.string().optional(),
    fieldName: z.string().optional(),
    fieldValue: z.unknown().optional(),
  })),
  snapshotMetadata: z.object({
    snapshotId: z.string(),
    snapshotDate: z.string(),
    rulesetVersion: z.string(),
    ruleId: z.string(),
    ruleVersion: z.string(),
    detectionRunId: z.string().optional(),
  }),
});
export type EvidencePack = z.infer<typeof EvidencePackSchema>;

// API Request/Response Schemas

export const GetEvidenceQuerySchema = z.object({
  includeCalculations: z.coerce.boolean().optional().default(true),
  includeClauses: z.coerce.boolean().optional().default(true),
  includeSources: z.coerce.boolean().optional().default(true),
  includeAudit: z.coerce.boolean().optional().default(false),
});
export type GetEvidenceQuery = z.infer<typeof GetEvidenceQuerySchema>;

export const RegenerateEvidenceRequestSchema = z.object({
  force: z.boolean().optional().default(false),
  reason: z.string().optional(),
});
export type RegenerateEvidenceRequest = z.infer<typeof RegenerateEvidenceRequestSchema>;

export const EvidenceResponseSchema = z.object({
  evidence: IssueEvidenceSchema,
  sources: z.array(IssueEvidenceSourceSchema),
  calculations: z.array(IssueEvidenceCalculationSchema),
  clauses: z.array(IssueEvidenceClauseSchema),
  audit: z.array(IssueEvidenceAuditSchema),
  downloadUrl: z.string().nullable().optional(),
});
export type EvidenceResponse = z.infer<typeof EvidenceResponseSchema>;

export const EvidenceSummaryResponseSchema = z.object({
  issueId: z.string(),
  evidenceVersion: z.number(),
  title: z.string(),
  summary: z.string(),
  completenessScore: z.number(),
  completenessBreakdown: z.record(z.number()),
  hasS3Artifact: z.boolean(),
  sourcesCount: z.number(),
  calculationsCount: z.number(),
  clausesCount: z.number(),
  generatedAt: z.date(),
});
export type EvidenceSummaryResponse = z.infer<typeof EvidenceSummaryResponseSchema>;

// Job Payloads
export const EvidenceGenerateJobPayloadSchema = z.object({
  type: z.literal('evidence.generate'),
  tenantId: TenantIdSchema,
  snapshotId: z.string(),
  detectionRunId: z.string().optional(),
  issueIds: z.array(z.string()).optional(),
  force: z.boolean().optional().default(false),
  requestId: z.string().optional(),
});
export type EvidenceGenerateJobPayload = z.infer<typeof EvidenceGenerateJobPayloadSchema>;

export const EvidenceRegenerateJobPayloadSchema = z.object({
  type: z.literal('evidence.regenerate'),
  tenantId: TenantIdSchema,
  issueId: z.string(),
  force: z.boolean().optional().default(false),
  actorUserId: z.string().optional(),
  reason: z.string().optional(),
  requestId: z.string().optional(),
});
export type EvidenceRegenerateJobPayload = z.infer<typeof EvidenceRegenerateJobPayloadSchema>;