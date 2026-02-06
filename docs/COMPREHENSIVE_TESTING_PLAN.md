# Comprehensive Testing Plan

**Version:** 1.0
**Date:** 2026-02-03
**Status:** Draft

---

## Executive Summary

This document outlines a comprehensive testing strategy for the Cogtics platform covering:
- Unit tests for all packages
- Integration tests for API and worker
- End-to-end tests for user workflows
- Frontend component and visual tests
- Performance and stress tests
- Security tests

---

## Current State Analysis

### ✅ What Exists

| Area | Coverage | Files |
|------|----------|-------|
| Detection Rules | Good | 14 tests |
| Revenue Recognition | Good | 6 tests |
| LLM Integration | Moderate | 5 tests |
| Contract Intelligence | Moderate | 3 tests |
| Simulation Engine | Moderate | 2 tests |
| API Integration | Moderate | 10 tests |
| API Smoke Tests | Good | 7 tests |

### ❌ Critical Gaps

| Area | Status | Priority |
|------|--------|----------|
| Frontend Components | None | Critical |
| E2E User Workflows | None | Critical |
| Worker Job Processors | 1 test | High |
| Database Layer | None | High |
| Validation Schemas | None | Medium |
| Connectors | None | Medium |
| Auth/RBAC Plugins | None | High |

---

## Test Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        E2E Tests (Playwright)                   │
│  Full user workflows: Login → Upload → Detect → Export          │
├─────────────────────────────────────────────────────────────────┤
│                    Integration Tests (Vitest)                   │
│  API routes, Worker jobs, Database operations                   │
├─────────────────────────────────────────────────────────────────┤
│                      Component Tests (Vitest)                   │
│  React components with React Testing Library                    │
├─────────────────────────────────────────────────────────────────┤
│                        Unit Tests (Vitest)                      │
│  Rules, RevRec, Utils, Schemas, Connectors                      │
├─────────────────────────────────────────────────────────────────┤
│                     Stress Tests (Custom)                       │
│  Load testing, Concurrency, Backpressure                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Foundation (Week 1-2)

### 1.1 Frontend Testing Setup

**Goal:** Enable component testing for React app

**Setup Tasks:**
```bash
# Add testing dependencies to apps/web
cd apps/web
pnpm add -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom happy-dom msw
```

**Create:** `apps/web/vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
    },
  },
});
```

**Create:** `apps/web/src/test/setup.ts`
```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

### 1.2 E2E Testing Setup (Playwright)

**Goal:** Enable full user workflow testing

**Setup Tasks:**
```bash
# Install Playwright at monorepo root
pnpm add -D @playwright/test
npx playwright install
```

**Create:** `playwright.config.ts`
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: [
    {
      command: 'pnpm dev:api',
      url: 'http://localhost:3000/health',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm dev:web',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

### 1.3 MSW (Mock Service Worker) Setup

**Goal:** Mock API responses for component tests

**Create:** `apps/web/src/test/mocks/handlers.ts`
```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Health check
  http.get('http://localhost:3000/health', () => {
    return HttpResponse.json({ status: 'healthy' });
  }),

  // Auth endpoints
  http.get('http://localhost:3000/auth/me', () => {
    return HttpResponse.json({
      id: 'user_01',
      email: 'admin@cogtics.dev',
      role: 'admin',
      tenantId: 'tenant_01',
    });
  }),

  // Add more handlers as needed
];
```

---

## Phase 2: Unit Tests (Week 2-3)

### 2.1 Schema Validation Tests

**Location:** `packages/schemas/src/__tests__/`

**Files to Create:**
- `ids.test.ts` - Branded type ID tests
- `uploads.test.ts` - Upload schema validation
- `detection.test.ts` - Detection schema tests
- `env.test.ts` - Environment validation tests
- `contracts.test.ts` - Contract schema tests

**Example:** `packages/schemas/src/__tests__/uploads.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import { UploadPDFStartRequestSchema, UploadQueueFullErrorSchema } from '../uploads';

