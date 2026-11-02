import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

// ============================================
// Tenants
// ============================================

export interface TenantsTable {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'trial';
  created_at: Generated<Date>;
}

export type Tenant = Selectable<TenantsTable>;
export type NewTenant = Insertable<TenantsTable>;
export type TenantUpdate = Updateable<TenantsTable>;

// ============================================
// Users
// ============================================

export interface UsersTable {
  id: string;
  email: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: Generated<Date>;
}

export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type UserUpdate = Updateable<UsersTable>;

// ============================================
// Roles
// ============================================

export interface RolesTable {
  id: string;
  name: string;
  created_at: Generated<Date>;
}

export type Role = Selectable<RolesTable>;
export type NewRole = Insertable<RolesTable>;

// ============================================
// Permissions
// ============================================

export interface PermissionsTable {
  id: string;
  name: string;
  description: string | null;
  created_at: Generated<Date>;
}

export type Permission = Selectable<PermissionsTable>;
export type NewPermission = Insertable<PermissionsTable>;

// ============================================
// Role Permissions (junction table)
// ============================================

export interface RolePermissionsTable {
  role_id: string;
  permission_id: string;
}

export type RolePermission = Selectable<RolePermissionsTable>;
export type NewRolePermission = Insertable<RolePermissionsTable>;

// ============================================
// Memberships (tenant-user-role binding)
// ============================================

export interface MembershipsTable {
  id: string;
  tenant_id: string;
  user_id: string;
  role_id: string;
  created_at: Generated<Date>;
}

export type Membership = Selectable<MembershipsTable>;
export type NewMembership = Insertable<MembershipsTable>;
export type MembershipUpdate = Updateable<MembershipsTable>;

// ============================================
// Audit Logs
// ============================================

export interface AuditLogsTable {
  id: string;
  tenant_id: string;
  actor_user_id: string | null;
  action: string;
  resource: string | null;
  metadata_json: unknown | null;
  request_id: string | null;
  created_at: Generated<Date>;
}

export type AuditLog = Selectable<AuditLogsTable>;
export type NewAuditLog = Insertable<AuditLogsTable>;

// ============================================
// Idempotency Keys
// ============================================

export interface IdempotencyKeysTable {
  id: string;
  tenant_id: string;
  scope: string;
  key: string;
  status: 'pending' | 'completed' | 'failed';
  response_json: unknown | null;
  created_at: Generated<Date>;
  expires_at: Date;
}

export type IdempotencyKey = Selectable<IdempotencyKeysTable>;
export type NewIdempotencyKey = Insertable<IdempotencyKeysTable>;
export type IdempotencyKeyUpdate = Updateable<IdempotencyKeysTable>;

// ============================================
// Jobs
// ============================================

export interface JobsTable {
  id: string;
  tenant_id: string;
  type: 'sync' | 'detect' | 'simulate' | 'export';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  payload_json: unknown;
  result_json: unknown | null;
  idempotency_key_id: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  completed_at: Date | null;
}

export type Job = Selectable<JobsTable>;
export type NewJob = Insertable<JobsTable>;
export type JobUpdate = Updateable<JobsTable>;

// ============================================
// Storage Objects
// ============================================

export interface StorageObjectsTable {
  id: string;
  tenant_id: string;
  bucket: string;
  key: string;
  content_type: string | null;
  size: number | null;
  checksum: string | null;
  created_at: Generated<Date>;
}

export type StorageObject = Selectable<StorageObjectsTable>;
export type NewStorageObject = Insertable<StorageObjectsTable>;

// ============================================
// Connections (Phase 1)
// ============================================

export interface ConnectionsTable {
  id: string;
  tenant_id: string;
  provider: 'stripe' | 'salesforce';
  status: 'pending' | 'connected' | 'error' | 'disconnected';
  display_name: string | null;
  config_json: unknown | null;
  created_by: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  last_sync_at: Date | null;
  last_success_at: Date | null;
  last_error_at: Date | null;
  last_error_code: string | null;
  last_error_message: string | null;
}

export type Connection = Selectable<ConnectionsTable>;
export type NewConnection = Insertable<ConnectionsTable>;
export type ConnectionUpdate = Updateable<ConnectionsTable>;

// ============================================
// Connection Credentials (Phase 1)
// ============================================

export interface ConnectionCredentialsTable {
  id: string;
  connection_id: string;
  access_token_enc: string;
  refresh_token_enc: string | null;
  token_type: string | null;
  scopes: string[] | null;
  expires_at: Date | null;
  external_account_id: string | null;
  instance_url: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  last_refreshed_at: Date | null;
}

export type ConnectionCredentials = Selectable<ConnectionCredentialsTable>;
export type NewConnectionCredentials = Insertable<ConnectionCredentialsTable>;
export type ConnectionCredentialsUpdate = Updateable<ConnectionCredentialsTable>;

// ============================================
// Connector Schemas (Phase 1)
// ============================================

export interface ConnectorSchemasTable {
  id: string;
  connection_id: string;
  object_type: string;
  schema_json: unknown;
  discovered_at: Generated<Date>;
}

export type ConnectorSchema = Selectable<ConnectorSchemasTable>;
export type NewConnectorSchema = Insertable<ConnectorSchemasTable>;

// ============================================
// Connector Cursors (Phase 1)
// ============================================

export interface ConnectorCursorsTable {
  id: string;
  connection_id: string;
  object_type: string;
  cursor_json: unknown;
  updated_at: Generated<Date>;
  last_seen_at: Date | null;
}

export type ConnectorCursor = Selectable<ConnectorCursorsTable>;
export type NewConnectorCursor = Insertable<ConnectorCursorsTable>;
export type ConnectorCursorUpdate = Updateable<ConnectorCursorsTable>;

// ============================================
// Connector Runs (Phase 1)
// ============================================

export interface ConnectorRunsTable {
  id: string;
  connection_id: string;
  tenant_id: string;
  run_type: 'full' | 'incremental';
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: Generated<Date>;
  finished_at: Date | null;
  records_fetched: number | null;
  objects_fetched: number | null;
  error_code: string | null;
  error_message: string | null;
  idempotency_key_id: string | null;
  job_id: string | null;
}

export type ConnectorRun = Selectable<ConnectorRunsTable>;
export type NewConnectorRun = Insertable<ConnectorRunsTable>;
export type ConnectorRunUpdate = Updateable<ConnectorRunsTable>;

// ============================================
// Raw Batches (Phase 1)
// ============================================

export interface RawBatchesTable {
  id: string;
  tenant_id: string;
  connection_id: string;
  run_id: string;
  object_type: string;
  s3_key: string;
  record_count: number;
  min_updated_at: Date | null;
  max_updated_at: Date | null;
  checksum: string | null;
  created_at: Generated<Date>;
}

