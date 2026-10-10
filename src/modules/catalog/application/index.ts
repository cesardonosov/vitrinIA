/**
 * Public surface of the catalog module (ADR-0008: the only file other
 * modules may import).
 */

export type {
  Catalog,
  Category,
  NutritionFact,
  Product,
  ProductImage,
  Variant,
} from "../domain/catalog";
export { EMPTY_CATALOG } from "../domain/catalog";
export type { ProductNotFound } from "../domain/errors";
export { createPrice, type InvalidPrice, lowestPrice } from "../domain/price";
export {
  findProductBySlug,
  type ProductSelection,
  selectProducts,
} from "../domain/selection";
export type { CatalogReader } from "./ports/catalog-reader";
export {
  type CatalogDeps,
  getStorefrontCatalog,
  getStorefrontProduct,
} from "./storefront-catalog";
