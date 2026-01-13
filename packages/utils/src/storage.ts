import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { TenantId } from '@cogtics/schemas';

export interface StorageConfig {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region: string;
}

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface StorageObject {
  key: string;
  contentType: string | undefined;
  size: number | undefined;
  lastModified: Date | undefined;
  etag: string | undefined;
}

/**
 * S3-compatible storage client with tenant-prefixed keys
 */
export class StorageClient {
  private client: S3Client;
  private bucket: string;

  constructor(config: StorageConfig) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
      forcePathStyle: true, // Required for MinIO
    });
  }

  /**
   * Generate tenant-prefixed key
   */
  private getTenantKey(tenantId: TenantId, key: string): string {
    return `tenants/${tenantId}/${key}`;
  }

  /**
   * Upload an object to storage
   */
  async putObject(
    tenantId: TenantId,
    key: string,
    body: Buffer | Uint8Array | string,
    options: UploadOptions = {}
  ): Promise<{ key: string; etag: string | undefined }> {
    const fullKey = this.getTenantKey(tenantId, key);
    
    const input: PutObjectCommandInput = {
      Bucket: this.bucket,
      Key: fullKey,
      Body: body,
      ContentType: options.contentType,
      Metadata: options.metadata,
    };

    const result = await this.client.send(new PutObjectCommand(input));
    
    return {
      key: fullKey,
      etag: result.ETag,
    };
  }

  /**
   * Get an object from storage
   */
  async getObject(tenantId: TenantId, key: string): Promise<Buffer> {
    const fullKey = this.getTenantKey(tenantId, key);
    
    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
      })
    );

    if (!result.Body) {
      throw new Error(`Object not found: ${fullKey}`);
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const stream = result.Body as AsyncIterable<Uint8Array>;
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  /**
   * Get object metadata without downloading the body
   */
  async headObject(tenantId: TenantId, key: string): Promise<StorageObject> {
    const fullKey = this.getTenantKey(tenantId, key);
    
    const result = await this.client.send(
      new HeadObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
      })
    );

    return {
      key: fullKey,
      contentType: result.ContentType,
      size: result.ContentLength,
      lastModified: result.LastModified,
      etag: result.ETag,
    };
  }

  /**
   * Delete an object from storage
   */
  async deleteObject(tenantId: TenantId, key: string): Promise<void> {
    const fullKey = this.getTenantKey(tenantId, key);
    
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
      })
    );
  }

  /**
   * Get an object from storage using raw S3 key (without tenant prefix)
   * Used by ingestion pipeline when the full key is already known
   */
  async get(key: string): Promise<Buffer> {
    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );

    if (!result.Body) {
      throw new Error(`Object not found: ${key}`);
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const stream = result.Body as AsyncIterable<Uint8Array>;
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  /**
   * Generate a pre-signed URL for downloading an object
   */
  async getSignedDownloadUrl(
    tenantId: TenantId,
    key: string,
    expiresInSeconds: number = 3600
  ): Promise<string> {
    const fullKey = this.getTenantKey(tenantId, key);
    
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: fullKey,
    });

    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  /**
   * Generate a pre-signed URL for uploading an object
   */
  async getSignedUploadUrl(
    tenantId: TenantId,
    key: string,
    contentType: string,
    expiresInSeconds: number = 3600
  ): Promise<string> {
    const fullKey = this.getTenantKey(tenantId, key);
    
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fullKey,
      ContentType: contentType,
    });

    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }
}

/**
 * Create a storage client from environment config
 */
export function createStorageClient(config: StorageConfig): StorageClient {
  return new StorageClient(config);
}

