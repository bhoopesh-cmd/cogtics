import { z } from 'zod';

// Shared environment schema
const BaseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  DATABASE_URL: z.string().url().startsWith('postgresql://'),
  REDIS_URL: z.string().url().startsWith('redis://'),
});

// API-specific environment schema
export const ApiEnvSchema = BaseEnvSchema.extend({
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_HOST: z.string().default('0.0.0.0'),
  
  // Frontend URL (for OAuth redirects in development)
  FRONTEND_URL: z.string().url().optional(),
  
  // Auth configuration
  AUTH_MODE: z.enum(['dev', 'jwt']).default('dev'),
  DEV_USER_ID: z.string().optional(),
  DEV_TENANT_ID: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  
  // S3/MinIO configuration
  S3_ENDPOINT: z.string().url(),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_REGION: z.string().default('us-east-1'),

  // Token encryption (Phase 1)
  TOKEN_ENCRYPTION_KEY: z.string().optional(),
  TOKEN_ENCRYPTION_MODE: z.enum(['local', 'kms']).default('local'),

  // Stripe Configuration (Phase 1)
  // For standard Stripe API access (recommended)
  STRIPE_SECRET_KEY: z.string().optional(),
  // For Stripe CLI webhook forwarding in development
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  // For Stripe Connect OAuth (only if connecting to other Stripe accounts)
  STRIPE_CLIENT_ID: z.string().optional(),
  STRIPE_CLIENT_SECRET: z.string().optional(),

  // Salesforce OAuth (Phase 1)
  SALESFORCE_CLIENT_ID: z.string().optional(),
  SALESFORCE_CLIENT_SECRET: z.string().optional(),
  SALESFORCE_REDIRECT_URI: z.string().url().optional(),
  // Set to 'true' for sandbox orgs (uses test.salesforce.com)
  SALESFORCE_IS_SANDBOX: z.string().optional().transform(v => v === 'true'),
});

// Worker-specific environment schema
export const WorkerEnvSchema = BaseEnvSchema.extend({
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(100).default(5),
  
  // S3/MinIO configuration
  S3_ENDPOINT: z.string().url(),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_REGION: z.string().default('us-east-1'),

  // Token encryption (Phase 1)
  TOKEN_ENCRYPTION_KEY: z.string().optional(),
  TOKEN_ENCRYPTION_MODE: z.enum(['local', 'kms']).default('local'),
});

// Type exports
export type ApiEnv = z.infer<typeof ApiEnvSchema>;
export type WorkerEnv = z.infer<typeof WorkerEnvSchema>;

// Validation helper with formatted errors
export function parseEnv<T extends z.ZodSchema>(schema: T, env: NodeJS.ProcessEnv): z.infer<T> {
  const result = schema.safeParse(env);
  
  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    
    throw new Error(`Environment validation failed:\n${errors}`);
  }
  
  return result.data;
}

