/**
 * Upload Schemas
 *
 * Zod schemas for CSV/PDF upload validation.
 */
import { z } from 'zod';
export declare function createUploadId(): string;
export declare function createUploadFileId(): string;
export declare function createUploadMappingId(): string;
export declare function createParseRunId(): string;
export declare function createParseErrorId(): string;
export declare const UploadTypeSchema: z.ZodEnum<["csv", "pdf"]>;
export type UploadType = z.infer<typeof UploadTypeSchema>;
export declare const UploadStatusSchema: z.ZodEnum<["pending", "uploading", "processing", "completed", "failed"]>;
export type UploadStatus = z.infer<typeof UploadStatusSchema>;
export declare const ParseRunStatusSchema: z.ZodEnum<["pending", "running", "completed", "failed"]>;
export type ParseRunStatus = z.infer<typeof ParseRunStatusSchema>;
export declare const UploadEntityTypeSchema: z.ZodEnum<["customer", "invoice", "contract", "payment", "product"]>;
export type UploadEntityType = z.infer<typeof UploadEntityTypeSchema>;
export declare const ColumnMappingSchema: z.ZodObject<{
    sourceColumn: z.ZodString;
    targetField: z.ZodString;
    transform: z.ZodOptional<z.ZodEnum<["none", "date", "number", "boolean", "lowercase", "uppercase", "trim"]>>;
    defaultValue: z.ZodOptional<z.ZodString>;
    required: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    sourceColumn: string;
    targetField: string;
    transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
    defaultValue?: string | undefined;
    required?: boolean | undefined;
}, {
    sourceColumn: string;
    targetField: string;
    transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
    defaultValue?: string | undefined;
    required?: boolean | undefined;
}>;
export type ColumnMapping = z.infer<typeof ColumnMappingSchema>;
export declare const UploadMappingSchema: z.ZodObject<{
    entityType: z.ZodEnum<["customer", "invoice", "contract", "payment", "product"]>;
    columns: z.ZodArray<z.ZodObject<{
        sourceColumn: z.ZodString;
        targetField: z.ZodString;
        transform: z.ZodOptional<z.ZodEnum<["none", "date", "number", "boolean", "lowercase", "uppercase", "trim"]>>;
        defaultValue: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        sourceColumn: string;
        targetField: string;
        transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
        defaultValue?: string | undefined;
        required?: boolean | undefined;
    }, {
        sourceColumn: string;
        targetField: string;
        transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
        defaultValue?: string | undefined;
        required?: boolean | undefined;
    }>, "many">;
    skipHeaderRow: z.ZodDefault<z.ZodBoolean>;
    delimiter: z.ZodDefault<z.ZodString>;
    dateFormat: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    entityType: "customer" | "invoice" | "contract" | "payment" | "product";
    columns: {
        sourceColumn: string;
        targetField: string;
        transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
        defaultValue?: string | undefined;
        required?: boolean | undefined;
    }[];
    skipHeaderRow: boolean;
    delimiter: string;
    dateFormat?: string | undefined;
}, {
    entityType: "customer" | "invoice" | "contract" | "payment" | "product";
    columns: {
        sourceColumn: string;
        targetField: string;
        transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
        defaultValue?: string | undefined;
        required?: boolean | undefined;
    }[];
    skipHeaderRow?: boolean | undefined;
    delimiter?: string | undefined;
    dateFormat?: string | undefined;
}>;
export type UploadMappingData = z.infer<typeof UploadMappingSchema>;
export declare const TemplateColumnSchema: z.ZodObject<{
    name: z.ZodString;
    label: z.ZodString;
    required: z.ZodBoolean;
    type: z.ZodEnum<["string", "number", "date", "email", "boolean"]>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "string" | "number" | "boolean" | "date" | "email";
    required: boolean;
    name: string;
    label: string;
    description?: string | undefined;
}, {
    type: "string" | "number" | "boolean" | "date" | "email";
    required: boolean;
    name: string;
    label: string;
    description?: string | undefined;
}>;
export type TemplateColumn = z.infer<typeof TemplateColumnSchema>;
export declare const ParseStatsSchema: z.ZodObject<{
    total_rows: z.ZodDefault<z.ZodNumber>;
    valid_rows: z.ZodDefault<z.ZodNumber>;
    error_rows: z.ZodDefault<z.ZodNumber>;
    skipped_rows: z.ZodDefault<z.ZodNumber>;
    duration_ms: z.ZodOptional<z.ZodNumber>;
    batches_created: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    total_rows: number;
    valid_rows: number;
    error_rows: number;
    skipped_rows: number;
    batches_created: number;
    duration_ms?: number | undefined;
}, {
    duration_ms?: number | undefined;
    total_rows?: number | undefined;
    valid_rows?: number | undefined;
    error_rows?: number | undefined;
    skipped_rows?: number | undefined;
    batches_created?: number | undefined;
}>;
export type ParseStats = z.infer<typeof ParseStatsSchema>;
export declare const StartUploadRequestSchema: z.ZodObject<{
    type: z.ZodEnum<["csv", "pdf"]>;
    fileName: z.ZodString;
    contentType: z.ZodString;
    fileSize: z.ZodOptional<z.ZodNumber>;
    entityType: z.ZodOptional<z.ZodEnum<["customer", "invoice", "contract", "payment", "product"]>>;
    displayName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "csv" | "pdf";
    fileName: string;
    contentType: string;
    entityType?: "customer" | "invoice" | "contract" | "payment" | "product" | undefined;
    fileSize?: number | undefined;
    displayName?: string | undefined;
}, {
    type: "csv" | "pdf";
    fileName: string;
    contentType: string;
    entityType?: "customer" | "invoice" | "contract" | "payment" | "product" | undefined;
    fileSize?: number | undefined;
    displayName?: string | undefined;
}>;
export type StartUploadRequest = z.infer<typeof StartUploadRequestSchema>;
export declare const CompleteUploadRequestSchema: z.ZodObject<{
    uploadId: z.ZodString;
    mapping: z.ZodOptional<z.ZodObject<{
        entityType: z.ZodEnum<["customer", "invoice", "contract", "payment", "product"]>;
        columns: z.ZodArray<z.ZodObject<{
            sourceColumn: z.ZodString;
            targetField: z.ZodString;
            transform: z.ZodOptional<z.ZodEnum<["none", "date", "number", "boolean", "lowercase", "uppercase", "trim"]>>;
            defaultValue: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            sourceColumn: string;
            targetField: string;
            transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
            defaultValue?: string | undefined;
            required?: boolean | undefined;
        }, {
            sourceColumn: string;
            targetField: string;
            transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
            defaultValue?: string | undefined;
            required?: boolean | undefined;
        }>, "many">;
        skipHeaderRow: z.ZodDefault<z.ZodBoolean>;
        delimiter: z.ZodDefault<z.ZodString>;
        dateFormat: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        entityType: "customer" | "invoice" | "contract" | "payment" | "product";
        columns: {
            sourceColumn: string;
            targetField: string;
            transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
            defaultValue?: string | undefined;
            required?: boolean | undefined;
        }[];
        skipHeaderRow: boolean;
        delimiter: string;
        dateFormat?: string | undefined;
    }, {
        entityType: "customer" | "invoice" | "contract" | "payment" | "product";
        columns: {
            sourceColumn: string;
            targetField: string;
            transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
            defaultValue?: string | undefined;
            required?: boolean | undefined;
        }[];
        skipHeaderRow?: boolean | undefined;
        delimiter?: string | undefined;
        dateFormat?: string | undefined;
    }>>;
    autoProcess: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    uploadId: string;
    autoProcess: boolean;
    mapping?: {
        entityType: "customer" | "invoice" | "contract" | "payment" | "product";
        columns: {
            sourceColumn: string;
            targetField: string;
            transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
            defaultValue?: string | undefined;
            required?: boolean | undefined;
        }[];
        skipHeaderRow: boolean;
        delimiter: string;
        dateFormat?: string | undefined;
    } | undefined;
}, {
    uploadId: string;
    mapping?: {
        entityType: "customer" | "invoice" | "contract" | "payment" | "product";
        columns: {
            sourceColumn: string;
            targetField: string;
            transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
            defaultValue?: string | undefined;
            required?: boolean | undefined;
        }[];
        skipHeaderRow?: boolean | undefined;
        delimiter?: string | undefined;
        dateFormat?: string | undefined;
    } | undefined;
    autoProcess?: boolean | undefined;
}>;
export type CompleteUploadRequest = z.infer<typeof CompleteUploadRequestSchema>;
export declare const ListUploadsQuerySchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodEnum<["csv", "pdf"]>>;
    status: z.ZodOptional<z.ZodEnum<["pending", "uploading", "processing", "completed", "failed"]>>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    type?: "csv" | "pdf" | undefined;
    status?: "pending" | "completed" | "failed" | "uploading" | "processing" | undefined;
}, {
    type?: "csv" | "pdf" | undefined;
    status?: "pending" | "completed" | "failed" | "uploading" | "processing" | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}>;
