import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const post = (body: string, ip: string, headers: Record<string, string> = {}) =>
  POST(
    new Request("http://localhost/api/csp-report", {
      method: "POST",
      body,
      headers: { "x-forwarded-for": ip, ...headers },
    }),
  );

const valid = JSON.stringify({
  "csp-report": {
    "blocked-uri": "https://evil.example/a?email=x@y.cl",
    "effective-directive": "script-src",
  },
});

describe("POST /api/csp-report", () => {
  it("accepts a valid report and logs no personal data", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await post(valid, "1.1.1.1");
    expect(res.status).toBe(204);
    const logged = String(warn.mock.calls[0]?.[0]);
    expect(logged).toContain("security.csp_violation");
    expect(logged).not.toMatch(/@|email/);
    warn.mockRestore();
  });

  it("rejects invalid JSON and invalid shape", async () => {
    expect((await post("{", "2.2.2.2")).status).toBe(400);
    expect((await post("{}", "2.2.2.2")).status).toBe(400);
  });

  it("rejects oversized bodies", async () => {
    expect((await post("x".repeat(9000), "3.3.3.3")).status).toBe(413);
  });

  it("rate limits per client", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const statuses: number[] = [];
    for (let i = 0; i < 32; i++)
      statuses.push((await post(valid, "4.4.4.4")).status);
    expect(statuses.slice(0, 30).every((s) => s === 204)).toBe(true);
    expect(statuses[30]).toBe(429);
    expect((await post(valid, "5.5.5.5")).status).toBe(204);
    warn.mockRestore();
  });
});
