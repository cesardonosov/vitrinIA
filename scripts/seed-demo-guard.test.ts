import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { checkDemoSeedAllowed } from "./seed-demo-guard.ts";

const ok = (env: Record<string, string | undefined>) =>
  checkDemoSeedAllowed(env).ok;

describe("db:seed:demo guard", () => {
  it("allows development and test against local databases", () => {
    expect(ok({ APP_ENV: "development" })).toBe(true);
    expect(
      ok({
        APP_ENV: "test",
        DATABASE_URL: "postgres://app_user:x@127.0.0.1:55432/vitrinia",
      }),
    ).toBe(true);
    expect(
      ok({
        APP_ENV: "development",
        DATABASE_URL: "postgres://u:x@localhost:5432/db",
      }),
    ).toBe(true);
  });

  it("refuses production and staging", () => {
    expect(ok({ APP_ENV: "production" })).toBe(false);
    expect(ok({ APP_ENV: " Staging " })).toBe(false);
  });

  it("fails closed when APP_ENV is missing, empty or unknown", () => {
    expect(ok({})).toBe(false);
    expect(ok({ APP_ENV: "" })).toBe(false);
    expect(ok({ APP_ENV: "prod" })).toBe(false);
  });

  it("refuses a remote or malformed database URL even with APP_ENV=development", () => {
    expect(
      ok({
        APP_ENV: "development",
        DATABASE_URL: "postgres://u:x@db.vitrinia.cl:5432/db",
      }),
    ).toBe(false);
    expect(ok({ APP_ENV: "development", DATABASE_URL: "not a url" })).toBe(
      false,
    );
  });

  it("never echoes the database URL (it carries a password)", () => {
    const result = checkDemoSeedAllowed({
      APP_ENV: "development",
      DATABASE_URL: "postgres://u:s3cret@db.example.com/db",
    });
    expect(JSON.stringify(result)).not.toContain("s3cret");
  });

  it("the script exits 1 in production and 0 in development", () => {
    const run = (appEnv: string) =>
      spawnSync("node", ["scripts/seed-demo-guard.ts"], {
        env: { ...process.env, APP_ENV: appEnv, DATABASE_URL: "" },
        encoding: "utf8",
      });
    const prod = run("production");
    expect(prod.status).toBe(1);
    expect(prod.stderr).toContain("refused");
    expect(run("development").status).toBe(0);
  });
});