describe('Upload Schemas', () => {
  describe('UploadPDFStartRequestSchema', () => {
    it('validates valid PDF upload request', () => {
      const input = {
        type: 'pdf',
        fileName: 'contract.pdf',
        contentType: 'application/pdf',
        entityType: 'contract',
        displayName: 'Q4 Contract',
      };

      const result = UploadPDFStartRequestSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects invalid content type', () => {
      const input = {
        type: 'pdf',
        fileName: 'contract.exe',
        contentType: 'application/x-executable',
        entityType: 'contract',
      };

      const result = UploadPDFStartRequestSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('UploadQueueFullErrorSchema', () => {
    it('validates queue full error response', () => {
      const error = {
        error: 'Too Many Requests',
        message: 'Queue at capacity',
        retryAfter: 60,
        queueDepth: 225,
        queueLimit: 225,
      };

      const result = UploadQueueFullErrorSchema.safeParse(error);
      expect(result.success).toBe(true);
    });
  });
});
```

### 2.2 Database Layer Tests

**Location:** `packages/db/src/__tests__/`

**Files to Create:**
- `connection.test.ts` - Database connection tests
- `migrations.test.ts` - Migration verification
- `queries.test.ts` - Query builder tests

### 2.3 Connector Tests

**Location:** `packages/connectors/src/__tests__/`

**Files to Create:**
- `stripe.test.ts` - Stripe connector mock tests
- `salesforce.test.ts` - Salesforce connector mock tests
- `quickbooks.test.ts` - QuickBooks connector mock tests

---

## Phase 3: Component Tests (Week 3-4)

### 3.1 Core Component Tests

**Location:** `apps/web/src/**/__tests__/`

**Priority Components:**

```
apps/web/src/
├── components/
│   ├── layout/__tests__/
│   │   ├── Sidebar.test.tsx
│   │   ├── Header.test.tsx
│   │   └── MainLayout.test.tsx
│   ├── ui/__tests__/
│   │   ├── Button.test.tsx
│   │   ├── Table.test.tsx
│   │   └── Modal.test.tsx
├── features/
│   ├── dashboard/__tests__/
│   │   └── DashboardPage.test.tsx
│   ├── issues/__tests__/
│   │   ├── IssuesPage.test.tsx
│   │   ├── IssueDetailPage.test.tsx
│   │   └── AIAnalysisPanel.test.tsx
│   ├── uploads/__tests__/
│   │   └── UploadPage.test.tsx
│   └── contracts/__tests__/
│       └── ContractsPage.test.tsx
```

**Example:** `apps/web/src/features/issues/__tests__/IssuesPage.test.tsx`
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { IssuesPage } from '../IssuesPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>{children}</BrowserRouter>
  </QueryClientProvider>
);

describe('IssuesPage', () => {
  it('renders issues list', async () => {
    render(<IssuesPage />, { wrapper });

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  it('filters issues by severity', async () => {
    const user = userEvent.setup();
    render(<IssuesPage />, { wrapper });

    const severityFilter = screen.getByRole('combobox', { name: /severity/i });
    await user.selectOptions(severityFilter, 'critical');

    // Verify filter applied
    await waitFor(() => {
      expect(screen.getByText(/critical/i)).toBeInTheDocument();
    });
  });
});
```

### 3.2 Hook Tests

**Location:** `apps/web/src/hooks/__tests__/`

**Files to Create:**
- `useAuth.test.ts`
- `useIssues.test.ts`
- `useUploads.test.ts`
- `useContracts.test.ts`

---

## Phase 4: Integration Tests (Week 4-5)

### 4.1 API Route Tests

**Location:** `apps/api/tests/routes/`

**Files to Create:**
```
apps/api/tests/routes/
├── auth.test.ts
├── health.test.ts
├── uploads.test.ts
├── issues.test.ts
├── contracts.test.ts
├── simulations.test.ts
├── exports.test.ts
└── connectors.test.ts
```

**Example:** `apps/api/tests/routes/health.test.ts`
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app';

describe('Health Routes', () => {
  let app: ReturnType<typeof buildApp>;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('returns healthy status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toMatchObject({
        status: 'healthy',
      });
    });
  });

  describe('GET /health/detailed', () => {
    it('returns queue depths', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/detailed',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('queues');
      expect(body.queues).toHaveProperty('depths');
      expect(body.queues).toHaveProperty('overallStatus');
    });
  });
});
```

### 4.2 Worker Job Processor Tests

**Location:** `apps/worker/src/__tests__/`

**Files to Create:**
```
apps/worker/src/__tests__/
├── processors/
│   ├── upload-pdf-parse.test.ts
│   ├── upload-csv-parse.test.ts
│   ├── detect-run.test.ts
│   ├── simulate.test.ts
│   ├── export.test.ts
│   ├── sync.test.ts
│   └── ingest.test.ts
├── health-server.test.ts
└── dlq-handler.test.ts
```

**Example:** `apps/worker/src/__tests__/processors/upload-pdf-parse.test.ts`
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processUploadPdfParse } from '../../processors/upload-pdf-parse';

// Mock dependencies
vi.mock('@cogtics/db', () => ({
  createDb: vi.fn(() => ({
    selectFrom: vi.fn().mockReturnThis(),
    // ... mock query builder
  })),
}));

vi.mock('@cogtics/utils', () => ({
  createS3Client: vi.fn(() => ({
    getObject: vi.fn().mockResolvedValue({ Body: Buffer.from('PDF content') }),
  })),
}));

describe('upload-pdf-parse processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes valid PDF upload', async () => {
    const job = {
      id: 'job_123',
      data: {
        uploadId: 'upload_01',
        tenantId: 'tenant_01',
        s3Key: 'tenants/tenant_01/uploads/test.pdf',
      },
    };

    const result = await processUploadPdfParse(job as any);

    expect(result).toMatchObject({
      status: 'completed',
      uploadId: 'upload_01',
    });
  });

  it('handles corrupted PDF', async () => {
    // Test error handling
  });
});
```

