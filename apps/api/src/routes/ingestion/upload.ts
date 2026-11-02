import { FastifyPluginAsync } from 'fastify';
import { StorageService } from '@cogtics/utils';
import { nanoid } from 'nanoid';

export const uploadRoutes: FastifyPluginAsync = async (app) => {
    const storage = new StorageService();

    app.post('/upload', async (req, reply) => {
        // Check if multipart
        if (!req.isMultipart()) {
            return reply.code(400).send({ error: 'Request is not multipart' });
        }

        const data = await req.file();
        if (!data) {
            return reply.code(400).send({ error: 'No file uploaded' });
        }

        // Generate unique ID for this upload
        const uploadId = nanoid();

        // Construct storage key: uploads/{tenantId}/{year}/{month}/{uploadId}.csv
        // For now mocking tenantId since auth might store it differently per user
        const tenantId = (req as any).user?.tenantId || 'default-tenant';
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const key = `uploads/${tenantId}/${year}/${month}/${uploadId}.csv`;

        try {
            // Buffer the file first (streaming requires Content-Length which multipart doesn't provide)
            const buffer = await data.toBuffer();

            req.log.info({
                key,
                originalName: data.filename,
                mimetype: data.mimetype,
                uploadId,
                size: buffer.length
            }, 'Starting buffered upload to MinIO');

            // Upload buffer to MinIO
            await storage.uploadBuffer(key, buffer, data.mimetype || 'application/octet-stream', {
                originalName: data.filename,
                uploadId: uploadId,
            });

            // TODO: Create Upload record in DB (Phase 4.2)
            // TODO: Queue processing job (Phase 4.3)

            return reply.code(201).send({
                id: uploadId,
                key: key,
                status: 'PENDING',
                message: 'File uploaded successfully'
            });
        } catch (err) {
            req.log.error({ err }, 'Upload failed');
            return reply.code(500).send({ error: 'Upload failed' });
        }
    });
};
