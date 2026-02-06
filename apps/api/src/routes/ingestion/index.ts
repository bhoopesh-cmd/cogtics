import { FastifyPluginAsync } from 'fastify';
import { uploadRoutes } from './upload.js';

export const ingestionRoutes: FastifyPluginAsync = async (app) => {
  await app.register(uploadRoutes);
};
