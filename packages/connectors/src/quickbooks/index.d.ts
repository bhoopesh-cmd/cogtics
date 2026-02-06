/**
 * QuickBooks Connector
 *
 * OAuth 2.0 connector for Intuit QuickBooks Online.
 */
import type { Connector, OAuthConfig, TokenResponse, Credentials, SchemaDefinition, SyncParams, RawBatch, HealthResult } from '../types.js';
export declare class QuickBooksConnector implements Connector {
    readonly provider: any;
    private httpClient;
    constructor();
    getAuthUrl(config: OAuthConfig): string;
    exchangeCode(code: string, config: OAuthConfig): Promise<TokenResponse>;
    refreshToken(refreshToken: string, config: OAuthConfig): Promise<TokenResponse>;
    discoverSchema(credentials: Credentials): Promise<SchemaDefinition>;
    syncObject(params: SyncParams): AsyncGenerator<RawBatch, void, unknown>;
    healthCheck(credentials: Credentials): Promise<HealthResult>;
}
export declare const quickbooksConnector: QuickBooksConnector;
//# sourceMappingURL=index.d.ts.map