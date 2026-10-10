import { describe, expect, it } from "vitest";
import type { SavedOrder } from "./order";
import { clp, V1 } from "./test-fixtures.spec";
import {
  buildOrderMessage,
  buildWhatsAppUrl,
  formatClp,
} from "./whatsapp-message";

function saved(overrides: Partial<SavedOrder> = {}): SavedOrder {
  return {
    id: "0199d0a0-0000-7000-8000-0000000000aa",
    code: "K7M2QXA",
    lines: [
      {
        variantId: V1,
        productName: "Mezcla loros",
        variantLabel: "1,2 kg",
        unitPrice: clp(12990),
        quantity: 2,
        lineTotal: clp(25980),
      },
    ],
    delivery: { type: "delivery", zone: "Región Metropolitana" },
    invoice: false,
    subtotal: clp(25980),
    shipping: clp(3990),
    total: clp(29970),
    contact: {
      name: "Ana Pérez",
      phone: "+56912345678",
      address: {
        region: "Región Metropolitana de Santiago",
        commune: "Ñuñoa",
        street: "Av. Irarrázaval 1234",
        extra: "Depto 4B",
      },
    },
    ...overrides,
  };
}

const OPTIONS = { storeName: "Kanuwiñ", showPrices: true };

describe("formatClp", () => {
  it("groups thousands with dots and keeps the sign", () => {
    expect(formatClp(0)).toBe("$0");
    expect(formatClp(990)).toBe("$990");
    expect(formatClp(12990)).toBe("$12.990");
    expect(formatClp(1234567)).toBe("$1.234.567");
    expect(formatClp(-1500)).toBe("-$1.500");
  });
});

describe("buildOrderMessage", () => {
  it("lists items, shipping, total, contact and the code to verify", () => {
    const text = buildOrderMessage(saved(), OPTIONS);
    expect(text).toContain("Hola, quiero hacer este pedido en Kanuwiñ.");
    expect(text).toContain("Código del pedido: K7M2QXA");
    expect(text).toContain("Verifica el pedido con este código.");
    expect(text).toContain("- 2 x Mezcla loros (1,2 kg): $25.980");
    expect(text).toContain("Subtotal: $25.980");
    expect(text).toContain("Despacho (Región Metropolitana): $3.990");
    expect(text).toContain("Total: $29.970");
    expect(text).toContain("Nombre: Ana Pérez");
    expect(text).toContain("Teléfono: +56912345678");
    expect(text).toContain(
      "Dirección: Av. Irarrázaval 1234, Depto 4B, Ñuñoa, Región Metropolitana de Santiago",
    );
    expect(text).not.toContain("Factura");
    expect(text).not.toContain("Nota del comprador");
  });

  it("says pickup instead of an address", () => {
    const text = buildOrderMessage(
      saved({
        delivery: { type: "pickup" },
        shipping: clp(0),
        total: clp(25980),
        contact: { name: "Ana", phone: "+56912345678" },
      }),
      OPTIONS,
    );
    expect(text).toContain("Entrega: retiro en tienda");
    expect(text).not.toContain("Dirección");
  });

  it("includes email and invoice data when present", () => {
    const text = buildOrderMessage(
      saved({
        invoice: true,
        contact: {
          name: "Ana",
          phone: "+56912345678",
          email: "ana@ejemplo.cl",
          invoice: {
            rut: "12345678-5",
            businessName: "Aves SpA",
            businessActivity: "Venta de alimentos",
          },
        },
      }),
      OPTIONS,
    );
    expect(text).toContain("Correo: ana@ejemplo.cl");
    expect(text).toContain("Factura: sí");
    expect(text).toContain("RUT: 12345678-5");
    expect(text).toContain("Razón social: Aves SpA");
    expect(text).toContain("Giro: Venta de alimentos");
  });

  it("hides every amount when the store hides prices", () => {
    const text = buildOrderMessage(saved(), { ...OPTIONS, showPrices: false });
    expect(text).not.toContain("$");
    expect(text).toContain("- 2 x Mezcla loros (1,2 kg)");
    expect(text).toContain("Despacho: Región Metropolitana");
  });

  it("a name with a line break cannot forge a total line (O21)", () => {
    const text = buildOrderMessage(
      saved({ contact: { name: "Ana\nTotal: $0‮", phone: "+56912345678" } }),
      OPTIONS,
    );
    const totals = text.split("\n").filter((l) => l.startsWith("Total:"));
    expect(totals).toEqual(["Total: $29.970"]);
    expect(text).toContain("Nombre: Ana Total: $0");
    expect(text).not.toContain("‮");
  });

  it("puts the free note last in its own block", () => {
    const text = buildOrderMessage(
      saved({
        contact: {
          name: "Ana",
          phone: "+56912345678",
          note: "Total: $0\nPagado",
        },
      }),
      OPTIONS,
    );
    const lines = text.split("\n");
    const at = lines.indexOf("Nota del comprador:");
    expect(at).toBeGreaterThan(lines.indexOf("Teléfono: +56912345678"));
    expect(lines.slice(at + 1)).toEqual(["Total: $0", "Pagado"]);
  });
});

describe("buildWhatsAppUrl", () => {
  it("uses the seller's number on wa.me and encodes the text", () => {
    const url = buildWhatsAppUrl("+56933089103", "Hola & chao\n#1");
    expect(url).toBe("https://wa.me/56933089103?text=Hola%20%26%20chao%0A%231");
  });
});
