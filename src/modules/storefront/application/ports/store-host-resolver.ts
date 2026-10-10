import type { StoreId } from "@/shared/kernel";

/**
 * Host → store. Only verified hosts resolve; unknown, unverified and
 * malformed hosts are all `undefined` (indistinguishable, ADR-0003 §1).
 */
export interface StoreHostResolver {
  resolve(host: string): Promise<StoreId | undefined>;
}