export type RawBatch = Selectable<RawBatchesTable>;
export type NewRawBatch = Insertable<RawBatchesTable>;

// ============================================
// Snapshots (Phase 2)
// ============================================

export interface SnapshotsTable {
  id: string;
  tenant_id: string;
  source_run_id: string | null;
  status: 'pending' | 'building' | 'validating' | 'complete' | 'failed';
  started_at: Generated<Date>;
  completed_at: Date | null;
  metadata_json: unknown;
  record_counts: unknown;
  quality_results: unknown;
  created_at: Generated<Date>;
}

export type Snapshot = Selectable<SnapshotsTable>;
export type NewSnapshot = Insertable<SnapshotsTable>;
export type SnapshotUpdate = Updateable<SnapshotsTable>;

// ============================================
// Sync Runs (Phase 2)
// ============================================

export interface SyncRunsTable {
  id: string;
  tenant_id: string;
  snapshot_id: string | null;
  run_type: 'load' | 'normalize' | 'upsert' | 'finalize' | 'full';
  status: 'running' | 'completed' | 'failed';
  started_at: Generated<Date>;
  finished_at: Date | null;
  records_processed: number;
  error_code: string | null;
  error_message: string | null;
  metadata_json: unknown;
}

export type SyncRun = Selectable<SyncRunsTable>;
export type NewSyncRun = Insertable<SyncRunsTable>;
export type SyncRunUpdate = Updateable<SyncRunsTable>;

// ============================================
// Staging Records (Phase 2)
// ============================================

export interface StagingRecordsTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  connection_id: string;
  batch_id: string;
  object_type: string;
  external_id: string;
  raw_json: unknown;
  status: 'pending' | 'normalized' | 'failed' | 'skipped';
  error_message: string | null;
  received_at: Generated<Date>;
}

export type StagingRecord = Selectable<StagingRecordsTable>;
export type NewStagingRecord = Insertable<StagingRecordsTable>;
export type StagingRecordUpdate = Updateable<StagingRecordsTable>;

// ============================================
// Customers (Phase 2 Canonical)
// ============================================

export interface CustomersTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  external_id: string;
  external_ids_json: unknown;
  name: string;
  email: string | null;
  status: 'active' | 'inactive' | 'churned' | 'prospect';
  metadata_json: unknown;
  source_system: string;
  source_batch_id: string | null;
  source_record_id: string | null;
  created_at: Generated<Date>;
}

export type Customer = Selectable<CustomersTable>;
export type NewCustomer = Insertable<CustomersTable>;
export type CustomerUpdate = Updateable<CustomersTable>;

// ============================================
// Contracts (Phase 2 Canonical)
// ============================================

export interface ContractsTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  customer_id: string | null;
  external_id: string;
  external_ids_json: unknown;
  name: string | null;
  status: 'draft' | 'active' | 'expired' | 'cancelled' | 'renewed';
  start_date: Date | null;
  end_date: Date | null;
  arr: number | null;
  currency: string;
  billing_frequency: 'monthly' | 'quarterly' | 'annually' | 'one_time' | null;
  auto_renew: boolean;
  metadata_json: unknown;
  source_system: string;
  source_batch_id: string | null;
  source_record_id: string | null;
  created_at: Generated<Date>;
}

export type Contract = Selectable<ContractsTable>;
export type NewContract = Insertable<ContractsTable>;
export type ContractUpdate = Updateable<ContractsTable>;

// ============================================
// Contract Versions (Phase 2 Canonical)
// ============================================

export interface ContractVersionsTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  contract_id: string;
  version: number;
  effective_date: Date | null;
  source: string | null;
  changes_json: unknown;
  created_at: Generated<Date>;
}

export type ContractVersion = Selectable<ContractVersionsTable>;
export type NewContractVersion = Insertable<ContractVersionsTable>;

// ============================================
// Contract Terms (Phase 2 Canonical + Phase 5 Extensions)
// ============================================

export interface ContractTermsTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  contract_version_id: string;
  term_type: string;
  value_json: unknown;
  confidence: number | null;
  source_clause: string | null;
  source_page: number | null;
  // Phase 5 additions
  source_clause_id: string | null;
  extraction_method: 'rule' | 'pattern' | 'llm' | null;
  is_overridden: boolean;
  override_id: string | null;
  matched_text: string | null;
  start_offset: number | null;
  end_offset: number | null;
  created_at: Generated<Date>;
}

export type ContractTerm = Selectable<ContractTermsTable>;
export type NewContractTerm = Insertable<ContractTermsTable>;
export type ContractTermUpdate = Updateable<ContractTermsTable>;

// ============================================
// Invoices (Phase 2 Canonical)
// ============================================

export interface InvoicesTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  customer_id: string | null;
  contract_id: string | null;
  external_id: string;
  external_ids_json: unknown;
  invoice_number: string | null;
  invoice_date: Date;
  due_date: Date | null;
  currency: string;
  subtotal: number | null;
  tax: number;
  total: number;
  amount_paid: number;
  amount_due: number | null;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible' | 'past_due';
  period_start: Date | null;
  period_end: Date | null;
  metadata_json: unknown;
  source_system: string;
  source_batch_id: string | null;
  source_record_id: string | null;
  created_at: Generated<Date>;
}

export type Invoice = Selectable<InvoicesTable>;
export type NewInvoice = Insertable<InvoicesTable>;
export type InvoiceUpdate = Updateable<InvoicesTable>;

// ============================================
// Invoice Lines (Phase 2 Canonical)
// ============================================

export interface InvoiceLinesTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  invoice_id: string;
  product_id: string | null;
  external_id: string | null;
  description: string | null;
  quantity: number;
  unit_price: number | null;
  amount: number;
  currency: string;
  service_start: Date | null;
  service_end: Date | null;
  metadata_json: unknown;
  created_at: Generated<Date>;
}

export type InvoiceLine = Selectable<InvoiceLinesTable>;
export type NewInvoiceLine = Insertable<InvoiceLinesTable>;

// ============================================
// Products (Phase 2 Canonical)
// ============================================

export interface ProductsTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  external_id: string;
  external_ids_json: unknown;
  sku: string | null;
  name: string;
  description: string | null;
  category: string | null;
  status: 'active' | 'inactive' | 'archived';
  metadata_json: unknown;
  source_system: string;
  source_batch_id: string | null;
  source_record_id: string | null;
  created_at: Generated<Date>;
}

export type Product = Selectable<ProductsTable>;
export type NewProduct = Insertable<ProductsTable>;
export type ProductUpdate = Updateable<ProductsTable>;

