/**
 * Contract PDF Extract Processor
 * 
 * Extracts text from PDF files and stores in contract_documents.
 */
import type { Logger } from 'pino';
import type { Kysely } from 'kysely';
import type { Database } from '@cogtics/db';
import type { ContractExtractJobPayload } from '@cogtics/schemas';
import { createContractDocumentId } from '@cogtics/schemas';
import { Queue } from 'bullmq';

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
 * Process contract PDF extraction job
 */
export async function processContractExtractJob(
  payload: ContractExtractJobPayload,
  logger: Logger,
  db: Kysely<Database>,
  storage: StorageClient,
  queues: Map<string, Queue>
): Promise<JobResult> {
  const { tenantId, snapshotId, documentId, contractVersionId, s3Key } = payload;
  const startTime = Date.now();

  logger.info({ documentId, s3Key }, 'Starting contract PDF extraction');

  // Update document status
  await db
    .updateTable('contract_documents')
    .set({ status: 'extracting' })
    .where('id', '=', documentId)
    .execute();

  try {
    // Download PDF from S3
    const pdfBuffer = await storage.get(s3Key);
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Empty file from S3');
    }
    
    const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB limit
    if (pdfBuffer.length > MAX_PDF_SIZE) {
      throw new Error(`PDF file too large (>${MAX_PDF_SIZE / 1024 / 1024}MB). Please upload a smaller file.`);
    }

    // Extract text from PDF using pdf-parse
    let extractedText = '';
    let pageCount = 0;
    let metadata: Record<string, unknown> = {};

    try {
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
      logger.warn({ err: pdfError, documentId }, 'PDF text extraction failed');
      extractedText = '[Text extraction failed]';
      metadata = { extractionError: (pdfError as Error).message };
    }

    // Check for empty text (likely scanned image)
    const trimmedText = extractedText.trim();
    if (trimmedText.length === 0 || trimmedText === '[Text extraction failed]') {
      logger.warn({ documentId }, 'PDF appears to contain no extractable text (may be scanned image)');
      metadata = { 
        ...metadata, 
        warning: 'No extractable text found - PDF may be a scanned image. OCR is not currently supported.' 
      };
    }

    // Check for very long text that might cause memory issues in segmentation
    const MAX_TEXT_LENGTH = 5 * 1024 * 1024; // 5MB of text
    if (extractedText.length > MAX_TEXT_LENGTH) {
      logger.warn(
        { documentId, textLength: extractedText.length, maxLength: MAX_TEXT_LENGTH },
        'Extracted text exceeds maximum length, truncating'
      );
      extractedText = extractedText.substring(0, MAX_TEXT_LENGTH);
      metadata = { ...metadata, truncated: true, originalLength: extractedText.length };
    }

    // Update document with extracted text
    await db
      .updateTable('contract_documents')
      .set({
        status: 'extracted',
        extracted_text: extractedText,
        extracted_text_length: extractedText.length,
        page_count: pageCount,
        metadata_json: metadata,
        extracted_at: new Date(),
      })
      .where('id', '=', documentId)
      .execute();

    // Enqueue clause segmentation job if we have a contract version
    if (contractVersionId) {
      const segmentQueue = queues.get('contracts.clause.segment');
      if (segmentQueue) {
        await segmentQueue.add('segment', {
          payload: {
            type: 'contracts.clause.segment',
            tenantId,
            snapshotId,
            documentId,
            contractVersionId,
          },
        });
        logger.info({ documentId, contractVersionId }, 'Enqueued clause segmentation job');
      }
    }

    logger.info(
      { documentId, pageCount, textLength: extractedText.length },
      'Contract PDF extraction completed'
    );

    return {
      success: true,
      message: `Extracted ${pageCount} pages, ${extractedText.length} characters`,
      data: { pageCount, textLength: extractedText.length },
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    await db
      .updateTable('contract_documents')
      .set({
        status: 'failed',
        error_message: message,
      })
      .where('id', '=', documentId)
      .execute();

    logger.error({ err: error, documentId }, 'Contract PDF extraction failed');

    return {
      success: false,
      message,
      processingTimeMs: Date.now() - startTime,
    };
  }
}
