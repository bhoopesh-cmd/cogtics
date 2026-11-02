/**
 * Detection Engine Types
 * Core interfaces for the rule-based detection system
 */
import type {
  DetectionConfig,
  DetectionIssueCategory,
  DetectionIssueSeverity,
  DetectionIssueStatus,
  RuleTier,
} from '@cogtics/schemas';

// Re-export for convenience
export type IssueCategory = DetectionIssueCategory;
export type IssueSeverity = DetectionIssueSeverity;
export type IssueStatus = DetectionIssueStatus;
export type { DetectionConfig, RuleTier };

// Data requirements for rules
export type DataRequirement = 
  | 'contracts' 
  | 'invoices' 
  | 'invoice_lines'
  | 'payments' 
  | 'usage_events' 
  | 'customers' 
  | 'products'
  | 'obligations'
  | 'schedules'
  | 'contract_terms'
  | 'deferred_balances'
  | 'fx_rates'
  | 'prior_issues'
  | 'prior_snapshot'
  | 'prior_snapshots';

export type { Customer } from '@cogtics/db';
import type {
  Contract,
  Invoice,
  InvoiceLine,
  Payment,
  UsageEvent,
  Customer,
  Product,
  ContractTerm,
  RevenueObligation,
  RevenueSchedule,
  Snapshot,
  Issue as DbIssue,
} from '@cogtics/db';

// ============================================
// Rule Interface
// ============================================

export interface Rule {
  /** Unique rule identifier (e.g., 'R001') */
  id: string;
  /** Semantic version */
  version: string;
  /** Human-readable name */
  name: string;
  /** Detailed description */
  description: string;
  /** Category for grouping */
  category: IssueCategory;
  /** Execution tier (determines order) */
  tier: RuleTier;
  /** Default severity when issue is detected */
  severity: IssueSeverity;
  /** Priority within tier (lower = higher priority) */
  priority: number;
  /** Rule IDs that must pass first */
  dependsOn?: string[];
  /** Rule IDs that will suppress this rule if they fire */
  suppressedBy?: string[];
  /** Data requirements for this rule */
  requiresData: DataRequirement[];
  /** Whether rule is enabled by default */
  enabled: boolean;
  /** Pure function that detects issues */
  run: (ctx: RuleContext) => RuleIssue[];
}

// ============================================
// Rule Context
// ============================================

export type ContractWithTerms = Contract & {
  terms: ContractTerm[];
  customer?: Customer;
  total_value?: number;
  updated_at?: Date;
};

export interface InvoiceWithLines extends Invoice {
  lines: InvoiceLine[];
  customer?: Customer;
  total_amount?: number;
}

export interface ScheduleWithObligation extends RevenueSchedule {
  obligation?: RevenueObligation;
}

export interface DataQualityReport {
  /** Snapshot completeness percentage */
  snapshotCompleteness: number;
  /** Whether usage data is stale */
  usageDataStale: boolean;
  /** Usage data age in hours */
  usageDataAgeHours: number;
  /** Whether CRM data is stale */
  crmDataStale: boolean;
  /** CRM data age in hours */
  crmDataAgeHours: number;
  /** Contract readiness scores by contract ID */
  contractReadiness: Map<string, number>;
  /** Missing master data warnings */
  missingMasterData: string[];
  /** FX rates available for currencies */
  fxRatesAvailable: Set<string>;
  /** Prior snapshot for comparison */
  priorSnapshot?: Snapshot;
}

export interface RuleContext {
  /** Tenant ID */
  tenantId: string;
  /** Snapshot ID being analyzed */
  snapshotId: string;
  /** Snapshot date/time */
  snapshotDate: Date;
  /** Detection run ID */
  runId: string;
  /** Detection configuration */
  config: DetectionConfig;
  /** Data quality information */
  dataQuality: DataQualityReport;
  /** Contracts with terms */
  contracts: ContractWithTerms[];
  /** Invoices with lines */
  invoices: InvoiceWithLines[];
  /** Payments */
  payments: Payment[];
  /** Usage events */
  usageEvents: UsageEvent[];
  /** Customers */
  customers: Customer[];
  /** Products */
  products: Product[];
  /** Revenue schedules */
  schedules: ScheduleWithObligation[];
  /** Revenue obligations */
  obligations: RevenueObligation[];
  /** FX rates map (key: `${from}_${to}_${date}`) */
  fxRates: Map<string, number>;
  /** Prior snapshot issues (for cross-snapshot rules) */
  priorIssues?: DbIssue[];
  /** Issues detected so far in this run (for hierarchy suppression) */
  currentRunIssues: RuleIssue[];
}

// ============================================
// Rule Issue (output from rule.run)
// ============================================

