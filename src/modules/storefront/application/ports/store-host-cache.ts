import type { StoreId } from "@/shared/kernel";

/**
 * Explicit invalidation of the host → store cache (ADR-0003 §1, threat model C12).
 *
 * Every use case that changes what a host means MUST call it after its transaction
 * commits, for EVERY host involved:
 *   - rename a store / change its subdomain: the old host and the new host;
 *   - unpublish or release a host: that host (and the store, if it all goes away);
 *   - reassign a host to another store: the host (the old store's other hosts stay valid);
 *   - verify or add a domain: that host (a negative answer may be cached for a few seconds).
 *
 * The TTL (<= 60 s) is the backstop when an invalidation is missed or happens in
 * another process; it is not a substitute for calling these.
 */
export interface StoreHostCache {
  /** Forgets one host, positive or negative. `host` is normalised the same way as `resolve`. */
  invalidateHost(host: string): void;
  /** Forgets every cached host of a store. */
  invalidateStore(storeId: StoreId): void;
  /** Forgets everything. */
  clear(): void;
}
