import { describe, expect, it } from "vitest";
import { type Catalog, EMPTY_CATALOG } from "@/modules/catalog/application";
import { AVES_PRESET } from "@/modules/store-config/application";
import { Result, StoreId } from "@/shared/kernel";
import {
  loadStorefront,
  loadStorefrontProduct,
  type StorefrontDeps,
} from "./load-storefront";

function id(raw: string): StoreId {
  const parsed = StoreId.parse(raw);
  if (Result.isErr(parsed)) throw new Error("bad id");
  return parsed.value;
}

const A = id("0199d0a0-0000-7000-8000-00000000000a");
const NO_CONFIG = id("0199d0a0-0000-7000-8000-00000000000b");

const catalog = {
  categories: [],
  products: [{ slug: "p", id: "p" }],
} as unknown as Catalog;

const deps: StorefrontDeps = {
  hosts: {
    async resolve(host) {
      if (host === "a.vitrinia.cl") return A;
      if (host === "b.vitrinia.cl") return NO_CONFIG;
      return undefined;
    },
  },
  configs: {
    async getConfig(storeId) {
      return StoreId.equals(storeId, A) ? AVES_PRESET : undefined;
    },
  },
  catalog: {
    async getCatalog(storeId) {
      return StoreId.equals(storeId, A) ? catalog : EMPTY_CATALOG;
    },
  },
};

describe("loadStorefront", () => {
  it("loads config and catalog for the request host", async () => {
    const s = await loadStorefront(deps, "A.vitrinia.cl:443", "a.vitrinia.cl");
    expect(s?.storeId).toBe(A);
    expect(s?.config).toBe(AVES_PRESET);
    expect(s?.catalog).toBe(catalog);
  });

  it.each([
    [null, "a.vitrinia.cl"],
    ["a.vitrinia.cl", "b.vitrinia.cl"],
    ["x.vitrinia.cl", "x.vitrinia.cl"],
    ["b.vitrinia.cl", "b.vitrinia.cl"],
    ["bad host", "bad host"],
  ])("is undefined for Host %j routed as %j", async (host, routed) => {
    expect(await loadStorefront(deps, host, routed)).toBeUndefined();
  });
});

describe("loadStorefrontProduct", () => {
  it("finds the product of the resolved store", async () => {
    const r = await loadStorefrontProduct(
      deps,
      "a.vitrinia.cl",
      "a.vitrinia.cl",
      "p",
    );
    expect(r?.product.slug).toBe("p");
  });

  it("is undefined for an unknown slug or store", async () => {
    expect(
      await loadStorefrontProduct(deps, "a.vitrinia.cl", "a.vitrinia.cl", "zz"),
    ).toBeUndefined();
    expect(
      await loadStorefrontProduct(deps, "x.vitrinia.cl", "x.vitrinia.cl", "p"),
    ).toBeUndefined();
  });
});
