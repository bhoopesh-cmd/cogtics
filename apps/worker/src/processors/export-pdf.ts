import type { Logger } from 'pino';
import type { Kysely, Database } from '@cogtics/db';
import type { ExportPdfRenderJobPayload, JobResult } from '@cogtics/schemas';
import { createExportFileId, createExportAuditId } from '@cogtics/schemas';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Template file names for each export type
 */
const TEMPLATE_MAP: Record<string, string> = {
  contracts_pdf: 'contracts-report',
  audit_bundle_pdf: 'audit-bundle',
  executive_summary_pdf: 'executive-summary',
};

/**
 * Process PDF export job
 */
export async function processExportPdfJob(
  payload: ExportPdfRenderJobPayload,
  logger: Logger,
  db: Kysely<Database>,
  storageClient: { putObject: (tenantId: string, key: string, body: Buffer | string, options?: { contentType?: string }) => Promise<{ key: string; etag?: string }> }
): Promise<JobResult> {
  const { exportId, snapshotId, exportType, tenantId, templateName } = payload;
  
  logger.info({ exportId, snapshotId, exportType, templateName }, 'Starting PDF export');
  
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
        details_json: { snapshotId, exportType, templateName },
        created_at: new Date(),
      })
      .execute();
    
    // Gather data for PDF
    const pdfData = await gatherPdfData(db, tenantId, snapshotId, exportType, logger);
    
    // Render HTML from template
    const html = await renderTemplate(templateName, pdfData, logger);
    
    // Convert HTML to PDF
    const pdfBuffer = await renderPdf(html, logger);
    
    // Calculate checksum
    const checksum = createHash('sha256').update(pdfBuffer).digest('hex');
    
    // Upload to storage
    const fileName = `${exportType}_${snapshotId}_${Date.now()}.pdf`;
    const s3Key = `exports/${exportId}/${fileName}`;
    
    await storageClient.putObject(
      tenantId,
      s3Key,
      pdfBuffer,
      { contentType: 'application/pdf' }
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
        content_type: 'application/pdf',
        size_bytes: pdfBuffer.length,
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
          sizeBytes: pdfBuffer.length,
          processingTimeMs: Date.now() - startTime,
        },
        created_at: new Date(),
      })
      .execute();
    
    logger.info({ exportId, sizeBytes: pdfBuffer.length }, 'PDF export completed');
    
    return {
      success: true,
      message: 'PDF export completed',
      data: {
        exportId,
        fileId: exportFileId,
        fileName,
        sizeBytes: pdfBuffer.length,
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
        error_code: 'PDF_RENDER_FAILED',
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
    
    logger.error({ exportId, error: errorMessage }, 'PDF export failed');
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Gather data for PDF based on export type
 */
async function gatherPdfData(
  db: Kysely<Database>,
  tenantId: string,
  snapshotId: string,
  exportType: string,
  logger: Logger
): Promise<Record<string, unknown>> {
  const snapshot = await db
    .selectFrom('snapshots')
    .select(['id', 'status', 'started_at', 'completed_at', 'record_counts', 'quality_results'])
    .where('id', '=', snapshotId)
    .where('tenant_id', '=', tenantId)
    .executeTakeFirst();
  
  const baseData = {
    snapshotId,
    generatedAt: new Date().toISOString(),
    snapshot,
  };
  
  switch (exportType) {
    case 'audit_bundle_pdf': {
      // Gather issues with evidence summaries
      const issues = await db
        .selectFrom('issues')
        .select(['id', 'severity', 'category', 'status', 'rule_id', 'confidence', 'impact_amount', 'currency'])
        .where('tenant_id', '=', tenantId)
        .where('snapshot_id', '=', snapshotId)
        .orderBy('severity', 'desc')
        .limit(100)
        .execute();
      
      const issuesSummary = {
        total: issues.length,
        bySeverity: issues.reduce((acc, i) => {
          acc[i.severity] = (acc[i.severity] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byCategory: issues.reduce((acc, i) => {
          acc[i.category] = (acc[i.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };
      
      return { ...baseData, issues, issuesSummary };
    }
    
    case 'executive_summary_pdf': {
      // High-level metrics
      const contractsCount = await db
        .selectFrom('contracts')
        .select(db.fn.count('id').as('count'))
        .where('tenant_id', '=', tenantId)
        .where('snapshot_id', '=', snapshotId)
        .executeTakeFirst();
      
      const issuesCount = await db
        .selectFrom('issues')
        .select(db.fn.count('id').as('count'))
        .where('tenant_id', '=', tenantId)
        .where('snapshot_id', '=', snapshotId)
        .where('status', '=', 'open')
        .executeTakeFirst();
      
      const totalArr = await db
        .selectFrom('contracts')
        .select(db.fn.sum('arr').as('total'))
        .where('tenant_id', '=', tenantId)
        .where('snapshot_id', '=', snapshotId)
        .where('status', '=', 'active')
        .executeTakeFirst();
      
      return {
        ...baseData,
        metrics: {
          contractsCount: Number(contractsCount?.count ?? 0),
          openIssuesCount: Number(issuesCount?.count ?? 0),
          totalArr: Number(totalArr?.total ?? 0),
        },
      };
    }
    
    case 'contracts_pdf': {
      // Contracts with readiness info
      const contracts = await db
        .selectFrom('contracts')
        .leftJoin('contract_versions', 'contracts.id', 'contract_versions.contract_id')
        .leftJoin('contract_readiness', 'contract_versions.id', 'contract_readiness.contract_version_id')
        .select([
          'contracts.id',
          'contracts.name',
          'contracts.status',
          'contracts.arr',
          'contracts.currency',
          'contract_readiness.readiness_status',
          'contract_readiness.confidence_score',
        ])
        .where('contracts.tenant_id', '=', tenantId)
        .where('contracts.snapshot_id', '=', snapshotId)
        .orderBy('contracts.arr', 'desc')
        .limit(50)
        .execute();
      
      return { ...baseData, contracts };
    }
    
    default:
      return baseData;
  }
}

/**
 * Render HTML from template
 */
async function renderTemplate(
  templateName: string,
  data: Record<string, unknown>,
  logger: Logger
): Promise<string> {
  // Try to load Handlebars dynamically
  try {
    const Handlebars = await import('handlebars');
    
    // Look for template file
    const templatePath = path.resolve(__dirname, '../templates', `${templateName}.hbs`);
    
    if (fs.existsSync(templatePath)) {
      const templateSource = fs.readFileSync(templatePath, 'utf8');
      const template = Handlebars.compile(templateSource);
      return template(data);
    }
    
    // Fallback: generate basic HTML
    logger.warn({ templateName }, 'Template file not found, using fallback');
    return generateFallbackHtml(templateName, data);
  } catch (error) {
    logger.warn({ error }, 'Handlebars not available, using fallback template');
    return generateFallbackHtml(templateName, data);
  }
}

/**
 * Generate fallback HTML when template not found
 */
function generateFallbackHtml(templateName: string, data: Record<string, unknown>): string {
  const title = templateName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
        }
        h1 { color: #1a1a1a; border-bottom: 2px solid #ff6500; padding-bottom: 10px; }
        h2 { color: #444; margin-top: 30px; }
        .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
        .section { margin: 20px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f0f0f0; font-weight: 600; }
        .highlight { color: #ff6500; font-weight: 600; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <h1>Cogtics ${title}</h1>
      <div class="meta">
        <p>Snapshot: ${data.snapshotId}</p>
        <p>Generated: ${data.generatedAt}</p>
      </div>
      
      <div class="section">
        <h2>Report Data</h2>
        <pre>${JSON.stringify(data, null, 2).substring(0, 5000)}</pre>
      </div>
      
      <div class="footer">
        <p>This report was generated by Cogtics. All data is snapshot-scoped and immutable.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Render HTML to PDF using Puppeteer
 */
async function renderPdf(html: string, logger: Logger): Promise<Buffer> {
  try {
    // Try to use Puppeteer
    const puppeteer = await import('puppeteer');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      });
      
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  } catch (error) {
    logger.error({ error }, 'Puppeteer not available - PDF rendering requires Puppeteer/Playwright in production');
    
    // Throw error instead of returning invalid placeholder
    throw new Error(
      'PDF rendering not available: Puppeteer is not installed. ' +
      'Install with: pnpm add puppeteer'
    );
  }
}
