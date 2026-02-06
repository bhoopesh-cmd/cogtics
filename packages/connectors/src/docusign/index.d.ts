/**
 * DocuSign Connector
 *
 * OAuth 2.0 connector for DocuSign eSignature.
 */
import type { Connector, OAuthConfig, TokenResponse, Credentials, SchemaDefinition, SyncParams, RawBatch, HealthResult } from '../types.js';
export declare class DocuSignConnector implements Connector {
    readonly provider: any;
    private httpClient;
    constructor();
    getAuthUrl(config: OAuthConfig): string;
    exchangeCode(code: string, config: OAuthConfig): Promise<TokenResponse>;
    refreshToken(refreshToken: string, config: OAuthConfig): Promise<TokenResponse>;
    discoverSchema(credentials: Credentials): Promise<SchemaDefinition>;
    syncObject(params: SyncParams): AsyncGenerator<RawBatch, void, unknown>;
    healthCheck(credentials: Credentials): Promise<HealthResult>;
    private getUserInfo;
}
export declare const docusignConnector: DocuSignConnector;
//# sourceMappingURL=index.d.ts.map