/**
 * Buyer cart (VIT-184). Lives in the browser, one per store host. It only
 * holds variant ids and quantities: names and prices always come from the
 * catalog, and the server recalculates everything when the order is placed
 * (ADR-0005 §1), so a tampered cart can change nothing but its own display.
 */

export interface CartLine {
  readonly variantId: string;
  readonly quantity: number;
}

export type Cart = ReadonlyArray<CartLine>;

export const MAX_CART_LINES = 50;
export const MAX_LINE_QUANTITY = 99;
const MAX_VARIANT_ID_LENGTH = 200;

function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 0;
  return Math.min(MAX_LINE_QUANTITY, Math.max(0, Math.trunc(quantity)));
}

/** Parses whatever the browser storage returned. Anything malformed is dropped. */
export function parseCart(raw: unknown): Cart {
  if (!Array.isArray(raw)) return [];
  const lines: CartLine[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (lines.length >= MAX_CART_LINES) break;
    if (typeof item !== "object" || item === null) continue;
    const { variantId, quantity } = item as Record<string, unknown>;
    if (
      typeof variantId !== "string" ||
      variantId.length === 0 ||
      variantId.length > MAX_VARIANT_ID_LENGTH ||
      typeof quantity !== "number" ||
      seen.has(variantId)
    ) {
      continue;
    }
    const q = clampQuantity(quantity);
    if (q === 0) continue;
    seen.add(variantId);
    lines.push({ variantId, quantity: q });
  }
  return lines;
}

export function addToCart(cart: Cart, variantId: string, quantity = 1): Cart {
  const existing = cart.find((line) => line.variantId === variantId);
  if (existing) {
    return setQuantity(cart, variantId, existing.quantity + quantity);
  }
  if (cart.length >= MAX_CART_LINES) return cart;
  const q = clampQuantity(quantity);
  return q === 0 ? cart : [...cart, { variantId, quantity: q }];
}

/** Quantity 0 removes the line. */
export function setQuantity(
  cart: Cart,
  variantId: string,
  quantity: number,
): Cart {
  const q = clampQuantity(quantity);
  if (q === 0) return cart.filter((line) => line.variantId !== variantId);
  return cart.map((line) =>
    line.variantId === variantId ? { ...line, quantity: q } : line,
  );
}

export function cartCount(cart: Cart): number {
  return cart.reduce((sum, line) => sum + line.quantity, 0);
}

/** Display subtotal in CLP for the lines whose variant still exists. */
export function cartSubtotal(
  cart: Cart,
  unitPrice: (variantId: string) => number | undefined,
): number {
  return cart.reduce((sum, line) => {
    const price = unitPrice(line.variantId);
    return price === undefined ? sum : sum + price * line.quantity;
  }, 0);
}