### 4.3 Plugin Tests

**Location:** `apps/api/tests/plugins/`

**Files to Create:**
- `auth.test.ts` - Authentication plugin
- `tenant.test.ts` - Multi-tenancy plugin
- `rbac.test.ts` - Role-based access control
- `audit.test.ts` - Audit logging plugin

---

## Phase 5: E2E Tests (Week 5-6)

### 5.1 User Workflow Tests

**Location:** `e2e/`

**Structure:**
```
e2e/
├── fixtures/
│   ├── test-pdfs/
│   ├── test-csvs/
│   └── auth.ts
├── pages/
│   ├── login.page.ts
│   ├── dashboard.page.ts
│   ├── issues.page.ts
│   ├── uploads.page.ts
│   └── contracts.page.ts
├── tests/
│   ├── auth.spec.ts
│   ├── upload-workflow.spec.ts
│   ├── detection-workflow.spec.ts
│   ├── export-workflow.spec.ts
│   └── simulation-workflow.spec.ts
└── global-setup.ts
```

**Example:** `e2e/tests/upload-workflow.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('Upload Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('upload PDF and verify processing', async ({ page }) => {
    // Navigate to uploads
    await page.click('[data-testid="nav-uploads"]');

    // Upload PDF
    const fileChooser = page.waitForEvent('filechooser');
    await page.click('[data-testid="upload-button"]');
    const chooser = await fileChooser;
    await chooser.setFiles('e2e/fixtures/test-pdfs/sample-contract.pdf');

    // Wait for upload complete
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();

    // Verify processing started
    await expect(page.locator('[data-testid="processing-status"]')).toContainText('Processing');

    // Wait for processing complete (with timeout)
    await expect(page.locator('[data-testid="processing-status"]')).toContainText('Complete', {
      timeout: 60000,
    });

    // Verify contract appears in list
    await page.click('[data-testid="nav-contracts"]');
    await expect(page.locator('table')).toContainText('sample-contract.pdf');
  });

  test('handles upload errors gracefully', async ({ page }) => {
    // Test error states
  });

  test('respects queue backpressure (HTTP 429)', async ({ page }) => {
    // Simulate queue full scenario
  });
});
```

### 5.2 Critical User Journeys

| Journey | Priority | Test File |
|---------|----------|-----------|
| Login → Dashboard | Critical | `auth.spec.ts` |
| Upload PDF → Extract Terms | Critical | `upload-workflow.spec.ts` |
| Run Detection → View Issues | Critical | `detection-workflow.spec.ts` |
| Create Simulation → Compare | High | `simulation-workflow.spec.ts` |
| Export Report → Download | High | `export-workflow.spec.ts` |
| Connect Stripe → Sync Data | High | `connector-workflow.spec.ts` |

---

## Phase 6: Detection Validation Tests (Week 6)

### 6.1 Ground Truth Validation Framework

**Goal:** Validate detection engine produces correct issues using expected_issues.json

**Location:** `apps/api/tests/validation/`

**Create:** `apps/api/tests/validation/detection-validation.test.ts`
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

interface ExpectedIssue {
  rule_id: string;
  contract_id: string;
  invoice_id?: string;
  severity: string;
  amount?: number;
  description: string;
}

