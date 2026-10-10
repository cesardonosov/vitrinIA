import { eq, isNull, sql } from "drizzle-orm";
import type { StoreTx } from "@/infra/db/with-store-tx";
import { uuidv7 } from "@/infra/uuid-v7";
import {
  categories,
  products,
  productVariants,
} from "@/modules/catalog/infrastructure/schema";
import {
  orderContacts,
  orderItems,
  orders,
} from "@/modules/orders/infrastructure/schema";
import { ROPA_PRESET } from "@/modules/store-config/application";
import {
  domains,
  storeConfigs,
  stores,
} from "@/modules/store-config/infrastructure/schema";
import type { StoreId } from "@/shared/kernel";
import type { ColumnInfo, TenantTable } from "./catalog";

/**
 * Seeding for the cross-tenant harness (VIT-109, threat model C5/G2).
 *
 * Every tenant table found in the catalog gets ROWS_PER_TABLE rows per store
 * (public.stores gets exactly one: the store itself). Rows are inserted as
 * app_user inside withStoreTx, never as the owner (C15), so a seed that the
 * policies would reject fails here, not silently.
 *
 * A table is seeded by its entry in `seeders` or, if it has none, by the generic
 * seeder, which fills NOT NULL columns without default from their types. A table
 * the generic seeder cannot fill (foreign key to another tenant table, CHECK
 * constraints, enums...) fails the suite naming the table: add an entry to
 * `seeders`. That entry is the only hand-written piece a new table may need; the
 * cross-tenant tests themselves are generated from the catalog.
 */

export const ROWS_PER_TABLE = 2;

/** Inserts ONE row that belongs to `storeId`. `n` distinguishes rows of the same store. */
export type Seeder = (
  tx: StoreTx,
  storeId: StoreId,
  n: number,
) => Promise<void>;

/** Deterministic per-store label, valid as DNS label and slug. */
export function storeLabel(storeId: StoreId): string {
  return `t-${storeId.replace(/-/g, "").slice(-12)}`;
}

export const seeders: Readonly<Record<string, Seeder>> = {
  "public.stores": async (tx, storeId) => {
    await tx.insert(stores).values({
      id: storeId,
      slug: storeLabel(storeId),
      name: `Tienda ${storeLabel(storeId)}`,
    });
  },
  "public.domains": async (tx, storeId, n) => {
    await tx.insert(domains).values({
      id: uuidv7(),
      storeId,
      host: `${storeLabel(storeId)}-${n}.vitrinia.cl`,
      verifiedAt: new Date(),
    });
  },
  // Store Config (VIT-191): one revision per row; the jsonb must satisfy the shape CHECK
  // (an object whose schemaVersion equals schema_version), so the generic '{}' would not do.
  "public.store_configs": async (tx, storeId, n) => {
    await tx.insert(storeConfigs).values({
      id: uuidv7(),
      storeId,
      revision: n,
      schemaVersion: ROPA_PRESET.schemaVersion,
      config: ROPA_PRESET,
    });
  },
  // Children pick a parent of the same store: RLS shows only this store's rows,
  // and the composite FK (store_id, parent_id) would refuse anything else.
  "public.products": async (tx, storeId, n) => {
    const [category] = await tx
      .select({ id: categories.id })
      .from(categories)
      .limit(1);
    if (!category) throw new Error("seed categories before products");
    await tx.insert(products).values({
      id: uuidv7(),
      storeId,
      categoryId: category.id,
      slug: `${storeLabel(storeId)}-p${n}`,
      name: `Producto ${n}`,
      shortDescription: "Semillas de prueba",
      published: true,
    });
  },
  "public.product_variants": async (tx, storeId, n) => {
    const [product] = await tx
      .select({ id: products.id })
      .from(products)
      .limit(1);
    if (!product) throw new Error("seed products before variants");
    await tx.insert(productVariants).values({
      id: uuidv7(),
      storeId,
      productId: product.id,
      label: `${n} kg`,
      priceClp: 1000 * n,
    });
  },
  // Orders (VIT-186): the order first, then its items and contact pick it up (same store only).
  "public.orders": async (tx, storeId, n) => {
    const letter = String.fromCharCode(65 + (n % 26));
    await tx.insert(orders).values({
      id: uuidv7(),
      storeId,
      code: `SEED${letter}${letter}`,
      idempotencyKey: uuidv7(),
      requestHash: "0".repeat(64),
      deliveryType: "pickup",
      subtotalClp: 1000 * n,
      shippingClp: 0,
      totalClp: 1000 * n,
    });
  },
  "public.order_items": async (tx, storeId, n) => {
    const [order] = await tx.select({ id: orders.id }).from(orders).limit(1);
    if (!order) throw new Error("seed orders before order_items");
    const [variant] = await tx
      .select({ id: productVariants.id })
      .from(productVariants)
      .limit(1);
    await tx.insert(orderItems).values({
      id: uuidv7(),
      storeId,
      orderId: order.id,
      variantId: variant?.id ?? null,
      position: n % 50,
      productName: `Producto ${n}`,
      variantLabel: `${n} kg`,
      unitPriceClp: 1000 * n,
      quantity: 1,
      lineTotalClp: 1000 * n,
    });
  },
  // 1:1 with its order, so each contact takes an order that has none yet.
  "public.order_contacts": async (tx, storeId, n) => {
    const free = await tx
      .select({ id: orders.id })
      .from(orders)
      .leftJoin(orderContacts, eq(orderContacts.orderId, orders.id))
      .where(isNull(orderContacts.id))
      .limit(1);
    // The cross-store INSERT probe (n = 99) finds no free order; RLS rejects it before the FK.
    const [anyOrder] = free.length
      ? free
      : await tx.select({ id: orders.id }).from(orders).limit(1);
    const order = anyOrder;
    if (!order) throw new Error("seed orders before order_contacts");
    await tx.insert(orderContacts).values({
      id: uuidv7(),
      storeId,
      orderId: order.id,
      name: `Comprador ${n}`,
      phone: "+56900000000",
    });
  },
};

