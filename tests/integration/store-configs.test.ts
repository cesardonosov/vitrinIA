import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { DatabaseHandle } from "@/infra/db/client";
import { bindWithStoreTx, type WithStoreTx } from "@/infra/db/with-store-tx";
import { uuidv7 } from "@/infra/uuid-v7";
import { AVES_PRESET, ROPA_PRESET } from "@/modules/store-config/application";
import { createDbStoreConfigReader } from "@/modules/store-config/infrastructure/db-store-config-reader";
import { storeConfigs } from "@/modules/store-config/infrastructure/schema";
import { zodStoreConfigValidator } from "@/modules/store-config/infrastructure/zod/zod-store-config-validator";
import type { StoreId } from "@/shared/kernel";
import v0 from "../fixtures/store-config/v0/prototipo-completo.json";
import {
  expectPgError,
  newStoreId,
  openAppUser,
  openMigrator,
  type SeededStore,
  seedStore,
  seedStoreConfig,
  truncateAll,
  unique,
} from "./helpers";

// VIT-191: Store Config persisted per store. Everything runs as app_user (no BYPASSRLS).

let app: DatabaseHandle;
let owner: DatabaseHandle;
let withStoreTx: WithStoreTx;
let A: SeededStore;
let B: SeededStore;
let invalidReports: Array<{ storeId: StoreId; code: string }>;
let reader: ReturnType<typeof createDbStoreConfigReader>;

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
  A = await seedStore(app, unique("cfg-a"));
  B = await seedStore(app, unique("cfg-b"));
  invalidReports = [];
  reader = createDbStoreConfigReader({
    withStoreTx,
    validator: zodStoreConfigValidator,
    onInvalid: (storeId, error) =>
      invalidReports.push({ storeId, code: error.code }),
  });
});

describe("DbStoreConfigReader", () => {
  it("serves each store its own config and nothing of the other", async () => {
    await seedStoreConfig(app, A.id, AVES_PRESET);
    await seedStoreConfig(app, B.id, ROPA_PRESET);
    expect(await reader.getConfig(A.id)).toEqual(AVES_PRESET);
    expect(await reader.getConfig(B.id)).toEqual(ROPA_PRESET);
  });

  it("is undefined for a store without config and for an unknown store", async () => {
    expect(await reader.getConfig(A.id)).toBeUndefined();
    expect(await reader.getConfig(newStoreId())).toBeUndefined();
    expect(invalidReports).toEqual([]);
  });

  it("serves the highest revision", async () => {
    await seedStoreConfig(app, A.id, ROPA_PRESET, 1);
    await seedStoreConfig(app, A.id, AVES_PRESET, 2);
    expect(await reader.getConfig(A.id)).toEqual(AVES_PRESET);
  });

  it("does not publish an invalid config: undefined, reported by code, no fallback to an older revision", async () => {
    await seedStoreConfig(app, A.id, ROPA_PRESET, 1);
    // Parses as JSON and as the CHECK shape, but the strict schema refuses an unknown key.
    await seedStoreConfig(
      app,
      A.id,
      { ...ROPA_PRESET, html: "<script>alert(1)</script>" },
      2,
    );
    expect(await reader.getConfig(A.id)).toBeUndefined();
    expect(invalidReports).toEqual([
      { storeId: A.id, code: "InvalidStoreConfig" },
    ]);
  });

  it("refuses a colour pair that fails the contrast rule stored by hand", async () => {
    const lowContrast = {
      ...ROPA_PRESET,
      theme: {
        ...ROPA_PRESET.theme,
        colors: { ...ROPA_PRESET.theme.colors, text: "#fefefe" },
      },
    };
    await seedStoreConfig(app, A.id, lowContrast);
    expect(await reader.getConfig(A.id)).toBeUndefined();
  });

  it("migrates an old schemaVersion in memory on read (ADR-0004) and leaves the row alone", async () => {
    await seedStoreConfig(app, A.id, v0);
    const config = await reader.getConfig(A.id);
    expect(config?.schemaVersion).toBe(1);
    expect(config?.identity.name).toBe("Café Ñandú");
    const [row] = await withStoreTx(A.id, (tx) =>
      tx
        .select({ schemaVersion: storeConfigs.schemaVersion })
        .from(storeConfigs),
    );
    expect(row?.schemaVersion).toBe(0);
  });

  it("is undefined for a schemaVersion newer than this build", async () => {
    await seedStoreConfig(app, A.id, { ...ROPA_PRESET, schemaVersion: 99 });
    expect(await reader.getConfig(A.id)).toBeUndefined();
    expect(invalidReports.map((r) => r.code)).toEqual([
      "UnsupportedSchemaVersion",
    ]);
  });
});

