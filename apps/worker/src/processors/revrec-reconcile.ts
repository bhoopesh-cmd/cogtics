/**
 * Revenue Recognition Reconcile Processor
 * 
 * Reconciles recognition schedules with invoices for a period.
 */
import type { Logger } from 'pino';
import type { Kysely } from 'kysely';
import type { Database } from '@cogtics/db';
import type { RevRecReconcileJobPayload } from '@cogtics/schemas';
import { createReconciliationId } from '@cogtics/schemas';
import * as revrec from '@cogtics/revrec';
import type { SchedulePeriod, InvoiceInput } from '@cogtics/revrec';

interface JobResult {
  success: boolean;
  message: string;
  data?: unknown;
  processingTimeMs?: number;
}

/**
 * Process revenue recognition reconcile job.
 */
export async function processRevRecReconcileJob(
  payload: RevRecReconcileJobPayload,
  logger: Logger,
  db: Kysely<Database>
): Promise<JobResult> {
  const { tenantId, snapshotId, periodStart, periodEnd } = payload;
  const startTime = Date.now();

  logger.info({ snapshotId, periodStart, periodEnd }, 'Starting rev-rec reconciliation');

  try {
    // 1. Get all contracts for this snapshot
    const contracts = await db
      .selectFrom('contracts')
      .select(['id', 'customer_id', 'name'])
      .where('tenant_id', '=', tenantId)
      .where('snapshot_id', '=', snapshotId)
      .execute();

    if (contracts.length === 0) {
      return {
        success: true,
        message: 'No contracts found for reconciliation',
        processingTimeMs: Date.now() - startTime,
      };
    }

    let processedCount = 0;
    let totalMatched = 0;
    let totalVariances = 0;

    // 2. Process each contract
    for (const contract of contracts) {
      try {
        // Load schedules for this contract in the period
        const schedules = await loadSchedulesForPeriod(
          db,
          tenantId,
          snapshotId,
          contract.id,
          periodStart,
          periodEnd
        );

        // Load invoices for this contract in the period
        const invoices = await loadInvoicesForPeriod(
          db,
          tenantId,
          snapshotId,
          contract.id,
          periodStart,
          periodEnd
        );

        // Skip if no schedules or invoices
        if (schedules.length === 0 && invoices.length === 0) {
          continue;
        }

        // Run reconciliation
        const result = revrec.reconcileSchedulesWithInvoices(
          schedules,
          invoices,
          contract.id
        );

        // Delete existing reconciliations for this contract/period
        await db.deleteFrom('revrec_reconciliations')
          .where('tenant_id', '=', tenantId)
          .where('snapshot_id', '=', snapshotId)
          .where('contract_id', '=', contract.id)
          .where('period_start', '>=', periodStart as any)
          .where('period_end', '<=', periodEnd as any)
          .execute();

        // Persist new reconciliations
        for (const rec of result.reconciliations) {
          await db.insertInto('revrec_reconciliations').values({
            id: createReconciliationId(),
            tenant_id: tenantId,
            snapshot_id: snapshotId,
            contract_id: contract.id,
            period_start: formatDate(rec.periodStart),
            period_end: formatDate(rec.periodEnd),
            status: rec.status,
            scheduled_amount: rec.scheduledAmount,
            invoiced_amount: rec.invoicedAmount,
            variance_amount: rec.varianceAmount,
            variance_pct: rec.variancePct,
            details_json: rec.details,
          }).execute();
        }

        processedCount++;
        totalMatched += result.summary.matched;
        totalVariances += (
          result.summary.timingVariance +
          result.summary.amountVariance +
          result.summary.missingInvoice +
          result.summary.unmatched
        );

        logger.debug({
          contractId: contract.id,
          reconciliationCount: result.reconciliations.length,
          matched: result.summary.matched,
        }, 'Processed contract reconciliation');

      } catch (contractError) {
        logger.error({ contractId: contract.id, error: contractError }, 'Error reconciling contract');
        // Continue with other contracts
      }
    }

    return {
      success: true,
      message: `Reconciled ${processedCount} contracts`,
      data: {
        processedCount,
        totalContracts: contracts.length,
        totalMatched,
        totalVariances,
      },
      processingTimeMs: Date.now() - startTime,
    };

  } catch (error) {
    logger.error({ error }, 'Rev-rec reconciliation failed');
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Load schedules for a contract in a specific period.
 */
async function loadSchedulesForPeriod(
  db: Kysely<Database>,
  tenantId: string,
  snapshotId: string,
  contractId: string,
  periodStart: string,
  periodEnd: string
): Promise<SchedulePeriod[]> {
  // Get obligations for this contract
  const obligations = await db
    .selectFrom('revenue_obligations')
    .select('id')
    .where('tenant_id', '=', tenantId)
    .where('snapshot_id', '=', snapshotId)
    .where('contract_id', '=', contractId)
    .execute();

  if (obligations.length === 0) {
    return [];
  }

  const obligationIds = obligations.map(o => o.id);

  // Get schedules for these obligations in the period
  const scheduleRows = await db
    .selectFrom('revenue_schedules')
    .selectAll()
    .where('obligation_id', 'in', obligationIds)
    .where('period_start', '>=', periodStart as any)
    .where('period_end', '<=', periodEnd as any)
    .execute();

  return scheduleRows.map(row => ({
    periodStart: new Date(row.period_start),
    periodEnd: new Date(row.period_end),
    scheduledAmount: Number(row.scheduled_amount),
    recognizedAmount: Number(row.recognized_amount),
    deferredAmount: Number(row.deferred_amount),
    periodDays: row.period_days ?? 0,
    dailyRate: row.daily_rate ?? 0,
    recognitionMethod: row.recognition_method as SchedulePeriod['recognitionMethod'],
    status: row.status as SchedulePeriod['status'],
  }));
}

/**
 * Load invoices for a contract in a specific period.
 */
async function loadInvoicesForPeriod(
  db: Kysely<Database>,
  tenantId: string,
  snapshotId: string,
  contractId: string,
  periodStart: string,
  periodEnd: string
): Promise<InvoiceInput[]> {
  const invoiceRows = await db
    .selectFrom('invoices')
    .select(['id', 'contract_id', 'invoice_date', 'total', 'period_start', 'period_end'])
    .where('tenant_id', '=', tenantId)
    .where('snapshot_id', '=', snapshotId)
    .where('contract_id', '=', contractId)
    .where('invoice_date', '>=', periodStart as any)
    .where('invoice_date', '<=', periodEnd as any)
    .execute();

  return invoiceRows.map(row => ({
    id: row.id,
    contractId: row.contract_id,
    invoiceDate: new Date(row.invoice_date as any),
    total: Number(row.total),
    periodStart: row.period_start ? new Date(row.period_start as any) : null,
    periodEnd: row.period_end ? new Date(row.period_end as any) : null,
  }));
}

/**
 * Format date for database storage.
 */
function formatDate(date: Date): any {
  return date.toISOString().split('T')[0];
}
