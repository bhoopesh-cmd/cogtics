import { z } from 'zod';
import { TenantIdSchema, UserIdSchema, RoleIdSchema, type TenantId, type UserId } from './ids.js';

// ============================================
// User & Auth Schemas
// ============================================

export const UserStatusSchema = z.enum(['active', 'inactive', 'suspended']);
export type UserStatus = z.infer<typeof UserStatusSchema>;

export const RoleNameSchema = z.enum(['Admin', 'CFO', 'Analyst']);
export type RoleName = z.infer<typeof RoleNameSchema>;

export const UserSchema = z.object({
  id: UserIdSchema,
  email: z.string().email(),
  name: z.string().min(1).max(255),
  status: UserStatusSchema,
  createdAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

// Current user context (GET /me response)
export const CurrentUserSchema = z.object({
  user: UserSchema,
  tenantId: TenantIdSchema,
  role: RoleNameSchema,
  permissions: z.array(z.string()),
});

export type CurrentUser = z.infer<typeof CurrentUserSchema>;

// ============================================
// Tenant Schemas
// ============================================

export const TenantStatusSchema = z.enum(['active', 'inactive', 'trial']);
export type TenantStatus = z.infer<typeof TenantStatusSchema>;

export const TenantSchema = z.object({
  id: TenantIdSchema,
  name: z.string().min(1).max(255),
  status: TenantStatusSchema,
  createdAt: z.date(),
});

export type Tenant = z.infer<typeof TenantSchema>;

export const CreateTenantRequestSchema = z.object({
  name: z.string().min(1).max(255),
  status: TenantStatusSchema.optional().default('active'),
});

export type CreateTenantRequest = z.infer<typeof CreateTenantRequestSchema>;

// ============================================
// User Management Schemas
// ============================================

export const CreateUserRequestSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  tenantId: TenantIdSchema,
  role: RoleNameSchema,
});

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

// ============================================
// Audit Log Schemas
// ============================================

export const AuditActionSchema = z.enum([
  'tenant.create',
  'tenant.update',
  'user.create',
  'user.update',
  'user.delete',
  'job.enqueue',
  'job.complete',
  'export.generate',
  'auth.login',
  'auth.logout',
]);

export type AuditAction = z.infer<typeof AuditActionSchema>;

export const AuditLogSchema = z.object({
  id: z.string(),
  tenantId: TenantIdSchema,
  actorUserId: UserIdSchema.nullable(),
  action: AuditActionSchema,
  resource: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  requestId: z.string().nullable(),
  createdAt: z.date(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

export const AuditLogQuerySchema = z.object({
  action: AuditActionSchema.optional(),
  actorUserId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;

// ============================================
// Issue Schemas (matching frontend)
// ============================================

export const IssueStatusSchema = z.enum(['Active', 'Investigating', 'Resolved', 'False Positive']);
export type IssueStatus = z.infer<typeof IssueStatusSchema>;

export const IssueCategorySchema = z.enum([
  'Underbilling',
  'Missing Invoice',
  'Term Mismatch',
  'Renewal Gap',
]);
export type IssueCategory = z.infer<typeof IssueCategorySchema>;

export const IssueSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  impact: z.number(), // Financial impact in USD
  confidence: z.number().min(0).max(100),
  status: IssueStatusSchema,
  detectedAt: z.string(),
  sourceSystem: z.string(),
  category: IssueCategorySchema,
});

export type Issue = z.infer<typeof IssueSchema>;

// ============================================
// Re-exported status schemas (from canonical.js, for API route convenience)
// ============================================

// Alias for contracts status with different name to avoid confusion with frontend display status
export { ContractStatusSchema as DbContractStatusSchema } from './canonical.js';

// ============================================
// Contract Schemas (matching frontend)
// ============================================

export const ApiContractStatusSchema = z.enum(['Active', 'Renewal Risk', 'Expired']);
export type ApiContractStatus = z.infer<typeof ApiContractStatusSchema>;

export const ContractTermSchema = z.object({
  term: z.string(),
  extractedValue: z.string(),
  sourceClause: z.string(),
  confidence: z.number().min(0).max(100),
});

export type ContractTerm = z.infer<typeof ContractTermSchema>;

export const ContractSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  arr: z.number(),
  startDate: z.string(),
  status: ApiContractStatusSchema,
  ambiguities: z.number(),
  terms: z.array(ContractTermSchema),
});

export type Contract = z.infer<typeof ContractSchema>;

// ============================================
// KPI Schemas (matching frontend)
// ============================================

export const KPISchema = z.object({
  label: z.string(),
  value: z.string(),
  change: z.string().optional(),
  trend: z.enum(['up', 'down', 'neutral']),
  isCurrency: z.boolean().optional(),
  highlight: z.boolean().optional(),
});

export type KPI = z.infer<typeof KPISchema>;

// ============================================
// Integration Schemas (matching frontend)
// ============================================

export const IntegrationTypeSchema = z.enum(['CRM', 'Billing', 'Contract', 'Usage']);
export type IntegrationType = z.infer<typeof IntegrationTypeSchema>;

export const IntegrationStatusSchema = z.enum(['Healthy', 'Syncing', 'Error', 'Partial']);
export type IntegrationStatus = z.infer<typeof IntegrationStatusSchema>;

export const IntegrationSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: IntegrationTypeSchema,
  status: IntegrationStatusSchema,
  lastSync: z.string(),
  coverage: z.number().min(0).max(100),
});

export type Integration = z.infer<typeof IntegrationSchema>;

// ============================================
// API Response Wrappers
// ============================================

export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  statusCode: z.number(),
  details: z.record(z.unknown()).optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export function createPaginatedSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  });
}

