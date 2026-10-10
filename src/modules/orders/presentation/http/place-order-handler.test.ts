import { describe, expect, it } from "vitest";
import { HOST_A, harness } from "../../application/test-deps.spec";
import { V1 } from "../../domain/test-fixtures.spec";
import {
  clientKeyOf,
  createPlaceOrderHandler,
  MAX_BODY_BYTES,
  truncateAddress,
} from "./place-order-handler";

const KEY = "0199d0a0-0000-7000-8000-0000000000a1";

function body(overrides: Record<string, unknown> = {}) {
  return {
    idempotencyKey: KEY,
    turnstileToken: "XXXX.DUMMY.TOKEN",
    items: [{ variantId: V1, quantity: 2 }],
    delivery: {
      type: "delivery",
      zone: "Región Metropolitana",
      address: {
        region: "Región Metropolitana de Santiago",
        commune: "Ñuñoa",
        street: "Calle Centinela 123",
      },
    },
    contact: {
      name: "Comprador Centinela",
      phone: "+56900000000",
      email: "comprador-centinela@ejemplo.cl",
    },
    ...overrides,
  };
}

function post(
  payload: unknown,
  headers: Record<string, string> = {},
  raw?: string,
) {
  return new Request(`https://${HOST_A}/api/orders`, {
    method: "POST",
    headers: {
      host: HOST_A,
      origin: `https://${HOST_A}`,
      "content-type": "application/json",
      "cf-connecting-ip": "203.0.113.77",
      ...headers,
    },
    body: raw ?? JSON.stringify(payload),
  });
}

async function call(h = harness(), req = post(body())) {
  const res = await createPlaceOrderHandler(h.deps)(req);
  return { res, json: (await res.json()) as Record<string, unknown>, h };
}

describe("POST /api/orders: success", () => {
  it("creates the order and answers private, no-store (O17)", async () => {
    const { res, json, h } = await call();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(json).toMatchObject({ code: "K7M2QXA", totalClp: 29970 });
    expect(String(json.whatsappUrl).startsWith("https://wa.me/")).toBe(true);
    expect(h.saved).toHaveLength(1);
  });

  it("accepts pickup without address and an invoice block", async () => {
    const payload = body({
      delivery: { type: "pickup" },
      invoice: {
        rut: "12.345.678-5",
        businessName: "Aves SpA",
        businessActivity: "Venta",
      },
    });
    const { res } = await call(harness(), post(payload));
    // The fixture store does issue facturas.
    expect(res.status).toBe(200);
  });
});

describe("POST /api/orders: same origin only (O13)", () => {
  it.each([
    ["foreign Origin", { origin: "https://evil.example" }],
    ["Origin with another port", { origin: `https://${HOST_A}:8443` }],
    ["no Origin", { origin: "" }],
    ["unparseable Origin", { origin: "null" }],
  ])("%s is 403 with no effects", async (_n, headers) => {
    const h = harness();
    const { res } = await call(h, post(body(), headers));
    expect(res.status).toBe(403);
    expect(h.saved).toHaveLength(0);
    expect(h.calls).toEqual({ verify: 0, limiter: 0 });
  });

  it("a missing Host is also refused", async () => {
    const req = new Request("https://x.test/api/orders", {
      method: "POST",
      body: "{}",
      headers: { origin: "https://x.test" },
    });
    const res = await createPlaceOrderHandler(harness().deps)(req);
    // fetch Request has no automatic host header in this runtime.
    expect(res.status).toBe(403);
  });
});

describe("POST /api/orders: body limits (O3)", () => {
  it("413 by declared content-length and by streamed size", async () => {
    const big = JSON.stringify(
      body({
        contact: { name: "x", phone: "9", note: "n".repeat(MAX_BODY_BYTES) },
      }),
    );
    const declared = await call(
      harness(),
      post(null, { "content-length": String(big.length) }, big),
    );
    expect(declared.res.status).toBe(413);
    const streamed = await call(harness(), post(null, {}, big));
    expect(streamed.res.status).toBe(413);
  });

  it("400 for broken JSON", async () => {
    const { res, json } = await call(harness(), post(null, {}, "{not json"));
    expect(res.status).toBe(400);
    expect(json.error).toBe("INVALID_JSON");
  });
});

