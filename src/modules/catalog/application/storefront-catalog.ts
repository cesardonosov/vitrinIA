import { Result, type StoreId } from "@/shared/kernel";
import type { Catalog, Product } from "../domain/catalog";
import { type ProductNotFound, productNotFound } from "../domain/errors";
import { findProductBySlug } from "../domain/selection";
import type { CatalogReader } from "./ports/catalog-reader";

export interface CatalogDeps {
  readonly reader: CatalogReader;
}

/** Whole public catalog of one store, for the storefront home. */
export function getStorefrontCatalog(
  deps: CatalogDeps,
  storeId: StoreId,
): Promise<Catalog> {
  return deps.reader.getCatalog(storeId);
}

/** One product of one store by slug. Another store's slug is "not found" (404, ADR-0003 §5). */
export async function getStorefrontProduct(
  deps: CatalogDeps,
  storeId: StoreId,
  slug: string,
): Promise<Result<Product, ProductNotFound>> {
  const catalog = await deps.reader.getCatalog(storeId);
  const product = findProductBySlug(catalog, slug);
  return product ? Result.ok(product) : Result.err(productNotFound());
}
