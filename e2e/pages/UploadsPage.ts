import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import path from 'path';

export class UploadsPage extends BasePage {
  readonly uploadDropzone: Locator;
  readonly uploadButton: Locator;
  readonly uploadsList: Locator;
  readonly uploadRows: Locator;

  constructor(page: Page) {
    super(page);
    this.uploadDropzone = page.locator('[data-testid="upload-dropzone"]').or(
      page.locator('.dropzone')
    );
    this.uploadButton = page.getByRole('button', { name: /upload/i });
    this.uploadsList = page.locator('[data-testid="uploads-list"]').or(page.locator('table'));
    this.uploadRows = this.uploadsList.locator('tbody tr');
  }

  async goto() {
    await super.goto('/uploads');
  }

  async uploadPDF(filePath: string) {
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    await this.waitForUploadComplete();
  }

  async uploadCSV(filePath: string) {
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    await this.waitForUploadComplete();
  }

  async waitForUploadComplete() {
    // Wait for upload to complete
    await this.page.waitForResponse((response) =>
      response.url().includes('/uploads/') && response.status() === 200
    );
    await this.waitForLoadingToDisappear();
  }

  async waitForProcessingComplete(uploadId: string, timeout = 60000) {
    // Poll for processing status
    await this.page.waitForFunction(
      (id) => {
        const status = document.querySelector(`[data-upload-id="${id}"] [data-status]`);
        return status?.getAttribute('data-status') === 'completed';
      },
      uploadId,
      { timeout }
    );
  }

  async expectUploadSuccess() {
    await this.expectSuccessToast('uploaded successfully');
  }

  async expectUploadInList(fileName: string) {
    await expect(this.uploadsList.locator(`text=${fileName}`)).toBeVisible();
  }

  async getUploadStatus(uploadId: string): Promise<string> {
    const statusCell = this.page.locator(`[data-upload-id="${uploadId}"] [data-status]`);
    return await statusCell.getAttribute('data-status') || '';
  }

  async clickUpload(uploadId: string) {
    await this.page.locator(`[data-upload-id="${uploadId}"]`).click();
    await this.waitForPageLoad();
  }
}
