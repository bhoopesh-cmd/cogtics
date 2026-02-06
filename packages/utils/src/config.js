import { parseEnv, ApiEnvSchema, WorkerEnvSchema } from '@cogtics/schemas';
let cachedApiConfig = null;
let cachedWorkerConfig = null;
/**
 * Load and validate API environment configuration.
 * Caches the result for subsequent calls.
 */
export function loadApiConfig() {
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
export function loadWorkerConfig() {
    if (cachedWorkerConfig) {
        return cachedWorkerConfig;
    }
    cachedWorkerConfig = parseEnv(WorkerEnvSchema, process.env);
    return cachedWorkerConfig;
}
/**
 * Reset cached configs (useful for testing)
 */
export function resetConfigCache() {
    cachedApiConfig = null;
    cachedWorkerConfig = null;
}
//# sourceMappingURL=config.js.map