describe('Detection Engine Validation', () => {
  let expectedIssues: ExpectedIssue[];
  let actualIssues: any[];

  beforeAll(async () => {
    // Load ground truth
    const groundTruth = JSON.parse(
      readFileSync(
        join(__dirname, '../../../../tools/synthetic-data/output/stress_test/expected_outputs/expected_issues.json'),
        'utf-8'
      )
    );
    expectedIssues = groundTruth.issues;

    // Run detection on test data
    actualIssues = await runDetection();
  });

  describe('Rule Coverage', () => {
    it('detects all billing discrepancies (R001-R010)', () => {
      const billingRules = ['R001', 'R002', 'R003', 'R004', 'R005', 'R006', 'R007', 'R008', 'R009', 'R010'];

      for (const ruleId of billingRules) {
        const expected = expectedIssues.filter(i => i.rule_id === ruleId);
        const actual = actualIssues.filter(i => i.ruleId === ruleId);

        expect(actual.length).toBeGreaterThanOrEqual(expected.length * 0.9); // 90% recall
      }
    });

    it('detects all discount issues (R011-R016)', () => {
      const discountRules = ['R011', 'R012', 'R013', 'R014', 'R015', 'R016'];

      for (const ruleId of discountRules) {
        const expected = expectedIssues.filter(i => i.rule_id === ruleId);
        const actual = actualIssues.filter(i => i.ruleId === ruleId);

        expect(actual.length).toBeGreaterThanOrEqual(expected.length * 0.9);
      }
    });

    it('detects data quality issues (R100-R105)', () => {
      const dqRules = ['R100', 'R101', 'R102', 'R103', 'R104', 'R105'];

      for (const ruleId of dqRules) {
        const expected = expectedIssues.filter(i => i.rule_id === ruleId);
        const actual = actualIssues.filter(i => i.ruleId === ruleId);

        expect(actual.length).toBeGreaterThanOrEqual(expected.length * 0.85); // 85% for DQ
      }
    });
  });

  describe('Precision Validation', () => {
    it('has low false positive rate (<10%)', () => {
      const expectedKeys = new Set(expectedIssues.map(i => `${i.rule_id}:${i.contract_id}`));
      const falsePositives = actualIssues.filter(
        i => !expectedKeys.has(`${i.ruleId}:${i.contractId}`)
      );

      const falsePositiveRate = falsePositives.length / actualIssues.length;
      expect(falsePositiveRate).toBeLessThan(0.10);
    });
  });

  describe('Severity Accuracy', () => {
    it('assigns correct severity levels', () => {
      const severityMap = new Map(
        expectedIssues.map(i => [`${i.rule_id}:${i.contract_id}`, i.severity])
      );

      let correctSeverity = 0;
      for (const actual of actualIssues) {
        const key = `${actual.ruleId}:${actual.contractId}`;
        if (severityMap.get(key) === actual.severity) {
          correctSeverity++;
        }
      }

      const accuracy = correctSeverity / actualIssues.length;
      expect(accuracy).toBeGreaterThan(0.95); // 95% severity accuracy
    });
  });
});
```

### 6.2 AI Detection Validation

**Create:** `apps/api/tests/validation/ai-detection-validation.test.ts`
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';

describe('AI Detection Validation', () => {
  let aiTestCases: any[];

  beforeAll(() => {
    aiTestCases = JSON.parse(
      readFileSync('tools/synthetic-data/output/stress_test/expected_outputs/ai_test_cases.json', 'utf-8')
    );
  });

  describe('Semantic Detection', () => {
    it('detects unusual pricing tier patterns (AI_SEMANTIC_PRICING_TIER)', async () => {
      const pricingCases = aiTestCases.filter(
        c => c.expected_rule === 'AI_SEMANTIC_PRICING_TIER'
      );

      for (const testCase of pricingCases) {
        const result = await runAIDetection(testCase.input);
        expect(result.detections).toContainEqual(
          expect.objectContaining({ ruleId: 'AI_SEMANTIC_PRICING_TIER' })
        );
      }
    });

    it('detects unusual discount patterns (AI_SEMANTIC_UNUSUAL_DISCOUNT)', async () => {
      const discountCases = aiTestCases.filter(
        c => c.expected_rule === 'AI_SEMANTIC_UNUSUAL_DISCOUNT'
      );

      for (const testCase of discountCases) {
        const result = await runAIDetection(testCase.input);
        expect(result.detections).toContainEqual(
          expect.objectContaining({ ruleId: 'AI_SEMANTIC_UNUSUAL_DISCOUNT' })
        );
      }
    });

    it('detects suspicious narratives (AI_SEMANTIC_SUSPICIOUS_NARRATIVE)', async () => {
      const narrativeCases = aiTestCases.filter(
        c => c.expected_rule === 'AI_SEMANTIC_SUSPICIOUS_NARRATIVE'
      );

      for (const testCase of narrativeCases) {
        const result = await runAIDetection(testCase.input);
        expect(result.detections).toContainEqual(
          expect.objectContaining({ ruleId: 'AI_SEMANTIC_SUSPICIOUS_NARRATIVE' })
        );
      }
    });
  });

  describe('Cross-Contract Analysis', () => {
    it('detects price variance across contracts', async () => {
      const varianceCases = aiTestCases.filter(
        c => c.expected_rule === 'AI_CROSS_CONTRACT_PRICE_VARIANCE'
      );

      // Test with contract sets
      for (const testCase of varianceCases) {
        const result = await runCrossContractAnalysis(testCase.contracts);
        expect(result.issues).toContainEqual(
          expect.objectContaining({ type: 'price_variance' })
        );
      }
    });
  });
});
```

### 6.3 Connector Payload Validation

