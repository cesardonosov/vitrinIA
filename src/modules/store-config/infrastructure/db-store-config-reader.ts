import { desc, eq } from "drizzle-orm";
import type { WithStoreTx } from "@/infra/db/with-store-tx";
import type { StoreId } from "@/shared/kernel";
import {
  type ParseStoreConfigError,
  parseStoreConfig,
  type StoreConfigReader,
  type StoreConfigValidator,
} from "../application";
import { storeConfigs } from "./schema";

export interface DbStoreConfigReaderDeps {
  readonly withStoreTx: WithStoreTx;
  readonly validator: StoreConfigValidator;
  /**
   * Called when the stored config of a store does not parse. Receives the store
   * id and the typed error (paths only, never the rejected values); the reader
   * itself answers `undefined`, which the storefront turns into a uniform 404.
   */
  readonly onInvalid?: (storeId: StoreId, error: ParseStoreConfigError) => void;
}

/**
 * Database Store Config adapter (VIT-191, ADR-0004). Reads the highest revision
 * of the store inside `withStoreTx`, so RLS only shows the rows of `storeId`; the
 * explicit `store_id` filter is a second fence and lets Postgres use the
 * `(store_id, revision)` unique index.
 *
 * What comes out of the `jsonb` column is untrusted: it goes through
 * `parseStoreConfig` (migrate in memory, then strict validation). A config that
 * does not parse is never published: no partial render, no fallback to an older
 * revision, `undefined`.
 */
export function createDbStoreConfigReader(
  deps: DbStoreConfigReaderDeps,
): StoreConfigReader {
  return {
    async getConfig(storeId) {
      const row = await deps.withStoreTx(storeId, async (tx) => {
        const rows = await tx
          .select({
            storeId: storeConfigs.storeId,
            config: storeConfigs.config,
          })
          .from(storeConfigs)
          .where(eq(storeConfigs.storeId, storeId))
          .orderBy(desc(storeConfigs.revision))
          .limit(1);
        return rows[0];
      });
      // Third fence: a row of another store must never be served, whatever the query did.
      if (!row || row.storeId !== storeId) return undefined;
      const parsed = parseStoreConfig(row.config, deps.validator);
      if (!parsed.ok) {
        deps.onInvalid?.(storeId, parsed.error);
        return undefined;
      }
      return parsed.value;
    },
  };
}
