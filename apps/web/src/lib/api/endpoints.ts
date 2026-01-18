import { apiClient } from './client';
import { getStoredToken } from '@/lib/auth/auth.store';

function getToken() {
  return getStoredToken();
}

// ============================================
// Auth
// ============================================

export async function devLogin(tenantId: string, userId: string) {
  return apiClient.post<{ token: string; expiresAt: string }>('/auth/dev-token', {
    tenantId,
    userId,
  });
}

export async function getMe() {
  return apiClient.get<{
    userId: string;
    tenantId: string;
    email: string;
    name: string;
    role: string;
    permissions: string[];
  }>('/me', getToken());
}

// ============================================
// Connections
// ============================================

export interface Connection {
  id: string;
  tenantId: string;
  provider: 'stripe' | 'salesforce' | 'hubspot' | 'quickbooks' | 'docusign';
  status: 'pending' | 'connected' | 'error' | 'disconnected';
  displayName: string | null;
  createdAt: string;
  updatedAt: string;
  lastSyncAt: string | null;
  lastErrorMessage: string | null;
}

export async function listConnections() {
  return apiClient.get<{ connections: Connection[]; total: number }>('/connections', getToken());
}

export async function getConnection(id: string) {
  return apiClient.get<Connection>(`/connections/${id}`, getToken());
}

export async function startOAuth(provider: string) {
  return apiClient.post<{ authUrl: string; state: string }>(
    `/connections/${provider}/start`,
    {},
    getToken()
  );
}

/**
 * Create a Stripe connection using an API key instead of OAuth.
 * This is the simpler approach for accessing your own Stripe data.
 */
export async function connectStripeWithApiKey(apiKey: string, displayName?: string) {
  return apiClient.post<{
    connectionId: string;
    status: 'connected';
    externalAccountId?: string;
    message: string;
  }>(
    '/connections/stripe/api-key',
    { apiKey, displayName },
    getToken()
  );
}

export async function discoverSchema(connectionId: string) {
  return apiClient.post<{ connectionId: string; provider: string; objectCount: number }>(
    `/connections/${connectionId}/discover`,
    {},
    getToken()
  );
}

export async function triggerSync(
  connectionId: string,
  options: { runType?: 'full' | 'incremental'; objectTypes?: string[] } = {}
) {
  return apiClient.post<{ runId: string; jobId: string; status: string }>(
    `/connections/${connectionId}/sync`,
    options,
    getToken()
  );
}

export async function healthCheck(connectionId: string) {
  return apiClient.post<{ healthy: boolean; message?: string; checkedAt: string }>(
    `/connections/${connectionId}/health`,
    {},
    getToken()
  );
}

export async function deleteConnection(connectionId: string) {
  return apiClient.delete<{ deleted: boolean }>(`/connections/${connectionId}`, getToken());
}

// ============================================
// Admin: Jobs
// ============================================

export interface Job {
  id: string;
  tenantId: string;
  type: 'sync' | 'detect' | 'simulate' | 'export';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export async function listJobs(filters?: { type?: string; status?: string }) {
  const params = new URLSearchParams();
  if (filters?.type) params.set('type', filters.type);
  if (filters?.status) params.set('status', filters.status);
  const query = params.toString();
  return apiClient.get<{ jobs: Job[]; total: number }>(
    `/admin/jobs${query ? `?${query}` : ''}`,
    getToken()
  );
}

export async function getJob(id: string) {
  return apiClient.get<Job>(`/admin/jobs/${id}`, getToken());
}

export async function enqueueJob(payload: {
  type: string;
  tenantId: string;
  [key: string]: unknown;
}) {
  return apiClient.post<{ jobId: string }>('/admin/jobs/enqueue', { payload }, getToken());
}

// ============================================
// Admin: Audit
// ============================================

export interface AuditLog {
  id: string;
  tenantId: string;
  actorUserId: string | null;
  action: string;
  resource: string | null;
  createdAt: string;
}

export async function listAuditLogs(limit = 50) {
  return apiClient.get<{ logs: AuditLog[]; total: number }>(
    `/admin/audit?limit=${limit}`,
    getToken()
  );
}

// ============================================
// Health
// ============================================

export async function getHealthLive() {
  return apiClient.get<{ status: string; timestamp: string }>('/health/live');
}

export async function getHealthReady() {
  return apiClient.get<{ status: string; database: boolean; redis: boolean }>('/health/ready');
}

// ============================================
// Snapshots (Phase 2)
// ============================================

export interface Snapshot {
  id: string;
  tenantId: string;
  sourceRunId: string | null;
  status: 'pending' | 'building' | 'validating' | 'complete' | 'failed';
  startedAt: string;
  completedAt: string | null;
  metadata: Record<string, unknown>;
  recordCounts: Record<string, number>;
  qualityResults: Array<{
    checkName: string;
    status: 'passed' | 'warning' | 'failed';
    message?: string;
    affectedCount?: number;
  }>;
  createdAt: string;
}

export interface SyncRun {
  id: string;
  tenantId: string;
  snapshotId: string | null;
  runType: 'load' | 'normalize' | 'upsert' | 'finalize' | 'full';
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  finishedAt: string | null;
  recordsProcessed: number;
  errorCode: string | null;
  errorMessage: string | null;
  metadata?: Record<string, unknown>;
}

export async function listSnapshots(options?: { limit?: number; offset?: number; status?: string }) {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  if (options?.status) params.set('status', options.status);
  const query = params.toString();
  return apiClient.get<{ snapshots: Snapshot[]; total: number }>(
    `/snapshots${query ? `?${query}` : ''}`,
    getToken()
  );
}

export async function getSnapshot(id: string) {
  return apiClient.get<Snapshot & { syncRuns?: SyncRun[] }>(`/snapshots/${id}`, getToken());
}

export async function getLatestSnapshot() {
  return apiClient.get<Snapshot>('/snapshots/latest', getToken());
}

export async function triggerSnapshot(options?: { connectionIds?: string[]; runType?: 'full' | 'incremental' }) {
  return apiClient.post<{ snapshotId: string; status: string }>(
    '/snapshots/trigger',
    options || {},
    getToken()
  );
}

export async function getSnapshotRuns(snapshotId: string) {
  return apiClient.get<{ runs: SyncRun[]; total: number }>(
    `/snapshots/${snapshotId}/runs`,
    getToken()
  );
}

// ============================================
// Canonical Data (Phase 2)
// ============================================

export interface SummaryStats {
  snapshotId: string;
  snapshotStatus: string;
  snapshotCompletedAt: string | null;
  totalCustomers: number;
  activeCustomers: number;
  totalContracts: number;
  activeContracts: number;
  totalArr: number;
  totalInvoices: number;
  openInvoices: number;
  totalRevenue: number;
  amountDue: number;
}

export interface Customer {
  id: string;
  tenantId: string;
  snapshotId: string;
  externalId: string;
  externalIds?: Record<string, string>;
  name: string;
  email: string | null;
  status: 'active' | 'inactive' | 'churned' | 'prospect';
  metadata?: Record<string, unknown>;
  sourceSystem: string;
  createdAt: string;
}

export interface Contract {
  id: string;
  tenantId: string;
  snapshotId: string;
  customerId: string | null;
  externalId: string;
  name: string | null;
  status: 'draft' | 'active' | 'expired' | 'cancelled' | 'renewed';
  startDate: string | null;
  endDate: string | null;
  arr: number | null;
  currency: string;
  billingFrequency: 'monthly' | 'quarterly' | 'annually' | 'one_time' | null;
  autoRenew: boolean;
  metadata?: Record<string, unknown>;
  sourceSystem: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  tenantId: string;
  snapshotId: string;
  customerId: string | null;
  contractId: string | null;
  externalId: string;
  invoiceNumber: string | null;
  invoiceDate: string;
  dueDate: string | null;
  currency: string;
  subtotal: number | null;
  tax: number;
  total: number;
  amountPaid: number;
  amountDue: number | null;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible' | 'past_due';
  periodStart: string | null;
  periodEnd: string | null;
  metadata?: Record<string, unknown>;
  sourceSystem: string;
  createdAt: string;
}

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  productId: string | null;
  externalId: string | null;
  description: string | null;
  quantity: number;
  unitPrice: number | null;
  amount: number;
  currency: string;
  serviceStart: string | null;
  serviceEnd: string | null;
}

