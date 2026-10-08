// Positive control: presentation calls use cases and reads the composition root.
import { container } from "@/infra/container";
import { getProducts } from "../application/index";

export const listProductsAction = () =>
  getProducts(container.productRepository, container.storeId);