**Create:** `apps/api/tests/validation/connector-validation.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const CONNECTOR_DIR = 'tools/synthetic-data/output/stress_test/connectors';

describe('Connector Payload Processing', () => {
  describe('Stripe Webhooks', () => {
    const stripePayloads = readdirSync(join(CONNECTOR_DIR, 'stripe'))
      .filter(f => f.endsWith('.json'))
      .map(f => ({
        name: f,
        payload: JSON.parse(readFileSync(join(CONNECTOR_DIR, 'stripe', f), 'utf-8'))
      }));

    it.each(stripePayloads)('processes $name correctly', async ({ payload }) => {
      const result = await processStripeWebhook(payload);

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBeGreaterThan(0);
    });
  });

  describe('Salesforce API Responses', () => {
    const sfPayloads = readdirSync(join(CONNECTOR_DIR, 'salesforce'))
      .filter(f => f.endsWith('.json'))
      .map(f => ({
        name: f,
        payload: JSON.parse(readFileSync(join(CONNECTOR_DIR, 'salesforce', f), 'utf-8'))
      }));

    it.each(sfPayloads)('ingests $name correctly', async ({ payload }) => {
      const result = await ingestSalesforceData(payload);

      expect(result.success).toBe(true);
    });
  });

  describe('QuickBooks Payloads', () => {
    it('processes invoice payloads', async () => {
      const invoicePayload = JSON.parse(
        readFileSync(join(CONNECTOR_DIR, 'quickbooks', 'invoices.json'), 'utf-8')
      );

      const result = await processQuickBooksInvoices(invoicePayload);
      expect(result.invoicesCreated).toBeGreaterThan(0);
    });
  });

  describe('DocuSign Webhooks', () => {
    it('processes contract signed events', async () => {
      const signedPayload = JSON.parse(
        readFileSync(join(CONNECTOR_DIR, 'docusign', 'contract_signed.json'), 'utf-8')
      );

      const result = await processDocuSignWebhook(signedPayload);
      expect(result.contractUpdated).toBe(true);
    });
  });
});
```

### 6.4 RevRec Validation

**Create:** `apps/api/tests/validation/revrec-validation.test.ts`
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';

describe('Revenue Recognition Validation', () => {
  let obligations: any[];
  let schedules: any[];

  beforeAll(() => {
    obligations = JSON.parse(
      readFileSync('tools/synthetic-data/output/stress_test/data/obligations.json', 'utf-8')
    );
    schedules = JSON.parse(
      readFileSync('tools/synthetic-data/output/stress_test/data/schedules.json', 'utf-8')
    );
  });

  describe('Obligation Identification', () => {
    it('identifies all performance obligations', async () => {
      for (const expected of obligations.slice(0, 100)) { // Test sample
        const result = await identifyObligations(expected.contract_id);

        expect(result.obligations.length).toBe(expected.obligation_count);
      }
    });
  });

  describe('Schedule Generation', () => {
    it('generates correct recognition schedules', async () => {
      for (const expected of schedules.slice(0, 100)) {
        const result = await generateSchedule(expected.obligation_id);

        // Verify total recognized equals obligation amount
        const totalRecognized = result.entries.reduce((sum, e) => sum + e.amount, 0);
        expect(totalRecognized).toBeCloseTo(expected.total_amount, 2);
      }
    });
  });

  describe('Deferred Revenue', () => {
    it('calculates correct deferred balances', async () => {
      const result = await calculateDeferredRevenue('2024-12-31');

      // Verify against expected totals
      expect(result.totalDeferred).toBeGreaterThan(0);
      expect(result.byPeriod).toBeDefined();
    });
  });
});
```

---

## Phase 7: Stress & Performance Tests (Week 7)

### 7.1 Stress Test Suite (Using Synthetic Data)

**Location:** `tools/stress-test/`

**Data Source:** Uses PDFs from `../synthetic-data/output/stress_test/pdfs/` (1,918 files)

**Existing Scripts:**
```bash
npm run concurrent:light    # 5 users, 50 PDFs   → validate infrastructure
npm run concurrent:medium   # 10 users, 100 PDFs → baseline performance
npm run concurrent:heavy    # 25 users, 250 PDFs → find degradation
npm run concurrent:stress   # 50 users, 500 PDFs → find breaking point
npm run concurrent:extreme  # 100 users, 1000 PDFs → system limits
```

**New Scripts to Add:**
```json
{
  "test:api-stress": "tsx scripts/api-stress.ts",
  "test:db-stress": "tsx scripts/db-stress.ts",
  "test:worker-stress": "tsx scripts/worker-stress.ts",
  "test:e2e-stress": "tsx scripts/e2e-stress.ts",
  "test:backpressure": "tsx scripts/backpressure-test.ts",
  "test:multi-tenant": "tsx scripts/multi-tenant-stress.ts"
}
```

### 6.2 API Stress Test

**Create:** `tools/stress-test/scripts/api-stress.ts`
```typescript
/**
 * API Stress Test
 * Tests API endpoints under heavy load
 */

interface StressTestConfig {
  endpoints: EndpointConfig[];
  users: number;
  duration: number; // seconds
  rampUp: number;   // seconds
}

const config: StressTestConfig = {
  users: 100,
  duration: 300,   // 5 minutes
  rampUp: 30,      // 30 second ramp-up
  endpoints: [
    { path: '/health', method: 'GET', weight: 10 },
    { path: '/issues', method: 'GET', weight: 30 },
    { path: '/contracts', method: 'GET', weight: 20 },
    { path: '/uploads/pdf/start', method: 'POST', weight: 20 },
    { path: '/simulations', method: 'POST', weight: 10 },
    { path: '/exports', method: 'POST', weight: 10 },
  ],
};

