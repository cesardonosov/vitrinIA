import { describe, expect, it, vi } from "vitest";
import { domainError, Result } from "@/shared/kernel";
import { ROPA_PRESET } from "../domain/presets/ropa";
import { STORE_CONFIG_SCHEMA_VERSION } from "../domain/store-config";
import { parseStoreConfig } from "./parse-store-config";
import type { StoreConfigValidator } from "./ports/store-config-validator";

const acceptAll: StoreConfigValidator = {
  validate: vi.fn((input: unknown) => Result.ok(input as typeof ROPA_PRESET)),
};

const rejectAll: StoreConfigValidator = {
  validate: () =>
    Result.err(
      Object.freeze({
        ...domainError("InvalidStoreConfig", "nope"),
        issues: [{ path: "identity.name", message: "required" }],
      }),
    ),
};

describe("parseStoreConfig", () => {
  it("migrates first, then validates the migrated object", () => {
    const result = parseStoreConfig(
      { schemaVersion: 0, name: "Ropa Linda", whatsapp: "+56912345678" },
      acceptAll,
    );
    expect(result.ok).toBe(true);
    expect(acceptAll.validate).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaVersion: STORE_CONFIG_SCHEMA_VERSION,
        identity: { name: "Ropa Linda" },
      }),
    );
  });

  it("passes a current config straight to the validator", () => {
    const result = parseStoreConfig(ROPA_PRESET, acceptAll);
    expect(result.ok && result.value).toBe(ROPA_PRESET);
  });

  it("short-circuits on an unsupported schemaVersion without calling the validator", () => {
    const validate = vi.fn();
    const result = parseStoreConfig({ schemaVersion: 99 }, { validate });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UnsupportedSchemaVersion");
    expect(validate).not.toHaveBeenCalled();
  });

  it("returns the validator's typed error with field paths", () => {
    const result = parseStoreConfig(ROPA_PRESET, rejectAll);
    expect(result.ok).toBe(false);
    if (!result.ok && result.error.code === "InvalidStoreConfig") {
      expect(result.error.issues[0]?.path).toBe("identity.name");
    } else {
      throw new Error("expected InvalidStoreConfig");
    }
  });
});
