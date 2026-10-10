import { describe, expect, it } from "vitest";
import { Result, StoreId } from "@/shared/kernel";
import { EMPTY_CATALOG } from "../domain/catalog";
import { testCatalog, testProduct } from "../domain/test-catalog";
import type { CatalogReader } from "./ports/catalog-reader";
import {
  getStorefrontCatalog,
  getStorefrontProduct,
} from "./storefront-catalog";

function id(raw: string): StoreId {
  const parsed = StoreId.parse(raw);
  if (Result.isErr(parsed)) throw new Error("bad test id");
  return parsed.value;
}

const storeA = id("0199d0a0-0000-7000-8000-00000000000a");
const storeB = id("0199d0a0-0000-7000-8000-00000000000b");
const catalogA = testCatalog([testProduct({ slug: "only-in-a" })]);

const reader: CatalogReader = {
  async getCatalog(storeId) {
    return StoreId.equals(storeId, storeA) ? catalogA : EMPTY_CATALOG;
  },
};

describe("getStorefrontCatalog", () => {
  it("returns the catalog of the requested store only", async () => {
    expect(await getStorefrontCatalog({ reader }, storeA)).toBe(catalogA);
    expect(await getStorefrontCatalog({ reader }, storeB)).toBe(EMPTY_CATALOG);
  });
});

describe("getStorefrontProduct", () => {
  it("finds a product of the same store", async () => {
    const r = await getStorefrontProduct({ reader }, storeA, "only-in-a");
    expect(Result.isOk(r) && r.value.slug).toBe("only-in-a");
  });

  it("another store's slug is not found", async () => {
    const r = await getStorefrontProduct({ reader }, storeB, "only-in-a");
    expect(Result.isErr(r) && r.error.code).toBe("ProductNotFound");
    expect(Result.isErr(r) && r.error.message).not.toContain("only-in-a");
  });
});
