# E2E Tests

End-to-end tests for the Cogtics platform using Playwright.

## Setup

Playwright is already installed. To install browsers:

```bash
npx playwright install
```

## Running Tests

### Run all E2E tests
```bash
pnpm test:e2e
```

### Run extended UI workflows (simulations/exports/contracts)
```bash
E2E_RUN_FULL=true pnpm test:e2e
```

### Run specific test file
```bash
pnpm test:e2e e2e/tests/upload-workflow.spec.ts
```

### Run in headed mode (see browser)
```bash
pnpm test:e2e --headed
```

### Run in debug mode
```bash
pnpm test:e2e --debug
```

### Run specific browser
```bash
pnpm test:e2e --project=chromium
pnpm test:e2e --project=firefox
pnpm test:e2e --project=webkit
```

## Test Structure

```
e2e/
├── fixtures.ts              # Shared test fixtures
├── tests/
│   ├── auth.spec.ts         # Authentication and RBAC tests
│   ├── upload-workflow.spec.ts  # CSV/PDF upload tests
│   ├── detection-workflow.spec.ts  # Detection and issues tests
│   └── ...                  # Additional test files
└── README.md               # This file
```

## Prerequisites

Before running E2E tests, ensure:

1. **Services are running:**
   ```bash
   pnpm docker:up    # Start infrastructure
   pnpm dev:api      # Start API server
   pnpm dev:web      # Start web frontend
   pnpm dev:worker   # Start worker
   ```

2. **Database is seeded:**
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

3. **Test data exists:**
   - `test-upload.csv` in project root for upload tests
   - Synthetic data in `tools/synthetic-data/output/stress_test/`

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '../fixtures';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should do something', async ({ page }) => {
    // Test implementation
    await page.click('[data-testid="button"]');
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });
});
```

### Best Practices

1. **Use data-testid attributes** for reliable selectors
2. **Wait for network idle** before interactions
3. **Use explicit waits** with timeouts
4. **Handle both success and error cases**
5. **Clean up after tests** (if needed)

## Test Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

## CI/CD Integration

Tests are configured to run in CI with:
- Retries: 2 attempts
- Workers: 1 (sequential)
- Video: Only on failure
- Screenshots: Only on failure

## Debugging

### Visual debugging
```bash
pnpm test:e2e --debug
```

### Generate trace
```bash
pnpm test:e2e --trace on
```

### View trace
```bash
npx playwright show-trace trace.zip
```

## Coverage

Current test coverage:
- ✅ Authentication and navigation
- ✅ Upload workflows (CSV/PDF)
- ✅ Detection and issues
- ⚠️ Simulations (TODO)
- ⚠️ Exports (TODO)
- ⚠️ Contract intelligence (TODO)

## Troubleshooting

### Tests fail to connect
- Ensure API is running on `http://localhost:3000`
- Ensure Web is running on `http://localhost:5173`
- Check `pnpm dev:api` and `pnpm dev:web` logs

### Timeouts
- Increase timeout in test: `{ timeout: 60000 }`
- Check if services are slow to start

### Flaky tests
- Add explicit waits: `await page.waitForSelector(...)`
- Use `waitForLoadState('networkidle')`
- Increase retries in `playwright.config.ts`
