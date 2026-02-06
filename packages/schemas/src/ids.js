import { z } from 'zod';
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
};
// Zod schemas for ID validation
export const TenantIdSchema = z
    .string()
    .regex(ID_PATTERNS.tenant, 'Invalid tenant ID format')
    .transform((v) => v);
export const UserIdSchema = z
    .string()
    .regex(ID_PATTERNS.user, 'Invalid user ID format')
    .transform((v) => v);
export const RequestIdSchema = z
    .string()
    .regex(ID_PATTERNS.request, 'Invalid request ID format')
    .transform((v) => v);
export const JobIdSchema = z
    .string()
    .regex(ID_PATTERNS.job, 'Invalid job ID format')
    .transform((v) => v);
export const RoleIdSchema = z
    .string()
    .regex(ID_PATTERNS.role, 'Invalid role ID format')
    .transform((v) => v);
export const PermissionIdSchema = z
    .string()
    .regex(ID_PATTERNS.permission, 'Invalid permission ID format')
    .transform((v) => v);
export const ContractIdSchema = z
    .string()
    .regex(ID_PATTERNS.contract, 'Invalid contract ID format')
    .transform((v) => v);
export const IssueIdSchema = z
    .string()
    .regex(ID_PATTERNS.issue, 'Invalid issue ID format')
    .transform((v) => v);
export const SimulationIdSchema = z
    .string()
    .regex(ID_PATTERNS.simulation, 'Invalid simulation ID format')
    .transform((v) => v);
export const SnapshotIdSchema = z
    .string()
    .regex(ID_PATTERNS.snapshot, 'Invalid snapshot ID format')
    .transform((v) => v);
export const SyncRunIdSchema = z
    .string()
    .regex(ID_PATTERNS.syncRun, 'Invalid sync run ID format')
    .transform((v) => v);
export const StagingRecordIdSchema = z
    .string()
    .regex(ID_PATTERNS.stagingRecord, 'Invalid staging record ID format')
    .transform((v) => v);
export const CustomerIdSchema = z
    .string()
    .regex(ID_PATTERNS.customer, 'Invalid customer ID format')
    .transform((v) => v);
export const ContractVersionIdSchema = z
    .string()
    .regex(ID_PATTERNS.contractVersion, 'Invalid contract version ID format')
    .transform((v) => v);
export const ContractTermIdSchema = z
    .string()
    .regex(ID_PATTERNS.contractTerm, 'Invalid contract term ID format')
    .transform((v) => v);
export const InvoiceIdSchema = z
    .string()
    .regex(ID_PATTERNS.invoice, 'Invalid invoice ID format')
    .transform((v) => v);
export const InvoiceLineIdSchema = z
    .string()
    .regex(ID_PATTERNS.invoiceLine, 'Invalid invoice line ID format')
    .transform((v) => v);
export const ProductIdSchema = z
    .string()
    .regex(ID_PATTERNS.product, 'Invalid product ID format')
    .transform((v) => v);
export const PaymentIdSchema = z
    .string()
    .regex(ID_PATTERNS.payment, 'Invalid payment ID format')
    .transform((v) => v);
export const UsageEventIdSchema = z
    .string()
    .regex(ID_PATTERNS.usageEvent, 'Invalid usage event ID format')
    .transform((v) => v);
export const PricePlanIdSchema = z
    .string()
    .regex(ID_PATTERNS.pricePlan, 'Invalid price plan ID format')
    .transform((v) => v);
// ID generator helpers
export function generateId(prefix) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${prefix}_${timestamp}${random}`;
}
export const createTenantId = () => generateId('tenant');
export const createUserId = () => generateId('user');
export const createRequestId = () => generateId('req');
export const createJobId = () => generateId('job');
export const createRoleId = () => generateId('role');
export const createPermissionId = () => generateId('perm');
export const createMembershipId = () => generateId('mem');
export const createAuditLogId = () => generateId('audit');
export const createIdempotencyKeyId = () => generateId('idem');
export const createStorageObjectId = () => generateId('obj');
export const createContractId = () => generateId('ctr');
export const createIssueId = () => generateId('iss');
export const createSimulationId = () => generateId('sim');
export const createSnapshotId = () => generateId('snap');
export const createSyncRunId = () => generateId('srun');
export const createStagingRecordId = () => generateId('stg');
export const createCustomerId = () => generateId('cust');
export const createContractVersionId = () => generateId('ctrv');
export const createContractTermId = () => generateId('term');
export const createInvoiceId = () => generateId('inv');
export const createInvoiceLineId = () => generateId('invl');
export const createProductId = () => generateId('prod');
export const createPaymentId = () => generateId('pay');
export const createUsageEventId = () => generateId('usg');
export const createPricePlanId = () => generateId('price');
//# sourceMappingURL=ids.js.map