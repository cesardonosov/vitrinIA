import type { Catalog, Product } from "./catalog";

/** Mirrors `ProductGridSource` of the Store Config (store-config is not imported by domain/). */
export type ProductSelection = "featured" | "latest" | "all";

function byPosition(a: Product, b: Product): number {
  return a.position - b.position;
}

/**
 * Products a grid shows. `featured` falls back to the full catalog when the
 * seller marked none, so a new store never shows an empty home.
 * `latest` is the reverse of the seller's order until products carry a
 * publication date.
 */
export function selectProducts(
  catalog: Catalog,
  selection: ProductSelection,
  limit: number,
): ReadonlyArray<Product> {
  const ordered = [...catalog.products].sort(byPosition);
  let picked: Product[];
  switch (selection) {
    case "featured": {
      const featured = ordered.filter((p) => p.featured);
      picked = featured.length > 0 ? featured : ordered;
      break;
    }
    case "latest":
      picked = ordered.reverse();
      break;
    case "all":
      picked = ordered;
      break;
  }
  return picked.slice(0, Math.max(0, Math.floor(limit)));
}

export function findProductBySlug(
  catalog: Catalog,
  slug: string,
): Product | undefined {
  return catalog.products.find((p) => p.slug === slug);
}
