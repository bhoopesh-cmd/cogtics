import type {
  Connector,
  ConnectorProvider,
  OAuthConfig,
  TokenResponse,
  Credentials,
  SchemaDefinition,
  SyncParams,
  RawBatch,
  HealthResult,
} from '../types.js';
import { buildAuthUrl, validateOAuthConfig } from '../base/oauth.js';
import { createHttpClient, RateLimitedHttpClient } from '../base/http.js';
import { discoverSalesforceSchema, getSalesforceDefaultObjects } from './schema.js';

// Salesforce OAuth URLs - production vs sandbox
const SALESFORCE_PROD_AUTH_URL = 'https://login.salesforce.com/services/oauth2/authorize';
const SALESFORCE_PROD_TOKEN_URL = 'https://login.salesforce.com/services/oauth2/token';
const SALESFORCE_SANDBOX_AUTH_URL = 'https://test.salesforce.com/services/oauth2/authorize';
const SALESFORCE_SANDBOX_TOKEN_URL = 'https://test.salesforce.com/services/oauth2/token';
const SALESFORCE_API_VERSION = 'v59.0';

function getAuthUrl(isSandbox: boolean): string {
  return isSandbox ? SALESFORCE_SANDBOX_AUTH_URL : SALESFORCE_PROD_AUTH_URL;
}

function getTokenUrl(isSandbox: boolean): string {
  return isSandbox ? SALESFORCE_SANDBOX_TOKEN_URL : SALESFORCE_PROD_TOKEN_URL;
}

export class SalesforceConnector implements Connector {
  readonly provider: ConnectorProvider = 'salesforce';
  private httpClient: RateLimitedHttpClient;

  constructor() {
    this.httpClient = createHttpClient({
      maxRetries: 5,
      baseDelayMs: 1000,
      maxDelayMs: 60000,
      respectRetryAfter: true,
    });
  }

  getAuthUrl(config: OAuthConfig): string {
    validateOAuthConfig(config);

    // Check if sandbox mode (via extra config or scopes containing 'sandbox')
    const isSandbox = config.isSandbox ?? false;
    const authBaseUrl = getAuthUrl(isSandbox);

    return buildAuthUrl(authBaseUrl, {
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      responseType: 'code',
      scope: config.scopes?.join(' ') ?? 'api refresh_token',
      state: config.state,
      codeChallenge: config.codeChallenge,
      codeChallengeMethod: config.codeChallengeMethod,
    });
  }

