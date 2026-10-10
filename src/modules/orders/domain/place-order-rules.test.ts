import { describe, expect, it } from "vitest";
import { isDomainError, Result } from "@/shared/kernel";
import type { InvalidOrder } from "./errors";
import {
  type OrderRequest,
  priceOrder,
  validateOrderRequest,
} from "./place-order-rules";
import { clp, RULES, request, V1, V2, VARIANTS } from "./test-fixtures.spec";

function issuesOf(
  req: OrderRequest,
  rules = RULES,
): ReadonlyArray<string> | undefined {
  const r = validateOrderRequest(req, rules);
  return Result.isErr(r)
    ? r.error.issues.map((i) => `${i.path}:${i.code}`)
    : undefined;
}

function valid(req: OrderRequest, rules = RULES) {
  const r = validateOrderRequest(req, rules);
  if (Result.isErr(r)) throw new Error(JSON.stringify(r.error));
  return r.value;
}

describe("validateOrderRequest: contact", () => {
  it("normalises name and phone and keeps optional data apart", () => {
    const v = valid(
      request({
        contact: {
          name: " Ana\nPérez ",
          phone: "+56 9 1234 5678",
          email: " ana@ejemplo.cl ",
          note: "Tocar timbre\n\n\n\nGracias",
        },
      }),
    );
    expect(v.contact.name).toBe("Ana Pérez");
    expect(v.contact.phone).toBe("+56912345678");
    expect(v.contact.email).toBe("ana@ejemplo.cl");
    expect(v.contact.note).toBe("Tocar timbre\n\nGracias");
  });

  it("requires name and a valid phone", () => {
    expect(
      issuesOf(request({ contact: { name: "  ", phone: "123" } })),
    ).toEqual(["contact.name:required", "contact.phone:invalid"]);
  });

  it("limits lengths", () => {
    expect(
      issuesOf(
        request({
          contact: {
            name: "x".repeat(81),
            phone: "912345678",
            note: "n".repeat(501),
          },
        }),
      ),
    ).toEqual(["contact.name:too_long", "contact.note:too_long"]);
  });

  it("rejects a malformed email and drops a blank one", () => {
    expect(
      issuesOf(
        request({
          contact: { name: "A", phone: "912345678", email: "no-es-correo" },
        }),
      ),
    ).toEqual(["contact.email:invalid"]);
    const v = valid(
      request({
        contact: { name: "A", phone: "912345678", email: "  ", note: " \n " },
      }),
    );
    expect(v.contact.email).toBeUndefined();
    expect(v.contact.note).toBeUndefined();
  });

  it("errors never carry the values the buyer sent", () => {
    const r = validateOrderRequest(
      request({ contact: { name: "", phone: "comprador-centinela" } }),
      RULES,
    );
    expect(JSON.stringify(Result.isErr(r) && r.error)).not.toContain(
      "centinela",
    );
  });
});

