import { parseEnv, ApiEnvSchema, WorkerEnvSchema, type ApiEnv, type WorkerEnv } from '@cogtics/schemas';

let cachedApiConfig: ApiEnv | null = null;
let cachedWorkerConfig: WorkerEnv | null = null;

/**
 * Load and validate API environment configuration.
 * Caches the result for subsequent calls.
 */
export function loadApiConfig(): ApiEnv {
  if (cachedApiConfig) {
    return cachedApiConfig;
  }
  
  cachedApiConfig = parseEnv(ApiEnvSchema, process.env);
  return cachedApiConfig;
}

/**
 * Load and validate Worker environment configuration.
 * Caches the result for subsequent calls.
 */
export function loadWorkerConfig(): WorkerEnv {
  if (cachedWorkerConfig) {
    return cachedWorkerConfig;
  }
  
  cachedWorkerConfig = parseEnv(WorkerEnvSchema, process.env);
  return cachedWorkerConfig;
}

/**
 * Reset cached configs (useful for testing)
 */
export function resetConfigCache(): void {
  cachedApiConfig = null;
  cachedWorkerConfig = null;
}

// Re-export types for convenience
export type { ApiEnv, WorkerEnv };

