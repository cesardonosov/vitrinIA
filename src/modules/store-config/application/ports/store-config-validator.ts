import type { Result } from "@/shared/kernel";
import type { InvalidStoreConfig } from "../../domain/errors";
import type { StoreConfigV1 } from "../../domain/store-config";

/**
 * Port: runtime validation of a Store Config at the CURRENT schema version.
 *
 * The adapter (`infrastructure/zod/zod-store-config-validator.ts`) is the Zod
 * schema `StoreConfigV1` with `.strict()` on every object (ADR-0004 §1). It
 * only knows the current version: older data goes through `migrateToCurrent`
 * first (see `parseStoreConfig`).
 */
export interface StoreConfigValidator {
  validate(input: unknown): Result<StoreConfigV1, InvalidStoreConfig>;
}
