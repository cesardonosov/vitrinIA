// Positive control: a port, defined in application and implemented in infrastructure.
import type { Product } from "../domain/product";

export type ProductRepository = { findAll(): Promise<readonly Product[]> };
