/**
 * Simulation Replay Processor (Phase 9)
 * 
 * Re-runs a simulation with a new ruleset/engine version.
 * Uses the same overrides from the original run.
 */
import type { Logger } from 'pino';
import type { Kysely, Database } from '@cogtics/db';
import type { SimulationReplayJobPayload, JobResult } from '@cogtics/schemas';
import { generateSimulationAuditId } from '@cogtics/schemas';
import { processSimulationRunJob } from './simulation-run.js';

/**
 * Process a simulation.replay job.
 * This is essentially a re-run of an existing simulation.
 */
export async function processSimulationReplayJob(
  payload: SimulationReplayJobPayload,
  logger: Logger,
  db: Kysely<Database>
): Promise<JobResult> {
  const { tenantId, simulationId, originalRunId, newRunId, options } = payload;

  logger.info(
    { simulationId, originalRunId, newRunId },
    'Starting simulation replay'
  );

  try {
    // Verify original run exists
    const originalRun = await db
      .selectFrom('simulation_runs')
      .selectAll()
      .where('id', '=', originalRunId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!originalRun) {
      throw new Error(`Original run not found: ${originalRunId}`);
    }

    // Create audit record for replay start
    await db
      .insertInto('simulation_audit')
      .values({
        id: generateSimulationAuditId(),
        tenant_id: tenantId,
        simulation_id: simulationId,
        run_id: newRunId,
        action: 'run_started',
        actor_user_id: null,
        details_json: JSON.stringify({
          isReplay: true,
          originalRunId,
        }),
      })
      .execute();

    // Delegate to the standard run processor
    const result = await processSimulationRunJob(
      {
        type: 'simulation.run',
        tenantId,
        simulationId,
        runId: newRunId,
        options,
      },
      logger,
      db
    );

    // Add replay-specific metadata to result
    if (result.success && result.data) {
      result.data.isReplay = true;
      result.data.originalRunId = originalRunId;
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error(
      { error, simulationId, originalRunId, newRunId },
      'Simulation replay failed'
    );

    return {
      success: false,
      error: errorMessage,
    };
  }
}
