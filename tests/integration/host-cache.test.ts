import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { DatabaseHandle } from "@/infra/db/client";
import { bindResolveHost } from "@/infra/db/resolve-host";
import { bindWithStoreTx, type WithStoreTx } from "@/infra/db/with-store-tx";
import { uuidv7 } from "@/infra/uuid-v7";
import { EMPTY_CATALOG } from "@/modules/catalog/application";
import { AVES_PRESET, ROPA_PRESET } from "@/modules/store-config/application";
import { createDbStoreConfigReader } from "@/modules/store-config/infrastructure/db-store-config-reader";
import { domains } from "@/modules/store-config/infrastructure/schema";
import { zodStoreConfigValidator } from "@/modules/store-config/infrastructure/zod/zod-store-config-validator";
import {
  loadStorefront,
  type StorefrontDeps,
} from "@/modules/storefront/application";
import {
  type CachedHostResolver,
  createCachedHostResolver,
  MAX_HOST_CACHE_TTL_MS,
} from "@/modules/storefront/infrastructure/cached-store-host-resolver";
import {
  openAppUser,
  openMigrator,
  type SeededStore,
  seedStore,
  seedStoreConfig,
  truncateAll,
  unique,
} from "./helpers";

// VIT-192: host cache in front of the real resolve_host(), as app_user (threat model C12).

let app: DatabaseHandle;
let owner: DatabaseHandle;
let withStoreTx: WithStoreTx;
let A: SeededStore;
let B: SeededStore;
let now: number;
let cache: CachedHostResolver;
let deps: StorefrontDeps;

beforeAll(() => {
  app = openAppUser();
  owner = openMigrator();
  withStoreTx = bindWithStoreTx(app.db);
});

afterAll(async () => {
  await truncateAll(owner);
  await app.close();
  await owner.close();
});

beforeEach(async () => {
  await truncateAll(owner);
  A = await seedStore(app, unique("hc-a"));
  B = await seedStore(app, unique("hc-b"));
  await seedStoreConfig(app, A.id, AVES_PRESET);
  await seedStoreConfig(app, B.id, ROPA_PRESET);
  now = 1_000_000;
  cache = createCachedHostResolver(
    { resolve: bindResolveHost(app.db) },
    { now: () => now },
  );
  deps = {
    hosts: cache,
    configs: createDbStoreConfigReader({
      withStoreTx,
      validator: zodStoreConfigValidator,
    }),
    catalog: { getCatalog: async () => EMPTY_CATALOG },
  };
});

/** What a "reassign the host to another store" use case does, minus the invalidation. */
async function moveHost(from: SeededStore, to: SeededStore) {
  await withStoreTx(from.id, (tx) =>
    tx.delete(domains).where(eq(domains.host, from.host)),
  );
  await withStoreTx(to.id, (tx) =>
    tx.insert(domains).values({
      id: uuidv7(),
      storeId: to.id,
      host: from.host,
      verifiedAt: new Date(),
    }),
  );
}

describe("host cache against the real resolve_host()", () => {
  it("serves each host its own store, from memory the second time", async () => {
    expect(await cache.resolve(A.host)).toBe(A.id);
    expect(await cache.resolve(B.host)).toBe(B.id);
    // Drop the row behind the cache: the cached answers survive until TTL or invalidation.
    await withStoreTx(A.id, (tx) =>
      tx.delete(domains).where(eq(domains.host, A.host)),
    );
    expect(await cache.resolve(A.host)).toBe(A.id);
    expect(await cache.resolve(B.host)).toBe(B.id);
  });

  it("C12: after a reassignment the host serves the new store once invalidated, never the old one", async () => {
    expect((await loadStorefront(deps, A.host, A.host))?.storeId).toBe(A.id);

    await moveHost(A, B);
    cache.invalidateHost(A.host);

    const afterMove = await loadStorefront(deps, A.host, A.host);
    expect(afterMove?.storeId).toBe(B.id);
    expect(afterMove?.config).toEqual(ROPA_PRESET); // B's config, not A's
  });

  it("C12: without an invalidation the old answer ends within the TTL", async () => {
    expect(await cache.resolve(A.host)).toBe(A.id);
    await moveHost(A, B);
    expect(await cache.resolve(A.host)).toBe(A.id); // stale inside the window
    now += MAX_HOST_CACHE_TTL_MS;
    expect(await cache.resolve(A.host)).toBe(B.id);
  });

  it("a released host 404s after invalidation and a store invalidation drops all of its hosts", async () => {
    await cache.resolve(A.host);
    await withStoreTx(A.id, (tx) =>
      tx.delete(domains).where(eq(domains.host, A.host)),
    );
    cache.invalidateStore(A.id);
    expect(await loadStorefront(deps, A.host, A.host)).toBeUndefined();
    expect((await loadStorefront(deps, B.host, B.host))?.storeId).toBe(B.id);
  });

  it("an unverified host stays unresolved, then resolves once verified and invalidated", async () => {
    const pending = await seedStore(app, unique("hc-new"), { verified: false });
    expect(await cache.resolve(pending.host)).toBeUndefined();

    await withStoreTx(pending.id, (tx) =>
      tx
        .update(domains)
        .set({ verifiedAt: new Date() })
        .where(eq(domains.host, pending.host)),
    );
    cache.invalidateHost(pending.host);
    expect(await cache.resolve(pending.host)).toBe(pending.id);
  });

  it("a host that is not canonical is never answered from another host's entry", async () => {
    expect(await cache.resolve(A.host)).toBe(A.id);
    // The database normalises these too, but the cache must not be the one to decide.
    expect(await cache.resolve(`${A.host.toUpperCase()}:3000`)).toBe(A.id);
    expect(cache.size()).toEqual({ resolved: 1, unresolved: 0 });
    expect(await cache.resolve(`x.${A.host}`)).toBeUndefined();
    expect(await cache.resolve("nadie.vitrinia.cl")).toBeUndefined();
  });
});
