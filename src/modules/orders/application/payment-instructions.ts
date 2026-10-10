import {
  checkUrlForField,
  type StoreConfig,
} from "@/modules/store-config/application";
import type { StoreId } from "@/shared/kernel";
import type { OrderLog } from "./ports/order-log";

/**
 * What the buyer sees after the order is saved. Everything comes from the seller's Store
 * Config; nothing from the request (threat model orders O19, O20).
 */
export interface PaymentInstructions {
  /** Payment links that passed the allowlist again. Always `https:` on a known host. */
  readonly links: ReadonlyArray<{
    readonly type: "mercado-pago-link" | "flow-link";
    readonly url: string;
  }>;
  /** Plain text: bank, account, holder. Render it escaped, never as HTML. */
  readonly bankTransfer?: string;
  readonly pickup?: string;
}

/**
 * Links are validated when the Store Config is written, and again here: a link that no
 * longer passes the allowlist (it was tightened, or the config was edited out of band) is
 * not shown and is logged by store, never by URL.
 */
export function buildPaymentInstructions(
  config: StoreConfig,
  storeId: StoreId,
  pickup: boolean,
  log: OrderLog,
): PaymentInstructions {
  const checkout = config.checkout;
  if (!checkout) return { links: [] };
  const links: Array<PaymentInstructions["links"][number]> = [];
  let bankTransfer: string | undefined;
  for (const method of checkout.paymentMethods) {
    if (method.type === "bank-transfer") {
      bankTransfer = method.details;
      continue;
    }
    if (!config.features.paymentLinkCheckout) continue;
    const field =
      method.type === "mercado-pago-link"
        ? "checkout.mercadoPagoLink"
        : "checkout.flowLink";
    const checked = checkUrlForField(field, method.url);
    if (checked.ok) {
      links.push({ type: method.type, url: checked.value });
    } else {
      log.warn("payment_link_rejected", {
        store_id: storeId,
        method: method.type,
      });
    }
  }
  const pickupDetails = pickup ? checkout.delivery.pickup?.details : undefined;
  return {
    links,
    ...(bankTransfer ? { bankTransfer } : {}),
    ...(pickupDetails ? { pickup: pickupDetails } : {}),
  };
}
