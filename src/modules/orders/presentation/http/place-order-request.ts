import { z } from "zod";
import {
  FIELD_LIMITS,
  MAX_LINES,
  MAX_QUANTITY,
  MIN_QUANTITY,
  type OrderRequest,
} from "../../application";

/**
 * Wire format of `POST /api/orders` (threat model orders O1, O3, O5, O6).
 *
 * `strictObject` everywhere: a body with `price`, `total`, `currency`, `shippingCost`,
 * `storeId` or any other key is refused, not ignored. Pickup has no address; an invoice
 * block exists only when the buyer asks for factura. Lengths are caps on the raw text; the
 * domain cleans the text and checks the real limits again.
 */
const text = (max: number) =>
  z
    .string()
    .min(1)
    .max(max * 2);
const optionalText = (max: number) =>
  z
    .string()
    .max(max * 2)
    .optional();

export const placeOrderRequestSchema = z.strictObject({
  idempotencyKey: z.uuid(),
  turnstileToken: z.string().min(1).max(2048),
  items: z
    .array(
      z.strictObject({
        variantId: z.uuid(),
        quantity: z.number().int().min(MIN_QUANTITY).max(MAX_QUANTITY),
      }),
    )
    .min(1)
    .max(MAX_LINES),
  delivery: z.discriminatedUnion("type", [
    z.strictObject({ type: z.literal("pickup") }),
    z.strictObject({
      type: z.literal("delivery"),
      zone: text(60),
      address: z.strictObject({
        region: text(FIELD_LIMITS.region),
        commune: text(FIELD_LIMITS.commune),
        street: text(FIELD_LIMITS.street),
        extra: optionalText(FIELD_LIMITS.addressExtra),
      }),
    }),
  ]),
  invoice: z
    .strictObject({
      rut: text(FIELD_LIMITS.rut),
      businessName: text(FIELD_LIMITS.businessName),
      businessActivity: text(FIELD_LIMITS.businessActivity),
    })
    .optional(),
  contact: z.strictObject({
    name: text(FIELD_LIMITS.name),
    phone: text(FIELD_LIMITS.phone),
    email: optionalText(FIELD_LIMITS.email),
    note: optionalText(FIELD_LIMITS.note),
  }),
});

export type PlaceOrderBody = z.infer<typeof placeOrderRequestSchema>;

/** Field path + code only: Zod's `input`/`received` would echo what the buyer typed (O14). */
export function safeIssues(
  error: z.ZodError,
): ReadonlyArray<{ path: string; code: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    code: issue.code,
  }));
}

export function toOrderRequest(body: PlaceOrderBody): OrderRequest {
  return {
    lines: body.items.map((i) => ({
      variantId: i.variantId,
      quantity: i.quantity,
    })),
    delivery:
      body.delivery.type === "pickup"
        ? { type: "pickup" }
        : {
            type: "delivery",
            zone: body.delivery.zone,
            address: {
              region: body.delivery.address.region,
              commune: body.delivery.address.commune,
              street: body.delivery.address.street,
              ...(body.delivery.address.extra !== undefined
                ? { extra: body.delivery.address.extra }
                : {}),
            },
          },
    ...(body.invoice ? { invoice: body.invoice } : {}),
    contact: {
      name: body.contact.name,
      phone: body.contact.phone,
      ...(body.contact.email !== undefined
        ? { email: body.contact.email }
        : {}),
      ...(body.contact.note !== undefined ? { note: body.contact.note } : {}),
    },
  };
}
