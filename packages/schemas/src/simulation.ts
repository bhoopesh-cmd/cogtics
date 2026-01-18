/**
 * Simulation Engine Schemas (Phase 9)
 * 
 * Zod schemas for simulations, overrides, runs, results, and templates.
 */
import { z } from 'zod';
import { TenantIdSchema, generateId } from './ids.js';

// ============================================
// ID Types and Generators
// ============================================

export type SimulationId = string & { readonly __brand: 'SimulationId' };
export type SimulationOverrideId = string & { readonly __brand: 'SimulationOverrideId' };
export type SimulationRunId = string & { readonly __brand: 'SimulationRunId' };
export type SimulationResultId = string & { readonly __brand: 'SimulationResultId' };
export type SimulationDeltaId = string & { readonly __brand: 'SimulationDeltaId' };
export type SimulationTemplateId = string & { readonly __brand: 'SimulationTemplateId' };
export type SimulationAuditId = string & { readonly __brand: 'SimulationAuditId' };

export const generateSimulationId = (): SimulationId => generateId('sim') as SimulationId;
export const generateSimulationOverrideId = (): SimulationOverrideId => generateId('simov') as SimulationOverrideId;
export const generateSimulationRunId = (): SimulationRunId => generateId('simrun') as SimulationRunId;
export const generateSimulationResultId = (): SimulationResultId => generateId('simres') as SimulationResultId;
export const generateSimulationDeltaId = (): SimulationDeltaId => generateId('simdlt') as SimulationDeltaId;
export const generateSimulationTemplateId = (): SimulationTemplateId => generateId('simtpl') as SimulationTemplateId;
export const generateSimulationAuditId = (): SimulationAuditId => generateId('simaud') as SimulationAuditId;

// ============================================
// Enums
// ============================================

export const SimulationStatusSchema = z.enum([
  'draft',
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
]);
export type SimulationStatus = z.infer<typeof SimulationStatusSchema>;

export const SimulationRunStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
]);
export type SimulationRunStatus = z.infer<typeof SimulationRunStatusSchema>;

export const OverrideTypeSchema = z.enum([
  'contract_term',
  'usage_adjustment',
  'billing_adjustment',
  'timing_shift',
  'discount_change',
  'price_change',
]);
export type OverrideType = z.infer<typeof OverrideTypeSchema>;

export const TargetTypeSchema = z.enum([
  'contract',
  'invoice',
  'customer',
  'obligation',
  'line_item',
]);
export type TargetType = z.infer<typeof TargetTypeSchema>;

export const DeltaTypeSchema = z.enum([
  'revenue_total',
  'revenue_period',
  'recognized_shift',
  'deferred_shift',
  'contract_impact',
  'obligation_impact',
]);
export type DeltaType = z.infer<typeof DeltaTypeSchema>;

export const SimulationAuditActionSchema = z.enum([
  'created',
  'updated',
  'deleted',
  'override_added',
  'override_removed',
  'run_started',
  'run_completed',
  'run_failed',
  'template_applied',
]);
export type SimulationAuditAction = z.infer<typeof SimulationAuditActionSchema>;

// ============================================
// Override Schemas
// ============================================

// Base override fields
const BaseOverrideSchema = z.object({
  targetId: z.string(),
  targetType: TargetTypeSchema,
  fieldPath: z.string().optional(),
  originalValue: z.unknown().optional(),
  overrideValue: z.unknown(),
  sequenceNumber: z.number().int().min(0).default(0),
});

// Contract term override
export const ContractTermOverrideSchema = BaseOverrideSchema.extend({
  overrideType: z.literal('contract_term'),
  targetType: z.literal('contract'),
  fieldPath: z.enum(['arr', 'discount_rate', 'billing_frequency', 'start_date', 'end_date', 'currency', 'name']),
  overrideValue: z.union([z.number(), z.string(), z.date()]),
});
export type ContractTermOverride = z.infer<typeof ContractTermOverrideSchema>;

// Usage adjustment override
export const UsageAdjustmentOverrideSchema = BaseOverrideSchema.extend({
  overrideType: z.literal('usage_adjustment'),
  targetType: z.literal('contract'),
  action: z.enum(['add', 'remove', 'modify']),
  usageEvents: z.array(z.object({
    eventId: z.string().optional(),
    quantity: z.number(),
    unitPrice: z.number().optional(),
    eventDate: z.string(),
    metricName: z.string().optional(),
  })).optional(),
});
export type UsageAdjustmentOverride = z.infer<typeof UsageAdjustmentOverrideSchema>;

