import { type DomainError, domainError } from "@/shared/kernel";

/**
 * Business failures of the orders module. None of them carries a value that came from the
 * buyer: only field paths and fixed codes, so an error can be logged or returned as is
 * (threat model orders O14).
 */

export interface OrderIssue {
  /** Dotted path of the field, e.g. `contact.phone` or `items`. */
  readonly path: string;
  /** Fixed reason code, e.g. `required`, `invalid`, `too_long`. */
  readonly code: string;
}

export type InvalidOrder = DomainError<"InvalidOrder"> & {
  readonly issues: ReadonlyArray<OrderIssue>;
};

/** Variant of another store, unpublished or missing: one answer for all (O4). */
export type ItemUnavailable = DomainError<"ItemUnavailable">;

/** Unknown host, unpublished store or store without a WhatsApp: one answer for all (O7). */
export type StoreNotFound = DomainError<"StoreNotFound">;

export type RateLimited = DomainError<"RateLimited">;
export type HumanVerificationFailed = DomainError<"HumanVerificationFailed">;
export type IdempotencyConflict = DomainError<"IdempotencyConflict">;

export type PlaceOrderError =
  | InvalidOrder
  | ItemUnavailable
  | StoreNotFound
  | RateLimited
  | HumanVerificationFailed
  | IdempotencyConflict;

export function invalidOrder(issues: ReadonlyArray<OrderIssue>): InvalidOrder {
  return Object.freeze({
    ...domainError("InvalidOrder", "The order data is not valid"),
    issues: Object.freeze([...issues]),
  });
}

export function itemUnavailable(): ItemUnavailable {
  return domainError("ItemUnavailable", "An item is not available");
}

export function storeNotFound(): StoreNotFound {
  return domainError("StoreNotFound", "Store not found");
}

export function rateLimited(): RateLimited {
  return domainError("RateLimited", "Too many orders, try again later");
}

export function humanVerificationFailed(): HumanVerificationFailed {
  return domainError(
    "HumanVerificationFailed",
    "Human verification did not pass",
  );
}

export function idempotencyConflict(): IdempotencyConflict {
  return domainError(
    "IdempotencyConflict",
    "The idempotency key was already used with a different order",
  );
}
