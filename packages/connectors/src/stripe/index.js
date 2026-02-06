import { buildAuthUrl, validateOAuthConfig } from '../base/oauth.js';
import { createHttpClient } from '../base/http.js';
import { getStripeSchema } from './schema.js';
const STRIPE_AUTHORIZE_URL = 'https://connect.stripe.com/oauth/authorize';
const STRIPE_TOKEN_URL = 'https://connect.stripe.com/oauth/token';
const STRIPE_API_BASE = 'https://api.stripe.com/v1';
export class StripeConnector {
    provider = 'stripe';
    httpClient;
    constructor() {
        this.httpClient = createHttpClient({
            maxRetries: 5,
            baseDelayMs: 1000,
            maxDelayMs: 60000,
            respectRetryAfter: true,
        });
    }
    getAuthUrl(config) {
        validateOAuthConfig(config);
        return buildAuthUrl(STRIPE_AUTHORIZE_URL, {
            clientId: config.clientId,
            redirectUri: config.redirectUri,
            responseType: 'code',
            scope: 'read_only',
            state: config.state,
        });
    }
    async exchangeCode(code, config) {
        validateOAuthConfig(config);
        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_secret: config.clientSecret,
        });
        const response = await this.httpClient.request({
            method: 'POST',
            url: STRIPE_TOKEN_URL,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });
        if (response.status !== 200) {
            throw new Error(`Stripe token exchange failed: ${JSON.stringify(response.data)}`);
        }
        return {
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token,
            tokenType: response.data.token_type || 'bearer',
            scopes: response.data.scope?.split(' '),
            externalAccountId: response.data.stripe_user_id,
        };
    }
    async refreshToken(refreshToken, config) {
        validateOAuthConfig(config);
        const params = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_secret: config.clientSecret,
        });
        const response = await this.httpClient.request({
            method: 'POST',
            url: STRIPE_TOKEN_URL,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });
        if (response.status !== 200) {
            throw new Error(`Stripe token refresh failed: ${JSON.stringify(response.data)}`);
        }
        return {
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token ?? refreshToken,
            tokenType: response.data.token_type || 'bearer',
            scopes: response.data.scope?.split(' '),
            externalAccountId: response.data.stripe_user_id,
        };
    }
    async discoverSchema(_credentials) {
        // Stripe schema is static - we don't need to call the API
        return getStripeSchema();
    }
    async *syncObject(params) {
        const { objectType, cursor, fullSync, credentials, batchSize = 100 } = params;
        // Build endpoint URL
        const endpoint = this.getEndpointForObject(objectType);
        if (!endpoint) {
            throw new Error(`Unknown Stripe object type: ${objectType}`);
        }
        let startingAfter;
        let createdGte;
        // Parse cursor
        if (!fullSync && cursor) {
            const cursorData = cursor;
            startingAfter = cursorData.lastId;
            createdGte = cursorData.since;
        }
        let hasMore = true;
        while (hasMore) {
            const queryParams = new URLSearchParams({
                limit: batchSize.toString(),
            });
            if (startingAfter) {
                queryParams.set('starting_after', startingAfter);
            }
            if (createdGte && !fullSync) {
                queryParams.set('created[gte]', createdGte.toString());
            }
            const url = `${STRIPE_API_BASE}/${endpoint}?${queryParams.toString()}`;
            const response = await this.httpClient.request({
                method: 'GET',
                url,
                headers: {
                    Authorization: `Bearer ${credentials.accessToken}`,
                },
            });
            if (response.status !== 200) {
                throw new Error(`Stripe API error: ${JSON.stringify(response.data)}`);
            }
            const { data, has_more } = response.data;
            if (data.length === 0) {
                break;
            }
            // Update cursor for next page
            const lastRecord = data[data.length - 1];
            startingAfter = lastRecord.id;
            // Find max created timestamp for incremental cursor
            let maxCreated = createdGte ?? 0;
            for (const record of data) {
                const created = record.created ?? 0;
                if (created > maxCreated) {
                    maxCreated = created;
                }
            }
            yield {
                objectType,
                records: data.map((record) => ({
                    id: record.id,
                    data: record,
                    updatedAt: record.created ? new Date(record.created * 1000) : undefined,
                })),
                cursor: { lastId: lastRecord.id, since: maxCreated },
                hasMore: has_more,
                fetchedAt: new Date(),
            };
            hasMore = has_more;
        }
    }
    async healthCheck(credentials) {
        try {
            const response = await this.httpClient.request({
                method: 'GET',
                url: `${STRIPE_API_BASE}/account`,
                headers: {
                    Authorization: `Bearer ${credentials.accessToken}`,
                },
            });
            if (response.status === 200) {
                return {
                    healthy: true,
                    checkedAt: new Date(),
                    externalAccountId: response.data.id,
                };
            }
            return {
                healthy: false,
                message: `Unexpected status: ${response.status}`,
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
    getEndpointForObject(objectType) {
        const endpoints = {
            customers: 'customers',
            subscriptions: 'subscriptions',
            invoices: 'invoices',
            invoice_items: 'invoiceitems',
            charges: 'charges',
            refunds: 'refunds',
            products: 'products',
            prices: 'prices',
            payment_intents: 'payment_intents',
            payment_methods: 'payment_methods',
        };
        return endpoints[objectType] ?? null;
    }
}
//# sourceMappingURL=index.js.map