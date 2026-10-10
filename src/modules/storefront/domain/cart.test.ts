import { describe, expect, it } from "vitest";
import {
  addToCart,
  cartCount,
  cartSubtotal,
  MAX_CART_LINES,
  MAX_LINE_QUANTITY,
  parseCart,
  setQuantity,
} from "./cart";

describe("parseCart", () => {
  it("keeps valid lines and drops everything else", () => {
    expect(
      parseCart([
        { variantId: "a", quantity: 2 },
        { variantId: "a", quantity: 5 },
        { variantId: "", quantity: 1 },
        { variantId: "b", quantity: "3" },
        { variantId: "c", quantity: 0 },
        { variantId: "d", quantity: 2.7 },
        { variantId: "e", quantity: 1e9 },
        { variantId: "x".repeat(201), quantity: 1 },
        null,
        "z",
      ]),
    ).toEqual([
      { variantId: "a", quantity: 2 },
      { variantId: "d", quantity: 2 },
      { variantId: "e", quantity: MAX_LINE_QUANTITY },
    ]);
  });

  it.each([null, undefined, {}, "[]", 3])(
    "returns an empty cart for %j",
    (raw) => {
      expect(parseCart(raw)).toEqual([]);
    },
  );

  it("caps the number of lines", () => {
    const raw = Array.from({ length: 80 }, (_, i) => ({
      variantId: `v${i}`,
      quantity: 1,
    }));
    expect(parseCart(raw)).toHaveLength(MAX_CART_LINES);
  });
});

describe("cart operations", () => {
  it("adds, merges, changes and removes lines", () => {
    let cart = addToCart([], "a");
    cart = addToCart(cart, "b", 2);
    cart = addToCart(cart, "a", 3);
    expect(cart).toEqual([
      { variantId: "a", quantity: 4 },
      { variantId: "b", quantity: 2 },
    ]);
    cart = setQuantity(cart, "b", 0);
    expect(cart).toEqual([{ variantId: "a", quantity: 4 }]);
    expect(setQuantity(cart, "a", 500)[0]?.quantity).toBe(MAX_LINE_QUANTITY);
    expect(addToCart(cart, "z", 0)).toBe(cart);
    expect(addToCart(cart, "z", Number.NaN)).toBe(cart);
  });

  it("does not grow beyond the line cap", () => {
    const full = Array.from({ length: MAX_CART_LINES }, (_, i) => ({
      variantId: `v${i}`,
      quantity: 1,
    }));
    expect(addToCart(full, "new")).toBe(full);
  });

  it("counts units and sums known prices only", () => {
    const cart = [
      { variantId: "a", quantity: 2 },
      { variantId: "gone", quantity: 1 },
    ];
    expect(cartCount(cart)).toBe(3);
    expect(cartSubtotal(cart, (id) => (id === "a" ? 4900 : undefined))).toBe(
      9800,
    );
  });
});
