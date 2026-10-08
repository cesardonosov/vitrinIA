import { describe, expect, it } from "vitest";
import { EnvValidationError, parseEnv } from "./env";

const SECRET_VALUE = "s".repeat(40);
const DB_VALUE = "postgres://user:hunter2pass@localhost:5432/vitrinia";

const valid = {
  APP_ENV: "development",
  DATABASE_URL: DB_VALUE,
  SESSION_SECRET: SECRET_VALUE,
};

function failure(source: Record<string, string | undefined>) {
  try {
    parseEnv(source);
  } catch (error) {
    return error as EnvValidationError;
  }
  throw new Error("expected parseEnv to throw");
}

describe("parseEnv", () => {
  it("accepts a valid environment and applies defaults", () => {
    expect(parseEnv(valid).LOG_LEVEL).toBe("info");
  });

  it("treats an empty LOG_LEVEL as absent (default info)", () => {
    expect(parseEnv({ ...valid, LOG_LEVEL: "" }).LOG_LEVEL).toBe("info");
  });

  it("still rejects an invalid non-empty LOG_LEVEL", () => {
    expect(failure({ ...valid, LOG_LEVEL: "loud" }).variables).toEqual([
      "LOG_LEVEL",
    ]);
  });

  it("fails naming DATABASE_URL when it is missing", () => {
    const { DATABASE_URL: _omitted, ...rest } = valid;
    const error = failure(rest);
    expect(error).toBeInstanceOf(EnvValidationError);
    expect(error.variables).toEqual(["DATABASE_URL"]);
    expect(error.message).toContain("DATABASE_URL");
  });

  it("never prints values of invalid variables", () => {
    const error = failure({ ...valid, SESSION_SECRET: "short-secret-xyz" });
    expect(error.variables).toEqual(["SESSION_SECRET"]);
    expect(error.message).not.toContain("short-secret-xyz");
    const bad = failure({ ...valid, DATABASE_URL: "hunter2pass-not-a-url" });
    expect(bad.message).not.toContain("hunter2pass");
  });

  it("rejects an empty secret", () => {
    expect(failure({ ...valid, SESSION_SECRET: "" }).variables).toEqual([
      "SESSION_SECRET",
    ]);
  });

  it("rejects an unknown APP_ENV", () => {
    expect(failure({ ...valid, APP_ENV: "prod" }).variables).toEqual([
      "APP_ENV",
    ]);
  });

  it.each([
    "NEXT_PUBLIC_API_SECRET",
    "NEXT_PUBLIC_MAPS_KEY",
    "NEXT_PUBLIC_AUTH_TOKEN",
    "NEXT_PUBLIC_DB_PASSWORD",
  ])("rejects %s", (name) => {
    const error = failure({ ...valid, [name]: "value-should-not-leak" });
    expect(error.variables).toEqual([name]);
    expect(error.message).not.toContain("value-should-not-leak");
  });

  it("allows harmless NEXT_PUBLIC_ variables", () => {
    expect(() =>
      parseEnv({ ...valid, NEXT_PUBLIC_BASE_DOMAIN: "vitrinia.cl" }),
    ).not.toThrow();
  });
});