export type ListUploadsQuery = z.infer<typeof ListUploadsQuerySchema>;
export declare const CsvParseJobPayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<"upload.csv.parse">;
    tenantId: z.ZodString;
    uploadId: z.ZodString;
    fileId: z.ZodString;
    parseRunId: z.ZodString;
    mapping: z.ZodOptional<z.ZodObject<{
        entityType: z.ZodEnum<["customer", "invoice", "contract", "payment", "product"]>;
        columns: z.ZodArray<z.ZodObject<{
            sourceColumn: z.ZodString;
            targetField: z.ZodString;
            transform: z.ZodOptional<z.ZodEnum<["none", "date", "number", "boolean", "lowercase", "uppercase", "trim"]>>;
            defaultValue: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            sourceColumn: string;
            targetField: string;
            transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
            defaultValue?: string | undefined;
            required?: boolean | undefined;
        }, {
            sourceColumn: string;
            targetField: string;
            transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
            defaultValue?: string | undefined;
            required?: boolean | undefined;
        }>, "many">;
        skipHeaderRow: z.ZodDefault<z.ZodBoolean>;
        delimiter: z.ZodDefault<z.ZodString>;
        dateFormat: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        entityType: "customer" | "invoice" | "contract" | "payment" | "product";
        columns: {
            sourceColumn: string;
            targetField: string;
            transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
            defaultValue?: string | undefined;
            required?: boolean | undefined;
        }[];
        skipHeaderRow: boolean;
        delimiter: string;
        dateFormat?: string | undefined;
    }, {
        entityType: "customer" | "invoice" | "contract" | "payment" | "product";
        columns: {
            sourceColumn: string;
            targetField: string;
            transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
            defaultValue?: string | undefined;
            required?: boolean | undefined;
        }[];
        skipHeaderRow?: boolean | undefined;
        delimiter?: string | undefined;
        dateFormat?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "upload.csv.parse";
    tenantId: string;
    uploadId: string;
    fileId: string;
    parseRunId: string;
    mapping?: {
        entityType: "customer" | "invoice" | "contract" | "payment" | "product";
        columns: {
            sourceColumn: string;
            targetField: string;
            transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
            defaultValue?: string | undefined;
            required?: boolean | undefined;
        }[];
        skipHeaderRow: boolean;
        delimiter: string;
        dateFormat?: string | undefined;
    } | undefined;
}, {
    type: "upload.csv.parse";
    tenantId: string;
    uploadId: string;
    fileId: string;
    parseRunId: string;
    mapping?: {
        entityType: "customer" | "invoice" | "contract" | "payment" | "product";
        columns: {
            sourceColumn: string;
            targetField: string;
            transform?: "number" | "boolean" | "date" | "none" | "lowercase" | "uppercase" | "trim" | undefined;
            defaultValue?: string | undefined;
            required?: boolean | undefined;
        }[];
        skipHeaderRow?: boolean | undefined;
        delimiter?: string | undefined;
        dateFormat?: string | undefined;
    } | undefined;
}>;
export type CsvParseJobPayload = z.infer<typeof CsvParseJobPayloadSchema>;
export declare const CsvFinalizeJobPayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<"upload.csv.finalize">;
    tenantId: z.ZodString;
    uploadId: z.ZodString;
    parseRunId: z.ZodString;
    triggerIngestion: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "upload.csv.finalize";
    tenantId: string;
    uploadId: string;
    parseRunId: string;
    triggerIngestion: boolean;
}, {
    type: "upload.csv.finalize";
    tenantId: string;
    uploadId: string;
    parseRunId: string;
    triggerIngestion?: boolean | undefined;
}>;
export type CsvFinalizeJobPayload = z.infer<typeof CsvFinalizeJobPayloadSchema>;
export declare const PdfParseJobPayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<"upload.pdf.parse">;
    tenantId: z.ZodString;
    uploadId: z.ZodString;
    fileId: z.ZodString;
    parseRunId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "upload.pdf.parse";
    tenantId: string;
    uploadId: string;
    fileId: string;
    parseRunId: string;
}, {
    type: "upload.pdf.parse";
    tenantId: string;
    uploadId: string;
    fileId: string;
    parseRunId: string;
}>;
export type PdfParseJobPayload = z.infer<typeof PdfParseJobPayloadSchema>;
export declare const CustomerRowSchema: z.ZodObject<{
    external_id: z.ZodString;
    name: z.ZodString;
    email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    phone: z.ZodOptional<z.ZodString>;
    billing_address: z.ZodOptional<z.ZodString>;
    tax_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    external_id: string;
    tax_id?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    billing_address?: string | undefined;
}, {
    name: string;
    external_id: string;
    tax_id?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    billing_address?: string | undefined;
}>;
export type CustomerRow = z.infer<typeof CustomerRowSchema>;
export declare const InvoiceRowSchema: z.ZodObject<{
    external_id: z.ZodString;
    customer_id: z.ZodString;
    invoice_date: z.ZodString;
    due_date: z.ZodOptional<z.ZodString>;
    total: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    total: number;
    external_id: string;
    customer_id: string;
    invoice_date: string;
    currency: string;
    status?: string | undefined;
    due_date?: string | undefined;
}, {
    total: number;
    external_id: string;
    customer_id: string;
    invoice_date: string;
    status?: string | undefined;
    due_date?: string | undefined;
    currency?: string | undefined;
}>;
export type InvoiceRow = z.infer<typeof InvoiceRowSchema>;
export declare const ContractRowSchema: z.ZodObject<{
    external_id: z.ZodString;
    customer_id: z.ZodString;
    name: z.ZodString;
    start_date: z.ZodString;
    end_date: z.ZodOptional<z.ZodString>;
    value: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    external_id: string;
    customer_id: string;
    start_date: string;
    value?: number | undefined;
    status?: string | undefined;
    end_date?: string | undefined;
}, {
    name: string;
    external_id: string;
    customer_id: string;
    start_date: string;
    value?: number | undefined;
    status?: string | undefined;
    end_date?: string | undefined;
}>;
export type ContractRow = z.infer<typeof ContractRowSchema>;
export declare function getRowSchemaForEntity(entityType: UploadEntityType): z.ZodObject<{
    external_id: z.ZodString;
    name: z.ZodString;
    email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    phone: z.ZodOptional<z.ZodString>;
    billing_address: z.ZodOptional<z.ZodString>;
    tax_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    external_id: string;
    tax_id?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    billing_address?: string | undefined;
}, {
    name: string;
    external_id: string;
    tax_id?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    billing_address?: string | undefined;
}> | z.ZodObject<{
    external_id: z.ZodString;
    customer_id: z.ZodString;
    invoice_date: z.ZodString;
    due_date: z.ZodOptional<z.ZodString>;
    total: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    total: number;
    external_id: string;
    customer_id: string;
    invoice_date: string;
    currency: string;
    status?: string | undefined;
    due_date?: string | undefined;
}, {
    total: number;
    external_id: string;
    customer_id: string;
    invoice_date: string;
    status?: string | undefined;
    due_date?: string | undefined;
    currency?: string | undefined;
}> | z.ZodObject<{
    external_id: z.ZodString;
    customer_id: z.ZodString;
    name: z.ZodString;
    start_date: z.ZodString;
    end_date: z.ZodOptional<z.ZodString>;
    value: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    external_id: string;
    customer_id: string;
    start_date: string;
    value?: number | undefined;
    status?: string | undefined;
    end_date?: string | undefined;
}, {
    name: string;
    external_id: string;
    customer_id: string;
    start_date: string;
    value?: number | undefined;
    status?: string | undefined;
    end_date?: string | undefined;
}> | z.ZodRecord<z.ZodString, z.ZodUnknown>;
/**
 * HTTP 429 Response when queue is full (backpressure)
 */
export declare const UploadQueueFullErrorSchema: z.ZodObject<{
    error: z.ZodLiteral<"Too Many Requests">;
    message: z.ZodString;
    retryAfter: z.ZodOptional<z.ZodNumber>;
    queueDepth: z.ZodNumber;
    queueLimit: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    error: "Too Many Requests";
    message: string;
    queueDepth: number;
    queueLimit: number;
    retryAfter?: number | undefined;
}, {
    error: "Too Many Requests";
    message: string;
    queueDepth: number;
    queueLimit: number;
    retryAfter?: number | undefined;
}>;
export type UploadQueueFullError = z.infer<typeof UploadQueueFullErrorSchema>;
//# sourceMappingURL=uploads.d.ts.map