// Implementation...
```

### 6.3 Database Stress Test

**Create:** `tools/stress-test/scripts/db-stress.ts`
```typescript
/**
 * Database Stress Test
 * Tests PostgreSQL under concurrent load
 */

const scenarios = [
  {
    name: 'Connection Pool Saturation',
    connections: 100,
    queries: 1000,
    concurrent: true,
  },
  {
    name: 'RLS Performance',
    tenants: 50,
    queriesPerTenant: 100,
    measure: ['latency', 'throughput'],
  },
  {
    name: 'Large Result Sets',
    rowCounts: [1000, 10000, 100000],
    measure: ['memory', 'latency'],
  },
];
```

### 6.4 Backpressure Test

**Create:** `tools/stress-test/scripts/backpressure-test.ts`
```typescript
/**
 * Backpressure Test
 * Validates HTTP 429 behavior when queue is full
 */

async function testBackpressure() {
  console.log('=== Backpressure Test ===\n');

  // Phase 1: Fill queue to capacity
  console.log('Phase 1: Filling queue...');
  const queueLimit = 225; // PDF upload limit

  // Submit jobs rapidly until queue full
  const results = [];
  for (let i = 0; i < queueLimit + 50; i++) {
    const result = await submitUpload();
    results.push(result);

    if (result.status === 429) {
      console.log(`HTTP 429 triggered at job ${i}`);
      console.log(`Queue depth: ${result.queueDepth}/${result.queueLimit}`);
      console.log(`Retry-After: ${result.retryAfter}s`);
      break;
    }
  }

  // Phase 2: Verify backpressure response
  console.log('\nPhase 2: Verifying backpressure response...');
  const backpressureResponse = results.find(r => r.status === 429);

  assert(backpressureResponse, 'Should receive HTTP 429');
  assert(backpressureResponse.retryAfter > 0, 'Should include Retry-After');
  assert(backpressureResponse.queueDepth >= queueLimit, 'Queue should be at limit');

  // Phase 3: Verify recovery
  console.log('\nPhase 3: Waiting for queue to drain...');
  await sleep(backpressureResponse.retryAfter * 1000);

  const recoveryResult = await submitUpload();
  assert(recoveryResult.status === 200, 'Should accept uploads after drain');

  console.log('\n✅ Backpressure test passed!');
}
```

### 6.5 Multi-Tenant Stress Test

**Create:** `tools/stress-test/scripts/multi-tenant-stress.ts`
```typescript
/**
 * Multi-Tenant Stress Test
 * Validates tenant isolation under concurrent load
 */

async function testMultiTenantIsolation() {
  const tenants = 10;
  const usersPerTenant = 5;
  const uploadsPerUser = 10;

  // Run all tenants concurrently
  const tenantResults = await Promise.all(
    Array.from({ length: tenants }, (_, i) =>
      runTenantWorkload(`tenant_${i}`, usersPerTenant, uploadsPerUser)
    )
  );

  // Verify isolation
  for (const result of tenantResults) {
    // Verify no cross-tenant data leakage
    assert(
      result.issues.every(i => i.tenantId === result.tenantId),
      `Tenant ${result.tenantId} should only see own issues`
    );

    // Verify contracts belong to tenant
    assert(
      result.contracts.every(c => c.tenantId === result.tenantId),
      `Tenant ${result.tenantId} should only see own contracts`
    );
  }

  console.log('✅ Multi-tenant isolation verified!');
}
```

---

## Phase 7: Security Tests (Week 7-8)

### 7.1 Security Test Suite

**Location:** `tests/security/`

**Files to Create:**
```
tests/security/
├── auth/
│   ├── jwt-validation.test.ts
│   ├── session-management.test.ts
│   └── password-policy.test.ts
├── authorization/
│   ├── rbac.test.ts
│   ├── tenant-isolation.test.ts
│   └── permission-escalation.test.ts
├── injection/
│   ├── sql-injection.test.ts
│   ├── xss.test.ts
│   └── command-injection.test.ts
├── api/
│   ├── rate-limiting.test.ts
│   ├── input-validation.test.ts
│   └── cors.test.ts
└── data/
    ├── encryption.test.ts
    └── pii-handling.test.ts
```

### 7.2 Tenant Isolation Tests

```typescript
import { describe, it, expect } from 'vitest';

