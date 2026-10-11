import type { StoreId } from "@/shared/kernel";
import type { StoreHostCache, StoreHostResolver } from "../application";
import { normalizeHost } from "../domain/host";

/** ADR-0003 §1: the cache never keeps an answer longer than this. */
export const MAX_HOST_CACHE_TTL_MS = 60_000;

export interface CachedHostResolverOptions {
  /** Lifetime of a resolved host. Default 30 s; must be in (0, 60 s]. */
  readonly ttlMs?: number;
  /** Lifetime of "this host does not resolve". Default 5 s; must be in (0, ttlMs]. */
  readonly negativeTtlMs?: number;
  /** Bound on resolved hosts. Default 1000. */
  readonly maxEntries?: number;
  /**
   * Bound on unresolved hosts, kept in their own map: anyone can send any Host
   * header, so random hosts may churn this map but can never evict a real store.
   * Default 256.
   */
  readonly maxNegativeEntries?: number;
  /** Clock, injectable for tests. */
  readonly now?: () => number;
}

export interface CachedHostResolver extends StoreHostResolver, StoreHostCache {
  /** Current number of live-or-expired entries (observability and tests). */
  size(): { readonly resolved: number; readonly unresolved: number };
}

function requireRange(name: string, value: number, max: number): void {
  if (!Number.isFinite(value) || value <= 0 || value > max) {
    throw new RangeError(`${name} must be in (0, ${max}]`);
  }
}

/**
 * In-memory host → store cache in front of any `StoreHostResolver` (VIT-192,
 * ADR-0003 §1). Per process, not distributed: with several instances a change is
 * seen by the others after at most `ttlMs`.
 *
 * Rules that keep it from serving one store's data to another host:
 *  - the key is the exact canonical host. A host that `normalizeHost` would change
 *    (case, port, trailing dot, anything unusual) is not cached at all and goes
 *    straight to the inner resolver, so two spellings can never share an entry;
 *  - the value is only a StoreId from the inner resolver for THAT host; there is no
 *    wildcard, suffix or "closest match" lookup;
 *  - a host never seen before is a miss, so a new host cannot inherit an old answer;
 *  - an answer computed while an invalidation happened is not stored (epoch), so a
 *    slow lookup cannot resurrect the mapping that was just invalidated;
 *  - errors from the inner resolver are not cached.
 */
export function createCachedHostResolver(
  inner: StoreHostResolver,
  options: CachedHostResolverOptions = {},
): CachedHostResolver {
  const ttlMs = options.ttlMs ?? 30_000;
  const negativeTtlMs = options.negativeTtlMs ?? 5_000;
  const maxEntries = options.maxEntries ?? 1000;
  const maxNegativeEntries = options.maxNegativeEntries ?? 256;
  const now = options.now ?? Date.now;
  requireRange("ttlMs", ttlMs, MAX_HOST_CACHE_TTL_MS);
  requireRange("negativeTtlMs", negativeTtlMs, ttlMs);
  requireRange("maxEntries", maxEntries, 100_000);
  requireRange("maxNegativeEntries", maxNegativeEntries, 100_000);

  const resolved = new Map<
    string,
    { readonly storeId: StoreId; readonly expiresAt: number }
  >();
  const unresolved = new Map<string, number>();
  /** Bumped by every invalidation; a lookup that started before it must not store. */
  let epoch = 0;

  /** Maps keep insertion order, so the first key is the oldest (and the first to expire). */
  function evictOldest(map: Map<string, unknown>, limit: number): void {
    while (map.size >= limit) {
      const oldest = map.keys().next();
      if (oldest.done) return;
      map.delete(oldest.value);
    }
  }

  return {
    async resolve(host) {
      if (normalizeHost(host) !== host) return inner.resolve(host);
      const at = now();

      const hit = resolved.get(host);
      if (hit) {
        if (at < hit.expiresAt) return hit.storeId;
        resolved.delete(host);
      }
      const missUntil = unresolved.get(host);
      if (missUntil !== undefined) {
        if (at < missUntil) return undefined;
        unresolved.delete(host);
      }

      const startedAtEpoch = epoch;
      const storeId = await inner.resolve(host);
      if (epoch !== startedAtEpoch) return storeId;

      const stored = now();
      if (storeId) {
        unresolved.delete(host);
        resolved.delete(host);
        evictOldest(resolved, maxEntries);
        resolved.set(host, { storeId, expiresAt: stored + ttlMs });
      } else {
        resolved.delete(host);
        unresolved.delete(host);
        evictOldest(unresolved, maxNegativeEntries);
        unresolved.set(host, stored + negativeTtlMs);
      }
      return storeId;
    },

    invalidateHost(host) {
      epoch += 1;
      const key = normalizeHost(host);
      if (!key) return;
      resolved.delete(key);
      unresolved.delete(key);
    },

    invalidateStore(storeId) {
      epoch += 1;
      for (const [host, entry] of resolved) {
        if (entry.storeId === storeId) resolved.delete(host);
      }
    },

    clear() {
      epoch += 1;
      resolved.clear();
      unresolved.clear();
    },

    size: () => ({ resolved: resolved.size, unresolved: unresolved.size }),
  };
}
