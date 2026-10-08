import { describe, expect, it } from "vitest";
import { isReservedSlug, RESERVED_SLUGS } from "./reserved-slugs";
import { SLUG_PATTERN } from "./slug";

describe("RESERVED_SLUGS", () => {
  it("contains the platform hosts required by ADR-0004 §8", () => {
    for (const slug of [
      "www",
      "app",
      "api",
      "admin",
      "mail",
      "mcp",
      "status",
      "cdn",
      "assets",
      "auth",
      "login",
    ]) {
      expect(isReservedSlug(slug), slug).toBe(true);
    }
  });

  it("blocks impersonation of payment providers and big brands", () => {
    for (const slug of [
      "mercadopago",
      "webpay",
      "transbank",
      "instagram",
      "whatsapp",
    ]) {
      expect(isReservedSlug(slug), slug).toBe(true);
    }
  });

  it("every entry is itself a canonical slug (otherwise it could never match)", () => {
    for (const slug of RESERVED_SLUGS) {
      expect(slug, slug).toMatch(SLUG_PATTERN);
    }
  });

  it("does not reserve ordinary store names", () => {
    expect(isReservedSlug("ropa-linda")).toBe(false);
    expect(isReservedSlug("mi-tienda")).toBe(false);
  });
});
