import type { Money } from "@/shared/kernel";

/** One validated address (delivery only). */
export interface BuyerAddress {
  readonly region: string;
  readonly commune: string;
  readonly street: string;
  readonly extra?: string;
}

/** Invoice data (only when the buyer asks for factura). */
export interface BuyerInvoice {
  readonly rut: string;
  readonly businessName: string;
  readonly businessActivity: string;
}

/** The buyer's data, already cleaned (see `text.ts`). */
export interface BuyerContact {
  readonly name: string;
  /** E.164. */
  readonly phone: string;
  readonly email?: string;
  readonly note?: string;
  readonly address?: BuyerAddress;
  readonly invoice?: BuyerInvoice;
}

export type DeliveryChoice =
  | { readonly type: "pickup" }
  | { readonly type: "delivery"; readonly zone: string };

/** A line as the server priced it: names and prices come from the catalog, never the client. */
export interface PricedLine {
  readonly variantId: string;
  readonly productName: string;
  readonly variantLabel: string;
  readonly unitPrice: Money;
  readonly quantity: number;
  readonly lineTotal: Money;
}

/** What gets saved: the priced snapshot plus the contact, before it has an id and a code. */
export interface OrderDraft {
  readonly lines: ReadonlyArray<PricedLine>;
  readonly delivery: DeliveryChoice;
  readonly invoice: boolean;
  readonly subtotal: Money;
  readonly shipping: Money;
  readonly total: Money;
  readonly contact: BuyerContact;
  /** Canonical text of lines + delivery option; the adapter hashes it (O11). */
  readonly fingerprint: string;
}

/** An order as read back from storage: the only source of the WhatsApp message (VIT-102). */
export interface SavedOrder extends Omit<OrderDraft, "fingerprint"> {
  readonly id: string;
  readonly code: string;
}
