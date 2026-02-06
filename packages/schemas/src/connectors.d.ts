import { z } from 'zod';
export declare const ConnectorProviderSchema: z.ZodEnum<["stripe", "salesforce"]>;
export type ConnectorProvider = z.infer<typeof ConnectorProviderSchema>;
export declare const ConnectionStatusSchema: z.ZodEnum<["pending", "connected", "error", "disconnected"]>;
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;
export declare const RunTypeSchema: z.ZodEnum<["full", "incremental"]>;
export type RunType = z.infer<typeof RunTypeSchema>;
export declare const RunStatusSchema: z.ZodEnum<["running", "completed", "failed", "cancelled"]>;
export type RunStatus = z.infer<typeof RunStatusSchema>;
export declare const ConnectionSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    provider: z.ZodEnum<["stripe", "salesforce"]>;
    status: z.ZodEnum<["pending", "connected", "error", "disconnected"]>;
    displayName: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    lastSyncAt: z.ZodNullable<z.ZodDate>;
    lastSuccessAt: z.ZodNullable<z.ZodDate>;
    lastErrorAt: z.ZodNullable<z.ZodDate>;
    lastErrorCode: z.ZodNullable<z.ZodString>;
    lastErrorMessage: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "error" | "pending" | "connected" | "disconnected";
    id: string;
    tenantId: string;
    displayName: string | null;
    createdAt: Date;
    updatedAt: Date;
    provider: "salesforce" | "stripe";
    lastSyncAt: Date | null;
    lastSuccessAt: Date | null;
    lastErrorAt: Date | null;
    lastErrorCode: string | null;
    lastErrorMessage: string | null;
}, {
    status: "error" | "pending" | "connected" | "disconnected";
    id: string;
    tenantId: string;
    displayName: string | null;
    createdAt: Date;
    updatedAt: Date;
    provider: "salesforce" | "stripe";
    lastSyncAt: Date | null;
    lastSuccessAt: Date | null;
    lastErrorAt: Date | null;
    lastErrorCode: string | null;
    lastErrorMessage: string | null;
}>;
export type Connection = z.infer<typeof ConnectionSchema>;
export declare const CreateConnectionSchema: z.ZodObject<{
    provider: z.ZodEnum<["stripe", "salesforce"]>;
    displayName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    provider: "salesforce" | "stripe";
    displayName?: string | undefined;
}, {
    provider: "salesforce" | "stripe";
    displayName?: string | undefined;
}>;
export type CreateConnection = z.infer<typeof CreateConnectionSchema>;
export declare const StartOAuthRequestSchema: z.ZodObject<{
    provider: z.ZodEnum<["stripe", "salesforce"]>;
    redirectUri: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    provider: "salesforce" | "stripe";
    redirectUri?: string | undefined;
    state?: string | undefined;
}, {
    provider: "salesforce" | "stripe";
    redirectUri?: string | undefined;
    state?: string | undefined;
}>;
export type StartOAuthRequest = z.infer<typeof StartOAuthRequestSchema>;
export declare const StartOAuthResponseSchema: z.ZodObject<{
    authUrl: z.ZodString;
    state: z.ZodString;
}, "strip", z.ZodTypeAny, {
    state: string;
    authUrl: string;
}, {
    state: string;
    authUrl: string;
}>;
export type StartOAuthResponse = z.infer<typeof StartOAuthResponseSchema>;
export declare const OAuthCallbackRequestSchema: z.ZodObject<{
    provider: z.ZodEnum<["stripe", "salesforce"]>;
    code: z.ZodString;
    state: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    code: string;
    provider: "salesforce" | "stripe";
    state?: string | undefined;
}, {
    code: string;
    provider: "salesforce" | "stripe";
    state?: string | undefined;
}>;
export type OAuthCallbackRequest = z.infer<typeof OAuthCallbackRequestSchema>;
export declare const OAuthCallbackResponseSchema: z.ZodObject<{
    connectionId: z.ZodString;
    status: z.ZodEnum<["pending", "connected", "error", "disconnected"]>;
    externalAccountId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "error" | "pending" | "connected" | "disconnected";
    connectionId: string;
    externalAccountId?: string | undefined;
}, {
    status: "error" | "pending" | "connected" | "disconnected";
    connectionId: string;
    externalAccountId?: string | undefined;
}>;
export type OAuthCallbackResponse = z.infer<typeof OAuthCallbackResponseSchema>;
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
export type SchemaField = z.infer<typeof SchemaFieldSchema>;
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
export type SchemaObject = z.infer<typeof SchemaObjectSchema>;
export declare const SchemaDefinitionSchema: z.ZodObject<{
    provider: z.ZodEnum<["stripe", "salesforce"]>;
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
    provider: "salesforce" | "stripe";
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
    provider: "salesforce" | "stripe";
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
export type SchemaDefinition = z.infer<typeof SchemaDefinitionSchema>;
export declare const TriggerSyncRequestSchema: z.ZodObject<{
    runType: z.ZodDefault<z.ZodEnum<["full", "incremental"]>>;
    objectTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    runType: "full" | "incremental";
    objectTypes?: string[] | undefined;
}, {
    runType?: "full" | "incremental" | undefined;
    objectTypes?: string[] | undefined;
}>;
export type TriggerSyncRequest = z.infer<typeof TriggerSyncRequestSchema>;
export declare const TriggerSyncResponseSchema: z.ZodObject<{
    runId: z.ZodString;
    jobId: z.ZodString;
    status: z.ZodEnum<["running", "completed", "failed", "cancelled"]>;
}, "strip", z.ZodTypeAny, {
    status: "running" | "completed" | "failed" | "cancelled";
    runId: string;
    jobId: string;
}, {
    status: "running" | "completed" | "failed" | "cancelled";
    runId: string;
    jobId: string;
}>;
export type TriggerSyncResponse = z.infer<typeof TriggerSyncResponseSchema>;
export declare const ConnectorRunSchema: z.ZodObject<{
    id: z.ZodString;
    connectionId: z.ZodString;
    tenantId: z.ZodString;
    runType: z.ZodEnum<["full", "incremental"]>;
    status: z.ZodEnum<["running", "completed", "failed", "cancelled"]>;
    startedAt: z.ZodDate;
    finishedAt: z.ZodNullable<z.ZodDate>;
    recordsFetched: z.ZodNullable<z.ZodNumber>;
    objectsFetched: z.ZodNullable<z.ZodNumber>;
    errorCode: z.ZodNullable<z.ZodString>;
    errorMessage: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "running" | "completed" | "failed" | "cancelled";
    id: string;
    tenantId: string;
    errorCode: string | null;
    errorMessage: string | null;
    startedAt: Date;
    finishedAt: Date | null;
    connectionId: string;
    runType: "full" | "incremental";
    recordsFetched: number | null;
    objectsFetched: number | null;
}, {
    status: "running" | "completed" | "failed" | "cancelled";
    id: string;
    tenantId: string;
    errorCode: string | null;
    errorMessage: string | null;
    startedAt: Date;
    finishedAt: Date | null;
    connectionId: string;
    runType: "full" | "incremental";
    recordsFetched: number | null;
    objectsFetched: number | null;
}>;
export type ConnectorRun = z.infer<typeof ConnectorRunSchema>;
export declare const HealthCheckResponseSchema: z.ZodObject<{
    healthy: z.ZodBoolean;
    message: z.ZodOptional<z.ZodString>;
    checkedAt: z.ZodDate;
    externalAccountId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    healthy: boolean;
    checkedAt: Date;
    message?: string | undefined;
    externalAccountId?: string | undefined;
}, {
    healthy: boolean;
    checkedAt: Date;
    message?: string | undefined;
    externalAccountId?: string | undefined;
}>;
export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;
export declare const ListConnectionsResponseSchema: z.ZodObject<{
    connections: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        tenantId: z.ZodString;
        provider: z.ZodEnum<["stripe", "salesforce"]>;
        status: z.ZodEnum<["pending", "connected", "error", "disconnected"]>;
        displayName: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
        lastSyncAt: z.ZodNullable<z.ZodDate>;
        lastSuccessAt: z.ZodNullable<z.ZodDate>;
        lastErrorAt: z.ZodNullable<z.ZodDate>;
        lastErrorCode: z.ZodNullable<z.ZodString>;
        lastErrorMessage: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "error" | "pending" | "connected" | "disconnected";
        id: string;
        tenantId: string;
        displayName: string | null;
        createdAt: Date;
        updatedAt: Date;
        provider: "salesforce" | "stripe";
        lastSyncAt: Date | null;
        lastSuccessAt: Date | null;
        lastErrorAt: Date | null;
        lastErrorCode: string | null;
        lastErrorMessage: string | null;
    }, {
        status: "error" | "pending" | "connected" | "disconnected";
        id: string;
        tenantId: string;
        displayName: string | null;
        createdAt: Date;
        updatedAt: Date;
        provider: "salesforce" | "stripe";
        lastSyncAt: Date | null;
        lastSuccessAt: Date | null;
        lastErrorAt: Date | null;
        lastErrorCode: string | null;
        lastErrorMessage: string | null;
    }>, "many">;
    total: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    total: number;
    connections: {
        status: "error" | "pending" | "connected" | "disconnected";
        id: string;
        tenantId: string;
        displayName: string | null;
        createdAt: Date;
        updatedAt: Date;
        provider: "salesforce" | "stripe";
        lastSyncAt: Date | null;
        lastSuccessAt: Date | null;
        lastErrorAt: Date | null;
        lastErrorCode: string | null;
        lastErrorMessage: string | null;
    }[];
}, {
    total: number;
    connections: {
        status: "error" | "pending" | "connected" | "disconnected";
        id: string;
        tenantId: string;
        displayName: string | null;
        createdAt: Date;
        updatedAt: Date;
        provider: "salesforce" | "stripe";
        lastSyncAt: Date | null;
        lastSuccessAt: Date | null;
        lastErrorAt: Date | null;
        lastErrorCode: string | null;
        lastErrorMessage: string | null;
    }[];
}>;
export type ListConnectionsResponse = z.infer<typeof ListConnectionsResponseSchema>;
//# sourceMappingURL=connectors.d.ts.map