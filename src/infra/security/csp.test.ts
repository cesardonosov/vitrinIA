import { describe, expect, it } from "vitest";
import { buildCspReportOnly, generateNonce } from "./csp";

describe("csp", () => {
  it("generates a different base64 nonce each time", () => {
    const a = generateNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(generateNonce()).not.toBe(a);
  });

  it("embeds the nonce and forbids framing and plugins", () => {
    const csp = buildCspReportOnly("abc==", false);
    expect(csp).toContain(
      "script-src 'self' 'nonce-abc==' 'strict-dynamic' https://challenges.cloudflare.com",
    );
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("report-uri /api/csp-report");
    expect(csp).not.toContain("unsafe-eval");
  });

  it("allows unsafe-eval only in development", () => {
    expect(buildCspReportOnly("n", true)).toContain("'unsafe-eval'");
  });

  it("allows Cloudflare Turnstile and nothing else from third parties (VIT-186)", () => {
    const csp = buildCspReportOnly("n", false);
    expect(csp).toContain("frame-src https://challenges.cloudflare.com;");
    expect(csp).toContain(
      "connect-src 'self' https://challenges.cloudflare.com;",
    );
    expect(
      csp
        .match(/https:\/\/[a-z.]+/g)
        ?.every((u) => u === "https://challenges.cloudflare.com"),
    ).toBe(true);
  });
});
