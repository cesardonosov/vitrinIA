import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseStoreConfig } from "../../application/parse-store-config";
import {
  MIGRATIONS,
  OLDEST_SUPPORTED_SCHEMA_VERSION,
} from "../../domain/migrations/migrate-to-current";
import { AVES_PRESET } from "../../domain/presets/aves";
import { ROPA_PRESET } from "../../domain/presets/ropa";
import { STORE_CONFIG_SCHEMA_VERSION } from "../../domain/store-config";
import { zodStoreConfigValidator } from "./zod-store-config-validator";

/**
 * AC8: every fixture of every historical version migrates and validates
 * against the current schema. Fixtures live in tests/fixtures/store-config/vN/.
 */
const FIXTURES_DIR = fileURLToPath(
  new URL("../../../../../tests/fixtures/store-config/", import.meta.url),
);

function versions(): number[] {
  return readdirSync(FIXTURES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^v\d+$/.test(entry.name))
    .map((entry) => Number(entry.name.slice(1)))
    .sort((a, b) => a - b);
}

function fixturesOf(version: number): Array<{ name: string; data: unknown }> {
  const dir = join(FIXTURES_DIR, `v${version}`);
  return readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => ({
      name: `v${version}/${file}`,
      data: JSON.parse(readFileSync(join(dir, file), "utf8")) as unknown,
    }));
}

describe("store-config fixtures", () => {
  const all = versions();

  it("cover every version from the oldest supported to the current one", () => {
    const expected = Array.from(
      {
        length:
          STORE_CONFIG_SCHEMA_VERSION - OLDEST_SUPPORTED_SCHEMA_VERSION + 1,
      },
      (_, i) => OLDEST_SUPPORTED_SCHEMA_VERSION + i,
    );
    expect(all).toEqual(expected);
    for (const version of all) {
      expect(
        fixturesOf(version).length,
        `fixtures for v${version}`,
      ).toBeGreaterThan(0);
    }
    expect(Object.keys(MIGRATIONS).map(Number)).toEqual(
      expected.filter((v) => v < STORE_CONFIG_SCHEMA_VERSION),
    );
  });

  for (const version of all) {
    for (const fixture of fixturesOf(version)) {
      it(`${fixture.name} declares schemaVersion ${version}`, () => {
        expect((fixture.data as { schemaVersion: unknown }).schemaVersion).toBe(
          version,
        );
      });

      it(`${fixture.name} migrates and validates against v${STORE_CONFIG_SCHEMA_VERSION}`, () => {
        const result = parseStoreConfig(fixture.data, zodStoreConfigValidator);
        expect(result.ok, JSON.stringify(result, null, 2)).toBe(true);
        if (result.ok) {
          expect(result.value.schemaVersion).toBe(STORE_CONFIG_SCHEMA_VERSION);
        }
      });
    }
  }

  it("v1/ropa.json is the JSON form of ROPA_PRESET", () => {
    const fixture = fixturesOf(1).find((f) => f.name === "v1/ropa.json");
    expect(fixture).toBeDefined();
    expect(fixture?.data).toEqual(JSON.parse(JSON.stringify(ROPA_PRESET)));
  });

  it("v1/aves.json is the JSON form of AVES_PRESET", () => {
    const fixture = fixturesOf(1).find((f) => f.name === "v1/aves.json");
    expect(fixture).toBeDefined();
    expect(fixture?.data).toEqual(JSON.parse(JSON.stringify(AVES_PRESET)));
  });
});
