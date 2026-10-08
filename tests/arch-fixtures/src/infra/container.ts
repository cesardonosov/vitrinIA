// Positive control: the composition root wires adapters of several modules.
import { drizzleProductRepository } from "@/modules/catalog/infrastructure/drizzle-product-repository";
import type { StoreId } from "@/shared/kernel";

export const container = {
  productRepository: drizzleProductRepository,
  storeId: "" as StoreId,
};