// Billing adjustment override
export const BillingAdjustmentOverrideSchema = BaseOverrideSchema.extend({
  overrideType: z.literal('billing_adjustment'),
  targetType: z.enum(['invoice', 'line_item']),
  adjustmentType: z.enum(['credit', 'discount', 'fee', 'correction']),
  adjustmentAmount: z.number(),
  adjustmentPct: z.number().optional(),
  reason: z.string().optional(),
});
export type BillingAdjustmentOverride = z.infer<typeof BillingAdjustmentOverrideSchema>;

// Timing shift override
export const TimingShiftOverrideSchema = BaseOverrideSchema.extend({
  overrideType: z.literal('timing_shift'),
  targetType: z.enum(['contract', 'obligation']),
  shiftType: z.enum(['start_date', 'end_date', 'recognition_start', 'recognition_end']),
  shiftDays: z.number().int().optional(),
  newDate: z.string().optional(),
});
export type TimingShiftOverride = z.infer<typeof TimingShiftOverrideSchema>;

// Discount change override
export const DiscountChangeOverrideSchema = BaseOverrideSchema.extend({
  overrideType: z.literal('discount_change'),
  targetType: z.enum(['contract', 'invoice', 'line_item']),
  discountPct: z.number().min(0).max(100).optional(),
  discountAmount: z.number().optional(),
});
export type DiscountChangeOverride = z.infer<typeof DiscountChangeOverrideSchema>;

// Price change override
export const PriceChangeOverrideSchema = BaseOverrideSchema.extend({
  overrideType: z.literal('price_change'),
  targetType: z.enum(['contract', 'line_item', 'obligation']),
  priceDelta: z.number().optional(),
  pricePct: z.number().optional(),
  newPrice: z.number().optional(),
});
export type PriceChangeOverride = z.infer<typeof PriceChangeOverrideSchema>;

// Union of all override types
export const SimulationOverridePayloadSchema = z.discriminatedUnion('overrideType', [
  ContractTermOverrideSchema,
  UsageAdjustmentOverrideSchema,
  BillingAdjustmentOverrideSchema,
  TimingShiftOverrideSchema,
  DiscountChangeOverrideSchema,
  PriceChangeOverrideSchema,
]);
export type SimulationOverridePayload = z.infer<typeof SimulationOverridePayloadSchema>;

// Full override record (as stored in DB)
export const SimulationOverrideSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  simulationId: z.string(),
  overrideType: OverrideTypeSchema,
  targetType: TargetTypeSchema,
  targetId: z.string(),
  fieldPath: z.string().nullable(),
  originalValueJson: z.unknown().nullable(),
  overrideValueJson: z.unknown(),
  sequenceNumber: z.number().int(),
  isValid: z.boolean(),
  validationMessage: z.string().nullable(),
  createdAt: z.coerce.date(),
});
export type SimulationOverride = z.infer<typeof SimulationOverrideSchema>;

// ============================================
// Simulation Schemas
// ============================================

export const SimulationSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  snapshotId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: SimulationStatusSchema,
  templateId: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Simulation = z.infer<typeof SimulationSchema>;

export const SimulationWithOverridesSchema = SimulationSchema.extend({
  overrides: z.array(SimulationOverrideSchema),
});
export type SimulationWithOverrides = z.infer<typeof SimulationWithOverridesSchema>;

// ============================================
// Simulation Run Schemas
// ============================================

export const SimulationRunSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  simulationId: z.string(),
  runNumber: z.number().int(),
  status: SimulationRunStatusSchema,
  startedAt: z.coerce.date().nullable(),
  finishedAt: z.coerce.date().nullable(),
  processingTimeMs: z.number().int().nullable(),
  triggeredBy: z.string().nullable(),
  optionsJson: z.record(z.unknown()),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.coerce.date(),
});
export type SimulationRun = z.infer<typeof SimulationRunSchema>;

// ============================================
// Simulation Result Schemas
// ============================================

