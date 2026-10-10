import { createHash } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import type { StoreTx, WithStoreTx } from "@/infra/db/with-store-tx";
import { uuidv7 } from "@/infra/uuid-v7";
import { Money, Result, type StoreId } from "@/shared/kernel";
import type { OrderRepository } from "../application";
import { idempotencyConflict } from "../domain/errors";
import type {
  BuyerContact,
  DeliveryChoice,
  OrderDraft,
  SavedOrder,
} from "../domain/order";
import { orderContacts, orderItems, orders } from "./schema";

const MAX_CODE_ATTEMPTS = 5;

export interface DbOrderRepositoryDeps {
  readonly withStoreTx: WithStoreTx;
  /** Random short code (`newOrderCode` in production; fixed sequences in tests). */
  readonly newCode: () => string;
}

/** Walks the error chain: Drizzle wraps the driver error and keeps it in `cause`. */
function uniqueViolationOf(error: unknown, constraint: string): boolean {
  for (
    let e = error as
      | { code?: unknown; constraint?: unknown; cause?: unknown }
      | undefined;
    e;
    e = e.cause as typeof e
  ) {
    if (e.code === "23505" && e.constraint === constraint) return true;
  }
  return false;
}

const sha256 = (text: string) =>
  createHash("sha256").update(text).digest("hex");

function money(amount: number): Money {
  const m = Money.of(amount, "CLP");
  // The CHECKs keep stored amounts integral and in range; anything else is corruption.
  if (Result.isErr(m))
    throw new Error("order amount in storage is not valid money");
  return m.value;
}

/**
 * Order persistence in Postgres (VIT-186). One `withStoreTx` per call: header, items and
 * contact are inserted together or not at all, under the store's RLS context.
 */
export function createDbOrderRepository(
  deps: DbOrderRepositoryDeps,
): OrderRepository {
  return {
    place: (storeId, idempotencyKey, draft) =>
      deps.withStoreTx(storeId, async (tx) => {
        const requestHash = sha256(draft.fingerprint);
        const inserted = await insertHeader(
          tx,
          deps.newCode,
          storeId,
          idempotencyKey,
          requestHash,
          draft,
        );
        if (inserted === undefined) {
          // Same key already saved (sequential or concurrent double submit).
          const [existing] = await tx
            .select({ id: orders.id, requestHash: orders.requestHash })
            .from(orders)
            .where(
              and(
                eq(orders.storeId, storeId),
                eq(orders.idempotencyKey, idempotencyKey),
              ),
            );
          if (!existing) throw new Error("idempotent order vanished");
          if (existing.requestHash !== requestHash)
            return Result.err(idempotencyConflict());
          return Result.ok({
            order: await loadOrder(tx, storeId, existing.id),
            replayed: true,
          });
        }

        await tx.insert(orderItems).values(
          draft.lines.map((line, position) => ({
            id: uuidv7(),
            storeId,
            orderId: inserted,
            variantId: line.variantId,
            position,
            productName: line.productName,
            variantLabel: line.variantLabel,
            unitPriceClp: line.unitPrice.amount,
            quantity: line.quantity,
            lineTotalClp: line.lineTotal.amount,
          })),
        );
        const c = draft.contact;
        await tx.insert(orderContacts).values({
          id: uuidv7(),
          storeId,
          orderId: inserted,
          name: c.name,
          phone: c.phone,
          email: c.email ?? null,
          note: c.note ?? null,
          region: c.address?.region ?? null,
          commune: c.address?.commune ?? null,
          street: c.address?.street ?? null,
          addressExtra: c.address?.extra ?? null,
          rut: c.invoice?.rut ?? null,
          businessName: c.invoice?.businessName ?? null,
          businessActivity: c.invoice?.businessActivity ?? null,
        });
        // Read back: the message is built from what was saved, not from what was sent.
        return Result.ok({
          order: await loadOrder(tx, storeId, inserted),
          replayed: false,
        });
      }),
  };
}

/** Inserts the header; undefined when the idempotency key already exists. */
async function insertHeader(
  tx: StoreTx,
  newCode: () => string,
  storeId: StoreId,
  idempotencyKey: string,
  requestHash: string,
  draft: OrderDraft,
): Promise<string | undefined> {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const id = uuidv7();
    try {
      // A savepoint, so a code collision does not abort the whole transaction.
      const rows = await tx.transaction((sp) =>
        sp
          .insert(orders)
          .values({
            id,
            storeId,
            code: newCode(),
            idempotencyKey,
            requestHash,
            channel: "whatsapp",
            deliveryType: draft.delivery.type,
            deliveryZone:
              draft.delivery.type === "delivery" ? draft.delivery.zone : null,
            invoice: draft.invoice,
            subtotalClp: draft.subtotal.amount,
            shippingClp: draft.shipping.amount,
            totalClp: draft.total.amount,
          })
          .onConflictDoNothing({
            target: [orders.storeId, orders.idempotencyKey],
          })
          .returning({ id: orders.id }),
      );
      return rows[0]?.id;
    } catch (error) {
      if (uniqueViolationOf(error, "orders_store_id_code_key")) continue;
      throw error;
    }
  }
  throw new Error("could not find a free order code");
}

async function loadOrder(
  tx: StoreTx,
  storeId: StoreId,
  orderId: string,
): Promise<SavedOrder> {
  const [order] = await tx
    .select()
    .from(orders)
    .where(and(eq(orders.storeId, storeId), eq(orders.id, orderId)));
  const [contact] = await tx
    .select()
    .from(orderContacts)
    .where(
      and(
        eq(orderContacts.storeId, storeId),
        eq(orderContacts.orderId, orderId),
      ),
    );
  const items = await tx
    .select()
    .from(orderItems)
    .where(
      and(eq(orderItems.storeId, storeId), eq(orderItems.orderId, orderId)),
    )
    .orderBy(asc(orderItems.position));
  if (!order || !contact) throw new Error("saved order is incomplete");

  const delivery: DeliveryChoice =
    order.deliveryType === "delivery" && order.deliveryZone !== null
      ? { type: "delivery", zone: order.deliveryZone }
      : { type: "pickup" };
  const buyer: BuyerContact = {
    name: contact.name,
    phone: contact.phone,
    ...(contact.email ? { email: contact.email } : {}),
    ...(contact.note ? { note: contact.note } : {}),
    ...(contact.region && contact.commune && contact.street
      ? {
          address: {
            region: contact.region,
            commune: contact.commune,
            street: contact.street,
            ...(contact.addressExtra ? { extra: contact.addressExtra } : {}),
          },
        }
      : {}),
    ...(contact.rut && contact.businessName && contact.businessActivity
      ? {
          invoice: {
            rut: contact.rut,
            businessName: contact.businessName,
            businessActivity: contact.businessActivity,
          },
        }
      : {}),
  };
  return {
    id: order.id,
    code: order.code,
    delivery,
    invoice: order.invoice,
    subtotal: money(order.subtotalClp),
    shipping: money(order.shippingClp),
    total: money(order.totalClp),
    contact: buyer,
    lines: items.map((i) => ({
      variantId: i.variantId ?? "",
      productName: i.productName,
      variantLabel: i.variantLabel,
      unitPrice: money(i.unitPriceClp),
      quantity: i.quantity,
      lineTotal: money(i.lineTotalClp),
    })),
  };
}
