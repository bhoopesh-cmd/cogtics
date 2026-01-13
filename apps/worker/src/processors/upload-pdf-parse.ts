/**
 * PDF Parse Processor
 * 
 * Extracts text from PDF files and stores for contract intelligence.
 */
import type { Logger } from 'pino';
import type { Kysely } from 'kysely';
import type { Database } from '@cogtics/db';
import { type PdfParseJobPayload } from '@cogtics/schemas';

interface JobResult {
  success: boolean;
  message: string;
  data?: unknown;
  processingTimeMs?: number;
}

interface StorageClient {
  getObject(key: string): Promise<{ Body: NodeJS.ReadableStream | null }>;
}

/**
 * Process PDF parse job
 */
export async function processPdfParseJob(
  payload: PdfParseJobPayload,
  logger: Logger,
  db: Kysely<Database>,
  storage: StorageClient
): Promise<JobResult> {
  const { tenantId, uploadId, fileId, parseRunId } = payload;
  const startTime = Date.now();

  logger.info({ uploadId, parseRunId }, 'Starting PDF parse');

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

    // Download PDF from S3
    const s3Object = await storage.getObject(file.s3_key);
    if (!s3Object.Body) {
      throw new Error('Empty file body from S3');
    }

    // Read stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of s3Object.Body as AsyncIterable<Buffer>) {
      chunks.push(chunk);
    }
    const pdfBuffer = Buffer.concat(chunks);

    // Extract text from PDF using pdf-parse
    let extractedText = '';
    let pageCount = 0;
    let metadata: Record<string, unknown> = {};

    try {
      // Dynamic import pdf-parse (ESM compatible)
      const pdfParse = await import('pdf-parse').then(m => m.default || m);
      const pdfData = await pdfParse(pdfBuffer);
      
      extractedText = pdfData.text || '';
      pageCount = pdfData.numpages || 1;
      metadata = {
        info: pdfData.info,
        pages: pageCount,
        version: pdfData.version,
      };
    } catch (pdfError) {
      // If pdf-parse fails, store basic info
      logger.warn({ err: pdfError, fileId }, 'PDF text extraction failed, storing file only');
      extractedText = '[Text extraction failed]';
      metadata = { extractionError: (pdfError as Error).message };
    }

    // Store extracted text in file record
    const extractedTextJson = {
      text: extractedText,
      pageCount,
      extractedAt: new Date().toISOString(),
      metadata,
    };

    await db
      .updateTable('upload_files')
      .set({
        extracted_text_json: extractedTextJson,
        size_bytes: pdfBuffer.length,
      })
      .where('id', '=', fileId)
      .execute();

    // Create raw_batch record for contract intelligence
    await db
      .insertInto('raw_batches')
      .values({
        id: `raw_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`,
        tenant_id: tenantId,
        connection_id: null,
        run_id: parseRunId,
        object_type: 'contract_document',
        source_system: 'manual_upload',
        batch_number: 1,
        record_count: 1,
        raw_data_json: {
          document_id: fileId,
          file_name: file.file_name,
          content_type: file.content_type,
          s3_key: file.s3_key,
          extracted_text: extractedText.substring(0, 50000), // Limit text size
          page_count: pageCount,
          metadata,
        },
        cursor_value: null,
        is_final: true,
        created_at: new Date(),
      })
      .execute();

    // Update parse run with stats
    const stats = {
      total_rows: 1,
      valid_rows: 1,
      error_rows: 0,
      skipped_rows: 0,
      duration_ms: Date.now() - startTime,
      batches_created: 1,
      page_count: pageCount,
      text_length: extractedText.length,
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

    // Update upload status
    await db
      .updateTable('uploads')
      .set({
        status: 'completed',
        total_rows: 1,
        valid_rows: 1,
        error_count: 0,
        completed_at: new Date(),
      })
      .where('id', '=', uploadId)
      .execute();

    logger.info(
      { uploadId, parseRunId, pageCount, textLength: extractedText.length },
      'PDF parse completed'
    );

    return {
      success: true,
      message: `Extracted ${pageCount} pages, ${extractedText.length} characters`,
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
        error_code: 'PDF_PARSE_FAILED',
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
        error_code: 'PDF_PARSE_FAILED',
        error_message: message,
      })
      .where('id', '=', uploadId)
      .execute();

    logger.error({ err: error, uploadId, parseRunId }, 'PDF parse failed');

    return {
      success: false,
      message,
      processingTimeMs: Date.now() - startTime,
    };
  }
}
