import { z } from 'zod';
import { type TenantId, type UserId } from './ids.js';
export declare const UserStatusSchema: z.ZodEnum<["active", "inactive", "suspended"]>;
export type UserStatus = z.infer<typeof UserStatusSchema>;
export declare const RoleNameSchema: z.ZodEnum<["Admin", "CFO", "Analyst"]>;
export type RoleName = z.infer<typeof RoleNameSchema>;
export declare const UserSchema: z.ZodObject<{
    id: z.ZodEffects<z.ZodString, UserId, string>;
    email: z.ZodString;
    name: z.ZodString;
    status: z.ZodEnum<["active", "inactive", "suspended"]>;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    status: "active" | "inactive" | "suspended";
    id: string & {
        readonly __nominal: "UserId";
    };
    name: string;
    email: string;
    createdAt: Date;
}, {
    status: "active" | "inactive" | "suspended";
    id: string;
    name: string;
    email: string;
    createdAt: Date;
}>;
export type User = z.infer<typeof UserSchema>;
export declare const CurrentUserSchema: z.ZodObject<{
    user: z.ZodObject<{
        id: z.ZodEffects<z.ZodString, UserId, string>;
        email: z.ZodString;
        name: z.ZodString;
        status: z.ZodEnum<["active", "inactive", "suspended"]>;
        createdAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        status: "active" | "inactive" | "suspended";
        id: string & {
            readonly __nominal: "UserId";
        };
        name: string;
        email: string;
        createdAt: Date;
    }, {
        status: "active" | "inactive" | "suspended";
        id: string;
        name: string;
        email: string;
        createdAt: Date;
    }>;
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    role: z.ZodEnum<["Admin", "CFO", "Analyst"]>;
    permissions: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    user: {
        status: "active" | "inactive" | "suspended";
        id: string & {
            readonly __nominal: "UserId";
        };
        name: string;
        email: string;
        createdAt: Date;
    };
    role: "Admin" | "CFO" | "Analyst";
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    permissions: string[];
}, {
    user: {
        status: "active" | "inactive" | "suspended";
        id: string;
        name: string;
        email: string;
        createdAt: Date;
    };
    role: "Admin" | "CFO" | "Analyst";
    tenantId: string;
    permissions: string[];
}>;
export type CurrentUser = z.infer<typeof CurrentUserSchema>;
export declare const TenantStatusSchema: z.ZodEnum<["active", "inactive", "trial"]>;
export type TenantStatus = z.infer<typeof TenantStatusSchema>;
export declare const TenantSchema: z.ZodObject<{
    id: z.ZodEffects<z.ZodString, TenantId, string>;
    name: z.ZodString;
    status: z.ZodEnum<["active", "inactive", "trial"]>;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    status: "active" | "inactive" | "trial";
    id: string & {
        readonly __nominal: "TenantId";
    };
    name: string;
    createdAt: Date;
}, {
    status: "active" | "inactive" | "trial";
    id: string;
    name: string;
    createdAt: Date;
}>;
export type Tenant = z.infer<typeof TenantSchema>;
export declare const CreateTenantRequestSchema: z.ZodObject<{
    name: z.ZodString;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<["active", "inactive", "trial"]>>>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "inactive" | "trial";
    name: string;
}, {
    name: string;
    status?: "active" | "inactive" | "trial" | undefined;
}>;
export type CreateTenantRequest = z.infer<typeof CreateTenantRequestSchema>;
export declare const CreateUserRequestSchema: z.ZodObject<{
    email: z.ZodString;
    name: z.ZodString;
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    role: z.ZodEnum<["Admin", "CFO", "Analyst"]>;
}, "strip", z.ZodTypeAny, {
    role: "Admin" | "CFO" | "Analyst";
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    name: string;
    email: string;
}, {
    role: "Admin" | "CFO" | "Analyst";
    tenantId: string;
    name: string;
    email: string;
}>;
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export declare const AuditActionSchema: z.ZodEnum<["tenant.create", "tenant.update", "user.create", "user.update", "user.delete", "job.enqueue", "job.complete", "export.generate", "auth.login", "auth.logout"]>;
export type AuditAction = z.infer<typeof AuditActionSchema>;
export declare const AuditLogSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodEffects<z.ZodString, TenantId, string>;
    actorUserId: z.ZodNullable<z.ZodEffects<z.ZodString, UserId, string>>;
    action: z.ZodEnum<["tenant.create", "tenant.update", "user.create", "user.update", "user.delete", "job.enqueue", "job.complete", "export.generate", "auth.login", "auth.logout"]>;
    resource: z.ZodNullable<z.ZodString>;
    metadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    requestId: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    actorUserId: UserId | null;
    requestId: string | null;
    action: "tenant.create" | "tenant.update" | "user.create" | "user.update" | "user.delete" | "job.enqueue" | "job.complete" | "export.generate" | "auth.login" | "auth.logout";
    resource: string | null;
}, {
    id: string;
    tenantId: string;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    actorUserId: string | null;
    requestId: string | null;
    action: "tenant.create" | "tenant.update" | "user.create" | "user.update" | "user.delete" | "job.enqueue" | "job.complete" | "export.generate" | "auth.login" | "auth.logout";
    resource: string | null;
}>;
export type AuditLog = z.infer<typeof AuditLogSchema>;
export declare const AuditLogQuerySchema: z.ZodObject<{
    action: z.ZodOptional<z.ZodEnum<["tenant.create", "tenant.update", "user.create", "user.update", "user.delete", "job.enqueue", "job.complete", "export.generate", "auth.login", "auth.logout"]>>;
    actorUserId: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    actorUserId?: string | undefined;
    action?: "tenant.create" | "tenant.update" | "user.create" | "user.update" | "user.delete" | "job.enqueue" | "job.complete" | "export.generate" | "auth.login" | "auth.logout" | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    limit?: number | undefined;
    offset?: number | undefined;
    actorUserId?: string | undefined;
    action?: "tenant.create" | "tenant.update" | "user.create" | "user.update" | "user.delete" | "job.enqueue" | "job.complete" | "export.generate" | "auth.login" | "auth.logout" | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;
export declare const IssueStatusSchema: z.ZodEnum<["Active", "Investigating", "Resolved", "False Positive"]>;
export type IssueStatus = z.infer<typeof IssueStatusSchema>;
export declare const IssueCategorySchema: z.ZodEnum<["Underbilling", "Missing Invoice", "Term Mismatch", "Renewal Gap"]>;
export type IssueCategory = z.infer<typeof IssueCategorySchema>;
export declare const IssueSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    impact: z.ZodNumber;
    confidence: z.ZodNumber;
    status: z.ZodEnum<["Active", "Investigating", "Resolved", "False Positive"]>;
    detectedAt: z.ZodString;
    sourceSystem: z.ZodString;
    category: z.ZodEnum<["Underbilling", "Missing Invoice", "Term Mismatch", "Renewal Gap"]>;
}, "strip", z.ZodTypeAny, {
    status: "Active" | "Investigating" | "Resolved" | "False Positive";
    id: string;
    description: string;
    confidence: number;
    category: "Underbilling" | "Missing Invoice" | "Term Mismatch" | "Renewal Gap";
    sourceSystem: string;
    title: string;
    impact: number;
    detectedAt: string;
}, {
    status: "Active" | "Investigating" | "Resolved" | "False Positive";
    id: string;
    description: string;
    confidence: number;
    category: "Underbilling" | "Missing Invoice" | "Term Mismatch" | "Renewal Gap";
    sourceSystem: string;
    title: string;
    impact: number;
    detectedAt: string;
}>;
export type Issue = z.infer<typeof IssueSchema>;
export { ContractStatusSchema as DbContractStatusSchema } from './canonical.js';
export declare const ApiContractStatusSchema: z.ZodEnum<["Active", "Renewal Risk", "Expired"]>;
export type ApiContractStatus = z.infer<typeof ApiContractStatusSchema>;
export declare const ContractTermSchema: z.ZodObject<{
    term: z.ZodString;
    extractedValue: z.ZodString;
    sourceClause: z.ZodString;
    confidence: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    term: string;
    confidence: number;
    extractedValue: string;
    sourceClause: string;
}, {
    term: string;
    confidence: number;
    extractedValue: string;
    sourceClause: string;
}>;
export type ContractTerm = z.infer<typeof ContractTermSchema>;
export declare const ContractSchema: z.ZodObject<{
    id: z.ZodString;
    customerName: z.ZodString;
    arr: z.ZodNumber;
    startDate: z.ZodString;
    status: z.ZodEnum<["Active", "Renewal Risk", "Expired"]>;
    ambiguities: z.ZodNumber;
    terms: z.ZodArray<z.ZodObject<{
        term: z.ZodString;
        extractedValue: z.ZodString;
        sourceClause: z.ZodString;
        confidence: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        term: string;
        confidence: number;
        extractedValue: string;
        sourceClause: string;
    }, {
        term: string;
        confidence: number;
        extractedValue: string;
        sourceClause: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    status: "Active" | "Renewal Risk" | "Expired";
    id: string;
    arr: number;
    startDate: string;
    customerName: string;
    ambiguities: number;
    terms: {
        term: string;
        confidence: number;
        extractedValue: string;
        sourceClause: string;
    }[];
}, {
    status: "Active" | "Renewal Risk" | "Expired";
    id: string;
    arr: number;
    startDate: string;
    customerName: string;
    ambiguities: number;
    terms: {
        term: string;
        confidence: number;
        extractedValue: string;
        sourceClause: string;
    }[];
}>;
export type Contract = z.infer<typeof ContractSchema>;
export declare const KPISchema: z.ZodObject<{
    label: z.ZodString;
    value: z.ZodString;
    change: z.ZodOptional<z.ZodString>;
    trend: z.ZodEnum<["up", "down", "neutral"]>;
    isCurrency: z.ZodOptional<z.ZodBoolean>;
    highlight: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    value: string;
    label: string;
    trend: "up" | "down" | "neutral";
    change?: string | undefined;
    isCurrency?: boolean | undefined;
    highlight?: boolean | undefined;
}, {
    value: string;
    label: string;
    trend: "up" | "down" | "neutral";
    change?: string | undefined;
    isCurrency?: boolean | undefined;
    highlight?: boolean | undefined;
}>;
export type KPI = z.infer<typeof KPISchema>;
export declare const IntegrationTypeSchema: z.ZodEnum<["CRM", "Billing", "Contract", "Usage"]>;
export type IntegrationType = z.infer<typeof IntegrationTypeSchema>;
export declare const IntegrationStatusSchema: z.ZodEnum<["Healthy", "Syncing", "Error", "Partial"]>;
export type IntegrationStatus = z.infer<typeof IntegrationStatusSchema>;
export declare const IntegrationSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<["CRM", "Billing", "Contract", "Usage"]>;
    status: z.ZodEnum<["Healthy", "Syncing", "Error", "Partial"]>;
    lastSync: z.ZodString;
    coverage: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "CRM" | "Billing" | "Contract" | "Usage";
    status: "Healthy" | "Syncing" | "Error" | "Partial";
    id: string;
    name: string;
    lastSync: string;
    coverage: number;
}, {
    type: "CRM" | "Billing" | "Contract" | "Usage";
    status: "Healthy" | "Syncing" | "Error" | "Partial";
    id: string;
    name: string;
    lastSync: string;
    coverage: number;
}>;
export type Integration = z.infer<typeof IntegrationSchema>;
export declare const ApiErrorSchema: z.ZodObject<{
    error: z.ZodString;
    message: z.ZodString;
    statusCode: z.ZodNumber;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    error: string;
    message: string;
    statusCode: number;
    details?: Record<string, unknown> | undefined;
}, {
    error: string;
    message: string;
    statusCode: number;
    details?: Record<string, unknown> | undefined;
}>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export declare function createPaginatedSchema<T extends z.ZodTypeAny>(itemSchema: T): z.ZodObject<{
    items: z.ZodArray<T, "many">;
    total: z.ZodNumber;
    limit: z.ZodNumber;
    offset: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    total: number;
    items: T["_output"][];
}, {
    limit: number;
    offset: number;
    total: number;
    items: T["_input"][];
}>;
//# sourceMappingURL=api.d.ts.map