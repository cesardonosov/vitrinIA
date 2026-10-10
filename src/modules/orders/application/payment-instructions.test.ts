import { describe, expect, it } from "vitest";
import { buildPaymentInstructions } from "./payment-instructions";
import { config, STORE_A } from "./test-deps.spec";

function logSpy() {
  const events: Array<{ event: string; fields: Record<string, unknown> }> = [];
  return {
    events,
    log: {
      info: () => {},
      warn: (event: string, fields: Record<string, unknown>) =>
        events.push({ event, fields }),
    },
  };
}

describe("buildPaymentInstructions (O20)", () => {
  it("returns the seller's links, transfer text and pickup details", () => {
    const { log } = logSpy();
    const out = buildPaymentInstructions(config(), STORE_A, true, log);
    expect(out.links.map((l) => l.url)).toEqual([
      "https://link.mercadopago.cl/tiendademo",
      "https://www.flow.cl/btn.php?token=abc123",
    ]);
    expect(out.bankTransfer).toContain("Banco Estado");
    expect(out.pickup).toContain("Retiro");
  });

  it("omits the links when the payment link flag is off but keeps the transfer text", () => {
    const { log } = logSpy();
    const c = config((raw) => {
      raw.features = {
        ...(raw.features as object),
        paymentLinkCheckout: false,
      };
    });
    const out = buildPaymentInstructions(c, STORE_A, false, log);
    expect(out.links).toEqual([]);
    expect(out.bankTransfer).toBeDefined();
    expect(out.pickup).toBeUndefined();
  });

  it("drops a link that no longer passes the allowlist and logs the store, not the URL", () => {
    const { log, events } = logSpy();
    const c = config();
    // A config edited out of band, as if the allowlist had been tightened since it was written.
    const tampered = structuredClone(c) as unknown as {
      checkout: { paymentMethods: Array<{ type: string; url?: string }> };
    };
    const mp = tampered.checkout.paymentMethods[0];
    if (mp) mp.url = "https://mercadopago.cl.evil.com/pay";
    const out = buildPaymentInstructions(
      tampered as unknown as typeof c,
      STORE_A,
      false,
      log,
    );
    expect(out.links.map((l) => l.type)).toEqual(["flow-link"]);
    expect(events).toEqual([
      {
        event: "payment_link_rejected",
        fields: { store_id: STORE_A, method: "mercado-pago-link" },
      },
    ]);
    expect(JSON.stringify(events)).not.toContain("evil");
  });

  it.each([
    "http://link.mercadopago.cl/x",
    "javascript:alert(1)",
    "https://user@link.mercadopago.cl/x",
    "https://link.mercadopago.cl.evil.com/x",
  ])("rejects %s", (url) => {
    const { log } = logSpy();
    const tampered = structuredClone(config()) as unknown as {
      checkout: { paymentMethods: Array<{ type: string; url?: string }> };
    };
    const mp = tampered.checkout.paymentMethods[0];
    if (mp) mp.url = url;
    const out = buildPaymentInstructions(
      tampered as never,
      STORE_A,
      false,
      log,
    );
    expect(out.links.map((l) => l.type)).toEqual(["flow-link"]);
  });

  it("a store without checkout shows nothing", () => {
    const { log } = logSpy();
    const c = config((raw) => {
      delete raw.checkout;
    });
    expect(buildPaymentInstructions(c, STORE_A, true, log)).toEqual({
      links: [],
    });
  });
});
