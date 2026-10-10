import { describe, expect, it } from "vitest";
import {
  checkoutErrorMessage,
  isHttpsUrl,
  isWhatsAppUrl,
  shippingPreview,
} from "./guards";

describe("isWhatsAppUrl (O19)", () => {
  it("accepts wa.me links only", () => {
    expect(isWhatsAppUrl("https://wa.me/56912345678?text=Hola")).toBe(true);
    for (const url of [
      "http://wa.me/56912345678",
      "https://wa.me.evil.com/56912345678",
      "https://evil.com/https://wa.me/",
      "https://user@wa.me/56912345678",
      "javascript:alert(1)",
      "//wa.me/56912345678",
      "https://api.whatsapp.com/send?phone=56912345678",
      "",
    ]) {
      expect(isWhatsAppUrl(url), url).toBe(false);
    }
  });
});

describe("isHttpsUrl", () => {
  it("accepts plain https and rejects other schemes and credentials", () => {
    expect(isHttpsUrl("https://link.mercadopago.cl/x")).toBe(true);
    for (const url of [
      "http://a.cl",
      "javascript:alert(1)",
      "https://u:p@a.cl",
      "nope",
    ]) {
      expect(isHttpsUrl(url), url).toBe(false);
    }
  });
});

describe("shippingPreview", () => {
  it("is the zone price, free from the threshold, zero without a zone", () => {
    expect(shippingPreview(3990, 10000, 40000)).toBe(3990);
    expect(shippingPreview(3990, 40000, 40000)).toBe(0);
    expect(shippingPreview(3990, 10000, undefined)).toBe(3990);
    expect(shippingPreview(undefined, 10000, 40000)).toBe(0);
  });
});

describe("checkoutErrorMessage", () => {
  it("has a safe Spanish message for every code and for unknown ones", () => {
    for (const code of [
      "ITEM_UNAVAILABLE",
      "RATE_LIMITED",
      "VERIFICATION_FAILED",
      "IDEMPOTENCY_CONFLICT",
      "NOT_FOUND",
      "INVALID_ORDER",
      "INTERNAL",
      undefined,
    ]) {
      expect(checkoutErrorMessage(code).length).toBeGreaterThan(10);
    }
  });
});