export interface RuleIssue {
  /** Rule ID that generated this issue */
  ruleId: string;
  /** Rule version */
  ruleVersion: string;
  /** Category */
  category: IssueCategory;
  /** Severity */
  severity: IssueSeverity;
  /** Confidence score (0-1) */
  confidence: number;
  /** Monetary impact amount */
  impactAmount?: number;
  /** Currency for impact */
  currency?: string;
  /** Expected values */
  expected: Record<string, unknown>;
  /** Actual values */
  actual: Record<string, unknown>;
  /** Dimension values for issue key generation */
  dimensions: IssueDimensions;
  /** Related contract ID */
  contractId?: string;
  /** Related invoice ID */
  invoiceId?: string;
  /** Related customer ID */
  customerId?: string;
  /** Data quality flags affecting this issue */
  dataQualityFlags?: string[];
  /** Rule that suppressed this issue, if any */
  suppressedByRule?: string;
  /** Source evidence for this issue */
  sources?: IssueSourceRef[];
  /** Additional rule-specific metadata */
  metadata?: Record<string, unknown>;
}

export interface IssueDimensions {
  /** Contract ID (if applicable) */
  contractId?: string;
  /** Invoice ID (if applicable) */
  invoiceId?: string;
  /** Customer ID (if applicable) */
  customerId?: string;
  /** Period start (if applicable) */
  periodStart?: string;
  /** Period end (if applicable) */
  periodEnd?: string;
  /** Line item ID (if applicable) */
  lineItemId?: string;
  /** Product ID (if applicable) */
  productId?: string;
  /** Additional dimension keys */
  [key: string]: string | undefined;
}

export interface IssueSourceRef {
  /** Type of source */
  sourceType: 'contract' | 'invoice' | 'invoice_line' | 'payment' | 'usage_event' | 
              'schedule' | 'obligation' | 'customer' | 'product' | 'contract_term';
  /** Source record ID */
  sourceId: string;
  /** Source system (e.g., 'stripe', 'salesforce') */
  sourceSystem?: string;
  /** Specific field name */
  fieldName?: string;
  /** Field value */
  fieldValue?: unknown;
}

// ============================================
// Rule Registry Types
// ============================================

export interface RuleRegistryEntry {
  rule: Rule;
  hash: string;
}

export interface RuleRegistry {
  /** All registered rules */
  rules: Map<string, RuleRegistryEntry>;
  /** Get rule by ID */
  get(id: string): Rule | undefined;
  /** Get rules by category */
  getByCategory(category: IssueCategory): Rule[];
  /** Get rules by tier */
  getByTier(tier: RuleTier): Rule[];
  /** Get all enabled rules */
  getEnabled(): Rule[];
  /** Get rules in execution order */
  getInOrder(): Rule[];
}

// ============================================
// Runner Types
// ============================================

export interface RunnerOptions {
  /** Only run specific rules */
  ruleIds?: string[];
  /** Skip specific rules */
  skipRuleIds?: string[];
  /** Stop on first error */
  stopOnError?: boolean;
  /** Max issues per rule */
  maxIssuesPerRule?: number;
  /** Dry run (don't persist) */
  dryRun?: boolean;
}

