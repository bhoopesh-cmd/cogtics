import { FastifyPluginAsync } from 'fastify';
import crypto from 'crypto';

/**
 * Stripe Webhook Handler
 * 
 * In development, use Stripe CLI to forward webhooks:
 *   stripe listen --forward-to localhost:3000/webhooks/stripe
 * 
 * The CLI will output a webhook signing secret (whsec_...) that you should
 * set as STRIPE_WEBHOOK_SECRET in your .env file.
 */
export const stripeWebhookRoutes: FastifyPluginAsync = async (fastify) => {
  // Stripe webhooks must receive raw body for signature verification
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req, body, done) => {
      done(null, body);
    }
  );

  /**
   * Stripe Webhook Endpoint
   * 
   * Receives webhook events from Stripe (or Stripe CLI in development).
   * Verifies the webhook signature and processes the event.
   */
  fastify.post<{
    Headers: { 'stripe-signature'?: string };
    Body: Buffer;
  }>('/', async (request, reply) => {
    const webhookSecret = fastify.config.STRIPE_WEBHOOK_SECRET;
    
    // If no webhook secret is configured, accept all events (development only)
    if (!webhookSecret && fastify.config.NODE_ENV !== 'development') {
      request.log.error('STRIPE_WEBHOOK_SECRET not configured');
      return reply.status(500).send({ error: 'Webhook not configured' });
    }

    const signature = request.headers['stripe-signature'];
    const rawBody = request.body;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      try {
        verifyStripeSignature(rawBody, signature, webhookSecret);
      } catch (error) {
        request.log.warn({ error }, 'Stripe webhook signature verification failed');
        return reply.status(400).send({ error: 'Invalid signature' });
      }
    } else if (fastify.config.NODE_ENV !== 'development') {
      return reply.status(400).send({ error: 'Missing signature' });
    }

    // Parse the event
    let event: StripeEvent;
    try {
      event = JSON.parse(rawBody.toString());
    } catch (error) {
      return reply.status(400).send({ error: 'Invalid JSON' });
    }

    request.log.info({ 
      eventId: event.id, 
      eventType: event.type,
    }, 'Received Stripe webhook event');

    // Process the event based on type
    try {
      await processStripeEvent(event, fastify, request);
      return { received: true, eventId: event.id };
    } catch (error) {
      request.log.error({ error, eventId: event.id }, 'Failed to process Stripe webhook');
      // Still return 200 to prevent Stripe from retrying
      // Log the error for investigation
      return { received: true, eventId: event.id, error: 'Processing failed' };
    }
  });
};

/**
 * Verify Stripe webhook signature
 * @see https://stripe.com/docs/webhooks/signatures
 */
function verifyStripeSignature(
  payload: Buffer,
  signature: string,
  secret: string,
  tolerance: number = 300 // 5 minutes
): void {
  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.slice(2);
  const v1Signature = parts.find(p => p.startsWith('v1='))?.slice(3);

  if (!timestamp || !v1Signature) {
    throw new Error('Invalid signature format');
  }

  // Check timestamp tolerance
  const currentTime = Math.floor(Date.now() / 1000);
  const eventTime = parseInt(timestamp, 10);
  
  if (Math.abs(currentTime - eventTime) > tolerance) {
    throw new Error('Timestamp outside tolerance');
  }

  // Compute expected signature
  const signedPayload = `${timestamp}.${payload.toString()}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  // Constant-time comparison
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(v1Signature);

  if (expectedBuffer.length !== receivedBuffer.length) {
    throw new Error('Signature mismatch');
  }

  if (!crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
    throw new Error('Signature mismatch');
  }
}

/**
 * Process Stripe webhook events
 */
async function processStripeEvent(
  event: StripeEvent,
  fastify: any,
  request: any
): Promise<void> {
  // Route to appropriate handler based on event type
  switch (event.type) {
    // Customer events
    case 'customer.created':
    case 'customer.updated':
    case 'customer.deleted':
      request.log.info({ customerId: event.data.object.id }, `Customer event: ${event.type}`);
      // In a full implementation, you might queue a sync job here
      break;

    // Subscription events
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      request.log.info({ subscriptionId: event.data.object.id }, `Subscription event: ${event.type}`);
      break;

    // Invoice events
    case 'invoice.created':
    case 'invoice.paid':
    case 'invoice.payment_failed':
    case 'invoice.finalized':
      request.log.info({ invoiceId: event.data.object.id }, `Invoice event: ${event.type}`);
      break;

    // Payment events
    case 'payment_intent.succeeded':
    case 'payment_intent.payment_failed':
    case 'charge.succeeded':
    case 'charge.refunded':
      request.log.info({ paymentId: event.data.object.id }, `Payment event: ${event.type}`);
      break;

    // Product/Price events
    case 'product.created':
    case 'product.updated':
    case 'price.created':
    case 'price.updated':
      request.log.info({ objectId: event.data.object.id }, `Catalog event: ${event.type}`);
      break;

    default:
      request.log.debug({ eventType: event.type }, 'Unhandled Stripe event type');
  }

  // Store webhook event for audit/debugging (optional)
  // await fastify.db.insertInto('webhook_events').values({ ... }).execute();
}

/**
 * Stripe Event Types
 */
interface StripeEvent {
  id: string;
  type: string;
  api_version: string;
  created: number;
  data: {
    object: {
      id: string;
      [key: string]: unknown;
    };
    previous_attributes?: Record<string, unknown>;
  };
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id: string | null;
    idempotency_key: string | null;
  } | null;
}

