import type { SchemaDefinition, SchemaObject } from '../types.js';
import type { RateLimitedHttpClient } from '../base/http.js';
/**
 * Discover schema from Salesforce by calling the describe API
 */
export declare function discoverSalesforceSchema(instanceUrl: string, accessToken: string, apiVersion: string, httpClient: RateLimitedHttpClient): Promise<SchemaDefinition>;
/**
 * Get list of default Salesforce objects
 */
export declare function getSalesforceDefaultObjects(): SchemaObject[];
/**
 * Get object schema by name
 */
export declare function getSalesforceObjectSchema(objectType: string): SchemaObject | undefined;
//# sourceMappingURL=schema.d.ts.map