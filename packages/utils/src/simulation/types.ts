/**
 * Simulation Engine Types
 * 
 * Types for the pure simulation engine functions.
 */

export interface ContractData {
  id: string;
  customerId: string | null;
  name: string | null;
  startDate: Date | null;
  endDate: Date | null;
  arr: number | null;
  currency: string;
  billingFrequency: string | null;
  status: string | null;
}

export interface InvoiceData {
  id: string;
  contractId: string | null;
  customerId: string | null;
  invoiceDate: Date;
  total: number;
  currency: string;
  status: string | null;
}

export interface ObligationData {
  id: string;
  contractId: string;
  obligationType: string;
  transactionPrice: number;
  serviceStartDate: Date | null;
  serviceEndDate: Date | null;
  status: string;
}

export interface ScheduleData {
  id: string;
  obligationId: string;
  periodStart: Date;
  periodEnd: Date;
  scheduledAmount: number;
  recognizedAmount: number;
  deferredAmount: number;
}

export interface SimulationContext {
  snapshotId: string;
  tenantId: string;
  contracts: ContractData[];
  invoices: InvoiceData[];
  obligations: ObligationData[];
  schedules: ScheduleData[];
}

export interface Override {
  id: string;
  overrideType: 'contract_term' | 'usage_adjustment' | 'billing_adjustment' | 'timing_shift' | 'discount_change' | 'price_change';
  targetType: 'contract' | 'invoice' | 'customer' | 'obligation' | 'line_item';
  targetId: string;
  fieldPath?: string | null;
  originalValue?: unknown;
  overrideValue: unknown;
  sequenceNumber: number;
}

export interface SimulationWarning {
  code: string;
  message: string;
  targetId?: string;
  overrideId?: string;
  severity: 'info' | 'warning' | 'error';
}

export interface AppliedOverride {
  overrideId: string;
  targetId: string;
  fieldPath: string | null;
  originalValue: unknown;
  newValue: unknown;
}

export interface SkippedOverride {
  overrideId: string;
  reason: string;
}

export interface DeltaRecord {
  deltaType: 'revenue_total' | 'revenue_period' | 'recognized_shift' | 'deferred_shift' | 'contract_impact' | 'obligation_impact';
  targetType?: string;
  targetId?: string;
  periodStart?: Date;
  periodEnd?: Date;
  baselineAmount: number;
  simulatedAmount: number;
  deltaAmount: number;
  deltaPct?: number;
  currency: string;
  details?: Record<string, unknown>;
}

export interface PeriodImpact {
  periodStart: Date;
  periodEnd: Date;
  revenueDelta: number;
  recognizedDelta: number;
  deferredDelta: number;
}

export interface SimulationSummary {
  totalRevenueDelta: number;
  totalRecognizedDelta: number;
  totalDeferredDelta: number;
  contractsAffected: number;
  obligationsAffected: number;
  overridesApplied: number;
  overridesSkipped: number;
  periodImpacts: PeriodImpact[];
}

export interface SimulationOptions {
  recomputeRevRec?: boolean;
  includeIssueAnalysis?: boolean;
  materialityThreshold?: number; // Filter out deltas smaller than this
}

export interface SimulationResult {
  modifiedContext: SimulationContext;
  deltas: DeltaRecord[];
  summary: SimulationSummary;
  appliedOverrides: AppliedOverride[];
  skippedOverrides: SkippedOverride[];
  warnings: SimulationWarning[];
}

export interface ValidationResult {
  valid: Override[];
  invalid: SkippedOverride[];
  warnings: SimulationWarning[];
}
