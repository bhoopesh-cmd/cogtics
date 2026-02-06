import { validateOAuthConfig } from '../base/oauth.js';
import { createHttpClient } from '../base/http.js';
import { getQuickBooksSchema } from './schema.js';
// QuickBooks endpoints
const QB_AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2';
const QB_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const QB_API_BASE = 'https://quickbooks.api.intuit.com/v3/company';
const QB_SANDBOX_API_BASE = 'https://sandbox-quickbooks.api.intuit.com/v3/company';
// Default scopes
const DEFAULT_SCOPES = ['com.intuit.quickbooks.accounting'];
export class QuickBooksConnector {
    provider = 'quickbooks';
    httpClient;
    constructor() {
        // QuickBooks rate limit: 500 requests per minute
        this.httpClient = createHttpClient({
            maxRetries: 5,
            baseDelayMs: 500,
            maxDelayMs: 30000,
            respectRetryAfter: true,
        });
    }
    getAuthUrl(config) {
        validateOAuthConfig(config);
        const scopes = config.scopes ?? DEFAULT_SCOPES;
        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            response_type: 'code',
            scope: scopes.join(' '),
            state: config.state ?? '',
        });
        // PKCE support (Intuit recommends it)
        if (config.codeChallenge) {
            params.set('code_challenge', config.codeChallenge);
            params.set('code_challenge_method', config.codeChallengeMethod ?? 'S256');
        }
        return `${QB_AUTH_URL}?${params.toString()}`;
    }
    async exchangeCode(code, config) {
        validateOAuthConfig(config);
        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: config.redirectUri,
        });
        // Add code verifier for PKCE
        if (config.codeVerifier) {
            params.set('code_verifier', config.codeVerifier);
        }
        const authHeader = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
        const response = await this.httpClient.request({
            method: 'POST',
            url: QB_TOKEN_URL,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'Authorization': `Basic ${authHeader}`,
            },
            body: params.toString(),
        });
        if (response.status !== 200) {
            throw new Error(`QuickBooks token exchange failed: ${JSON.stringify(response.data)}`);
        }
        const expiresAt = new Date(Date.now() + response.data.expires_in * 1000);
        return {
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token,
            tokenType: response.data.token_type || 'bearer',
            expiresIn: response.data.expires_in,
            expiresAt,
        };
    }
    async refreshToken(refreshToken, config) {
        validateOAuthConfig(config);
        const params = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        });
        const authHeader = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
        const response = await this.httpClient.request({
            method: 'POST',
            url: QB_TOKEN_URL,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'Authorization': `Basic ${authHeader}`,
            },
            body: params.toString(),
        });
        if (response.status !== 200) {
            throw new Error(`QuickBooks token refresh failed: ${JSON.stringify(response.data)}`);
        }
        const expiresAt = new Date(Date.now() + response.data.expires_in * 1000);
        return {
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token,
            tokenType: response.data.token_type || 'bearer',
            expiresIn: response.data.expires_in,
            expiresAt,
        };
    }
    async discoverSchema(credentials) {
        await this.healthCheck(credentials);
        return getQuickBooksSchema();
    }
    async *syncObject(params) {
        const { objectType, credentials, cursor, fullSync, batchSize = 100 } = params;
        const realmId = credentials.externalAccountId;
        if (!realmId) {
            throw new Error('QuickBooks realm ID (company ID) is required');
        }
        const baseUrl = credentials.instanceUrl?.includes('sandbox')
            ? QB_SANDBOX_API_BASE
            : QB_API_BASE;
        let startPosition = cursor ? parseInt(cursor, 10) : 1;
        let hasMore = true;
        while (hasMore) {
            // QuickBooks uses SQL-like query language
            let query = `SELECT * FROM ${objectType} STARTPOSITION ${startPosition} MAXRESULTS ${batchSize}`;
            // Add filter for incremental sync
            if (!fullSync && cursor) {
                const lastModified = cursor;
                query = `SELECT * FROM ${objectType} WHERE MetaData.LastUpdatedTime > '${lastModified}' STARTPOSITION ${startPosition} MAXRESULTS ${batchSize}`;
            }
            const url = `${baseUrl}/${realmId}/query?query=${encodeURIComponent(query)}`;
            const response = await this.httpClient.request({
                method: 'GET',
                url,
                headers: {
                    Authorization: `Bearer ${credentials.accessToken}`,
                    Accept: 'application/json',
                },
            });
            if (response.status !== 200) {
                throw new Error(`QuickBooks query failed: ${JSON.stringify(response.data)}`);
            }
            const queryResponse = response.data.QueryResponse;
            const results = queryResponse[objectType] ?? [];
            const records = results.map((result) => ({
                id: String(result.Id),
                data: result,
                updatedAt: result.MetaData
                    ? new Date(result.MetaData.LastUpdatedTime)
                    : undefined,
            }));
            // Check if there are more results
            const returnedCount = results.length;
            hasMore = returnedCount >= batchSize;
            startPosition += returnedCount;
            yield {
                objectType,
                records,
                cursor: hasMore ? String(startPosition) : undefined,
                hasMore,
                fetchedAt: new Date(),
            };
        }
    }
    async healthCheck(credentials) {
        try {
            const realmId = credentials.externalAccountId;
            if (!realmId) {
                return {
                    healthy: false,
                    message: 'QuickBooks realm ID (company ID) is required',
                    checkedAt: new Date(),
                };
            }
            const baseUrl = credentials.instanceUrl?.includes('sandbox')
                ? QB_SANDBOX_API_BASE
                : QB_API_BASE;
            const response = await this.httpClient.request({
                method: 'GET',
                url: `${baseUrl}/${realmId}/companyinfo/${realmId}`,
                headers: {
                    Authorization: `Bearer ${credentials.accessToken}`,
                    Accept: 'application/json',
                },
            });
            if (response.status === 200) {
                return {
                    healthy: true,
                    message: 'Connected to QuickBooks',
                    checkedAt: new Date(),
                    externalAccountId: realmId,
                    details: {
                        companyName: response.data.CompanyInfo?.CompanyName,
                        country: response.data.CompanyInfo?.Country,
                    },
                };
            }
            return {
                healthy: false,
                message: `QuickBooks returned status ${response.status}`,
                checkedAt: new Date(),
            };
        }
        catch (error) {
            return {
                healthy: false,
                message: error instanceof Error ? error.message : 'Unknown error',
                checkedAt: new Date(),
            };
        }
    }
}
export const quickbooksConnector = new QuickBooksConnector();
//# sourceMappingURL=index.js.map