describe("POST /api/orders: strict schema (O1, O2, O5, O6)", () => {
  it.each([
    ["price", { price: 1 }],
    ["total", { total: 1 }],
    ["currency", { currency: "USD" }],
    ["shippingCost", { shippingCost: 0 }],
    ["storeId", { storeId: "0199d0a0-0000-7000-8000-00000000000b" }],
    ["name", { name: "Otro" }],
  ])("a body with %s is refused, not ignored", async (_n, extra) => {
    const h = harness();
    const { res, json } = await call(h, post({ ...body(), ...extra }));
    expect(res.status).toBe(400);
    expect(json.error).toBe("INVALID_ORDER");
    expect(h.saved).toHaveLength(0);
  });

  it("refuses prices inside a line and unknown keys in contact", async () => {
    const withPrice = await call(
      harness(),
      post(body({ items: [{ variantId: V1, quantity: 1, unitPrice: 1 }] })),
    );
    expect(withPrice.res.status).toBe(400);
    const extraContact = await call(
      harness(),
      post(body({ contact: { name: "A", phone: "912345678", admin: true } })),
    );
    expect(extraContact.res.status).toBe(400);
  });

  it.each([
    ["quantity 0", { items: [{ variantId: V1, quantity: 0 }] }],
    ["quantity -1", { items: [{ variantId: V1, quantity: -1 }] }],
    ["quantity 1.5", { items: [{ variantId: V1, quantity: 1.5 }] }],
    ["quantity 1e9", { items: [{ variantId: V1, quantity: 1e9 }] }],
    ["no items", { items: [] }],
    [
      "51 lines",
      {
        items: Array.from({ length: 51 }, (_, i) => ({
          variantId: `0199d0a0-0000-7000-8000-${String(i).padStart(12, "0")}`,
          quantity: 1,
        })),
      },
    ],
    ["variantId not a uuid", { items: [{ variantId: "abc", quantity: 1 }] }],
    ["bad idempotency key", { idempotencyKey: "uno" }],
    ["no token", { turnstileToken: "" }],
    [
      "pickup with an address",
      {
        delivery: {
          type: "pickup",
          address: { region: "x", commune: "y", street: "z" },
        },
      },
    ],
    ["unknown delivery type", { delivery: { type: "drone" } }],
  ])("%s is 400", async (_n, patch) => {
    const { res } = await call(harness(), post(body(patch)));
    expect(res.status).toBe(400);
  });

  it("duplicate variants pass the schema and are refused by the rules (never summed)", async () => {
    const dup = body({
      items: [
        { variantId: V1, quantity: 1 },
        { variantId: V1, quantity: 1 },
      ],
    });
    const { res, json } = await call(harness(), post(dup));
    expect(res.status).toBe(400);
    expect(JSON.stringify(json.issues)).toContain("duplicate");
  });

  it("an invoice block with a bad RUT is 400 without echoing it", async () => {
    const { res, json } = await call(
      harness(),
      post(
        body({
          invoice: {
            rut: "11.111.111-9",
            businessName: "X",
            businessActivity: "Y",
          },
        }),
      ),
    );
    expect(res.status).toBe(400);
    expect(JSON.stringify(json)).not.toContain("11.111.111");
  });
});

