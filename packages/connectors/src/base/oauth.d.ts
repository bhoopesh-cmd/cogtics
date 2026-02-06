import type { OAuthConfig } from '../types.js';
/**
 * Build OAuth authorization URL with query parameters
 */
export declare function buildAuthUrl(baseUrl: string, params: {
    clientId: string;
    redirectUri: string;
    responseType?: string;
    scope?: string;
    state?: string;
    [key: string]: string | undefined;
}): string;
/**
 * Parse OAuth callback parameters
 */
export declare function parseCallbackParams(callbackUrl: string): {
    code?: string;
    state?: string;
    error?: string;
    errorDescription?: string;
};
/**
 * Generate a random state parameter for OAuth
 */
export declare function generateState(): string;
/**
 * Validate OAuth config has required fields
 */
export declare function validateOAuthConfig(config: OAuthConfig): void;
//# sourceMappingURL=oauth.d.ts.map