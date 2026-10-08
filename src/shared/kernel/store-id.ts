import { type DomainError, domainError } from "./errors";
import { Result } from "./result";
import { isUuidV7 } from "./uuid";

/**
 * StoreId: the tenant identifier every use case must receive and verify (ADR-0003 §5).
 *
 * Branded string so a plain `string` cannot be passed where a `StoreId` is expected.
 * The only way to obtain one is `StoreId.parse`, which validates UUID v7 and
 * normalises to lowercase so equality and RLS comparisons are canonical.
 */
declare const storeIdBrand: unique symbol;

export type StoreId = string & { readonly [storeIdBrand]: "StoreId" };

export type InvalidStoreId = DomainError<"InvalidStoreId">;

function parse(input: unknown): Result<StoreId, InvalidStoreId> {
  if (typeof input !== "string" || !isUuidV7(input)) {
    // The raw input is deliberately left out of the message: it may be attacker-controlled.
    return Result.err(
      domainError("InvalidStoreId", "StoreId must be a UUID v7"),
    );
  }
  return Result.ok(input.toLowerCase() as StoreId);
}

function equals(a: StoreId, b: StoreId): boolean {
  return a === b;
}

export const StoreId = Object.freeze({ parse, equals });
