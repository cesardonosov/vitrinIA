import { sql } from "drizzle-orm";
import type { StoreTx } from "@/infra/db/with-store-tx";
import { uuidv7 } from "@/infra/uuid-v7";
import { domains, stores } from "@/modules/store-config/infrastructure/schema";
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
