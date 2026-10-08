import { describe, expect, it } from "vitest";
import {
  checkUrlAgainstRule,
  checkUrlForField,
  URL_FIELD_ALLOWLIST,
  URL_MAX_LENGTH,
  type UrlFieldRule,
} from "./url-allowlist";

const rule: UrlFieldRule = {
  schemes: ["https:"],
  hosts: ["link.example.cl", "www.example.cl"],
};

function reasonOf(value: string, r: UrlFieldRule = rule): string {
  const result = checkUrlAgainstRule("test.field", r, value);
  if (result.ok) throw new Error(`expected rejection for ${value}`);
  return result.error.reason;
}

describe("checkUrlAgainstRule (mechanism)", () => {
  it("accepts https on an exact allowed host, with path and query", () => {
    const result = checkUrlAgainstRule(
      "test.field",
      rule,
      "https://link.example.cl/pay/abc?x=1#frag",
    );
    expect(result.ok).toBe(true);
  });

  it.each([
    ["uppercase scheme and host", "HTTPS://WWW.example.cl/x"],
    ["mixed-case host", "https://LINK.example.CL/x"],
    ["missing slashes", "https:www.example.cl/x"],
    ["three slashes", "https:///www.example.cl/x"],
    ["percent-encoded dot segment", "https://www.example.cl/%2e/x"],
    ["explicit default port", "https://www.example.cl:443/x"],
    ["fullwidth host", "https://ｗｗｗ.example.cl/x"],
    ["unicode host", "https://exämple.cl/x"],
    ["NUL byte", "https://www.example.cl/x\u0000"],
    ["newline", "https://www.example.cl/x\n"],
    ["tab inside host", "https://www.exam\tple.cl/x"],
    ["double quotes", 'https://www.example.cl/x"q"'],
    ["html injection", "https://www.example.cl/x'><script>"],
    ["space in path", "https://www.example.cl/a b"],
    ["trailing whitespace", "https://www.example.cl/x "],
    ["leading whitespace", " https://www.example.cl/x"],
  ])(
    "rejects a value that is not byte-identical to URL.href (%s)",
    (_label, value) => {
      expect(reasonOf(value)).toBe("not-canonical");
    },
  );

  it.each([
    ["http://link.example.cl/x", "scheme"],
    ["javascript:alert(1)", "scheme"],
    ["data:text/html,hi", "scheme"],
    ["ftp://link.example.cl/x", "scheme"],
    ["https://user:pw@link.example.cl/x", "credentials"],
    ["https://user@link.example.cl/x", "credentials"],
    ["https://link.example.cl:8443/x", "port"],
    ["https://93.184.216.34/x", "ip-address"],
    ["https://[2001:db8::1]/x", "ip-address"],
    ["https://xn--exmple-cua.cl/x", "punycode"],
    ["https://pay.xn--exmple-cua.cl/x", "punycode"],
    ["https://evil.cl/x", "host"],
    ["https://sub.link.example.cl/x", "host"],
    ["https://link.example.cl.evil.cl/x", "host"],
    ["link.example.cl/x", "unparseable"],
    ["//link.example.cl/x", "unparseable"],
    ["", "unparseable"],
    ["not a url", "unparseable"],
  ])("rejects %s (%s)", (value, reason) => {
    expect(reasonOf(value)).toBe(reason);
  });

  it("a lone apostrophe in the path is canonical per WHATWG (React escapes it in href)", () => {
    // Documented, not a gap: `'` is not percent-encoded by the URL parser, so
    // the canonical rule alone cannot reject it. `<`, `>` and `"` are encoded
    // and therefore rejected above. The storefront never interpolates the
    // value into raw HTML; React attribute escaping covers `'`.
    expect(
      checkUrlAgainstRule("f", rule, "https://www.example.cl/x'q").ok,
    ).toBe(true);
  });

  it("rejects over-long urls before parsing", () => {
    const long = `https://link.example.cl/${"a".repeat(URL_MAX_LENGTH)}`;
    expect(reasonOf(long)).toBe("too-long");
  });

  it("carries the field and never the value in the error", () => {
    const result = checkUrlAgainstRule(
      "contact.x",
      rule,
      "https://evil.cl/secret",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UrlNotAllowed");
      expect(result.error.field).toBe("contact.x");
      expect(result.error.message).not.toContain("evil.cl");
    }
  });
});

describe("URL_FIELD_ALLOWLIST rows", () => {
  it("has exactly the fields documented in ADR-0004 §3", () => {
    expect(Object.keys(URL_FIELD_ALLOWLIST)).toEqual(["contact.paymentLink"]);
  });

  it("contact.paymentLink: https only and NO hosts until decision E1", () => {
    const row = URL_FIELD_ALLOWLIST["contact.paymentLink"];
    expect(row.schemes).toEqual(["https:"]);
    expect(row.hosts).toEqual([]);
    const result = checkUrlForField(
      "contact.paymentLink",
      "https://www.mercadopago.cl/checkout/abc",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe("host");
  });

  it("rows are frozen (not configurable at runtime)", () => {
    expect(Object.isFrozen(URL_FIELD_ALLOWLIST)).toBe(true);
    expect(Object.isFrozen(URL_FIELD_ALLOWLIST["contact.paymentLink"])).toBe(
      true,
    );
    expect(
      Object.isFrozen(URL_FIELD_ALLOWLIST["contact.paymentLink"].hosts),
    ).toBe(true);
  });
});
