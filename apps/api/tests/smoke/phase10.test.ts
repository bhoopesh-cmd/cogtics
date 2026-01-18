/**
 * Phase 10 Smoke Tests
 * 
 * Verifies that all Phase 10 exports & digests components are properly exported
 * and configured.
 */
import { describe, it, expect } from 'vitest';

// Test schema exports
import {
  // Export ID generators
  createExportId,
  createExportFileId,
  createExportItemId,
  createExportScheduleId,
  createExportRunId,
  createExportAuditId,
  createDigestSubscriptionId,
  createDigestRunId,
  // Export enums
  ExportTypeSchema,
  ExportFormatSchema,
  ExportStatusSchema,
  CadenceSchema,
  ExportAuditActionSchema,
  DigestRunStatusSchema,
  // Export schemas
  ExportSchema,
  ExportFileSchema,
  ExportOptionsSchema,
  CreateExportRequestSchema,
  ExportListQuerySchema,
  // Digest schemas
  DigestSubscriptionSchema,
  DigestRunSchema,
  DigestScopeSchema,
  CreateDigestSubscriptionRequestSchema,
  UpdateDigestSubscriptionRequestSchema,
  // Job payloads
  ExportCsvGenerateJobPayloadSchema,
  ExportPdfRenderJobPayloadSchema,
  DigestSendJobPayloadSchema,
} from '@cogtics/schemas';

// Test utils exports
import { exports as exportUtils } from '@cogtics/utils';

