import { z } from 'zod';

// Branded types for type-safe IDs
// Using nominal typing pattern that works with TypeScript declaration emit
type Nominal<T, Brand extends string> = T & { readonly __nominal: Brand };

export type TenantId = Nominal<string, 'TenantId'>;
export type UserId = Nominal<string, 'UserId'>;
export type RequestId = Nominal<string, 'RequestId'>;
export type JobId = Nominal<string, 'JobId'>;
export type RoleId = Nominal<string, 'RoleId'>;
export type PermissionId = Nominal<string, 'PermissionId'>;
export type MembershipId = Nominal<string, 'MembershipId'>;
export type AuditLogId = Nominal<string, 'AuditLogId'>;
export type IdempotencyKeyId = Nominal<string, 'IdempotencyKeyId'>;
export type StorageObjectId = Nominal<string, 'StorageObjectId'>;
export type ContractId = Nominal<string, 'ContractId'>;
export type IssueId = Nominal<string, 'IssueId'>;
export type SimulationId = Nominal<string, 'SimulationId'>;
export type SnapshotId = Nominal<string, 'SnapshotId'>;
export type SyncRunId = Nominal<string, 'SyncRunId'>;
export type StagingRecordId = Nominal<string, 'StagingRecordId'>;
export type CustomerId = Nominal<string, 'CustomerId'>;
export type ContractVersionId = Nominal<string, 'ContractVersionId'>;
export type ContractTermId = Nominal<string, 'ContractTermId'>;
export type InvoiceId = Nominal<string, 'InvoiceId'>;
export type InvoiceLineId = Nominal<string, 'InvoiceLineId'>;
export type ProductId = Nominal<string, 'ProductId'>;
export type PaymentId = Nominal<string, 'PaymentId'>;
export type UsageEventId = Nominal<string, 'UsageEventId'>;
export type PricePlanId = Nominal<string, 'PricePlanId'>;

// ID prefix patterns for validation
const ID_PATTERNS = {
  tenant: /^tenant_[a-zA-Z0-9]+$/,
  user: /^user_[a-zA-Z0-9]+$/,
  request: /^req_[a-zA-Z0-9]+$/,
  job: /^job_[a-zA-Z0-9]+$/,
  role: /^role_[a-zA-Z0-9]+$/,
  permission: /^perm_[a-zA-Z0-9]+$/,
  membership: /^mem_[a-zA-Z0-9]+$/,
  audit: /^audit_[a-zA-Z0-9]+$/,
  idempotency: /^idem_[a-zA-Z0-9]+$/,
  storage: /^obj_[a-zA-Z0-9]+$/,
  contract: /^ctr_[a-zA-Z0-9]+$/,
  issue: /^iss_[a-zA-Z0-9]+$/,
  simulation: /^sim_[a-zA-Z0-9]+$/,
  snapshot: /^snap_[a-zA-Z0-9]+$/,
  syncRun: /^srun_[a-zA-Z0-9]+$/,
  stagingRecord: /^stg_[a-zA-Z0-9]+$/,
  customer: /^cust_[a-zA-Z0-9]+$/,
  contractVersion: /^ctrv_[a-zA-Z0-9]+$/,
  contractTerm: /^term_[a-zA-Z0-9]+$/,
  invoice: /^inv_[a-zA-Z0-9]+$/,
  invoiceLine: /^invl_[a-zA-Z0-9]+$/,
  product: /^prod_[a-zA-Z0-9]+$/,
  payment: /^pay_[a-zA-Z0-9]+$/,
  usageEvent: /^usg_[a-zA-Z0-9]+$/,
  pricePlan: /^price_[a-zA-Z0-9]+$/,
} as const;

// Zod schemas for ID validation
export const TenantIdSchema = z
  .string()
  .regex(ID_PATTERNS.tenant, 'Invalid tenant ID format')
  .transform((v) => v as TenantId);

export const UserIdSchema = z
  .string()
  .regex(ID_PATTERNS.user, 'Invalid user ID format')
  .transform((v) => v as UserId);

export const RequestIdSchema = z
  .string()
  .regex(ID_PATTERNS.request, 'Invalid request ID format')
  .transform((v) => v as RequestId);

export const JobIdSchema = z
  .string()
  .regex(ID_PATTERNS.job, 'Invalid job ID format')
  .transform((v) => v as JobId);

export const RoleIdSchema = z
  .string()
  .regex(ID_PATTERNS.role, 'Invalid role ID format')
  .transform((v) => v as RoleId);

export const PermissionIdSchema = z
  .string()
  .regex(ID_PATTERNS.permission, 'Invalid permission ID format')
  .transform((v) => v as PermissionId);

