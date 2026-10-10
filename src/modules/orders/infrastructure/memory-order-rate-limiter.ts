import {
  createRateLimiter,
  type RateLimiter,
} from "@/infra/security/rate-limit";
import type { OrderRateLimiter } from "../application";

export interface OrderRateLimitOptions {
  /** Orders per client address and store in `clientWindowMs` (threat model orders O12). */
  readonly clientLimit?: number;
  readonly clientWindowMs?: number;
  /** Orders per store per day: protects the GMV metric and the database. */
  readonly storeDailyQuota?: number;
  readonly now?: () => number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * In-process fixed-window limits (risk R2 accepted: one process, and the address is only as
 * good as the transport's). The store quota is checked first so a flood from many addresses
 * cannot be hidden by per-address buckets; a request refused by the client limit does not
 * spend the store's quota.
 */
export function createMemoryOrderRateLimiter(
  options: OrderRateLimitOptions = {},
): OrderRateLimiter {
  const now = options.now ?? Date.now;
  const perClient: RateLimiter = createRateLimiter({
    limit: options.clientLimit ?? 5,
    windowMs: options.clientWindowMs ?? 10 * 60 * 1000,
  });
  const perStore: RateLimiter = createRateLimiter({
    limit: options.storeDailyQuota ?? 300,
    windowMs: DAY_MS,
  });
  return {
    check(storeId, clientKey) {
      const t = now();
      if (!perClient.allow(`${storeId}|${clientKey}`, t)) return "client_limit";
      if (!perStore.allow(storeId, t)) return "store_quota";
      return "allowed";
    },
  };
}
