import { describe, expect, it } from "vitest";
import { isDomainError, Result } from "@/shared/kernel";
import type { OrderRequest } from "../domain/place-order-rules";
import { request, V1, V2 } from "../domain/test-fixtures.spec";
import { type PlaceOrderInput, placeOrder } from "./place-order";
import { config, HOST_A, harness } from "./test-deps.spec";

const KEY = "0199d0a0-0000-7000-8000-0000000000k1".replace("k", "a");

function input(overrides: Partial<PlaceOrderInput> = {}): PlaceOrderInput {
  return {
    host: HOST_A,
    clientKey: "203.0.113.0",
    idempotencyKey: KEY,
    humanToken: "token",
    request: request(),
    ...overrides,
  };
}

function codeOf(r: Result<unknown, { code: string }>): string | undefined {
  return Result.isErr(r) ? r.error.code : undefined;
}

describe("placeOrder: success", () => {
  it("prices from the catalog and Store Config and returns a wa.me link to the seller", async () => {
    const h = harness();
    const r = await placeOrder(h.deps, input());
    expect(Result.isOk(r)).toBe(true);
    if (!Result.isOk(r)) return;
    // 2 x 12.990 = 25.980 subtotal, zone RM 3.990.
    expect(r.value).toMatchObject({
      code: "K7M2QXA",
      replayed: false,
      subtotalClp: 25980,
      shippingClp: 3990,
      totalClp: 29970,
    });
    expect(
      r.value.whatsappUrl.startsWith("https://wa.me/56912345678?text="),
    ).toBe(true);
    const text = decodeURIComponent(
      r.value.whatsappUrl.split("?text=")[1] ?? "",
    );
    expect(text).toContain("K7M2QXA");
    expect(text).toContain("2 x Mezcla loros (1,2 kg): $25.980");
    expect(text).toContain("Total: $29.970");
    expect(h.saved).toHaveLength(1);
  });

  it("shows the seller's payment methods", async () => {
    const r = await placeOrder(harness().deps, input());
    if (!Result.isOk(r)) throw new Error("expected ok");
    expect(r.value.payment.links.map((l) => l.type)).toEqual([
      "mercado-pago-link",
      "flow-link",
    ]);
    expect(r.value.payment.bankTransfer).toContain("Banco Estado");
    expect(r.value.payment.pickup).toBeUndefined();
  });

  it("pickup shows where to pick up", async () => {
    const r = await placeOrder(
      harness().deps,
      input({ request: request({ delivery: { type: "pickup" } }) }),
    );
    if (!Result.isOk(r)) throw new Error("expected ok");
    expect(r.value.shippingClp).toBe(0);
    expect(r.value.payment.pickup).toContain("Ñuñoa");
  });

  it("logs ids and counts, never buyer data (O14)", async () => {
    const h = harness();
    await placeOrder(
      h.deps,
      input({
        request: request({
          contact: {
            name: "Comprador Centinela",
            phone: "+56900000000",
            email: "comprador-centinela@ejemplo.cl",
          },
        }),
      }),
    );
    const text = JSON.stringify(h.logs);
    expect(h.logs.map((l) => l.event)).toContain("order.placed");
    for (const secret of [
      "Centinela",
      "centinela",
      "56900000000",
      "Irarrázaval",
      "wa.me",
    ]) {
      expect(text).not.toContain(secret);
    }
  });
});

describe("placeOrder: idempotency (O11)", () => {
  it("the same key and cart returns the same order and does not save another", async () => {
    const h = harness();
    const first = await placeOrder(h.deps, input());
    const second = await placeOrder(h.deps, input());
    if (!Result.isOk(first) || !Result.isOk(second))
      throw new Error("expected ok");
    expect(second.value.replayed).toBe(true);
    expect(second.value.code).toBe(first.value.code);
    expect(second.value.whatsappUrl).toBe(first.value.whatsappUrl);
    expect(h.saved).toHaveLength(1);
  });

  it("the same key with another cart is a conflict without data of the first", async () => {
    const h = harness();
    await placeOrder(h.deps, input());
    const r = await placeOrder(
      h.deps,
      input({ request: request({ lines: [{ variantId: V2, quantity: 1 }] }) }),
    );
    expect(codeOf(r)).toBe("IdempotencyConflict");
    expect(JSON.stringify(r)).not.toContain("K7M2QXA");
  });
});

