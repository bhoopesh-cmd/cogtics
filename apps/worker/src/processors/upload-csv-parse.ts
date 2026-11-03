/**
 * CSV Parse Processor
 * 
 * Parses CSV files from S3/MinIO and validates rows.
 */
import type { Logger } from 'pino';
import type { Kysely } from 'kysely';
import type { Database } from '@cogtics/db';
import {
  type CsvParseJobPayload,
  type UploadMappingData,
  createParseErrorId,
  getRowSchemaForEntity,
  type UploadEntityType,
} from '@cogtics/schemas';
import Papa from 'papaparse';

interface JobResult {
  success: boolean;
  message: string;
  data?: unknown;
  processingTimeMs?: number;
}

interface StorageClient {
  get(key: string): Promise<Buffer>;
}

/**
 * Process CSV parse job
 */
export async function processCsvParseJob(
  payload: CsvParseJobPayload,
  logger: Logger,
  db: Kysely<Database>,
  storage: StorageClient
): Promise<JobResult> {
  const { tenantId, uploadId, fileId, parseRunId, mapping } = payload;
  const startTime = Date.now();

  logger.info({ uploadId, parseRunId }, 'Starting CSV parse');

  // Update parse run status
  await db
    .updateTable('upload_parse_runs')
    .set({ status: 'running', started_at: new Date() })
    .where('id', '=', parseRunId)
    .execute();

  // Update upload status
  await db
    .updateTable('uploads')
    .set({ status: 'processing' })
    .where('id', '=', uploadId)
    .execute();

  try {
    // Get file record
    const file = await db
      .selectFrom('upload_files')
      .selectAll()
      .where('id', '=', fileId)
      .executeTakeFirst();

    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    // Download file from S3
    const fileBuffer = await storage.get(file.s3_key);
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('Empty file from S3');
    }
    const csvContent = fileBuffer.toString('utf-8');

    // Parse CSV
    const parseConfig = mapping as UploadMappingData | undefined;
    const delimiter = parseConfig?.delimiter ?? ',';
    const skipHeader = parseConfig?.skipHeaderRow ?? true;
    const entityType = parseConfig?.entityType ?? 'customer';

    const parseResult = Papa.parse(csvContent, {
      header: skipHeader,
      delimiter,
      skipEmptyLines: true,
    });

    const rows = parseResult.data as Record<string, unknown>[];
    const errors = parseResult.errors || [];

    // Get validation schema for entity type
    const rowSchema = getRowSchemaForEntity(entityType as UploadEntityType);

    let validRows = 0;
    let errorRows = 0;
    const parseErrors: Array<{
      rowNumber: number;
      field: string | null;
      errorType: string;
      errorMessage: string;
      rawValue: string | null;
    }> = [];

    // Validate each row
    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 1 + (skipHeader ? 1 : 0);
      const row = rows[i];

      // Apply column mapping transformations if mapping exists
      let mappedRow = row;
      if (parseConfig?.columns) {
        mappedRow = applyColumnMapping(row, parseConfig.columns);
      }

      // Validate row
      const result = rowSchema.safeParse(mappedRow);

      if (result.success) {
        validRows++;
      } else {
        errorRows++;
        
        // Record validation errors
        for (const issue of result.error.issues) {
          parseErrors.push({
            rowNumber,
            field: issue.path.join('.') || null,
            errorType: issue.code,
            errorMessage: issue.message,
            rawValue: JSON.stringify(mappedRow[issue.path[0] as string] ?? null).substring(0, 500),
          });
        }
      }
    }

    // Add Papa parse errors
    for (const error of errors) {
      parseErrors.push({
        rowNumber: error.row ?? 0,
        field: null,
        errorType: 'parse_error',
        errorMessage: error.message,
        rawValue: null,
      });
    }

    // Insert parse errors in batches
    const batchSize = 100;
    for (let i = 0; i < parseErrors.length; i += batchSize) {
      const batch = parseErrors.slice(i, i + batchSize);
      await db
        .insertInto('upload_parse_errors')
        .values(
          batch.map(e => ({
            id: createParseErrorId(),
            tenant_id: tenantId,
            upload_id: uploadId,
            parse_run_id: parseRunId,
            row_number: e.rowNumber,
            field: e.field,
            error_type: e.errorType,
            error_message: e.errorMessage,
            raw_value: e.rawValue,
          }))
        )
        .execute();
    }

    // Update parse run with stats
    const stats = {
      total_rows: rows.length,
      valid_rows: validRows,
      error_rows: errorRows,
      skipped_rows: 0,
      duration_ms: Date.now() - startTime,
      batches_created: validRows,
    };

    await db
      .updateTable('upload_parse_runs')
      .set({
        status: 'completed',
        stats_json: stats,
        finished_at: new Date(),
      })
      .where('id', '=', parseRunId)
      .execute();

    // Update upload with totals
    await db
      .updateTable('uploads')
      .set({
        status: errorRows === rows.length ? 'failed' : 'completed',
        total_rows: rows.length,
        valid_rows: validRows,
        error_count: parseErrors.length,
        completed_at: new Date(),
      })
      .where('id', '=', uploadId)
      .execute();

    logger.info(
      { uploadId, parseRunId, validRows, errorRows, totalRows: rows.length },
      'CSV parse completed'
    );

    return {
      success: true,
      message: `Parsed ${rows.length} rows: ${validRows} valid, ${errorRows} errors`,
      data: stats,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    // Update parse run status
    await db
      .updateTable('upload_parse_runs')
      .set({
        status: 'failed',
        error_code: 'PARSE_FAILED',
        error_message: message,
        finished_at: new Date(),
      })
      .where('id', '=', parseRunId)
      .execute();

    // Update upload status
    await db
      .updateTable('uploads')
      .set({
        status: 'failed',
        error_code: 'PARSE_FAILED',
        error_message: message,
      })
      .where('id', '=', uploadId)
      .execute();

    logger.error({ err: error, uploadId, parseRunId }, 'CSV parse failed');

    return {
      success: false,
      message,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Apply column mapping transformations
 */
function applyColumnMapping(
  row: Record<string, unknown>,
  columns: Array<{
    sourceColumn: string;
    targetField: string;
    transform?: string;
    defaultValue?: string;
  }>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const col of columns) {
    let value = row[col.sourceColumn];

    // Apply default if empty
    if (value === undefined || value === null || value === '') {
      value = col.defaultValue ?? null;
    }

    // Apply transformations
    if (value !== null && col.transform) {
      switch (col.transform) {
        case 'trim':
          value = typeof value === 'string' ? value.trim() : value;
          break;
        case 'lowercase':
          value = typeof value === 'string' ? value.toLowerCase() : value;
          break;
        case 'uppercase':
          value = typeof value === 'string' ? value.toUpperCase() : value;
          break;
        case 'number':
          value = typeof value === 'string' ? parseFloat(value) || 0 : value;
          break;
        case 'boolean':
          value = ['true', '1', 'yes'].includes(String(value).toLowerCase());
          break;
        case 'date':
          value = typeof value === 'string' ? value : String(value);
          break;
      }
    }

    result[col.targetField] = value;
  }

  return result;
}
