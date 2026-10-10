import { Money, Result } from "@/shared/kernel";
import type {
  CatalogVariant,
  CheckoutRules,
  OrderRequest,
} from "./place-order-rules";

/** Test helpers for the orders domain and application tests. Not exported by the module. */
export function clp(amount: number): Money {
  const money = Money.of(amount, "CLP");
  if (Result.isErr(money)) throw new Error("bad test money");
  return money.value;
}

export const V1 = "0199d0a0-0000-7000-8000-000000000001";
export const V2 = "0199d0a0-0000-7000-8000-000000000002";

export const VARIANTS: ReadonlyMap<string, CatalogVariant> = new Map([
  [
    V1,
    { productName: "Mezcla loros", variantLabel: "1,2 kg", price: clp(12990) },
  ],
  [V2, { productName: "Snack", variantLabel: "200 g", price: clp(4990) }],
]);

export const RULES: CheckoutRules = {
  zones: [
    { name: "Región Metropolitana", priceClp: 3990 },
    { name: "Resto de Chile", priceClp: 5990 },
  ],
  freeShippingFromClp: 40000,
  pickupOffered: true,
  invoiceOffered: true,
};

export function request(overrides: Partial<OrderRequest> = {}): OrderRequest {
  return {
    lines: [{ variantId: V1, quantity: 2 }],
    delivery: {
      type: "delivery",
      zone: "Región Metropolitana",
      address: {
        region: "Región Metropolitana de Santiago",
        commune: "Ñuñoa",
        street: "Av. Irarrázaval 1234",
      },
    },
    contact: { name: "Ana Pérez", phone: "9 1234 5678" },
    ...overrides,
  };
}
