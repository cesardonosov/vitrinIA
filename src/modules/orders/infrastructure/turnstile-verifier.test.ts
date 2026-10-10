import { describe, expect, it } from "vitest";
import { createTurnstileVerifier } from "./turnstile-verifier";

function verifier(fetchImpl: typeof fetch, errors: string[] = []) {
  return createTurnstileVerifier({
    secretKey: () => "secret-x",
    fetchImpl,
    onError: (r) => errors.push(r),
  });
}
const json = (body: unknown, status = 200) =>
  (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;

describe("createTurnstileVerifier", () => {
  it("posts secret and token as a form and accepts success: true", async () => {
    let seen: { url: string; body: string } | undefined;
    const ok = verifier((async (url: string, init: RequestInit) => {
      seen = { url, body: String(init.body) };
      return new Response(JSON.stringify({ success: true }));
    }) as unknown as typeof fetch);
    expect(await ok.verify("tok", "ip")).toBe(true);
    expect(seen?.url).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    );
    expect(seen?.body).toBe("secret=secret-x&response=tok");
  });

  it("rejects success: false, odd bodies and missing success", async () => {
    for (const body of [
      { success: false },
      {},
      null,
      "yes",
      { success: "true" },
    ]) {
      expect(await verifier(json(body)).verify("tok", "ip")).toBe(false);
    }
  });

  it("fails closed on http errors, network errors and invalid JSON", async () => {
    const errors: string[] = [];
    expect(
      await verifier(json({ success: true }, 500), errors).verify("t", ""),
    ).toBe(false);
    expect(
      await verifier(
        (async () => {
          throw new Error("boom secret-x");
        }) as typeof fetch,
        errors,
      ).verify("t", ""),
    ).toBe(false);
    expect(
      await verifier(
        (async () => new Response("<html>")) as typeof fetch,
        errors,
      ).verify("t", ""),
    ).toBe(false);
    expect(errors).toEqual(["http_500", "unreachable", "unreachable"]);
  });

  it("rejects empty and oversized tokens without calling Cloudflare", async () => {
    let calls = 0;
    const v = verifier((async () => {
      calls++;
      return new Response(JSON.stringify({ success: true }));
    }) as typeof fetch);
    expect(await v.verify("", "ip")).toBe(false);
    expect(await v.verify("x".repeat(2049), "ip")).toBe(false);
    expect(calls).toBe(0);
  });

  it("uses the override URL when given (test environments only)", async () => {
    let url = "";
    const v = createTurnstileVerifier({
      secretKey: () => "s",
      verifyUrl: () => "http://127.0.0.1:9/siteverify",
      fetchImpl: (async (u: string) => {
        url = u;
        return new Response(JSON.stringify({ success: true }));
      }) as unknown as typeof fetch,
    });
    await v.verify("t", "");
    expect(url).toBe("http://127.0.0.1:9/siteverify");
  });
});
