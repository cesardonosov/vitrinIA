import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { kanuwinDemoConfig } from "@/infra/container";
import type { DatabaseHandle } from "@/infra/db/client";
import { bindResolveHost } from "@/infra/db/resolve-host";
import { bindWithStoreTx } from "@/infra/db/with-store-tx";
import { EMPTY_CATALOG } from "@/modules/catalog/application";
import { KANUWIN_CATALOG } from "@/modules/catalog/infrastructure/seed/kanuwin";
import { createSeedCatalogReader } from "@/modules/catalog/infrastructure/seed/seed-catalog";
import { ROPA_PRESET } from "@/modules/store-config/application";
import { createDbStoreConfigReader } from "@/modules/store-config/infrastructure/db-store-config-reader";
import { zodStoreConfigValidator } from "@/modules/store-config/infrastructure/zod/zod-store-config-validator";
import {
  loadStorefront,
  loadStorefrontProduct,
  type StorefrontDeps,
} from "@/modules/storefront/application";
import {
  openAppUser,
  openMigrator,
  type SeededStore,
  seedStore,
  seedStoreConfig,
  truncateAll,
} from "./helpers";

// VIT-181: storefront resolution by host against the real resolve_host(), as app_user.

let app: DatabaseHandle;
let owner: DatabaseHandle;
let A: SeededStore;
let B: SeededStore;
let unverified: SeededStore;
let deps: StorefrontDeps;

beforeAll(() => {
  app = openAppUser();
  owner = openMigrator();
});

afterAll(async () => {
  await truncateAll(owner);
  await app.close();
  await owner.close();
});

beforeEach(async () => {
  await truncateAll(owner);
  A = await seedStore(app, "tienda-a");
  B = await seedStore(app, "tienda-b");
  unverified = await seedStore(app, "tienda-c", { verified: false });
  await seedStoreConfig(app, A.id, kanuwinDemoConfig());
  await seedStoreConfig(app, B.id, ROPA_PRESET);
  await seedStoreConfig(app, unverified.id, ROPA_PRESET);
  const resolve = bindResolveHost(app.db);
  deps = {
    hosts: { resolve },
    configs: createDbStoreConfigReader({
      withStoreTx: bindWithStoreTx(app.db),
      validator: zodStoreConfigValidator,
    }),
    catalog: createSeedCatalogReader(new Map([[A.id, KANUWIN_CATALOG]])),
  };
});

describe("resolve_host through the app pool", () => {
  it("resolves verified hosts, with port and case normalised by the database too", async () => {
    const resolve = bindResolveHost(app.db);
    expect(await resolve(A.host)).toBe(A.id);
    expect(await resolve(`${B.host.toUpperCase()}:3000`)).toBe(B.id);
  });

  it("unknown, unverified and malformed hosts are all undefined", async () => {
    const resolve = bindResolveHost(app.db);
    expect(await resolve("nadie.vitrinia.cl")).toBeUndefined();
    expect(await resolve(unverified.host)).toBeUndefined();
    expect(await resolve("'; select 1; --")).toBeUndefined();
  });
});

describe("loadStorefront", () => {
  it("serves each store on its own host", async () => {
    const a = await loadStorefront(deps, `${A.host}:3000`, A.host);
    expect(a?.storeId).toBe(A.id);
    expect(a?.catalog).toBe(KANUWIN_CATALOG);
    const b = await loadStorefront(deps, B.host, B.host);
    expect(b?.storeId).toBe(B.id);
    expect(b?.catalog).toBe(EMPTY_CATALOG);
  });

  it("refuses a routed host that differs from the request Host", async () => {
    expect(await loadStorefront(deps, A.host, B.host)).toBeUndefined();
  });

  it("404s an unverified store", async () => {
    expect(
      await loadStorefront(deps, unverified.host, unverified.host),
    ).toBeUndefined();
  });

  it("never shows a product of another store", async () => {
    const own = await loadStorefrontProduct(
      deps,
      A.host,
      A.host,
      "mezcla-loros-grandes",
    );
    expect(own?.product.slug).toBe("mezcla-loros-grandes");
    const cross = await loadStorefrontProduct(
      deps,
      B.host,
      B.host,
      "mezcla-loros-grandes",
    );
    expect(cross).toBeUndefined();
  });
});
