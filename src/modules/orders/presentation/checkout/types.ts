/** Data the cart page passes to the checkout. Built on the server from the Store Config. */
export interface CheckoutOptions {
  readonly zones: ReadonlyArray<{
    readonly name: string;
    readonly priceClp: number;
    readonly leadTime?: string;
  }>;
  readonly freeShippingFromClp?: number;
  readonly pickup?: { readonly details: string };
  readonly invoiceOffered: boolean;
  readonly showPrices: boolean;
  /** Public Turnstile site key. */
  readonly siteKey: string;
}

export interface CheckoutLine {
  readonly variantId: string;
  readonly quantity: number;
}

/** What `POST /api/orders` answers on success (see `PlacedOrder`). */
export interface PlacedOrderView {
  readonly code: string;
  readonly replayed: boolean;
  readonly subtotalClp: number;
  readonly shippingClp: number;
  readonly totalClp: number;
  readonly whatsappUrl: string;
  readonly payment: {
    readonly links: ReadonlyArray<{
      readonly type: "mercado-pago-link" | "flow-link";
      readonly url: string;
    }>;
    readonly bankTransfer?: string;
    readonly pickup?: string;
  };
}