describe("POST /api/orders: error mapping", () => {
  it("404 for an unknown host, identical to an unpublished store", async () => {
    const other = new Request("https://nada.vitrinia.cl/api/orders", {
      method: "POST",
      headers: {
        host: "nada.vitrinia.cl",
        origin: "https://nada.vitrinia.cl",
        "content-type": "application/json",
      },
      body: JSON.stringify(body()),
    });
    const a = await call(harness(), other);
    const b = await call(harness({ configA: undefined }));
    expect(a.res.status).toBe(404);
    expect(b.res.status).toBe(404);
    expect(a.json).toEqual(b.json);
  });

  it("422 for an unavailable item, 409 for a reused key with another cart, 403 for the human check, 429 when limited", async () => {
    const unknown = await call(
      harness(),
      post(
        body({
          items: [
            { variantId: "0199d0a0-0000-7000-8000-0000000000ee", quantity: 1 },
          ],
        }),
      ),
    );
    expect(unknown.res.status).toBe(422);

    const h = harness();
    expect((await call(h)).res.status).toBe(200);
    const conflict = await call(
      h,
      post(body({ items: [{ variantId: V1, quantity: 3 }] })),
    );
    expect(conflict.res.status).toBe(409);

    const human = await call(
      harness({ verifier: { verify: async () => false } }),
    );
    expect(human.res.status).toBe(403);

    const limited = await call(
      harness({ limiter: { check: () => "client_limit" } }),
    );
    expect(limited.res.status).toBe(429);
    expect(limited.res.headers.get("retry-after")).toBe("600");
    expect(limited.res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("a double submit returns the same order (O11)", async () => {
    const h = harness();
    const first = await call(h);
    const second = await call(h);
    expect(second.json.code).toBe(first.json.code);
    expect(second.json.replayed).toBe(true);
    expect(h.saved).toHaveLength(1);
  });
});

describe("POST /api/orders: no personal data in logs or errors (O14)", () => {
  it("a validation error, a DB failure and a success leave no sentinel in logs or bodies", async () => {
    const h = harness({
      orders: {
        place: async () => {
          throw Object.assign(
            new Error(
              "duplicate key value for comprador-centinela@ejemplo.cl +56900000000",
            ),
            { code: "23505" },
          );
        },
      },
    });
    const failed = await call(h);
    expect(failed.res.status).toBe(500);
    const invalid = await call(
      h,
      post(body({ contact: { name: "Comprador Centinela", phone: "no" } })),
    );
    const ok = await call(harness());
    const everything = JSON.stringify([h.logs, failed.json, invalid.json]);
    for (const sentinel of [
      "comprador-centinela",
      "Centinela",
      "56900000000",
      "Calle Centinela",
      "XXXX.DUMMY",
    ]) {
      expect(everything, sentinel).not.toContain(sentinel);
    }
    expect(h.logs.map((l) => l.event)).toContain("order.failed");
    // The success body does carry the buyer's own data inside the wa.me link, by design, and only there.
    expect(Object.keys(ok.json).sort()).toEqual(
      [
        "code",
        "payment",
        "replayed",
        "shippingClp",
        "subtotalClp",
        "totalClp",
        "whatsappUrl",
      ].sort(),
    );
  });
});

describe("client address", () => {
  it("truncates IPv4 to /24 and IPv6 to /48; junk becomes unknown", () => {
    expect(truncateAddress("203.0.113.77")).toBe("203.0.113.0");
    expect(truncateAddress("2001:DB8:1234:5678::1")).toBe("2001:db8:1234::");
    expect(truncateAddress("not an ip")).toBe("unknown");
    expect(truncateAddress("")).toBe("unknown");
  });

  it("prefers cf-connecting-ip, then the last x-forwarded-for hop", () => {
    expect(
      clientKeyOf(
        new Headers({
          "cf-connecting-ip": "1.2.3.4",
          "x-forwarded-for": "9.9.9.9",
        }),
      ),
    ).toBe("1.2.3.0");
    expect(
      clientKeyOf(new Headers({ "x-forwarded-for": "6.6.6.6, 5.5.5.5" })),
    ).toBe("5.5.5.0");
    expect(clientKeyOf(new Headers())).toBe("unknown");
  });

  it("the limiter sees the truncated address, never the full one", async () => {
    const seen: string[] = [];
    const h = harness({
      limiter: {
        check: (_s, k) => {
          seen.push(k);
          return "allowed";
        },
      },
    });
    await call(h);
    expect(seen).toEqual(["203.0.113.0"]);
  });
});
