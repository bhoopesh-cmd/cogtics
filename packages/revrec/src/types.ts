/**
 * Revenue Recognition Types
 * 
 * Core types for the rev-rec calculation engine.
 */

// ============================================
// Input Types
// ============================================

export interface ContractInput {
  id: string;
  customerId: string | null;
  name: string | null;
  startDate: Date | null;
  endDate: Date | null;
  arr: number | null;
  currency: string;
  billingFrequency: 'monthly' | 'quarterly' | 'annually' | 'one_time' | null;
  terms: ContractTermInput[];
}

export interface ContractTermInput {
  id: string;
  termType: string;
  value: unknown;
  confidence: number;
}

export interface InvoiceInput {
  id: string;
  contractId: string | null;
  invoiceDate: Date;
  total: number;
  periodStart: Date | null;
  periodEnd: Date | null;
}

// ============================================
// Obligation Types
// ============================================

export type ObligationType = 
  | 'subscription' 
  | 'usage' 
  | 'one_time' 
  | 'professional_services' 
  | 'support';

export type AllocationMethod = 
  | 'ssp' 
  | 'residual' 
  | 'straight_line' 
  | 'custom';

export type RecognitionMethod = 
  | 'straight_line' 
  | 'usage_based' 
  | 'milestone' 
  | 'as_invoiced';

export type ObligationStatus = 
  | 'active' 
  | 'completed' 
  | 'cancelled' 
  | 'amended';

export interface IdentifiedObligation {
  obligationType: ObligationType;
  description: string;
  transactionPrice: number;
  standaloneSellIingPrice: number | null;
  serviceStartDate: Date;
  serviceEndDate: Date;
  sourceTermIds: string[];
  allocationMethod: AllocationMethod;
  recognitionMethod: RecognitionMethod;
}

// ============================================
// Allocation Types
// ============================================

export interface AllocationResult {
  obligationIndex: number;
  allocationPct: number;
  allocatedAmount: number;
  allocationBasis: string;
}

// ============================================
// Schedule Types
// ============================================

export type ScheduleStatus = 
  | 'pending' 
  | 'partial' 
  | 'recognized' 
  | 'cancelled';

export interface SchedulePeriod {
  periodStart: Date;
  periodEnd: Date;
  scheduledAmount: number;
  recognizedAmount: number;
  deferredAmount: number;
  periodDays: number;
  dailyRate: number;
  recognitionMethod: RecognitionMethod;
  status: ScheduleStatus;
}

// ============================================
// Recognition Event Types
// ============================================

export type RecognitionEventType = 
  | 'scheduled' 
  | 'usage' 
  | 'milestone' 
  | 'adjustment' 
  | 'cancellation' 
  | 'amendment';

export interface RecognitionEvent {
  eventDate: Date;
  recognizedAmount: number;
  eventType: RecognitionEventType;
  scheduleIndex: number | null;
  sourceInvoiceId: string | null;
  description: string | null;
}

// ============================================
// Deferred Revenue Types
// ============================================

export interface DeferredBalance {
  periodEnd: Date;
  openingBalance: number;
  additions: number;
  recognized: number;
  adjustments: number;
  closingBalance: number;
}

// ============================================
// Reconciliation Types
// ============================================

export type ReconciliationStatus = 
  | 'matched' 
  | 'timing_variance' 
  | 'amount_variance' 
  | 'missing_invoice' 
  | 'unmatched';

export interface ReconciliationResult {
  contractId: string;
  periodStart: Date;
  periodEnd: Date;
  status: ReconciliationStatus;
  scheduledAmount: number;
  invoicedAmount: number;
  varianceAmount: number;
  variancePct: number | null;
  details: Record<string, unknown>;
}

// ============================================
// Engine Output Types
// ============================================

export interface RevRecOutput {
  obligations: IdentifiedObligation[];
  allocations: AllocationResult[];
  schedules: SchedulePeriod[][];  // One array per obligation
  events: RecognitionEvent[][];    // One array per obligation
  balances: DeferredBalance[][];   // One array per obligation
}

export interface ReconciliationOutput {
  reconciliations: ReconciliationResult[];
  summary: {
    matched: number;
    timingVariance: number;
    amountVariance: number;
    missingInvoice: number;
    unmatched: number;
  };
}