export async function getSummaryStats(snapshotId?: string) {
  const params = snapshotId ? `?snapshotId=${snapshotId}` : '';
  return apiClient.get<SummaryStats>(`/data/summary${params}`, getToken());
}

export async function listCustomers(options?: {
  snapshotId?: string;
  limit?: number;
  offset?: number;
  search?: string;
  status?: string;
}) {
  const params = new URLSearchParams();
  if (options?.snapshotId) params.set('snapshotId', options.snapshotId);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  if (options?.search) params.set('search', options.search);
  if (options?.status) params.set('status', options.status);
  const query = params.toString();
  return apiClient.get<{ customers: Customer[]; total: number; snapshotId: string }>(
    `/data/customers${query ? `?${query}` : ''}`,
    getToken()
  );
}

export async function listContracts(options?: {
  snapshotId?: string;
  limit?: number;
  offset?: number;
  search?: string;
  status?: string;
}) {
  const params = new URLSearchParams();
  if (options?.snapshotId) params.set('snapshotId', options.snapshotId);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  if (options?.search) params.set('search', options.search);
  if (options?.status) params.set('status', options.status);
  const query = params.toString();
  return apiClient.get<{ contracts: Contract[]; total: number; snapshotId: string }>(
    `/data/contracts${query ? `?${query}` : ''}`,
    getToken()
  );
}

export async function listInvoices(options?: {
  snapshotId?: string;
  limit?: number;
  offset?: number;
  search?: string;
  status?: string;
}) {
  const params = new URLSearchParams();
  if (options?.snapshotId) params.set('snapshotId', options.snapshotId);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  if (options?.search) params.set('search', options.search);
  if (options?.status) params.set('status', options.status);
  const query = params.toString();
  return apiClient.get<{ invoices: Invoice[]; total: number; snapshotId: string }>(
    `/data/invoices${query ? `?${query}` : ''}`,
    getToken()
  );
}

export async function getInvoiceDetail(invoiceId: string, snapshotId?: string) {
  const params = snapshotId ? `?snapshotId=${snapshotId}` : '';
  return apiClient.get<Invoice & { lines: InvoiceLine[] }>(
    `/data/invoices/${invoiceId}${params}`,
    getToken()
  );
}

// ============================================
// Products (Phase 2)
// ============================================

export interface Product {
  id: string;
  tenantId: string;
  snapshotId: string;
  externalId: string;
  externalIds?: Record<string, string>;
  sku: string | null;
  name: string;
  description: string | null;
  category: string | null;
  status: 'active' | 'inactive' | 'archived';
  metadata?: Record<string, unknown>;
  sourceSystem: string;
  createdAt: string;
}

export interface PricePlan {
  id: string;
  tenantId: string;
  snapshotId: string;
  productId: string;
  externalId: string | null;
  name: string | null;
  billingCadence: 'monthly' | 'quarterly' | 'annually' | 'one_time' | 'usage_based' | null;
  currency: string;
  price: unknown;
  status: 'active' | 'inactive' | 'archived';
  sourceSystem: string;
  createdAt: string;
}

export async function listProducts(options?: {
  snapshotId?: string;
  limit?: number;
  offset?: number;
  search?: string;
  status?: string;
}) {
  const params = new URLSearchParams();
  if (options?.snapshotId) params.set('snapshotId', options.snapshotId);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  if (options?.search) params.set('search', options.search);
  if (options?.status) params.set('status', options.status);
  const query = params.toString();
  return apiClient.get<{ products: Product[]; total: number; snapshotId: string }>(
    `/data/products${query ? `?${query}` : ''}`,
    getToken()
  );
}

export async function getProductDetail(productId: string, snapshotId?: string) {
  const params = snapshotId ? `?snapshotId=${snapshotId}` : '';
  return apiClient.get<Product & { pricePlans: PricePlan[] }>(
    `/data/products/${productId}${params}`,
    getToken()
  );
}

export async function listPricePlans(options?: {
  snapshotId?: string;
  limit?: number;
  offset?: number;
  status?: string;
}) {
  const params = new URLSearchParams();
  if (options?.snapshotId) params.set('snapshotId', options.snapshotId);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  if (options?.status) params.set('status', options.status);
  const query = params.toString();
  return apiClient.get<{ pricePlans: PricePlan[]; total: number; snapshotId: string }>(
    `/data/price-plans${query ? `?${query}` : ''}`,
    getToken()
  );
}

// ============================================
// Payments (Phase 2)
// ============================================

export interface Payment {
  id: string;
  tenantId: string;
  snapshotId: string;
  invoiceId: string | null;
  customerId: string | null;
  externalId: string;
  externalIds?: Record<string, string>;
  amount: number;
  currency: string;
  paymentDate: string;
  method: string | null;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded' | 'partially_refunded';
  metadata?: Record<string, unknown>;
  sourceSystem: string;
  createdAt: string;
}

export async function listPayments(options?: {
  snapshotId?: string;
  limit?: number;
  offset?: number;
  status?: string;
}) {
  const params = new URLSearchParams();
  if (options?.snapshotId) params.set('snapshotId', options.snapshotId);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  if (options?.status) params.set('status', options.status);
  const query = params.toString();
  return apiClient.get<{ payments: Payment[]; total: number; snapshotId: string }>(
    `/data/payments${query ? `?${query}` : ''}`,
    getToken()
  );
}

export async function getPaymentDetail(paymentId: string, snapshotId?: string) {
  const params = snapshotId ? `?snapshotId=${snapshotId}` : '';
  return apiClient.get<Payment>(
    `/data/payments/${paymentId}${params}`,
    getToken()
  );
}

