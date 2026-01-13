/**
 * DocuSign Connector
 * 
 * OAuth 2.0 connector for DocuSign eSignature.
 */
import type {
  Connector,
  OAuthConfig,
  TokenResponse,
  Credentials,
  SchemaDefinition,
  SyncParams,
  RawBatch,
  HealthResult,
} from '../types.js';
import { validateOAuthConfig } from '../base/oauth.js';
import { createHttpClient, RateLimitedHttpClient } from '../base/http.js';
import { getDocuSignSchema } from './schema.js';

// DocuSign endpoints
const DS_AUTH_URL = 'https://account.docusign.com/oauth/auth';
const DS_TOKEN_URL = 'https://account.docusign.com/oauth/token';
const DS_USER_INFO_URL = 'https://account.docusign.com/oauth/userinfo';

// Default scopes
const DEFAULT_SCOPES = ['signature', 'extended'];

export class DocuSignConnector implements Connector {
  readonly provider = 'docusign' as any;
  private httpClient: RateLimitedHttpClient;

  constructor() {
    // DocuSign rate limit: 1000 requests per hour per user
    this.httpClient = createHttpClient({
      maxRetries: 5,
      baseDelayMs: 1000,
      maxDelayMs: 60000,
      respectRetryAfter: true,
    });
  }

  getAuthUrl(config: OAuthConfig): string {
    validateOAuthConfig(config);

    const scopes = config.scopes ?? DEFAULT_SCOPES;
    const params = new URLSearchParams({
      response_type: 'code',
      scope: scopes.join(' '),
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      state: config.state ?? '',
    });

    return `${DS_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string, config: OAuthConfig): Promise<TokenResponse> {
    validateOAuthConfig(config);

    const authHeader = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
    });

    const response = await this.httpClient.request<{
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
    }>({
      method: 'POST',
      url: DS_TOKEN_URL,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`,
      },
      body: params.toString(),
    });

    if (response.status !== 200) {
      throw new Error(`DocuSign token exchange failed: ${JSON.stringify(response.data)}`);
    }

    // Get user info to find account ID and base URI
    const userInfo = await this.getUserInfo(response.data.access_token);
    const expiresAt = new Date(Date.now() + response.data.expires_in * 1000);

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      tokenType: response.data.token_type || 'Bearer',
      expiresIn: response.data.expires_in,
      expiresAt,
      externalAccountId: userInfo.accountId,
      instanceUrl: userInfo.baseUri,
    };
  }

  async refreshToken(refreshToken: string, config: OAuthConfig): Promise<TokenResponse> {
    validateOAuthConfig(config);

    const authHeader = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const response = await this.httpClient.request<{
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
    }>({
      method: 'POST',
      url: DS_TOKEN_URL,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`,
      },
      body: params.toString(),
    });

    if (response.status !== 200) {
      throw new Error(`DocuSign token refresh failed: ${JSON.stringify(response.data)}`);
    }

    const expiresAt = new Date(Date.now() + response.data.expires_in * 1000);

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      tokenType: response.data.token_type || 'Bearer',
      expiresIn: response.data.expires_in,
      expiresAt,
    };
  }

  async discoverSchema(credentials: Credentials): Promise<SchemaDefinition> {
    await this.healthCheck(credentials);
    return getDocuSignSchema();
  }

  async *syncObject(params: SyncParams): AsyncGenerator<RawBatch, void, unknown> {
    const { objectType, credentials, cursor, fullSync, batchSize = 100 } = params;

    if (!credentials.instanceUrl || !credentials.externalAccountId) {
      throw new Error('DocuSign base URI and account ID are required');
    }

    // Only envelopes support listing
    if (objectType !== 'envelopes') {
      // Documents and recipients are fetched per envelope
      return;
    }

    let startPosition = cursor ? parseInt(cursor as string, 10) : 0;
    let hasMore = true;

    while (hasMore) {
      const url = new URL(`${credentials.instanceUrl}/restapi/v2.1/accounts/${credentials.externalAccountId}/envelopes`);
      url.searchParams.set('count', String(batchSize));
      url.searchParams.set('start_position', String(startPosition));
      url.searchParams.set('include', 'recipients,documents');
      
      // For incremental sync, filter by date
      if (!fullSync && cursor) {
        // cursor format: ISO date string for incremental
        const fromDate = new Date(cursor as string);
        url.searchParams.set('from_date', fromDate.toISOString());
      } else {
        // Default to last 30 days for full sync
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 30);
        url.searchParams.set('from_date', fromDate.toISOString());
      }

      const response = await this.httpClient.request<{
        envelopes?: Array<Record<string, unknown>>;
        resultSetSize?: string;
        totalSetSize?: string;
        startPosition?: string;
        endPosition?: string;
        nextUri?: string;
      }>({
        method: 'GET',
        url: url.toString(),
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          Accept: 'application/json',
        },
      });

      if (response.status !== 200) {
        throw new Error(`DocuSign envelopes fetch failed: ${JSON.stringify(response.data)}`);
      }

      const envelopes = response.data.envelopes ?? [];
      const records = envelopes.map((envelope) => ({
        id: String(envelope.envelopeId),
        data: envelope,
        updatedAt: envelope.statusChangedDateTime 
          ? new Date(envelope.statusChangedDateTime as string) 
          : undefined,
      }));

      hasMore = !!response.data.nextUri;
      if (hasMore && response.data.endPosition) {
        startPosition = parseInt(response.data.endPosition, 10) + 1;
      }

      yield {
        objectType,
        records,
        cursor: hasMore ? String(startPosition) : undefined,
        hasMore,
        fetchedAt: new Date(),
      };
    }
  }

  async healthCheck(credentials: Credentials): Promise<HealthResult> {
    try {
      if (!credentials.instanceUrl || !credentials.externalAccountId) {
        return {
          healthy: false,
          message: 'DocuSign base URI and account ID are required',
          checkedAt: new Date(),
        };
      }

      const url = `${credentials.instanceUrl}/restapi/v2.1/accounts/${credentials.externalAccountId}`;
      
      const response = await this.httpClient.request<{
        accountId: string;
        accountName: string;
        planName?: string;
      }>({
        method: 'GET',
        url,
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          Accept: 'application/json',
        },
      });

      if (response.status === 200) {
        return {
          healthy: true,
          message: 'Connected to DocuSign',
          checkedAt: new Date(),
          externalAccountId: response.data.accountId,
          details: {
            accountName: response.data.accountName,
            plan: response.data.planName,
          },
        };
      }

      return {
        healthy: false,
        message: `DocuSign returned status ${response.status}`,
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

  private async getUserInfo(accessToken: string): Promise<{ accountId: string; baseUri: string }> {
    const response = await this.httpClient.request<{
      accounts: Array<{
        account_id: string;
        is_default: boolean;
        account_name: string;
        base_uri: string;
      }>;
    }>({
      method: 'GET',
      url: DS_USER_INFO_URL,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status !== 200 || !response.data.accounts?.length) {
      throw new Error('Failed to get DocuSign user info');
    }

    // Use default account or first account
    const account = response.data.accounts.find(a => a.is_default) ?? response.data.accounts[0];
    
    return {
      accountId: account.account_id,
      baseUri: account.base_uri,
    };
  }
}

export const docusignConnector = new DocuSignConnector();
