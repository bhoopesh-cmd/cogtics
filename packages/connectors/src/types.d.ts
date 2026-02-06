import { z } from 'zod';
export type ConnectorProvider = 'stripe' | 'salesforce' | 'hubspot' | 'quickbooks' | 'docusign';
export declare const ConnectorProviderSchema: z.ZodEnum<["stripe", "salesforce", "hubspot", "quickbooks", "docusign"]>;
export interface OAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes?: string[];
    state?: string;
    isSandbox?: boolean;
    codeChallenge?: string;
    codeChallengeMethod?: 'S256';
    codeVerifier?: string;
}
export interface TokenResponse {
    accessToken: string;
    refreshToken?: string;
    tokenType: string;
    expiresIn?: number;
    expiresAt?: Date;
    scopes?: string[];
    externalAccountId?: string;
    instanceUrl?: string;
    metadata?: Record<string, unknown>;
}
export declare const TokenResponseSchema: z.ZodObject<{
    accessToken: z.ZodString;
    refreshToken: z.ZodOptional<z.ZodString>;
    tokenType: z.ZodString;
    expiresIn: z.ZodOptional<z.ZodNumber>;
    expiresAt: z.ZodOptional<z.ZodDate>;
    scopes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    externalAccountId: z.ZodOptional<z.ZodString>;
    instanceUrl: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    accessToken: string;
    tokenType: string;
    metadata?: Record<string, unknown> | undefined;
    expiresAt?: Date | undefined;
    externalAccountId?: string | undefined;
    expiresIn?: number | undefined;
    scopes?: string[] | undefined;
    refreshToken?: string | undefined;
    instanceUrl?: string | undefined;
}, {
    accessToken: string;
    tokenType: string;
    metadata?: Record<string, unknown> | undefined;
    expiresAt?: Date | undefined;
    externalAccountId?: string | undefined;
    expiresIn?: number | undefined;
    scopes?: string[] | undefined;
    refreshToken?: string | undefined;
    instanceUrl?: string | undefined;
}>;
export interface Credentials {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    instanceUrl?: string;
    externalAccountId?: string;
}
export interface SchemaField {
    name: string;
    type: string;
    label?: string;
    required: boolean;
    description?: string;
}
export interface SchemaObject {
    name: string;
    label?: string;
    fields: SchemaField[];
    supportsIncremental: boolean;
    incrementalField?: string;
}
export interface SchemaDefinition {
    provider: ConnectorProvider;
    objects: SchemaObject[];
    discoveredAt: Date;
}
export declare const SchemaFieldSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodString;
    label: z.ZodOptional<z.ZodString>;
    required: z.ZodBoolean;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: string;
    required: boolean;
    name: string;
    label?: string | undefined;
    description?: string | undefined;
}, {
    type: string;
    required: boolean;
    name: string;
    label?: string | undefined;
    description?: string | undefined;
}>;
export declare const SchemaObjectSchema: z.ZodObject<{
    name: z.ZodString;
    label: z.ZodOptional<z.ZodString>;
    fields: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        label: z.ZodOptional<z.ZodString>;
        required: z.ZodBoolean;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        required: boolean;
        name: string;
        label?: string | undefined;
        description?: string | undefined;
    }, {
        type: string;
        required: boolean;
        name: string;
        label?: string | undefined;
        description?: string | undefined;
    }>, "many">;
    supportsIncremental: z.ZodBoolean;
    incrementalField: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    fields: {
        type: string;
        required: boolean;
        name: string;
        label?: string | undefined;
        description?: string | undefined;
    }[];
    supportsIncremental: boolean;
    label?: string | undefined;
    incrementalField?: string | undefined;
}, {
    name: string;
    fields: {
        type: string;
        required: boolean;
        name: string;
        label?: string | undefined;
        description?: string | undefined;
    }[];
    supportsIncremental: boolean;
    label?: string | undefined;
    incrementalField?: string | undefined;
}>;
export declare const SchemaDefinitionSchema: z.ZodObject<{
    provider: z.ZodEnum<["stripe", "salesforce", "hubspot", "quickbooks", "docusign"]>;
    objects: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        label: z.ZodOptional<z.ZodString>;
        fields: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            label: z.ZodOptional<z.ZodString>;
            required: z.ZodBoolean;
            description: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: string;
            required: boolean;
            name: string;
            label?: string | undefined;
            description?: string | undefined;
        }, {
            type: string;
            required: boolean;
            name: string;
            label?: string | undefined;
            description?: string | undefined;
        }>, "many">;
        supportsIncremental: z.ZodBoolean;
        incrementalField: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        fields: {
            type: string;
            required: boolean;
            name: string;
            label?: string | undefined;
            description?: string | undefined;
        }[];
        supportsIncremental: boolean;
        label?: string | undefined;
        incrementalField?: string | undefined;
    }, {
        name: string;
        fields: {
            type: string;
            required: boolean;
            name: string;
            label?: string | undefined;
            description?: string | undefined;
        }[];
        supportsIncremental: boolean;
        label?: string | undefined;
        incrementalField?: string | undefined;
    }>, "many">;
    discoveredAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    provider: "salesforce" | "hubspot" | "stripe" | "quickbooks" | "docusign";
    objects: {
        name: string;
        fields: {
            type: string;
            required: boolean;
            name: string;
            label?: string | undefined;
            description?: string | undefined;
        }[];
        supportsIncremental: boolean;
        label?: string | undefined;
        incrementalField?: string | undefined;
    }[];
    discoveredAt: Date;
}, {
    provider: "salesforce" | "hubspot" | "stripe" | "quickbooks" | "docusign";
    objects: {
        name: string;
        fields: {
            type: string;
            required: boolean;
            name: string;
            label?: string | undefined;
            description?: string | undefined;
        }[];
        supportsIncremental: boolean;
        label?: string | undefined;
        incrementalField?: string | undefined;
    }[];
    discoveredAt: Date;
}>;
export interface SyncParams {
    connectionId: string;
    objectType: string;
    cursor?: unknown;
    fullSync: boolean;
    credentials: Credentials;
    batchSize?: number;
}
export interface RawRecord {
    id: string;
    data: Record<string, unknown>;
    updatedAt?: Date;
}
export interface RawBatch {
    objectType: string;
    records: RawRecord[];
    cursor?: unknown;
    hasMore: boolean;
    fetchedAt: Date;
}
export declare const RawRecordSchema: z.ZodObject<{
    id: z.ZodString;
    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    updatedAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    id: string;
    data: Record<string, unknown>;
    updatedAt?: Date | undefined;
}, {
    id: string;
    data: Record<string, unknown>;
    updatedAt?: Date | undefined;
}>;
export declare const RawBatchSchema: z.ZodObject<{
    objectType: z.ZodString;
    records: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        updatedAt: z.ZodOptional<z.ZodDate>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        data: Record<string, unknown>;
        updatedAt?: Date | undefined;
    }, {
        id: string;
        data: Record<string, unknown>;
        updatedAt?: Date | undefined;
    }>, "many">;
    cursor: z.ZodOptional<z.ZodUnknown>;
    hasMore: z.ZodBoolean;
    fetchedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    objectType: string;
    records: {
        id: string;
        data: Record<string, unknown>;
        updatedAt?: Date | undefined;
    }[];
    hasMore: boolean;
    fetchedAt: Date;
    cursor?: unknown;
}, {
    objectType: string;
    records: {
        id: string;
        data: Record<string, unknown>;
        updatedAt?: Date | undefined;
    }[];
    hasMore: boolean;
    fetchedAt: Date;
    cursor?: unknown;
}>;
export interface HealthResult {
    healthy: boolean;
    message?: string;
    checkedAt: Date;
    externalAccountId?: string;
    details?: Record<string, unknown>;
}
export declare const HealthResultSchema: z.ZodObject<{
    healthy: z.ZodBoolean;
    message: z.ZodOptional<z.ZodString>;
    checkedAt: z.ZodDate;
    externalAccountId: z.ZodOptional<z.ZodString>;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    healthy: boolean;
    checkedAt: Date;
    message?: string | undefined;
    details?: Record<string, unknown> | undefined;
    externalAccountId?: string | undefined;
}, {
    healthy: boolean;
    checkedAt: Date;
    message?: string | undefined;
    details?: Record<string, unknown> | undefined;
    externalAccountId?: string | undefined;
}>;
export type ConnectionStatus = 'pending' | 'connected' | 'error' | 'disconnected';
export declare const ConnectionStatusSchema: z.ZodEnum<["pending", "connected", "error", "disconnected"]>;
export interface Connector {
    readonly provider: ConnectorProvider;
    /**
     * Generate OAuth authorization URL
     */
    getAuthUrl(config: OAuthConfig): string;
    /**
     * Exchange authorization code for tokens
     */
    exchangeCode(code: string, config: OAuthConfig): Promise<TokenResponse>;
    /**
     * Refresh expired access token
     */
    refreshToken(refreshToken: string, config: OAuthConfig): Promise<TokenResponse>;
    /**
     * Discover available objects and their schemas
     */
    discoverSchema(credentials: Credentials): Promise<SchemaDefinition>;
    /**
     * Sync records for a specific object type
     * Returns an async generator that yields batches
     */
    syncObject(params: SyncParams): AsyncGenerator<RawBatch, void, unknown>;
    /**
     * Check if the connection is healthy
     */
    healthCheck(credentials: Credentials): Promise<HealthResult>;
}
export interface ConnectorConfig {
    stripe?: {
        clientId: string;
        clientSecret: string;
    };
    salesforce?: {
        clientId: string;
        clientSecret: string;
        redirectUri: string;
    };
    hubspot?: {
        clientId: string;
        clientSecret: string;
        redirectUri: string;
    };
    quickbooks?: {
        clientId: string;
        clientSecret: string;
        redirectUri: string;
    };
    docusign?: {
        clientId: string;
        clientSecret: string;
        redirectUri: string;
    };
    encryption: {
        mode: 'local' | 'kms';
        key?: string;
    };
}
//# sourceMappingURL=types.d.ts.map