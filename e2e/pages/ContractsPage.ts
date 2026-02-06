import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ContractsPage extends BasePage {
  readonly contractsTable: Locator;
  readonly contractRows: Locator;
  readonly searchInput: Locator;
  readonly filterStatus: Locator;

  constructor(page: Page) {
    super(page);
    this.contractsTable = page.locator('[data-testid="contracts-table"]').or(page.locator('table'));
    this.contractRows = this.contractsTable.locator('tbody tr');
    this.searchInput = page.getByPlaceholder(/search/i);
    this.filterStatus = page.locator('[data-testid="filter-status"]');
  }

  async goto() {
    await super.goto('/contracts');
    await this.waitForContractsLoaded();
  }

  async waitForContractsLoaded() {
    await this.page.waitForResponse('**/contracts*');
    await this.waitForLoadingToDisappear();
  }

  async getContractCount(): Promise<number> {
    return await this.contractRows.count();
  }

  async searchContracts(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.waitForContractsLoaded();
  }

  async clickContract(contractId: string) {
    await this.page.locator(`[data-contract-id="${contractId}"]`).or(
      this.contractsTable.locator(`tr:has-text("${contractId}")`)
    ).click();
    await this.waitForPageLoad();
  }

  async expectContractVisible(contractId: string) {
    await expect(
      this.page.locator(`[data-contract-id="${contractId}"]`).or(
        this.contractsTable.locator(`tr:has-text("${contractId}")`)
      )
    ).toBeVisible();
  }
}
