import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildStoreConfigJsonSchema,
  renderStoreConfigJsonSchema,
} from "./json-schema";

/**
 * AC9: docs/arquitectura/store-config.schema.json is the generated JSON Schema.
 * Run `pnpm docs:store-config-schema` (sets WRITE_STORE_CONFIG_SCHEMA=1) to
 * regenerate; without the flag this test fails when the file is stale.
 */
const OUTPUT = fileURLToPath(
  new URL(
    "../../../../../docs/arquitectura/store-config.schema.json",
    import.meta.url,
  ),
);

describe("store-config.schema.json", () => {
  it("is a draft 2020-12 schema with additionalProperties false on every object", () => {
    const schema = buildStoreConfigJsonSchema();
    expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    const objects: Record<string, unknown>[] = [];
    JSON.parse(JSON.stringify(schema), (_key, value) => {
      if (
        value &&
        typeof value === "object" &&
        (value as { type?: unknown }).type === "object"
      ) {
        objects.push(value as Record<string, unknown>);
      }
      return value;
    });
    expect(objects.length).toBeGreaterThan(5);
    for (const object of objects) {
      expect(object.additionalProperties).toBe(false);
    }
  });

  it("matches the committed file (regenerate with pnpm docs:store-config-schema)", () => {
    const rendered = renderStoreConfigJsonSchema();
    if (process.env.WRITE_STORE_CONFIG_SCHEMA === "1") {
      mkdirSync(dirname(OUTPUT), { recursive: true });
      writeFileSync(OUTPUT, rendered);
    }
    expect(existsSync(OUTPUT)).toBe(true);
    // Compared as JSON: Biome reformats the committed file (pnpm lint).
    expect(JSON.parse(readFileSync(OUTPUT, "utf8"))).toEqual(
      JSON.parse(rendered),
    );
  });
});
