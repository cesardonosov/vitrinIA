import { sql } from "drizzle-orm";
import { getEnv } from "@/infra/env";
import { StoreId } from "@/shared/kernel";
import { createDatabase, type Database } from "./client";

/** The transaction handle passed to `fn`. Its context is already `app.store_id`. */
export type StoreTx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Thrown (not returned) because reaching this point with a non-StoreId means a
 * programming error or an unsafe cast, never a business outcome. The message
 * deliberately omits the value: it may be attacker-controlled.
 */
export class InvalidStoreContextError extends Error {
  constructor() {
    super("withStoreTx requires a valid StoreId (UUID v7)");
    this.name = "InvalidStoreContextError";
  }
}

export type WithStoreTx = <T>(
  storeId: StoreId,
  fn: (tx: StoreTx) => Promise<T>,
) => Promise<T>;

/**
 * THE single door to tenant tables (ADR-0003 §4, threat model C3).
 *
 * Opens a transaction and sets the tenant with
 * `set_config('app.store_id', $1, true)`: the `true` makes it transaction-local, so
 * COMMIT and ROLLBACK both discard it and a pooled connection can never carry a
 * tenant into the next request. It is the parametrised equivalent of SET LOCAL
 * (SET LOCAL does not accept bind parameters). The value is re-validated here
 * even though the type says StoreId, because the type can be bypassed with a cast.
 *
 * No other code may run `SET app.store_id`, `set_config(..., false)` or use the
 * client outside this helper (Semgrep and dependency-cruiser rules, VIT-105/VIT-103).
 */
export function bindWithStoreTx(db: Database): WithStoreTx {
  return async (storeId, fn) => {
    const parsed = StoreId.parse(storeId);
    if (!parsed.ok) throw new InvalidStoreContextError();
    return db.transaction(async (tx) => {
      await tx.execute(
        sql`select set_config('app.store_id', ${parsed.value}, true)`,
      );
      return fn(tx);
    });
  };
}

let defaultHandle: ReturnType<typeof createDatabase> | undefined;

function defaultDb(): Database {
  if (!defaultHandle) {
    // getEnv() already validated DATABASE_URL as a postgres URL; the index signature widens it.
    const connectionString = String(getEnv().DATABASE_URL);
    defaultHandle = createDatabase({ connectionString });
  }
  return defaultHandle.db;
}

/** Application entry point, bound to the process-wide pool built from DATABASE_URL (app_user). */
export const withStoreTx: WithStoreTx = (storeId, fn) =>
  bindWithStoreTx(defaultDb())(storeId, fn);
