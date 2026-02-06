import { test as base, Page } from '@playwright/test';

// Test users from db:seed
export const TEST_USERS = {
  admin: {
    id: 'user_01',
    email: 'admin@cogtics.dev',
    password: 'admin123',
    role: 'admin',
    tenantId: 'tenant_01',
  },
  cfo: {
    id: 'user_02',
    email: 'cfo@cogtics.dev',
    password: 'cfo123',
    role: 'cfo',
    tenantId: 'tenant_01',
  },
  analyst: {
    id: 'user_03',
    email: 'analyst@cogtics.dev',
    password: 'analyst123',
    role: 'analyst',
    tenantId: 'tenant_01',
  },
};

export type TestUser = keyof typeof TEST_USERS;

// Custom fixtures for authenticated tests
type AuthFixtures = {
  authenticatedPage: Page;
  adminPage: Page;
  cfoPage: Page;
  analystPage: Page;
};

// Helper to set dev mode auth headers
async function setDevAuthHeaders(page: Page, user: typeof TEST_USERS.admin) {
  // In dev mode, we use x-tenant-id and x-user-id headers
  await page.route('**/*', async (route) => {
    const headers = {
      ...route.request().headers(),
      'x-tenant-id': user.tenantId,
      'x-user-id': user.id,
    };
    await route.continue({ headers });
  });
}

// Helper to perform actual UI login
async function performLogin(page: Page, user: typeof TEST_USERS.admin) {
  // Navigate to app (will show dev login page)
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Map user ID to display name
  const userNameMap: Record<string, string> = {
    'user_01': 'Admin User',
    'user_02': 'CFO User',
    'user_03': 'Analyst User',
  };

  const userName = userNameMap[user.id] || 'Admin User';

  // Click the user button to login
  const userButton = page.getByRole('button', { name: new RegExp(userName, 'i') }).first();

  // Wait for button to be visible (login page loaded)
  try {
    await userButton.waitFor({ state: 'visible', timeout: 10000 });
    await userButton.click();

    // Wait for login to complete and navigation
    await page.waitForLoadState('networkidle');

    // Give auth state time to propagate
    await page.waitForTimeout(1000);
  } catch (e) {
    // May already be logged in or different UI state
    console.log(`Login button for ${userName} not found, may already be authenticated`);
  }
}

// Extend base test with auth fixtures
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await performLogin(page, TEST_USERS.admin);
    await use(page);
  },
  adminPage: async ({ page }, use) => {
    await performLogin(page, TEST_USERS.admin);
    await use(page);
  },
  cfoPage: async ({ page }, use) => {
    await performLogin(page, TEST_USERS.cfo);
    await use(page);
  },
  analystPage: async ({ page }, use) => {
    await performLogin(page, TEST_USERS.analyst);
    await use(page);
  },
});

export { expect } from '@playwright/test';
