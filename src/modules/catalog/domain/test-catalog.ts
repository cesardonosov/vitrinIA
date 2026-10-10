import { Money, Result } from "@/shared/kernel";
import type { Catalog, Product } from "./catalog";

/** Test helper: minimal valid product. Not exported by the module. */
export function testProduct(
  overrides: Partial<Product> & Pick<Product, "slug">,
): Product {
  const price = Money.of(1000, "CLP");
  if (Result.isErr(price)) throw new Error("bad test money");
  return {
    id: overrides.slug,
    name: overrides.slug,
    categoryId: "cat",
    position: 0,
    featured: false,
    shortDescription: "",
    highlights: [],
    nutrition: [],
    variants: [
      { id: `${overrides.slug}--1`, label: "1 kg", price: price.value },
    ],
    ...overrides,
  };
}

export function testCatalog(products: Product[]): Catalog {
  return { categories: [{ id: "cat", name: "Cat", position: 0 }], products };
}
