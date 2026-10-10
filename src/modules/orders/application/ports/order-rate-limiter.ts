import type { StoreId } from "@/shared/kernel";

export type RateLimitDecision = "allowed" | "client_limit" | "store_quota";

/**
 * Per client and store limit plus a daily quota per store (O12). Counted before the
 * transaction opens. The client key is whatever address the transport trusts.
 */
export interface OrderRateLimiter {
  check(storeId: StoreId, clientKey: string): RateLimitDecision;
}