// ============================================
// Payments (Phase 2 Canonical)
// ============================================

export interface PaymentsTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  invoice_id: string | null;
  customer_id: string | null;
  external_id: string;
  external_ids_json: unknown;
  amount: number;
  currency: string;
  payment_date: Date;
  method: string | null;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded' | 'partially_refunded';
  metadata_json: unknown;
  source_system: string;
  source_batch_id: string | null;
  source_record_id: string | null;
  created_at: Generated<Date>;
}

export type Payment = Selectable<PaymentsTable>;
export type NewPayment = Insertable<PaymentsTable>;
export type PaymentUpdate = Updateable<PaymentsTable>;

// ============================================
// Usage Events (Phase 2 Canonical)
// ============================================

export interface UsageEventsTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  customer_id: string | null;
  contract_id: string | null;
  product_id: string | null;
  external_id: string | null;
  metric: string;
  quantity: number;
  unit: string | null;
  event_time: Date;
  metadata_json: unknown;
  source_system: string;
  source_batch_id: string | null;
  source_record_id: string | null;
  created_at: Generated<Date>;
}

export type UsageEvent = Selectable<UsageEventsTable>;
export type NewUsageEvent = Insertable<UsageEventsTable>;

// ============================================
// Price Plans (Phase 2 Canonical)
// ============================================

export interface PricePlansTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  product_id: string;
  external_id: string | null;
  external_ids_json: unknown;
  name: string | null;
  billing_cadence: 'monthly' | 'quarterly' | 'annually' | 'one_time' | 'usage_based' | null;
  currency: string;
  price_json: unknown;
  status: 'active' | 'inactive' | 'archived';
  metadata_json: unknown;
  source_system: string;
  source_batch_id: string | null;
  source_record_id: string | null;
  created_at: Generated<Date>;
}

export type PricePlan = Selectable<PricePlansTable>;
export type NewPricePlan = Insertable<PricePlansTable>;
export type PricePlanUpdate = Updateable<PricePlansTable>;

// ============================================
// Identity Runs (Phase 3)
// ============================================

export interface IdentityRunsTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  rules_version: string;
  config_json: unknown;
  stats_json: unknown;
  started_at: Generated<Date>;
  finished_at: Date | null;
  error_code: string | null;
  error_message: string | null;
  created_at: Generated<Date>;
}

export type IdentityRun = Selectable<IdentityRunsTable>;
export type NewIdentityRun = Insertable<IdentityRunsTable>;
export type IdentityRunUpdate = Updateable<IdentityRunsTable>;

// ============================================
// Customer Identities (Phase 3)
// ============================================

export interface CustomerIdentitiesTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  run_id: string | null;
  primary_customer_id: string;
  confidence: number;
  method: 'auto' | 'manual' | 'override';
  member_count: number;
  source_systems: string[];
  metadata_json: unknown;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type CustomerIdentity = Selectable<CustomerIdentitiesTable>;
export type NewCustomerIdentity = Insertable<CustomerIdentitiesTable>;
export type CustomerIdentityUpdate = Updateable<CustomerIdentitiesTable>;

// ============================================
// Customer Identity Members (Phase 3)
// ============================================

export interface CustomerIdentityMembersTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  identity_id: string;
  customer_id: string;
  source_system: string;
  external_id: string;
  confidence: number;
  role: 'primary' | 'member';
  added_method: 'auto' | 'manual';
  created_at: Generated<Date>;
}

export type CustomerIdentityMember = Selectable<CustomerIdentityMembersTable>;
export type NewCustomerIdentityMember = Insertable<CustomerIdentityMembersTable>;

// ============================================
// Identity Candidates (Phase 3)
// ============================================

export interface IdentityCandidatesTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  run_id: string | null;
  customer_id_a: string;
  customer_id_b: string;
  score: number;
  features_json: unknown;
  blocking_keys: string[];
  status: 'pending' | 'confirmed' | 'rejected' | 'auto_merged' | 'suppressed';
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type IdentityCandidate = Selectable<IdentityCandidatesTable>;
export type NewIdentityCandidate = Insertable<IdentityCandidatesTable>;
export type IdentityCandidateUpdate = Updateable<IdentityCandidatesTable>;

// ============================================
// Identity Tasks (Phase 3)
// ============================================

export interface IdentityTasksTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  run_id: string | null;
  candidate_id: string;
  status: 'pending' | 'assigned' | 'resolved' | 'skipped';
  priority: number;
  assigned_to: string | null;
  assigned_at: Date | null;
  resolved_at: Date | null;
  created_at: Generated<Date>;
}

export type IdentityTask = Selectable<IdentityTasksTable>;
export type NewIdentityTask = Insertable<IdentityTasksTable>;
export type IdentityTaskUpdate = Updateable<IdentityTasksTable>;

// ============================================
// Identity Decisions (Phase 3)
// ============================================

export interface IdentityDecisionsTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  task_id: string;
  candidate_id: string;
  decision: 'confirm' | 'reject' | 'merge' | 'split';
  actor_user_id: string | null;
  notes: string | null;
  metadata_json: unknown;
  created_at: Generated<Date>;
}

export type IdentityDecision = Selectable<IdentityDecisionsTable>;
export type NewIdentityDecision = Insertable<IdentityDecisionsTable>;

// ============================================
// Identity Overrides (Phase 3)
// ============================================

export interface IdentityOverridesTable {
  id: string;
  tenant_id: string;
  snapshot_id: string | null;
  customer_id: string;
  identity_id: string;
  method: 'manual' | 'import';
  reason: string | null;
  actor_user_id: string | null;
  expires_at: Date | null;
  created_at: Generated<Date>;
}

export type IdentityOverride = Selectable<IdentityOverridesTable>;
export type NewIdentityOverride = Insertable<IdentityOverridesTable>;

// ============================================
// Identity Suppressions (Phase 3)
// ============================================

export interface IdentitySuppressionsTable {
  id: string;
  tenant_id: string;
  customer_id_a: string;
  customer_id_b: string;
  reason: string | null;
  actor_user_id: string | null;
  created_at: Generated<Date>;
}

export type IdentitySuppression = Selectable<IdentitySuppressionsTable>;
export type NewIdentitySuppression = Insertable<IdentitySuppressionsTable>;

// ============================================
// Uploads (Phase 4)
// ============================================

export interface UploadsTable {
  id: string;
  tenant_id: string;
  type: 'csv' | 'pdf';
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  entity_type: string | null;
  display_name: string | null;
  file_count: number;
  total_rows: number | null;
  valid_rows: number | null;
  error_count: number;
  created_by: string | null;
  error_code: string | null;
  error_message: string | null;
  metadata_json: unknown;
  created_at: Generated<Date>;
  started_at: Date | null;
  completed_at: Date | null;
}

