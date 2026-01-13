import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { loadApiConfig, type ApiEnv } from '@cogtics/utils';

declare module 'fastify' {
  interface FastifyInstance {
    config: ApiEnv;
  }
}

const configPluginImpl: FastifyPluginAsync = async (fastify) => {
  const config = loadApiConfig();
  fastify.decorate('config', config);
};

export const configPlugin = fp(configPluginImpl, {
  name: 'config',
});

