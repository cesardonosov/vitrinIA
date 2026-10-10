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

  describe("Turnstile (checkout)", () => {
    const prod = { ...valid, APP_ENV: "production" };
    const keys = {
      TURNSTILE_SITE_KEY: "0x4AAAreal",
      TURNSTILE_SECRET_KEY: "0x4AAAsecret",
    };

    it("is optional in development and test", () => {
      expect(parseEnv(valid).TURNSTILE_SECRET_KEY).toBeUndefined();
      expect(
        parseEnv({ ...valid, TURNSTILE_SITE_KEY: "", TURNSTILE_VERIFY_URL: "" })
          .TURNSTILE_SITE_KEY,
      ).toBeUndefined();
    });

    it("is required in production and staging", () => {
      expect(failure(prod).variables).toEqual([
        "TURNSTILE_SECRET_KEY",
        "TURNSTILE_SITE_KEY",
      ]);
      expect(failure({ ...prod, APP_ENV: "staging" }).variables).toEqual([
        "TURNSTILE_SECRET_KEY",
        "TURNSTILE_SITE_KEY",
      ]);
      expect(parseEnv({ ...prod, ...keys }).TURNSTILE_SECRET_KEY).toBe(
        "0x4AAAsecret",
      );
    });

    it("production refuses Cloudflare's public test secret and the verify override", () => {
      expect(
        failure({
          ...prod,
          ...keys,
          TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
        }).variables,
      ).toEqual(["TURNSTILE_SECRET_KEY"]);
      expect(
        failure({
          ...prod,
          ...keys,
          TURNSTILE_VERIFY_URL: "http://127.0.0.1:9/x",
        }).variables,
      ).toEqual(["TURNSTILE_VERIFY_URL"]);
    });

    it("does not leak the secret value in the error", () => {
      expect(
        failure({ ...prod, ...keys, TURNSTILE_VERIFY_URL: "http://x.y/z" })
          .message,
      ).not.toContain("0x4AAAsecret");
    });
  });
});