export type Upload = Selectable<UploadsTable>;
export type NewUpload = Insertable<UploadsTable>;
export type UploadUpdate = Updateable<UploadsTable>;

// ============================================
// Upload Files (Phase 4)
// ============================================

export interface UploadFilesTable {
  id: string;
  tenant_id: string;
  upload_id: string;
  file_name: string;
  content_type: string;
  s3_key: string;
  checksum: string | null;
  size_bytes: number;
  extracted_text_json: unknown | null;
  metadata_json: unknown;
  created_at: Generated<Date>;
}

export type UploadFile = Selectable<UploadFilesTable>;
export type NewUploadFile = Insertable<UploadFilesTable>;

// ============================================
// Upload Mappings (Phase 4)
// ============================================

export interface UploadMappingsTable {
  id: string;
  tenant_id: string;
  upload_id: string;
  entity_type: string;
  mapping_json: unknown;
  validation_rules_json: unknown;
  created_at: Generated<Date>;
}

export type UploadMapping = Selectable<UploadMappingsTable>;
export type NewUploadMapping = Insertable<UploadMappingsTable>;

// ============================================
// Upload Parse Runs (Phase 4)
// ============================================

export interface UploadParseRunsTable {
  id: string;
  tenant_id: string;
  upload_id: string;
  file_id: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  run_number: number;
  stats_json: unknown;
  error_code: string | null;
  error_message: string | null;
  started_at: Date | null;
  finished_at: Date | null;
  created_at: Generated<Date>;
}

export type UploadParseRun = Selectable<UploadParseRunsTable>;
export type NewUploadParseRun = Insertable<UploadParseRunsTable>;
export type UploadParseRunUpdate = Updateable<UploadParseRunsTable>;

// ============================================
// Upload Parse Errors (Phase 4)
// ============================================

export interface UploadParseErrorsTable {
  id: string;
  tenant_id: string;
  upload_id: string;
  parse_run_id: string;
  row_number: number;
  field: string | null;
  error_type: string;
  error_message: string;
  raw_value: string | null;
  created_at: Generated<Date>;
}

export type UploadParseError = Selectable<UploadParseErrorsTable>;
export type NewUploadParseError = Insertable<UploadParseErrorsTable>;

// ============================================
// Upload Templates (Phase 4)
// ============================================

export interface UploadTemplatesTable {
  id: string;
  entity_type: string;
  display_name: string;
  description: string | null;
  columns_json: unknown;
  sample_data_json: unknown | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type UploadTemplate = Selectable<UploadTemplatesTable>;

// ============================================
// Contract Documents (Phase 5)
// ============================================

export interface ContractDocumentsTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  customer_id: string | null;
  contract_id: string | null;
  contract_version_id: string | null;
  source_system: string;
  source_id: string | null;
  s3_key: string;
  file_name: string;
  checksum: string | null;
  status: 'pending' | 'extracting' | 'extracted' | 'failed';
  page_count: number | null;
  extracted_text: string | null;
  extracted_text_length: number | null;
  error_message: string | null;
  metadata_json: unknown;
  uploaded_at: Generated<Date>;
  extracted_at: Date | null;
}

export type ContractDocument = Selectable<ContractDocumentsTable>;
export type NewContractDocument = Insertable<ContractDocumentsTable>;
export type ContractDocumentUpdate = Updateable<ContractDocumentsTable>;

// ============================================
// Contract Clauses (Phase 5)
// ============================================

export interface ContractClausesTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  contract_version_id: string;
  document_id: string;
  clause_type: 'heading' | 'section' | 'paragraph' | 'list_item';
  clause_label: string | null;
  text: string;
  start_offset: number;
  end_offset: number;
  page_number: number | null;
  sequence_number: number;
  parent_clause_id: string | null;
  created_at: Generated<Date>;
}

export type ContractClause = Selectable<ContractClausesTable>;
export type NewContractClause = Insertable<ContractClausesTable>;

// ============================================
// Contract Term Overrides (Phase 5)
// ============================================

export interface ContractTermOverridesTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  term_id: string;
  original_value_json: unknown;
  override_value_json: unknown;
  actor_user_id: string;
  reason: string | null;
  created_at: Generated<Date>;
}

export type ContractTermOverride = Selectable<ContractTermOverridesTable>;
export type NewContractTermOverride = Insertable<ContractTermOverridesTable>;

// ============================================
// Contract Readiness (Phase 5)
// ============================================

export interface ContractReadinessTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  contract_version_id: string;
  readiness_status: 'ready' | 'needs_review' | 'incomplete';
  confidence_score: number | null;
  required_terms_count: number;
  extracted_terms_count: number;
  missing_terms_json: unknown;
  low_confidence_terms_json: unknown;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  updated_at: Generated<Date>;
}

export type ContractReadiness = Selectable<ContractReadinessTable>;
export type NewContractReadiness = Insertable<ContractReadinessTable>;
export type ContractReadinessUpdate = Updateable<ContractReadinessTable>;

// ============================================
// Revenue Obligations (Phase 6)
// ============================================

export interface RevenueObligationsTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  contract_id: string;
  contract_version_id: string | null;
  obligation_type: 'subscription' | 'usage' | 'one_time' | 'professional_services' | 'support';
  description: string | null;
  transaction_price: number;
  currency: string;
  allocation_method: 'ssp' | 'residual' | 'straight_line' | 'custom';
  standalone_selling_price: number | null;
  service_start_date: Date | null;
  service_end_date: Date | null;
  status: 'active' | 'completed' | 'cancelled' | 'amended';
  source_term_ids: unknown;
  metadata_json: unknown;
  created_at: Generated<Date>;
}

export type RevenueObligation = Selectable<RevenueObligationsTable>;
export type NewRevenueObligation = Insertable<RevenueObligationsTable>;
export type RevenueObligationUpdate = Updateable<RevenueObligationsTable>;

// ============================================
// Revenue Allocations (Phase 6)
// ============================================

export interface RevenueAllocationsTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  obligation_id: string;
  allocation_pct: number;
  allocated_amount: number;
  allocation_basis: string | null;
  created_at: Generated<Date>;
}

export type RevenueAllocation = Selectable<RevenueAllocationsTable>;
export type NewRevenueAllocation = Insertable<RevenueAllocationsTable>;

// ============================================
// Revenue Schedules (Phase 6)
// ============================================

