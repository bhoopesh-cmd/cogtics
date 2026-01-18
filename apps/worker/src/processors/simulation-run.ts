/**
 * Simulation Run Processor (Phase 9)
 * 
 * Executes a simulation run by loading snapshot data,
 * applying overrides, computing deltas, and persisting results.
 */
import type { Logger } from 'pino';
import type { Kysely, Database } from '@cogtics/db';
import type { SimulationRunJobPayload, JobResult } from '@cogtics/schemas';
import {
  generateSimulationResultId,
  generateSimulationDeltaId,
  generateSimulationAuditId,
} from '@cogtics/schemas';
import { simulation as simulationEngine } from '@cogtics/utils';
type SimulationContext = Parameters<typeof simulationEngine.runSimulation>[0];
type Override = Parameters<typeof simulationEngine.runSimulation>[1][number];

/**
 * Process a simulation.run job.
 */
export async function processSimulationRunJob(
  payload: SimulationRunJobPayload,
  logger: Logger,
  db: Kysely<Database>
): Promise<JobResult> {
  const { tenantId, simulationId, runId, options } = payload;
  const startTime = Date.now();

  logger.info({ simulationId, runId }, 'Starting simulation run');

  try {
    // Update run status to running
    await db
      .updateTable('simulation_runs')
      .set({
        status: 'running',
        started_at: new Date(),
      })
      .where('id', '=', runId)
      .where('tenant_id', '=', tenantId)
      .execute();

    // Load simulation with overrides
    const simulation = await db
      .selectFrom('simulations')
      .selectAll()
      .where('id', '=', simulationId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!simulation) {
      throw new Error(`Simulation not found: ${simulationId}`);
    }

    const overridesRaw = await db
      .selectFrom('simulation_overrides')
      .selectAll()
      .where('simulation_id', '=', simulationId)
      .where('tenant_id', '=', tenantId)
      .orderBy('sequence_number', 'asc')
      .execute();

    // Load snapshot context
    const baselineContext = await loadSnapshotContext(db, tenantId, simulation.snapshot_id);

    // Convert DB overrides to engine format
    const overrides: Override[] = overridesRaw.map((o) => ({
      id: o.id,
      overrideType: o.override_type,
      targetType: o.target_type,
      targetId: o.target_id,
      fieldPath: o.field_path,
      originalValue: o.original_value_json,
      overrideValue: o.override_value_json,
      sequenceNumber: o.sequence_number,
    }));

    // Run the simulation engine
    const result = simulationEngine.runSimulation(baselineContext, overrides, {
      recomputeRevRec: options?.recomputeRevRec ?? true,
      includeIssueAnalysis: options?.includeIssueAnalysis ?? false,
    });

    // Persist results
    const resultId = generateSimulationResultId();
    await db
      .insertInto('simulation_results')
      .values({
        id: resultId,
        tenant_id: tenantId,
        run_id: runId,
        simulation_id: simulationId,
        total_revenue_baseline: result.summary.totalRevenueDelta !== 0 
          ? calculateBaselineRevenue(baselineContext) 
          : null,
        total_revenue_simulated: result.summary.totalRevenueDelta !== 0 
          ? calculateBaselineRevenue(baselineContext) + result.summary.totalRevenueDelta 
          : null,
        total_revenue_delta: result.summary.totalRevenueDelta,
        total_revenue_delta_pct: calculateDeltaPct(baselineContext, result.summary.totalRevenueDelta),
        total_recognized_baseline: null, // Would need schedule data
        total_recognized_simulated: null,
        total_deferred_baseline: null,
        total_deferred_simulated: null,
        contracts_affected: result.summary.contractsAffected,
        obligations_affected: result.summary.obligationsAffected,
        overrides_applied: result.summary.overridesApplied,
        overrides_skipped: result.summary.overridesSkipped,
        summary_json: JSON.stringify({
          periodImpacts: result.summary.periodImpacts,
          warnings: result.warnings,
        }),
        warnings_json: JSON.stringify(result.warnings),
      })
      .execute();

    // Persist deltas
    if (result.deltas.length > 0) {
      const deltaInserts = result.deltas.map((delta) => ({
        id: generateSimulationDeltaId(),
        tenant_id: tenantId,
        run_id: runId,
        simulation_id: simulationId,
        delta_type: delta.deltaType,
        target_type: delta.targetType || null,
        target_id: delta.targetId || null,
        period_start: delta.periodStart || null,
        period_end: delta.periodEnd || null,
        baseline_amount: delta.baselineAmount,
        simulated_amount: delta.simulatedAmount,
        delta_amount: delta.deltaAmount,
        delta_pct: delta.deltaPct || null,
        currency: delta.currency,
        details_json: delta.details ? JSON.stringify(delta.details) : null,
      }));

      // Batch insert deltas
      for (let i = 0; i < deltaInserts.length; i += 100) {
        const batch = deltaInserts.slice(i, i + 100);
        await db.insertInto('simulation_deltas').values(batch).execute();
      }
    }

    const processingTimeMs = Date.now() - startTime;

    // Update run status to completed
    await db
      .updateTable('simulation_runs')
      .set({
        status: 'completed',
        finished_at: new Date(),
        processing_time_ms: processingTimeMs,
      })
      .where('id', '=', runId)
      .where('tenant_id', '=', tenantId)
      .execute();

    // Update simulation status
    await db
      .updateTable('simulations')
      .set({
        status: 'completed',
        updated_at: new Date(),
      })
      .where('id', '=', simulationId)
      .where('tenant_id', '=', tenantId)
      .execute();

    // Create audit record
    await db
      .insertInto('simulation_audit')
      .values({
        id: generateSimulationAuditId(),
        tenant_id: tenantId,
        simulation_id: simulationId,
        run_id: runId,
        action: 'run_completed',
        actor_user_id: null,
        details_json: JSON.stringify({
          processingTimeMs,
          contractsAffected: result.summary.contractsAffected,
          totalRevenueDelta: result.summary.totalRevenueDelta,
        }),
      })
      .execute();

    logger.info(
      {
        simulationId,
        runId,
        processingTimeMs,
        contractsAffected: result.summary.contractsAffected,
        totalRevenueDelta: result.summary.totalRevenueDelta,
      },
      'Simulation run completed'
    );

    return {
      success: true,
      message: 'Simulation run completed successfully',
      data: {
        runId,
        resultId,
        summary: {
          totalRevenueDelta: result.summary.totalRevenueDelta,
          contractsAffected: result.summary.contractsAffected,
          overridesApplied: result.summary.overridesApplied,
        },
      },
      processingTimeMs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const processingTimeMs = Date.now() - startTime;

    logger.error({ error, simulationId, runId }, 'Simulation run failed');

    // Update run status to failed
    await db
      .updateTable('simulation_runs')
      .set({
        status: 'failed',
        finished_at: new Date(),
        processing_time_ms: processingTimeMs,
        error_code: 'SIMULATION_ERROR',
        error_message: errorMessage,
      })
      .where('id', '=', runId)
      .where('tenant_id', '=', tenantId)
      .execute();

    // Update simulation status
    await db
      .updateTable('simulations')
      .set({
        status: 'failed',
        updated_at: new Date(),
      })
      .where('id', '=', simulationId)
      .where('tenant_id', '=', tenantId)
      .execute();

    // Create audit record
    await db
      .insertInto('simulation_audit')
      .values({
        id: generateSimulationAuditId(),
        tenant_id: tenantId,
        simulation_id: simulationId,
        run_id: runId,
        action: 'run_failed',
        actor_user_id: null,
        details_json: JSON.stringify({
          errorCode: 'SIMULATION_ERROR',
          errorMessage,
        }),
      })
      .execute();

    return {
      success: false,
      error: errorMessage,
      processingTimeMs,
    };
  }
}

/**
 * Load snapshot context for simulation.
 */
async function loadSnapshotContext(
  db: Kysely<Database>,
  tenantId: string,
  snapshotId: string
): Promise<SimulationContext> {
  // Load contracts
  const contracts = await db
    .selectFrom('contracts')
    .select([
      'id',
      'customer_id',
      'name',
      'start_date',
      'end_date',
      'arr',
      'currency',
      'billing_frequency',
      'status',
    ])
    .where('tenant_id', '=', tenantId)
    .where('snapshot_id', '=', snapshotId)
    .execute();

  // Load invoices
  const invoices = await db
    .selectFrom('invoices')
    .select([
      'id',
      'contract_id',
      'customer_id',
      'invoice_date',
      'total',
      'currency',
      'status',
    ])
    .where('tenant_id', '=', tenantId)
    .where('snapshot_id', '=', snapshotId)
    .execute();

  // Load revenue obligations
  const obligations = await db
    .selectFrom('revenue_obligations')
    .select([
      'id',
      'contract_id',
      'obligation_type',
      'transaction_price',
      'service_start_date',
      'service_end_date',
      'status',
    ])
    .where('tenant_id', '=', tenantId)
    .where('snapshot_id', '=', snapshotId)
    .execute();

  // Load revenue schedules
  const schedules = await db
    .selectFrom('revenue_schedules')
    .select([
      'id',
      'obligation_id',
      'period_start',
      'period_end',
      'scheduled_amount',
      'recognized_amount',
      'deferred_amount',
    ])
    .where('tenant_id', '=', tenantId)
    .where('snapshot_id', '=', snapshotId)
    .execute();

  return {
    snapshotId,
    tenantId,
    contracts: contracts.map((c) => ({
      id: c.id,
      customerId: c.customer_id,
      name: c.name,
      startDate: c.start_date ? new Date(c.start_date) : null,
      endDate: c.end_date ? new Date(c.end_date) : null,
      arr: c.arr ? Number(c.arr) : null,
      currency: c.currency,
      billingFrequency: c.billing_frequency,
      status: c.status,
    })),
    invoices: invoices.map((i) => ({
      id: i.id,
      contractId: i.contract_id,
      customerId: i.customer_id,
      invoiceDate: new Date(i.invoice_date),
      total: Number(i.total),
      currency: i.currency,
      status: i.status,
    })),
    obligations: obligations.map((o) => ({
      id: o.id,
      contractId: o.contract_id,
      obligationType: o.obligation_type,
      transactionPrice: Number(o.transaction_price),
      serviceStartDate: o.service_start_date ? new Date(o.service_start_date) : null,
      serviceEndDate: o.service_end_date ? new Date(o.service_end_date) : null,
      status: o.status,
    })),
    schedules: schedules.map((s) => ({
      id: s.id,
      obligationId: s.obligation_id,
      periodStart: new Date(s.period_start),
      periodEnd: new Date(s.period_end),
      scheduledAmount: Number(s.scheduled_amount),
      recognizedAmount: Number(s.recognized_amount),
      deferredAmount: Number(s.deferred_amount),
    })),
  };
}

function calculateBaselineRevenue(context: SimulationContext): number {
  return context.contracts.reduce((sum, c) => sum + (c.arr ?? 0), 0);
}

function calculateDeltaPct(context: SimulationContext, delta: number): number | null {
  const baseline = calculateBaselineRevenue(context);
  if (baseline === 0) return null;
  return (delta / baseline) * 100;
}