export function expectedRowsPerStore(table: TenantTable): number {
  return table.qualified === "public.stores" ? 1 : ROWS_PER_TABLE;
}

export class UnseedableTableError extends Error {
  constructor(table: string, reason: string) {
    super(
      `tenant table ${table} has no seeder and cannot be seeded generically (${reason}). ` +
        `Add an entry for "${table}" to tests/integration/tenant-isolation/seeders.ts.`,
    );
    this.name = "UnseedableTableError";
  }
}

/** Columns the generic seeder must provide: NOT NULL, no default, not generated. */
function requiredColumns(table: TenantTable): ColumnInfo[] {
  return table.columns.filter(
    (c) => c.notNull && !c.hasDefault && !c.generated,
  );
}

function genericValue(
  table: TenantTable,
  column: ColumnInfo,
  storeId: StoreId,
  n: number,
): ReturnType<typeof sql> {
  if (column.name === table.tenantKey) return sql`${storeId}::uuid`;
  if (column.referencesTable !== null) {
    throw new UnseedableTableError(
      table.qualified,
      `column ${column.name} references ${column.referencesTable}`,
    );
  }
  const t = column.type;
  if (t === "uuid") return sql`${uuidv7()}::uuid`;
  if (t === "text" || t.startsWith("character varying") || t === "citext") {
    return sql`${`${storeLabel(storeId)}-${column.name}-${n}`}`;
  }
  if (
    [
      "smallint",
      "integer",
      "bigint",
      "numeric",
      "real",
      "double precision",
    ].some((k) => t.startsWith(k))
  ) {
    return sql`${n}`;
  }
  if (t === "boolean") return sql`true`;
  if (t.startsWith("timestamp") || t === "date") return sql`now()`;
  if (t === "jsonb" || t === "json") return sql`'{}'`;
  throw new UnseedableTableError(
    table.qualified,
    `column ${column.name} has unsupported type ${t}`,
  );
}

/** Builds `INSERT INTO schema.table (cols) VALUES (...)` from the catalog. */
export function genericSeeder(table: TenantTable): Seeder {
  return async (tx, storeId, n) => {
    const cols = requiredColumns(table);
    if (!cols.some((c) => c.name === table.tenantKey)) {
      cols.push(
        table.columns.find((c) => c.name === table.tenantKey) ??
          (() => {
            throw new UnseedableTableError(
              table.qualified,
              `missing column ${table.tenantKey}`,
            );
          })(),
      );
    }
    const names = sql.join(
      cols.map((c) => sql.identifier(c.name)),
      sql`, `,
    );
    const values = sql.join(
      cols.map((c) => genericValue(table, c, storeId, n)),
      sql`, `,
    );
    await tx.execute(
      sql`insert into ${sql.identifier(table.schema)}.${sql.identifier(table.name)} (${names}) values (${values})`,
    );
  };
}

/** Partitions are filled through their parent; every other table needs a seeder. */
export function seederFor(table: TenantTable): Seeder | null {
  if (table.isPartition) return null;
  return seeders[table.qualified] ?? genericSeeder(table);
}
