/**
 * Dead Letter Queue Handler (Phase 11)
 * 
 * Moves failed jobs to the dead_letter_jobs table after max retries are exhausted.
 * Records error details and attempt history for debugging and reprocessing.
 */
import type { Job } from 'bullmq';
import type { Kysely } from 'kysely';
import type { Database } from '@cogtics/db';
import type { Logger } from '@cogtics/utils';
import { recordDlqEntry } from '@cogtics/utils';

// Generate a unique DLQ entry ID
function generateDlqId(): string {
  return `dlq_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Move a failed job to the Dead Letter Queue
 */
export async function moveToDeadLetterQueue(
  job: Job,
  error: Error,
  db: Kysely<Database>,
  logger: Logger
): Promise<void> {
  const tenantId = job.data.tenantId;
  const queueName = job.queueName;
  const jobType = job.data.payload?.type || 'unknown';
  
  if (!tenantId) {
    logger.error({ jobId: job.id, queueName }, 'Cannot move job to DLQ: missing tenantId');
    return;
  }

  try {
    // Check if this job already exists in DLQ (avoid duplicates)
    const existing = await db
      .selectFrom('dead_letter_jobs')
      .select('id')
      .where('original_job_id', '=', job.id || '')
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (existing) {
      // Update existing DLQ entry
      await db
        .updateTable('dead_letter_jobs')
        .set({
          attempt_count: job.attemptsMade,
          last_failed_at: new Date(),
          error_message: error.message,
          error_stack: error.stack || null,
        })
        .where('id', '=', existing.id)
        .execute();

      logger.info({ dlqId: existing.id, jobId: job.id }, 'Updated existing DLQ entry');
    } else {
      // Create new DLQ entry
      const dlqId = generateDlqId();
      const now = new Date();

      await db
        .insertInto('dead_letter_jobs')
        .values({
          id: dlqId,
          tenant_id: tenantId,
          original_job_id: job.id || '',
          queue_name: queueName,
          job_type: jobType,
          payload_json: job.data.payload || {},
          error_message: error.message,
          error_stack: error.stack || null,
          attempt_count: job.attemptsMade,
          max_attempts: job.opts.attempts || 3,
          first_failed_at: now,
          last_failed_at: now,
          status: 'failed',
        })
        .execute();

      // Record metrics
      recordDlqEntry(queueName, jobType);

      logger.info({
        dlqId,
        jobId: job.id,
        queueName,
        jobType,
        attemptsMade: job.attemptsMade,
      }, 'Job moved to Dead Letter Queue');
    }
  } catch (dlqError) {
    // Don't throw - DLQ failures shouldn't break the worker
    logger.error({ err: dlqError, jobId: job.id }, 'Failed to move job to DLQ');
  }
}

/**
 * Check if a job should be moved to DLQ based on retry policy
 */
export function shouldMoveToDeadLetterQueue(job: Job, maxAttempts: number): boolean {
  return job.attemptsMade >= maxAttempts;
}

/**
 * Requeue a job from the Dead Letter Queue
 */
export async function requeueFromDeadLetterQueue(
  dlqId: string,
  db: Kysely<Database>,
  userId: string,
  logger: Logger
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    // Get the DLQ entry
    const dlqEntry = await db
      .selectFrom('dead_letter_jobs')
      .selectAll()
      .where('id', '=', dlqId)
      .where('status', '=', 'failed')
      .executeTakeFirst();

    if (!dlqEntry) {
      return { success: false, error: 'DLQ entry not found or already processed' };
    }

    // Create a new job in the jobs table
    const newJobId = `job_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`;
    
    await db
      .insertInto('jobs')
      .values({
        id: newJobId,
        tenant_id: dlqEntry.tenant_id,
        type: dlqEntry.job_type as any,
        status: 'pending',
        payload_json: dlqEntry.payload_json,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .execute();

    // Mark DLQ entry as requeued
    await db
      .updateTable('dead_letter_jobs')
      .set({
        status: 'requeued',
        requeued_at: new Date(),
        requeued_by: userId,
      })
      .where('id', '=', dlqId)
      .execute();

    logger.info({ dlqId, newJobId, userId }, 'Job requeued from DLQ');
    
    return { success: true, jobId: newJobId };
  } catch (err) {
    logger.error({ err, dlqId }, 'Failed to requeue job from DLQ');
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Discard a DLQ entry (mark it as discarded and won't be processed)
 */
export async function discardFromDeadLetterQueue(
  dlqId: string,
  db: Kysely<Database>,
  userId: string,
  logger: Logger
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await db
      .updateTable('dead_letter_jobs')
      .set({
        status: 'discarded',
        discarded_at: new Date(),
        discarded_by: userId,
      })
      .where('id', '=', dlqId)
      .where('status', '=', 'failed')
      .executeTakeFirst();

    if (!result.numUpdatedRows || result.numUpdatedRows === 0n) {
      return { success: false, error: 'DLQ entry not found or already processed' };
    }

    logger.info({ dlqId, userId }, 'DLQ entry discarded');
    return { success: true };
  } catch (err) {
    logger.error({ err, dlqId }, 'Failed to discard DLQ entry');
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Bulk requeue jobs from DLQ based on filters
 */
export async function bulkRequeueFromDeadLetterQueue(
  filters: {
    queueName?: string;
    jobType?: string;
    olderThan?: Date;
    newerThan?: Date;
    limit?: number;
  },
  db: Kysely<Database>,
  tenantId: string,
  userId: string,
  logger: Logger
): Promise<{ success: boolean; requeuedCount: number; errors: string[] }> {
  const errors: string[] = [];
  let requeuedCount = 0;

  try {
    let query = db
      .selectFrom('dead_letter_jobs')
      .select(['id'])
      .where('tenant_id', '=', tenantId)
      .where('status', '=', 'failed');

    if (filters.queueName) {
      query = query.where('queue_name', '=', filters.queueName);
    }
    if (filters.jobType) {
      query = query.where('job_type', '=', filters.jobType);
    }
    if (filters.olderThan) {
      query = query.where('last_failed_at', '<', filters.olderThan);
    }
    if (filters.newerThan) {
      query = query.where('last_failed_at', '>', filters.newerThan);
    }

    query = query.limit(filters.limit || 100);

    const dlqEntries = await query.execute();

    for (const entry of dlqEntries) {
      const result = await requeueFromDeadLetterQueue(entry.id, db, userId, logger);
      if (result.success) {
        requeuedCount++;
      } else if (result.error) {
        errors.push(`${entry.id}: ${result.error}`);
      }
    }

    logger.info({ tenantId, filters, requeuedCount, errorCount: errors.length }, 'Bulk requeue completed');
    return { success: true, requeuedCount, errors };
  } catch (err) {
    logger.error({ err, tenantId, filters }, 'Bulk requeue failed');
    return { success: false, requeuedCount, errors: [err instanceof Error ? err.message : 'Unknown error'] };
  }
}