export interface RevenueSchedulesTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  obligation_id: string;
  period_start: Date;
  period_end: Date;
  scheduled_amount: number;
  recognized_amount: number;
  deferred_amount: number;
  recognition_method: 'straight_line' | 'usage_based' | 'milestone' | 'as_invoiced';
  status: 'pending' | 'partial' | 'recognized' | 'cancelled';
  period_days: number | null;
  daily_rate: number | null;
  created_at: Generated<Date>;
}

export type RevenueSchedule = Selectable<RevenueSchedulesTable>;
export type NewRevenueSchedule = Insertable<RevenueSchedulesTable>;
export type RevenueScheduleUpdate = Updateable<RevenueSchedulesTable>;

// ============================================
// Recognition Events (Phase 6)
// ============================================

export interface RecognitionEventsTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  obligation_id: string;
  schedule_id: string | null;
  event_date: Date;
  recognized_amount: number;
  event_type: 'scheduled' | 'usage' | 'milestone' | 'adjustment' | 'cancellation' | 'amendment';
  source_invoice_id: string | null;
  description: string | null;
  metadata_json: unknown;
  created_at: Generated<Date>;
}

export type RecognitionEvent = Selectable<RecognitionEventsTable>;
export type NewRecognitionEvent = Insertable<RecognitionEventsTable>;

// ============================================
// Deferred Revenue Balances (Phase 6)
// ============================================

export interface DeferredRevenueBalancesTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  obligation_id: string;
  period_end: Date;
  opening_balance: number;
  additions: number;
  recognized: number;
  adjustments: number;
  closing_balance: number;
  created_at: Generated<Date>;
}

export type DeferredRevenueBalance = Selectable<DeferredRevenueBalancesTable>;
export type NewDeferredRevenueBalance = Insertable<DeferredRevenueBalancesTable>;

// ============================================
// RevRec Reconciliations (Phase 6)
// ============================================

export interface RevRecReconciliationsTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  contract_id: string;
  period_start: Date;
  period_end: Date;
  status: 'matched' | 'timing_variance' | 'amount_variance' | 'missing_invoice' | 'unmatched';
  scheduled_amount: number;
  invoiced_amount: number;
  variance_amount: number;
  variance_pct: number | null;
  details_json: unknown;
  created_at: Generated<Date>;
}

export type RevRecReconciliation = Selectable<RevRecReconciliationsTable>;
export type NewRevRecReconciliation = Insertable<RevRecReconciliationsTable>;

// ============================================
// Detection Runs (Phase 7)
// ============================================

export interface DetectionRunsTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  ruleset_version: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  config_json: unknown;
  stats_json: unknown;
  issues_total: number | null;
  issues_by_severity: unknown;
  issues_by_category: unknown;
  error_code: string | null;
  error_message: string | null;
  started_at: Date | null;
  finished_at: Date | null;
  created_at: Generated<Date>;
}

export type DetectionRun = Selectable<DetectionRunsTable>;
export type NewDetectionRun = Insertable<DetectionRunsTable>;
export type DetectionRunUpdate = Updateable<DetectionRunsTable>;

// ============================================
// Issues (Phase 7)
// ============================================

export interface IssuesTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  run_id: string;
  rule_id: string;
  rule_version: string;
  issue_key: string;
  category: 'data_quality' | 'billing' | 'discount' | 'revrec' | 'credits' | 'usage' | 'lifecycle' | 'multi_entity' | 'cross_snapshot' | 'tax_fees' | 'fx_currency';
  status: 'open' | 'resolved' | 'dismissed' | 'acknowledged';
  severity: 'low' | 'medium' | 'high' | 'critical' | 'info';
  confidence: number;
  impact_amount: number | null;
  currency: string;
  expected_json: unknown;
  actual_json: unknown;
  dimensions_json: unknown;
  contract_id: string | null;
  invoice_id: string | null;
  customer_id: string | null;
  data_quality_flags: unknown;
  suppressed_by_rule: string | null;
  rule_metadata_json: unknown;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type Issue = Selectable<IssuesTable>;
export type NewIssue = Insertable<IssuesTable>;
export type IssueUpdate = Updateable<IssuesTable>;

// ============================================
// Issue Status History (Phase 7)
// ============================================

export interface IssueStatusHistoryTable {
  id: string;
  tenant_id: string;
  issue_id: string;
  from_status: string;
  to_status: string;
  actor_user_id: string | null;
  reason: string | null;
  metadata_json: unknown;
  created_at: Generated<Date>;
}

export type IssueStatusHistory = Selectable<IssueStatusHistoryTable>;
export type NewIssueStatusHistory = Insertable<IssueStatusHistoryTable>;

// ============================================
// Issue Sources (Phase 7)
// ============================================

export interface IssueSourcesTable {
  id: string;
  tenant_id: string;
  issue_id: string;
  source_type: 'contract' | 'invoice' | 'invoice_line' | 'payment' | 'usage_event' | 'schedule' | 'obligation' | 'customer' | 'product' | 'contract_term';
  source_id: string;
  source_system: string | null;
  field_name: string | null;
  field_value_json: unknown;
  created_at: Generated<Date>;
}

export type IssueSource = Selectable<IssueSourcesTable>;
export type NewIssueSource = Insertable<IssueSourcesTable>;

// ============================================
// Detection Configs (Phase 7)
// ============================================

export interface DetectionConfigsTable {
  id: string;
  tenant_id: string;
  name: string;
  is_active: boolean;
  fx_config: unknown;
  proration_config: unknown;
  tax_fees_config: unknown;
  credits_config: unknown;
  zero_value_config: unknown;
  thresholds_config: unknown;
  gating_config: unknown;
  auto_renewal_config: unknown;
  enabled_rules: unknown;
  disabled_rules: unknown;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type DetectionConfig = Selectable<DetectionConfigsTable>;
export type NewDetectionConfig = Insertable<DetectionConfigsTable>;
export type DetectionConfigUpdate = Updateable<DetectionConfigsTable>;

// ============================================
// FX Rates (Phase 7)
// ============================================

export interface FxRatesTable {
  id: string;
  tenant_id: string;
  source_currency: string;
  target_currency: string;
  rate: number;
  rate_date: Date;
  rate_source: string;
  created_at: Generated<Date>;
}

export type FxRate = Selectable<FxRatesTable>;
export type NewFxRate = Insertable<FxRatesTable>;

// ============================================
// Issue Evidence (Phase 8)
// ============================================

export interface IssueEvidenceTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  issue_id: string;
  evidence_version: number;
  evidence_type: 'full' | 'summary' | 'calculation' | 'clause' | 'source';
  title: string;
  summary: string;
  data_json: unknown;
  completeness_score: number;
  completeness_breakdown: unknown;
  s3_key: string | null;
  rule_id: string | null;
  rule_version: string | null;
  created_at: Generated<Date>;
}

