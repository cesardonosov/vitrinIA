import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export type Database = NodePgDatabase;

export interface DatabaseHandle {
  readonly db: Database;
  readonly pool: Pool;
  close(): Promise<void>;
}

export interface DatabaseOptions {
  readonly connectionString: string;
  /** Pool size. Tests use 1 to prove a connection never keeps tenant context. */
  readonly max?: number;
}

/**
 * Builds a Drizzle client over a pg Pool. The connection string must be the
 * `app_user` URL: never the owner (migrator) nor the superuser (threat model C1).
 * Application code must not use `db` directly for tenant tables; go through
 * `withStoreTx` (C3).
 */
export function createDatabase(options: DatabaseOptions): DatabaseHandle {
  const pool = new Pool({
    connectionString: options.connectionString,
    max: options.max ?? 10,
  });
  // An idle client error must not crash the process; the pool discards that client.
  pool.on("error", () => {});
  const db = drizzle({ client: pool });
  return { db, pool, close: () => pool.end() };
}