// ============================================
// Customer & Contract Details (Phase 2)
// ============================================

export async function getCustomerDetail(customerId: string, snapshotId?: string) {
  const params = snapshotId ? `?snapshotId=${snapshotId}` : '';
  return apiClient.get<Customer & { 
    contracts: Contract[]; 
    invoices: Invoice[]; 
    payments: Payment[];
  }>(
    `/data/customers/${customerId}${params}`,
    getToken()
  );
}

export async function getContractDetail(contractId: string, snapshotId?: string) {
  const params = snapshotId ? `?snapshotId=${snapshotId}` : '';
  return apiClient.get<Contract & { 
    customer: Customer | null;
    versions: Array<{
      id: string;
      version: number;
      effectiveDate: string | null;
      source: string | null;
      changes: unknown;
      createdAt: string;
    }>;
    invoices: Invoice[];
  }>(
    `/data/contracts/${contractId}${params}`,
    getToken()
  );
}

// ============================================
// Ingestion Pipeline (Phase 2)
// ============================================

export interface IngestionStatus {
  snapshotId: string;
  snapshotStatus: 'pending' | 'building' | 'validating' | 'complete' | 'failed';
  currentStage: string;
  currentStageProgress: number;
  overallProgress: number;
  stages: Array<{
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    recordsProcessed: number;
    startedAt: string | null;
    finishedAt: string | null;
    errorMessage: string | null;
  }>;
  staging: {
    pending: number;
    normalized: number;
    failed: number;
    skipped: number;
    total: number;
  };
  startedAt: string;
  completedAt: string | null;
}

export async function getIngestionStatus(snapshotId: string) {
  return apiClient.get<IngestionStatus>(
    `/ingestion/status/${snapshotId}`,
    getToken()
  );
}

export async function getIngestionRuns(snapshotId: string) {
  return apiClient.get<{ runs: SyncRun[]; total: number }>(
    `/ingestion/runs/${snapshotId}`,
    getToken()
  );
}

export async function getIngestionStagingStats(snapshotId: string) {
  return apiClient.get<{
    snapshotId: string;
    byStatus: Record<string, number>;
    byObjectType: Record<string, number>;
    failedSample: Array<{
      id: string;
      objectType: string;
      externalId: string;
      errorMessage: string | null;
    }>;
  }>(
    `/ingestion/staging/${snapshotId}/stats`,
    getToken()
  );
}

export async function getActiveIngestion() {
  return apiClient.get<{
    activeSnapshots: Array<{
      id: string;
      status: string;
      startedAt: string;
      recordCounts: Record<string, number>;
    }>;
    runningRuns: Array<{
      id: string;
      snapshotId: string | null;
      runType: string;
      recordsProcessed: number;
      startedAt: string;
    }>;
  }>(
    '/ingestion/active',
    getToken()
  );
}

// ============================================
// Phase 3: Identity Resolution
// ============================================

export interface IdentitySummary {
  snapshotId: string;
  runId: string | null;
  runStatus: 'pending' | 'running' | 'completed' | 'failed' | null;
  stats: {
    total_customers?: number;
    candidates_generated?: number;
    auto_merged?: number;
    queued_for_review?: number;
    skipped?: number;
    identities_created?: number;
  };
  queue: {
    pending: number;
    assigned: number;
    resolved: number;
    total: number;
  };
}

export interface IdentityTask {
  id: string;
  candidateId: string;
  status: string;
  priority: number;
  score: number;
  features: {
    name_similarity?: number;
    domain_match?: boolean;
    tax_id_match?: boolean;
    address_match?: boolean;
    external_id_overlap?: boolean;
  };
  blockingKeys: string[];
  customerA: {
    id: string;
    name: string;
    email: string | null;
    sourceSystem: string;
    externalId: string;
  } | null;
  customerB: {
    id: string;
    name: string;
    email: string | null;
    sourceSystem: string;
    externalId: string;
  } | null;
  createdAt: string;
}

export interface ResolvedIdentity {
  id: string;
  primaryCustomerId: string;
  primaryName: string | null;
  primaryEmail: string | null;
  confidence: number;
  method: 'auto' | 'manual' | 'override';
  memberCount: number;
  sourceSystems: string[];
  createdAt: string;
}

export interface IdentityMember {
  id: string;
  customerId: string;
  name: string;
  email: string | null;
  sourceSystem: string;
  externalId: string;
  confidence: number;
  role: 'primary' | 'member';
  method: string;
}

export async function getIdentitySummary(snapshotId?: string) {
  const params = snapshotId ? `?snapshotId=${snapshotId}` : '';
  return apiClient.get<IdentitySummary>(
    `/identity/summary${params}`,
    getToken()
  );
}

export async function listIdentityRuns(snapshotId?: string) {
  const params = snapshotId ? `?snapshotId=${snapshotId}` : '';
  return apiClient.get<{
    runs: Array<{
      id: string;
      snapshotId: string;
      status: string;
      rulesVersion: string;
      stats: Record<string, unknown>;
      startedAt: string;
      finishedAt: string | null;
      errorMessage: string | null;
    }>;
    total: number;
  }>(
    `/identity/runs${params}`,
    getToken()
  );
}

export async function triggerIdentityResolution(snapshotId?: string, config?: Record<string, unknown>) {
  return apiClient.post<{
    runId: string;
    snapshotId: string;
    status: string;
  }>(
    '/identity/trigger',
    { snapshotId, config },
    getToken()
  );
}

