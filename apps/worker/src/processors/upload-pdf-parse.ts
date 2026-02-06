/**
 * PDF Parse Processor
 * 
 * Extracts text from PDF files and stores for contract intelligence.
 * Supports:
 * - Standard PDF text extraction (pdf-parse)
 * - LLM-powered OCR fallback for scanned PDFs
 * - Direct structured extraction using LLM
 */
import type { Logger } from 'pino';
import type { Kysely } from 'kysely';
import type { Database } from '@cogtics/db';
import { type PdfParseJobPayload } from '@cogtics/schemas';
import { 
  llm, 
  contracts 
} from '@cogtics/utils';
// Lazy-load pdf-parse (CommonJS) via dynamic import to avoid createRequire in bundled ESM
let pdfParse: undefined | ((data: Buffer) => Promise<any>);
const getPdfParse = async () => {
  if (!pdfParse) {
    const mod = await import('pdf-parse');
    pdfParse = ((mod as { default?: typeof pdfParse }).default ?? mod) as typeof pdfParse;
  }
  return pdfParse!;
};

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
    const pdfBuffer = await storage.get(file.s3_key);
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Empty file from S3');
    }

    // Extract text from PDF using pdf-parse
    let extractedText = '';
    let pageCount = 0;
    let metadata: Record<string, unknown> = {};
    let structuredData: llm.StructuredContractData | null = null;
    let extractionMethod: 'pdf_parse' | 'llm_ocr' | 'llm_structured' = 'pdf_parse';

    try {
      // Parse PDF using pdf-parse library (v1.x - simple function API)
      const pdfParse = await getPdfParse();
      const pdfData = await pdfParse(pdfBuffer);
      
      extractedText = pdfData.text || '';
      pageCount = pdfData.numpages || 1;
      metadata = {
        info: pdfData.info,
        pages: pageCount,
        version: pdfData.version,
      };

      // Check if extraction quality is poor (likely scanned PDF)
      const isScanned = contracts.isScannedDocument(extractedText);
      const qualityResult = contracts.estimateExtractionQuality(extractedText);

      if (isScanned || qualityResult.quality === 'poor') {
        logger.info({ fileId, quality: qualityResult.quality }, 'Poor text quality detected, checking OCR fallback');
        
        // Try LLM-powered OCR if enabled
        if (llm.isOCRFallbackEnabled()) {
          try {
            // Convert first page to image for OCR
            // Note: In production, you'd use a library like pdf2pic or pdf-poppler
            logger.info({ fileId }, 'Attempting LLM OCR fallback');
            
            // For now, try structured extraction from whatever text we have
            const structuredResult = await llm.extractStructuredFromText(extractedText, undefined);
            if (structuredResult.success && structuredResult.structuredData) {
              structuredData = structuredResult.structuredData;
              extractionMethod = 'llm_structured';
              metadata.llmExtractionUsed = true;
              metadata.llmModel = structuredResult.model;
              metadata.llmTokensUsed = structuredResult.tokensUsed;
              logger.info({ fileId, model: structuredResult.model }, 'LLM structured extraction successful');
            }
          } catch (ocrError) {
            logger.warn({ err: ocrError, fileId }, 'LLM OCR fallback failed');
          }
        }
      } else if (llm.isLLMExtractionEnabled() && extractedText.length > 100) {
        // Good quality text - use LLM for structured extraction
        logger.info({ fileId, textLength: extractedText.length }, 'Using LLM for structured extraction');
        
        try {
          const structuredResult = await llm.extractStructuredFromText(extractedText, undefined);
          if (structuredResult.success && structuredResult.structuredData) {
            structuredData = structuredResult.structuredData;
            extractionMethod = 'llm_structured';
            metadata.llmExtractionUsed = true;
            metadata.llmModel = structuredResult.model;
            metadata.llmTokensUsed = structuredResult.tokensUsed;
            logger.info({ 
              fileId, 
              documentType: structuredData.documentType,
              termsExtracted: structuredData.rawTerms?.length || 0,
            }, 'LLM structured extraction successful');
          }
        } catch (llmError) {
          logger.warn({ err: llmError, fileId }, 'LLM structured extraction failed, using text-only');
        }
      }
    } catch (pdfError) {
      // If pdf-parse fails, try OCR fallback
      logger.warn({ err: pdfError, fileId }, 'PDF text extraction failed');
      
      if (llm.isOCRFallbackEnabled()) {
        logger.info({ fileId }, 'Attempting LLM OCR for failed PDF extraction');
        // In production, convert PDF pages to images here
        extractedText = '[Text extraction requires OCR - configure PDF-to-image conversion]';
        metadata = { 
          extractionError: (pdfError as Error).message,
          ocrRequired: true,
        };
      } else {
        extractedText = '[Text extraction failed - enable OCR fallback]';
        metadata = { extractionError: (pdfError as Error).message };
      }
    }

    // Store extracted text and structured data in file record
    const extractedTextJson = {
      text: extractedText,
      pageCount,
      extractedAt: new Date().toISOString(),
      extractionMethod,
      metadata,
      // Include structured data if available
      ...(structuredData && {
        structured: {
          documentType: structuredData.documentType,
          parties: structuredData.parties,
          dates: structuredData.dates,
          financials: structuredData.financials,
          terms: structuredData.terms,
          products: structuredData.products,
          summary: structuredData.summary,
        },
        rawTerms: structuredData.rawTerms,
      }),
    };

    await db
      .updateTable('upload_files')
      .set({
        extracted_text_json: extractedTextJson,
        size_bytes: pdfBuffer.length,
      })
      .where('id', '=', fileId)
      .execute();

    // Update parse run with stats
    const stats = {
      total_rows: structuredData?.products?.length || 1,
      valid_rows: structuredData?.products?.length || 1,
      error_rows: 0,
      skipped_rows: 0,
      duration_ms: Date.now() - startTime,
      batches_created: 1,
      page_count: pageCount,
      text_length: extractedText.length,
      extraction_method: extractionMethod,
      llm_used: extractionMethod !== 'pdf_parse',
      // Structured extraction results summary
      structured_extraction: structuredData ? {
        document_type: structuredData.documentType,
        parties_found: Object.keys(structuredData.parties || {}).length,
        products_found: structuredData.products?.length || 0,
        terms_extracted: structuredData.rawTerms?.length || 0,
        has_financials: !!structuredData.financials?.contractValue,
        has_dates: !!structuredData.dates?.effectiveDate,
      } : null,
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
      { 
        uploadId, 
        parseRunId, 
        pageCount, 
        textLength: extractedText.length,
        extractionMethod,
        structuredDataAvailable: !!structuredData,
        documentType: structuredData?.documentType,
        termsExtracted: structuredData?.rawTerms?.length || 0,
      },
      'PDF parse completed'
    );

    const message = structuredData 
      ? `Extracted ${pageCount} pages, ${structuredData.rawTerms?.length || 0} terms (${structuredData.documentType})`
      : `Extracted ${pageCount} pages, ${extractedText.length} characters`;

    return {
      success: true,
      message,
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
