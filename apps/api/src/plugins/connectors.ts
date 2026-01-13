import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { 
  initializeConnectors, 
  initializeEncryptor, 
  getConnector,
  encryptToken,
  decryptToken,
  type Connector,
  type ConnectorProvider,
} from '@cogtics/connectors';

declare module 'fastify' {
  interface FastifyInstance {
    connectors: {
      get: (provider: ConnectorProvider) => Connector;
      encryptToken: (token: string) => Promise<string>;
      decryptToken: (encryptedToken: string) => Promise<string>;
    };
  }
}

const connectorsPluginImpl: FastifyPluginAsync = async (fastify) => {
  const config = fastify.config;

  // Initialize encryption
  if (config.TOKEN_ENCRYPTION_KEY) {
    initializeEncryptor({
      mode: config.TOKEN_ENCRYPTION_MODE,
      key: config.TOKEN_ENCRYPTION_KEY,
    });
  } else {
    fastify.log.warn('TOKEN_ENCRYPTION_KEY not set - connector OAuth will not work');
  }

  // Initialize connectors
  await initializeConnectors({
    stripe: config.STRIPE_CLIENT_ID && config.STRIPE_CLIENT_SECRET
      ? {
          clientId: config.STRIPE_CLIENT_ID,
          clientSecret: config.STRIPE_CLIENT_SECRET,
        }
      : undefined,
    salesforce: config.SALESFORCE_CLIENT_ID && config.SALESFORCE_CLIENT_SECRET
      ? {
          clientId: config.SALESFORCE_CLIENT_ID,
          clientSecret: config.SALESFORCE_CLIENT_SECRET,
          redirectUri: config.SALESFORCE_REDIRECT_URI ?? '',
        }
      : undefined,
    encryption: {
      mode: config.TOKEN_ENCRYPTION_MODE,
      key: config.TOKEN_ENCRYPTION_KEY,
    },
  });

  fastify.decorate('connectors', {
    get: getConnector,
    encryptToken,
    decryptToken,
  });

  fastify.log.info('Connectors plugin initialized');
};

export const connectorsPlugin = fp(connectorsPluginImpl, {
  name: 'connectors',
  dependencies: ['config', 'db'],
});

