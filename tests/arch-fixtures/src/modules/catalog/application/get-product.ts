// Positive control: a use case only sees its own domain, ports and the kernel.
import type { StoreId } from "@/shared/kernel";
import type { ProductRepository } from "./product-repository";

export const getProducts = (repo: ProductRepository, _storeId: StoreId) =>
  repo.findAll();
