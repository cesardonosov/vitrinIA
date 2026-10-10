import type { StoreId } from "@/shared/kernel";
import type { StoreConfig } from "../../domain/store-config";

/**
 * Read side of the published Store Config of a store. Returns `undefined`
 * for an unknown store. Implementations return configs already validated
 * with `parseStoreConfig`.
 */
export interface StoreConfigReader {
  getConfig(storeId: StoreId): Promise<StoreConfig | undefined>;
}
