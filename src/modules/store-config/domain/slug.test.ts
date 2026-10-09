import { describe, expect, it } from "vitest";
import {
  normalizeSlug,
  SLUG_MAX_LENGTH,
  toSlugCandidate,
  validateSlug,
} from "./slug";

function errorOf<T, E>(result: { ok: boolean; error?: E; value?: T }): E {
  if (result.ok) throw new Error("expected an error");
  return result.error as E;
}

describe("toSlugCandidate", () => {
  it.each([
    ["Mi Tienda", "mi-tienda"],
    ["Ñandú Ropa", "nandu-ropa"],
    ["  café_con.leche  ", "cafe-con-leche"],
    ["ROPA--LINDA", "ropa-linda"],
    ["--ropa--", "ropa"],
    ["ropa!@#$%", "ropa"],
    ["日本", ""],
    // NFKC compatibility folding before NFD: fullwidth, ligatures, superscripts
    ["ａｐｐ", "app"],
    ["ＡＤＭＩＮ", "admin"],
    ["ﬁno", "fino"],
    ["tienda²", "tienda2"],
    ["Ⓐdmin", "admin"],
  ])("%s -> %s", (input, expected) => {
    expect(toSlugCandidate(input)).toBe(expected);
  });
});

describe("validateSlug (stored data must already be canonical)", () => {
  it.each([
    "ropa",
    "mi-tienda",
    "tienda-123",
    "abc",
    "a".repeat(SLUG_MAX_LENGTH),
  ])("accepts %s", (slug) => {
    const result = validateSlug(slug);
    expect(result.ok).toBe(true);
  });

  it("rejects empty", () => {
    expect(errorOf(validateSlug("")).reason).toBe("empty");
  });

  it("rejects uppercase, accents and ñ with the canonical candidate", () => {
    const error = errorOf(validateSlug("Ñandú Ropa"));
    expect(error.code).toBe("InvalidSlug");
    expect(error.reason).toBe("invalid-characters");
    expect(error.normalized).toBe("nandu-ropa");
  });

  it("omits the candidate when nothing survives normalisation", () => {
    const error = errorOf(validateSlug("日本"));
    expect(error.reason).toBe("invalid-characters");
    expect(error.normalized).toBeUndefined();
  });

  it.each(["-ropa", "ropa-", "ro--pa", "ro.pa", "ro_pa", "ro pa"])(
    "rejects non-canonical %s",
    (slug) => {
      expect(errorOf(validateSlug(slug)).reason).toBe("invalid-characters");
    },
  );

  it("rejects punycode (xn--) explicitly", () => {
    expect(errorOf(validateSlug("xn--ropa-abc")).reason).toBe("punycode");
    expect(errorOf(validateSlug("XN--ropa")).reason).toBe("punycode");
  });

  it("rejects too short and too long", () => {
    expect(errorOf(validateSlug("ab")).reason).toBe("too-short");
    expect(errorOf(validateSlug("a".repeat(SLUG_MAX_LENGTH + 1))).reason).toBe(
      "too-long",
    );
  });

  it.each([
    "app",
    "api",
    "admin",
    "www",
    "mail",
    "mcp",
    "mercadopago",
    "webpay",
  ])("rejects reserved %s", (slug) => {
    expect(errorOf(validateSlug(slug)).reason).toBe("reserved");
  });

  it("never echoes the input in the message", () => {
    const error = errorOf(validateSlug("<script>"));
    expect(error.message).not.toContain("<script>");
  });
});

describe("normalizeSlug (onboarding input)", () => {
  it("normalises free text to a canonical slug", () => {
    const result = normalizeSlug("  Mi Tienda Ñandú ");
    expect(result.ok && result.value).toBe("mi-tienda-nandu");
  });

  it("rejects when the normalised form is reserved", () => {
    expect(errorOf(normalizeSlug("Admin")).reason).toBe("reserved");
    expect(errorOf(normalizeSlug("Mercado Pago")).reason).toBe("reserved");
  });

  it("folds compatibility characters so look-alikes of reserved words are reserved", () => {
    expect(errorOf(normalizeSlug("ａｐｐ")).reason).toBe("reserved");
    expect(errorOf(normalizeSlug("ｗｗｗ")).reason).toBe("reserved");
    expect(errorOf(normalizeSlug("Ⓐdmin")).reason).toBe("reserved");
  });

  it("rejects when nothing survives", () => {
    expect(errorOf(normalizeSlug("!!!")).reason).toBe("empty");
  });

  it("defuses punycode: the double hyphen collapses, so xn-- cannot survive", () => {
    const result = normalizeSlug("XN--tienda");
    expect(result.ok && result.value).toBe("xn-tienda");
  });
});
