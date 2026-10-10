import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { DatabaseHandle } from "@/infra/db/client";
import { bindWithStoreTx, type WithStoreTx } from "@/infra/db/with-store-tx";
import { uuidv7 } from "@/infra/uuid-v7";
import { createDbCatalogReader } from "@/modules/catalog/infrastructure/db-catalog-reader";
import { insertCatalog } from "@/modules/catalog/infrastructure/db-catalog-writer";
import {
  categories,
  products,
  productVariants,
} from "@/modules/catalog/infrastructure/schema";
import { KANUWIN_CATALOG } from "@/modules/catalog/infrastructure/seed/kanuwin";
import {
  CATALOG_A,
  CATALOG_B,
  type CatalogReaderFixture,
  catalogReaderContract,
} from "../contracts/catalog-reader";
import {
  expectPgError,
  openAppUser,
  openMigrator,
  type SeededStore,
  seedStore,
  truncateAll,
  unique,
} from "./helpers";

let app: DatabaseHandle;
let owner: DatabaseHandle;
let withStoreTx: WithStoreTx;
let A: SeededStore;
let B: SeededStore;
let empty: SeededStore;
let fixture: CatalogReaderFixture;

beforeAll(async () => {
  app = openAppUser();
  owner = openMigrator();
  await truncateAll(owner);
  withStoreTx = bindWithStoreTx(app.db);
  A = await seedStore(app, unique("cat-a"));
  B = await seedStore(app, unique("cat-b"));
  empty = await seedStore(app, unique("cat-empty"));
  await insertCatalog(withStoreTx, A.id, CATALOG_A);
  await insertCatalog(withStoreTx, B.id, CATALOG_B);
  fixture = {
    reader: createDbCatalogReader(withStoreTx),
    storeA: A.id,
    storeB: B.id,
    empty: empty.id,
  };
});

afterAll(async () => {
  await truncateAll(owner);
  await app.close();
  await owner.close();
});

describe("database catalog reader: contract", () => {
  catalogReaderContract(async () => fixture);
});

describe("database catalog reader", () => {
  it("hides unpublished products", async () => {
    const store = await seedStore(app, unique("cat-draft"));
    await insertCatalog(withStoreTx, store.id, CATALOG_B, { published: false });
    const catalog = await createDbCatalogReader(withStoreTx).getCatalog(
      store.id,
    );
    expect(catalog.products).toEqual([]);
    expect(catalog.categories).toHaveLength(1);
  });

  it("loads the Kanuwiñ seed with its 7 PVP prices", async () => {
    const store = await seedStore(app, unique("kanuwin"));
    await insertCatalog(withStoreTx, store.id, KANUWIN_CATALOG);
    const catalog = await createDbCatalogReader(withStoreTx).getCatalog(
      store.id,
    );
    expect(catalog.products.map((p) => p.slug)).toEqual(
      KANUWIN_CATALOG.products.map((p) => p.slug),
    );
    expect(
      catalog.products.flatMap((p) => p.variants.map((v) => v.price.amount)),
    ).toEqual(
      KANUWIN_CATALOG.products.flatMap((p) =>
        p.variants.map((v) => v.price.amount),
      ),
    );
  });
});

describe("catalog tables: constraints", () => {
  async function aCategoryOf(storeId: SeededStore["id"]) {
    return withStoreTx(storeId, async (tx) => {
      const [row] = await tx.select({ id: categories.id }).from(categories);
      if (!row) throw new Error("no category");
      return row.id;
    });
  }

  async function aProductOf(storeId: SeededStore["id"]) {
    return withStoreTx(storeId, async (tx) => {
      const [row] = await tx.select({ id: products.id }).from(products);
      if (!row) throw new Error("no product");
      return row.id;
    });
  }

  function newProduct(
    storeId: SeededStore["id"],
    categoryId: string,
    extra: Partial<typeof products.$inferInsert> = {},
  ) {
    return {
      id: uuidv7(),
      storeId,
      categoryId,
      slug: unique("p"),
      name: "Producto",
      shortDescription: "Texto",
      ...extra,
    };
  }

  it("refuses a product that points to another store's category (composite FK)", async () => {
    const foreignCategory = await aCategoryOf(B.id);
    await expectPgError(
      withStoreTx(A.id, (tx) =>
        tx.insert(products).values(newProduct(A.id, foreignCategory)),
      ),
      /products_category_fk/,
    );
  });

  it("refuses a variant that points to another store's product (composite FK)", async () => {
    const foreignProduct = await aProductOf(B.id);
    await expectPgError(
      withStoreTx(A.id, (tx) =>
        tx.insert(productVariants).values({
          id: uuidv7(),
          storeId: A.id,
          productId: foreignProduct,
          label: "1 kg",
          priceClp: 1000,
        }),
      ),
      /product_variants_product_fk/,
    );
  });

  it.each([
    [0, "zero"],
    [-100, "negative"],
    [100_000_001, "above the cap"],
  ])("refuses a price of %i (%s)", async (priceClp) => {
    const productId = await aProductOf(A.id);
    await expectPgError(
      withStoreTx(A.id, (tx) =>
        tx.insert(productVariants).values({
          id: uuidv7(),
          storeId: A.id,
          productId,
          label: unique("v"),
          priceClp,
        }),
      ),
      /product_variants_price_range/,
    );
  });

  it("keeps slugs unique per store but lets two stores share one", async () => {
    const categoryA = await aCategoryOf(A.id);
    const categoryB = await aCategoryOf(B.id);
    await expectPgError(
      withStoreTx(A.id, (tx) =>
        tx
          .insert(products)
          .values(newProduct(A.id, categoryA, { slug: "mezcla-canarios" })),
      ),
      /products_store_id_slug_key/,
    );
    await withStoreTx(B.id, (tx) =>
      tx
        .insert(products)
        .values(newProduct(B.id, categoryB, { slug: "mezcla-canarios" })),
    );
  });

  it.each([
    ["https://evil.example/x.png", "absolute URL"],
    ["//evil.example/x.png", "protocol-relative URL"],
    ["/demo/../etc/passwd", "path traversal"],
    ["/uploads/x.png", "outside /demo and /media"],
    ["javascript:alert(1)", "javascript: URL"],
  ])("refuses image_src %s (%s)", async (imageSrc) => {
    const categoryA = await aCategoryOf(A.id);
    await expectPgError(
      withStoreTx(A.id, (tx) =>
        tx.insert(products).values(
          newProduct(A.id, categoryA, {
            imageSrc,
            imageAlt: "x",
            imageWidth: 10,
            imageHeight: 10,
          }),
        ),
      ),
      /products_image_src_format/,
    );
  });

  it("refuses nutrition that is not a JSON array", async () => {
    const categoryA = await aCategoryOf(A.id);
    await expectPgError(
      withStoreTx(A.id, (tx) =>
        tx
          .insert(products)
          .values(newProduct(A.id, categoryA, { nutrition: { a: 1 } })),
      ),
      /products_nutrition_shape/,
    );
  });

  it("app_user cannot truncate catalog tables", async () => {
    await expectPgError(
      app.db.execute(sql`truncate table product_variants`),
      /permission denied/,
    );
  });
});
