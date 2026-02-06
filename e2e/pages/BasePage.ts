import { Page, Locator, expect } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  readonly sidebar: Locator;
  readonly mainContent: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator('[data-testid="sidebar"]').or(page.locator('.w-64.h-screen'));
    this.mainContent = page.locator('main').or(page.locator('[data-testid="main-content"]'));
  }

  async goto(path: string = '/') {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async waitForApi(urlPattern: string | RegExp) {
    return this.page.waitForResponse(urlPattern);
  }

  // Navigation helpers
  async navigateTo(menuItem: string) {
    await this.page.getByRole('link', { name: menuItem }).click();
    await this.waitForPageLoad();
  }

  async clickNavItem(text: string) {
    await this.sidebar.getByText(text).click();
    await this.waitForPageLoad();
  }

  // Common assertions
  async expectPageTitle(title: string) {
    await expect(this.page).toHaveTitle(title);
  }

  async expectUrl(url: string | RegExp) {
    await expect(this.page).toHaveURL(url);
  }

  async expectHeading(text: string) {
    await expect(this.page.getByRole('heading', { name: text })).toBeVisible();
  }

  // Toast/notification helpers
  async expectSuccessToast(message?: string) {
    const toast = this.page.locator('[data-testid="toast-success"]').or(
      this.page.locator('.toast-success')
    );
    await expect(toast).toBeVisible();
    if (message) {
      await expect(toast).toContainText(message);
    }
  }

  async expectErrorToast(message?: string) {
    const toast = this.page.locator('[data-testid="toast-error"]').or(
      this.page.locator('.toast-error')
    );
    await expect(toast).toBeVisible();
    if (message) {
      await expect(toast).toContainText(message);
    }
  }

  // Loading state helpers
  async waitForLoadingToDisappear() {
    const loader = this.page.locator('[data-testid="loading"]').or(
      this.page.locator('.loading-spinner')
    );
    await expect(loader).toBeHidden({ timeout: 30000 });
  }
}
