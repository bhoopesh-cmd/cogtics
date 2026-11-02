import { Kysely, PostgresDialect, sql } from 'kysely';
import pg from 'pg';
import type { Database } from './types.js';

const { Pool } = pg;

let db: Kysely<Database> | null = null;

export interface DatabaseConfig {
  connectionString: string;
  maxConnections?: number;
}

/**
 * Create a Kysely database instance with a PostgreSQL connection pool
 */
export function createDatabase(config: DatabaseConfig): Kysely<Database> {
  const pool = new Pool({
    connectionString: config.connectionString,
    max: config.maxConnections ?? 10,
  });

  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });
}

/**
 * Get or create the singleton database instance
 */
export function getDatabase(config?: DatabaseConfig): Kysely<Database> {
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
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.destroy();
    db = null;
  }
}

/**
 * Execute a function within a tenant context using PostgreSQL session variables.
 * This sets `app.tenant_id` for RLS policies.
 */
export async function withTenantContext<T>(
  database: Kysely<Database>,
  tenantId: string,
  fn: (db: Kysely<Database>) => Promise<T>
): Promise<T> {
  return database.transaction().execute(async (trx) => {
    // Set the tenant context for RLS
    await trx.executeQuery(
      sql`SET LOCAL app.tenant_id = ${sql.lit(tenantId)}`.compile(trx)
    );

    return fn(trx as unknown as Kysely<Database>);
  });
}

// Re-export types
export type { Database } from './types.js';

