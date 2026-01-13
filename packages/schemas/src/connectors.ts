import { z } from 'zod';

// ============================================
// Provider Types
// ============================================

export const ConnectorProviderSchema = z.enum(['stripe', 'salesforce']);
export type ConnectorProvider = z.infer<typeof ConnectorProviderSchema>;

export const ConnectionStatusSchema = z.enum(['pending', 'connected', 'error', 'disconnected']);
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;

export const RunTypeSchema = z.enum(['full', 'incremental']);
export type RunType = z.infer<typeof RunTypeSchema>;

export const RunStatusSchema = z.enum(['running', 'completed', 'failed', 'cancelled']);
export type RunStatus = z.infer<typeof RunStatusSchema>;

// ============================================
// Connection Schemas
// ============================================

export const ConnectionSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  provider: ConnectorProviderSchema,
  status: ConnectionStatusSchema,
  displayName: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  lastSyncAt: z.coerce.date().nullable(),
  lastSuccessAt: z.coerce.date().nullable(),
  lastErrorAt: z.coerce.date().nullable(),
  lastErrorCode: z.string().nullable(),
  lastErrorMessage: z.string().nullable(),
});

export type Connection = z.infer<typeof ConnectionSchema>;

export const CreateConnectionSchema = z.object({
  provider: ConnectorProviderSchema,
  displayName: z.string().optional(),
});

export type CreateConnection = z.infer<typeof CreateConnectionSchema>;

// ============================================
// OAuth Schemas
// ============================================

export const StartOAuthRequestSchema = z.object({
  provider: ConnectorProviderSchema,
  redirectUri: z.string().url().optional(),
  state: z.string().optional(),
});

export type StartOAuthRequest = z.infer<typeof StartOAuthRequestSchema>;

export const StartOAuthResponseSchema = z.object({
  authUrl: z.string().url(),
  state: z.string(),
});

export type StartOAuthResponse = z.infer<typeof StartOAuthResponseSchema>;

export const OAuthCallbackRequestSchema = z.object({
  provider: ConnectorProviderSchema,
  code: z.string(),
  state: z.string().optional(),
});

export type OAuthCallbackRequest = z.infer<typeof OAuthCallbackRequestSchema>;

export const OAuthCallbackResponseSchema = z.object({
  connectionId: z.string(),
  status: ConnectionStatusSchema,
  externalAccountId: z.string().optional(),
});

export type OAuthCallbackResponse = z.infer<typeof OAuthCallbackResponseSchema>;

// ============================================
// Schema Discovery Schemas
// ============================================

export const SchemaFieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  label: z.string().optional(),
  required: z.boolean(),
  description: z.string().optional(),
});

export type SchemaField = z.infer<typeof SchemaFieldSchema>;

export const SchemaObjectSchema = z.object({
  name: z.string(),
  label: z.string().optional(),
  fields: z.array(SchemaFieldSchema),
  supportsIncremental: z.boolean(),
  incrementalField: z.string().optional(),
});

export type SchemaObject = z.infer<typeof SchemaObjectSchema>;

export const SchemaDefinitionSchema = z.object({
  provider: ConnectorProviderSchema,
  objects: z.array(SchemaObjectSchema),
  discoveredAt: z.coerce.date(),
});

export type SchemaDefinition = z.infer<typeof SchemaDefinitionSchema>;

// ============================================
// Sync Schemas
// ============================================

export const TriggerSyncRequestSchema = z.object({
  runType: RunTypeSchema.default('incremental'),
  objectTypes: z.array(z.string()).optional(),
});

export type TriggerSyncRequest = z.infer<typeof TriggerSyncRequestSchema>;

export const TriggerSyncResponseSchema = z.object({
  runId: z.string(),
  jobId: z.string(),
  status: RunStatusSchema,
});

export type TriggerSyncResponse = z.infer<typeof TriggerSyncResponseSchema>;

// ============================================
// Connector Run Schemas
// ============================================

export const ConnectorRunSchema = z.object({
  id: z.string(),
  connectionId: z.string(),
  tenantId: z.string(),
  runType: RunTypeSchema,
  status: RunStatusSchema,
  startedAt: z.coerce.date(),
  finishedAt: z.coerce.date().nullable(),
  recordsFetched: z.number().nullable(),
  objectsFetched: z.number().nullable(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
});

export type ConnectorRun = z.infer<typeof ConnectorRunSchema>;

// ============================================
// Health Check Schemas
// ============================================

export const HealthCheckResponseSchema = z.object({
  healthy: z.boolean(),
  message: z.string().optional(),
  checkedAt: z.coerce.date(),
  externalAccountId: z.string().optional(),
});

export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;

// ============================================
// List Connections Response
// ============================================

export const ListConnectionsResponseSchema = z.object({
  connections: z.array(ConnectionSchema),
  total: z.number(),
});

export type ListConnectionsResponse = z.infer<typeof ListConnectionsResponseSchema>;

