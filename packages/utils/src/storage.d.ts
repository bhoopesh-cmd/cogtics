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
export declare class StorageClient {
    private client;
    private bucket;
    constructor(config: StorageConfig);
    /**
     * Generate tenant-prefixed key
     */
    private getTenantKey;
    /**
     * Upload an object to storage
     */
    putObject(tenantId: TenantId, key: string, body: Buffer | Uint8Array | string, options?: UploadOptions): Promise<{
        key: string;
        etag: string | undefined;
    }>;
    /**
     * Get an object from storage
     */
    getObject(tenantId: TenantId, key: string): Promise<Buffer>;
    /**
     * Get object metadata without downloading the body
     */
    headObject(tenantId: TenantId, key: string): Promise<StorageObject>;
    /**
     * Delete an object from storage
     */
    deleteObject(tenantId: TenantId, key: string): Promise<void>;
    /**
     * Get an object from storage using raw S3 key (without tenant prefix)
     * Used by ingestion pipeline when the full key is already known
     */
    get(key: string): Promise<Buffer>;
    /**
     * Generate a pre-signed URL for downloading an object
     */
    getSignedDownloadUrl(tenantId: TenantId, key: string, expiresInSeconds?: number): Promise<string>;
    /**
     * Generate a pre-signed URL for uploading an object
     */
    getSignedUploadUrl(tenantId: TenantId, key: string, contentType: string, expiresInSeconds?: number): Promise<string>;
    /**
     * Generate a pre-signed URL for uploading an object (raw key, no tenant prefix)
     */
    getRawSignedUploadUrl(key: string, contentType: string, expiresInSeconds?: number): Promise<string>;
    /**
     * Generate a pre-signed URL for downloading an object (raw key, no tenant prefix)
     */
    getRawSignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
    /**
     * Delete an object using raw key (no tenant prefix)
     */
    deleteRaw(key: string): Promise<void>;
}
/**
 * Create a storage client from environment config
 */
export declare function createStorageClient(config: StorageConfig): StorageClient;
//# sourceMappingURL=storage.d.ts.map