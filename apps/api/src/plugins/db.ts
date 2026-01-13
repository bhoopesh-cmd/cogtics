import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { getDatabase, closeDatabase, type Database } from '@cogtics/db';
import type { Kysely } from 'kysely';

declare module 'fastify' {
  interface FastifyInstance {
    db: Kysely<Database>;
  }
}

const dbPluginImpl: FastifyPluginAsync = async (fastify) => {
  const db = getDatabase({
    connectionString: fastify.config.DATABASE_URL,
  });

  fastify.decorate('db', db);

  fastify.addHook('onClose', async () => {
    await closeDatabase();
  });
};

export const dbPlugin = fp(dbPluginImpl, {
  name: 'db',
  dependencies: ['config'],
});

