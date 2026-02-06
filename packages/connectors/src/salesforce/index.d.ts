import type { Connector, ConnectorProvider, OAuthConfig, TokenResponse, Credentials, SchemaDefinition, SyncParams, RawBatch, HealthResult } from '../types.js';
export declare class SalesforceConnector implements Connector {
    readonly provider: ConnectorProvider;
    private httpClient;
    constructor();
    getAuthUrl(config: OAuthConfig): string;
    exchangeCode(code: string, config: OAuthConfig): Promise<TokenResponse>;
    refreshToken(refreshToken: string, config: OAuthConfig): Promise<TokenResponse>;
    discoverSchema(credentials: Credentials): Promise<SchemaDefinition>;
    syncObject(params: SyncParams): AsyncGenerator<RawBatch, void, unknown>;
    healthCheck(credentials: Credentials): Promise<HealthResult>;
}
//# sourceMappingURL=index.d.ts.map