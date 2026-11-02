/**
 * Storage Plugin
 * 
 * Provides S3/MinIO storage client for file uploads.
 */
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { createStorageClient, type StorageClient } from '@cogtics/utils';

declare module 'fastify' {
  interface FastifyInstance {
    storage: {
      // Raw key methods (key includes any tenant prefix already)
      getPresignedPutUrl: (key: string, options: { contentType: string; expiresIn: number }) => Promise<string>;
      getPresignedGetUrl: (key: string, expiresIn: number) => Promise<string>;
      deleteObject: (key: string) => Promise<void>;
      getObject: (key: string) => Promise<Buffer>;
      // Tenant-prefixed methods (adds tenant prefix automatically)
      getSignedUploadUrl: (tenantId: string, key: string, options: { contentType: string; expiresIn: number }) => Promise<string>;
      getSignedDownloadUrl: (tenantId: string, key: string, expiresIn: number) => Promise<string>;
      client: StorageClient;
    };
  }
}

const storagePlugin: FastifyPluginAsync = async (fastify) => {
  const endpoint = process.env.S3_ENDPOINT ?? process.env.MINIO_ENDPOINT ?? 'http://localhost:9000';
  const accessKey = process.env.S3_ACCESS_KEY ?? process.env.MINIO_ACCESS_KEY ?? 'minioadmin';
  const secretKey = process.env.S3_SECRET_KEY ?? process.env.MINIO_SECRET_KEY ?? 'minioadmin';
  const bucket = process.env.S3_BUCKET ?? process.env.MINIO_BUCKET ?? 'cogtics-uploads';
  const region = process.env.S3_REGION ?? process.env.MINIO_REGION ?? 'us-east-1';

  const client = createStorageClient({
    endpoint,
    accessKey,
    secretKey,
    bucket,
    region,
  });

  fastify.decorate('storage', {
    // Raw key methods - for when key already includes tenant prefix
    getPresignedPutUrl: async (key: string, options: { contentType: string; expiresIn: number }) => {
      return client.getRawSignedUploadUrl(key, options.contentType, options.expiresIn);
    },
    getPresignedGetUrl: async (key: string, expiresIn: number) => {
      return client.getRawSignedDownloadUrl(key, expiresIn);
    },
    deleteObject: async (key: string) => {
      await client.deleteRaw(key);
    },
    getObject: async (key: string) => {
      return client.get(key);
    },
    // Tenant-prefixed methods - for when you want automatic prefixing
    getSignedUploadUrl: async (tenantId: string, key: string, options: { contentType: string; expiresIn: number }) => {
      return client.getSignedUploadUrl(tenantId as any, key, options.contentType, options.expiresIn);
    },
    getSignedDownloadUrl: async (tenantId: string, key: string, expiresIn: number) => {
      return client.getSignedDownloadUrl(tenantId as any, key, expiresIn);
    },
    client,
  });

  fastify.log.info({ endpoint, bucket }, 'Storage client initialized');
};

export default fp(storagePlugin, {
  name: 'storage',
});

export { storagePlugin };