describe("store_configs tenancy (app_user)", () => {
  beforeEach(async () => {
    await seedStoreConfig(app, A.id, AVES_PRESET);
    await seedStoreConfig(app, B.id, ROPA_PRESET);
  });

  it("without tenant context there are no rows", async () => {
    const rows = await app.db.select().from(storeConfigs);
    expect(rows).toEqual([]);
  });

  it("with the context of A, a WHERE store_id = B returns nothing", async () => {
    const rows = await withStoreTx(A.id, (tx) =>
      tx.select().from(storeConfigs).where(eq(storeConfigs.storeId, B.id)),
    );
    expect(rows).toEqual([]);
  });

  it("A cannot insert a config for B (WITH CHECK)", async () => {
    await expectPgError(
      withStoreTx(A.id, (tx) =>
        tx.insert(storeConfigs).values({
          id: uuidv7(),
          storeId: B.id,
          revision: 2,
          schemaVersion: 1,
          config: ROPA_PRESET,
        }),
      ),
      /row-level security/,
    );
  });

  it("A cannot overwrite B's config nor move its own row to B", async () => {
    const updated = await withStoreTx(A.id, (tx) =>
      tx
        .update(storeConfigs)
        .set({ config: AVES_PRESET })
        .where(eq(storeConfigs.storeId, B.id))
        .returning({ id: storeConfigs.id }),
    );
    expect(updated).toEqual([]);
    await expectPgError(
      withStoreTx(A.id, (tx) => tx.update(storeConfigs).set({ storeId: B.id })),
      /row-level security/,
    );
    expect(await reader.getConfig(B.id)).toEqual(ROPA_PRESET);
  });

  it("app_user cannot delete or truncate configs", async () => {
    await expectPgError(
      withStoreTx(A.id, (tx) => tx.delete(storeConfigs)),
      /permission denied/,
    );
    await expectPgError(
      app.db.execute(sql`truncate table store_configs`),
      /permission denied/,
    );
  });

  it("the CHECKs refuse a non-object config and a schema_version that disagrees with the document", async () => {
    await expectPgError(
      withStoreTx(A.id, (tx) =>
        tx.insert(storeConfigs).values({
          id: uuidv7(),
          storeId: A.id,
          revision: 5,
          schemaVersion: 1,
          config: [ROPA_PRESET],
        }),
      ),
      /store_configs_config_shape/,
    );
    await expectPgError(
      withStoreTx(A.id, (tx) =>
        tx.insert(storeConfigs).values({
          id: uuidv7(),
          storeId: A.id,
          revision: 6,
          schemaVersion: 2,
          config: ROPA_PRESET,
        }),
      ),
      /store_configs_config_shape/,
    );
  });

  it("a config row needs an existing store (FK) and a UUID v7 id", async () => {
    const ghost = newStoreId();
    await expectPgError(
      withStoreTx(ghost, (tx) =>
        tx.insert(storeConfigs).values({
          id: uuidv7(),
          storeId: ghost,
          revision: 1,
          schemaVersion: 1,
          config: ROPA_PRESET,
        }),
      ),
      /store_configs_store_id_stores_id_fk/,
    );
    await expectPgError(
      withStoreTx(A.id, (tx) =>
        tx.insert(storeConfigs).values({
          id: "11111111-1111-4111-8111-111111111111",
          storeId: A.id,
          revision: 9,
          schemaVersion: 1,
          config: ROPA_PRESET,
        }),
      ),
      /store_configs_id_uuid_v7/,
    );
  });

  it("two revisions with the same number are refused", async () => {
    await expectPgError(
      seedStoreConfig(app, A.id, AVES_PRESET, 1),
      /store_configs_store_id_revision_key/,
    );
  });
});
