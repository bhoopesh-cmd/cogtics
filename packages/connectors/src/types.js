import { z } from 'zod';
export const ConnectorProviderSchema = z.enum(['stripe', 'salesforce', 'hubspot', 'quickbooks', 'docusign']);
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
export const HealthResultSchema = z.object({
    healthy: z.boolean(),
    message: z.string().optional(),
    checkedAt: z.date(),
    externalAccountId: z.string().optional(),
    details: z.record(z.unknown()).optional(),
});
export const ConnectionStatusSchema = z.enum(['pending', 'connected', 'error', 'disconnected']);
//# sourceMappingURL=types.js.map