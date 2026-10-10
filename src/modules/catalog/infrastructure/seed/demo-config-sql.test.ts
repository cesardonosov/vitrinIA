import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { kanuwinDemoConfig } from "@/infra/container";
import { demoConfigSql, KANUWIN_CONFIG_ROW_ID } from "./demo-config-sql";

const FILE = new URL(
  "../../../../../infra/seed/demo-config.sql",
  import.meta.url,
);

describe("demoConfigSql", () => {
  it("infra/seed/demo-config.sql is up to date (WRITE_DEMO_CONFIG_SQL=1 rewrites it)", () => {
    const sql = demoConfigSql(kanuwinDemoConfig());
    if (process.env.WRITE_DEMO_CONFIG_SQL === "1") writeFileSync(FILE, sql);
    expect(readFileSync(FILE, "utf8")).toBe(sql);
  });

  it("is idempotent, fixed-id and carries the config as one escaped jsonb literal", () => {
    const sql = demoConfigSql(kanuwinDemoConfig());
    expect(sql).toContain("ON CONFLICT (store_id, revision) DO UPDATE");
    expect(sql).toContain("IS DISTINCT FROM");
    expect(KANUWIN_CONFIG_ROW_ID).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(sql.match(/INSERT INTO store_configs/g)).toHaveLength(1);
    expect(sql).toContain("Kanuwiñ");
    expect(demoConfigSql(kanuwinDemoConfig())).toBe(sql);
  });
});
