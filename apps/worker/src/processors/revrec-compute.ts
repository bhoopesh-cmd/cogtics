/**
 * Revenue Recognition Compute Processor
 * 
 * Computes revenue obligations, allocations, schedules, events, and deferred balances.
 */
import type { Logger } from 'pino';
import type { Kysely } from 'kysely';
import type { Database } from '@cogtics/db';
import type { RevRecComputeJobPayload } from '@cogtics/schemas';
import {
  createObligationId,
  createAllocationId,
  createScheduleId,
  createRecognitionEventId,
  createDeferredBalanceId,
} from '@cogtics/schemas';
import * as revrec from '@cogtics/revrec';
import type { ContractInput } from '@cogtics/revrec';

interface JobResult {
  success: boolean;
  message: string;
  data?: unknown;
  processingTimeMs?: number;
}

/**
 * Process revenue recognition compute job.
 */
export async function processRevRecComputeJob(
  payload: RevRecComputeJobPayload,
  logger: Logger,
  db: Kysely<Database>
): Promise<JobResult> {
  const { tenantId, snapshotId, contractIds, forceRecompute } = payload;
  const startTime = Date.now();

  logger.info({ snapshotId, contractCount: contractIds?.length ?? 'all' }, 'Starting rev-rec computation');

  try {
    // 1. Load contracts with terms for snapshot
    const contracts = await loadContractsWithTerms(db, tenantId, snapshotId, contractIds);
    
    if (contracts.length === 0) {
      return {
        success: true,
        message: 'No contracts found for rev-rec computation',
        processingTimeMs: Date.now() - startTime,
      };
    }

    logger.info({ contractCount: contracts.length }, 'Loaded contracts for processing');

    let processedCount = 0;
    let skippedCount = 0;

    // 2. Process each contract
    for (const contract of contracts) {
      try {
        // Check if already computed and not forcing
        if (!forceRecompute) {
          const existingObligations = await db
            .selectFrom('revenue_obligations')
            .select('id')
            .where('contract_id', '=', contract.id)
            .where('snapshot_id', '=', snapshotId)
            .limit(1)
            .execute();

          if (existingObligations.length > 0) {
            logger.debug({ contractId: contract.id }, 'Skipping - already computed');
            skippedCount++;
            continue;
          }
        }

        // Delete existing data if recomputing
        if (forceRecompute) {
          await deleteExistingRevRecData(db, tenantId, snapshotId, contract.id);
        }

        // Build contract input
        const contractInput: ContractInput = {
          id: contract.id,
          customerId: contract.customer_id,
          name: contract.name,
          startDate: contract.start_date ? new Date(contract.start_date) : null,
          endDate: contract.end_date ? new Date(contract.end_date) : null,
          arr: contract.arr,
          currency: contract.currency ?? 'USD',
          billingFrequency: mapBillingFrequency(contract.billing_frequency),
          terms: contract.terms.map(t => ({
            id: t.id,
            termType: t.term_type,
            value: t.value_json,
            confidence: t.confidence ?? 0,
          })),
        };

        // Run rev-rec computation
        const output = revrec.computeRevRec(contractInput);

        if (output.obligations.length === 0) {
          logger.debug({ contractId: contract.id }, 'No obligations identified');
          continue;
        }

        // Persist results
        await persistRevRecResults(
          db,
          tenantId,
          snapshotId,
          contract.id,
          contract.version_id,
          output
        );

        processedCount++;
        logger.debug({ contractId: contract.id, obligationCount: output.obligations.length }, 'Processed contract');

      } catch (contractError) {
        logger.error({ contractId: contract.id, error: contractError }, 'Error processing contract');
        // Continue with other contracts
      }
    }

    return {
      success: true,
      message: `Processed ${processedCount} contracts, skipped ${skippedCount}`,
      data: { processedCount, skippedCount, totalContracts: contracts.length },
      processingTimeMs: Date.now() - startTime,
    };

  } catch (error) {
    logger.error({ error }, 'Rev-rec computation failed');
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Load contracts with their terms from the database.
 */
async function loadContractsWithTerms(
  db: Kysely<Database>,
  tenantId: string,
  snapshotId: string,
  contractIds?: string[]
): Promise<Array<{
  id: string;
  version_id: string;
  customer_id: string | null;
  name: string | null;
  start_date: string | null;
  end_date: string | null;
  arr: number | null;
  currency: string | null;
  billing_frequency: string | null;
  terms: Array<{
    id: string;
    term_type: string;
    value_json: unknown;
    confidence: number | null;
  }>;
}>> {
  // Build query
  let query = db
    .selectFrom('contracts')
    .innerJoin('contract_versions', 'contract_versions.contract_id', 'contracts.id')
    .select([
      'contracts.id',
      'contract_versions.id as version_id',
      'contracts.customer_id',
      'contracts.name',
      'contracts.start_date',
      'contracts.end_date',
      'contracts.arr',
      'contracts.currency',
      'contracts.billing_frequency',
    ])
    .where('contracts.tenant_id', '=', tenantId)
    .where('contracts.snapshot_id', '=', snapshotId);

  if (contractIds && contractIds.length > 0) {
    query = query.where('contracts.id', 'in', contractIds);
  }

  const contractRows = await query.execute();

  // Load terms for each contract
  const results: Array<{
    id: string;
    version_id: string;
    customer_id: string | null;
    name: string | null;
    start_date: string | null;
    end_date: string | null;
    arr: number | null;
    currency: string | null;
    billing_frequency: string | null;
    terms: Array<{
      id: string;
      term_type: string;
      value_json: unknown;
      confidence: number | null;
    }>;
  }> = [];

  for (const contract of contractRows) {
    const terms = await db
      .selectFrom('contract_terms')
      .select(['id', 'term_type', 'value_json', 'confidence'])
      .where('contract_version_id', '=', contract.version_id)
      .execute();

    results.push({
      id: contract.id,
      version_id: contract.version_id,
      customer_id: contract.customer_id,
      name: contract.name,
      start_date: contract.start_date as string | null,
      end_date: contract.end_date as string | null,
      arr: contract.arr as number | null,
      currency: contract.currency,
      billing_frequency: contract.billing_frequency,
      terms: terms.map(t => ({
        id: t.id,
        term_type: t.term_type,
        value_json: t.value_json,
        confidence: t.confidence as number | null,
      })),
    });
  }

  return results;
}

/**
 * Delete existing rev-rec data for a contract.
 */
async function deleteExistingRevRecData(
  db: Kysely<Database>,
  tenantId: string,
  snapshotId: string,
  contractId: string
): Promise<void> {
  // Get obligation IDs first
  const obligations = await db
    .selectFrom('revenue_obligations')
    .select('id')
    .where('tenant_id', '=', tenantId)
    .where('snapshot_id', '=', snapshotId)
    .where('contract_id', '=', contractId)
    .execute();

  const obligationIds = obligations.map(o => o.id);

  if (obligationIds.length === 0) return;

  // Delete in correct order (child tables first)
  await db.deleteFrom('deferred_revenue_balances')
    .where('obligation_id', 'in', obligationIds)
    .execute();

  await db.deleteFrom('recognition_events')
    .where('obligation_id', 'in', obligationIds)
    .execute();

  await db.deleteFrom('revenue_schedules')
    .where('obligation_id', 'in', obligationIds)
    .execute();

  await db.deleteFrom('revenue_allocations')
    .where('obligation_id', 'in', obligationIds)
    .execute();

  await db.deleteFrom('revenue_obligations')
    .where('id', 'in', obligationIds)
    .execute();

  // Also delete reconciliations for this contract
  await db.deleteFrom('revrec_reconciliations')
    .where('tenant_id', '=', tenantId)
    .where('snapshot_id', '=', snapshotId)
    .where('contract_id', '=', contractId)
    .execute();
}

/**
 * Persist rev-rec computation results to database.
 */
async function persistRevRecResults(
  db: Kysely<Database>,
  tenantId: string,
  snapshotId: string,
  contractId: string,
  contractVersionId: string,
  output: revrec.RevRecOutput
): Promise<void> {
  const { obligations, allocations, schedules, events, balances } = output;

  // Create obligation records
  const obligationIds: string[] = [];

  for (let i = 0; i < obligations.length; i++) {
    const obligation = obligations[i];
    const allocation = allocations.find(a => a.obligationIndex === i);
    const obligationId = createObligationId();
    obligationIds.push(obligationId);

    await db.insertInto('revenue_obligations').values({
      id: obligationId,
      tenant_id: tenantId,
      snapshot_id: snapshotId,
      contract_id: contractId,
      contract_version_id: contractVersionId,
      obligation_type: obligation.obligationType,
      description: obligation.description,
      transaction_price: obligation.transactionPrice,
      currency: 'USD',
      allocation_method: obligation.allocationMethod,
      standalone_selling_price: obligation.standaloneSellIingPrice,
      service_start_date: formatDate(obligation.serviceStartDate),
      service_end_date: formatDate(obligation.serviceEndDate),
      status: 'active',
      source_term_ids: JSON.stringify(obligation.sourceTermIds),
      metadata_json: {},
    }).execute();

    // Create allocation record
    if (allocation) {
      await db.insertInto('revenue_allocations').values({
        id: createAllocationId(),
        tenant_id: tenantId,
        snapshot_id: snapshotId,
        obligation_id: obligationId,
        allocation_pct: allocation.allocationPct,
        allocated_amount: allocation.allocatedAmount,
        allocation_basis: allocation.allocationBasis,
      }).execute();
    }

    // Create schedule records
    const obligationSchedules = schedules[i] || [];
    for (const schedule of obligationSchedules) {
      const scheduleId = createScheduleId();

      await db.insertInto('revenue_schedules').values({
        id: scheduleId,
        tenant_id: tenantId,
        snapshot_id: snapshotId,
        obligation_id: obligationId,
        period_start: formatDate(schedule.periodStart),
        period_end: formatDate(schedule.periodEnd),
        scheduled_amount: schedule.scheduledAmount,
        recognized_amount: schedule.recognizedAmount,
        deferred_amount: schedule.deferredAmount,
        recognition_method: schedule.recognitionMethod,
        status: schedule.status,
        period_days: schedule.periodDays,
        daily_rate: schedule.dailyRate,
      }).execute();
    }

    // Create recognition event records
    const obligationEvents = events[i] || [];
    for (const event of obligationEvents) {
      await db.insertInto('recognition_events').values({
        id: createRecognitionEventId(),
        tenant_id: tenantId,
        snapshot_id: snapshotId,
        obligation_id: obligationId,
        schedule_id: null, // Can be linked later if needed
        event_date: formatDate(event.eventDate),
        recognized_amount: event.recognizedAmount,
        event_type: event.eventType,
        source_invoice_id: event.sourceInvoiceId,
        description: event.description,
        metadata_json: {},
      }).execute();
    }

    // Create deferred balance records
    const obligationBalances = balances[i] || [];
    for (const balance of obligationBalances) {
      await db.insertInto('deferred_revenue_balances').values({
        id: createDeferredBalanceId(),
        tenant_id: tenantId,
        snapshot_id: snapshotId,
        obligation_id: obligationId,
        period_end: formatDate(balance.periodEnd),
        opening_balance: balance.openingBalance,
        additions: balance.additions,
        recognized: balance.recognized,
        adjustments: balance.adjustments,
        closing_balance: balance.closingBalance,
      }).execute();
    }
  }
}

/**
 * Map billing frequency from database to revrec type.
 */
function mapBillingFrequency(frequency: string | null): 'monthly' | 'quarterly' | 'annually' | 'one_time' | null {
  switch (frequency?.toLowerCase()) {
    case 'monthly':
      return 'monthly';
    case 'quarterly':
      return 'quarterly';
    case 'annually':
    case 'annual':
    case 'yearly':
      return 'annually';
    case 'one_time':
    case 'onetime':
      return 'one_time';
    default:
      return null;
  }
}

/**
 * Format date for database storage.
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
