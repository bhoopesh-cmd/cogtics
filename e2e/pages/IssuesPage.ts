import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class IssuesPage extends BasePage {
  readonly issuesTable: Locator;
  readonly filterSeverity: Locator;
  readonly filterStatus: Locator;
  readonly searchInput: Locator;
  readonly issueRows: Locator;

  constructor(page: Page) {
    super(page);
    this.issuesTable = page.locator('[data-testid="issues-table"]').or(page.locator('table'));
    this.filterSeverity = page.locator('[data-testid="filter-severity"]');
    this.filterStatus = page.locator('[data-testid="filter-status"]');
    this.searchInput = page.getByPlaceholder(/search/i);
    this.issueRows = this.issuesTable.locator('tbody tr');
  }

  async goto() {
    await super.goto('/issues');
    await this.waitForIssuesLoaded();
  }

  async waitForIssuesLoaded() {
    await this.page.waitForResponse('**/issues*');
    await this.waitForLoadingToDisappear();
  }

  async getIssueCount(): Promise<number> {
    return await this.issueRows.count();
  }

  async filterBySeverity(severity: 'critical' | 'high' | 'medium' | 'low') {
    await this.filterSeverity.click();
    await this.page.getByRole('option', { name: severity }).click();
    await this.waitForIssuesLoaded();
  }

  async filterByStatus(status: 'open' | 'investigating' | 'confirmed' | 'resolved' | 'dismissed') {
    await this.filterStatus.click();
    await this.page.getByRole('option', { name: status }).click();
    await this.waitForIssuesLoaded();
  }

  async searchIssues(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.waitForIssuesLoaded();
  }

  async clickIssue(issueId: string) {
    await this.page.getByTestId(`issue-row-${issueId}`).or(
      this.issuesTable.locator(`tr:has-text("${issueId}")`)
    ).click();
    await this.waitForPageLoad();
  }

  async expectIssueVisible(issueId: string) {
    await expect(
      this.page.getByTestId(`issue-row-${issueId}`).or(
        this.issuesTable.locator(`tr:has-text("${issueId}")`)
      )
    ).toBeVisible();
  }

  async expectNoIssues() {
    await expect(this.page.getByText(/no issues found/i)).toBeVisible();
  }
}
