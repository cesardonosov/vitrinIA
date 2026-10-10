import { describe, expect, it } from "vitest";
import {
  resolveTurnstileKeys,
  TURNSTILE_TEST_SECRET_KEY,
  TURNSTILE_TEST_SITE_KEY,
} from "./turnstile-keys";

describe("resolveTurnstileKeys", () => {
  it("falls back to Cloudflare's public test keys", () => {
    expect(resolveTurnstileKeys({})).toEqual({
      siteKey: TURNSTILE_TEST_SITE_KEY,
      secretKey: TURNSTILE_TEST_SECRET_KEY,
    });
  });

  it("prefers the environment", () => {
    expect(
      resolveTurnstileKeys({
        TURNSTILE_SITE_KEY: "a",
        TURNSTILE_SECRET_KEY: "b",
      }),
    ).toEqual({
      siteKey: "a",
      secretKey: "b",
    });
  });
});