describe('Tenant Isolation', () => {
  it('prevents cross-tenant data access via API', async () => {
    // Login as tenant_01 user
    const tenant1Token = await login('user_01', 'tenant_01');

    // Try to access tenant_02 data
    const response = await fetch('/api/issues?tenantId=tenant_02', {
      headers: { Authorization: `Bearer ${tenant1Token}` },
    });

    // Should return empty or 403, not tenant_02 data
    expect(response.status).toBe(403);
  });

  it('prevents cross-tenant data access via URL manipulation', async () => {
    const tenant1Token = await login('user_01', 'tenant_01');

    // Get a tenant_02 issue ID somehow (e.g., from logs)
    const tenant2IssueId = 'issue_tenant02_123';

    const response = await fetch(`/api/issues/${tenant2IssueId}`, {
      headers: { Authorization: `Bearer ${tenant1Token}` },
    });

    expect(response.status).toBe(404); // Not 403 to avoid enumeration
  });

  it('RLS prevents direct database access', async () => {
    // Connect to DB as tenant_01
    await db.raw("SET app.tenant_id = 'tenant_01'");

    // Query should only return tenant_01 data
    const issues = await db.selectFrom('issues').selectAll().execute();

    expect(issues.every(i => i.tenant_id === 'tenant_01')).toBe(true);
  });
});
```

---

## Test Execution Strategy

### Local Development

```bash
# Run all unit tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific package tests
pnpm --filter @cogtics/rules test
pnpm --filter @cogtics/web test

# Run integration tests (requires Docker)
pnpm docker:up
pnpm test:integration

# Run E2E tests
pnpm test:e2e

# Run stress tests
cd tools/stress-test
npm run concurrent:heavy
```

### CI/CD Pipeline

**Create:** `.github/workflows/test.yml`
```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:coverage
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: cogtics
          POSTGRES_PASSWORD: cogtics
          POSTGRES_DB: cogtics
        ports:
          - 5432:5432
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm db:migrate
      - run: pnpm test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps
      - run: pnpm docker:up
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  stress-tests:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm docker:up
      - run: cd tools/stress-test && npm run concurrent:medium
```

---

## Coverage Goals

| Package/App | Current | Target | Priority |
|-------------|---------|--------|----------|
| packages/rules | 70% | 90% | High |
| packages/revrec | 65% | 85% | High |
| packages/utils | 45% | 80% | Medium |
| packages/schemas | 0% | 80% | High |
| packages/db | 0% | 60% | Medium |
| packages/connectors | 0% | 70% | Medium |
| apps/api | 40% | 75% | High |
| apps/web | 0% | 70% | Critical |
| apps/worker | 5% | 70% | High |

---

## Test Data Strategy

### Synthetic Data Available (Pre-Generated)

The `tools/synthetic-data/` directory contains comprehensive test data:

```
tools/synthetic-data/output/stress_test/
├── pdfs/                           # 1,918 contract PDFs
│   ├── con_*.pdf                   # Generated contracts with known terms
├── data/
│   ├── contracts.json              # 2.4MB - Contract definitions
│   ├── contract_terms.json         # 13MB - Extracted terms (ground truth)
│   ├── invoices.json               # 14MB - Billing data with discrepancies
│   ├── customers.json              # Customer records
│   ├── obligations.json            # RevRec obligations
│   └── schedules.json              # RevRec schedules
├── expected_outputs/
│   ├── expected_issues.json        # 8.5MB - Ground truth (13,000+ issues)
│   ├── rule_coverage.json          # 100% coverage of 62 rules
│   └── ai_test_cases.json          # AI detection scenarios
├── connectors/
│   ├── stripe/                     # Stripe webhook payloads
│   ├── salesforce/                 # Salesforce API responses
│   ├── hubspot/                    # HubSpot API responses
│   ├── quickbooks/                 # QuickBooks payloads
│   └── docusign/                   # DocuSign webhooks
└── csv/
    └── *.csv                       # CSV upload test files
