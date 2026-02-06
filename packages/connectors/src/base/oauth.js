/**
 * Build OAuth authorization URL with query parameters
 */
export function buildAuthUrl(baseUrl, params) {
    const url = new URL(baseUrl);
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
            // Convert camelCase to snake_case for OAuth params
            const paramKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            url.searchParams.set(paramKey, value);
        }
    }
    return url.toString();
}
/**
 * Parse OAuth callback parameters
 */
export function parseCallbackParams(callbackUrl) {
    const url = new URL(callbackUrl);
    return {
        code: url.searchParams.get('code') ?? undefined,
        state: url.searchParams.get('state') ?? undefined,
        error: url.searchParams.get('error') ?? undefined,
        errorDescription: url.searchParams.get('error_description') ?? undefined,
    };
}
/**
 * Generate a random state parameter for OAuth
 */
export function generateState() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}
/**
 * Validate OAuth config has required fields
 */
export function validateOAuthConfig(config) {
    if (!config.clientId) {
        throw new Error('OAuth config missing clientId');
    }
    if (!config.clientSecret) {
        throw new Error('OAuth config missing clientSecret');
    }
    if (!config.redirectUri) {
        throw new Error('OAuth config missing redirectUri');
    }
}
//# sourceMappingURL=oauth.js.map