export interface RuleRunResult {
  ruleId: string;
  ruleVersion: string;
  issueCount: number;
  durationMs: number;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

export interface DetectionRunResult {
  runId: string;
  snapshotId: string;
  rulesetVersion: string;
  status: 'completed' | 'failed' | 'cancelled';
  issuesTotal: number;
  issuesBySeverity: Record<string, number>;
  issuesByCategory: Record<string, number>;
  ruleResults: RuleRunResult[];
  durationMs: number;
  /** All detected issues (after deduplication and scoring) */
  issues: RuleIssue[];
  errorCode?: string;
  errorMessage?: string;
}

// ============================================
// Scorer Types
// ============================================

export interface ScorerInput {
  issue: RuleIssue;
  contract?: ContractWithTerms;
  priorIssues?: DbIssue[];
  relatedIssues?: RuleIssue[];
  config: DetectionConfig;
}

export interface ScorerOutput {
  severity: IssueSeverity;
  confidence: number;
  escalationReason?: string;
}

// ============================================
// Preprocessor Types
// ============================================

export interface PreprocessedData {
  /** Contracts with normalized amounts */
  contracts: ContractWithTerms[];
  /** Invoices with tax/fees excluded, credits netted */
  invoices: InvoiceWithLines[];
  /** Normalized payments */
  payments: Payment[];
  /** Usage events with validation */
  usageEvents: UsageEvent[];
  /** Data quality report */
  dataQuality: DataQualityReport;
}

export interface PreprocessorOptions {
  /** Exclude tax lines */
  excludeTax: boolean;
  /** Exclude fee lines */
  excludeFees: boolean;
  /** Net credits with invoices */
  netCredits: boolean;
  /** Convert to base currency */
  convertCurrency: boolean;
  /** Base currency for conversion */
  baseCurrency: string;
}

// ============================================
// Deduplicator Types
// ============================================

export interface DeduplicationResult {
  /** Issues after deduplication */
  issues: RuleIssue[];
  /** Issues that were suppressed */
  suppressed: Array<{
    issue: RuleIssue;
    suppressedBy: string;
  }>;
  /** Duplicate issues that were merged */
  duplicates: Array<{
    original: RuleIssue;
    duplicate: RuleIssue;
  }>;
}

// ============================================
// AI Enrichment Types (Tier 2)
// ============================================

export interface AIEnrichedIssue extends RuleIssue {
  /** AI-generated analysis */
  aiAnalysis: {
    /** Root cause explanation */
    rootCause: string;
    /** Business impact description */
    businessImpact: string;
    /** Suggested corrective action */
    suggestedFix: string;
    /** AI confidence in analysis (0-1) */
    confidence: number;
    /** Related issue IDs (issue keys) */
    relatedIssueIds: string[];
    /** Plain-language explanation */
    explanation: string;
    /** AI-assessed priority */
    priority: 'critical' | 'high' | 'medium' | 'low';
    /** Classification tags */
    tags: string[];
  };
  /** Unique issue key */
  issueKey: string;
  /** When AI enrichment occurred */
  aiEnrichedAt: Date;
}

// ============================================
// AI Discovered Issues Types (Tier 3)
// ============================================

export interface AIDiscoveredIssue {
  /** Unique ID */
  id: string;
  /** Category of AI discovery */
  category: 'semantic' | 'pattern' | 'anomaly' | 'contextual';
  /** Severity assessment */
  severity: IssueSeverity;
  /** AI confidence (0-1) */
  confidence: number;
  /** Issue title */
  title: string;
  /** Detailed description */
  description: string;
  /** Evidence supporting discovery */
  evidence: {
    /** Related contract IDs */
    contractIds: string[];
    /** Related invoice IDs */
    invoiceIds: string[];
    /** Relevant field values */
    relevantFields: Record<string, unknown>;
  };
  /** AI reasoning for detection */
  reasoning: string;
  /** Always requires human review */
  requiresReview: true;
  /** Review status */
  reviewStatus?: 'pending' | 'confirmed' | 'dismissed';
  /** User who reviewed */
  reviewedBy?: string;
  /** When reviewed */
  reviewedAt?: Date;
  /** If promoted, the issue ID */
  promotedToIssueId?: string;
}

// ============================================
// AI Recommendation Types (Tier 4)
// ============================================

export interface AIRecommendation {
  /** Unique ID */
  id: string;
  /** Related issue IDs */
  issueIds: string[];
  /** Priority level */
  priority: 'critical' | 'high' | 'medium' | 'low';
  /** Recommendation title */
  title: string;
  /** Detailed description */
  description: string;
  /** Estimated financial impact */
  estimatedImpact: {
    /** Revenue change amount */
    revenueChange: number;
    /** Currency */
    currency: string;
    /** Confidence in estimate */
    confidence: number;
  };
  /** Suggested simulation configuration */
  suggestedSimulation: {
    /** Simulation overrides */
    overrides: SimulationOverride[];
    /** Description of simulation */
    description: string;
  };
  /** Effort level */
  effort: 'low' | 'medium' | 'high';
  /** AI reasoning */
  reasoning: string;
  /** Status */
  status?: 'pending' | 'accepted' | 'dismissed' | 'simulated' | 'applied';
  /** Related simulation ID if created */
  simulationId?: string;
  /** When created */
  createdAt?: Date;
}

export interface SimulationOverride {
  /** Override type */
  type: 'contract_term' | 'price_change' | 'timing_shift' | 'discount_change' | 'billing_adjustment';
  /** Target entity ID (contract or invoice) */
  targetId: string;
  /** Field to override */
  field: string;
  /** Original value */
  originalValue: unknown;
  /** New value */
  newValue: unknown;
  /** Effective date */
  effectiveDate?: string;
  /** Description */
  description?: string;
}

// ============================================
// AI Detection Configuration Types
// ============================================

export interface AIEnrichmentConfig {
  /** Enable AI enrichment */
  enabled: boolean;
  /** Max issues to enrich per run */
  maxIssuesPerRun: number;
  /** Min confidence threshold to enrich */
  minConfidenceToEnrich: number;
  /** Include fix recommendations */
  includeRecommendations: boolean;
}

export interface AIAnomalyDetectionConfig {
  /** Enable anomaly detection */
  enabled: boolean;
  /** Min confidence to report anomalies */
  minConfidenceToReport: number;
  /** Max anomalies to report per run */
  maxAnomaliesPerRun: number;
  /** Enabled categories */
  categories: Array<'semantic' | 'pattern' | 'anomaly' | 'contextual'>;
}

export interface LLMCostControlsConfig {
  /** Max cost per run in USD */
  maxCostPerRunUsd: number;
  /** Preferred model */
  preferredModel: 'gpt-4o' | 'gpt-4o-mini';
  /** Enable response caching */
  enableCaching: boolean;
  /** Budget alert threshold in USD */
  budgetAlertThresholdUsd?: number;
}

export interface AIDetectionConfig {
  /** Tier 2: AI Enrichment */
  aiEnrichment?: AIEnrichmentConfig;
  /** Tier 3: AI Anomaly Detection */
  aiAnomalyDetection?: AIAnomalyDetectionConfig;
  /** Cost controls */
  llmCostControls?: LLMCostControlsConfig;
}
