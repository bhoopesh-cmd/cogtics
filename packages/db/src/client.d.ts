import { Kysely } from 'kysely';
import type { Database } from './types.js';
export interface DatabaseConfig {
    connectionString: string;
    maxConnections?: number;
}
/**
 * Create a Kysely database instance with a PostgreSQL connection pool
 */
export declare function createDatabase(config: DatabaseConfig): Kysely<Database>;
/**
 * Get or create the singleton database instance
 */
export declare function getDatabase(config?: DatabaseConfig): Kysely<Database>;
/**
 * Close the database connection
 */
export declare function closeDatabase(): Promise<void>;
/**
 * Execute a function within a tenant context using PostgreSQL session variables.
 * This sets `app.tenant_id` for RLS policies.
 */
export declare function withTenantContext<T>(database: Kysely<Database>, tenantId: string, fn: (db: Kysely<Database>) => Promise<T>): Promise<T>;
export type { Database } from './types.js';
//# sourceMappingURL=client.d.ts.map