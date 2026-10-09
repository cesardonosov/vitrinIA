import { describe, expect, it } from "vitest";
import { originOnly, parseCspReport } from "./csp-report";

describe("parseCspReport", () => {
  it("strips paths and queries from legacy reports", () => {
    const result = parseCspReport({
      "csp-report": {
        "document-uri": "https://tienda.vitrinia.cl/p/1?email=ana@example.com",
        "blocked-uri": "https://evil.example/x.js?token=abc",
        "effective-directive": "script-src-elem",
        disposition: "report",
      },
    });
    expect(result).toEqual([
      {
        directive: "script-src-elem",
        blockedOrigin: "https://evil.example",
        documentOrigin: "https://tienda.vitrinia.cl",
        disposition: "report",
      },
    ]);
    expect(JSON.stringify(result)).not.toMatch(/@|token|email/);
  });

  it("accepts the Reporting API format", () => {
    const result = parseCspReport([
      {
        type: "csp-violation",
        body: { blockedURL: "inline", effectiveDirective: "script-src" },
      },
    ]);
    expect(result?.[0]?.blockedOrigin).toBe("inline");
  });

  it("rejects malformed payloads and unsafe directive strings", () => {
    expect(parseCspReport({ foo: 1 })).toBeNull();
    expect(parseCspReport([])).toBeNull();
    const r = parseCspReport({
      "csp-report": { "effective-directive": "a@b.cl +56912345678" },
    });
    expect(r?.[0]?.directive).toBe("unknown");
  });

  it("originOnly handles garbage", () => {
    expect(originOnly("not a url")).toBe("invalid");
    expect(originOnly(undefined)).toBe("unknown");
  });
});
