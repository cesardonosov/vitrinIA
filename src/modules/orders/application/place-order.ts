import type { CatalogReader } from "@/modules/catalog/application";
import {
  isPlaceholderWhatsApp,
  type StoreConfig,
  type StoreConfigReader,
} from "@/modules/store-config/application";
import {
  normalizeHost,
  type StoreHostResolver,
} from "@/modules/storefront/application";
import { Result, type StoreId } from "@/shared/kernel";
import {
  humanVerificationFailed,
  type PlaceOrderError,
  rateLimited,
  storeNotFound,
} from "../domain/errors";
import {
  type CatalogVariant,
  type CheckoutRules,
  type OrderRequest,
  priceOrder,
  validateOrderRequest,
} from "../domain/place-order-rules";
import {
  buildOrderMessage,
  buildWhatsAppUrl,
} from "../domain/whatsapp-message";
import {
  buildPaymentInstructions,
  type PaymentInstructions,
} from "./payment-instructions";
import type { HumanVerifier } from "./ports/human-verifier";
import type { OrderLog } from "./ports/order-log";
import type { OrderRateLimiter } from "./ports/order-rate-limiter";
import type { OrderRepository } from "./ports/order-repository";

export interface PlaceOrderDeps {
  readonly hosts: StoreHostResolver;
  readonly configs: StoreConfigReader;
  readonly catalog: CatalogReader;
  readonly orders: OrderRepository;
  readonly verifier: HumanVerifier;
  readonly limiter: OrderRateLimiter;
  readonly log: OrderLog;
}

export interface PlaceOrderInput {
  /** The request's own Host header. The store comes from here and nowhere else (O7). */
  readonly host: string | null;
  /** Address the transport trusts, already truncated (rate limit and logs). */
  readonly clientKey: string;
  readonly idempotencyKey: string;
  readonly humanToken: string;
  readonly request: OrderRequest;
}

export interface PlacedOrder {
  readonly code: string;
  readonly replayed: boolean;
  readonly subtotalClp: number;
  readonly shippingClp: number;
  readonly totalClp: number;
  /** `https://wa.me/<seller number>?text=...`, built from the saved order. */
  readonly whatsappUrl: string;
  readonly payment: PaymentInstructions;
}

function checkoutRules(config: StoreConfig): CheckoutRules | undefined {
  const checkout = config.checkout;
  if (!checkout) return undefined;
  return {
    zones: checkout.delivery.zones.map((z) => ({
      name: z.name,
      priceClp: z.priceClp,
    })),
    ...(checkout.delivery.freeShippingFromClp !== undefined
      ? { freeShippingFromClp: checkout.delivery.freeShippingFromClp }
      : {}),
    pickupOffered: checkout.delivery.pickup !== undefined,
    invoiceOffered: checkout.invoice,
  };
}

/**
 * Places an order from the storefront (VIT-186, ADR-0005, threat model orders).
 *
 * The buyer is anonymous, so the tenant comes from the Host header, resolved on the server,
 * never from the body (O7). Everything the order is worth is computed here from the catalog
 * and the Store Config of that store; the request carries only variant ids, quantities and
 * the buyer's choices (O1). The WhatsApp message is built from the order as saved, so a
 * replay of the same idempotency key answers with the same text (VIT-102).
 */
export async function placeOrder(
  deps: PlaceOrderDeps,
  input: PlaceOrderInput,
): Promise<Result<PlacedOrder, PlaceOrderError>> {
  const host = normalizeHost(input.host);
  const storeId = host ? await deps.hosts.resolve(host) : undefined;
  if (!storeId) return Result.err(storeNotFound());

  // Same answer for an unpublished store, one without a real WhatsApp or without checkout.
  const config = await deps.configs.getConfig(storeId);
  const rules = config ? checkoutRules(config) : undefined;
  if (
    !config ||
    !rules ||
    !config.features.whatsappCheckout ||
    isPlaceholderWhatsApp(config.contact.whatsapp)
  ) {
    return Result.err(storeNotFound());
  }

  const valid = validateOrderRequest(input.request, rules);
  if (Result.isErr(valid)) return valid;

  // Counted before any transaction, and before calling the verifier (O12).
  const decision = deps.limiter.check(storeId, input.clientKey);
  if (decision !== "allowed") {
    deps.log.warn("security.rate_limited", {
      store_id: storeId,
      reason: decision,
      client: input.clientKey,
    });
    return Result.err(rateLimited());
  }

  if (!(await deps.verifier.verify(input.humanToken, input.clientKey))) {
    deps.log.warn("security.human_verification_failed", { store_id: storeId });
    return Result.err(humanVerificationFailed());
  }

  const variants = await catalogVariants(deps.catalog, storeId);
  const draft = priceOrder(valid.value, (id) => variants.get(id), rules);
  if (Result.isErr(draft)) {
    deps.log.warn("order.rejected", {
      store_id: storeId,
      code: draft.error.code,
    });
    return draft;
  }

  const saved = await deps.orders.place(
    storeId,
    input.idempotencyKey,
    draft.value,
  );
  if (Result.isErr(saved)) {
    deps.log.warn("order.idempotency_conflict", { store_id: storeId });
    return saved;
  }
  const { order, replayed } = saved.value;
  deps.log.info(replayed ? "order.replayed" : "order.placed", {
    store_id: storeId,
    order_id: order.id,
    items: order.lines.length,
    total_clp: order.total.amount,
    delivery: order.delivery.type,
  });

  const message = buildOrderMessage(order, {
    storeName: config.identity.name,
    showPrices: config.features.showPrices,
  });
  return Result.ok({
    code: order.code,
    replayed,
    subtotalClp: order.subtotal.amount,
    shippingClp: order.shipping.amount,
    totalClp: order.total.amount,
    whatsappUrl: buildWhatsAppUrl(config.contact.whatsapp, message),
    payment: buildPaymentInstructions(
      config,
      storeId,
      order.delivery.type === "pickup",
      deps.log,
    ),
  });
}

/** Sellable variants of the store: published products only (the reader already filters). */
async function catalogVariants(
  reader: CatalogReader,
  storeId: StoreId,
): Promise<ReadonlyMap<string, CatalogVariant>> {
  const catalog = await reader.getCatalog(storeId);
  const map = new Map<string, CatalogVariant>();
  for (const product of catalog.products) {
    for (const variant of product.variants) {
      map.set(variant.id, {
        productName: product.name,
        variantLabel: variant.label,
        price: variant.price,
      });
    }
  }
  return map;
}
