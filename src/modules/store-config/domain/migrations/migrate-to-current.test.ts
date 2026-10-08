import { describe, expect, it } from "vitest";
import { STORE_CONFIG_SCHEMA_VERSION } from "../store-config";
import {
  MIGRATIONS,
  migrateToCurrent,
  OLDEST_SUPPORTED_SCHEMA_VERSION,
  readSchemaVersion,
} from "./migrate-to-current";

function errorOf(input: unknown) {
  const result = migrateToCurrent(input);
  if (result.ok) throw new Error("expected an error");
  return result.error;
}

describe("MIGRATIONS chain", () => {
  it("has one step for every version from the oldest supported to current - 1", () => {
    for (
      let v = OLDEST_SUPPORTED_SCHEMA_VERSION;
      v < STORE_CONFIG_SCHEMA_VERSION;
      v++
    ) {
      expect(MIGRATIONS[v], `migration from v${v}`).toBeTypeOf("function");
    }
    expect(MIGRATIONS[STORE_CONFIG_SCHEMA_VERSION]).toBeUndefined();
  });
});

describe("readSchemaVersion", () => {
  it.each([
    null,
    undefined,
    1,
    "1",
    [],
    { schemaVersion: "1" },
    { schemaVersion: 1.5 },
    {},
  ])("returns undefined for %j", (input) => {
    expect(readSchemaVersion(input)).toBeUndefined();
  });

  it("returns the integer version", () => {
    expect(readSchemaVersion({ schemaVersion: 0 })).toBe(0);
  });
});

describe("migrateToCurrent", () => {
  it("migrates a v0 config to the current version", () => {
    const result = migrateToCurrent({
      schemaVersion: 0,
      name: "Ropa Linda",
      whatsapp: "+56912345678",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.schemaVersion).toBe(STORE_CONFIG_SCHEMA_VERSION);
      expect(result.value.identity).toEqual({ name: "Ropa Linda" });
    }
  });

  it("returns a current config untouched (same reference)", () => {
    const current = {
      schemaVersion: STORE_CONFIG_SCHEMA_VERSION,
      identity: {},
    };
    const result = migrateToCurrent(current);
    expect(result.ok && result.value).toBe(current);
  });

  it("rejects inputs without an integer schemaVersion", () => {
    for (const input of [null, "x", {}, { schemaVersion: "0" }]) {
      const error = errorOf(input);
      expect(error.code).toBe("UnsupportedSchemaVersion");
      expect(error.schemaVersion).toBeUndefined();
    }
  });

  it("rejects a version newer than this build", () => {
    const error = errorOf({ schemaVersion: STORE_CONFIG_SCHEMA_VERSION + 1 });
    expect(error.code).toBe("UnsupportedSchemaVersion");
    expect(error.schemaVersion).toBe(STORE_CONFIG_SCHEMA_VERSION + 1);
  });

  it("rejects a version older than the oldest supported", () => {
    const error = errorOf({
      schemaVersion: OLDEST_SUPPORTED_SCHEMA_VERSION - 1,
    });
    expect(error.code).toBe("UnsupportedSchemaVersion");
  });

  it("fails closed on a gap in the chain", () => {
    const result = migrateToCurrent({ schemaVersion: 0 }, {});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.schemaVersion).toBe(0);
  });

  it("fails closed when a step does not advance exactly one version", () => {
    const result = migrateToCurrent({ schemaVersion: 0 }, { 0: (c) => c });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(/did not advance/);
  });
});
