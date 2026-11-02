/**
 * Scheduler for automated exports and digests (Phase 10)
 * 
 * This module handles:
 * - Export schedules (daily, weekly, monthly)
 * - Digest subscriptions (daily, weekly, monthly)
 * 
 * Runs every minute to check for due schedules.
 */
import type { Logger } from 'pino';
import type { Kysely, Database } from '@cogtics/db';
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import {
  createExportId,
  createExportRunId,
  createDigestRunId,
  createJobId,
} from '@cogtics/schemas';

interface SchedulerConfig {
  logger: Logger;
  db: Kysely<Database>;
  redis: Redis;
  enabled?: boolean;
  intervalMs?: number; // Default: 60000 (1 minute)
}

export class Scheduler {
  private logger: Logger;
  private db: Kysely<Database>;
  private redis: Redis;
  private enabled: boolean;
  private intervalMs: number;
  private intervalId: NodeJS.Timeout | null = null;
  
  // Queue instances
  private exportCsvQueue: Queue;
  private exportPdfQueue: Queue;
  private digestQueue: Queue;

  constructor(config: SchedulerConfig) {
    this.logger = config.logger.child({ component: 'scheduler' });
    this.db = config.db;
    this.redis = config.redis;
    this.enabled = config.enabled ?? true;
    this.intervalMs = config.intervalMs ?? 60000; // 1 minute default
    
    // Initialize queues
    this.exportCsvQueue = new Queue('export.csv.generate', { connection: this.redis as any });
    this.exportPdfQueue = new Queue('export.pdf.render', { connection: this.redis as any });
    this.digestQueue = new Queue('digest.send', { connection: this.redis as any });
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (!this.enabled) {
      this.logger.info('Scheduler is disabled');
      return;
    }

    this.logger.info({ intervalMs: this.intervalMs }, 'Starting scheduler');
    
    // Run immediately on start
    this.tick().catch((err) => {
      this.logger.error({ err }, 'Scheduler tick failed');
    });
    
    // Then run on interval
    this.intervalId = setInterval(() => {
      this.tick().catch((err) => {
        this.logger.error({ err }, 'Scheduler tick failed');
      });
    }, this.intervalMs);
  }

