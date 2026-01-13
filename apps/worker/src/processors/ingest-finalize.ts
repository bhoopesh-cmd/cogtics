/**
 * Ingest Finalize Processor
 * 
 * Marks snapshot as complete and computes coverage metrics.
 * Runs data quality checks if enabled.
 */
import type { Logger } from 'pino';
import type { Kysely, Database } from '@cogtics/db';
import { sql } from '@cogtics/db';
import type { IngestFinalizeJobPayload, JobResult } from '@cogtics/schemas';
import { createSyncRunId } from '@cogtics/schemas';

interface QualityResult {
  checkName: string;
  status: 'passed' | 'warning' | 'failed';
  message?: string;
  affectedCount?: number;
}

/**
 * Process ingest.finalize job
 */
export async function processIngestFinalizeJob(
  payload: IngestFinalizeJobPayload,
  logger: Logger,
  db: Kysely<Database>
): Promise<JobResult> {
  const { tenantId, snapshotId, runQualityChecks } = payload;
  const startTime = Date.now();

  logger.info({ snapshotId, runQualityChecks }, 'Starting ingest finalize');

  // Create sync run record
  const syncRunId = createSyncRunId();
  await db
    .insertInto('sync_runs')
    .values({
      id: syncRunId,
      tenant_id: tenantId as string,
      snapshot_id: snapshotId,
      run_type: 'finalize',
      status: 'running',
      records_processed: 0,
      metadata_json: { runQualityChecks },
    })
    .execute();

  // Update snapshot status
  await db
    .updateTable('snapshots')
    .set({ status: 'validating' })
    .where('id', '=', snapshotId)
    .execute();

  try {
    // 1. Compute record counts
    const recordCounts = await computeRecordCounts(db, snapshotId);
    logger.info({ recordCounts }, 'Record counts computed');

    // 2. Run quality checks if enabled
    let qualityResults: QualityResult[] = [];
    if (runQualityChecks) {
      qualityResults = await runQualityCheckSuite(db, snapshotId, tenantId as string, logger);
      logger.info({ checkCount: qualityResults.length }, 'Quality checks completed');
    }

    // 3. Compute data freshness
    const dataFreshness = await computeDataFreshness(db, snapshotId);

    // 4. Determine final status
    const hasFailedChecks = qualityResults.some((r) => r.status === 'failed');
    const finalStatus = hasFailedChecks ? 'failed' : 'complete';

    // 5. Update snapshot
    await db
      .updateTable('snapshots')
      .set({
        status: finalStatus,
        completed_at: new Date(),
        record_counts: recordCounts,
        quality_results: qualityResults,
        metadata_json: {
          dataFreshness,
          totalRecords: Object.values(recordCounts).reduce((a, b) => a + (b as number), 0),
          qualityChecksPassed: qualityResults.filter((r) => r.status === 'passed').length,
          qualityChecksFailed: qualityResults.filter((r) => r.status === 'failed').length,
          qualityChecksWarning: qualityResults.filter((r) => r.status === 'warning').length,
        },
      })
      .where('id', '=', snapshotId)
      .execute();

    // 6. Update sync run
    await db
      .updateTable('sync_runs')
      .set({
        status: 'completed',
        finished_at: new Date(),
        records_processed: Object.values(recordCounts).reduce((a, b) => a + (b as number), 0),
        metadata_json: { recordCounts, qualityResults },
      })
      .where('id', '=', syncRunId)
      .execute();

    logger.info({ finalStatus, recordCounts }, 'Ingest finalize completed');

    return {
      success: true,
      message: `Snapshot ${finalStatus}`,
      data: {
        snapshotId,
        status: finalStatus,
        recordCounts,
        qualityResults,
        dataFreshness,
      },
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    logger.error({ error }, 'Ingest finalize failed');

    // Update snapshot to failed
    await db
      .updateTable('snapshots')
      .set({
        status: 'failed',
        completed_at: new Date(),
        metadata_json: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      })
      .where('id', '=', snapshotId)
      .execute();

    await db
      .updateTable('sync_runs')
      .set({
        status: 'failed',
        finished_at: new Date(),
        error_code: 'FINALIZE_FAILED',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .where('id', '=', syncRunId)
      .execute();

    throw error;
  }
}

/**
 * Compute record counts per entity type
 */
async function computeRecordCounts(
  db: Kysely<Database>,
  snapshotId: string
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  // Customers
  const customerCount = await db
    .selectFrom('customers')
    .select(sql<number>`count(*)`.as('count'))
    .where('snapshot_id', '=', snapshotId)
    .executeTakeFirst();
  counts.customers = Number(customerCount?.count ?? 0);

  // Contracts
  const contractCount = await db
    .selectFrom('contracts')
    .select(sql<number>`count(*)`.as('count'))
    .where('snapshot_id', '=', snapshotId)
    .executeTakeFirst();
  counts.contracts = Number(contractCount?.count ?? 0);

  // Invoices
  const invoiceCount = await db
    .selectFrom('invoices')
    .select(sql<number>`count(*)`.as('count'))
    .where('snapshot_id', '=', snapshotId)
    .executeTakeFirst();
  counts.invoices = Number(invoiceCount?.count ?? 0);

  // Invoice lines
  const lineCount = await db
    .selectFrom('invoice_lines')
    .select(sql<number>`count(*)`.as('count'))
    .where('snapshot_id', '=', snapshotId)
    .executeTakeFirst();
  counts.invoiceLines = Number(lineCount?.count ?? 0);

  // Payments
  const paymentCount = await db
    .selectFrom('payments')
    .select(sql<number>`count(*)`.as('count'))
    .where('snapshot_id', '=', snapshotId)
    .executeTakeFirst();
  counts.payments = Number(paymentCount?.count ?? 0);

  // Products
  const productCount = await db
    .selectFrom('products')
    .select(sql<number>`count(*)`.as('count'))
    .where('snapshot_id', '=', snapshotId)
    .executeTakeFirst();
  counts.products = Number(productCount?.count ?? 0);

  // Price plans
  const priceCount = await db
    .selectFrom('price_plans')
    .select(sql<number>`count(*)`.as('count'))
    .where('snapshot_id', '=', snapshotId)
    .executeTakeFirst();
  counts.pricePlans = Number(priceCount?.count ?? 0);

  // Usage events
  const usageCount = await db
    .selectFrom('usage_events')
    .select(sql<number>`count(*)`.as('count'))
    .where('snapshot_id', '=', snapshotId)
    .executeTakeFirst();
  counts.usageEvents = Number(usageCount?.count ?? 0);

  return counts;
}

/**
 * Compute data freshness (most recent updated_at across sources)
 */
async function computeDataFreshness(
  db: Kysely<Database>,
  snapshotId: string
): Promise<string | null> {
  // Get snapshot's source run
  const snapshot = await db
    .selectFrom('snapshots')
    .select('source_run_id')
    .where('id', '=', snapshotId)
    .executeTakeFirst();

  if (!snapshot?.source_run_id) {
    return null;
  }

  // Get max updated_at from raw batches
  const freshness = await db
    .selectFrom('raw_batches')
    .select(sql<Date>`max(max_updated_at)`.as('freshness'))
    .where('run_id', '=', snapshot.source_run_id)
    .executeTakeFirst();

  return freshness?.freshness?.toISOString() ?? null;
}

/**
 * Run data quality check suite
 */
async function runQualityCheckSuite(
  db: Kysely<Database>,
  snapshotId: string,
  tenantId: string,
  logger: Logger
): Promise<QualityResult[]> {
  const results: QualityResult[] = [];

  // Check 1: Customers without names
  try {
    const customersWithoutName = await db
      .selectFrom('customers')
      .select(sql<number>`count(*)`.as('count'))
      .where('snapshot_id', '=', snapshotId)
      .where('name', '=', '')
      .executeTakeFirst();

    const count = Number(customersWithoutName?.count ?? 0);
    results.push({
      checkName: 'customers_missing_name',
      status: count === 0 ? 'passed' : 'warning',
      message: count > 0 ? `${count} customers have empty names` : undefined,
      affectedCount: count,
    });
  } catch (error) {
    logger.warn({ error }, 'Quality check failed: customers_missing_name');
  }

  // Check 2: Invoices with negative totals
  try {
    const negativeInvoices = await db
      .selectFrom('invoices')
      .select(sql<number>`count(*)`.as('count'))
      .where('snapshot_id', '=', snapshotId)
      .where('total', '<', 0)
      .executeTakeFirst();

    const count = Number(negativeInvoices?.count ?? 0);
    results.push({
      checkName: 'invoices_negative_total',
      status: count === 0 ? 'passed' : 'warning',
      message: count > 0 ? `${count} invoices have negative totals` : undefined,
      affectedCount: count,
    });
  } catch (error) {
    logger.warn({ error }, 'Quality check failed: invoices_negative_total');
  }

  // Check 3: Duplicate invoice numbers
  try {
    const duplicateInvoices = await db
      .selectFrom('invoices')
      .select(['invoice_number', sql<number>`count(*)`.as('count')])
      .where('snapshot_id', '=', snapshotId)
      .where('invoice_number', 'is not', null)
      .groupBy('invoice_number')
      .having(sql`count(*)`, '>', 1)
      .execute();

    const count = duplicateInvoices.length;
    results.push({
      checkName: 'invoices_duplicate_numbers',
      status: count === 0 ? 'passed' : 'warning',
      message: count > 0 ? `${count} invoice numbers appear more than once` : undefined,
      affectedCount: count,
    });
  } catch (error) {
    logger.warn({ error }, 'Quality check failed: invoices_duplicate_numbers');
  }

  // Check 4: Contracts without customers
  try {
    const orphanContracts = await db
      .selectFrom('contracts')
      .select(sql<number>`count(*)`.as('count'))
      .where('snapshot_id', '=', snapshotId)
      .where('customer_id', 'is', null)
      .executeTakeFirst();

    const count = Number(orphanContracts?.count ?? 0);
    results.push({
      checkName: 'contracts_missing_customer',
      status: count === 0 ? 'passed' : 'warning',
      message: count > 0 ? `${count} contracts have no linked customer` : undefined,
      affectedCount: count,
    });
  } catch (error) {
    logger.warn({ error }, 'Quality check failed: contracts_missing_customer');
  }

  // Check 5: Payments without invoices
  try {
    const orphanPayments = await db
      .selectFrom('payments')
      .select(sql<number>`count(*)`.as('count'))
      .where('snapshot_id', '=', snapshotId)
      .where('invoice_id', 'is', null)
      .executeTakeFirst();

    const count = Number(orphanPayments?.count ?? 0);
    results.push({
      checkName: 'payments_missing_invoice',
      status: count === 0 ? 'passed' : 'warning',
      message: count > 0 ? `${count} payments have no linked invoice` : undefined,
      affectedCount: count,
    });
  } catch (error) {
    logger.warn({ error }, 'Quality check failed: payments_missing_invoice');
  }

  // Check 6: Staging records that failed normalization
  try {
    const failedStaging = await db
      .selectFrom('staging_records')
      .select(sql<number>`count(*)`.as('count'))
      .where('snapshot_id', '=', snapshotId)
      .where('status', '=', 'failed')
      .executeTakeFirst();

    const count = Number(failedStaging?.count ?? 0);
    results.push({
      checkName: 'staging_normalization_failures',
      status: count === 0 ? 'passed' : count > 100 ? 'failed' : 'warning',
      message: count > 0 ? `${count} staging records failed normalization` : undefined,
      affectedCount: count,
    });
  } catch (error) {
    logger.warn({ error }, 'Quality check failed: staging_normalization_failures');
  }

  return results;
}

