import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
/**
 * S3-compatible storage client with tenant-prefixed keys
 */
export class StorageClient {
    client;
    bucket;
    constructor(config) {
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
    getTenantKey(tenantId, key) {
        return `tenants/${tenantId}/${key}`;
    }
    /**
     * Upload an object to storage
     */
    async putObject(tenantId, key, body, options = {}) {
        const fullKey = this.getTenantKey(tenantId, key);
        const input = {
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
    async getObject(tenantId, key) {
        const fullKey = this.getTenantKey(tenantId, key);
        const result = await this.client.send(new GetObjectCommand({
            Bucket: this.bucket,
            Key: fullKey,
        }));
        if (!result.Body) {
            throw new Error(`Object not found: ${fullKey}`);
        }
        // Convert stream to buffer
        const chunks = [];
        const stream = result.Body;
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    }
    /**
     * Get object metadata without downloading the body
     */
    async headObject(tenantId, key) {
        const fullKey = this.getTenantKey(tenantId, key);
        const result = await this.client.send(new HeadObjectCommand({
            Bucket: this.bucket,
            Key: fullKey,
        }));
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
    async deleteObject(tenantId, key) {
        const fullKey = this.getTenantKey(tenantId, key);
        await this.client.send(new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: fullKey,
        }));
    }
    /**
     * Get an object from storage using raw S3 key (without tenant prefix)
     * Used by ingestion pipeline when the full key is already known
     */
    async get(key) {
        const result = await this.client.send(new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        }));
        if (!result.Body) {
            throw new Error(`Object not found: ${key}`);
        }
        // Convert stream to buffer
        const chunks = [];
        const stream = result.Body;
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    }
    /**
     * Generate a pre-signed URL for downloading an object
     */
    async getSignedDownloadUrl(tenantId, key, expiresInSeconds = 3600) {
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
    async getSignedUploadUrl(tenantId, key, contentType, expiresInSeconds = 3600) {
        const fullKey = this.getTenantKey(tenantId, key);
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: fullKey,
            ContentType: contentType,
        });
        return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    }
    /**
     * Generate a pre-signed URL for uploading an object (raw key, no tenant prefix)
     */
    async getRawSignedUploadUrl(key, contentType, expiresInSeconds = 3600) {
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: contentType,
        });
        return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    }
    /**
     * Generate a pre-signed URL for downloading an object (raw key, no tenant prefix)
     */
    async getRawSignedDownloadUrl(key, expiresInSeconds = 3600) {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });
        return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    }
    /**
     * Delete an object using raw key (no tenant prefix)
     */
    async deleteRaw(key) {
        await this.client.send(new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key,
        }));
    }
}
/**
 * Create a storage client from environment config
 */
export function createStorageClient(config) {
    return new StorageClient(config);
}
//# sourceMappingURL=storage.js.map