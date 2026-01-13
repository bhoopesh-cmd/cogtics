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
      getPresignedPutUrl: (key: string, options: { contentType: string; expiresIn: number }) => Promise<string>;
      getPresignedGetUrl: (key: string, expiresIn: number) => Promise<string>;
      deleteObject: (key: string) => Promise<void>;
      getObject: (key: string) => Promise<{ Body: NodeJS.ReadableStream | null }>;
    };
  }
}

const storagePlugin: FastifyPluginAsync = async (fastify) => {
  const endpoint = process.env.MINIO_ENDPOINT ?? 'http://localhost:9000';
  const accessKeyId = process.env.MINIO_ACCESS_KEY ?? 'minioadmin';
  const secretAccessKey = process.env.MINIO_SECRET_KEY ?? 'minioadmin';
  const bucket = process.env.MINIO_BUCKET ?? 'cogtics-uploads';

  const client = createStorageClient({
    endpoint,
    accessKeyId,
    secretAccessKey,
    bucket,
  });

  fastify.decorate('storage', {
    getPresignedPutUrl: async (key: string, options: { contentType: string; expiresIn: number }) => {
      return client.getPresignedPutUrl(key, options.expiresIn);
    },
    getPresignedGetUrl: async (key: string, expiresIn: number) => {
      return client.getPresignedGetUrl(key, expiresIn);
    },
    deleteObject: async (key: string) => {
      await client.deleteObject(key);
    },
    getObject: async (key: string) => {
      return client.getObject(key);
    },
  });

  fastify.log.info({ endpoint, bucket }, 'Storage client initialized');
};

export default fp(storagePlugin, {
  name: 'storage',
});

export { storagePlugin };
