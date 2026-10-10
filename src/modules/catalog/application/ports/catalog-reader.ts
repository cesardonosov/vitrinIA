import type { StoreId } from "@/shared/kernel";
import type { Catalog } from "../../domain/catalog";

/**
 * Read side of the catalog. Implementations return only the products of
 * `storeId` (and `EMPTY_CATALOG` for an unknown store); RLS enforces the same
 * rule again in the database adapter (VIT-183).
 */
export interface CatalogReader {
  getCatalog(storeId: StoreId): Promise<Catalog>;
}
