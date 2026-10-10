import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { CSP_REPORT_ONLY_HEADER } from "@/infra/security/csp";
import { proxy } from "./proxy";

function call(host: string, path: string) {
  const request = new NextRequest(`http://${host}${path}`, {
    headers: { host },
  });
  return proxy(request);
}

const rewriteOf = (r: Response) => r.headers.get("x-middleware-rewrite");

describe("proxy routing by host (VIT-137)", () => {
  it("portal hosts pass through", () => {
    const r = call("localhost:3000", "/");
    expect(r.status).toBe(200);
    expect(rewriteOf(r)).toBeNull();
    expect(r.headers.get(CSP_REPORT_ONLY_HEADER)).toContain("nonce-");
  });

  it("store hosts are rewritten to the internal segment with the normalised host", () => {
    expect(rewriteOf(call("Kanuwin.localhost:3000", "/"))).toBe(
      "http://kanuwin.localhost:3000/s/kanuwin.localhost",
    );
    expect(rewriteOf(call("kanuwin.vitrinia.cl", "/p/mezcla"))).toBe(
      "http://kanuwin.vitrinia.cl/s/kanuwin.vitrinia.cl/p/mezcla",
    );
  });

  it("the internal segment is never reachable directly", () => {
    expect(call("localhost:3000", "/s/kanuwin.localhost").status).toBe(404);
    expect(call("kanuwin.localhost", "/s/otra.localhost/p/x").status).toBe(404);
    expect(call("kanuwin.localhost", "/s").status).toBe(404);
  });

  it("public files and /api are not rewritten on store hosts", () => {
    expect(
      rewriteOf(call("kanuwin.localhost", "/demo/kanuwin/a.webp")),
    ).toBeNull();
    expect(rewriteOf(call("kanuwin.localhost", "/api/csp-report"))).toBeNull();
  });

  it("a malformed host is a 404", () => {
    expect(call("kanuwiñ.localhost", "/").status).toBe(404);
  });
});