export const ContractIdSchema = z
  .string()
  .regex(ID_PATTERNS.contract, 'Invalid contract ID format')
  .transform((v) => v as ContractId);

export const IssueIdSchema = z
  .string()
  .regex(ID_PATTERNS.issue, 'Invalid issue ID format')
  .transform((v) => v as IssueId);

export const SimulationIdSchema = z
  .string()
  .regex(ID_PATTERNS.simulation, 'Invalid simulation ID format')
  .transform((v) => v as SimulationId);

export const SnapshotIdSchema = z
  .string()
  .regex(ID_PATTERNS.snapshot, 'Invalid snapshot ID format')
  .transform((v) => v as SnapshotId);

export const SyncRunIdSchema = z
  .string()
  .regex(ID_PATTERNS.syncRun, 'Invalid sync run ID format')
  .transform((v) => v as SyncRunId);

export const StagingRecordIdSchema = z
  .string()
  .regex(ID_PATTERNS.stagingRecord, 'Invalid staging record ID format')
  .transform((v) => v as StagingRecordId);

export const CustomerIdSchema = z
  .string()
  .regex(ID_PATTERNS.customer, 'Invalid customer ID format')
  .transform((v) => v as CustomerId);

export const ContractVersionIdSchema = z
  .string()
  .regex(ID_PATTERNS.contractVersion, 'Invalid contract version ID format')
  .transform((v) => v as ContractVersionId);

export const ContractTermIdSchema = z
  .string()
  .regex(ID_PATTERNS.contractTerm, 'Invalid contract term ID format')
  .transform((v) => v as ContractTermId);

export const InvoiceIdSchema = z
  .string()
  .regex(ID_PATTERNS.invoice, 'Invalid invoice ID format')
  .transform((v) => v as InvoiceId);

export const InvoiceLineIdSchema = z
  .string()
  .regex(ID_PATTERNS.invoiceLine, 'Invalid invoice line ID format')
  .transform((v) => v as InvoiceLineId);

export const ProductIdSchema = z
  .string()
  .regex(ID_PATTERNS.product, 'Invalid product ID format')
  .transform((v) => v as ProductId);

export const PaymentIdSchema = z
  .string()
  .regex(ID_PATTERNS.payment, 'Invalid payment ID format')
  .transform((v) => v as PaymentId);

export const UsageEventIdSchema = z
  .string()
  .regex(ID_PATTERNS.usageEvent, 'Invalid usage event ID format')
  .transform((v) => v as UsageEventId);

export const PricePlanIdSchema = z
  .string()
  .regex(ID_PATTERNS.pricePlan, 'Invalid price plan ID format')
  .transform((v) => v as PricePlanId);

// ID generator helpers
export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${timestamp}${random}`;
}

export const createTenantId = (): TenantId => generateId('tenant') as TenantId;
export const createUserId = (): UserId => generateId('user') as UserId;
export const createRequestId = (): RequestId => generateId('req') as RequestId;
export const createJobId = (): JobId => generateId('job') as JobId;
export const createRoleId = (): RoleId => generateId('role') as RoleId;
export const createPermissionId = (): PermissionId => generateId('perm') as PermissionId;
export const createMembershipId = (): MembershipId => generateId('mem') as MembershipId;
export const createAuditLogId = (): AuditLogId => generateId('audit') as AuditLogId;
export const createIdempotencyKeyId = (): IdempotencyKeyId => generateId('idem') as IdempotencyKeyId;
export const createStorageObjectId = (): StorageObjectId => generateId('obj') as StorageObjectId;
export const createContractId = (): ContractId => generateId('ctr') as ContractId;
export const createIssueId = (): IssueId => generateId('iss') as IssueId;
export const createSimulationId = (): SimulationId => generateId('sim') as SimulationId;
export const createSnapshotId = (): SnapshotId => generateId('snap') as SnapshotId;
export const createSyncRunId = (): SyncRunId => generateId('srun') as SyncRunId;
export const createStagingRecordId = (): StagingRecordId => generateId('stg') as StagingRecordId;
export const createCustomerId = (): CustomerId => generateId('cust') as CustomerId;
export const createContractVersionId = (): ContractVersionId => generateId('ctrv') as ContractVersionId;
export const createContractTermId = (): ContractTermId => generateId('term') as ContractTermId;
export const createInvoiceId = (): InvoiceId => generateId('inv') as InvoiceId;
export const createInvoiceLineId = (): InvoiceLineId => generateId('invl') as InvoiceLineId;
export const createProductId = (): ProductId => generateId('prod') as ProductId;
export const createPaymentId = (): PaymentId => generateId('pay') as PaymentId;
export const createUsageEventId = (): UsageEventId => generateId('usg') as UsageEventId;
export const createPricePlanId = (): PricePlanId => generateId('price') as PricePlanId;

