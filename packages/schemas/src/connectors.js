import { z } from 'zod';
// ============================================
// Provider Types
// ============================================
export const ConnectorProviderSchema = z.enum(['stripe', 'salesforce']);
export const ConnectionStatusSchema = z.enum(['pending', 'connected', 'error', 'disconnected']);
export const RunTypeSchema = z.enum(['full', 'incremental']);
export const RunStatusSchema = z.enum(['running', 'completed', 'failed', 'cancelled']);
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
export const CreateConnectionSchema = z.object({
    provider: ConnectorProviderSchema,
    displayName: z.string().optional(),
});
// ============================================
// OAuth Schemas
// ============================================
export const StartOAuthRequestSchema = z.object({
    provider: ConnectorProviderSchema,
    redirectUri: z.string().url().optional(),
    state: z.string().optional(),
});
export const StartOAuthResponseSchema = z.object({
    authUrl: z.string().url(),
    state: z.string(),
});
export const OAuthCallbackRequestSchema = z.object({
    provider: ConnectorProviderSchema,
    code: z.string(),
    state: z.string().optional(),
});
export const OAuthCallbackResponseSchema = z.object({
    connectionId: z.string(),
    status: ConnectionStatusSchema,
    externalAccountId: z.string().optional(),
});
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
    discoveredAt: z.coerce.date(),
});
// ============================================
// Sync Schemas
// ============================================
export const TriggerSyncRequestSchema = z.object({
    runType: RunTypeSchema.default('incremental'),
    objectTypes: z.array(z.string()).optional(),
});
export const TriggerSyncResponseSchema = z.object({
    runId: z.string(),
    jobId: z.string(),
    status: RunStatusSchema,
});
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
// ============================================
// Health Check Schemas
// ============================================
export const HealthCheckResponseSchema = z.object({
    healthy: z.boolean(),
    message: z.string().optional(),
    checkedAt: z.coerce.date(),
    externalAccountId: z.string().optional(),
});
// ============================================
// List Connections Response
// ============================================
export const ListConnectionsResponseSchema = z.object({
    connections: z.array(ConnectionSchema),
    total: z.number(),
});
//# sourceMappingURL=connectors.js.map