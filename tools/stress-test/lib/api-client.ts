import axios, { AxiosInstance, AxiosError } from 'axios';
import { readFileSync } from 'fs';

export interface ApiClientConfig {
  baseUrl: string;
  token?: string;
  userId?: string;
  tenantId?: string;
  timeout?: number;
}

export interface StartUploadResponse {
  uploadId: string;
  fileId: string;
  presignedUrl: string;
  s3Key: string;
}

export interface UploadStatus {
  id: string;
  type: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  entityType: string;
  displayName: string;
  fileCount: number;
  totalRows: number;
  validRows: number;
  errorCount: number;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface Upload {
  id: string;
  type: string;
  status: string;
  entityType: string;
  displayName: string;
  createdAt: string;
}

/**
 * Authenticated API client for stress testing
 * Supports both JWT and dev mode authentication
 */
export class ApiClient {
  private client: AxiosInstance;
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: this.buildHeaders(),
    });

    // Add error interceptor for better error messages
    this.client.interceptors.response.use(
      response => response,
      (error: AxiosError) => {
        if (error.response) {
          const err = new Error(`HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`);
          (err as any).status = error.response.status;
          (err as any).data = error.response.data;
          throw err;
        }
        throw error;
      }
    );
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.token) {
      headers['Authorization'] = `Bearer ${this.config.token}`;
    } else {
      // Dev mode fallback
      headers['x-dev-user-id'] = this.config.userId || 'user_01';
      headers['x-dev-tenant-id'] = this.config.tenantId || 'tenant_01';
    }

    return headers;
  }

  /**
   * Start a PDF upload and get presigned S3 URL
   */
  async startUpload(fileName: string): Promise<StartUploadResponse> {
    const response = await this.client.post('/uploads/pdf/start', {
      type: 'pdf',
      fileName,
      contentType: 'application/pdf',
      entityType: 'contract',
      displayName: `Stress Test - ${fileName}`,
    });

    return {
      uploadId: response.data.uploadId,
      fileId: response.data.fileId,
      presignedUrl: response.data.presignedUrl,
      s3Key: response.data.s3Key,
    };
  }

  /**
   * Upload file to S3 using presigned URL
   */
  async uploadToS3(presignedUrl: string, filePath: string): Promise<void> {
    const fileBuffer = readFileSync(filePath);

    await axios.put(presignedUrl, fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
      },
      timeout: 30000,
    });
  }

  /**
   * Mark upload as complete and trigger processing
   */
  async completeUpload(uploadId: string): Promise<void> {
    await this.client.post('/uploads/pdf/complete', {
      uploadId,
      autoProcess: true,
    });
  }

  /**
   * Get upload status
   */
  async getUploadStatus(uploadId: string): Promise<UploadStatus> {
    const response = await this.client.get(`/uploads/${uploadId}`);
    return response.data;
  }

  /**
   * List all uploads
   */
  async listUploads(limit = 50, offset = 0): Promise<{ uploads: Upload[]; total: number }> {
    const response = await this.client.get('/uploads', {
      params: { limit, offset },
    });
    return {
      uploads: response.data.uploads,
      total: response.data.total,
    };
  }

  /**
   * Reprocess an upload
   */
  async reprocessUpload(uploadId: string): Promise<void> {
    await this.client.post(`/uploads/${uploadId}/reprocess`);
  }

  /**
   * Delete an upload
   */
  async deleteUpload(uploadId: string): Promise<void> {
    await this.client.delete(`/uploads/${uploadId}`);
  }

  /**
   * Wait for upload to complete processing
   */
  async waitForCompletion(uploadId: string, maxWaitMs = 60000): Promise<UploadStatus> {
    const startTime = Date.now();
    const pollInterval = 1000;

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getUploadStatus(uploadId);

      if (status.status === 'completed') {
        return status;
      }

      if (status.status === 'failed') {
        throw new Error(`Upload ${uploadId} failed: ${status.errorMessage}`);
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Timeout waiting for upload ${uploadId} to complete`);
  }
}
