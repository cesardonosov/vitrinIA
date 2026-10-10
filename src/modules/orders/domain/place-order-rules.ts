import { Money, Result } from "@/shared/kernel";
import {
  type InvalidOrder,
  type ItemUnavailable,
  invalidOrder,
  itemUnavailable,
  type OrderIssue,
} from "./errors";
import {
  FIELD_LIMITS,
  MAX_LINES,
  MAX_ORDER_TOTAL_CLP,
  MAX_QUANTITY,
  MIN_QUANTITY,
} from "./limits";
import type {
  BuyerContact,
  DeliveryChoice,
  OrderDraft,
  PricedLine,
} from "./order";
import { parseBuyerPhone } from "./phone";
import { isChileRegion } from "./regions";
import { parseRut } from "./rut";
import { cleanLine, cleanNote } from "./text";

/**
 * What the buyer asks for, after the transport layer checked its shape. Nothing here is
 * trusted: prices, names and totals are not even part of it (threat model orders O1).
 */
export interface OrderRequest {
  readonly lines: ReadonlyArray<{
    readonly variantId: string;
    readonly quantity: number;
  }>;
  readonly delivery:
    | { readonly type: "pickup" }
    | {
        readonly type: "delivery";
        readonly zone: string;
        readonly address: {
          readonly region: string;
          readonly commune: string;
          readonly street: string;
          readonly extra?: string;
        };
      };
  readonly invoice?: {
    readonly rut: string;
    readonly businessName: string;
    readonly businessActivity: string;
  };
  readonly contact: {
    readonly name: string;
    readonly phone: string;
    readonly email?: string;
    readonly note?: string;
  };
}

/** The store's delivery and invoice options, taken from its Store Config by the use case. */
export interface CheckoutRules {
  readonly zones: ReadonlyArray<{
    readonly name: string;
    readonly priceClp: number;
  }>;
  readonly freeShippingFromClp?: number;
  readonly pickupOffered: boolean;
  readonly invoiceOffered: boolean;
}

export interface ValidOrderRequest {
  readonly lines: OrderRequest["lines"];
  readonly delivery: DeliveryChoice;
  readonly invoice: boolean;
  readonly contact: BuyerContact;
}

const EMAIL =
  /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]+$/;

/** A required one-line field: cleaned, 1..max characters. */
function line(
  raw: string,
  max: number,
  path: string,
  issues: OrderIssue[],
): string {
  const value = cleanLine(raw);
  if (value.length === 0) issues.push({ path, code: "required" });
  else if (value.length > max) issues.push({ path, code: "too_long" });
  return value;
}

/** Business rules over the request. Collects every issue; never echoes a value. */
export function validateOrderRequest(
  request: OrderRequest,
  rules: CheckoutRules,
): Result<ValidOrderRequest, InvalidOrder> {
  const issues: OrderIssue[] = [];

  // Lines (O2).
  if (request.lines.length < 1 || request.lines.length > MAX_LINES) {
    issues.push({ path: "items", code: "count" });
  }
  const seen = new Set<string>();
  for (const [index, l] of request.lines.entries()) {
    const path = `items.${index}`;
    if (typeof l.variantId !== "string" || l.variantId.length === 0) {
      issues.push({ path: `${path}.variantId`, code: "required" });
    } else if (seen.has(l.variantId)) {
      issues.push({ path: `${path}.variantId`, code: "duplicate" });
    }
    seen.add(l.variantId);
    if (
      !Number.isInteger(l.quantity) ||
      l.quantity < MIN_QUANTITY ||
      l.quantity > MAX_QUANTITY
    ) {
      issues.push({ path: `${path}.quantity`, code: "range" });
    }
  }

  // Delivery option (O5).
  let delivery: DeliveryChoice = { type: "pickup" };
  let address: BuyerContact["address"];
  if (request.delivery.type === "pickup") {
    if (!rules.pickupOffered) {
      issues.push({ path: "delivery.type", code: "unavailable" });
    }
  } else {
    const zone = request.delivery.zone;
    if (!rules.zones.some((z) => z.name === zone)) {
      issues.push({ path: "delivery.zone", code: "unknown_zone" });
    }
    delivery = { type: "delivery", zone };
    const a = request.delivery.address;
    const region = a.region;
    if (!isChileRegion(region)) {
      issues.push({ path: "delivery.address.region", code: "invalid" });
    }
    const commune = line(
      a.commune,
      FIELD_LIMITS.commune,
      "delivery.address.commune",
      issues,
    );
    const street = line(
      a.street,
      FIELD_LIMITS.street,
      "delivery.address.street",
      issues,
    );
    const extra =
      a.extra === undefined || cleanLine(a.extra) === ""
        ? undefined
        : line(
            a.extra,
            FIELD_LIMITS.addressExtra,
            "delivery.address.extra",
            issues,
          );
    address = { region, commune, street, ...(extra ? { extra } : {}) };
  }

  // Invoice (O6).
  let invoice: BuyerContact["invoice"];
  if (request.invoice !== undefined) {
    if (!rules.invoiceOffered) {
      issues.push({ path: "invoice", code: "unavailable" });
    }
    const rut = parseRut(request.invoice.rut);
    if (Result.isErr(rut))
      issues.push({ path: "invoice.rut", code: "invalid" });
    const businessName = line(
      request.invoice.businessName,
      FIELD_LIMITS.businessName,
      "invoice.businessName",
      issues,
    );
    const businessActivity = line(
      request.invoice.businessActivity,
      FIELD_LIMITS.businessActivity,
      "invoice.businessActivity",
      issues,
    );
    if (Result.isOk(rut)) {
      invoice = { rut: rut.value, businessName, businessActivity };
    }
  }

  // Contact.
  const name = line(
    request.contact.name,
    FIELD_LIMITS.name,
    "contact.name",
    issues,
  );
  const phone = parseBuyerPhone(request.contact.phone);
  if (phone === undefined) {
    issues.push({ path: "contact.phone", code: "invalid" });
  }
  let email: string | undefined;
  if (
    request.contact.email !== undefined &&
    request.contact.email.trim() !== ""
  ) {
    email = cleanLine(request.contact.email);
    if (email.length > FIELD_LIMITS.email || !EMAIL.test(email)) {
      issues.push({ path: "contact.email", code: "invalid" });
    }
  }
  let note: string | undefined;
  if (request.contact.note !== undefined) {
    const cleaned = cleanNote(request.contact.note);
    if (cleaned.length > FIELD_LIMITS.note) {
      issues.push({ path: "contact.note", code: "too_long" });
    } else if (cleaned.length > 0) {
      note = cleaned;
    }
  }

  if (issues.length > 0 || phone === undefined) {
    return Result.err(invalidOrder(issues));
  }
  return Result.ok({
    lines: request.lines.map((l) => ({
      variantId: l.variantId,
      quantity: l.quantity,
    })),
    delivery,
    invoice: invoice !== undefined,
    contact: {
      name,
      phone,
      ...(email ? { email } : {}),
      ...(note ? { note } : {}),
      ...(address ? { address } : {}),
      ...(invoice ? { invoice } : {}),
    },
  });
}

