import { readdirSync } from 'fs';
import { join } from 'path';
import { ApiClient } from '../lib/api-client.js';
import type { UserConfig } from '../lib/jwt-generator.js';

export interface UploadResult {
  uploadId: string;
  fileName: string;
  uploadTimeMs: number;
  processTimeMs: number;
  success: boolean;
  error?: string;
}

export interface UserResult {
  userId: string;
  tenantId: string;
  uploads: UploadResult[];
  totalTime: number;
  successRate: number;
  avgUploadTime: number;
  avgProcessTime: number;
  errors: string[];
}

/**
 * Simulates a single user's session
 * Each user uploads multiple PDFs and waits for completion
 */
export class UserSimulator {
  private client: ApiClient;
  private config: UserConfig;
  private pdfDir: string;
  private results: UploadResult[] = [];

  constructor(config: UserConfig, apiUrl: string, pdfDir: string) {
    this.config = config;
    this.pdfDir = pdfDir;

    // Use dev mode headers instead of JWT for now (API JWT validation issue)
    this.client = new ApiClient({
      baseUrl: apiUrl,
      userId: config.userId,
      tenantId: config.tenantId,
      // token: config.token,  // Disabled - use dev mode
    });
  }

  /**
   * Run the user simulation
   */
  async run(): Promise<UserResult> {
    console.log(`[${this.config.userId}] Starting session - ${this.config.uploadCount} uploads`);

    const startTime = Date.now();
    const pdfFiles = this.selectPdfFiles(this.config.uploadCount);

    for (let i = 0; i < pdfFiles.length; i++) {
      const filePath = pdfFiles[i];
      const fileName = filePath.split(/[/\\]/).pop() || 'unknown.pdf';

      try {
        console.log(`[${this.config.userId}] Uploading ${i + 1}/${pdfFiles.length}: ${fileName}`);

        const result = await this.uploadPdf(filePath, fileName);
        this.results.push(result);

        if (result.success) {
          console.log(
            `[${this.config.userId}] ✓ ${fileName} - Upload: ${result.uploadTimeMs}ms, Process: ${result.processTimeMs}ms`
          );
        } else {
          console.error(`[${this.config.userId}] ✗ ${fileName} - ${result.error}`);
        }

        // Delay between uploads
        if (i < pdfFiles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, this.config.delayBetweenUploads));
        }
      } catch (error: any) {
        console.error(`[${this.config.userId}] ✗ ${fileName} - Unexpected error: ${error.message}`);
        this.results.push({
          uploadId: '',
          fileName,
          uploadTimeMs: 0,
          processTimeMs: 0,
          success: false,
          error: error.message,
        });
      }
    }

    const totalTime = Date.now() - startTime;

    return this.calculateResults(totalTime);
  }

  /**
   * Upload a single PDF and wait for completion
   */
  private async uploadPdf(filePath: string, fileName: string): Promise<UploadResult> {
    const uploadStartTime = Date.now();

    try {
      // Step 1: Start upload
      const { uploadId, presignedUrl } = await this.client.startUpload(fileName);

      // Step 2: Upload to S3
      await this.client.uploadToS3(presignedUrl, filePath);

      // Step 3: Complete upload
      await this.client.completeUpload(uploadId);

      const uploadTimeMs = Date.now() - uploadStartTime;

      // Step 4: Wait for processing
      const processStartTime = Date.now();
      await this.client.waitForCompletion(uploadId);
      const processTimeMs = Date.now() - processStartTime;

      return {
        uploadId,
        fileName,
        uploadTimeMs,
        processTimeMs,
        success: true,
      };
    } catch (error: any) {
      const uploadTimeMs = Date.now() - uploadStartTime;

      return {
        uploadId: '',
        fileName,
        uploadTimeMs,
        processTimeMs: 0,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Select random PDF files for this user
   */
  private selectPdfFiles(count: number): string[] {
    const allPdfs = readdirSync(this.pdfDir)
      .filter(f => f.endsWith('.pdf'))
      .map(f => join(this.pdfDir, f));

    if (allPdfs.length === 0) {
      throw new Error(`No PDF files found in ${this.pdfDir}`);
    }

    // Shuffle and select
    const shuffled = allPdfs.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  /**
   * Calculate final results
   */
  private calculateResults(totalTime: number): UserResult {
    const successResults = this.results.filter(r => r.success);
    const failedResults = this.results.filter(r => !r.success);

    const avgUploadTime =
      successResults.reduce((sum, r) => sum + r.uploadTimeMs, 0) /
      (successResults.length || 1);

    const avgProcessTime =
      successResults.reduce((sum, r) => sum + r.processTimeMs, 0) /
      (successResults.length || 1);

    const successRate = (successResults.length / this.results.length) * 100;

    return {
      userId: this.config.userId,
      tenantId: this.config.tenantId,
      uploads: this.results,
      totalTime,
      successRate,
      avgUploadTime,
      avgProcessTime,
      errors: failedResults.map(r => r.error || 'Unknown error'),
    };
  }
}