export const SimulationResultSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  runId: z.string(),
  simulationId: z.string(),
  // Revenue metrics
  totalRevenueBaseline: z.number().nullable(),
  totalRevenueSimulated: z.number().nullable(),
  totalRevenueDelta: z.number().nullable(),
  totalRevenueDeltaPct: z.number().nullable(),
  // Recognition metrics
  totalRecognizedBaseline: z.number().nullable(),
  totalRecognizedSimulated: z.number().nullable(),
  totalDeferredBaseline: z.number().nullable(),
  totalDeferredSimulated: z.number().nullable(),
  // Impact counts
  contractsAffected: z.number().int(),
  obligationsAffected: z.number().int(),
  overridesApplied: z.number().int(),
  overridesSkipped: z.number().int(),
  // Detailed results
  summaryJson: z.record(z.unknown()),
  warningsJson: z.array(z.unknown()),
  createdAt: z.coerce.date(),
});
export type SimulationResult = z.infer<typeof SimulationResultSchema>;

// ============================================
// Simulation Delta Schemas
// ============================================

export const SimulationDeltaSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  runId: z.string(),
  simulationId: z.string(),
  deltaType: DeltaTypeSchema,
  targetType: z.string().nullable(),
  targetId: z.string().nullable(),
  periodStart: z.coerce.date().nullable(),
  periodEnd: z.coerce.date().nullable(),
  baselineAmount: z.number().nullable(),
  simulatedAmount: z.number().nullable(),
  deltaAmount: z.number(),
  deltaPct: z.number().nullable(),
  currency: z.string(),
  detailsJson: z.unknown().nullable(),
  createdAt: z.coerce.date(),
});
export type SimulationDelta = z.infer<typeof SimulationDeltaSchema>;

// ============================================
// Simulation Template Schemas
// ============================================

export const SimulationTemplateSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  templateJson: z.object({
    overrides: z.array(SimulationOverridePayloadSchema),
    defaultOptions: z.record(z.unknown()).optional(),
  }),
  isActive: z.boolean(),
  createdBy: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type SimulationTemplate = z.infer<typeof SimulationTemplateSchema>;

// ============================================
// Simulation Audit Schemas
// ============================================

export const SimulationAuditSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  simulationId: z.string().nullable(),
  runId: z.string().nullable(),
  action: SimulationAuditActionSchema,
  actorUserId: z.string().nullable(),
  detailsJson: z.unknown().nullable(),
  createdAt: z.coerce.date(),
});
export type SimulationAudit = z.infer<typeof SimulationAuditSchema>;

// ============================================
// API Request/Response Schemas
// ============================================

// List simulations query
export const SimulationListQuerySchema = z.object({
  snapshotId: z.string().optional(),
  status: SimulationStatusSchema.optional(),
  templateId: z.string().optional(),
  createdBy: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['created_at', 'updated_at', 'name', 'status']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type SimulationListQuery = z.infer<typeof SimulationListQuerySchema>;

// Create simulation request
export const CreateSimulationSchema = z.object({
  snapshotId: z.string(),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  templateId: z.string().optional(),
});
export type CreateSimulation = z.infer<typeof CreateSimulationSchema>;

// Update simulation request
export const UpdateSimulationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['draft', 'cancelled']).optional(), // Only draft/cancelled can be set directly
});
export type UpdateSimulation = z.infer<typeof UpdateSimulationSchema>;

// Add override request
export const AddOverrideSchema = SimulationOverridePayloadSchema;
export type AddOverride = z.infer<typeof AddOverrideSchema>;

// Run simulation request
export const RunSimulationSchema = z.object({
  recomputeRevRec: z.boolean().default(true),
  includeIssueAnalysis: z.boolean().default(false),
});
export type RunSimulationRequest = z.infer<typeof RunSimulationSchema>;