describe("validateOrderRequest: lines (O2)", () => {
  it.each([0, -1, 1.5, 100, 1e9, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects quantity %s",
    (quantity) => {
      expect(
        issuesOf(request({ lines: [{ variantId: V1, quantity }] })),
      ).toEqual(["items.0.quantity:range"]);
    },
  );

  it("rejects no lines, more than 50 and duplicates (never summed)", () => {
    expect(issuesOf(request({ lines: [] }))).toEqual(["items:count"]);
    const many = Array.from({ length: 51 }, (_, i) => ({
      variantId: `v-${i}`,
      quantity: 1,
    }));
    expect(issuesOf(request({ lines: many }))).toEqual(["items:count"]);
    expect(
      issuesOf(
        request({
          lines: [
            { variantId: V1, quantity: 1 },
            { variantId: V1, quantity: 1 },
          ],
        }),
      ),
    ).toEqual(["items.1.variantId:duplicate"]);
  });

  it("rejects an empty variant id", () => {
    expect(
      issuesOf(request({ lines: [{ variantId: "", quantity: 1 }] })),
    ).toEqual(["items.0.variantId:required"]);
  });
});

describe("validateOrderRequest: delivery (O5)", () => {
  it("accepts pickup only when the store offers it", () => {
    expect(valid(request({ delivery: { type: "pickup" } })).delivery).toEqual({
      type: "pickup",
    });
    expect(
      issuesOf(request({ delivery: { type: "pickup" } }), {
        ...RULES,
        pickupOffered: false,
      }),
    ).toEqual(["delivery.type:unavailable"]);
  });

  it("requires a zone of THIS store", () => {
    const base = request();
    if (base.delivery.type !== "delivery") throw new Error("fixture");
    expect(
      issuesOf({
        ...base,
        delivery: { ...base.delivery, zone: "Zona de otra tienda" },
      }),
    ).toEqual(["delivery.zone:unknown_zone"]);
  });

  it("requires a real region and a commune and street", () => {
    expect(
      issuesOf(
        request({
          delivery: {
            type: "delivery",
            zone: "Región Metropolitana",
            address: {
              region: "Narnia",
              commune: " ",
              street: "x".repeat(121),
            },
          },
        }),
      ),
    ).toEqual([
      "delivery.address.region:invalid",
      "delivery.address.commune:required",
      "delivery.address.street:too_long",
    ]);
  });

  it("keeps the optional extra only when it has text", () => {
    const base = request();
    if (base.delivery.type !== "delivery") throw new Error("fixture");
    const withExtra = valid({
      ...base,
      delivery: {
        ...base.delivery,
        address: { ...base.delivery.address, extra: "Depto 4B" },
      },
    });
    expect(withExtra.contact.address?.extra).toBe("Depto 4B");
    const blank = valid({
      ...base,
      delivery: {
        ...base.delivery,
        address: { ...base.delivery.address, extra: "  " },
      },
    });
    expect(blank.contact.address).not.toHaveProperty("extra");
    expect(
      issuesOf({
        ...base,
        delivery: {
          ...base.delivery,
          address: { ...base.delivery.address, extra: "e".repeat(121) },
        },
      }),
    ).toEqual(["delivery.address.extra:too_long"]);
  });

  it("pickup stores no address", () => {
    expect(
      valid(request({ delivery: { type: "pickup" } })).contact.address,
    ).toBeUndefined();
  });
});

describe("validateOrderRequest: invoice (O6)", () => {
  const invoice = {
    rut: "12.345.678-5",
    businessName: "Aves SpA",
    businessActivity: "Venta de alimentos",
  };

  it("canonicalises the RUT and flags the order as invoiced", () => {
    const v = valid(request({ invoice }));
    expect(v.invoice).toBe(true);
    expect(v.contact.invoice).toEqual({ ...invoice, rut: "12345678-5" });
  });

  it("no invoice means no invoice data", () => {
    const v = valid(request());
    expect(v.invoice).toBe(false);
    expect(v.contact.invoice).toBeUndefined();
  });

  it("rejects an invalid RUT and missing fields", () => {
    expect(
      issuesOf(request({ invoice: { ...invoice, rut: "12.345.678-4" } })),
    ).toEqual(["invoice.rut:invalid"]);
    expect(
      issuesOf(
        request({
          invoice: { ...invoice, businessName: "", businessActivity: " " },
        }),
      ),
    ).toEqual([
      "invoice.businessName:required",
      "invoice.businessActivity:required",
    ]);
  });

  it("rejects an invoice request when the store does not issue facturas", () => {
    expect(
      issuesOf(request({ invoice }), { ...RULES, invoiceOffered: false }),
    ).toContain("invoice:unavailable");
  });
});

describe("priceOrder (O1, O4, O5)", () => {
  const lookup = (id: string) => VARIANTS.get(id);

  function price(req: OrderRequest, rules = RULES) {
    return priceOrder(valid(req, rules), lookup, rules);
  }

  it("prices every line from the catalog and adds the zone's shipping", () => {
    const r = price(
      request({
        lines: [
          { variantId: V1, quantity: 2 },
          { variantId: V2, quantity: 1 },
        ],
      }),
    );
    expect(Result.isOk(r)).toBe(true);
    if (!Result.isOk(r)) return;
    expect(
      r.value.lines.map((l) => [
        l.productName,
        l.unitPrice.amount,
        l.lineTotal.amount,
      ]),
    ).toEqual([
      ["Mezcla loros", 12990, 25980],
      ["Snack", 4990, 4990],
    ]);
    expect(r.value.subtotal.amount).toBe(30970);
    expect(r.value.shipping.amount).toBe(3990);
    expect(r.value.total.amount).toBe(34960);
    expect(r.value.invoice).toBe(false);
  });

  it("ships free from the threshold, and pickup costs nothing", () => {
    const free = price(request({ lines: [{ variantId: V1, quantity: 4 }] }));
    expect(Result.isOk(free) && free.value.shipping.amount).toBe(0);
    const exactly = priceOrder(
      valid(request({ lines: [{ variantId: V2, quantity: 1 }] })),
      lookup,
      { ...RULES, freeShippingFromClp: 4990 },
    );
    expect(Result.isOk(exactly) && exactly.value.shipping.amount).toBe(0);
    const pickup = price(request({ delivery: { type: "pickup" } }));
    expect(Result.isOk(pickup) && pickup.value.shipping.amount).toBe(0);
  });

  it("a variant the catalog does not know is ItemUnavailable, without saying which", () => {
    const r = priceOrder(
      valid(
        request({
          lines: [
            { variantId: V1, quantity: 1 },
            { variantId: "otra-tienda", quantity: 1 },
          ],
        }),
      ),
      lookup,
      RULES,
    );
    expect(Result.isErr(r) && r.error.code).toBe("ItemUnavailable");
    expect(JSON.stringify(Result.isErr(r) && r.error)).not.toContain(
      "otra-tienda",
    );
  });

  it("rejects a variant priced in another currency", () => {
    const odd = {
      productName: "x",
      variantLabel: "y",
      price: { ...clp(1), currency: "USD" },
    };
    const r = priceOrder(valid(request()), () => odd as never, RULES);
    expect(Result.isErr(r) && r.error.code).toBe("ItemUnavailable");
  });

  it("refuses a total above the cap and arithmetic overflow", () => {
    const huge = {
      productName: "Oro",
      variantLabel: "1 kg",
      price: clp(100_000_000),
    };
    const r = priceOrder(
      valid(request({ lines: [{ variantId: V1, quantity: 99 }] })),
      () => huge,
      RULES,
    );
    expect(Result.isErr(r) && r.error.code).toBe("InvalidOrder");
    const overflow = { ...huge, price: clp(Number.MAX_SAFE_INTEGER) };
    const o = priceOrder(
      valid(request({ lines: [{ variantId: V1, quantity: 99 }] })),
      () => overflow,
      RULES,
    );
    expect(Result.isErr(o) && o.error.code).toBe("InvalidOrder");
    const sum = priceOrder(
      valid(
        request({
          lines: [
            { variantId: V1, quantity: 1 },
            { variantId: V2, quantity: 1 },
          ],
        }),
      ),
      () => ({ ...huge, price: clp(Number.MAX_SAFE_INTEGER - 1) }),
      RULES,
    );
    expect(Result.isErr(sum) && isDomainError(sum.error)).toBe(true);
  });

  it("fails if the zone vanished from the rules between validation and pricing", () => {
    const v = valid(request());
    const r = priceOrder(v, lookup, { ...RULES, zones: [] });
    expect(Result.isErr(r) && (r.error as InvalidOrder).issues?.[0]?.path).toBe(
      "delivery.zone",
    );
  });

  it("fingerprint ignores line order and contact, not quantities or zone", () => {
    const a = price(
      request({
        lines: [
          { variantId: V1, quantity: 1 },
          { variantId: V2, quantity: 2 },
        ],
      }),
    );
    const b = price(
      request({
        lines: [
          { variantId: V2, quantity: 2 },
          { variantId: V1, quantity: 1 },
        ],
        contact: { name: "Otra persona", phone: "987654321" },
      }),
    );
    const c = price(
      request({
        lines: [
          { variantId: V1, quantity: 1 },
          { variantId: V2, quantity: 3 },
        ],
      }),
    );
    const d = price(
      request({
        lines: [
          { variantId: V1, quantity: 1 },
          { variantId: V2, quantity: 2 },
        ],
        delivery: { type: "pickup" },
      }),
    );
    if (
      !Result.isOk(a) ||
      !Result.isOk(b) ||
      !Result.isOk(c) ||
      !Result.isOk(d)
    )
      throw new Error("price");
    expect(a.value.fingerprint).toBe(b.value.fingerprint);
    expect(a.value.fingerprint).not.toBe(c.value.fingerprint);
    expect(a.value.fingerprint).not.toBe(d.value.fingerprint);
  });
});