/** A variant as the catalog describes it right now. */
export interface CatalogVariant {
  readonly productName: string;
  readonly variantLabel: string;
  readonly price: Money;
}

function tooLarge(path: string): InvalidOrder {
  return invalidOrder([{ path, code: "too_large" }]);
}

/**
 * Prices the order from the catalog and the store's delivery rules (O1, O4, O5).
 * Any line the catalog does not return is `ItemUnavailable`, with no detail on which one or why.
 */
export function priceOrder(
  request: ValidOrderRequest,
  lookup: (variantId: string) => CatalogVariant | undefined,
  rules: CheckoutRules,
): Result<OrderDraft, InvalidOrder | ItemUnavailable> {
  const lines: PricedLine[] = [];
  let subtotal = Money.zero("CLP");
  for (const requested of request.lines) {
    const variant = lookup(requested.variantId);
    if (variant?.price.currency !== "CLP") {
      return Result.err(itemUnavailable());
    }
    const lineTotal = variant.price.multiply(requested.quantity);
    if (Result.isErr(lineTotal)) return Result.err(tooLarge("items"));
    const next = subtotal.add(lineTotal.value);
    if (Result.isErr(next)) return Result.err(tooLarge("items"));
    subtotal = next.value;
    lines.push({
      variantId: requested.variantId,
      productName: variant.productName,
      variantLabel: variant.variantLabel,
      unitPrice: variant.price,
      quantity: requested.quantity,
      lineTotal: lineTotal.value,
    });
  }

  const shippingAmount = shippingFor(request.delivery, subtotal.amount, rules);
  if (shippingAmount === undefined) {
    return Result.err(
      invalidOrder([{ path: "delivery.zone", code: "unknown_zone" }]),
    );
  }
  const shipping = Money.of(shippingAmount, "CLP");
  if (Result.isErr(shipping)) return Result.err(tooLarge("delivery"));
  const total = subtotal.add(shipping.value);
  if (Result.isErr(total) || total.value.amount > MAX_ORDER_TOTAL_CLP) {
    return Result.err(tooLarge("items"));
  }

  return Result.ok({
    lines,
    delivery: request.delivery,
    invoice: request.invoice,
    subtotal,
    shipping: shipping.value,
    total: total.value,
    contact: request.contact,
    fingerprint: fingerprintOf(request),
  });
}

/** Shipping in CLP: 0 for pickup, the zone price, or 0 over the free-shipping threshold. */
function shippingFor(
  delivery: DeliveryChoice,
  subtotalClp: number,
  rules: CheckoutRules,
): number | undefined {
  if (delivery.type === "pickup") return 0;
  const zone = rules.zones.find((z) => z.name === delivery.zone);
  if (!zone) return undefined;
  const free = rules.freeShippingFromClp;
  return free !== undefined && subtotalClp >= free ? 0 : zone.priceClp;
}

/**
 * Canonical text of what defines an order for idempotency: lines (sorted, so their order in
 * the cart does not matter), the delivery option and the cleaned buyer contact (issue 108). If the
 * buyer fixes the phone or address and resends with the same key the fingerprint differs, the
 * repository answers `IdempotencyConflict` and the client regenerates its key, so the seller
 * never gets the stale contact from a `replayed` order.
 *
 * The contact is part of the text only so the repository can hash it: this string never leaves
 * the process (not logged, not returned) and is stored only as the sha256 of the whole text.
 */
export function fingerprintOf(request: ValidOrderRequest): string {
  const lines = request.lines
    .map((l) => `${l.variantId}:${l.quantity}`)
    .sort()
    .join(",");
  const option =
    request.delivery.type === "pickup"
      ? "pickup"
      : `delivery:${request.delivery.zone}`;
  return `${lines}|${option}|${contactCanonical(request.contact)}`;
}

/** Fixed field order, JSON-encoded so no value can shift into its neighbour. */
function contactCanonical(contact: BuyerContact): string {
  const { address, invoice } = contact;
  return JSON.stringify([
    contact.name,
    contact.phone,
    contact.email ?? null,
    contact.note ?? null,
    address
      ? [address.region, address.commune, address.street, address.extra ?? null]
      : null,
    invoice
      ? [invoice.rut, invoice.businessName, invoice.businessActivity]
      : null,
  ]);
}
