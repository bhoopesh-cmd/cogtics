import { readFileSync, readdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import axios from 'axios';
import pLimit from 'p-limit';
import { TestConfig, TestResult, DEFAULT_CONFIG } from '../config/test-config';
import { SystemMonitor } from './monitor.js';

interface UploadResult {
  uploadId: string;
  fileId: string;
  uploadTimeMs: number;
  processTimeMs: number;
  success: boolean;
  error?: string;
}

export class VolumeTest {
  private config: TestConfig;
  private monitor: SystemMonitor;
  private results: UploadResult[] = [];

  constructor(config: Partial<TestConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config } as TestConfig;
    this.monitor = new SystemMonitor();
  }

  async run(batchSize: number, concurrency: number): Promise<TestResult> {
    console.log(`\n=== Starting Volume Test ===`);
    console.log(`Batch Size: ${batchSize} | Concurrency: ${concurrency}`);
    console.log(`PDF Directory: ${this.config.pdfDir}`);
    console.log(`API URL: ${this.config.apiUrl}\n`);

    // Get PDF files
    const pdfFiles = this.getPdfFiles(batchSize);
    console.log(`Found ${pdfFiles.length} PDF files to upload\n`);

    // Start monitoring
    this.monitor.start(5000);

    const startTime = Date.now();

    // Upload PDFs with concurrency control
    await this.uploadBatch(pdfFiles, concurrency);

    const totalTime = Date.now() - startTime;

    // Stop monitoring
    const metrics = this.monitor.stop();

    // Calculate results
    const result = this.calculateResults(totalTime, metrics);

    console.log(`\n=== Test Complete ===`);
    console.log(`Total Time: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`Success: ${result.successCount} | Failed: ${result.failureCount}`);
    console.log(`Avg Upload Time: ${result.avgUploadTime.toFixed(2)}ms`);
    console.log(`Avg Process Time: ${result.avgProcessTime.toFixed(2)}ms`);
    console.log(`Peak Queue Depth: ${result.peakQueueDepth}`);
    console.log(`Peak Memory: ${result.peakMemoryMB.toFixed(0)}MB\n`);

    return result;
  }

  private getPdfFiles(limit: number): string[] {
    const pdfDir = this.config.pdfDir;

    if (!existsSync(pdfDir)) {
      throw new Error(`PDF directory not found: ${pdfDir}`);
    }

    const files = readdirSync(pdfDir)
      .filter(f => f.endsWith('.pdf'))
      .slice(0, limit)
      .map(f => join(pdfDir, f));

    if (files.length === 0) {
      throw new Error(`No PDF files found in ${pdfDir}`);
    }

    return files;
  }

  private async uploadBatch(pdfFiles: string[], concurrency: number): Promise<void> {
    const limit = pLimit(concurrency);
    const promises = pdfFiles.map((filePath, index) =>
      limit(() => this.uploadPdf(filePath, index + 1, pdfFiles.length))
    );

    await Promise.all(promises);
  }

  private async uploadPdf(
    filePath: string,
    index: number,
    total: number
  ): Promise<void> {
    const fileName = filePath.split(/[/\\]/).pop() || 'unknown.pdf';
    const uploadStartTime = Date.now();

    try {
      console.log(`[${index}/${total}] Uploading ${fileName}...`);

      // Step 1: Start upload and get presigned URL
      const { uploadId, fileId, presignedUrl } = await this.startUpload(fileName);

      // Step 2: Upload file to S3
      await this.uploadToS3(presignedUrl, filePath);

      // Step 3: Complete upload and enqueue parse job
      await this.completeUpload(uploadId, fileId);

      const uploadTimeMs = Date.now() - uploadStartTime;

      // Step 4: Wait for processing to complete
      const processStartTime = Date.now();
      await this.waitForProcessing(uploadId);
      const processTimeMs = Date.now() - processStartTime;

      this.results.push({
        uploadId,
        fileId,
        uploadTimeMs,
        processTimeMs,
        success: true,
      });

      console.log(
        `[${index}/${total}] ✓ ${fileName} - Upload: ${uploadTimeMs}ms, Process: ${processTimeMs}ms`
      );
    } catch (error: any) {
      const uploadTimeMs = Date.now() - uploadStartTime;

      this.results.push({
        uploadId: '',
        fileId: '',
        uploadTimeMs,
        processTimeMs: 0,
        success: false,
        error: error.message,
      });

      console.error(`[${index}/${total}] ✗ ${fileName} - Error: ${error.message}`);
    }
  }

  private async startUpload(fileName: string): Promise<{
    uploadId: string;
    fileId: string;
    presignedUrl: string;
  }> {
    const response = await axios.post(
      `${this.config.apiUrl}/uploads/pdf/start`,
      {
        type: 'pdf',
        fileName: fileName,
        contentType: 'application/pdf',
        entityType: 'contract',
        displayName: `Stress Test - ${fileName}`,
      },
      {
        headers: this.getHeaders(),
      }
    );

    const { uploadId, fileId, presignedUrl } = response.data;

    return { uploadId, fileId, presignedUrl };
  }

  private async uploadToS3(presignedUrl: string, filePath: string): Promise<void> {
    const fileBuffer = readFileSync(filePath);

    await axios.put(presignedUrl, fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
      },
    });
  }

  private async completeUpload(uploadId: string, fileId: string): Promise<void> {
    await axios.post(
      `${this.config.apiUrl}/uploads/pdf/complete`,
      {
        uploadId,
        autoProcess: true,
      },
      {
        headers: this.getHeaders(),
      }
    );
  }

  private async waitForProcessing(
    uploadId: string,
    maxWaitMs = 60000
  ): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 1000; // Poll every 1 second

    while (Date.now() - startTime < maxWaitMs) {
      const response = await axios.get(`${this.config.apiUrl}/uploads/${uploadId}`, {
        headers: this.getHeaders(),
      });

      const { status } = response.data;

      if (status === 'completed') {
        return;
      }

      if (status === 'failed') {
        throw new Error(`Upload processing failed for ${uploadId}`);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Timeout waiting for upload ${uploadId} to complete`);
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.authMode === 'dev') {
      headers['x-dev-user-id'] = this.config.userId;
      headers['x-dev-tenant-id'] = this.config.tenantId;
    } else if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }

    return headers;
  }

  private calculateResults(totalTime: number, metrics: any[]): TestResult {
    const successResults = this.results.filter(r => r.success);
    const failedResults = this.results.filter(r => !r.success);

    const avgUploadTime =
      successResults.reduce((sum, r) => sum + r.uploadTimeMs, 0) /
      (successResults.length || 1);

    const avgProcessTime =
      successResults.reduce((sum, r) => sum + r.processTimeMs, 0) /
      (successResults.length || 1);

    const peakQueueDepth = Math.max(...metrics.map(m => m.queueDepth), 0);
    const peakMemoryMB = Math.max(
      ...metrics.map(m => m.apiMemoryMB + m.workerMemoryMB),
      0
    );

    return {
      batchSize: this.results.length,
      concurrency: 0, // Set by caller
      totalTime,
      avgUploadTime,
      avgProcessTime,
      successCount: successResults.length,
      failureCount: failedResults.length,
      peakQueueDepth,
      peakMemoryMB,
      errorMessages: failedResults.map(r => r.error || 'Unknown error'),
      metrics,
    };
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const batchSize = parseInt(args.find(a => a.startsWith('--batch='))?.split('=')[1] || '50');
  const concurrency = parseInt(
    args.find(a => a.startsWith('--concurrency='))?.split('=')[1] || '5'
  );

  const test = new VolumeTest({});
  const result = await test.run(batchSize, concurrency);

  // Save results
  const outputFile = `results/volume-${batchSize}-${concurrency}-${Date.now()}.json`;
  writeFileSync(outputFile, JSON.stringify(result, null, 2));
  console.log(`Results saved to ${outputFile}`);
}

// Run main
main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
