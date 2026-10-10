import { expect, it } from "vitest";
import type { Catalog, Product } from "@/modules/catalog/application";
import { createPrice } from "@/modules/catalog/application";
import type { CatalogReader } from "@/modules/catalog/application/ports/catalog-reader";
import { Result, type StoreId } from "@/shared/kernel";

/**
 * Contract every `CatalogReader` adapter must pass (VIT-183): the seed adapter
 * in unit tests and the database adapter against the test Postgres. Ids are
 * adapter-specific (slugs in the seed, UUID v7 in the database), so the checks
 * compare content and the links between ids, never the ids themselves.
 */

export interface CatalogReaderFixture {
  readonly reader: CatalogReader;
  /** Stores loaded with CATALOG_A and CATALOG_B. */
  readonly storeA: StoreId;
  readonly storeB: StoreId;
  /** A store with nothing loaded. */
  readonly empty: StoreId;
}

function clp(amount: number) {
  const price = createPrice(amount, "CLP");
  if (Result.isErr(price)) throw new Error("bad fixture price");
  return price.value;
}

export const CATALOG_A: Catalog = {
  categories: [
    { id: "a-semillas", name: "Semillas", position: 0 },
    { id: "a-snacks", name: "Snacks", position: 1 },
  ],
  products: [
    {
      id: "a-mezcla",
      slug: "mezcla-canarios",
      name: "Mezcla canarios",
      categoryId: "a-semillas",
      position: 0,
      featured: true,
      shortDescription: "Alpiste y nabo.",
      badge: "Nuevo",
      audience: "Canarios",
      highlights: ["Sin polvo", "Bolsa resellable"],
      nutritionPer: "100 g",
      nutrition: [
        { label: "Proteína", value: "14 g" },
        { label: "Grasa", value: "5 g" },
      ],
      variants: [
        { id: "a-mezcla-1", label: "600 g", price: clp(4900) },
        { id: "a-mezcla-2", label: "1,2 kg", price: clp(8900) },
      ],
      image: {
        src: "/demo/test/mezcla.webp",
        alt: "Bolsa de mezcla",
        width: 800,
        height: 800,
        provisional: false,
      },
    },
    {
      id: "a-gusanos",
      slug: "snack-gusanos",
      name: "Snack de gusanos",
      categoryId: "a-snacks",
      position: 1,
      featured: false,
      shortDescription: "Tenebrio deshidratado.",
      highlights: [],
      nutrition: [],
      variants: [{ id: "a-gusanos-1", label: "200 g", price: clp(9300) }],
    },
  ],
};

export const CATALOG_B: Catalog = {
  categories: [{ id: "b-cat", name: "Semillas", position: 0 }],
  products: [
    {
      id: "b-loros",
      slug: "mezcla-loros",
      name: "Mezcla loros",
      categoryId: "b-cat",
      position: 0,
      featured: false,
      shortDescription: "Para loros grandes.",
      highlights: [],
      nutrition: [],
      variants: [{ id: "b-loros-1", label: "800 g", price: clp(15500) }],
    },
  ],
};

/** Catalog content without ids, with each product's category resolved by name. */
function content(catalog: Catalog) {
  const categoryName = new Map(catalog.categories.map((c) => [c.id, c.name]));
  return {
    categories: catalog.categories.map(({ name, position }) => ({
      name,
      position,
    })),
    products: catalog.products.map(
      ({ id: _id, categoryId, variants, ...rest }: Product) => ({
        ...rest,
        category: categoryName.get(categoryId),
        variants: variants.map(({ label, price }) => ({
          label,
          amount: price.amount,
          currency: price.currency,
        })),
      }),
    ),
  };
}

export function catalogReaderContract(
  setup: () => Promise<CatalogReaderFixture>,
): void {
  it("returns the store's catalog in display order", async () => {
    const { reader, storeA } = await setup();
    expect(content(await reader.getCatalog(storeA))).toEqual(
      content(CATALOG_A),
    );
  });

  it("never mixes catalogs of two stores", async () => {
    const { reader, storeA, storeB } = await setup();
    const b = await reader.getCatalog(storeB);
    expect(content(b)).toEqual(content(CATALOG_B));
    const slugsA = (await reader.getCatalog(storeA)).products.map(
      (p) => p.slug,
    );
    expect(slugsA).not.toContain("mezcla-loros");
  });

  it("returns an empty catalog for a store with nothing loaded", async () => {
    const { reader, empty } = await setup();
    const catalog = await reader.getCatalog(empty);
    expect(catalog.categories).toEqual([]);
    expect(catalog.products).toEqual([]);
  });

  it("links every product to a category of the same catalog and keeps variant ids unique", async () => {
    const { reader, storeA } = await setup();
    const catalog = await reader.getCatalog(storeA);
    const categoryIds = new Set(catalog.categories.map((c) => c.id));
    for (const p of catalog.products) {
      expect(categoryIds.has(p.categoryId), p.slug).toBe(true);
    }
    const variantIds = catalog.products.flatMap((p) =>
      p.variants.map((v) => v.id),
    );
    expect(new Set(variantIds).size).toBe(variantIds.length);
  });
}
