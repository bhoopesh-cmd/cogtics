import { Readable } from 'stream';
export interface MinioStorageConfig {
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
}
export declare class StorageService {
    private client;
    private bucket;
    constructor(config?: MinioStorageConfig);
    /**
     * Upload a file stream to storage
     */
    uploadStream(key: string, stream: Readable | Buffer | string, contentType: string, metadata?: Record<string, string>): Promise<void>;
    /**
     * Upload a buffer to storage (provides Content-Length automatically)
     */
    uploadBuffer(key: string, buffer: Buffer, contentType: string, metadata?: Record<string, string>): Promise<void>;
    /**
     * Get a file stream from storage
     */
    getStream(key: string): Promise<Readable>;
    /**
     * Check if a file exists
     */
    exists(key: string): Promise<boolean>;
    /**
     * Generate a presigned URL for downloading a file
     */
    getPresignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
    /**
     * Generate a presigned URL for uploading a file (client-side upload)
     */
    getPresignedUploadUrl(key: string, contentType: string, expiresInSeconds?: number): Promise<string>;
    /**
     * Delete a file
     */
    delete(key: string): Promise<void>;
}
//# sourceMappingURL=minio-client.d.ts.map