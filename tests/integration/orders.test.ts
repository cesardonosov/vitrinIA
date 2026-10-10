import { count, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { DatabaseHandle } from "@/infra/db/client";
import { bindResolveHost } from "@/infra/db/resolve-host";
import { bindWithStoreTx, type WithStoreTx } from "@/infra/db/with-store-tx";
import { uuidv7 } from "@/infra/uuid-v7";
import { createDbCatalogReader } from "@/modules/catalog/infrastructure/db-catalog-reader";
import { insertCatalog } from "@/modules/catalog/infrastructure/db-catalog-writer";
import { KANUWIN_CATALOG } from "@/modules/catalog/infrastructure/seed/kanuwin";
import { type PlaceOrderDeps, placeOrder } from "@/modules/orders/application";
import { config } from "@/modules/orders/application/test-deps.spec";
import { newOrderCode } from "@/modules/orders/infrastructure/crypto-code";
import { createDbOrderRepository } from "@/modules/orders/infrastructure/db-order-repository";
import { createMemoryOrderRateLimiter } from "@/modules/orders/infrastructure/memory-order-rate-limiter";
import {
  orderContacts,
  orderItems,
  orders,
} from "@/modules/orders/infrastructure/schema";
import { createStaticStoreConfigReader } from "@/modules/store-config/infrastructure/static-store-config-reader";
import { Result, type StoreId } from "@/shared/kernel";
import {
  openAppUser,
  openMigrator,
  type SeededStore,
  seedStore,
  truncateAll,
  unique,
} from "./helpers";

/**
 * placeOrder against the real database (VIT-186): the Drizzle adapters, RLS and the
 * constraints together. Threat model orders O1, O4, O7, O9, O11, O12, O14, O22.
 */

let app: DatabaseHandle;
let owner: DatabaseHandle;
let withStoreTx: WithStoreTx;
let A: SeededStore;
let B: SeededStore;
let variantsA: string[];
let variantsB: string[];
let deps: PlaceOrderDeps;
const logs: string[] = [];

const zone = {
  type: "delivery",
  zone: "Región Metropolitana",
  address: {
    region: "Región Metropolitana de Santiago",
    commune: "Ñuñoa",
    street: "Calle Centinela 123",
  },
} as const;

function input(
  host: string,
  lines: Array<{ variantId: string; quantity: number }>,
  overrides: Record<string, unknown> = {},
) {
  return {
    host,
    clientKey: unique("ip"),
    idempotencyKey: uuidv7(),
    humanToken: "tok",
    request: {
      lines,
      delivery: zone,
      contact: {
        name: "Comprador Centinela",
        phone: "9 0000 0000",
        email: "comprador-centinela@ejemplo.cl",
        note: "Nota centinela",
      },
    },
    ...overrides,
  };
}

async function variantIds(storeId: StoreId): Promise<string[]> {
  const catalog = await createDbCatalogReader(withStoreTx).getCatalog(storeId);
  return catalog.products.flatMap((p) => p.variants.map((v) => v.id));
}

async function countRows(storeId: StoreId) {
  return withStoreTx(storeId, async (tx) => ({
    orders: (await tx.select({ n: count() }).from(orders))[0]?.n ?? 0,
    items: (await tx.select({ n: count() }).from(orderItems))[0]?.n ?? 0,
    contacts: (await tx.select({ n: count() }).from(orderContacts))[0]?.n ?? 0,
  }));
}

beforeAll(async () => {
  app = openAppUser(12);
  owner = openMigrator();
  await truncateAll(owner);
  withStoreTx = bindWithStoreTx(app.db);
  A = await seedStore(app, unique("ord-a"));
  B = await seedStore(app, unique("ord-b"));
  await insertCatalog(withStoreTx, A.id, KANUWIN_CATALOG);
  await insertCatalog(withStoreTx, B.id, KANUWIN_CATALOG);
  variantsA = await variantIds(A.id);
  variantsB = await variantIds(B.id);
  const resolve = bindResolveHost(app.db);
  deps = {
    hosts: { resolve },
    configs: createStaticStoreConfigReader(
      new Map([
        [A.id, config()],
        [B.id, config()],
      ]),
    ),
    catalog: createDbCatalogReader(withStoreTx),
    orders: createDbOrderRepository({ withStoreTx, newCode: newOrderCode }),
    verifier: { verify: async () => true },
    limiter: createMemoryOrderRateLimiter(),
    log: {
      info: (e, f) => logs.push(JSON.stringify({ e, f })),
      warn: (e, f) => logs.push(JSON.stringify({ e, f })),
    },
  };
});

afterAll(async () => {
  await truncateAll(owner);
  await app.close();
  await owner.close();
});

function ok<T>(r: Result<T, unknown>): T {
  if (!Result.isOk(r))
    throw new Error(`expected ok, got ${JSON.stringify(r.error)}`);
  return r.value;
}

describe("placeOrder against Postgres", () => {
  it("saves header, items and contact priced from the catalog (O1)", async () => {
    const lines = [{ variantId: variantsA[0] ?? "", quantity: 2 }];
    const placed = ok(await placeOrder(deps, input(A.host, lines)));
    const catalog = await createDbCatalogReader(withStoreTx).getCatalog(A.id);
    const unit =
      catalog.products
        .flatMap((p) => p.variants)
        .find((v) => v.id === lines[0]?.variantId)?.price.amount ?? 0;
    expect(placed.subtotalClp).toBe(unit * 2);
    expect(placed.totalClp).toBe(placed.subtotalClp + placed.shippingClp);
    expect(placed.code).toMatch(/^[A-Z2-9]{7}$/);

    const rows = await withStoreTx(A.id, async (tx) => ({
      order: (
        await tx.select().from(orders).where(eq(orders.code, placed.code))
      )[0],
      contact: (await tx.select().from(orderContacts))[0],
    }));
    expect(rows.order?.status).toBe("intent");
    expect(rows.order?.channel).toBe("whatsapp");
    expect(rows.contact?.phone).toBe("+56900000000");
    expect(rows.contact?.street).toBe("Calle Centinela 123");
  });

  it("the message comes from the saved order and has the seller's number", async () => {
    const placed = ok(
      await placeOrder(
        deps,
        input(A.host, [{ variantId: variantsA[1] ?? "", quantity: 1 }]),
      ),
    );
    expect(
      placed.whatsappUrl.startsWith("https://wa.me/56912345678?text="),
    ).toBe(true);
    const text = decodeURIComponent(
      placed.whatsappUrl.split("?text=")[1] ?? "",
    );
    expect(text).toContain(`Código del pedido: ${placed.code}`);
    expect(text).toContain("Nombre: Comprador Centinela");
  });

  it("10 concurrent submits with one key create exactly one order (O11)", async () => {
    const before = await countRows(A.id);
    const key = uuidv7();
    const lines = [{ variantId: variantsA[2] ?? "", quantity: 1 }];
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        placeOrder(deps, input(A.host, lines, { idempotencyKey: key })),
      ),
    );
    const placed = results.map(ok);
    expect(new Set(placed.map((p) => p.code)).size).toBe(1);
    expect(placed.filter((p) => !p.replayed)).toHaveLength(1);
    const after = await countRows(A.id);
    expect(after.orders - before.orders).toBe(1);
    expect(after.items - before.items).toBe(1);
    expect(after.contacts - before.contacts).toBe(1);
  });

  it("the same key with another cart is IdempotencyConflict and creates nothing", async () => {
    const key = uuidv7();
    ok(
      await placeOrder(
        deps,
        input(A.host, [{ variantId: variantsA[0] ?? "", quantity: 1 }], {
          idempotencyKey: key,
        }),
      ),
    );
    const before = await countRows(A.id);
    const r = await placeOrder(
      deps,
      input(A.host, [{ variantId: variantsA[0] ?? "", quantity: 2 }], {
        idempotencyKey: key,
      }),
    );
    expect(Result.isErr(r) && r.error.code).toBe("IdempotencyConflict");
    expect(await countRows(A.id)).toEqual(before);
  });

  it("a key of store A used in store B is an independent order", async () => {
    const key = uuidv7();
    const a = ok(
      await placeOrder(
        deps,
        input(A.host, [{ variantId: variantsA[0] ?? "", quantity: 1 }], {
          idempotencyKey: key,
        }),
      ),
    );
    const b = ok(
      await placeOrder(
        deps,
        input(B.host, [{ variantId: variantsB[0] ?? "", quantity: 1 }], {
          idempotencyKey: key,
        }),
      ),
    );
    expect(b.replayed).toBe(false);
    expect(a.code).not.toBe(b.code);
  });

  it("a variant of store B from host A is ItemUnavailable, as a random id, with 0 rows in A and B (O4)", async () => {
    const beforeA = await countRows(A.id);
    const beforeB = await countRows(B.id);
    const foreign = await placeOrder(
      deps,
      input(A.host, [{ variantId: variantsB[0] ?? "", quantity: 1 }]),
    );
    const random = await placeOrder(
      deps,
      input(A.host, [{ variantId: uuidv7(), quantity: 1 }]),
    );
    expect(JSON.stringify(foreign)).toBe(JSON.stringify(random));
    expect(Result.isErr(foreign) && foreign.error.code).toBe("ItemUnavailable");
    expect(await countRows(A.id)).toEqual(beforeA);
    expect(await countRows(B.id)).toEqual(beforeB);
  });

  it("an unknown host and an unverified one are StoreNotFound (O7)", async () => {
    const unverified = await seedStore(app, unique("ord-un"), {
      verified: false,
    });
    const lines = [{ variantId: variantsA[0] ?? "", quantity: 1 }];
    for (const host of ["no-existe.vitrinia.cl", unverified.host]) {
      const r = await placeOrder(deps, input(host, lines));
      expect(Result.isErr(r) && r.error.code).toBe("StoreNotFound");
    }
  });

  it("the 6th order from one client is rate limited and creates no row (O12)", async () => {
    const lines = [{ variantId: variantsA[0] ?? "", quantity: 1 }];
    const clientKey = unique("burst");
    for (let i = 0; i < 5; i++)
      ok(await placeOrder(deps, input(A.host, lines, { clientKey })));
    const before = await countRows(A.id);
    const sixth = await placeOrder(deps, input(A.host, lines, { clientKey }));
    expect(Result.isErr(sixth) && sixth.error.code).toBe("RateLimited");
    expect(await countRows(A.id)).toEqual(before);
  });

  it("logs hold ids and counts, no buyer data (O14)", () => {
    const text = logs.join("\n");
    expect(logs.length).toBeGreaterThan(0);
    for (const sentinel of [
      "comprador-centinela",
      "Centinela",
      "900000000",
      "wa.me",
    ]) {
      expect(text, sentinel).not.toContain(sentinel);
    }
  });
});
