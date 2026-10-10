import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CheckoutPanel } from "./checkout-panel";
import { OrderConfirmation } from "./order-confirmation";
import type { CheckoutOptions, PlacedOrderView } from "./types";

const options: CheckoutOptions = {
  zones: [
    { name: "Región Metropolitana", priceClp: 3990, leadTime: "24 a 48 horas" },
    { name: "Resto de Chile", priceClp: 5990 },
  ],
  freeShippingFromClp: 40000,
  pickup: { details: "Retiro en Ñuñoa" },
  invoiceOffered: true,
  showPrices: true,
  siteKey: "1x00000000000000000000AA",
};

function panel(overrides: Partial<CheckoutOptions> = {}) {
  return renderToStaticMarkup(
    createElement(CheckoutPanel, {
      lines: [{ variantId: "v", quantity: 1 }],
      subtotalClp: 12990,
      options: { ...options, ...overrides },
      onPlaced: () => {},
    }),
  );
}

const placed: PlacedOrderView = {
  code: "K7M2QXA",
  replayed: false,
  subtotalClp: 25980,
  shippingClp: 3990,
  totalClp: 29970,
  whatsappUrl: "https://wa.me/56912345678?text=Hola",
  payment: {
    links: [
      { type: "mercado-pago-link", url: "https://link.mercadopago.cl/tienda" },
      { type: "flow-link", url: "javascript:alert(1)" },
    ],
    bankTransfer: "Banco <b>Estado</b>\nCuenta 123",
    pickup: "Retiro en Ñuñoa",
  },
};

describe("CheckoutPanel", () => {
  it("renders delivery options, contact fields, address and the invoice switch", () => {
    const html = panel();
    expect(html).toContain("Despacho: Región Metropolitana");
    expect(html).toContain("Retiro en tienda");
    for (const id of [
      "name",
      "phone",
      "email",
      "region",
      "commune",
      "street",
      "note",
    ]) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).toContain("Necesito factura");
    expect(html).not.toContain('id="rut"');
    expect(html).toMatch(/autoComplete="tel"|autocomplete="tel"/i);
  });

  it("shows the preview total with the zone's shipping", () => {
    expect(panel()).toContain("$16.980");
  });

  it("hides prices and invoice when the store does", () => {
    const html = panel({ showPrices: false, invoiceOffered: false });
    expect(html).not.toContain("$");
    expect(html).not.toContain("Necesito factura");
  });

  it("uses 44 px touch targets", () => {
    expect(panel()).toContain("min-h-touch");
  });
});

describe("OrderConfirmation", () => {
  const html = renderToStaticMarkup(
    createElement(OrderConfirmation, { placed, showPrices: true }),
  );

  it("shows the code, the total and the WhatsApp button", () => {
    expect(html).toContain("K7M2QXA");
    expect(html).toContain("$29.970");
    expect(html).toContain("Enviar pedido por WhatsApp");
  });

  it("shows only https payment links, with rel noopener noreferrer (O20)", () => {
    expect(html).toContain('href="https://link.mercadopago.cl/tienda"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain("javascript:");
  });

  it("renders the bank transfer as escaped text, never as HTML", () => {
    expect(html).toContain("Banco &lt;b&gt;Estado&lt;/b&gt;");
    expect(html).not.toContain("<b>Estado");
    expect(html).toContain("Retiro en Ñuñoa");
  });

  it("refuses to offer a destination that is not wa.me", () => {
    const bad = renderToStaticMarkup(
      createElement(OrderConfirmation, {
        placed: { ...placed, whatsappUrl: "https://evil.example/x" },
        showPrices: false,
      }),
    );
    expect(bad).not.toContain("Enviar pedido por WhatsApp");
    expect(bad).toContain('role="alert"');
    expect(bad).not.toContain("$29.970");
  });
});
