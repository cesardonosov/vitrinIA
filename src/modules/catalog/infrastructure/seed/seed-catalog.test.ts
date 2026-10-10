import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { Result, StoreId } from "@/shared/kernel";
import { EMPTY_CATALOG } from "../../application";
import {
  KANUWIN_CATALOG,
  KANUWIN_DEMO_STORE_ID,
  KANUWIN_WHATSAPP,
} from "./kanuwin";
import seed from "./kanuwin.json" with { type: "json" };
import {
  createSeedCatalogReader,
  parseSeedCatalog,
  type SeedCatalogFile,
} from "./seed-catalog";

const publicDir = fileURLToPath(
  new URL("../../../../../public", import.meta.url),
);

describe("Kanuwiñ seed catalog", () => {
  it("has 5 categories, 5 products and 7 variants", () => {
    expect(KANUWIN_CATALOG.categories).toHaveLength(5);
    expect(KANUWIN_CATALOG.products).toHaveLength(5);
    const variants = KANUWIN_CATALOG.products.flatMap((p) => p.variants);
    expect(variants).toHaveLength(7);
  });

  it("keeps the confirmed PVP prices in CLP", () => {
    const prices = Object.fromEntries(
      KANUWIN_CATALOG.products.flatMap((p) =>
        p.variants.map((v) => [`${p.slug} ${v.label}`, v.price.amount]),
      ),
    );
    expect(prices).toEqual({
      "mezcla-pequenas-psitacidas 1,2 kg": 8900,
      "mezcla-pequenas-psitacidas 600 g": 4900,
      "mezcla-passeriformes 1,2 kg": 8900,
      "mezcla-passeriformes 600 g": 4900,
      "mezcla-loros-grandes 800 g": 15500,
      "mezcla-insectivoros Doypack 1,1 kg": 10600,
      "snack-de-gusanos 200 g": 9300,
    });
  });

  it("every image exists in public/ and the provisional ones are flagged", () => {
    for (const p of KANUWIN_CATALOG.products) {
      expect(p.image, p.slug).toBeDefined();
      expect(existsSync(`${publicDir}${p.image?.src}`), p.slug).toBe(true);
    }
    const provisional = KANUWIN_CATALOG.products
      .filter((p) => p.image?.provisional)
      .map((p) => p.slug);
    expect(provisional).toEqual(["mezcla-insectivoros", "snack-de-gusanos"]);
  });

  it("variant ids are unique", () => {
    const ids = KANUWIN_CATALOG.products.flatMap((p) =>
      p.variants.map((v) => v.id),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is frozen", () => {
    expect(Object.isFrozen(KANUWIN_CATALOG.products[0])).toBe(true);
    expect(Object.isFrozen(KANUWIN_CATALOG.products[0]?.variants)).toBe(true);
  });

  it("only carries the store's public WhatsApp, no personal contact from the PDF", () => {
    expect(KANUWIN_WHATSAPP).toMatch(/^\+569\d{8}$/);
    const text = JSON.stringify(seed);
    expect(text).not.toMatch(/@[a-z0-9-]+\.[a-z]/i);
    expect(text.match(/\+569\d{8}/g)).toEqual([KANUWIN_WHATSAPP]);
  });
});

describe("parseSeedCatalog", () => {
  const product: SeedCatalogFile["products"][number] = {
    slug: "p",
    name: "P",
    category: "c",
    shortDescription: "",
    variants: [{ label: "1", priceClp: 100, currency: "CLP" }],
  };
  const base: SeedCatalogFile = {
    categories: [{ id: "c", name: "C", position: 0 }],
    products: [product],
  };

  it("rejects unknown categories, empty variants, bad prices and missing images", () => {
    const bad =
      (override: Partial<SeedCatalogFile["products"][number]>) => () =>
        parseSeedCatalog(
          { ...base, products: [{ ...product, ...override }] },
          {},
        );
    expect(bad({ category: "nope" })).toThrow(/category/);
    expect(bad({ variants: [] })).toThrow(/variants/);
    expect(
      bad({ variants: [{ label: "x", priceClp: 0, currency: "CLP" }] }),
    ).toThrow(/price/);
    expect(bad({ image: { file: "missing.png" } })).toThrow(/image/);
  });
});

describe("createSeedCatalogReader", () => {
  it("serves a catalog only to its own store", async () => {
    const other = StoreId.parse("0199d0a0-0000-7000-8000-0000000000ff");
    if (Result.isErr(other)) throw new Error("bad id");
    const reader = createSeedCatalogReader(
      new Map([[KANUWIN_DEMO_STORE_ID, KANUWIN_CATALOG]]),
    );
    expect(await reader.getCatalog(KANUWIN_DEMO_STORE_ID)).toBe(
      KANUWIN_CATALOG,
    );
    expect(await reader.getCatalog(other.value)).toBe(EMPTY_CATALOG);
  });
});
