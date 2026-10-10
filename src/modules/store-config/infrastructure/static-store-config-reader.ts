import type { StoreId } from "@/shared/kernel";
import type { StoreConfig, StoreConfigReader } from "../application";

/**
 * Store Config served from memory until configs are persisted per store
 * (VIT-191). Configs passed in must already be validated.
 */
export function createStaticStoreConfigReader(
  configs: ReadonlyMap<StoreId, StoreConfig>,
): StoreConfigReader {
  return {
    async getConfig(storeId) {
      return configs.get(storeId);
    },
  };
}