```

### Rule Coverage Summary

The synthetic data covers **ALL 62 detection rules**:

| Tier | Rules | Sample Counts |
|------|-------|---------------|
| Data Quality (T0) | R100-R105 | 156-138 each |
| Billing (T1) | R001-R010, R017-R018 | 244-577 each |
| Discounts (T2) | R011-R016 | 438-654 each |
| RevRec (T3) | R020-R027 | 348-672 each |
| Credits (T4) | R060-R064 | 42-114 each |
| Usage (T5) | R080-R083 | 48-114 each |
| Lifecycle (T6) | R110-R113 | 90-132 each |
| Multi-Entity (T7) | R120-R122 | 66-138 each |
| Cross-Snapshot (T8) | R130-R132 | 72-138 each |
| Tax/Fees (T9) | R150-R154 | 108-138 each |
| FX (T10) | R160-R161, R170-R173 | 36-114 each |
| **AI Semantic** | AI_SEMANTIC_* | 5-15 each |

### Using Synthetic Data in Tests

**Generate fresh data (optional):**
```bash
cd tools/synthetic-data
python examples/generate_comprehensive.py --size medium --with-ai --with-connectors
```

**Available sizes:**
- `tiny`: 3 customers, 5 contracts, 10 issues
- `minimal`: 5 customers, 10 contracts, 20 issues
- `small`: 20 customers, 50 contracts, 100 issues
- `medium`: 100 customers, 250 contracts, 500 issues
- `large`: 500 customers, 1000 contracts, 2000 issues
- `stress`: 1000 customers, 5000 contracts, 10000 issues

---

## Implementation Timeline

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1-2 | Foundation | Frontend test setup, E2E setup, MSW mocks |
| 2-3 | Unit Tests | Schema tests, DB tests, connector tests |
| 3-4 | Component Tests | React component tests, hook tests |
| 4-5 | Integration Tests | API route tests, worker tests, plugin tests |
| 5-6 | E2E Tests | User workflow tests, critical journeys |
| 6-7 | Stress Tests | API stress, DB stress, backpressure tests |
| 7-8 | Security Tests | Auth, RBAC, injection, isolation tests |

---

## Success Metrics

**Quality Gates:**
- Unit test coverage ≥ 80%
- Integration test coverage ≥ 70%
- All critical user journeys have E2E tests
- No security vulnerabilities in OWASP Top 10
- Stress tests pass at 100 concurrent users

**Performance Benchmarks:**
- API p95 latency < 500ms under normal load
- Upload processing < 30s for standard PDFs
- Detection run < 60s for 1000 line items
- No HTTP 429 at < 50 concurrent users

---

## Next Steps

1. **Immediate:** Set up frontend testing infrastructure
2. **This Week:** Add schema validation tests
3. **Next Sprint:** Implement critical E2E tests
4. **This Quarter:** Achieve 70% overall coverage

---

## Appendix: Synthetic Data Alignment Matrix

This matrix shows how test categories align with available synthetic data:

| Test Category | Synthetic Data Source | Coverage |
|---------------|----------------------|----------|
| **PDF Upload Tests** | `pdfs/` (1,918 files) | ✅ Full |
| **Detection Rule Tests** | `expected_outputs/expected_issues.json` | ✅ 62/62 rules |
| **AI Detection Tests** | `expected_outputs/ai_test_cases.json` | ✅ 8 scenarios |
| **Billing Scenario Tests** | `data/invoices.json` | ✅ R001-R018 |
| **Discount Tests** | `data/invoices.json`, `contracts.json` | ✅ R011-R016 |
| **RevRec Tests** | `data/obligations.json`, `schedules.json` | ✅ R020-R027 |
| **Contract Terms Tests** | `data/contract_terms.json` | ✅ Extraction validation |
| **Stripe Integration** | `connectors/stripe/` | ✅ Webhooks |
| **Salesforce Integration** | `connectors/salesforce/` | ✅ API responses |
| **HubSpot Integration** | `connectors/hubspot/` | ✅ API responses |
| **QuickBooks Integration** | `connectors/quickbooks/` | ✅ Payloads |
| **DocuSign Integration** | `connectors/docusign/` | ✅ Webhooks |
| **Multi-Tenant Tests** | Generate with `--tenants N` | ✅ Configurable |
| **Stress Tests** | All PDFs + data files | ✅ Scales to 1000+ |

### Validation Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Generate Synthetic Data                                     │
│     python generate_comprehensive.py --size medium --with-ai    │
├─────────────────────────────────────────────────────────────────┤
│  2. Ingest Test Data                                            │
│     - Upload PDFs via stress test                               │
│     - Import invoices/contracts via API                         │
│     - Process connector payloads                                │
├─────────────────────────────────────────────────────────────────┤
│  3. Run Detection                                               │
│     pnpm --filter @cogtics/worker start                         │
│     → Processes all jobs, generates issues                      │
├─────────────────────────────────────────────────────────────────┤
│  4. Validate Results                                            │
│     - Compare actual issues vs expected_issues.json             │
│     - Calculate precision/recall per rule                       │
│     - Verify severity accuracy                                  │
├─────────────────────────────────────────────────────────────────┤
│  5. Report                                                      │
│     - Rule coverage: 62/62 (100%)                               │
│     - Recall: >90% per rule                                     │
│     - Precision: >90% (false positive rate <10%)                │
│     - Severity accuracy: >95%                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Quick Validation Commands

```bash
# 1. Verify synthetic data exists
ls tools/synthetic-data/output/stress_test/

# 2. Check rule coverage
cat tools/synthetic-data/output/stress_test/expected_outputs/rule_coverage.json | jq '.coverage_pct'

# 3. Count expected issues
cat tools/synthetic-data/output/stress_test/expected_outputs/expected_issues.json | jq '.issues | length'

# 4. Run stress test with synthetic PDFs
cd tools/stress-test && npm run concurrent:medium

# 5. Run detection validation tests
pnpm test -- --grep "Detection.*Validation"

# 6. Generate validation report
pnpm test:validation:report
```

---

*Document maintained by: Engineering Team*
*Last updated: 2026-02-03*
