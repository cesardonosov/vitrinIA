// Violates no-cross-module-internals (issue VIT-103 AC2): importing infrastructure/ of another module.
export { drizzleProductRepository } from "../../catalog/infrastructure/drizzle-product-repository";
