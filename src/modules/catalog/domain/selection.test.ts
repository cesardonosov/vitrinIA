import { describe, expect, it } from "vitest";
import { findProductBySlug, selectProducts } from "./selection";
import { testCatalog, testProduct } from "./test-catalog";

const catalog = testCatalog([
  testProduct({ slug: "c", position: 2 }),
  testProduct({ slug: "a", position: 0, featured: true }),
  testProduct({ slug: "b", position: 1 }),
  testProduct({ slug: "d", position: 3, featured: true }),
]);

const slugs = (ps: ReadonlyArray<{ slug: string }>) => ps.map((p) => p.slug);

describe("selectProducts", () => {
  it("all: seller order", () => {
    expect(slugs(selectProducts(catalog, "all", 10))).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("featured: only featured, in order", () => {
    expect(slugs(selectProducts(catalog, "featured", 10))).toEqual(["a", "d"]);
  });

  it("featured: falls back to everything when none is featured", () => {
    const plain = testCatalog([testProduct({ slug: "x" })]);
    expect(slugs(selectProducts(plain, "featured", 10))).toEqual(["x"]);
  });

  it("latest: reverse order", () => {
    expect(slugs(selectProducts(catalog, "latest", 2))).toEqual(["d", "c"]);
  });

  it("applies the limit and never a negative one", () => {
    expect(selectProducts(catalog, "all", 1)).toHaveLength(1);
    expect(selectProducts(catalog, "all", -3)).toHaveLength(0);
  });

  it("does not mutate the catalog", () => {
    selectProducts(catalog, "latest", 10);
    expect(slugs(catalog.products)).toEqual(["c", "a", "b", "d"]);
  });
});

describe("findProductBySlug", () => {
  it("finds by exact slug", () => {
    expect(findProductBySlug(catalog, "b")?.slug).toBe("b");
    expect(findProductBySlug(catalog, "B")).toBeUndefined();
  });
});