export type IssueEvidence = Selectable<IssueEvidenceTable>;
export type NewIssueEvidence = Insertable<IssueEvidenceTable>;

// ============================================
// Issue Evidence Sources (Phase 8)
// ============================================

export interface IssueEvidenceSourcesTable {
  id: string;
  tenant_id: string;
  evidence_id: string;
  issue_id: string;
  source_type: 'contract' | 'invoice' | 'invoice_line' | 'payment' | 'usage_event' | 'schedule' | 'obligation' | 'customer' | 'product' | 'contract_term' | 'contract_version' | 'contract_document';
  source_id: string;
  source_system: string | null;
  source_external_id: string | null;
  field_name: string | null;
  field_value_json: unknown;
  s3_key: string | null;
  snapshot_value_json: unknown;
  created_at: Generated<Date>;
}

export type IssueEvidenceSource = Selectable<IssueEvidenceSourcesTable>;
export type NewIssueEvidenceSource = Insertable<IssueEvidenceSourcesTable>;

// ============================================
// Issue Evidence Calculations (Phase 8)
// ============================================

export interface IssueEvidenceCalculationsTable {
  id: string;
  tenant_id: string;
  evidence_id: string;
  issue_id: string;
  calc_name: string;
  calc_type: 'expected_amount' | 'actual_amount' | 'variance' | 'proration' | 'discount' | 'fx_conversion' | 'revenue_allocation' | 'custom';
  formula: string | null;
  inputs_json: unknown;
  outputs_json: unknown;
  rule_id: string | null;
  rule_version: string | null;
  sequence_number: number;
  is_reproducible: boolean;
  notes: string | null;
  created_at: Generated<Date>;
}

export type IssueEvidenceCalculation = Selectable<IssueEvidenceCalculationsTable>;
export type NewIssueEvidenceCalculation = Insertable<IssueEvidenceCalculationsTable>;

// ============================================
// Issue Evidence Clauses (Phase 8)
// ============================================

export interface IssueEvidenceClausesTable {
  id: string;
  tenant_id: string;
  evidence_id: string;
  issue_id: string;
  clause_id: string | null;
  contract_id: string | null;
  contract_version_id: string | null;
  document_id: string | null;
  clause_type: 'heading' | 'section' | 'paragraph' | 'list_item' | 'excerpt' | null;
  clause_label: string | null;
  excerpt: string;
  full_text_s3_key: string | null;
  start_offset: number | null;
  end_offset: number | null;
  page_number: number | null;
  relevance_score: number | null;
  created_at: Generated<Date>;
}

export type IssueEvidenceClause = Selectable<IssueEvidenceClausesTable>;
export type NewIssueEvidenceClause = Insertable<IssueEvidenceClausesTable>;

// ============================================
// Issue Evidence Audit (Phase 8)
// ============================================

export interface IssueEvidenceAuditTable {
  id: string;
  tenant_id: string;
  issue_id: string;
  evidence_id: string | null;
  evidence_version: number;
  action: 'generated' | 'regenerated' | 'failed' | 'expired' | 'archived';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  trigger_type: 'auto' | 'manual' | 'scheduled' | 'detection_run';
  actor_user_id: string | null;
  previous_version: number | null;
  completeness_score: number | null;
  processing_time_ms: number | null;
  error_code: string | null;
  error_message: string | null;
  metadata_json: unknown;
  generated_at: Generated<Date>;
  created_at: Generated<Date>;
}

export type IssueEvidenceAudit = Selectable<IssueEvidenceAuditTable>;
export type NewIssueEvidenceAudit = Insertable<IssueEvidenceAuditTable>;

// ============================================
// Evidence Generation Runs (Phase 8)
// ============================================

export interface EvidenceGenerationRunsTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  detection_run_id: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  total_issues: number;
  processed_issues: number;
  failed_issues: number;
  skipped_issues: number;
  avg_completeness_score: number | null;
  stats_json: unknown;
  error_code: string | null;
  error_message: string | null;
  started_at: Date | null;
  finished_at: Date | null;
  created_at: Generated<Date>;
}

export type EvidenceGenerationRun = Selectable<EvidenceGenerationRunsTable>;
export type NewEvidenceGenerationRun = Insertable<EvidenceGenerationRunsTable>;
export type EvidenceGenerationRunUpdate = Updateable<EvidenceGenerationRunsTable>;

// ============================================
// Simulation Templates (Phase 9)
// ============================================

