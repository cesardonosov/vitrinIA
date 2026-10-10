import { resolveHost } from "@/infra/db/resolve-host";
import type { StoreHostResolver } from "../application";

// TODO(VIT-192): in-memory host cache (TTL <= 60 s, explicit invalidation, ADR-0003 §1).
export const dbStoreHostResolver: StoreHostResolver = {
  resolve: (host) => resolveHost(host),
};
