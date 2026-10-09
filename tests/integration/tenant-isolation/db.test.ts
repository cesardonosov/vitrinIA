import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { DatabaseHandle } from "@/infra/db/client";
import { bindWithStoreTx, type StoreTx } from "@/infra/db/with-store-tx";
import { uuidv7 } from "@/infra/uuid-v7";
import type { StoreId } from "@/shared/kernel";
import {
  expectPgError,
  newStoreId,
  openAppUser,
  openMigrator,
} from "../helpers";
import {
  appUserPolicies,
  expectedPolicyExpression,
  loadCatalog,
  type TenantTable,
  uncoveredPrivileges,
} from "./catalog";
import { expectedRowsPerStore, seederFor } from "./seeders";

/**
 * Cross-tenant harness, database layer (VIT-109; threat model C2, C5, C6, C7,
 * G1, G2, G3; docs/qa/tenant-isolation.md).
 *
 * Nothing here is written per table. The catalog is read once (as the owner),
 * and for EVERY tenant table found (ordinary tables, partitioned tables and their
 * partitions) the same checks are generated: static (RLS enabled + forced, exact
 * fail-closed policy, every privilege covered) and dynamic as app_user (own
 * count > 0, zero rows of the other store on SELECT/UPDATE/DELETE, INSERT and
 * UPDATE that set the other store's id rejected by WITH CHECK, zero rows without
 * context). A new table with store_id is covered the moment it exists; if it is
 * misconfigured or cannot be seeded, the suite fails naming it.
 */

const owner = openMigrator();
const catalog = await loadCatalog(owner);

let app: DatabaseHandle | undefined;
function appDb(): DatabaseHandle["db"] {
  if (!app) throw new Error("app_user pool not opened (beforeAll failed)");
  return app.db;
}
let withStoreTx: ReturnType<typeof bindWithStoreTx>;
let A: StoreId;
let B: StoreId;

const rel = (t: TenantTable) =>
  sql`${sql.identifier(t.schema)}.${sql.identifier(t.name)}`;
const key = (t: TenantTable) => sql.identifier(t.tenantKey);

type Executor = Pick<StoreTx, "execute">;

async function count(
  ex: Executor,
  t: TenantTable,
  storeId?: StoreId,
): Promise<number> {
  const where = storeId ? sql`where ${key(t)} = ${storeId}::uuid` : sql``;
  const r = await ex.execute(
    sql`select count(*)::int as n from ${rel(t)} ${where}`,
  );
  return (r.rows[0] as { n: number }).n;
}

/**
 * G2: every cross-tenant assertion runs as app_user, never as the owner, a
 * superuser or a BYPASSRLS role. Read from pg_roles for current_user, on the
 * same connection/transaction as the checked query.
 */
async function assertAppUser(ex: Executor): Promise<void> {
  const r = await ex.execute(
    sql`select current_user as u, r.rolsuper, r.rolbypassrls
        from pg_roles r where r.rolname = current_user`,
  );
  expect(
    r.rows[0],
    "cross-tenant checks must run as app_user with rolsuper=false and rolbypassrls=false",
  ).toEqual({ u: "app_user", rolsuper: false, rolbypassrls: false });
}

async function truncateTenantTables(): Promise<void> {
  // Owner-only, not subject to RLS. Partitions are emptied through their parent.
  const roots = catalog.tables.filter((t) => !t.isPartition);
  if (roots.length === 0) return;
  await owner.db.execute(
    sql`truncate table ${sql.join(roots.map(rel), sql`, `)} cascade`,
  );
}

async function seedTenant(storeId: StoreId): Promise<void> {
  await withStoreTx(storeId, async (tx) => {
    for (const t of catalog.tables) {
      const seed = seederFor(t);
      if (!seed) continue;
      for (let n = 1; n <= expectedRowsPerStore(t); n++) {
        await seed(tx, storeId, n);
      }
    }
  });
}

beforeAll(() => {
  app = openAppUser();
  withStoreTx = bindWithStoreTx(app.db);
});

afterAll(async () => {
  // Guarded: a failed beforeAll must not hide its error behind a TypeError here.
  try {
    await truncateTenantTables();
  } finally {
    await app?.close();
    await owner.close();
  }
});

beforeEach(async () => {
  await truncateTenantTables();
  A = newStoreId();
  B = newStoreId();
  await seedTenant(A);
  await seedTenant(B);
});

describe("harness honesty (C7/G2)", () => {
  it("the catalog is not empty and includes stores and domains", () => {
    const names = catalog.tables.map((t) => t.qualified);
    expect(names).toContain("public.stores");
    expect(names).toContain("public.domains");
  });

  it("the app pool is app_user without superuser; the owner pool is migrator", async () => {
    await assertAppUser(appDb());
    const r = await owner.db.execute(sql`select current_user as u`);
    expect(r.rows[0]).toEqual({ u: "migrator" });
  });

  it("both stores exist with their expected rows before any cross test runs", async () => {
    for (const s of [A, B]) {
      await withStoreTx(s, async (tx) => {
        for (const t of catalog.tables.filter((x) => !x.isPartition)) {
          expect(await count(tx, t, s), t.qualified).toBe(
            expectedRowsPerStore(t),
          );
        }
      });
    }
  });
});

