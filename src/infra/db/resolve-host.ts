import { sql } from "drizzle-orm";
import { StoreId } from "@/shared/kernel";
import type { Database } from "./client";
import { defaultDb } from "./default-db";

/**
 * Host → StoreId through `resolve_host()` (ADR-0003 §1, threat model C8).
 *
 * The only query that runs before the tenant is known, so it is the only one
 * outside withStoreTx. It touches no table directly: the SECURITY DEFINER
 * function owned by host_resolver returns a store id for a verified host or
 * NULL for everything else.
 */
export function bindResolveHost(db: Database) {
  return async (host: string): Promise<StoreId | undefined> => {
    const result = await db.execute<{ store_id: string | null }>(
      sql`select resolve_host(${host})::text as store_id`,
    );
    const raw = result.rows[0]?.store_id;
    if (!raw) return undefined;
    const parsed = StoreId.parse(raw);
    return parsed.ok ? parsed.value : undefined;
  };
}

export const resolveHost = (host: string): Promise<StoreId | undefined> =>
  bindResolveHost(defaultDb())(host);