export async function listIdentityQueue(options?: {
  snapshotId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (options?.snapshotId) params.set('snapshotId', options.snapshotId);
  if (options?.status) params.set('status', options.status);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  
  const query = params.toString();
  return apiClient.get<{
    tasks: IdentityTask[];
    total: number;
    snapshotId: string;
  }>(
    `/identity/queue${query ? `?${query}` : ''}`,
    getToken()
  );
}

export async function getIdentityTask(taskId: string) {
  return apiClient.get<IdentityTask>(
    `/identity/queue/${taskId}`,
    getToken()
  );
}

export async function submitIdentityDecision(
  taskId: string,
  decision: 'confirm' | 'reject' | 'merge' | 'split',
  notes?: string
) {
  return apiClient.post<{
    decisionId: string;
    taskId: string;
    decision: string;
    status: string;
  }>(
    '/identity/decisions',
    { taskId, decision, notes },
    getToken()
  );
}

export async function listResolvedCustomers(options?: {
  snapshotId?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (options?.snapshotId) params.set('snapshotId', options.snapshotId);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  
  const query = params.toString();
  return apiClient.get<{
    identities: ResolvedIdentity[];
    total: number;
    snapshotId: string;
  }>(
    `/identity/resolved${query ? `?${query}` : ''}`,
    getToken()
  );
}

export async function getResolvedIdentity(identityId: string) {
  return apiClient.get<{
    id: string;
    snapshotId: string;
    primaryCustomerId: string;
    confidence: number;
    method: string;
    memberCount: number;
    sourceSystems: string[];
    createdAt: string;
    members: IdentityMember[];
  }>(
    `/identity/resolved/${identityId}`,
    getToken()
  );
}

// ============================================
// Uploads (Phase 4)
// ============================================

export interface Upload {
  id: string;
  type: 'csv' | 'pdf';
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  entityType: string | null;
  displayName: string | null;
  fileCount: number;
  totalRows: number | null;
  validRows: number | null;
  errorCount: number;
  createdAt: string;
  completedAt: string | null;
}

export interface UploadFile {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

export interface UploadParseRun {
  id: string;
  runNumber: number;
  status: string;
  stats: Record<string, unknown> | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface UploadParseError {
  id: string;
  rowNumber: number;
  field: string | null;
  errorType: string;
  errorMessage: string;
  rawValue: string | null;
}

export interface UploadDetail extends Upload {
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  files: UploadFile[];
  parseRuns: UploadParseRun[];
  mapping: Record<string, unknown> | null;
}

export async function startCsvUpload(params: {
  fileName: string;
  contentType: string;
  fileSize?: number;
  entityType?: string;
  displayName?: string;
}) {
  return apiClient.post<{
    uploadId: string;
    fileId: string;
    presignedUrl: string;
    s3Key: string;
  }>(
    '/uploads/csv/start',
    {
      type: 'csv',
      fileName: params.fileName,
      contentType: params.contentType,
      fileSize: params.fileSize,
      entityType: params.entityType,
      displayName: params.displayName,
    },
    getToken()
  );
}

export async function completeCsvUpload(uploadId: string, mapping?: Record<string, unknown>, autoProcess = false) {
  return apiClient.post<{
    uploadId: string;
    parseRunId: string;
    status: string;
  }>(
    '/uploads/csv/complete',
    { uploadId, mapping, autoProcess },
    getToken()
  );
}

export async function startPdfUpload(params: {
  fileName: string;
  contentType: string;
  fileSize?: number;
  entityType?: string;
  displayName?: string;
}) {
  return apiClient.post<{
    uploadId: string;
    fileId: string;
    presignedUrl: string;
    s3Key: string;
  }>(
    '/uploads/pdf/start',
    {
      type: 'pdf',
      fileName: params.fileName,
      contentType: params.contentType,
      fileSize: params.fileSize,
      entityType: params.entityType ?? 'contract',
      displayName: params.displayName,
    },
    getToken()
  );
}

export async function completePdfUpload(uploadId: string, autoProcess = false) {
  return apiClient.post<{
    uploadId: string;
    parseRunId: string;
    status: string;
  }>(
    '/uploads/pdf/complete',
    { uploadId, autoProcess },
    getToken()
  );
}

export async function listUploads(options?: {
  type?: 'csv' | 'pdf';
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (options?.type) params.set('type', options.type);
  if (options?.status) params.set('status', options.status);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  
  const query = params.toString();
  return apiClient.get<{
    uploads: Upload[];
    total: number;
    limit: number;
    offset: number;
  }>(
    `/uploads${query ? `?${query}` : ''}`,
    getToken()
  );
}

export async function getUploadDetail(uploadId: string) {
  return apiClient.get<UploadDetail>(
    `/uploads/${uploadId}`,
    getToken()
  );
}

export async function getUploadErrors(uploadId: string, options?: {
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  
  const query = params.toString();
  return apiClient.get<{
    errors: UploadParseError[];
    total: number;
    limit: number;
    offset: number;
  }>(
    `/uploads/${uploadId}/errors${query ? `?${query}` : ''}`,
    getToken()
  );
}

export async function deleteUpload(uploadId: string) {
  return apiClient.delete<void>(
    `/uploads/${uploadId}`,
    getToken()
  );
}

export async function reprocessUpload(uploadId: string) {
  return apiClient.post<{
    uploadId: string;
    parseRunId: string;
    runNumber: number;
    status: string;
  }>(
    `/uploads/${uploadId}/reprocess`,
    {},
    getToken()
  );
}

export async function getUploadTemplates() {
  return apiClient.get<{
    templates: Array<{
      id: string;
      entityType: string;
      displayName: string;
      description: string | null;
      columns: unknown[];
      sampleData: unknown[] | null;
    }>;
  }>(
    '/uploads/templates',
    getToken()
  );
}

// ============================================
// Contract Intelligence (Phase 5)
// ============================================

export interface ContractDocument {
  id: string;
  contractId: string;
  versionId: string;
  version: number;
  fileName: string;
  status: 'pending' | 'extracting' | 'extracted' | 'failed';
  pageCount: number | null;
  extractedTextLength: number | null;
  uploadedAt: string;
  extractedAt: string | null;
  errorMessage: string | null;
}

export interface ContractClause {
  id: string;
  type: 'heading' | 'section' | 'paragraph' | 'list_item';
  label: string | null;
  text: string;
  startOffset: number;
  endOffset: number;
  pageNumber: number | null;
  sequenceNumber: number;
  parentClauseId: string | null;
}

export interface ContractTerm {
  id: string;
  termType: string;
  value: unknown;
  originalValue: unknown;
  confidence: number | null;
  extractionMethod: 'rule' | 'pattern' | 'llm' | null;
  matchedText: string | null;
  isOverridden: boolean;
  sourceClauseId: string | null;
  startOffset: number | null;
  endOffset: number | null;
  override: {
    value: unknown;
    reason: string | null;
    actorId: string;
    createdAt: string;
  } | null;
}

export interface ContractReadiness {
  contractId: string;
  versionId: string;
  status: 'ready' | 'needs_review' | 'incomplete';
  confidenceScore: number | null;
  requiredTermsCount: number;
  extractedTermsCount: number;
  missingTerms: string[];
  lowConfidenceTerms: Array<{ termType: string; confidence: number }>;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export async function getContractDocument(contractId: string) {
  return apiClient.get<ContractDocument>(
    `/contracts/${contractId}/document`,
    getToken()
  );
}

export async function getContractClauses(contractId: string, type?: string) {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  
  const query = params.toString();
  return apiClient.get<{
    contractId: string;
    versionId: string;
    clauses: ContractClause[];
    total: number;
  }>(
    `/contracts/${contractId}/clauses${query ? `?${query}` : ''}`,
    getToken()
  );
}

export async function getContractTerms(contractId: string, options?: {
  type?: string;
  minConfidence?: number;
}) {
  const params = new URLSearchParams();
  if (options?.type) params.set('type', options.type);
  if (options?.minConfidence) params.set('minConfidence', String(options.minConfidence));
  
  const query = params.toString();
  return apiClient.get<{
    contractId: string;
    versionId: string;
    terms: ContractTerm[];
    total: number;
  }>(
    `/contracts/${contractId}/terms${query ? `?${query}` : ''}`,
    getToken()
  );
}

export async function overrideContractTerm(
  contractId: string,
  termId: string,
  overrideValue: unknown,
  reason?: string
) {
  return apiClient.post<{
    success: boolean;
    overrideId: string;
    termId: string;
    message: string;
  }>(
    `/contracts/${contractId}/terms/${termId}/override`,
    { overrideValue, reason },
    getToken()
  );
}

export async function removeContractTermOverride(contractId: string, termId: string) {
  return apiClient.delete<{
    success: boolean;
    termId: string;
    message: string;
  }>(
    `/contracts/${contractId}/terms/${termId}/override`,
    getToken()
  );
}

export async function getContractReadiness(contractId: string, versionId?: string) {
  const params = new URLSearchParams();
  if (versionId) params.set('versionId', versionId);
  
  const query = params.toString();
  return apiClient.get<ContractReadiness>(
    `/contracts/${contractId}/readiness${query ? `?${query}` : ''}`,
    getToken()
  );
}

export async function markContractReviewed(contractId: string, notes?: string) {
  return apiClient.post<{
    success: boolean;
    contractId: string;
    versionId: string;
    message: string;
  }>(
    `/contracts/${contractId}/readiness/review`,
    { notes },
    getToken()
  );
}

export async function reprocessContract(contractId: string, forceReextract?: boolean) {
  return apiClient.post<{
    success: boolean;
    contractId: string;
    versionId: string;
    message: string;
  }>(
    `/contracts/${contractId}/reprocess`,
    { forceReextract },
    getToken()
  );
}

// ============================================
// Phase 6: Revenue Recognition
// ============================================

export interface RevRecObligation {
  id: string;
  contractId: string;
  contractName: string | null;
  customerName: string | null;
  obligationType: 'subscription' | 'usage' | 'one_time' | 'professional_services' | 'support';
  description: string | null;
  transactionPrice: number;
  allocatedAmount: number | null;
  currency: string;
  serviceStartDate: string | null;
  serviceEndDate: string | null;
  status: 'active' | 'completed' | 'cancelled' | 'amended';
  createdAt: string;
}

export interface RevRecSchedule {
  id: string;
  obligationId: string;
  contractId: string | null;
  periodStart: string;
  periodEnd: string;
  scheduledAmount: number;
  recognizedAmount: number;
  deferredAmount: number;
  recognitionMethod: 'straight_line' | 'usage_based' | 'milestone' | 'as_invoiced';
  status: 'pending' | 'partial' | 'recognized' | 'cancelled';
  periodDays: number | null;
  dailyRate: number | null;
}

export interface RevRecReconciliation {
  id: string;
  contractId: string;
  contractName: string | null;
  periodStart: string;
  periodEnd: string;
  status: 'matched' | 'timing_variance' | 'amount_variance' | 'missing_invoice' | 'unmatched';
  scheduledAmount: number;
  invoicedAmount: number;
  varianceAmount: number;
  variancePct: number | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface RevRecSummary {
  snapshotId: string;
  totalObligations: number;
  totalTransactionValue: number;
  totalRecognized: number;
  totalDeferred: number;
  reconciliationStatus: {
    matched: number;
    timingVariance: number;
    amountVariance: number;
    unmatched: number;
  };
}

export interface RevRecObligationDetail extends RevRecObligation {
  allocatedAmount: number | null;
  allocationPct: number | null;
  allocationBasis: string | null;
  schedules: RevRecSchedule[];
  events: Array<{
    id: string;
    eventDate: string;
    recognizedAmount: number;
    eventType: string;
    description: string | null;
  }>;
}

export async function getRevRecSummary(snapshotId?: string) {
  const params = snapshotId ? `?snapshotId=${snapshotId}` : '';
  return apiClient.get<RevRecSummary>(`/revrec/summary${params}`, getToken());
}

export async function listRevRecObligations(options?: {
  snapshotId?: string;
  contractId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (options?.snapshotId) params.set('snapshotId', options.snapshotId);
  if (options?.contractId) params.set('contractId', options.contractId);
  if (options?.status) params.set('status', options.status);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  
  const query = params.toString();
  return apiClient.get<{ obligations: RevRecObligation[]; total: number }>(
    `/revrec/obligations${query ? `?${query}` : ''}`,
    getToken()
  );
}

export async function getRevRecObligation(id: string) {
  return apiClient.get<RevRecObligationDetail>(
    `/revrec/obligations/${id}`,
    getToken()
  );
}

export async function listRevRecSchedules(options?: {
  snapshotId?: string;
  obligationId?: string;
  periodStart?: string;
  periodEnd?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (options?.snapshotId) params.set('snapshotId', options.snapshotId);
  if (options?.obligationId) params.set('obligationId', options.obligationId);
  if (options?.periodStart) params.set('periodStart', options.periodStart);
  if (options?.periodEnd) params.set('periodEnd', options.periodEnd);
  if (options?.status) params.set('status', options.status);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  
  const query = params.toString();
  return apiClient.get<{ schedules: RevRecSchedule[]; total: number }>(
    `/revrec/schedules${query ? `?${query}` : ''}`,
    getToken()
  );
}

export async function listRevRecReconciliations(options?: {
  snapshotId?: string;
  contractId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (options?.snapshotId) params.set('snapshotId', options.snapshotId);
  if (options?.contractId) params.set('contractId', options.contractId);
  if (options?.status) params.set('status', options.status);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  
  const query = params.toString();
  return apiClient.get<{ reconciliations: RevRecReconciliation[]; total: number }>(
    `/revrec/reconciliations${query ? `?${query}` : ''}`,
    getToken()
  );
}

export async function triggerRevRecCompute(snapshotId: string, options?: {
  contractIds?: string[];
  forceRecompute?: boolean;
}) {
  return apiClient.post<{ jobId: string; message: string }>(
    '/revrec/compute',
    {
      snapshotId,
      contractIds: options?.contractIds,
      forceRecompute: options?.forceRecompute,
    },
    getToken()
  );
}

export async function triggerRevRecReconcile(snapshotId: string, periodStart: string, periodEnd: string) {
  return apiClient.post<{ jobId: string; message: string }>(
    '/revrec/reconcile',
    { snapshotId, periodStart, periodEnd },
    getToken()
  );
}

// ============================================
// Phase 7: Detection Engine / Issues
// ============================================

export type IssueSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'open' | 'resolved' | 'dismissed' | 'acknowledged';
export type IssueCategory = 'data_quality' | 'billing' | 'discount' | 'revrec' | 'credits' | 
  'usage' | 'lifecycle' | 'multi_entity' | 'cross_snapshot' | 'tax_fees' | 'fx_currency';

export interface Issue {
  id: string;
  tenantId: string;
  snapshotId: string;
  runId: string;
  ruleId: string;
  ruleVersion: string;
  issueKey: string;
  category: IssueCategory;
  status: IssueStatus;
  severity: IssueSeverity;
  confidence: number;
  impactAmount: number | null;
  currency: string;
  expected: Record<string, unknown>;
  actual: Record<string, unknown>;
  dimensions: Record<string, unknown>;
  contractId: string | null;
  invoiceId: string | null;
  customerId: string | null;
  dataQualityFlags: string[] | null;
  suppressedByRule: string | null;
  ruleMetadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface IssueSource {
  id: string;
  sourceType: string;
  sourceId: string;
  sourceSystem: string | null;
  fieldName: string | null;
  fieldValue: unknown;
  createdAt: string;
}

export interface IssueStatusChange {
  id: string;
  fromStatus: string;
  toStatus: string;
  actorUserId: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface IssueDetail extends Issue {
  sources: IssueSource[];
  history: IssueStatusChange[];
}

export interface IssueSummary {
  totalCount: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  totalImpact: number;
  avgConfidence: number;
}

export interface DetectionRun {
  id: string;
  snapshotId: string;
  rulesetVersion: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  issuesTotal: number | null;
  issuesBySeverity: Record<string, number> | null;
  issuesByCategory: Record<string, number> | null;
  config: Record<string, unknown> | null;
  stats: Record<string, unknown> | null;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface DetectionRunDetail extends DetectionRun {
  ruleBreakdown: Record<string, number>;
}

export async function listIssues(options?: {
  snapshotId?: string;
  status?: IssueStatus;
  severity?: IssueSeverity;
  category?: IssueCategory;
  ruleId?: string;
  contractId?: string;
  customerId?: string;
  invoiceId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'severity' | 'impactAmount' | 'status';
  sortOrder?: 'asc' | 'desc';
}) {
  const params = new URLSearchParams();
  if (options?.snapshotId) params.set('snapshotId', options.snapshotId);
  if (options?.status) params.set('status', options.status);
  if (options?.severity) params.set('severity', options.severity);
  if (options?.category) params.set('category', options.category);
  if (options?.ruleId) params.set('ruleId', options.ruleId);
  if (options?.contractId) params.set('contractId', options.contractId);
  if (options?.customerId) params.set('customerId', options.customerId);
  if (options?.invoiceId) params.set('invoiceId', options.invoiceId);
  if (options?.search) params.set('search', options.search);
  if (options?.page) params.set('page', String(options.page));
  if (options?.pageSize) params.set('pageSize', String(options.pageSize));
  if (options?.sortBy) params.set('sortBy', options.sortBy);
  if (options?.sortOrder) params.set('sortOrder', options.sortOrder);
  
  const query = params.toString();
  return apiClient.get<{
    issues: Issue[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>(
    `/issues${query ? `?${query}` : ''}`,
    getToken()
  );
}

export async function getIssue(id: string) {
  return apiClient.get<IssueDetail>(
    `/issues/${id}`,
    getToken()
  );
}

export async function getIssueSummary(snapshotId?: string) {
  const params = snapshotId ? `?snapshotId=${snapshotId}` : '';
  return apiClient.get<IssueSummary>(
    `/issues/summary${params}`,
    getToken()
  );
}

export async function updateIssueStatus(id: string, status: IssueStatus, reason?: string) {
  return apiClient.post<{ success: boolean; id: string; status: IssueStatus }>(
    `/issues/${id}/status`,
    { status, reason },
    getToken()
  );
}

export async function bulkUpdateIssueStatus(
  issueIds: string[],
  status: IssueStatus,
  reason?: string
) {
  return apiClient.post<{ success: boolean; updated: number; total: number }>(
    '/issues/bulk-status',
    { issueIds, status, reason },
    getToken()
  );
}

export async function listDetectionRuns(options?: {
  snapshotId?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (options?.snapshotId) params.set('snapshotId', options.snapshotId);
  if (options?.limit) params.set('limit', String(options.limit));
  
  const query = params.toString();
  return apiClient.get<{ runs: DetectionRun[]; total: number }>(
    `/issues/detection-runs${query ? `?${query}` : ''}`,
    getToken()
  );
}

export async function getDetectionRun(id: string) {
  return apiClient.get<DetectionRunDetail>(
    `/issues/detection-runs/${id}`,
    getToken()
  );
}

export async function triggerDetectionRun(snapshotId: string, options?: {
  rulesetVersion?: string;
  config?: Record<string, unknown>;
}) {
  return apiClient.post<{ success: boolean; jobId: string }>(
    '/issues/detection-runs',
    {
      snapshotId,
      rulesetVersion: options?.rulesetVersion,
      config: options?.config,
    },
    getToken()
  );
}

export async function replayDetectionRun(runId: string, rulesetVersion?: string) {
  return apiClient.post<{ success: boolean; jobId: string }>(
    `/issues/detection-runs/${runId}/replay`,
    { rulesetVersion },
    getToken()
  );
}

// ============================================
// Phase 8: Evidence Generation
// ============================================

export interface IssueEvidence {
  id: string;
  tenantId: string;
  snapshotId: string;
  issueId: string;
  evidenceVersion: number;
  evidenceType: 'full' | 'summary' | 'calculation' | 'clause' | 'source';
  title: string;
  summary: string;
  dataJson: Record<string, unknown>;
  completenessScore: number;
  completenessBreakdown: Record<string, number>;
  s3Key: string | null;
  ruleId: string | null;
  ruleVersion: string | null;
  createdAt: string;
}

export interface IssueEvidenceSource {
  id: string;
  tenantId: string;
  evidenceId: string;
  issueId: string;
  sourceType: string;
  sourceId: string;
  sourceSystem: string | null;
  sourceExternalId: string | null;
  fieldName: string | null;
  fieldValueJson: unknown;
  s3Key: string | null;
  snapshotValueJson: unknown;
  createdAt: string;
}

export interface IssueEvidenceCalculation {
  id: string;
  tenantId: string;
  evidenceId: string;
  issueId: string;
  calcName: string;
  calcType: string;
  formula: string | null;
  inputsJson: Record<string, unknown>;
  outputsJson: Record<string, unknown>;
  ruleId: string | null;
  ruleVersion: string | null;
  sequenceNumber: number;
  isReproducible: boolean;
  notes: string | null;
  createdAt: string;
}

export interface IssueEvidenceClause {
  id: string;
  tenantId: string;
  evidenceId: string;
  issueId: string;
  clauseId: string | null;
  contractId: string | null;
  contractVersionId: string | null;
  documentId: string | null;
  clauseType: string | null;
  clauseLabel: string | null;
  excerpt: string;
  fullTextS3Key: string | null;
  startOffset: number | null;
  endOffset: number | null;
  pageNumber: number | null;
  relevanceScore: number | null;
  createdAt: string;
}

export interface IssueEvidenceAudit {
  id: string;
  tenantId: string;
  issueId: string;
  evidenceId: string | null;
  evidenceVersion: number;
  action: 'generated' | 'regenerated' | 'failed' | 'expired' | 'archived';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  triggerType: 'auto' | 'manual' | 'scheduled' | 'detection_run';
  actorUserId: string | null;
  previousVersion: number | null;
  completenessScore: number | null;
  processingTimeMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  metadataJson: Record<string, unknown> | null;
  generatedAt: string;
  createdAt: string;
}

export interface EvidenceResponse {
  evidence: IssueEvidence;
  sources: IssueEvidenceSource[];
  calculations: IssueEvidenceCalculation[];
  clauses: IssueEvidenceClause[];
  audit: IssueEvidenceAudit[];
  downloadUrl: string | null;
}

export interface EvidenceSummaryResponse {
  issueId: string;
  evidenceVersion: number;
  title: string;
  summary: string;
  completenessScore: number;
  completenessBreakdown: Record<string, number>;
  hasS3Artifact: boolean;
  sourcesCount: number;
  calculationsCount: number;
  clausesCount: number;
  generatedAt: string;
}

export async function getIssueEvidence(issueId: string, options?: {
  includeCalculations?: boolean;
  includeClauses?: boolean;
  includeSources?: boolean;
  includeAudit?: boolean;
}) {
  const params = new URLSearchParams();
  if (options?.includeCalculations !== undefined) params.set('includeCalculations', String(options.includeCalculations));
  if (options?.includeClauses !== undefined) params.set('includeClauses', String(options.includeClauses));
  if (options?.includeSources !== undefined) params.set('includeSources', String(options.includeSources));
  if (options?.includeAudit !== undefined) params.set('includeAudit', String(options.includeAudit));
  
  const query = params.toString();
  return apiClient.get<EvidenceResponse>(
    `/issues/${issueId}/evidence${query ? `?${query}` : ''}`,
    getToken()
  );
}

export async function getIssueEvidenceSummary(issueId: string) {
  return apiClient.get<EvidenceSummaryResponse>(
    `/issues/${issueId}/evidence/summary`,
    getToken()
  );
}

export async function getIssueEvidenceDownloadUrl(issueId: string) {
  return apiClient.get<{ downloadUrl: string; expiresIn: number }>(
    `/issues/${issueId}/evidence/download`,
    getToken()
  );
}

export async function regenerateIssueEvidence(issueId: string, options?: {
  force?: boolean;
  reason?: string;
}) {
  return apiClient.post<{ success: boolean; jobId: string }>(
    `/issues/${issueId}/evidence/regenerate`,
    options || {},
    getToken()
  );
}

// ============================================
// Simulations (Phase 9)
// ============================================

export interface Simulation {
  id: string;
  snapshotId: string;
  name: string;
  description: string | null;
  status: 'draft' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  templateId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  overridesCount?: number;
  latestRun?: SimulationRun | null;
}

export interface SimulationOverride {
  id: string;
  overrideType: 'contract_term' | 'usage_adjustment' | 'billing_adjustment' | 'timing_shift' | 'discount_change' | 'price_change';
  targetType: 'contract' | 'invoice' | 'customer' | 'obligation' | 'line_item';
  targetId: string;
  fieldPath: string | null;
  originalValue: unknown;
  overrideValue: unknown;
  sequenceNumber: number;
  isValid: boolean;
  validationMessage: string | null;
  createdAt: string;
}

export interface SimulationRun {
  id: string;
  runNumber: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string | null;
  finishedAt: string | null;
  processingTimeMs: number | null;
  triggeredBy: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface SimulationResult {
  id: string;
  runId: string;
  simulationId: string;
  totalRevenueBaseline: number | null;
  totalRevenueSimulated: number | null;
  totalRevenueDelta: number | null;
  totalRevenueDeltaPct: number | null;
  totalRecognizedBaseline: number | null;
  totalRecognizedSimulated: number | null;
  totalDeferredBaseline: number | null;
  totalDeferredSimulated: number | null;
  contractsAffected: number;
  obligationsAffected: number;
  overridesApplied: number;
  overridesSkipped: number;
  summary: Record<string, unknown>;
  warnings: unknown[];
  createdAt: string;
}

export interface SimulationDelta {
  id: string;
  deltaType: 'revenue_total' | 'revenue_period' | 'recognized_shift' | 'deferred_shift' | 'contract_impact' | 'obligation_impact';
  targetType: string | null;
  targetId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  baselineAmount: number | null;
  simulatedAmount: number | null;
  deltaAmount: number;
  deltaPct: number | null;
  currency: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface SimulationTemplate {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  overridesCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SimulationListQuery {
  snapshotId?: string;
  status?: string;
  templateId?: string;
  createdBy?: string;
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'updated_at' | 'name' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export async function listSimulations(query?: SimulationListQuery) {
  const params = new URLSearchParams();
  if (query?.snapshotId) params.set('snapshotId', query.snapshotId);
  if (query?.status) params.set('status', query.status);
  if (query?.templateId) params.set('templateId', query.templateId);
  if (query?.createdBy) params.set('createdBy', query.createdBy);
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));
  if (query?.sortBy) params.set('sortBy', query.sortBy);
  if (query?.sortOrder) params.set('sortOrder', query.sortOrder);
  
  const queryStr = params.toString();
  return apiClient.get<{ simulations: Simulation[]; total: number; page: number; limit: number }>(
    `/simulations${queryStr ? `?${queryStr}` : ''}`,
    getToken()
  );
}

export async function createSimulation(data: {
  snapshotId: string;
  name: string;
  description?: string;
  templateId?: string;
}) {
  return apiClient.post<{ id: string; message: string }>(
    '/simulations',
    data,
    getToken()
  );
}

export async function getSimulation(id: string) {
  return apiClient.get<Simulation>(`/simulations/${id}`, getToken());
}

export async function updateSimulation(id: string, data: {
  name?: string;
  description?: string;
  status?: 'draft' | 'cancelled';
}) {
  return apiClient.patch<{ message: string }>(`/simulations/${id}`, data, getToken());
}

export async function deleteSimulation(id: string) {
  return apiClient.delete<{ message: string }>(`/simulations/${id}`, getToken());
}

export async function getSimulationOverrides(simulationId: string) {
  return apiClient.get<{ overrides: SimulationOverride[] }>(
    `/simulations/${simulationId}/overrides`,
    getToken()
  );
}

export async function addSimulationOverride(simulationId: string, override: {
  overrideType: string;
  targetType: string;
  targetId: string;
  fieldPath?: string;
  overrideValue: unknown;
  sequenceNumber?: number;
}) {
  return apiClient.post<{ id: string; message: string }>(
    `/simulations/${simulationId}/overrides`,
    override,
    getToken()
  );
}

export async function deleteSimulationOverride(simulationId: string, overrideId: string) {
  return apiClient.delete<{ message: string }>(
    `/simulations/${simulationId}/overrides/${overrideId}`,
    getToken()
  );
}

export async function runSimulation(id: string, options?: {
  recomputeRevRec?: boolean;
  includeIssueAnalysis?: boolean;
}) {
  return apiClient.post<{ runId: string; runNumber: number; message: string }>(
    `/simulations/${id}/run`,
    options || {},
    getToken()
  );
}

export async function getSimulationRuns(simulationId: string, query?: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (query?.status) params.set('status', query.status);
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));
  
  const queryStr = params.toString();
  return apiClient.get<{ runs: SimulationRun[] }>(
    `/simulations/${simulationId}/runs${queryStr ? `?${queryStr}` : ''}`,
    getToken()
  );
}

export async function getSimulationRunResults(simulationId: string, runId: string) {
  return apiClient.get<SimulationResult>(
    `/simulations/${simulationId}/runs/${runId}/results`,
    getToken()
  );
}

export async function getSimulationRunDeltas(simulationId: string, runId: string, query?: {
  deltaType?: string;
  targetType?: string;
  targetId?: string;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (query?.deltaType) params.set('deltaType', query.deltaType);
  if (query?.targetType) params.set('targetType', query.targetType);
  if (query?.targetId) params.set('targetId', query.targetId);
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));
  
  const queryStr = params.toString();
  return apiClient.get<{ deltas: SimulationDelta[] }>(
    `/simulations/${simulationId}/runs/${runId}/deltas${queryStr ? `?${queryStr}` : ''}`,
    getToken()
  );
}

export async function listSimulationTemplates(query?: {
  isActive?: boolean;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (query?.isActive !== undefined) params.set('isActive', String(query.isActive));
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));
  
  const queryStr = params.toString();
  return apiClient.get<{ templates: SimulationTemplate[] }>(
    `/simulations/templates${queryStr ? `?${queryStr}` : ''}`,
    getToken()
  );
}

export async function createSimulationTemplate(data: {
  name: string;
  description?: string;
  overrides: Array<{
    overrideType: string;
    targetType: string;
    targetId: string;
    fieldPath?: string;
    overrideValue: unknown;
  }>;
  defaultOptions?: Record<string, unknown>;
}) {
  return apiClient.post<{ id: string; message: string }>(
    '/simulations/templates',
    data,
    getToken()
  );
}

export async function getSimulationTemplate(id: string) {
  return apiClient.get<SimulationTemplate & { templateJson: unknown }>(
    `/simulations/templates/${id}`,
    getToken()
  );
}

export async function applySimulationTemplate(templateId: string, data: {
  snapshotId: string;
  name: string;
  description?: string;
}) {
  return apiClient.post<{ simulationId: string; message: string }>(
    `/simulations/templates/${templateId}/apply`,
    data,
    getToken()
  );
}

// ============================================
// Exports (Phase 10)
// ============================================

export interface Export {
  id: string;
  tenantId: string;
  snapshotId: string;
  exportType: 'issues_csv' | 'revrec_csv' | 'contracts_csv' | 'contracts_pdf' | 'audit_bundle_pdf' | 'executive_summary_pdf';
  format: 'csv' | 'pdf' | 'xlsx';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  requestedBy: string | null;
  options: Record<string, unknown>;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface ExportFile {
  id: string;
  exportId: string;
  s3Key: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string | null;
  createdAt: string;
}

export async function createExport(data: {
  snapshotId: string;
  exportType: string;
  options?: {
    includeEvidence?: boolean;
    dateRange?: { start: string; end: string };
    filters?: Record<string, unknown>;
  };
}) {
  return apiClient.post<{ export: Export; jobId: string }>(
    '/exports',
    data,
    getToken()
  );
}

export async function listExports(query?: {
  snapshotId?: string;
  exportType?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (query?.snapshotId) params.set('snapshotId', query.snapshotId);
  if (query?.exportType) params.set('exportType', query.exportType);
  if (query?.status) params.set('status', query.status);
  if (query?.limit) params.set('limit', String(query.limit));
  if (query?.offset) params.set('offset', String(query.offset));
  
  const queryStr = params.toString();
  return apiClient.get<{ exports: Export[]; total: number; limit: number; offset: number }>(
    `/exports${queryStr ? `?${queryStr}` : ''}`,
    getToken()
  );
}

export async function getExport(id: string) {
  return apiClient.get<{ export: Export; files: ExportFile[] }>(
    `/exports/${id}`,
    getToken()
  );
}

export async function getExportDownloadUrl(id: string, fileId?: string) {
  const params = fileId ? `?fileId=${fileId}` : '';
  return apiClient.get<{
    downloadUrl: string;
    expiresAt: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
  }>(
    `/exports/${id}/download${params}`,
    getToken()
  );
}

export async function regenerateExport(id: string) {
  return apiClient.post<{ success: boolean; jobId: string }>(
    `/exports/${id}/regenerate`,
    {},
    getToken()
  );
}

export async function deleteExport(id: string) {
  return apiClient.delete<{ success: boolean; action: string }>(
    `/exports/${id}`,
    getToken()
  );
}

// ============================================
// Digests (Phase 10)
// ============================================

export interface DigestSubscription {
  id: string;
  tenantId: string;
  name: string;
  cadence: 'daily' | 'weekly' | 'monthly';
  scope: Record<string, unknown>;
  recipients: string[];
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DigestRun {
  id: string;
  tenantId: string;
  subscriptionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  itemsCount: number;
  recipientsCount: number;
  emailsSent: number;
  emailsFailed: number;
  snapshotId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export async function createDigestSubscription(data: {
  name: string;
  cadence: 'daily' | 'weekly' | 'monthly';
  scope?: Record<string, unknown>;
  recipients: string[];
}) {
  return apiClient.post<{ subscription: DigestSubscription }>(
    '/digests',
    data,
    getToken()
  );
}

export async function listDigestSubscriptions(query?: {
  isActive?: boolean;
  cadence?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (query?.isActive !== undefined) params.set('isActive', String(query.isActive));
  if (query?.cadence) params.set('cadence', query.cadence);
  if (query?.limit) params.set('limit', String(query.limit));
  if (query?.offset) params.set('offset', String(query.offset));
  
  const queryStr = params.toString();
  return apiClient.get<{ subscriptions: DigestSubscription[]; total: number; limit: number; offset: number }>(
    `/digests${queryStr ? `?${queryStr}` : ''}`,
    getToken()
  );
}

export async function getDigestSubscription(id: string) {
  return apiClient.get<{ subscription: DigestSubscription }>(
    `/digests/${id}`,
    getToken()
  );
}

export async function updateDigestSubscription(id: string, data: {
  name?: string;
  cadence?: 'daily' | 'weekly' | 'monthly';
  scope?: Record<string, unknown>;
  recipients?: string[];
  isActive?: boolean;
}) {
  return apiClient.patch<{ subscription: DigestSubscription }>(
    `/digests/${id}`,
    data,
    getToken()
  );
}

export async function deleteDigestSubscription(id: string) {
  return apiClient.delete<{ success: boolean }>(
    `/digests/${id}`,
    getToken()
  );
}

export async function getDigestRuns(subscriptionId: string, query?: {
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (query?.limit) params.set('limit', String(query.limit));
  if (query?.offset) params.set('offset', String(query.offset));
  
  const queryStr = params.toString();
  return apiClient.get<{ runs: DigestRun[]; total: number; limit: number; offset: number }>(
    `/digests/${subscriptionId}/runs${queryStr ? `?${queryStr}` : ''}`,
    getToken()
  );
}

export async function triggerDigest(subscriptionId: string) {
  return apiClient.post<{ runId: string; jobId: string; status: string }>(
    `/digests/${subscriptionId}/trigger`,
    {},
    getToken()
  );
}