// List runs query
export const SimulationRunListQuerySchema = z.object({
  status: SimulationRunStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type SimulationRunListQuery = z.infer<typeof SimulationRunListQuerySchema>;

// Deltas query
export const SimulationDeltasQuerySchema = z.object({
  deltaType: DeltaTypeSchema.optional(),
  targetType: TargetTypeSchema.optional(),
  targetId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});
export type SimulationDeltasQuery = z.infer<typeof SimulationDeltasQuerySchema>;

// Template list query
export const TemplateListQuerySchema = z.object({
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type TemplateListQuery = z.infer<typeof TemplateListQuerySchema>;

// Create template request
export const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  overrides: z.array(SimulationOverridePayloadSchema),
  defaultOptions: z.record(z.unknown()).optional(),
});
export type CreateTemplate = z.infer<typeof CreateTemplateSchema>;

// Apply template request
export const ApplyTemplateSchema = z.object({
  snapshotId: z.string(),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
});
export type ApplyTemplate = z.infer<typeof ApplyTemplateSchema>;

// ============================================
// Job Payloads
// ============================================

const BaseJobPayload = z.object({
  tenantId: z.string(),
  requestId: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const SimulationRunJobPayloadSchema = BaseJobPayload.extend({
  type: z.literal('simulation.run'),
  simulationId: z.string(),
  runId: z.string(),
  options: RunSimulationSchema.optional(),
});
export type SimulationRunJobPayload = z.infer<typeof SimulationRunJobPayloadSchema>;

export const SimulationReplayJobPayloadSchema = BaseJobPayload.extend({
  type: z.literal('simulation.replay'),
  simulationId: z.string(),
  originalRunId: z.string(),
  newRunId: z.string(),
  options: RunSimulationSchema.optional(),
});
export type SimulationReplayJobPayload = z.infer<typeof SimulationReplayJobPayloadSchema>;

// ============================================
// Simulation Engine Types (for pure functions)
// ============================================

export const SimulationContextSchema = z.object({
  snapshotId: z.string(),
  tenantId: z.string(),
  contracts: z.array(z.object({
    id: z.string(),
    customerId: z.string().nullable(),
    name: z.string().nullable(),
    startDate: z.coerce.date().nullable(),
    endDate: z.coerce.date().nullable(),
    arr: z.number().nullable(),
    currency: z.string(),
    billingFrequency: z.string().nullable(),
    status: z.string().nullable(),
  })),
  invoices: z.array(z.object({
    id: z.string(),
    contractId: z.string().nullable(),
    customerId: z.string().nullable(),
    invoiceDate: z.coerce.date(),
    total: z.number(),
    currency: z.string(),
    status: z.string().nullable(),
  })),
  obligations: z.array(z.object({
    id: z.string(),
    contractId: z.string(),
    obligationType: z.string(),
    transactionPrice: z.number(),
    serviceStartDate: z.coerce.date().nullable(),
    serviceEndDate: z.coerce.date().nullable(),
    status: z.string(),
  })),
  schedules: z.array(z.object({
    id: z.string(),
    obligationId: z.string(),
    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
    scheduledAmount: z.number(),
    recognizedAmount: z.number(),
    deferredAmount: z.number(),
  })),
});
export type SimulationContext = z.infer<typeof SimulationContextSchema>;

export const SimulationWarningSchema = z.object({
  code: z.string(),
  message: z.string(),
  targetId: z.string().optional(),
  overrideId: z.string().optional(),
  severity: z.enum(['info', 'warning', 'error']),
});
export type SimulationWarning = z.infer<typeof SimulationWarningSchema>;

export const SimulationSummarySchema = z.object({
  totalRevenueDelta: z.number(),
  totalRecognizedDelta: z.number(),
  totalDeferredDelta: z.number(),
  contractsAffected: z.number().int(),
  obligationsAffected: z.number().int(),
  overridesApplied: z.number().int(),
  overridesSkipped: z.number().int(),
  periodImpacts: z.array(z.object({
    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
    revenueDelta: z.number(),
    recognizedDelta: z.number(),
    deferredDelta: z.number(),
  })),
});
export type SimulationSummary = z.infer<typeof SimulationSummarySchema>;

export const DeltaRecordSchema = z.object({
  deltaType: DeltaTypeSchema,
  targetType: z.string().optional(),
  targetId: z.string().optional(),
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
  baselineAmount: z.number(),
  simulatedAmount: z.number(),
  deltaAmount: z.number(),
  deltaPct: z.number().optional(),
  currency: z.string(),
  details: z.record(z.unknown()).optional(),
});
export type DeltaRecord = z.infer<typeof DeltaRecordSchema>;

export const SimulationEngineResultSchema = z.object({
  modifiedContext: SimulationContextSchema,
  deltas: z.array(DeltaRecordSchema),
  summary: SimulationSummarySchema,
  appliedOverrides: z.array(z.string()), // IDs of applied overrides
  skippedOverrides: z.array(z.object({
    overrideId: z.string(),
    reason: z.string(),
  })),
  warnings: z.array(SimulationWarningSchema),
});
export type SimulationEngineResult = z.infer<typeof SimulationEngineResultSchema>;