  /**
   * Stop the scheduler
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping scheduler');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // Close queues
    await Promise.all([
      this.exportCsvQueue.close(),
      this.exportPdfQueue.close(),
      this.digestQueue.close(),
    ]);
  }

  /**
   * Execute one scheduler tick
   */
  private async tick(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Check export schedules
      const exportSchedules = await this.checkExportSchedules();
      
      // Check digest subscriptions
      const digestSchedules = await this.checkDigestSubscriptions();
      
      // Cleanup stale pending uploads (every tick)
      const cleanedUploads = await this.cleanupStaleUploads();
      
      // Cleanup orphaned review queue items (every tick)
      const cleanedReviewItems = await this.cleanupOrphanedReviewItems();
      
      const duration = Date.now() - startTime;
      this.logger.debug(
        { exportSchedules, digestSchedules, cleanedUploads, cleanedReviewItems, durationMs: duration },
        'Scheduler tick completed'
      );
    } catch (err) {
      this.logger.error({ err }, 'Scheduler tick error');
    }
  }

  /**
   * Clean up stale pending uploads that were never completed
   * Uploads stuck in 'pending' or 'uploading' for more than 1 hour are considered stale
   */
  private async cleanupStaleUploads(): Promise<number> {
    const staleThreshold = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    
    try {
      // Find stale uploads
      const staleUploads = await this.db
        .selectFrom('uploads')
        .select(['id', 'tenant_id', 'display_name', 'created_at'])
        .where('status', 'in', ['pending', 'uploading'])
        .where('created_at', '<', staleThreshold)
        .limit(100) // Process in batches
        .execute();
      
      if (staleUploads.length === 0) {
        return 0;
      }

      this.logger.info(
        { count: staleUploads.length },
        'Cleaning up stale pending uploads'
      );

      // Delete stale uploads (cascades to upload_files, etc.)
      const staleIds = staleUploads.map(u => u.id);
      await this.db
        .deleteFrom('uploads')
        .where('id', 'in', staleIds)
        .execute();

      this.logger.info(
        { deletedIds: staleIds },
        'Deleted stale uploads'
      );

      return staleUploads.length;
    } catch (err) {
      this.logger.error({ err }, 'Failed to cleanup stale uploads');
      return 0;
    }
  }

  /**
   * Clean up orphaned review queue items
   * - Items referencing deleted contracts/terms
   * - Items stuck in 'in_review' for more than 24 hours
   */
  private async cleanupOrphanedReviewItems(): Promise<number> {
    const staleReviewThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    try {
      let cleaned = 0;
      
      // Find review items stuck in 'in_review' for too long - reset to pending
      const stuckItems = await this.db
        .selectFrom('review_queue' as any)
        .select(['id', 'tenant_id'])
        .where('status', '=', 'in_review' as any)
        .where('created_at', '<', staleReviewThreshold)
        .limit(100)
        .execute() as Array<{ id: string; tenant_id: string }>;
      
      if (stuckItems.length > 0) {
        this.logger.info(
          { count: stuckItems.length },
          'Resetting stuck review items to pending'
        );
        
        const stuckIds = stuckItems.map(i => i.id);
        await this.db
          .updateTable('review_queue' as any)
          .set({
            status: 'pending',
            assigned_to: null,
          })
          .where('id', 'in', stuckIds)
          .execute();
        
        cleaned += stuckItems.length;
      }
      
      // Find orphaned review items where the referenced term was deleted
      // This uses a LEFT JOIN to find items with no matching term
      const orphanedByTerm = await (this.db as any)
        .selectFrom('review_queue as rq')
        .leftJoin('contract_terms as ct', 'rq.term_id', 'ct.id')
        .select(['rq.id'])
        .where('rq.term_id', 'is not', null)
        .where('ct.id', 'is', null)
        .limit(100)
        .execute() as Array<{ id: string }>;
      
      if (orphanedByTerm.length > 0) {
        this.logger.info(
          { count: orphanedByTerm.length },
          'Removing orphaned review items (term deleted)'
        );
        
        const orphanedIds = orphanedByTerm.map(i => i.id);
        await this.db
          .deleteFrom('review_queue' as any)
          .where('id', 'in', orphanedIds)
          .execute();
        
        cleaned += orphanedByTerm.length;
      }
      
      // Find orphaned conflicts where referenced bundle was deleted
      const orphanedConflicts = await (this.db as any)
        .selectFrom('term_conflicts as tc')
        .leftJoin('contract_bundles as cb', 'tc.bundle_id', 'cb.id')
        .select(['tc.id'])
        .where('tc.bundle_id', 'is not', null)
        .where('cb.id', 'is', null)
        .limit(100)
        .execute() as Array<{ id: string }>;
      
      if (orphanedConflicts.length > 0) {
        this.logger.info(
          { count: orphanedConflicts.length },
          'Removing orphaned term conflicts (bundle deleted)'
        );
        
        const conflictIds = orphanedConflicts.map(c => c.id);
        
        // First delete candidates
        await this.db
          .deleteFrom('term_conflict_candidates' as any)
          .where('conflict_id' as any, 'in', conflictIds)
          .execute();
        
        // Then delete conflicts
        await this.db
          .deleteFrom('term_conflicts' as any)
          .where('id', 'in', conflictIds)
          .execute();
        
        cleaned += orphanedConflicts.length;
      }
      
      return cleaned;
    } catch (err) {
      this.logger.error({ err }, 'Failed to cleanup orphaned review items');
      return 0;
    }
  }

  /**
   * Check for due export schedules
   */
  private async checkExportSchedules(): Promise<number> {
    const now = new Date();
    let scheduled = 0;
    
    // Get active export schedules
    const schedules = await this.db
      .selectFrom('export_schedules')
      .selectAll()
      .where('is_active', '=', true)
      .execute();
    
    for (const schedule of schedules) {
      try {
        // Check if schedule is due
        const lastRun = await this.db
          .selectFrom('export_runs')
          .select(['finished_at'])
          .where('schedule_id', '=', schedule.id)
          .where('status', '=', 'completed')
          .orderBy('finished_at', 'desc')
          .limit(1)
          .executeTakeFirst();
        
        if (this.isDue(schedule.cadence, lastRun?.finished_at)) {
          await this.scheduleExport(schedule);
          scheduled++;
        }
      } catch (err) {
        this.logger.error(
          { err, scheduleId: schedule.id, scheduleName: schedule.name },
          'Failed to schedule export'
        );
      }
    }
    
    return scheduled;
  }

  /**
   * Check for due digest subscriptions
   */
  private async checkDigestSubscriptions(): Promise<number> {
    const now = new Date();
    let scheduled = 0;
    
    // Get active digest subscriptions
    const subscriptions = await this.db
      .selectFrom('digest_subscriptions')
      .selectAll()
      .where('is_active', '=', true)
      .execute();
    
    for (const subscription of subscriptions) {
      try {
        // Check if digest is due
        const lastRun = await this.db
          .selectFrom('digest_runs')
          .select(['finished_at'])
          .where('subscription_id', '=', subscription.id)
          .where('tenant_id', '=', subscription.tenant_id)
          .where('status', '=', 'completed')
          .orderBy('finished_at', 'desc')
          .limit(1)
          .executeTakeFirst();
        
        if (this.isDue(subscription.cadence, lastRun?.finished_at)) {
          await this.scheduleDigest(subscription);
          scheduled++;
        }
      } catch (err) {
        this.logger.error(
          { err, subscriptionId: subscription.id, subscriptionName: subscription.name },
          'Failed to schedule digest'
        );
      }
    }
    
    return scheduled;
  }

  /**
   * Determine if a schedule is due based on cadence and last run
   */
  private isDue(cadence: string, lastRun?: Date | null): boolean {
    if (!lastRun) {
      // Never run before, so it's due
      return true;
    }
    
    const now = new Date();
    const hoursSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);
    
    switch (cadence) {
      case 'daily':
        return hoursSinceLastRun >= 24;
      case 'weekly':
        return hoursSinceLastRun >= 24 * 7;
      case 'monthly':
        return hoursSinceLastRun >= 24 * 30;
      default:
        return false;
    }
  }

  /**
   * Schedule an export job
   */
  private async scheduleExport(schedule: any): Promise<void> {
    const { id: scheduleId, tenant_id, snapshot_id, export_type } = schedule;
    
    // Get latest snapshot if not specified
    let targetSnapshotId = snapshot_id;
    if (!targetSnapshotId) {
      const latestSnapshot = await this.db
        .selectFrom('snapshots')
        .select(['id'])
        .where('tenant_id', '=', tenant_id)
        .where('status', '=', 'complete')
        .orderBy('completed_at', 'desc')
        .limit(1)
        .executeTakeFirst();
      
      if (!latestSnapshot) {
        this.logger.warn(
          { scheduleId, tenantId: tenant_id },
          'No snapshot available for scheduled export'
        );
        return;
      }
      
      targetSnapshotId = latestSnapshot.id;
    }
    
    // Determine format and template
    const format = export_type.endsWith('_csv') ? 'csv' : 'pdf';
    const templateName = this.getTemplateName(export_type);
    
    // Create export record
    const exportId = createExportId();
    await this.db
      .insertInto('exports')
      .values({
        id: exportId,
        tenant_id,
        snapshot_id: targetSnapshotId,
        export_type,
        format,
        status: 'pending',
        requested_by: null, // Scheduled, not user-requested
        options_json: schedule.scope_json ?? {},
        created_at: new Date(),
      })
      .execute();
    
    // Create export run record
    const runId = createExportRunId();
    await this.db
      .insertInto('export_runs')
      .values({
        id: runId,
        tenant_id,
        schedule_id: scheduleId,
        export_id: exportId,
        status: 'pending',
        created_at: new Date(),
      })
      .execute();
    
    // Create job record
    const jobId = createJobId();
    const jobType = format === 'csv' ? 'export.csv.generate' : 'export.pdf.render';
    
    await this.db
      .insertInto('jobs')
      .values({
        id: jobId,
        tenant_id,
        type: 'export',
        status: 'pending',
        payload_json: {
          type: jobType,
          tenantId: tenant_id,
          exportId,
          snapshotId: targetSnapshotId,
          exportType: export_type,
          templateName,
          options: schedule.scope_json,
        },
        created_at: new Date(),
        updated_at: new Date(),
      })
      .execute();
    
    // Enqueue job
    const queue = format === 'csv' ? this.exportCsvQueue : this.exportPdfQueue;
    await queue.add(jobType, {
      jobId,
      tenantId: tenant_id,
      payload: {
        type: jobType,
        tenantId: tenant_id,
        exportId,
        snapshotId: targetSnapshotId,
        exportType: export_type,
        templateName,
        options: schedule.scope_json,
      },
    });
    
    this.logger.info(
      { scheduleId, exportId, jobId, exportType: export_type },
      'Scheduled export enqueued'
    );
  }

  /**
   * Schedule a digest job
   */
  private async scheduleDigest(subscription: any): Promise<void> {
    const { id: subscriptionId, tenant_id } = subscription;
    
    // Create digest run record
    const runId = createDigestRunId();
    await this.db
      .insertInto('digest_runs')
      .values({
        id: runId,
        tenant_id,
        subscription_id: subscriptionId,
        status: 'pending',
        items_count: 0,
        recipients_count: 0,
        emails_sent: 0,
        emails_failed: 0,
        created_at: new Date(),
      })
      .execute();
    
    // Create job record
    const jobId = createJobId();
    await this.db
      .insertInto('jobs')
      .values({
        id: jobId,
        tenant_id,
        type: 'digest' as any,
        status: 'pending',
        payload_json: {
          type: 'digest.send',
          tenantId: tenant_id,
          subscriptionId,
          runId,
        },
        created_at: new Date(),
        updated_at: new Date(),
      })
      .execute();
    
    // Enqueue job
    await this.digestQueue.add('digest.send', {
      jobId,
      tenantId: tenant_id,
      payload: {
        type: 'digest.send',
        tenantId: tenant_id,
        subscriptionId,
        runId,
      },
    });
    
    this.logger.info(
      { subscriptionId, runId, jobId },
      'Scheduled digest enqueued'
    );
  }

  /**
   * Get template name for export type
   */
  private getTemplateName(exportType: string): string {
    switch (exportType) {
      case 'contracts_pdf':
        return 'contracts-report';
      case 'audit_bundle_pdf':
        return 'audit-bundle';
      case 'executive_summary_pdf':
        return 'executive-summary';
      default:
        return exportType;
    }
  }
}
