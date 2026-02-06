import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
const { Pool } = pg;
let db = null;
/**
 * Create a Kysely database instance with a PostgreSQL connection pool
 */
export function createDatabase(config) {
    const pool = new Pool({
        connectionString: config.connectionString,
        max: config.maxConnections ?? 10,
    });
    return new Kysely({
        dialect: new PostgresDialect({ pool }),
    });
}
/**
 * Get or create the singleton database instance
 */
export function getDatabase(config) {
    if (db) {
        return db;
    }
    if (!config) {
        const connectionString = process.env['DATABASE_URL'];
        if (!connectionString) {
            throw new Error('DATABASE_URL environment variable is required');
        }
        config = { connectionString };
    }
    db = createDatabase(config);
    return db;
}
/**
 * Close the database connection
 */
export async function closeDatabase() {
    if (db) {
        await db.destroy();
        db = null;
    }
}
/**
 * Execute a function within a tenant context using PostgreSQL session variables.
 * This sets `app.tenant_id` for RLS policies.
 */
export async function withTenantContext(database, tenantId, fn) {
    return database.transaction().execute(async (trx) => {
        // Set the tenant context for RLS
        await trx.executeQuery(trx
            .raw(`SET LOCAL app.tenant_id = '${tenantId}'`)
            .compile(trx));
        return fn(trx);
    });
}
//# sourceMappingURL=client.js.map