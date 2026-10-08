import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_REPORT_BYTES } from "./csp-report";
import {
  clientKey,
  createCspReportHandler,
  GLOBAL_KEY,
  MAX_KEY_LENGTH,
} from "./csp-report-handler";
import { createRateLimiter } from "./rate-limit";

// A fresh handler (and fresh limiters) per test: no shared state.
function setup(options: { perKey?: number; global?: number } = {}) {
  return createCspReportHandler({
    perKey: createRateLimiter({
      limit: options.perKey ?? 30,
      windowMs: 60_000,
    }),
    global: createRateLimiter({
      limit: options.global ?? 300,
      windowMs: 60_000,
    }),
  });
}

const request = (body: BodyInit | null, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/csp-report", {
    method: "POST",
    body,
    headers,
    ...(typeof body === "object" && body !== null ? { duplex: "half" } : {}),
  } as RequestInit);

const valid = JSON.stringify({
  "csp-report": {
    "blocked-uri": "https://evil.example/a?email=x@y.cl",
    "effective-directive": "script-src",
  },
});

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => warn.mockRestore());

describe("csp report handler", () => {
  it("accepts a valid report and logs no personal data", async () => {
    const res = await setup()(request(valid));
    expect(res.status).toBe(204);
    const logged = String(warn.mock.calls[0]?.[0]);
    expect(logged).toContain("security.csp_violation");
    expect(logged).not.toMatch(/@|email/);
  });

  it("rejects invalid JSON, invalid shape and empty body", async () => {
    const handle = setup();
    expect((await handle(request("{"))).status).toBe(400);
    expect((await handle(request("{}"))).status).toBe(400);
    expect((await handle(request(null))).status).toBe(400);
  });

  it("rejects oversized bodies by content-length", async () => {
    const res = await setup()(request("x".repeat(MAX_REPORT_BYTES + 1)));
    expect(res.status).toBe(413);
  });

  it("cuts a chunked body without content-length once the limit is exceeded", async () => {
    let pulled = 0;
    const chunk = new Uint8Array(1024).fill(120);
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 1;
        if (pulled > 2048) return controller.close();
        controller.enqueue(chunk);
      },
    });
    const res = await setup()(request(stream));
    expect(res.status).toBe(413);
    // 2 MiB would be 2048 chunks; reading stopped shortly after 8 KiB.
    expect(pulled).toBeLessThan(40);
  });

  it("rate limits per client using cf-connecting-ip", async () => {
    const handle = setup({ perKey: 2 });
    const cf = (ip: string) => request(valid, { "cf-connecting-ip": ip });
    expect((await handle(cf("1.1.1.1"))).status).toBe(204);
    expect((await handle(cf("1.1.1.1"))).status).toBe(204);
    expect((await handle(cf("1.1.1.1"))).status).toBe(429);
    expect((await handle(cf("2.2.2.2"))).status).toBe(204);
  });

  it("ignores x-forwarded-for: rotating it does not evade the limit", async () => {
    const handle = setup({ perKey: 3 });
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await handle(
        request(valid, { "x-forwarded-for": `9.9.9.${i}` }),
      );
      statuses.push(res.status);
    }
    expect(statuses).toEqual([204, 204, 204, 429, 429, 429]);
  });

  it("applies a process-wide cap across different clients", async () => {
    const handle = setup({ perKey: 100, global: 3 });
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      const res = await handle(
        request(valid, { "cf-connecting-ip": `8.8.8.${i}` }),
      );
      statuses.push(res.status);
    }
    expect(statuses).toEqual([204, 204, 204, 429, 429]);
  });

  it("isolates state between handlers", async () => {
    const a = setup({ perKey: 1 });
    const b = setup({ perKey: 1 });
    expect((await a(request(valid))).status).toBe(204);
    expect((await a(request(valid))).status).toBe(429);
    expect((await b(request(valid))).status).toBe(204);
  });
});

describe("clientKey", () => {
  it("uses cf-connecting-ip, trimmed to 64 characters", () => {
    expect(
      clientKey(request(null, { "cf-connecting-ip": " 203.0.113.7 " })),
    ).toBe("203.0.113.7");
    const long = clientKey(
      request(null, { "cf-connecting-ip": "a".repeat(500) }),
    );
    expect(long).toHaveLength(MAX_KEY_LENGTH);
  });

  it("falls back to a single global key and never reads x-forwarded-for", () => {
    expect(clientKey(request(null, { "x-forwarded-for": "6.6.6.6" }))).toBe(
      GLOBAL_KEY,
    );
    expect(clientKey(request(null, { "cf-connecting-ip": "  " }))).toBe(
      GLOBAL_KEY,
    );
  });
});
