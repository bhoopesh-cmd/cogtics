import { z } from 'zod';

// ============================================
// Provider Types
// ============================================

export type ConnectorProvider = 'stripe' | 'salesforce' | 'hubspot' | 'quickbooks' | 'docusign';

export const ConnectorProviderSchema = z.enum(['stripe', 'salesforce', 'hubspot', 'quickbooks', 'docusign']);

// ============================================
// OAuth Types
// ============================================

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
  state?: string;
  isSandbox?: boolean; // For Salesforce: use test.salesforce.com instead of login.salesforce.com
  // PKCE (Salesforce can enforce this via Connected App / org policy)
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
  instanceUrl?: string; // Salesforce-specific
  metadata?: Record<string, unknown>;
}

export const TokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  tokenType: z.string(),
  expiresIn: z.number().optional(),
  expiresAt: z.date().optional(),
  scopes: z.array(z.string()).optional(),
  externalAccountId: z.string().optional(),
  instanceUrl: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================
// Credentials (decrypted, runtime only)
// ============================================

export interface Credentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  instanceUrl?: string;
  externalAccountId?: string;
}

// ============================================
// Schema Discovery Types
// ============================================

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

export const SchemaFieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  label: z.string().optional(),
  required: z.boolean(),
  description: z.string().optional(),
});

export const SchemaObjectSchema = z.object({
  name: z.string(),
  label: z.string().optional(),
  fields: z.array(SchemaFieldSchema),
  supportsIncremental: z.boolean(),
  incrementalField: z.string().optional(),
});

export const SchemaDefinitionSchema = z.object({
  provider: ConnectorProviderSchema,
  objects: z.array(SchemaObjectSchema),
  discoveredAt: z.date(),
});

// ============================================
// Sync Types
// ============================================

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

export const RawRecordSchema = z.object({
  id: z.string(),
  data: z.record(z.unknown()),
  updatedAt: z.date().optional(),
});

export const RawBatchSchema = z.object({
  objectType: z.string(),
  records: z.array(RawRecordSchema),
  cursor: z.unknown().optional(),
  hasMore: z.boolean(),
  fetchedAt: z.date(),
});

// ============================================
// Health Check Types
// ============================================

export interface HealthResult {
  healthy: boolean;
  message?: string;
  checkedAt: Date;
  externalAccountId?: string;
  details?: Record<string, unknown>;
}

export const HealthResultSchema = z.object({
  healthy: z.boolean(),
  message: z.string().optional(),
  checkedAt: z.date(),
  externalAccountId: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});

// ============================================
// Connection Status
// ============================================

export type ConnectionStatus = 'pending' | 'connected' | 'error' | 'disconnected';

export const ConnectionStatusSchema = z.enum(['pending', 'connected', 'error', 'disconnected']);

// ============================================
// Connector Interface
// ============================================

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

// ============================================
// Connector Config
// ============================================

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
    key?: string; // For local mode
  };
}