export interface SimulationTemplatesTable {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  template_json: unknown;
  is_active: boolean;
  created_by: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type SimulationTemplate = Selectable<SimulationTemplatesTable>;
export type NewSimulationTemplate = Insertable<SimulationTemplatesTable>;
export type SimulationTemplateUpdate = Updateable<SimulationTemplatesTable>;

// ============================================
// Simulations (Phase 9)
// ============================================

export interface SimulationsTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  template_id: string | null;
  created_by: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type Simulation = Selectable<SimulationsTable>;
export type NewSimulation = Insertable<SimulationsTable>;
export type SimulationUpdate = Updateable<SimulationsTable>;

// ============================================
// Simulation Overrides (Phase 9)
// ============================================

export interface SimulationOverridesTable {
  id: string;
  tenant_id: string;
  simulation_id: string;
  override_type: 'contract_term' | 'usage_adjustment' | 'billing_adjustment' | 'timing_shift' | 'discount_change' | 'price_change';
  target_type: 'contract' | 'invoice' | 'customer' | 'obligation' | 'line_item';
  target_id: string;
  field_path: string | null;
  original_value_json: unknown | null;
  override_value_json: unknown;
  sequence_number: number;
  is_valid: boolean;
  validation_message: string | null;
  created_at: Generated<Date>;
}

export type SimulationOverride = Selectable<SimulationOverridesTable>;
export type NewSimulationOverride = Insertable<SimulationOverridesTable>;

// ============================================
// Simulation Runs (Phase 9)
// ============================================

export interface SimulationRunsTable {
  id: string;
  tenant_id: string;
  simulation_id: string;
  run_number: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: Date | null;
  finished_at: Date | null;
  processing_time_ms: number | null;
  triggered_by: string | null;
  options_json: unknown;
  error_code: string | null;
  error_message: string | null;
  created_at: Generated<Date>;
}

export type SimulationRun = Selectable<SimulationRunsTable>;
export type NewSimulationRun = Insertable<SimulationRunsTable>;
export type SimulationRunUpdate = Updateable<SimulationRunsTable>;

// ============================================
// Simulation Results (Phase 9)
// ============================================

export interface SimulationResultsTable {
  id: string;
  tenant_id: string;
  run_id: string;
  simulation_id: string;
  total_revenue_baseline: number | null;
  total_revenue_simulated: number | null;
  total_revenue_delta: number | null;
  total_revenue_delta_pct: number | null;
  total_recognized_baseline: number | null;
  total_recognized_simulated: number | null;
  total_deferred_baseline: number | null;
  total_deferred_simulated: number | null;
  contracts_affected: number;
  obligations_affected: number;
  overrides_applied: number;
  overrides_skipped: number;
  summary_json: unknown;
  warnings_json: unknown;
  created_at: Generated<Date>;
}

export type SimulationResult = Selectable<SimulationResultsTable>;
export type NewSimulationResult = Insertable<SimulationResultsTable>;

// ============================================
// Simulation Deltas (Phase 9)
// ============================================

export interface SimulationDeltasTable {
  id: string;
  tenant_id: string;
  run_id: string;
  simulation_id: string;
  delta_type: 'revenue_total' | 'revenue_period' | 'recognized_shift' | 'deferred_shift' | 'contract_impact' | 'obligation_impact';
  target_type: string | null;
  target_id: string | null;
  period_start: Date | null;
  period_end: Date | null;
  baseline_amount: number | null;
  simulated_amount: number | null;
  delta_amount: number;
  delta_pct: number | null;
  currency: string;
  details_json: unknown | null;
  created_at: Generated<Date>;
}

export type SimulationDelta = Selectable<SimulationDeltasTable>;
export type NewSimulationDelta = Insertable<SimulationDeltasTable>;

// ============================================
// Simulation Audit (Phase 9)
// ============================================

export interface SimulationAuditTable {
  id: string;
  tenant_id: string;
  simulation_id: string | null;
  run_id: string | null;
  action: 'created' | 'updated' | 'deleted' | 'override_added' | 'override_removed' | 'run_started' | 'run_completed' | 'run_failed' | 'template_applied';
  actor_user_id: string | null;
  details_json: unknown | null;
  created_at: Generated<Date>;
}

export type SimulationAudit = Selectable<SimulationAuditTable>;
export type NewSimulationAudit = Insertable<SimulationAuditTable>;

// ============================================
// Exports (Phase 10)
// ============================================

export interface ExportsTable {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  export_type: 'issues_csv' | 'revrec_csv' | 'contracts_csv' | 'contracts_pdf' | 'audit_bundle_pdf' | 'executive_summary_pdf';
  format: 'csv' | 'pdf' | 'xlsx';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  requested_by: string | null;
  options_json: unknown;
  error_code: string | null;
  error_message: string | null;
  processing_lock: Date | null;
  created_at: Generated<Date>;
  completed_at: Date | null;
}

export type Export = Selectable<ExportsTable>;
export type NewExport = Insertable<ExportsTable>;
export type ExportUpdate = Updateable<ExportsTable>;

// ============================================
// Export Files (Phase 10)
// ============================================

export interface ExportFilesTable {
  id: string;
  tenant_id: string;
  export_id: string;
  s3_key: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  checksum_sha256: string | null;
  created_at: Generated<Date>;
}

export type ExportFile = Selectable<ExportFilesTable>;
export type NewExportFile = Insertable<ExportFilesTable>;

// ============================================
// Export Items (Phase 10)
// ============================================

export interface ExportItemsTable {
  id: string;
  tenant_id: string;
  export_id: string;
  item_type: string;
  item_id: string;
  metadata_json: unknown;
  created_at: Generated<Date>;
}

export type ExportItem = Selectable<ExportItemsTable>;
export type NewExportItem = Insertable<ExportItemsTable>;

// ============================================
// Export Schedules (Phase 10)
// ============================================

export interface ExportSchedulesTable {
  id: string;
  tenant_id: string;
  name: string;
  export_type: 'issues_csv' | 'revrec_csv' | 'contracts_csv' | 'contracts_pdf' | 'audit_bundle_pdf' | 'executive_summary_pdf';
  cadence: 'daily' | 'weekly' | 'monthly';
  scope_json: unknown;
  is_active: boolean;
  created_by: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type ExportSchedule = Selectable<ExportSchedulesTable>;
export type NewExportSchedule = Insertable<ExportSchedulesTable>;
export type ExportScheduleUpdate = Updateable<ExportSchedulesTable>;

// ============================================
// Export Runs (Phase 10)
// ============================================

export interface ExportRunsTable {
  id: string;
  tenant_id: string;
  schedule_id: string;
  export_id: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: Date | null;
  finished_at: Date | null;
  error_code: string | null;
  error_message: string | null;
  created_at: Generated<Date>;
}

export type ExportRun = Selectable<ExportRunsTable>;
export type NewExportRun = Insertable<ExportRunsTable>;
export type ExportRunUpdate = Updateable<ExportRunsTable>;

// ============================================
// Export Audit (Phase 10)
// ============================================

export interface ExportAuditTable {
  id: string;
  tenant_id: string;
  export_id: string;
  action: 'requested' | 'started' | 'completed' | 'failed' | 'downloaded' | 'regenerated' | 'cancelled' | 'deleted';
  actor_user_id: string | null;
  details_json: unknown;
  created_at: Generated<Date>;
}

export type ExportAudit = Selectable<ExportAuditTable>;
export type NewExportAudit = Insertable<ExportAuditTable>;

// ============================================
// Digest Subscriptions (Phase 10)
// ============================================

export interface DigestSubscriptionsTable {
  id: string;
  tenant_id: string;
  name: string;
  cadence: 'daily' | 'weekly' | 'monthly';
  scope_json: unknown;
  recipients_json: unknown;
  is_active: boolean;
  created_by: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type DigestSubscription = Selectable<DigestSubscriptionsTable>;
export type NewDigestSubscription = Insertable<DigestSubscriptionsTable>;
export type DigestSubscriptionUpdate = Updateable<DigestSubscriptionsTable>;

// ============================================
// Digest Runs (Phase 10)
// ============================================

export interface DigestRunsTable {
  id: string;
  tenant_id: string;
  subscription_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  items_count: number;
  recipients_count: number;
  emails_sent: number;
  emails_failed: number;
  snapshot_id: string | null;
  period_start: Date | null;
  period_end: Date | null;
  started_at: Date | null;
  finished_at: Date | null;
  error_code: string | null;
  error_message: string | null;
  content_json: unknown;
  created_at: Generated<Date>;
}

export type DigestRun = Selectable<DigestRunsTable>;
export type NewDigestRun = Insertable<DigestRunsTable>;
export type DigestRunUpdate = Updateable<DigestRunsTable>;

// ============================================
// Dead Letter Jobs (Phase 11)
// ============================================

export interface DeadLetterJobsTable {
  id: string;
  tenant_id: string;
  original_job_id: string;
  queue_name: string;
  job_type: string;
  payload_json: unknown;
  error_message: string | null;
  error_stack: string | null;
  attempt_count: number;
  max_attempts: number;
  first_failed_at: Date;
  last_failed_at: Date;
  requeued_at: Date | null;
  requeued_by: string | null;
  discarded_at: Date | null;
  discarded_by: string | null;
  status: 'failed' | 'requeued' | 'discarded';
  created_at: Generated<Date>;
}

export type DeadLetterJob = Selectable<DeadLetterJobsTable>;
export type NewDeadLetterJob = Insertable<DeadLetterJobsTable>;
export type DeadLetterJobUpdate = Updateable<DeadLetterJobsTable>;

// ============================================
// Integrity Check Runs (Phase 11)
// ============================================

export interface IntegrityCheckRunsTable {
  id: string;
  tenant_id: string;
  snapshot_id: string | null;
  check_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  issues_found: number;
  details_json: unknown;
  started_at: Date | null;
  finished_at: Date | null;
  created_at: Generated<Date>;
}

export type IntegrityCheckRun = Selectable<IntegrityCheckRunsTable>;
export type NewIntegrityCheckRun = Insertable<IntegrityCheckRunsTable>;
export type IntegrityCheckRunUpdate = Updateable<IntegrityCheckRunsTable>;

// ============================================
// Replay Audit (Phase 11)
// ============================================

export interface ReplayAuditTable {
  id: string;
  tenant_id: string;
  replay_type: 'snapshot' | 'detection' | 'evidence' | 'backfill';
  target_id: string;
  source_description: string | null;
  initiated_by: string | null;
  job_id: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result_json: unknown;
  started_at: Date | null;
  finished_at: Date | null;
  created_at: Generated<Date>;
}

export type ReplayAudit = Selectable<ReplayAuditTable>;
export type NewReplayAudit = Insertable<ReplayAuditTable>;
export type ReplayAuditUpdate = Updateable<ReplayAuditTable>;

// ============================================
// Database Schema
// ============================================

export interface Database {
  tenants: TenantsTable;
  users: UsersTable;
  roles: RolesTable;
  permissions: PermissionsTable;
  role_permissions: RolePermissionsTable;
  memberships: MembershipsTable;
  audit_logs: AuditLogsTable;
  idempotency_keys: IdempotencyKeysTable;
  jobs: JobsTable;
  storage_objects: StorageObjectsTable;
  // Phase 1 tables
  connections: ConnectionsTable;
  connection_credentials: ConnectionCredentialsTable;
  connector_schemas: ConnectorSchemasTable;
  connector_cursors: ConnectorCursorsTable;
  connector_runs: ConnectorRunsTable;
  raw_batches: RawBatchesTable;
  // Phase 2 tables
  snapshots: SnapshotsTable;
  sync_runs: SyncRunsTable;
  staging_records: StagingRecordsTable;
  customers: CustomersTable;
  contracts: ContractsTable;
  contract_versions: ContractVersionsTable;
  contract_terms: ContractTermsTable;
  invoices: InvoicesTable;
  invoice_lines: InvoiceLinesTable;
  products: ProductsTable;
  payments: PaymentsTable;
  usage_events: UsageEventsTable;
  price_plans: PricePlansTable;
  // Phase 3 tables
  identity_runs: IdentityRunsTable;
  customer_identities: CustomerIdentitiesTable;
  customer_identity_members: CustomerIdentityMembersTable;
  identity_candidates: IdentityCandidatesTable;
  identity_tasks: IdentityTasksTable;
  identity_decisions: IdentityDecisionsTable;
  identity_overrides: IdentityOverridesTable;
  identity_suppressions: IdentitySuppressionsTable;
  // Phase 4 tables
  uploads: UploadsTable;
  upload_files: UploadFilesTable;
  upload_mappings: UploadMappingsTable;
  upload_parse_runs: UploadParseRunsTable;
  upload_parse_errors: UploadParseErrorsTable;
  upload_templates: UploadTemplatesTable;
  // Phase 5 tables
  contract_documents: ContractDocumentsTable;
  contract_clauses: ContractClausesTable;
  contract_term_overrides: ContractTermOverridesTable;
  contract_readiness: ContractReadinessTable;
  // Phase 6 tables
  revenue_obligations: RevenueObligationsTable;
  revenue_allocations: RevenueAllocationsTable;
  revenue_schedules: RevenueSchedulesTable;
  recognition_events: RecognitionEventsTable;
  deferred_revenue_balances: DeferredRevenueBalancesTable;
  revrec_reconciliations: RevRecReconciliationsTable;
  // Phase 7 tables
  detection_runs: DetectionRunsTable;
  issues: IssuesTable;
  issue_status_history: IssueStatusHistoryTable;
  issue_sources: IssueSourcesTable;
  detection_configs: DetectionConfigsTable;
  fx_rates: FxRatesTable;
  // Phase 8 tables
  issue_evidence: IssueEvidenceTable;
  issue_evidence_sources: IssueEvidenceSourcesTable;
  issue_evidence_calculations: IssueEvidenceCalculationsTable;
  issue_evidence_clauses: IssueEvidenceClausesTable;
  issue_evidence_audit: IssueEvidenceAuditTable;
  evidence_generation_runs: EvidenceGenerationRunsTable;
  // Phase 9 tables
  simulation_templates: SimulationTemplatesTable;
  simulations: SimulationsTable;
  simulation_overrides: SimulationOverridesTable;
  simulation_runs: SimulationRunsTable;
  simulation_results: SimulationResultsTable;
  simulation_deltas: SimulationDeltasTable;
  simulation_audit: SimulationAuditTable;
  // Phase 10 tables
  exports: ExportsTable;
  export_files: ExportFilesTable;
  export_items: ExportItemsTable;
  export_schedules: ExportSchedulesTable;
  export_runs: ExportRunsTable;
  export_audit: ExportAuditTable;
  digest_subscriptions: DigestSubscriptionsTable;
  digest_runs: DigestRunsTable;
  // Phase 11 tables
  dead_letter_jobs: DeadLetterJobsTable;
  integrity_check_runs: IntegrityCheckRunsTable;
  replay_audit: ReplayAuditTable;
  // Phase 5/7 tables that predate the generated types
  review_queue: any;
  term_conflicts: any;
  term_conflict_candidates: any;
  contract_bundles: any;
  ai_discovered_issues: any;
  ai_recommendations: any;
}

