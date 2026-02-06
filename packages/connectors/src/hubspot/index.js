import { buildAuthUrl, validateOAuthConfig } from '../base/oauth.js';
import { createHttpClient } from '../base/http.js';
import { getHubSpotSchema, HUBSPOT_PROPERTIES } from './schema.js';
const HUBSPOT_AUTH_URL = 'https://app.hubspot.com/oauth/authorize';
const HUBSPOT_TOKEN_URL = 'https://api.hubapi.com/oauth/v1/token';
const HUBSPOT_API_BASE = 'https://api.hubapi.com';
// Default scopes for HubSpot OAuth
const DEFAULT_SCOPES = [
    'crm.objects.companies.read',
    'crm.objects.contacts.read',
    'crm.objects.deals.read',
    'crm.objects.line_items.read',
    'crm.schemas.deals.read',
    'crm.schemas.contacts.read',
    'crm.schemas.companies.read',
];
export class HubSpotConnector {
    provider = 'hubspot';
    httpClient;
    constructor() {
        // HubSpot rate limit: 100 requests per 10 seconds
        this.httpClient = createHttpClient({
            maxRetries: 5,
            baseDelayMs: 1000,
            maxDelayMs: 30000,
            respectRetryAfter: true,
        });
    }
    getAuthUrl(config) {
        validateOAuthConfig(config);
        const scopes = config.scopes ?? DEFAULT_SCOPES;
        return buildAuthUrl(HUBSPOT_AUTH_URL, {
            clientId: config.clientId,
            redirectUri: config.redirectUri,
            responseType: 'code',
            scope: scopes.join(' '),
            state: config.state,
        });
    }
    async exchangeCode(code, config) {
        validateOAuthConfig(config);
        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: config.clientId,
            client_secret: config.clientSecret,
            redirect_uri: config.redirectUri,
            code,
        });
        const response = await this.httpClient.request({
            method: 'POST',
            url: HUBSPOT_TOKEN_URL,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });
        if (response.status !== 200) {
            throw new Error(`HubSpot token exchange failed: ${JSON.stringify(response.data)}`);
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
            client_id: config.clientId,
            client_secret: config.clientSecret,
            refresh_token: refreshToken,
        });
        const response = await this.httpClient.request({
            method: 'POST',
            url: HUBSPOT_TOKEN_URL,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });
        if (response.status !== 200) {
            throw new Error(`HubSpot token refresh failed: ${JSON.stringify(response.data)}`);
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
        // Verify credentials are valid by making a test request
        await this.healthCheck(credentials);
        return getHubSpotSchema();
    }
    async *syncObject(params) {
        const { objectType, credentials, cursor, fullSync, batchSize = 100 } = params;
        // Map object type to HubSpot endpoint
        const objectName = this.mapObjectType(objectType);
        const properties = HUBSPOT_PROPERTIES[objectName] ?? [];
        let after = cursor;
        let hasMore = true;
        while (hasMore) {
            const url = new URL(`${HUBSPOT_API_BASE}/crm/v3/objects/${objectName}`);
            url.searchParams.set('limit', String(Math.min(batchSize, 100)));
            url.searchParams.set('properties', properties.join(','));
            if (after) {
                url.searchParams.set('after', after);
            }
            // For incremental sync, filter by last modified date
            if (!fullSync && cursor) {
                // HubSpot uses search API for filtering
                const searchResult = await this.searchWithFilter(objectName, properties, cursor, batchSize, credentials);
                yield searchResult;
                return;
            }
            const response = await this.httpClient.request({
                method: 'GET',
                url: url.toString(),
                headers: {
                    Authorization: `Bearer ${credentials.accessToken}`,
                },
            });
            if (response.status !== 200) {
                throw new Error(`HubSpot sync failed: ${JSON.stringify(response.data)}`);
            }
            const records = response.data.results.map((result) => ({
                id: result.id,
                data: result.properties,
                updatedAt: result.updatedAt ? new Date(result.updatedAt) : undefined,
            }));
            after = response.data.paging?.next?.after;
            hasMore = !!after;
            yield {
                objectType,
                records,
                cursor: after,
                hasMore,
                fetchedAt: new Date(),
            };
        }
    }
    async healthCheck(credentials) {
        try {
            const response = await this.httpClient.request({
                method: 'GET',
                url: `${HUBSPOT_API_BASE}/account-info/v3/details`,
                headers: {
                    Authorization: `Bearer ${credentials.accessToken}`,
                },
            });
            if (response.status === 200) {
                return {
                    healthy: true,
                    message: 'Connected to HubSpot',
                    checkedAt: new Date(),
                    externalAccountId: String(response.data.portalId),
                    details: {
                        timeZone: response.data.timeZone,
                        currency: response.data.companyCurrency,
                    },
                };
            }
            return {
                healthy: false,
                message: `HubSpot returned status ${response.status}`,
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
    mapObjectType(objectType) {
        // HubSpot uses singular names for some objects
        const mapping = {
            companies: 'companies',
            contacts: 'contacts',
            deals: 'deals',
            line_items: 'line_items',
            products: 'products',
            owners: 'owners',
        };
        return mapping[objectType] ?? objectType;
    }
    async searchWithFilter(objectName, properties, lastModified, batchSize, credentials) {
        const url = `${HUBSPOT_API_BASE}/crm/v3/objects/${objectName}/search`;
        const response = await this.httpClient.request({
            method: 'POST',
            url,
            headers: {
                Authorization: `Bearer ${credentials.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filterGroups: [
                    {
                        filters: [
                            {
                                propertyName: 'hs_lastmodifieddate',
                                operator: 'GTE',
                                value: lastModified,
                            },
                        ],
                    },
                ],
                properties,
                limit: batchSize,
            }),
        });
        if (response.status !== 200) {
            throw new Error(`HubSpot search failed: ${JSON.stringify(response.data)}`);
        }
        const records = response.data.results.map((result) => ({
            id: result.id,
            data: result.properties,
            updatedAt: result.updatedAt ? new Date(result.updatedAt) : undefined,
        }));
        return {
            objectType: objectName,
            records,
            cursor: response.data.paging?.next?.after,
            hasMore: !!response.data.paging?.next?.after,
            fetchedAt: new Date(),
        };
    }
}
export const hubspotConnector = new HubSpotConnector();
//# sourceMappingURL=index.js.map