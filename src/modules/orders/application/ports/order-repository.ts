import type { Result, StoreId } from "@/shared/kernel";
import type { IdempotencyConflict } from "../../domain/errors";
import type { OrderDraft, SavedOrder } from "../../domain/order";

export interface PlacedRecord {
  readonly order: SavedOrder;
  /** True when the idempotency key already had this same order (double submit). */
  readonly replayed: boolean;
}

/**
 * Persistence of orders. Every method receives the `StoreId` and works only inside that
 * store (RLS repeats the rule in the database adapter).
 */
export interface OrderRepository {
  /**
   * Saves the order, its items and its contact in ONE transaction, assigning id and a
   * random short code (retrying on a code collision).
   *
   * Idempotency (O11): the same `idempotencyKey` with the same fingerprint returns the
   * order already saved; with another fingerprint it is `IdempotencyConflict`, with no data
   * of the first order. Concurrent calls with one key create exactly one order.
   */
  place(
    storeId: StoreId,
    idempotencyKey: string,
    draft: OrderDraft,
  ): Promise<Result<PlacedRecord, IdempotencyConflict>>;
}