describe('Phase 10: Exports & Digests - Smoke Tests', () => {
  describe('Schema Exports', () => {
    it('should export ExportType schema with correct values', () => {
      expect(ExportTypeSchema).toBeDefined();
      expect(ExportTypeSchema.options).toContain('issues_csv');
      expect(ExportTypeSchema.options).toContain('revrec_csv');
      expect(ExportTypeSchema.options).toContain('contracts_csv');
      expect(ExportTypeSchema.options).toContain('audit_bundle_pdf');
      expect(ExportTypeSchema.options).toContain('executive_summary_pdf');
      expect(ExportTypeSchema.options).toContain('contracts_pdf');
    });

    it('should export ExportFormat schema', () => {
      expect(ExportFormatSchema).toBeDefined();
      expect(ExportFormatSchema.options).toContain('csv');
      expect(ExportFormatSchema.options).toContain('pdf');
      expect(ExportFormatSchema.options).toContain('xlsx');
    });

    it('should export ExportStatus schema', () => {
      expect(ExportStatusSchema).toBeDefined();
      expect(ExportStatusSchema.options).toContain('pending');
      expect(ExportStatusSchema.options).toContain('processing');
      expect(ExportStatusSchema.options).toContain('completed');
      expect(ExportStatusSchema.options).toContain('failed');
      expect(ExportStatusSchema.options).toContain('cancelled');
    });

    it('should export Cadence schema', () => {
      expect(CadenceSchema).toBeDefined();
      expect(CadenceSchema.options).toContain('daily');
      expect(CadenceSchema.options).toContain('weekly');
      expect(CadenceSchema.options).toContain('monthly');
    });

    it('should export ExportAuditAction schema', () => {
      expect(ExportAuditActionSchema).toBeDefined();
      expect(ExportAuditActionSchema.options).toContain('requested');
      expect(ExportAuditActionSchema.options).toContain('completed');
      expect(ExportAuditActionSchema.options).toContain('downloaded');
      expect(ExportAuditActionSchema.options).toContain('regenerated');
    });

    it('should export DigestRunStatus schema', () => {
      expect(DigestRunStatusSchema).toBeDefined();
      expect(DigestRunStatusSchema.options).toContain('pending');
      expect(DigestRunStatusSchema.options).toContain('running');
      expect(DigestRunStatusSchema.options).toContain('completed');
      expect(DigestRunStatusSchema.options).toContain('skipped');
    });
  });

  describe('ID Generators', () => {
    it('should generate export IDs with correct prefix', () => {
      const id = createExportId();
      expect(id).toMatch(/^exp_[a-zA-Z0-9]+$/);
    });

    it('should generate export file IDs with correct prefix', () => {
      const id = createExportFileId();
      expect(id).toMatch(/^expf_[a-zA-Z0-9]+$/);
    });

    it('should generate export item IDs with correct prefix', () => {
      const id = createExportItemId();
      expect(id).toMatch(/^expi_[a-zA-Z0-9]+$/);
    });

    it('should generate export schedule IDs with correct prefix', () => {
      const id = createExportScheduleId();
      expect(id).toMatch(/^exps_[a-zA-Z0-9]+$/);
    });

    it('should generate export run IDs with correct prefix', () => {
      const id = createExportRunId();
      expect(id).toMatch(/^expr_[a-zA-Z0-9]+$/);
    });

    it('should generate export audit IDs with correct prefix', () => {
      const id = createExportAuditId();
      expect(id).toMatch(/^expa_[a-zA-Z0-9]+$/);
    });

    it('should generate digest subscription IDs with correct prefix', () => {
      const id = createDigestSubscriptionId();
      expect(id).toMatch(/^digs_[a-zA-Z0-9]+$/);
    });

    it('should generate digest run IDs with correct prefix', () => {
      const id = createDigestRunId();
      expect(id).toMatch(/^digr_[a-zA-Z0-9]+$/);
    });
  });

  describe('Request Schemas Validation', () => {
    it('should validate CreateExportRequest', () => {
      const validRequest = {
        snapshotId: 'snap_123',
        exportType: 'issues_csv',
      };

      const result = CreateExportRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should validate CreateExportRequest with options', () => {
      const validRequest = {
        snapshotId: 'snap_123',
        exportType: 'audit_bundle_pdf',
        options: {
          includeEvidence: true,
          dateRange: {
            start: '2024-01-01T00:00:00Z',
            end: '2024-12-31T23:59:59Z',
          },
        },
      };

      const result = CreateExportRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject invalid export type', () => {
      const invalidRequest = {
        snapshotId: 'snap_123',
        exportType: 'invalid_type',
      };

      const result = CreateExportRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should validate CreateDigestSubscriptionRequest', () => {
      const validRequest = {
        name: 'Weekly Summary',
        cadence: 'weekly',
        recipients: ['test@example.com', 'admin@example.com'],
      };

      const result = CreateDigestSubscriptionRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should validate UpdateDigestSubscriptionRequest', () => {
      const validRequest = {
        isActive: false,
        cadence: 'monthly',
      };

      const result = UpdateDigestSubscriptionRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should validate DigestScope', () => {
      const validScope = {
        issuesSeverity: ['high', 'critical'],
        includeResolved: false,
        includeSimulationDeltas: true,
        deltaThreshold: 1000,
      };

      const result = DigestScopeSchema.safeParse(validScope);
      expect(result.success).toBe(true);
    });
  });

  describe('Job Payload Schemas', () => {
    it('should validate ExportCsvGenerateJobPayload', () => {
      const payload = {
        type: 'export.csv.generate',
        tenantId: 'tenant_test',
        exportId: 'exp_123',
        snapshotId: 'snap_123',
        exportType: 'issues_csv',
      };

      const result = ExportCsvGenerateJobPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should validate ExportPdfRenderJobPayload', () => {
      const payload = {
        type: 'export.pdf.render',
        tenantId: 'tenant_test',
        exportId: 'exp_123',
        snapshotId: 'snap_123',
        exportType: 'audit_bundle_pdf',
        templateName: 'audit-bundle',
      };

      const result = ExportPdfRenderJobPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should validate DigestSendJobPayload', () => {
      const payload = {
        type: 'digest.send',
        tenantId: 'tenant_test',
        subscriptionId: 'digs_123',
        runId: 'digr_123',
      };

      const result = DigestSendJobPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('CSV Utilities', () => {
    it('should export escapeCsvValue function', () => {
      expect(exportUtils.escapeCsvValue).toBeDefined();
      expect(typeof exportUtils.escapeCsvValue).toBe('function');
    });

    it('should export toCsvRow function', () => {
      expect(exportUtils.toCsvRow).toBeDefined();
      expect(typeof exportUtils.toCsvRow).toBe('function');
    });

    it('should export generateCsv function', () => {
      expect(exportUtils.generateCsv).toBeDefined();
      expect(typeof exportUtils.generateCsv).toBe('function');
    });

    it('should export EXPORT_COLUMNS', () => {
      expect(exportUtils.EXPORT_COLUMNS).toBeDefined();
      expect(exportUtils.EXPORT_COLUMNS.issues).toBeDefined();
      expect(exportUtils.EXPORT_COLUMNS.revrec).toBeDefined();
      expect(exportUtils.EXPORT_COLUMNS.contracts).toBeDefined();
    });

    it('should properly escape CSV values with commas', () => {
      const result = exportUtils.escapeCsvValue('hello, world');
      expect(result).toBe('"hello, world"');
    });

    it('should properly generate CSV rows', () => {
      const result = exportUtils.toCsvRow(['a', 'b', 'c']);
      expect(result).toBe('a,b,c\n');
    });

    it('should properly generate complete CSV', () => {
      const result = exportUtils.generateCsv(['id', 'name'], [['1', 'test']]);
      expect(result).toBe('id,name\n1,test\n');
    });
  });

  describe('Export Schema Validation', () => {
    it('should validate Export object', () => {
      const validExport = {
        id: 'exp_123',
        tenantId: 'tenant_123',
        snapshotId: 'snap_123',
        exportType: 'issues_csv',
        format: 'csv',
        status: 'completed',
        requestedBy: 'user_123',
        errorCode: null,
        errorMessage: null,
        createdAt: '2024-01-15T10:00:00Z',
        completedAt: '2024-01-15T10:05:00Z',
      };

      const result = ExportSchema.safeParse(validExport);
      expect(result.success).toBe(true);
    });

    it('should validate ExportFile object', () => {
      const validFile = {
        id: 'expf_123',
        tenantId: 'tenant_123',
        exportId: 'exp_123',
        s3Key: 'exports/123/issues.csv',
        fileName: 'issues.csv',
        contentType: 'text/csv',
        sizeBytes: 1024,
        checksumSha256: 'abc123',
        createdAt: '2024-01-15T10:05:00Z',
      };

      const result = ExportFileSchema.safeParse(validFile);
      expect(result.success).toBe(true);
    });
  });

  describe('Digest Schema Validation', () => {
    it('should validate DigestSubscription object', () => {
      const validSubscription = {
        id: 'digs_123',
        tenantId: 'tenant_123',
        name: 'Weekly Digest',
        cadence: 'weekly',
        recipients: ['test@example.com'],
        isActive: true,
        createdBy: 'user_123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z',
      };

      const result = DigestSubscriptionSchema.safeParse(validSubscription);
      expect(result.success).toBe(true);
    });

    it('should validate DigestRun object', () => {
      const validRun = {
        id: 'digr_123',
        tenantId: 'tenant_123',
        subscriptionId: 'digs_123',
        status: 'completed',
        itemsCount: 10,
        recipientsCount: 5,
        emailsSent: 5,
        emailsFailed: 0,
        snapshotId: 'snap_123',
        periodStart: '2024-01-08T00:00:00Z',
        periodEnd: '2024-01-15T00:00:00Z',
        startedAt: '2024-01-15T06:00:00Z',
        finishedAt: '2024-01-15T06:01:00Z',
        errorCode: null,
        errorMessage: null,
        createdAt: '2024-01-15T06:00:00Z',
      };

      const result = DigestRunSchema.safeParse(validRun);
      expect(result.success).toBe(true);
    });
  });
});
