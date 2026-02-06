import { type ApiEnv, type WorkerEnv } from '@cogtics/schemas';
/**
 * Load and validate API environment configuration.
 * Caches the result for subsequent calls.
 */
export declare function loadApiConfig(): ApiEnv;
/**
 * Load and validate Worker environment configuration.
 * Caches the result for subsequent calls.
 */
export declare function loadWorkerConfig(): WorkerEnv;
/**
 * Reset cached configs (useful for testing)
 */
export declare function resetConfigCache(): void;
export type { ApiEnv, WorkerEnv };
//# sourceMappingURL=config.d.ts.map