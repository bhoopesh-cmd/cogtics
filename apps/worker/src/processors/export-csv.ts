import type { Logger } from 'pino';
import type { Kysely, Database } from '@cogtics/db';
import type { ExportCsvGenerateJobPayload, JobResult } from '@cogtics/schemas';
import { createExportFileId, createExportAuditId, createExportItemId } from '@cogtics/schemas';
import { createHash } from 'crypto';

/**
 * CSV column definitions for each export type
 */
const CSV_COLUMNS = {
  issues_csv: [
    'id', 'severity', 'category', 'status', 'rule_id', 'rule_version',
    'confidence', 'impact_amount', 'currency', 'contract_id', 'customer_id', 'created_at'
  ],
  revrec_csv: [
    'id', 'contract_id', 'obligation_id', 'period_start', 'period_end',
    'scheduled_amount', 'recognized_amount', 'deferred_amount', 'status', 'recognition_method'
  ],
  contracts_csv: [
    'id', 'name', 'customer_id', 'status', 'start_date', 'end_date',
    'arr', 'currency', 'billing_frequency', 'auto_renew', 'readiness_score', 'readiness_status'
  ],
} as const;

/**
 * Escape a value for CSV format
 */
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  
  // Escape quotes and wrap in quotes if needed
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * Generate CSV row from values
 */
function toCsvRow(values: unknown[]): string {
  return values.map(escapeCsvValue).join(',') + '\n';
}

/**
 * Process CSV export job
 */
