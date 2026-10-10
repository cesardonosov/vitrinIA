import { sql } from "drizzle-orm";
import { createDatabase, type DatabaseHandle } from "@/infra/db/client";
import { bindWithStoreTx } from "@/infra/db/with-store-tx";
import { uuidv7 } from "@/infra/uuid-v7";
import type { StoreConfig } from "@/modules/store-config/application";
import {
  domains,
  storeConfigs,
  stores,
} from "@/modules/store-config/infrastructure/schema";
import { StoreId } from "@/shared/kernel";
import { requireTestUrl } from "./test-url";

export function openAppUser(max = 5): DatabaseHandle {
  return createDatabase({
    connectionString: requireTestUrl("TEST_DATABASE_URL"),
    max,
  });
}

/** Owner connection: only for catalog inspection and TRUNCATE between tests. */
export function openMigrator(): DatabaseHandle {
  return createDatabase({
    connectionString: requireTestUrl("TEST_MIGRATOR_DATABASE_URL"),
    max: 1,
  });
}

export function newStoreId(): StoreId {
  const parsed = StoreId.parse(uuidv7());
  if (!parsed.ok) throw new Error("generator produced an invalid id");
  return parsed.value;
}

export interface SeededStore {
  readonly id: StoreId;
  readonly slug: string;
  readonly host: string;
  readonly domainId: string;
}

/** Creates a store with a verified subdomain through withStoreTx, as app_user. */
export async function seedStore(
  handle: DatabaseHandle,
  slug: string,
  options: { verified?: boolean } = {},
): Promise<SeededStore> {
  const withStoreTx = bindWithStoreTx(handle.db);
  const id = newStoreId();
  const domainId = uuidv7();
  const host = `${slug}.vitrinia.cl`;
  await withStoreTx(id, async (tx) => {
    await tx.insert(stores).values({ id, slug, name: `Tienda ${slug}` });
    await tx.insert(domains).values({
      id: domainId,
      storeId: id,
      host,
      verifiedAt: options.verified === false ? null : new Date(),
    });
  });
  return { id, slug, host, domainId };
}

/**
 * Stores `config` as revision `revision` of the store, through withStoreTx as app_user.
 * `config` is typed `unknown` on purpose: tests also store invalid and legacy documents
 * (the reader must refuse them), and `schema_version` mirrors what the document says.
 */
export async function seedStoreConfig(
  handle: DatabaseHandle,
  storeId: StoreId,
  config: StoreConfig | Record<string, unknown>,
  revision = 1,
): Promise<void> {
  const schemaVersion = Number(
    (config as { schemaVersion?: unknown }).schemaVersion ?? 1,
  );
  await bindWithStoreTx(handle.db)(storeId, async (tx) => {
    await tx.insert(storeConfigs).values({
      id: uuidv7(),
      storeId,
      revision,
      schemaVersion,
      config,
    });
  });
}

export async function truncateAll(owner: DatabaseHandle): Promise<void> {
  // TRUNCATE is not subject to RLS; it is the only way the owner can clean up.
  await owner.db.execute(sql`truncate table domains, stores cascade`);
}

export function unique(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Drizzle wraps driver errors ("Failed query") and keeps the Postgres error in `cause`. */
export async function expectPgError(
  promise: Promise<unknown>,
  pattern: RegExp,
): Promise<void> {
  let caught: unknown;
  try {
    await promise;
  } catch (error) {
    caught = error;
  }
  if (caught === undefined) throw new Error("expected the query to fail");
  const chain: string[] = [];
  for (
    let e = caught as { message?: string; cause?: unknown } | undefined;
    e;
  ) {
    chain.push(String(e.message));
    e = e.cause as typeof e;
  }
  const text = chain.join(" | ");
  if (!pattern.test(text)) {
    throw new Error(`error did not match ${pattern}: ${text}`);
  }
}
