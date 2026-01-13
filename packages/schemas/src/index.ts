// IDs and branded types
export * from './ids.js';

// Environment schemas
export * from './env.js';

// Job schemas
export * from './jobs.js';

// API schemas
export * from './api.js';

// Connector schemas
export * from './connectors.js';

// Normalized schemas (Phase 2)
export * from './normalized.js';

// Canonical schemas (Phase 2)
export * from './canonical.js';

// Identity schemas (Phase 3)
export * from './identity.js';

// Upload schemas (Phase 4)
export * from './uploads.js';

// Contract intelligence schemas (Phase 5)
export * from './contracts.js';

// Revenue recognition schemas (Phase 6)
export * from './revrec.js';

// Detection engine schemas (Phase 7)
// Re-export detection schemas with explicit names to avoid conflicts with api.ts
export {
  // ID generators
  generateDetectionRunId,
  generateIssueId,
  generateIssueStatusHistoryId,
  generateIssueSourceId,
  generateDetectionConfigId,
  generateFxRateId,
  // Status enums
  DetectionRunStatusSchema,
  type DetectionRunStatus,
  // Renamed exports to avoid conflict with api.ts
  IssueSeveritySchema as DetectionIssueSeveritySchema,
  type IssueSeverity as DetectionIssueSeverity,
  IssueStatusSchema as DetectionIssueStatusSchema,
  type IssueStatus as DetectionIssueStatus,
  IssueCategorySchema as DetectionIssueCategorySchema,
  type IssueCategory as DetectionIssueCategory,
  // Source types
  IssueSourceTypeSchema,
  type IssueSourceType,
  // Config enums
  FxRateSourceSchema,
  type FxRateSource,
  ProrationMethodSchema,
  type ProrationMethod,
  // Rule tier
  RuleTierSchema,
  type RuleTier,
  DataRequirementSchema,
  type DataRequirement,
  // Detection run schemas
  DetectionRunSchema,
  type DetectionRun,
  CreateDetectionRunSchema,
  type CreateDetectionRun,
  DetectionRunListResponseSchema,
  type DetectionRunListResponse,
  // Issue schemas (renamed)
  IssueSchema as DetectionIssueSchema,
  type Issue as DetectionIssue,
  IssueListQuerySchema as DetectionIssueListQuerySchema,
  type IssueListQuery as DetectionIssueListQuery,
  IssueListResponseSchema as DetectionIssueListResponseSchema,
  type IssueListResponse as DetectionIssueListResponse,
  IssueSummarySchema as DetectionIssueSummarySchema,
  type IssueSummary as DetectionIssueSummary,
  // Issue status operations
  UpdateIssueStatusSchema,
  type UpdateIssueStatus,
  BulkUpdateIssueStatusSchema,
  type BulkUpdateIssueStatus,
  IssueStatusHistorySchema,
  type IssueStatusHistory,
  IssueSourceSchema,
  type IssueSource,
  // Configuration schemas
  FxConfigSchema,
  type FxConfig,
  ProrationConfigSchema,
  type ProrationConfig,
  TaxFeesConfigSchema,
  type TaxFeesConfig,
  CreditsConfigSchema,
  type CreditsConfig,
  ZeroValueConfigSchema,
  type ZeroValueConfig,
  ThresholdsConfigSchema,
  type ThresholdsConfig,
  GatingConfigSchema,
  type GatingConfig,
  AutoRenewalConfigSchema,
  type AutoRenewalConfig,
  DetectionConfigSchema,
  type DetectionConfig,
  // FX rates
  FxRateSchema,
  type FxRate,
  // Rule definition
  RuleDefinitionSchema,
  type RuleDefinition,
  // Job payloads
  DetectRunJobPayloadSchema,
  type DetectRunJobPayload,
  DetectReplayJobPayloadSchema,
  type DetectReplayJobPayload,
} from './detection.js';
