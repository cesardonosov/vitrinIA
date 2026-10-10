import { type DomainError, domainError } from "@/shared/kernel";

export type ProductNotFound = DomainError<"ProductNotFound">;

// The slug is left out of the message: it comes from the URL.
export function productNotFound(): ProductNotFound {
  return domainError("ProductNotFound", "Product not found in this store");
}
