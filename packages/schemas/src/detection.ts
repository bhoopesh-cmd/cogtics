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
