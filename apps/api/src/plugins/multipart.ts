import fp from 'fastify-plugin';
import multipart, { FastifyMultipartOptions } from '@fastify/multipart';

export const multipartPlugin = fp<FastifyMultipartOptions>(async (app) => {
    await app.register(multipart, {
        limits: {
            fieldNameSize: 100, // Max field name size in bytes
            fieldSize: 100,     // Max field value size in bytes
            fields: 10,         // Max number of non-file fields
            fileSize: 100 * 1024 * 1024, // 100MB max file size
            files: 1,           // Max number of file fields
            headerPairs: 2000,  // Max number of header key=>value pairs
        },
    });
});
