import { z } from "zod";
import { storeConfigV1Schema } from "./store-config-v1.schema";

/**
 * JSON Schema of Store Config v1, published at
 * docs/arquitectura/store-config.schema.json (VIT-110 AC9) so the Designer
 * and the MCP tooling can validate presets without running the app.
 *
 * `.refine()` rules (URL allowlist, AA contrast, plain text) are not
 * expressible in JSON Schema: the file documents shape, enums, patterns and
 * limits; the Zod validator remains the authority.
 *
 * Regenerate with `pnpm docs:store-config-schema`; a test fails when the file
 * is stale.
 */
export function buildStoreConfigJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(storeConfigV1Schema, {
    target: "draft-2020-12",
    io: "input",
    unrepresentable: "any",
  });
}

export function renderStoreConfigJsonSchema(): string {
  return `${JSON.stringify(buildStoreConfigJsonSchema(), null, 2)}\n`;
}
