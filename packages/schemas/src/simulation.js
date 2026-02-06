/**
 * Simulation Engine Schemas (Phase 9)
 *
 * Zod schemas for simulations, overrides, runs, results, and templates.
 */
import { z } from 'zod';
import { generateId } from './ids.js';
export const generateSimulationId = () => generateId('sim');
export const generateSimulationOverrideId = () => generateId('simov');
export const generateSimulationRunId = () => generateId('simrun');
export const generateSimulationResultId = () => generateId('simres');
export const generateSimulationDeltaId = () => generateId('simdlt');
export const generateSimulationTemplateId = () => generateId('simtpl');
export const generateSimulationAuditId = () => generateId('simaud');
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
export const SimulationRunStatusSchema = z.enum([
    'pending',
    'running',
    'completed',
    'failed',
    'cancelled',
]);
export const OverrideTypeSchema = z.enum([
    'contract_term',
    'usage_adjustment',
    'billing_adjustment',
    'timing_shift',
    'discount_change',
    'price_change',
]);
export const TargetTypeSchema = z.enum([
    'contract',
    'invoice',
    'customer',
    'obligation',
    'line_item',
]);
export const DeltaTypeSchema = z.enum([
    'revenue_total',
    'revenue_period',
    'recognized_shift',
    'deferred_shift',
    'contract_impact',
    'obligation_impact',
]);
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
// Billing adjustment override
export const BillingAdjustmentOverrideSchema = BaseOverrideSchema.extend({
    overrideType: z.literal('billing_adjustment'),
    targetType: z.enum(['invoice', 'line_item']),
    adjustmentType: z.enum(['credit', 'discount', 'fee', 'correction']),
    adjustmentAmount: z.number(),
    adjustmentPct: z.number().optional(),
    reason: z.string().optional(),
});
// Timing shift override
export const TimingShiftOverrideSchema = BaseOverrideSchema.extend({
    overrideType: z.literal('timing_shift'),
    targetType: z.enum(['contract', 'obligation']),
    shiftType: z.enum(['start_date', 'end_date', 'recognition_start', 'recognition_end']),
    shiftDays: z.number().int().optional(),
    newDate: z.string().optional(),
});
// Discount change override
export const DiscountChangeOverrideSchema = BaseOverrideSchema.extend({
    overrideType: z.literal('discount_change'),
    targetType: z.enum(['contract', 'invoice', 'line_item']),
    discountPct: z.number().min(0).max(100).optional(),
    discountAmount: z.number().optional(),
});
// Price change override
export const PriceChangeOverrideSchema = BaseOverrideSchema.extend({
    overrideType: z.literal('price_change'),
    targetType: z.enum(['contract', 'line_item', 'obligation']),
    priceDelta: z.number().optional(),
    pricePct: z.number().optional(),
    newPrice: z.number().optional(),
});
// Union of all override types
export const SimulationOverridePayloadSchema = z.discriminatedUnion('overrideType', [
    ContractTermOverrideSchema,
    UsageAdjustmentOverrideSchema,
    BillingAdjustmentOverrideSchema,
    TimingShiftOverrideSchema,
    DiscountChangeOverrideSchema,
    PriceChangeOverrideSchema,
]);
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
export const SimulationWithOverridesSchema = SimulationSchema.extend({
    overrides: z.array(SimulationOverrideSchema),
});
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
// Create simulation request
export const CreateSimulationSchema = z.object({
    snapshotId: z.string(),
    name: z.string().min(1).max(255),
    description: z.string().max(2000).optional(),
    templateId: z.string().optional(),
});
// Update simulation request
export const UpdateSimulationSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(2000).optional(),
    status: z.enum(['draft', 'cancelled']).optional(), // Only draft/cancelled can be set directly
});
// Add override request
export const AddOverrideSchema = SimulationOverridePayloadSchema;
// Run simulation request
export const RunSimulationSchema = z.object({
    recomputeRevRec: z.boolean().default(true),
    includeIssueAnalysis: z.boolean().default(false),
});
// List runs query
export const SimulationRunListQuerySchema = z.object({
    status: SimulationRunStatusSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});
// Deltas query
export const SimulationDeltasQuerySchema = z.object({
    deltaType: DeltaTypeSchema.optional(),
    targetType: TargetTypeSchema.optional(),
    targetId: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(500).default(100),
});
// Template list query
export const TemplateListQuerySchema = z.object({
    isActive: z.coerce.boolean().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});
// Create template request
export const CreateTemplateSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(2000).optional(),
    overrides: z.array(SimulationOverridePayloadSchema),
    defaultOptions: z.record(z.unknown()).optional(),
});
// Apply template request
export const ApplyTemplateSchema = z.object({
    snapshotId: z.string(),
    name: z.string().min(1).max(255),
    description: z.string().max(2000).optional(),
});
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
export const SimulationReplayJobPayloadSchema = BaseJobPayload.extend({
    type: z.literal('simulation.replay'),
    simulationId: z.string(),
    originalRunId: z.string(),
    newRunId: z.string(),
    options: RunSimulationSchema.optional(),
});
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
export const SimulationWarningSchema = z.object({
    code: z.string(),
    message: z.string(),
    targetId: z.string().optional(),
    overrideId: z.string().optional(),
    severity: z.enum(['info', 'warning', 'error']),
});
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
//# sourceMappingURL=simulation.js.map