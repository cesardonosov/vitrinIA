import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { demoCatalogSql } from "./demo-sql";
import { KANUWIN_CATALOG } from "./kanuwin";

const FILE = new URL(
  "../../../../../infra/seed/demo-catalog.sql",
  import.meta.url,
);

describe("demoCatalogSql", () => {
  it("infra/seed/demo-catalog.sql is up to date (WRITE_DEMO_CATALOG_SQL=1 rewrites it)", () => {
    const sql = demoCatalogSql(KANUWIN_CATALOG);
    if (process.env.WRITE_DEMO_CATALOG_SQL === "1") writeFileSync(FILE, sql);
    expect(readFileSync(FILE, "utf8")).toBe(sql);
  });

  it("covers every product and variant with fixed UUID v7 ids and a single quote escaped", () => {
    const sql = demoCatalogSql(KANUWIN_CATALOG);
    const variants = KANUWIN_CATALOG.products.flatMap((p) => p.variants);
    expect(sql.match(/INSERT INTO products/g)).toHaveLength(
      KANUWIN_CATALOG.products.length,
    );
    expect(sql.match(/INSERT INTO product_variants/g)).toHaveLength(
      variants.length,
    );
    for (const id of sql.match(/'0199d0a0-[0-9a-f-]+'/g) ?? []) {
      expect(id).toMatch(
        /^'[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'$/,
      );
    }
    expect(demoCatalogSql(KANUWIN_CATALOG)).toBe(sql);
  });
});
