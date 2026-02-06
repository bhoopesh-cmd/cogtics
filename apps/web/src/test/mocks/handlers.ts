import { http, HttpResponse } from 'msw';

// Match both absolute and relative paths
const API_BASE = 'http://localhost:3000';

// Helper to create handlers for both absolute and relative paths
const apiHandler = (method: 'get' | 'post' | 'patch' | 'delete', path: string, resolver: Parameters<typeof http.get>[1]) => {
  const handlers = [];
  // Absolute URL (http://localhost:3000/path)
  handlers.push(http[method](`${API_BASE}${path}`, resolver));
  // Relative URL (/path)
  handlers.push(http[method](path, resolver));
  // Relative URL with /api prefix (/api/path)
  if (!path.startsWith('/api')) {
    handlers.push(http[method](`/api${path}`, resolver));
  }
  return handlers;
};

// Mock data
const mockUser = {
  id: 'user_01',
  email: 'admin@cogtics.dev',
  role: 'admin',
  tenantId: 'tenant_01',
  name: 'Admin User',
};

const mockTenant = {
  id: 'tenant_01',
  name: 'Test Tenant',
  plan: 'enterprise',
};

const mockIssues = [
  {
    id: 'issue_001',
    ruleId: 'R001',
    severity: 'critical',
    title: 'Billing discrepancy detected',
    description: 'Invoice amount does not match contract terms',
    contractId: 'con_001',
    snapshotId: 'snap_001',
    status: 'open',
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'issue_002',
    ruleId: 'R011',
    severity: 'high',
    title: 'Discount exceeds threshold',
    description: 'Applied discount is 35% but max allowed is 25%',
    contractId: 'con_002',
    snapshotId: 'snap_001',
    status: 'open',
    createdAt: '2026-01-15T11:00:00Z',
  },
];

const mockContracts = [
  {
    id: 'con_001',
    customerId: 'cus_001',
    name: 'Enterprise Agreement Q1',
    status: 'active',
    totalValue: 50000,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    snapshotId: 'snap_001',
  },
  {
    id: 'con_002',
    customerId: 'cus_002',
    name: 'SaaS Subscription',
    status: 'active',
    totalValue: 12000,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    snapshotId: 'snap_001',
  },
];

const mockUploads = [
  {
    id: 'upload_001',
    fileName: 'contract_q1.pdf',
    status: 'completed',
    type: 'pdf',
    createdAt: '2026-01-10T09:00:00Z',
  },
];

const mockConnections = [
  {
    id: 'conn_001',
    provider: 'stripe',
    status: 'connected',
    lastSyncAt: '2026-01-15T08:00:00Z',
  },
  {
    id: 'conn_002',
    provider: 'salesforce',
    status: 'connected',
    lastSyncAt: '2026-01-15T07:00:00Z',
  },
];

export const handlers = [
  // Health check
  http.get(`${API_BASE}/health`, () => {
    return HttpResponse.json({ status: 'healthy', timestamp: new Date().toISOString() });
  }),

  // Auth endpoints
  http.get(`${API_BASE}/auth/me`, () => {
    return HttpResponse.json(mockUser);
  }),

  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    if (body.email && body.password) {
      return HttpResponse.json({ token: 'mock-jwt-token', user: mockUser });
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }),

  http.post(`${API_BASE}/auth/logout`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Tenant
  http.get(`${API_BASE}/tenant`, () => {
    return HttpResponse.json(mockTenant);
  }),

  // Issues
  http.get(`${API_BASE}/issues`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const severity = url.searchParams.get('severity');

    let filtered = [...mockIssues];
    if (status) filtered = filtered.filter(i => i.status === status);
    if (severity) filtered = filtered.filter(i => i.severity === severity);

    return HttpResponse.json({ items: filtered, total: filtered.length });
  }),

  http.get(`${API_BASE}/issues/:id`, ({ params }) => {
    const issue = mockIssues.find(i => i.id === params.id);
    if (issue) return HttpResponse.json(issue);
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }),

  http.patch(`${API_BASE}/issues/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    const issue = mockIssues.find(i => i.id === params.id);
    if (issue) return HttpResponse.json({ ...issue, ...body });
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }),

  // Contracts
  http.get(`${API_BASE}/contracts`, () => {
    return HttpResponse.json({ items: mockContracts, total: mockContracts.length });
  }),

  http.get(`${API_BASE}/contracts/:id`, ({ params }) => {
    const contract = mockContracts.find(c => c.id === params.id);
    if (contract) return HttpResponse.json(contract);
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }),

  // Uploads
  http.get(`${API_BASE}/uploads`, () => {
    return HttpResponse.json({ items: mockUploads, total: mockUploads.length });
  }),

  http.post(`${API_BASE}/uploads/pdf/start`, async ({ request }) => {
    const body = await request.json() as { fileName: string };
    return HttpResponse.json({
      uploadId: 'upload_new_001',
      presignedUrl: 'https://minio.local/presigned-url',
      fileName: body.fileName,
    });
  }),

  http.post(`${API_BASE}/uploads/pdf/complete`, async ({ request }) => {
    const body = await request.json() as { uploadId: string };
    return HttpResponse.json({
      uploadId: body.uploadId,
      status: 'processing',
    });
  }),

  http.post(`${API_BASE}/uploads/csv/start`, async ({ request }) => {
    const body = await request.json() as { fileName: string };
    return HttpResponse.json({
      uploadId: 'upload_csv_001',
      presignedUrl: 'https://minio.local/presigned-url-csv',
      fileName: body.fileName,
    });
  }),

  // Connections
  http.get(`${API_BASE}/connections`, () => {
    return HttpResponse.json({ items: mockConnections, total: mockConnections.length });
  }),

  http.post(`${API_BASE}/connections/:provider/start`, ({ params }) => {
    return HttpResponse.json({
      authUrl: `https://oauth.${params.provider}.com/authorize?client_id=xxx`,
      state: 'mock-state-token',
    });
  }),

  // Simulations
  http.get(`${API_BASE}/simulations`, () => {
    return HttpResponse.json({ items: [], total: 0 });
  }),

  http.post(`${API_BASE}/simulations`, async ({ request }) => {
    const body = await request.json() as { name: string };
    return HttpResponse.json({
      id: 'sim_001',
      name: body.name,
      status: 'created',
      createdAt: new Date().toISOString(),
    });
  }),

  // Exports
  http.get(`${API_BASE}/exports`, () => {
    return HttpResponse.json({ items: [], total: 0 });
  }),

  http.post(`${API_BASE}/exports`, async ({ request }) => {
    const body = await request.json() as { type: string };
    return HttpResponse.json({
      id: 'export_001',
      type: body.type,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
  }),

  // RevRec
  http.get(`${API_BASE}/revrec/obligations`, () => {
    return HttpResponse.json({ items: [], total: 0 });
  }),

  http.get(`${API_BASE}/revrec/schedules`, () => {
    return HttpResponse.json({ items: [], total: 0 });
  }),

  // Snapshots
  http.get(`${API_BASE}/snapshots`, () => {
    return HttpResponse.json({
      items: [
        { id: 'snap_001', name: 'January 2026', createdAt: '2026-01-15T00:00:00Z', status: 'active' },
      ],
      total: 1,
    });
  }),

  // Dashboard metrics
  http.get(`${API_BASE}/dashboard/metrics`, () => {
    return HttpResponse.json({
      totalIssues: 156,
      criticalIssues: 12,
      totalContracts: 45,
      revenueAtRisk: 125000,
      detectionAccuracy: 0.94,
    });
  }),
];