export async function processExportCsvJob(
  payload: ExportCsvGenerateJobPayload,
  logger: Logger,
  db: Kysely<Database>,
  storageClient: { putObject: (tenantId: string, key: string, body: Buffer | string, options?: { contentType?: string }) => Promise<{ key: string; etag?: string }> }
): Promise<JobResult> {
  const { exportId, snapshotId, exportType, tenantId } = payload;
  
  logger.info({ exportId, snapshotId, exportType }, 'Starting CSV export');
  
  const startTime = Date.now();
  
  try {
    // Update export status to processing
    await db
      .updateTable('exports')
      .set({ 
        status: 'processing',
        processing_lock: new Date(),
      })
      .where('id', '=', exportId)
      .where('tenant_id', '=', tenantId)
      .execute();
    
    // Log audit event
    await db
      .insertInto('export_audit')
      .values({
        id: createExportAuditId(),
        tenant_id: tenantId,
        export_id: exportId,
        action: 'started',
        details_json: { snapshotId, exportType },
        created_at: new Date(),
      })
      .execute();
    
    // Generate CSV content based on export type
    let csvContent: string;
    let rowCount = 0;
    
    switch (exportType) {
      case 'issues_csv':
        ({ content: csvContent, rowCount } = await generateIssuesCsv(db, tenantId, snapshotId, logger));
        break;
      case 'revrec_csv':
        ({ content: csvContent, rowCount } = await generateRevRecCsv(db, tenantId, snapshotId, logger));
        break;
      case 'contracts_csv':
        ({ content: csvContent, rowCount } = await generateContractsCsv(db, tenantId, snapshotId, logger));
        break;
      default:
        throw new Error(`Unsupported CSV export type: ${exportType}`);
    }
    
    // Calculate checksum
    const checksum = createHash('sha256').update(csvContent).digest('hex');
    
    // Upload to storage
    const fileName = `${exportType}_${snapshotId}_${Date.now()}.csv`;
    const s3Key = `exports/${exportId}/${fileName}`;
    
    await storageClient.putObject(
      tenantId,
      s3Key,
      csvContent,
      { contentType: 'text/csv' }
    );
    
    // Create export file record
    const exportFileId = createExportFileId();
    await db
      .insertInto('export_files')
      .values({
        id: exportFileId,
        tenant_id: tenantId,
        export_id: exportId,
        s3_key: s3Key,
        file_name: fileName,
        content_type: 'text/csv',
        size_bytes: Buffer.byteLength(csvContent, 'utf8'),
        checksum_sha256: checksum,
        created_at: new Date(),
      })
      .execute();
    
    // Update export status to completed
    await db
      .updateTable('exports')
      .set({
        status: 'completed',
        completed_at: new Date(),
        processing_lock: null,
      })
      .where('id', '=', exportId)
      .execute();
    
    // Log audit event
    await db
      .insertInto('export_audit')
      .values({
        id: createExportAuditId(),
        tenant_id: tenantId,
        export_id: exportId,
        action: 'completed',
        details_json: { 
          rowCount, 
          sizeBytes: Buffer.byteLength(csvContent, 'utf8'),
          processingTimeMs: Date.now() - startTime,
        },
        created_at: new Date(),
      })
      .execute();
    
    logger.info({ exportId, rowCount, sizeBytes: Buffer.byteLength(csvContent, 'utf8') }, 'CSV export completed');
    
    return {
      success: true,
      message: `CSV export completed with ${rowCount} rows`,
      data: {
        exportId,
        fileId: exportFileId,
        fileName,
        rowCount,
        sizeBytes: Buffer.byteLength(csvContent, 'utf8'),
        checksum,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Update export status to failed
    await db
      .updateTable('exports')
      .set({
        status: 'failed',
        error_code: 'EXPORT_FAILED',
        error_message: errorMessage,
        processing_lock: null,
      })
      .where('id', '=', exportId)
      .execute();
    
    // Log audit event
    await db
      .insertInto('export_audit')
      .values({
        id: createExportAuditId(),
        tenant_id: tenantId,
        export_id: exportId,
        action: 'failed',
        details_json: { error: errorMessage },
        created_at: new Date(),
      })
      .execute();
    
    logger.error({ exportId, error: errorMessage }, 'CSV export failed');
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Generate Issues CSV
 */
async function generateIssuesCsv(
  db: Kysely<Database>,
  tenantId: string,
  snapshotId: string,
  logger: Logger
): Promise<{ content: string; rowCount: number }> {
  const columns = CSV_COLUMNS.issues_csv;
  let content = toCsvRow(columns);
  let rowCount = 0;
  
  // Fetch issues in batches
  const BATCH_SIZE = 10000;
  let offset = 0;
  
  while (true) {
    const issues = await db
      .selectFrom('issues')
      .select([
        'id', 'severity', 'category', 'status', 'rule_id', 'rule_version',
        'confidence', 'impact_amount', 'currency', 'contract_id', 'customer_id', 'created_at'
      ])
      .where('tenant_id', '=', tenantId)
      .where('snapshot_id', '=', snapshotId)
      .orderBy('created_at', 'desc')
      .limit(BATCH_SIZE)
      .offset(offset)
      .execute();
    
    if (issues.length === 0) break;
    
    for (const issue of issues) {
      content += toCsvRow([
        issue.id,
        issue.severity,
        issue.category,
        issue.status,
        issue.rule_id,
        issue.rule_version,
        issue.confidence,
        issue.impact_amount,
        issue.currency,
        issue.contract_id,
        issue.customer_id,
        issue.created_at?.toISOString(),
      ]);
      rowCount++;
    }
    
    offset += BATCH_SIZE;
    logger.debug({ processed: rowCount }, 'Processing issues batch');
  }
  
  return { content, rowCount };
}

/**
 * Generate Revenue Recognition CSV
 */
async function generateRevRecCsv(
  db: Kysely<Database>,
  tenantId: string,
  snapshotId: string,
  logger: Logger
): Promise<{ content: string; rowCount: number }> {
  const columns = CSV_COLUMNS.revrec_csv;
  let content = toCsvRow(columns);
  let rowCount = 0;
  
  const BATCH_SIZE = 10000;
  let offset = 0;
  
  while (true) {
    const schedules = await db
      .selectFrom('revenue_schedules')
      .innerJoin('revenue_obligations', 'revenue_schedules.obligation_id', 'revenue_obligations.id')
      .select([
        'revenue_schedules.id',
        'revenue_obligations.contract_id',
        'revenue_schedules.obligation_id',
        'revenue_schedules.period_start',
        'revenue_schedules.period_end',
        'revenue_schedules.scheduled_amount',
        'revenue_schedules.recognized_amount',
        'revenue_schedules.deferred_amount',
        'revenue_schedules.status',
        'revenue_schedules.recognition_method',
      ])
      .where('revenue_schedules.tenant_id', '=', tenantId)
      .where('revenue_schedules.snapshot_id', '=', snapshotId)
      .orderBy('revenue_schedules.period_start', 'asc')
      .limit(BATCH_SIZE)
      .offset(offset)
      .execute();
    
    if (schedules.length === 0) break;
    
    for (const schedule of schedules) {
      content += toCsvRow([
        schedule.id,
        schedule.contract_id,
        schedule.obligation_id,
        schedule.period_start?.toISOString().split('T')[0],
        schedule.period_end?.toISOString().split('T')[0],
        schedule.scheduled_amount,
        schedule.recognized_amount,
        schedule.deferred_amount,
        schedule.status,
        schedule.recognition_method,
      ]);
      rowCount++;
    }
    
    offset += BATCH_SIZE;
    logger.debug({ processed: rowCount }, 'Processing revrec batch');
  }
  
  return { content, rowCount };
}

/**
 * Generate Contracts CSV
 */
async function generateContractsCsv(
  db: Kysely<Database>,
  tenantId: string,
  snapshotId: string,
  logger: Logger
): Promise<{ content: string; rowCount: number }> {
  const columns = CSV_COLUMNS.contracts_csv;
  let content = toCsvRow(columns);
  let rowCount = 0;
  
  const BATCH_SIZE = 10000;
  let offset = 0;
  
  while (true) {
    const contracts = await db
      .selectFrom('contracts')
      .leftJoin('contract_versions', 'contracts.id', 'contract_versions.contract_id')
      .leftJoin('contract_readiness', 'contract_versions.id', 'contract_readiness.contract_version_id')
      .select([
        'contracts.id',
        'contracts.name',
        'contracts.customer_id',
        'contracts.status',
        'contracts.start_date',
        'contracts.end_date',
        'contracts.arr',
        'contracts.currency',
        'contracts.billing_frequency',
        'contracts.auto_renew',
        'contract_readiness.confidence_score as readiness_score',
        'contract_readiness.readiness_status',
      ])
      .where('contracts.tenant_id', '=', tenantId)
      .where('contracts.snapshot_id', '=', snapshotId)
      .orderBy('contracts.id', 'asc')
      .limit(BATCH_SIZE)
      .offset(offset)
      .execute();
    
    if (contracts.length === 0) break;
    
    for (const contract of contracts) {
      content += toCsvRow([
        contract.id,
        contract.name,
        contract.customer_id,
        contract.status,
        contract.start_date?.toISOString().split('T')[0],
        contract.end_date?.toISOString().split('T')[0],
        contract.arr,
        contract.currency,
        contract.billing_frequency,
        contract.auto_renew,
        contract.readiness_score,
        contract.readiness_status,
      ]);
      rowCount++;
    }
    
    offset += BATCH_SIZE;
    logger.debug({ processed: rowCount }, 'Processing contracts batch');
  }
  
  return { content, rowCount };
}
