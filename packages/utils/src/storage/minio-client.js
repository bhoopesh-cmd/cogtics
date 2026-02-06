import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createLogger } from '../logger.js';
const logger = createLogger({ name: 'storage-service' });
export class StorageService {
    client;
    bucket;
    constructor(config) {
        // Attempt to load from environment if not provided
        // We try worker config first, then API config, or fallback to defaults
        // This allows the service to be used in both apps
        // Note: We need a unified way to get S3 config. 
        // For now we will rely on process.env falling back to hardcoded defaults for dev
        // Ideally this should come from a shared config schema
        const endpoint = config?.endpoint || process.env.S3_ENDPOINT || 'http://localhost:9000';
        const region = config?.region || process.env.S3_REGION || 'us-east-1';
        const accessKeyId = config?.accessKeyId || process.env.S3_ACCESS_KEY || 'minioadmin';
        const secretAccessKey = config?.secretAccessKey || process.env.S3_SECRET_KEY || 'minioadmin';
        this.bucket = config?.bucket || process.env.S3_BUCKET || 'cogtics';
        this.client = new S3Client({
            endpoint,
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
            forcePathStyle: true, // Required for MinIO
        });
        logger.info({ bucket: this.bucket, endpoint }, 'StorageService initialized');
    }
    /**
     * Upload a file stream to storage
     */
    async uploadStream(key, stream, contentType, metadata) {
        try {
            const command = new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: stream,
                ContentType: contentType,
                Metadata: metadata,
            });
            await this.client.send(command);
            logger.debug({ key }, 'File uploaded successfully');
        }
        catch (error) {
            logger.error({ key, error }, 'Failed to upload file');
            throw error;
        }
    }
    /**
     * Upload a buffer to storage (provides Content-Length automatically)
     */
    async uploadBuffer(key, buffer, contentType, metadata) {
        try {
            const command = new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: buffer,
                ContentType: contentType,
                ContentLength: buffer.length,
                Metadata: metadata,
            });
            await this.client.send(command);
            logger.debug({ key, size: buffer.length }, 'Buffer uploaded successfully');
        }
        catch (error) {
            logger.error({ key, error }, 'Failed to upload buffer');
            throw error;
        }
    }
    /**
     * Get a file stream from storage
     */
    async getStream(key) {
        try {
            const command = new GetObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            const response = await this.client.send(command);
            if (!response.Body) {
                throw new Error(`File body is empty for key: ${key}`);
            }
            return response.Body;
        }
        catch (error) {
            logger.error({ key, error }, 'Failed to get file stream');
            throw error;
        }
    }
    /**
     * Check if a file exists
     */
    async exists(key) {
        try {
            const command = new HeadObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            await this.client.send(command);
            return true;
        }
        catch (error) {
            if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
                return false;
            }
            throw error;
        }
    }
    /**
     * Generate a presigned URL for downloading a file
     */
    async getPresignedDownloadUrl(key, expiresInSeconds = 3600) {
        try {
            const command = new GetObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            const url = await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
            return url;
        }
        catch (error) {
            logger.error({ key, error }, 'Failed to generate presigned download URL');
            throw error;
        }
    }
    /**
     * Generate a presigned URL for uploading a file (client-side upload)
     */
    async getPresignedUploadUrl(key, contentType, expiresInSeconds = 300) {
        try {
            const command = new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                ContentType: contentType,
            });
            const url = await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
            return url;
        }
        catch (error) {
            logger.error({ key, error }, 'Failed to generate presigned upload URL');
            throw error;
        }
    }
    /**
     * Delete a file
     */
    async delete(key) {
        try {
            const command = new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            await this.client.send(command);
            logger.debug({ key }, 'File deleted successfully');
        }
        catch (error) {
            logger.error({ key, error }, 'Failed to delete file');
            throw error;
        }
    }
}
//# sourceMappingURL=minio-client.js.map