// Positive control: an adapter may use the platform db helper and its module's ports.
import { withStoreTx } from "@/infra/db/with-store-tx";
import type { ProductRepository } from "../application/product-repository";

export const drizzleProductRepository: ProductRepository = {
  findAll: () => withStoreTx(async () => []),
};
