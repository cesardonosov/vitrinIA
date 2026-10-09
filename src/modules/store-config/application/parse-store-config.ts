import { Result, type Result as ResultType } from "@/shared/kernel";
import type {
  InvalidStoreConfig,
  UnsupportedSchemaVersion,
} from "../domain/errors";
import { migrateToCurrent } from "../domain/migrations/migrate-to-current";
import type { StoreConfigV1 } from "../domain/store-config";
import type { StoreConfigValidator } from "./ports/store-config-validator";

export type ParseStoreConfigError =
  | UnsupportedSchemaVersion
  | InvalidStoreConfig;

/**
 * The single entry point for turning untrusted data (a jsonb row, a seed, an
 * onboarding payload, an MCP patch) into a typed `StoreConfigV1`:
 *
 *   migrate to the current schemaVersion (pure, in memory) -> validate (strict).
 *
 * Both reads and writes go through here ("two validations by design",
 * ADR-0004). Persisting the migrated config is a separate worker job (Sprint 2).
 */
export function parseStoreConfig(
  input: unknown,
  validator: StoreConfigValidator,
): ResultType<StoreConfigV1, ParseStoreConfigError> {
  return Result.andThen(migrateToCurrent(input), (migrated) =>
    validator.validate(migrated),
  );
}
