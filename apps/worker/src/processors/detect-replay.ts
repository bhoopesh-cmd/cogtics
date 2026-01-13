/**
 * Detection Replay Processor
 * 
 * Re-runs detection with a specific ruleset version for audit/comparison.
 */
import type { Logger } from 'pino';
import type { Kysely } from 'kysely';
import type { Database } from '@cogtics/db';
import type { DetectReplayJobPayload } from '@cogtics/schemas';
import { generateDetectionRunId } from '@cogtics/schemas';
import { processDetectRunJob } from './detect-run.js';

interface JobResult {
  success: boolean;
  message: string;
  data?: unknown;
  processingTimeMs?: number;
}

/**
 * Process detection replay job.
 */
export async function processDetectReplayJob(
  payload: DetectReplayJobPayload,
  logger: Logger,
  db: Kysely<Database>
): Promise<JobResult> {
  const { tenantId, runId, rulesetVersion } = payload;
  const startTime = Date.now();

  logger.info({ originalRunId: runId, rulesetVersion }, 'Starting detection replay');

  try {
    // 1. Load original run details
    const originalRun = await db
      .selectFrom('detection_runs')
      .selectAll()
      .where('id', '=', runId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!originalRun) {
      return {
        success: false,
        message: `Detection run not found: ${runId}`,
        processingTimeMs: Date.now() - startTime,
      };
    }

    // 2. Create replay run using original snapshot but potentially new ruleset
    const replayPayload = {
      type: 'detect.run' as const,
      tenantId,
      snapshotId: originalRun.snapshot_id,
      rulesetVersion: rulesetVersion || originalRun.ruleset_version,
      config: originalRun.config_json as any,
      requestId: payload.requestId,
      idempotencyKey: payload.idempotencyKey,
    };

    // 3. Run detection with original snapshot
    const result = await processDetectRunJob(replayPayload, logger, db);

    if (result.success) {
      const replayRunId = (result.data as any)?.runId;

      // 4. Compare results (optional - for audit)
      if (replayRunId) {
        const comparison = await compareRuns(db, tenantId, runId, replayRunId);
        
        return {
          success: true,
          message: `Replay completed: ${(result.data as any)?.issuesTotal || 0} issues found`,
          data: {
            originalRunId: runId,
            replayRunId,
            originalIssueCount: originalRun.issues_total,
            replayIssueCount: (result.data as any)?.issuesTotal || 0,
            comparison,
          },
          processingTimeMs: Date.now() - startTime,
        };
      }
    }

    return result;

  } catch (error) {
    logger.error({ error, runId }, 'Detection replay failed');

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Compare two detection runs for differences.
 */
async function compareRuns(
  db: Kysely<Database>,
  tenantId: string,
  originalRunId: string,
  replayRunId: string
): Promise<{
  newIssues: number;
  resolvedIssues: number;
  unchangedIssues: number;
}> {
  // Get issue keys from original run
  const originalIssues = await db
    .selectFrom('issues')
    .select('issue_key')
    .where('tenant_id', '=', tenantId)
    .where('run_id', '=', originalRunId)
    .execute();

  // Get issue keys from replay run
  const replayIssues = await db
    .selectFrom('issues')
    .select('issue_key')
    .where('tenant_id', '=', tenantId)
    .where('run_id', '=', replayRunId)
    .execute();

  const originalKeys = new Set(originalIssues.map(i => i.issue_key));
  const replayKeys = new Set(replayIssues.map(i => i.issue_key));

  // Calculate differences
  let newIssues = 0;
  let resolvedIssues = 0;
  let unchangedIssues = 0;

  for (const key of replayKeys) {
    if (originalKeys.has(key)) {
      unchangedIssues++;
    } else {
      newIssues++;
    }
  }

  for (const key of originalKeys) {
    if (!replayKeys.has(key)) {
      resolvedIssues++;
    }
  }

  return { newIssues, resolvedIssues, unchangedIssues };
}
