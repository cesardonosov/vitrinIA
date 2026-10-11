import { resolveHost } from "@/infra/db/resolve-host";
import type { StoreHostResolver } from "../application";

/** Uncached host → store through `resolve_host()`; the container wraps it with the cache (VIT-192). */
export const dbStoreHostResolver: StoreHostResolver = {
  resolve: (host) => resolveHost(host),
};
