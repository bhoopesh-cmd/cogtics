/**
 * Upload Schemas
 * 
 * Zod schemas for CSV/PDF upload validation.
 */
import { z } from 'zod';

// ============================================
// ID Generators
// ============================================

export function createUploadId(): string {
  return `upl_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`;
}

export function createUploadFileId(): string {
  return `uplf_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`;
}

export function createUploadMappingId(): string {
  return `uplm_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`;
}

export function createParseRunId(): string {
  return `prun_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`;
}

export function createParseErrorId(): string {
  return `perr_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`;
}

// ============================================
// Upload Type Schema
// ============================================

export const UploadTypeSchema = z.enum(['csv', 'pdf']);
export type UploadType = z.infer<typeof UploadTypeSchema>;

// ============================================
// Upload Status Schema
// ============================================

export const UploadStatusSchema = z.enum(['pending', 'uploading', 'processing', 'completed', 'failed']);
export type UploadStatus = z.infer<typeof UploadStatusSchema>;

// ============================================
// Parse Run Status Schema
// ============================================

export const ParseRunStatusSchema = z.enum(['pending', 'running', 'completed', 'failed']);
export type ParseRunStatus = z.infer<typeof ParseRunStatusSchema>;

// ============================================
// Entity Type Schema
// ============================================

export const UploadEntityTypeSchema = z.enum(['customer', 'invoice', 'contract', 'payment', 'product']);
export type UploadEntityType = z.infer<typeof UploadEntityTypeSchema>;

// ============================================
// Column Mapping Schema
// ============================================

export const ColumnMappingSchema = z.object({
  sourceColumn: z.string().min(1),
  targetField: z.string().min(1),
  transform: z.enum(['none', 'date', 'number', 'boolean', 'lowercase', 'uppercase', 'trim']).optional(),
  defaultValue: z.string().optional(),
  required: z.boolean().optional(),
});

export type ColumnMapping = z.infer<typeof ColumnMappingSchema>;

export const UploadMappingSchema = z.object({
  entityType: UploadEntityTypeSchema,
  columns: z.array(ColumnMappingSchema),
  skipHeaderRow: z.boolean().default(true),
  delimiter: z.string().default(','),
  dateFormat: z.string().optional(),
});

export type UploadMappingData = z.infer<typeof UploadMappingSchema>;

// ============================================
// Template Column Schema
// ============================================

export const TemplateColumnSchema = z.object({
  name: z.string(),
  label: z.string(),
  required: z.boolean(),
  type: z.enum(['string', 'number', 'date', 'email', 'boolean']),
  description: z.string().optional(),
});

export type TemplateColumn = z.infer<typeof TemplateColumnSchema>;

// ============================================
// Parse Stats Schema
// ============================================

export const ParseStatsSchema = z.object({
  total_rows: z.number().default(0),
  valid_rows: z.number().default(0),
  error_rows: z.number().default(0),
  skipped_rows: z.number().default(0),
  duration_ms: z.number().optional(),
  batches_created: z.number().default(0),
});

export type ParseStats = z.infer<typeof ParseStatsSchema>;

// ============================================
// API Request Schemas
// ============================================

export const StartUploadRequestSchema = z.object({
  type: UploadTypeSchema,
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1),
  fileSize: z.number().int().nonnegative().optional(),
  entityType: UploadEntityTypeSchema.optional(),
  displayName: z.string().max(255).optional(),
});

export type StartUploadRequest = z.infer<typeof StartUploadRequestSchema>;

export const CompleteUploadRequestSchema = z.object({
  uploadId: z.string().min(1),
  mapping: UploadMappingSchema.optional(),
  autoProcess: z.boolean().default(true),
});

export type CompleteUploadRequest = z.infer<typeof CompleteUploadRequestSchema>;

export const ListUploadsQuerySchema = z.object({
  type: UploadTypeSchema.optional(),
  status: UploadStatusSchema.optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export type ListUploadsQuery = z.infer<typeof ListUploadsQuerySchema>;

// ============================================
// Job Payload Schemas
// ============================================

export const CsvParseJobPayloadSchema = z.object({
  type: z.literal('upload.csv.parse'),
  tenantId: z.string(),
  uploadId: z.string(),
  fileId: z.string(),
  parseRunId: z.string(),
  mapping: UploadMappingSchema.optional(),
});

export type CsvParseJobPayload = z.infer<typeof CsvParseJobPayloadSchema>;

export const CsvFinalizeJobPayloadSchema = z.object({
  type: z.literal('upload.csv.finalize'),
  tenantId: z.string(),
  uploadId: z.string(),
  parseRunId: z.string(),
  triggerIngestion: z.boolean().default(false),
});

export type CsvFinalizeJobPayload = z.infer<typeof CsvFinalizeJobPayloadSchema>;

export const PdfParseJobPayloadSchema = z.object({
  type: z.literal('upload.pdf.parse'),
  tenantId: z.string(),
  uploadId: z.string(),
  fileId: z.string(),
  parseRunId: z.string(),
});

export type PdfParseJobPayload = z.infer<typeof PdfParseJobPayloadSchema>;

// ============================================
// CSV Row Validation Schemas
// ============================================

export const CustomerRowSchema = z.object({
  external_id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  billing_address: z.string().optional(),
  tax_id: z.string().optional(),
});

export type CustomerRow = z.infer<typeof CustomerRowSchema>;

export const InvoiceRowSchema = z.object({
  external_id: z.string().min(1),
  customer_id: z.string().min(1),
  invoice_date: z.string().min(1),
  due_date: z.string().optional(),
  total: z.coerce.number(),
  currency: z.string().default('USD'),
  status: z.string().optional(),
});

export type InvoiceRow = z.infer<typeof InvoiceRowSchema>;

export const ContractRowSchema = z.object({
  external_id: z.string().min(1),
  customer_id: z.string().min(1),
  name: z.string().min(1),
  start_date: z.string().min(1),
  end_date: z.string().optional(),
  value: z.coerce.number().optional(),
  status: z.string().optional(),
});

export type ContractRow = z.infer<typeof ContractRowSchema>;

// Row schema selector
export function getRowSchemaForEntity(entityType: UploadEntityType) {
  switch (entityType) {
    case 'customer':
      return CustomerRowSchema;
    case 'invoice':
      return InvoiceRowSchema;
    case 'contract':
      return ContractRowSchema;
    default:
      return z.record(z.unknown());
  }
}
