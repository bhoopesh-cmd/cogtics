import { FastifyPluginAsync } from 'fastify';
import { stripeWebhookRoutes } from './stripe.js';

/**
 * Webhook Routes
 * 
 * Handles incoming webhooks from external services.
 * These routes do NOT require authentication as they come from external services.
 */
export const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  // Stripe webhooks - POST /webhooks/stripe
  await fastify.register(stripeWebhookRoutes, { prefix: '/stripe' });
};