  async exchangeCode(code: string, config: OAuthConfig): Promise<TokenResponse> {
    validateOAuthConfig(config);

    const isSandbox = config.isSandbox ?? false;
    const tokenUrl = getTokenUrl(isSandbox);

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
    });
    if (config.codeVerifier) {
      params.set('code_verifier', config.codeVerifier);
    }

    const response = await this.httpClient.request<{
      access_token: string;
      refresh_token?: string;
      token_type: string;
      instance_url: string;
      id: string;
      issued_at: string;
      scope?: string;
    }>({
      method: 'POST',
      url: tokenUrl,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (response.status !== 200) {
      throw new Error(`Salesforce token exchange failed: ${JSON.stringify(response.data)}`);
    }

    // Extract user ID from the ID URL (e.g., https://login.salesforce.com/id/00Dxx0000000000/005xx0000000000)
    const idUrl = response.data.id;
    const idParts = idUrl.split('/');
    const userId = idParts[idParts.length - 1];

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      tokenType: response.data.token_type || 'Bearer',
      instanceUrl: response.data.instance_url,
      externalAccountId: userId,
      scopes: response.data.scope?.split(' '),
    };
  }

  async refreshToken(refreshToken: string, config: OAuthConfig): Promise<TokenResponse> {
    validateOAuthConfig(config);

    const isSandbox = config.isSandbox ?? false;
    const tokenUrl = getTokenUrl(isSandbox);

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });

    const response = await this.httpClient.request<{
      access_token: string;
      token_type: string;
      instance_url: string;
      id: string;
      issued_at: string;
      scope?: string;
    }>({
      method: 'POST',
      url: tokenUrl,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (response.status !== 200) {
      throw new Error(`Salesforce token refresh failed: ${JSON.stringify(response.data)}`);
    }

    const idUrl = response.data.id;
    const idParts = idUrl.split('/');
    const userId = idParts[idParts.length - 1];

    return {
      accessToken: response.data.access_token,
      refreshToken, // Salesforce doesn't return a new refresh token
      tokenType: response.data.token_type || 'Bearer',
      instanceUrl: response.data.instance_url,
      externalAccountId: userId,
      scopes: response.data.scope?.split(' '),
    };
  }

  async discoverSchema(credentials: Credentials): Promise<SchemaDefinition> {
    if (!credentials.instanceUrl) {
      throw new Error('Salesforce instanceUrl is required for schema discovery');
    }

    return discoverSalesforceSchema(
      credentials.instanceUrl,
      credentials.accessToken,
      SALESFORCE_API_VERSION,
      this.httpClient
    );
  }

  async *syncObject(params: SyncParams): AsyncGenerator<RawBatch, void, unknown> {
    const { objectType, cursor, fullSync, credentials, batchSize = 200 } = params;

    if (!credentials.instanceUrl) {
      throw new Error('Salesforce instanceUrl is required for sync');
    }

    const baseUrl = `${credentials.instanceUrl}/services/data/${SALESFORCE_API_VERSION}`;

    // Get default objects to find the incremental field
    const defaultObjects = getSalesforceDefaultObjects();
    const objectConfig = defaultObjects.find((obj) => obj.name === objectType);
    const incrementalField = objectConfig?.incrementalField ?? 'LastModifiedDate';

    // Build SOQL query
    let whereClause = '';
    if (!fullSync && cursor) {
      const cursorData = cursor as { since?: string };
      if (cursorData.since) {
        whereClause = ` WHERE ${incrementalField} > ${cursorData.since}`;
      }
    }

    // First, get the list of fields for this object
    const describeUrl = `${baseUrl}/sobjects/${objectType}/describe`;
    const describeResponse = await this.httpClient.request<{
      fields: Array<{ name: string; type: string }>;
    }>({
      method: 'GET',
      url: describeUrl,
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
      },
    });

    if (describeResponse.status !== 200) {
      throw new Error(`Salesforce describe failed: ${JSON.stringify(describeResponse.data)}`);
    }

    // Build field list (filter compound fields that can't be queried)
    const queryableFields = describeResponse.data.fields
      .filter((f) => !['address', 'location'].includes(f.type))
      .map((f) => f.name);

    const soql = `SELECT ${queryableFields.join(', ')} FROM ${objectType}${whereClause} ORDER BY ${incrementalField} ASC LIMIT ${batchSize}`;

    let queryUrl: string | null = `${baseUrl}/query?q=${encodeURIComponent(soql)}`;

    while (queryUrl) {
      const response = await this.httpClient.request<{
        totalSize: number;
        done: boolean;
        nextRecordsUrl?: string;
        records: Array<{ Id: string; LastModifiedDate?: string; [key: string]: unknown }>;
      }>({
        method: 'GET',
        url: queryUrl.startsWith('http') ? queryUrl : `${credentials.instanceUrl}${queryUrl}`,
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
        },
      });

      if (response.status !== 200) {
        throw new Error(`Salesforce query failed: ${JSON.stringify(response.data)}`);
      }

      const { records, done, nextRecordsUrl } = response.data;

      if (records.length === 0) {
        break;
      }

      // Find max LastModifiedDate for cursor
      let maxModified: string | undefined;
      for (const record of records) {
        const modified = record.LastModifiedDate;
        if (modified && (!maxModified || modified > maxModified)) {
          maxModified = modified;
        }
      }

      yield {
        objectType,
        records: records.map((record) => ({
          id: record.Id,
          data: record,
          updatedAt: record.LastModifiedDate ? new Date(record.LastModifiedDate) : undefined,
        })),
        cursor: { since: maxModified },
        hasMore: !done,
        fetchedAt: new Date(),
      };

      queryUrl = done ? null : (nextRecordsUrl ?? null);
    }
  }

  async healthCheck(credentials: Credentials): Promise<HealthResult> {
    if (!credentials.instanceUrl) {
      return {
        healthy: false,
        message: 'Missing instanceUrl',
        checkedAt: new Date(),
      };
    }

    // Use /services/data/ endpoint - simpler and doesn't require special permissions
    try {
      const response = await this.httpClient.request<any>({
        method: 'GET',
        url: `${credentials.instanceUrl}/services/data/`,
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
        },
      });

      if (response.status === 200) {
        return {
          healthy: true,
          checkedAt: new Date(),
          externalAccountId: credentials.externalAccountId,
          details: response.data,
        };
      }

      return {
        healthy: false,
        message: `Unexpected status: ${response.status}`,
        checkedAt: new Date(),
      };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        checkedAt: new Date(),
      };
    }
  }
}