describe.each(catalog.tables)("tenant table $qualified", (t) => {
  const label = `${t.qualified}${t.isPartition ? ` (partition of ${t.parent})` : ""}`;
  const can = (p: "SELECT" | "INSERT" | "UPDATE" | "DELETE") =>
    t.appUserPrivileges.includes(p);

  describe("static (C2/C6/G3)", () => {
    it("has ENABLE and FORCE ROW LEVEL SECURITY", () => {
      expect(t.rlsEnabled, `${label}: ENABLE ROW LEVEL SECURITY missing`).toBe(
        true,
      );
      expect(t.rlsForced, `${label}: FORCE ROW LEVEL SECURITY missing`).toBe(
        true,
      );
    });

    it("is not owned by app_user", () => {
      expect(t.owner, `${label}: owner`).not.toBe("app_user");
    });

    it("every permissive policy reachable by app_user is the exact fail-closed tenant predicate", () => {
      const expected = expectedPolicyExpression(t.tenantKey);
      const pols = appUserPolicies(t);
      if (!t.isPartition || t.appUserPrivileges.length > 0) {
        expect(pols.length, `${label}: no policy for app_user`).toBeGreaterThan(
          0,
        );
      }
      for (const p of pols) {
        expect(p.using, `${label}: policy ${p.name} USING`).toBe(
          p.cmd === "a" ? null : expected,
        );
        if (p.cmd === "r") {
          expect(p.check, `${label}: policy ${p.name} WITH CHECK`).toBeNull();
        } else {
          // Postgres uses USING as the write check when WITH CHECK is omitted on FOR ALL.
          expect(
            p.check ?? p.using,
            `${label}: policy ${p.name} WITH CHECK`,
          ).toBe(expected);
        }
      }
    });

    it("every privilege app_user holds is covered by a policy", () => {
      expect(
        uncoveredPrivileges(t),
        `${label}: privileges without policy`,
      ).toEqual([]);
    });

    if (t.isPartition) {
      it("as a partition, it is protected through its parent or has its own policies", () => {
        expect(
          t.parent && catalog.byName.has(t.parent),
          `${label}: parent not in catalog`,
        ).toBe(true);
        if (t.appUserPrivileges.length === 0) {
          // No direct access: rows are only reachable through the parent's policies.
          return;
        }
        expect(
          appUserPolicies(t).length,
          `${label}: directly accessible without own policy`,
        ).toBeGreaterThan(0);
      });
    }
  });

  describe("dynamic as app_user (C5/G1/G2)", () => {
    if (!can("SELECT")) {
      it("app_user cannot read it directly (permission denied)", async () => {
        await expectPgError(
          withStoreTx(A, (tx) => tx.execute(sql`select * from ${rel(t)}`)),
          /permission denied/i,
        );
      });
      return;
    }

    it("context A sees its own rows (count > 0 on the root) and no row of B; same for B", async () => {
      for (const [me, other] of [
        [A, B],
        [B, A],
      ] as const) {
        await withStoreTx(me, async (tx) => {
          await assertAppUser(tx);
          const own = await count(tx, t, me);
          const total = await count(tx, t);
          const foreign = await count(tx, t, other);
          if (t.isPartition) {
            // A partition may legitimately hold none of the seeded rows (they are routed by
            // the partition key); coverage of "own > 0" comes from the parent (exact count)
            // and from the parent-vs-partitions sum below. `total === own` and
            // `foreign === 0` still apply to the partition itself.
            expect(own, `${label}: own rows`).toBeLessThanOrEqual(
              expectedRowsPerStore(t),
            );
          } else {
            expect(own, `${label}: own rows`).toBe(expectedRowsPerStore(t));
          }
          expect(total, `${label}: visible rows must all be own`).toBe(own);
          expect(foreign, `${label}: rows of the other store`).toBe(0);
          const keys = await tx.execute(
            sql`select count(distinct ${key(t)})::int as n from ${rel(t)}`,
          );
          expect(
            (keys.rows[0] as { n: number }).n,
            `${label}: distinct tenants visible`,
          ).toBeLessThanOrEqual(1);
          const all = await tx.execute(
            sql`select ${key(t)}::text as k from ${rel(t)}`,
          );
          for (const row of all.rows as { k: string }[]) expect(row.k).toBe(me);
        });
      }
    });

    if (t.relkind === "p") {
      it("rows seen through the partitioned parent equal the sum over its readable partitions", async () => {
        const parts = catalog.tables.filter((p) => p.parent === t.qualified);
        if (
          parts.length === 0 ||
          !parts.every((p) => p.appUserPrivileges.includes("SELECT"))
        )
          return;
        await withStoreTx(A, async (tx) => {
          let sum = 0;
          for (const p of parts) sum += await count(tx, p);
          expect(
            sum,
            `${label}: at least one partition must hold own rows`,
          ).toBeGreaterThan(0);
          expect(sum, `${label}: partitions vs parent`).toBe(
            await count(tx, t),
          );
        });
      });
    }

    it("without tenant context reads 0 rows (fail-closed)", async () => {
      // One transaction without app.store_id: the role check and the reads share a connection.
      await appDb().transaction(async (tx) => {
        await assertAppUser(tx);
        expect(await count(tx, t)).toBe(0);
        const r = await tx.execute(sql`select * from ${rel(t)}`);
        expect(r.rows).toHaveLength(0);
      });
    });

    if (can("UPDATE")) {
      it("UPDATE on rows of B from context A affects 0 rows and B keeps its rows", async () => {
        const before = await withStoreTx(B, (tx) => count(tx, t, B));
        await withStoreTx(A, async (tx) => {
          await assertAppUser(tx);
          const r = await tx.execute(
            sql`update ${rel(t)} set ${key(t)} = ${key(t)} where ${key(t)} = ${B}::uuid`,
          );
          expect(r.rowCount, `${label}: cross UPDATE row count`).toBe(0);
          const all = await tx.execute(
            sql`update ${rel(t)} set ${key(t)} = ${key(t)}`,
          );
          expect(
            all.rowCount,
            `${label}: blanket UPDATE must touch only own rows`,
          ).toBe(await count(tx, t, A));
        });
        expect(await withStoreTx(B, (tx) => count(tx, t, B))).toBe(before);
      });
    } else {
      it("app_user cannot UPDATE it (permission denied)", async () => {
        await expectPgError(
          withStoreTx(A, (tx) =>
            tx.execute(sql`update ${rel(t)} set ${key(t)} = ${key(t)}`),
          ),
          /permission denied/i,
        );
      });
    }

    if (can("DELETE")) {
      it("DELETE on rows of B from context A affects 0 rows and B keeps its rows", async () => {
        const before = await withStoreTx(B, (tx) => count(tx, t, B));
        await withStoreTx(A, async (tx) => {
          await assertAppUser(tx);
          const r = await tx.execute(
            sql`delete from ${rel(t)} where ${key(t)} = ${B}::uuid`,
          );
          expect(r.rowCount, `${label}: cross DELETE row count`).toBe(0);
        });
        expect(await withStoreTx(B, (tx) => count(tx, t, B))).toBe(before);
      });
    } else {
      it("app_user cannot DELETE from it (permission denied)", async () => {
        await expectPgError(
          withStoreTx(A, (tx) =>
            tx.execute(sql`delete from ${rel(t)} where ${key(t)} = ${B}::uuid`),
          ),
          /permission denied/i,
        );
      });
    }

    const seed = seederFor(t);
    if (seed && can("INSERT")) {
      it("INSERT of a row that belongs to B from context A is rejected by WITH CHECK (G1)", async () => {
        // For stores, "another store" is a fresh id (B already exists and would hit the PK after RLS).
        const target = t.qualified === "public.stores" ? newStoreId() : B;
        await expectPgError(
          withStoreTx(A, async (tx) => {
            await assertAppUser(tx);
            await seed(tx, target, 99);
          }),
          /row-level security/i,
        );
        expect(await withStoreTx(B, (tx) => count(tx, t, B))).toBe(
          expectedRowsPerStore(t),
        );
      });
    } else if (!can("INSERT")) {
      it("app_user cannot INSERT into it (permission denied)", async () => {
        await expectPgError(
          withStoreTx(A, (tx) =>
            tx.execute(
              sql`insert into ${rel(t)} (${key(t)}) values (${A}::uuid)`,
            ),
          ),
          /permission denied/i,
        );
      });
    }

    if (can("UPDATE") && !t.isPartition) {
      it("UPDATE that moves an own row to B is rejected by WITH CHECK (G1)", async () => {
        const target = t.qualified === "public.stores" ? uuidv7() : B;
        await expectPgError(
          withStoreTx(A, async (tx) => {
            await assertAppUser(tx);
            await tx.execute(
              sql`update ${rel(t)} set ${key(t)} = ${target}::uuid where ${key(t)} = ${A}::uuid`,
            );
          }),
          /row-level security/i,
        );
        expect(await withStoreTx(A, (tx) => count(tx, t, A))).toBe(
          expectedRowsPerStore(t),
        );
        expect(await withStoreTx(B, (tx) => count(tx, t, B))).toBe(
          expectedRowsPerStore(t),
        );
      });
    }
  });
});