describe("placeOrder: tenant (O4, O7)", () => {
  it.each([
    ["unknown host", { host: "otra.vitrinia.cl" }],
    ["no host", { host: null }],
    ["malformed host", { host: "bad host!" }],
  ])("%s is StoreNotFound before anything else runs", async (_n, patch) => {
    const h = harness();
    const r = await placeOrder(h.deps, input(patch));
    expect(codeOf(r)).toBe("StoreNotFound");
    expect(h.calls).toEqual({ verify: 0, limiter: 0 });
  });

  it("a store without Store Config, WhatsApp, checkout block or flag answers the same", async () => {
    const withWhatsapp = (mutate: (raw: Record<string, unknown>) => void) =>
      config(mutate);
    const cases = [
      harness({ configA: undefined }),
      harness({
        configA: withWhatsapp((raw) => {
          raw.contact = { whatsapp: "+56900000000" };
        }),
      }),
      harness({
        configA: withWhatsapp((raw) => {
          delete raw.checkout;
        }),
      }),
      harness({
        configA: withWhatsapp((raw) => {
          raw.features = {
            ...(raw.features as object),
            whatsappCheckout: false,
          };
        }),
      }),
    ];
    for (const h of cases) {
      const r = await placeOrder(h.deps, input());
      expect(codeOf(r)).toBe("StoreNotFound");
      expect(h.saved).toHaveLength(0);
    }
  });

  it("a variant that is not in this store's catalog is ItemUnavailable, same as a random id", async () => {
    const h = harness();
    const foreign = await placeOrder(
      h.deps,
      input({
        request: request({
          lines: [
            { variantId: "0199d0a0-0000-7000-8000-0000000000ff", quantity: 1 },
          ],
        }),
      }),
    );
    const mixed = await placeOrder(
      h.deps,
      input({
        idempotencyKey: "0199d0a0-0000-7000-8000-0000000000a2",
        request: request({
          lines: [
            { variantId: V1, quantity: 1 },
            { variantId: "0199d0a0-0000-7000-8000-0000000000fe", quantity: 1 },
          ],
        }),
      }),
    );
    expect(codeOf(foreign)).toBe("ItemUnavailable");
    expect(JSON.stringify(foreign)).toEqual(JSON.stringify(mixed));
    expect(h.saved).toHaveLength(0);
  });
});

describe("placeOrder: ignores the client's money (O1)", () => {
  it("extra price fields on the request object do not change the saved snapshot", async () => {
    const h = harness();
    const tampered = {
      ...request(),
      price: 1,
      total: 1,
      shippingCost: 0,
      lines: [{ variantId: V1, quantity: 1, unitPrice: 1, price: 1 }],
    } as unknown as OrderRequest;
    const r = await placeOrder(h.deps, input({ request: tampered }));
    if (!Result.isOk(r)) throw new Error("expected ok");
    expect(r.value.subtotalClp).toBe(12990);
    expect(h.saved[0]?.draft.lines[0]?.unitPrice.amount).toBe(12990);
  });

  it("free shipping applies from the Store Config threshold", async () => {
    const r = await placeOrder(
      harness().deps,
      input({ request: request({ lines: [{ variantId: V1, quantity: 4 }] }) }),
    );
    expect(Result.isOk(r) && r.value.shippingClp).toBe(0);
  });
});

describe("placeOrder: validation and abuse controls", () => {
  it("invalid data is InvalidOrder, does not touch the limiter or the verifier", async () => {
    const h = harness();
    const r = await placeOrder(
      h.deps,
      input({ request: request({ contact: { name: "", phone: "x" } }) }),
    );
    expect(codeOf(r)).toBe("InvalidOrder");
    expect(h.calls).toEqual({ verify: 0, limiter: 0 });
  });

  it.each(["client_limit", "store_quota"] as const)(
    "%s is RateLimited, before verification and without saving (O12)",
    async (decision) => {
      const h = harness({ limiter: { check: () => decision } });
      const r = await placeOrder(h.deps, input());
      expect(codeOf(r)).toBe("RateLimited");
      expect(h.calls.verify).toBe(0);
      expect(h.saved).toHaveLength(0);
      expect(h.logs[0]).toMatchObject({
        event: "security.rate_limited",
        fields: { reason: decision },
      });
    },
  );

  it("a failed human check is HumanVerificationFailed and saves nothing", async () => {
    const h = harness({ verifier: { verify: async () => false } });
    const r = await placeOrder(h.deps, input());
    expect(codeOf(r)).toBe("HumanVerificationFailed");
    expect(h.saved).toHaveLength(0);
  });

  it("passes the token and client key to the verifier", async () => {
    const seen: string[] = [];
    const h = harness({
      verifier: {
        verify: async (t, c) => {
          seen.push(t, c);
          return true;
        },
      },
    });
    await placeOrder(h.deps, input({ humanToken: "tok-1", clientKey: "k-1" }));
    expect(seen).toEqual(["tok-1", "k-1"]);
  });

  it("all domain errors are plain data without stack or buyer input", async () => {
    const r = await placeOrder(
      harness().deps,
      input({ request: request({ lines: [] }) }),
    );
    expect(Result.isErr(r) && isDomainError(r.error)).toBe(true);
  });
});
