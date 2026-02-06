import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  readonly metricsSection: Locator;
  readonly issuesWidget: Locator;
  readonly contractsWidget: Locator;
  readonly revenueWidget: Locator;

  constructor(page: Page) {
    super(page);
    this.metricsSection = page.locator('[data-testid="metrics-section"]').or(
      page.locator('.metrics-grid')
    );
    this.issuesWidget = page.locator('[data-testid="issues-widget"]');
    this.contractsWidget = page.locator('[data-testid="contracts-widget"]');
    this.revenueWidget = page.locator('[data-testid="revenue-widget"]');
  }

  async goto() {
    await super.goto('/');
  }

  async expectMetricsLoaded() {
    // Wait for dashboard metrics API call
    await this.page.waitForResponse('**/dashboard/metrics');
    await this.waitForLoadingToDisappear();
  }

  async getMetricValue(metricName: string): Promise<string> {
    const metric = this.page.locator(`[data-testid="metric-${metricName}"]`).or(
      this.page.locator(`.metric-${metricName}`)
    );
    return await metric.textContent() || '';
  }

  async clickIssuesLink() {
    await this.page.getByRole('link', { name: /issues/i }).first().click();
    await this.waitForPageLoad();
  }

  async clickContractsLink() {
    await this.page.getByRole('link', { name: /contracts/i }).first().click();
    await this.waitForPageLoad();
  }
}
