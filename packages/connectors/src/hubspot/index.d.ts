/**
 * HubSpot Connector
 *
 * OAuth 2.0 connector for HubSpot CRM.
 */
import type { Connector, OAuthConfig, TokenResponse, Credentials, SchemaDefinition, SyncParams, RawBatch, HealthResult } from '../types.js';
export declare class HubSpotConnector implements Connector {
    readonly provider: any;
    private httpClient;
    constructor();
    getAuthUrl(config: OAuthConfig): string;
    exchangeCode(code: string, config: OAuthConfig): Promise<TokenResponse>;
    refreshToken(refreshToken: string, config: OAuthConfig): Promise<TokenResponse>;
    discoverSchema(credentials: Credentials): Promise<SchemaDefinition>;
    syncObject(params: SyncParams): AsyncGenerator<RawBatch, void, unknown>;
    healthCheck(credentials: Credentials): Promise<HealthResult>;
    private mapObjectType;
    private searchWithFilter;
}
export declare const hubspotConnector: HubSpotConnector;
//# sourceMappingURL=index.d.ts.map