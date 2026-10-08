import {
  domainError,
  Result,
  type Result as ResultType,
} from "@/shared/kernel";
import type { UnsupportedSchemaVersion } from "../errors";
import { STORE_CONFIG_SCHEMA_VERSION } from "../store-config";
import type { Migration, VersionedConfig } from "./types";
import { migrateV0ToV1 } from "./v0-to-v1";

export type { Migration, VersionedConfig } from "./types";

/**
 * Migration chain (ADR-0004 §4). Key N holds `vN -> vN+1`. Every historical
 * version from the oldest supported one up to CURRENT - 1 must have an entry;
 * a gap is a programming error surfaced as `UnsupportedSchemaVersion`.
 *
 * Migrations are kept forever (or until an ADR fixes a minimum supported
 * version). CI runs every fixture in tests/fixtures/store-config/<version>/ through
 * this chain and validates the result against the current schema.
 */
export const MIGRATIONS: Readonly<Record<number, Migration>> = Object.freeze({
  0: migrateV0ToV1,
});

export const OLDEST_SUPPORTED_SCHEMA_VERSION = 0;

function unsupported(
  schemaVersion: number | undefined,
  message: string,
): UnsupportedSchemaVersion {
  return Object.freeze({
    ...domainError("UnsupportedSchemaVersion", message),
    schemaVersion,
  });
}

export function readSchemaVersion(input: unknown): number | undefined {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return undefined;
  }
  const version = (input as { readonly schemaVersion?: unknown }).schemaVersion;
  return typeof version === "number" && Number.isInteger(version)
    ? version
    : undefined;
}

/**
 * Brings any supported config up to `STORE_CONFIG_SCHEMA_VERSION` in memory.
 * The result is NOT validated: pass it to the `StoreConfigValidator`
 * (see application/parse-store-config.ts). `migrations` is injectable only so
 * tests can exercise a broken chain; production always uses `MIGRATIONS`.
 */
export function migrateToCurrent(
  input: unknown,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
): ResultType<VersionedConfig, UnsupportedSchemaVersion> {
  const version = readSchemaVersion(input);
  if (version === undefined) {
    return Result.err(
      unsupported(undefined, "schemaVersion must be an integer"),
    );
  }
  if (version > STORE_CONFIG_SCHEMA_VERSION) {
    return Result.err(
      unsupported(
        version,
        `schemaVersion ${version} is newer than supported ${STORE_CONFIG_SCHEMA_VERSION}`,
      ),
    );
  }
  if (version < OLDEST_SUPPORTED_SCHEMA_VERSION) {
    return Result.err(
      unsupported(version, `schemaVersion ${version} is no longer supported`),
    );
  }
  let current = input as VersionedConfig;
  while (current.schemaVersion < STORE_CONFIG_SCHEMA_VERSION) {
    const step = migrations[current.schemaVersion];
    if (step === undefined) {
      return Result.err(
        unsupported(
          current.schemaVersion,
          `no migration registered from schemaVersion ${current.schemaVersion}`,
        ),
      );
    }
    const next = step(current);
    if (next.schemaVersion !== current.schemaVersion + 1) {
      return Result.err(
        unsupported(
          current.schemaVersion,
          `migration from ${current.schemaVersion} did not advance one version`,
        ),
      );
    }
    current = next;
  }
  return Result.ok(current);
}
