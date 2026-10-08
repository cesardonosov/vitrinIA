import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { DatabaseHandle } from "@/infra/db/client";
import {
  bindWithStoreTx,
  InvalidStoreContextError,
  type StoreTx,
} from "@/infra/db/with-store-tx";
import { uuidv7 } from "@/infra/uuid-v7";
import { domains, stores } from "@/modules/store-config/infrastructure/schema";
import { isUuidV7, type StoreId } from "@/shared/kernel";
import {
  expectPgError,
  newStoreId,
  openAppUser,
  openMigrator,
  type SeededStore,
  seedStore,
  truncateAll,
  unique,
} from "./helpers";

let app: DatabaseHandle;
let owner: DatabaseHandle;
let withStoreTx: ReturnType<typeof bindWithStoreTx>;
let A: SeededStore;
let B: SeededStore;

async function rows<T extends Record<string, unknown>>(
  handle: DatabaseHandle,
  query: ReturnType<typeof sql>,
): Promise<T[]> {
  const result = await handle.db.execute(query);
  return result.rows as T[];
}

beforeAll(() => {
  app = openAppUser();
  owner = openMigrator();
  withStoreTx = bindWithStoreTx(app.db);
});

afterAll(async () => {
  await truncateAll(owner);
  await app.close();
  await owner.close();
});

beforeEach(async () => {
  await truncateAll(owner);
  A = await seedStore(app, "tienda-a");
  B = await seedStore(app, "tienda-b");
});

describe("connection identity (suite honesty, threat model C7/G2)", () => {
  it("the app pool is app_user, not the owner nor a superuser", async () => {
    const [r] = await rows<{ u: string; s: string }>(
      app,
      sql`select current_user as u, current_setting('is_superuser') as s`,
    );
    expect(r).toEqual({ u: "app_user", s: "off" });
  });
});

describe("AC1 fail-closed without tenant context", () => {
  it("app_user without context reads 0 rows from domains and stores", async () => {
    // Data exists (seeded in beforeEach): prove it through the right context first.
    const own = await withStoreTx(A.id, (tx) => tx.select().from(domains));
    expect(own).toHaveLength(1);
    expect(await rows(app, sql`select * from domains`)).toHaveLength(0);
    expect(await rows(app, sql`select * from stores`)).toHaveLength(0);
    expect(
      await rows(app, sql`select count(*)::int as n from domains`),
    ).toEqual([{ n: 0 }]);
  });

  it("an empty-string context also yields 0 rows (NULLIF)", async () => {
    const result = await app.db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.store_id', '', true)`);
      return (await tx.execute(sql`select * from domains`)).rows;
    });
    expect(result).toHaveLength(0);
  });

  it("without context INSERT is rejected by WITH CHECK", async () => {
    await expectPgError(
      app.db.insert(stores).values({ id: uuidv7(), slug: "x", name: "x" }),
      /row-level security/i,
    );
  });
});

describe("AC2 and G9 catalog: RLS enabled and forced, owner, roles", () => {
  it("stores and domains have ENABLE + FORCE RLS and are owned by migrator", async () => {
    const r = await rows<{
      relname: string;
      owner: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(
      owner,
      sql`select c.relname, pg_get_userbyid(c.relowner) as owner, c.relrowsecurity, c.relforcerowsecurity
          from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relname in ('stores','domains') order by 1`,
    );
    expect(r).toEqual([
      {
        relname: "domains",
        owner: "migrator",
        relrowsecurity: true,
        relforcerowsecurity: true,
      },
      {
        relname: "stores",
        owner: "migrator",
        relrowsecurity: true,
        relforcerowsecurity: true,
      },
    ]);
  });

  it("policies are fail-closed with USING and WITH CHECK and no IS NULL escape", async () => {
    const pol = await rows<{
      tbl: string;
      polname: string;
      cmd: string;
      roles: string;
      using: string;
      check: string | null;
    }>(
      owner,
      sql`select polrelid::regclass::text as tbl, polname, polcmd as cmd,
                 (select string_agg(rolname, ',') from pg_roles where oid = any(polroles)) as roles,
                 pg_get_expr(polqual, polrelid) as using,
                 pg_get_expr(polwithcheck, polrelid) as check
          from pg_policy order by 1, 2`,
    );
    const byName = Object.fromEntries(pol.map((p) => [p.polname, p]));
    for (const name of ["stores_tenant", "domains_tenant"]) {
      const p = byName[name];
      expect(p?.roles).toBe("app_user");
      expect(p?.cmd).toBe("*");
      for (const expr of [p?.using, p?.check]) {
        expect(expr).toContain(
          "NULLIF(current_setting('app.store_id'::text, true), ''::text)",
        );
        expect(expr).toContain("::uuid");
        expect(expr).not.toMatch(/IS NULL/i);
        expect(expr).not.toMatch(/\bOR\b/i);
      }
    }
    expect(byName.stores_tenant?.using).toContain("id =");
    expect(byName.domains_tenant?.using).toContain("store_id =");
    const hr = byName.domains_host_resolver;
    expect(hr?.cmd).toBe("r");
    expect(hr?.roles).toBe("host_resolver");
    expect(hr?.using).toBe("(verified_at IS NOT NULL)");
  });

  it("no role used by the system has BYPASSRLS or SUPERUSER (migrator included)", async () => {
    const r = await rows<{
      rolname: string;
      rolsuper: boolean;
      rolbypassrls: boolean;
      rolcanlogin: boolean;
    }>(
      owner,
      sql`select rolname, rolsuper, rolbypassrls, rolcanlogin from pg_roles
          where rolname in ('migrator','app_user','host_resolver') order by 1`,
    );
    expect(r).toEqual([
      {
        rolname: "app_user",
        rolsuper: false,
        rolbypassrls: false,
        rolcanlogin: true,
      },
      {
        rolname: "host_resolver",
        rolsuper: false,
        rolbypassrls: false,
        rolcanlogin: false,
      },
      {
        rolname: "migrator",
        rolsuper: false,
        rolbypassrls: false,
        rolcanlogin: true,
      },
    ]);
  });

  it("app_user owns nothing, is in no predefined data role and has no DDL", async () => {
    const owned = await rows(
      owner,
      sql`select 1 from pg_class where relowner = 'app_user'::regrole
          union all select 1 from pg_proc where proowner = 'app_user'::regrole`,
    );
    expect(owned).toHaveLength(0);
    const member = await rows(
      owner,
      sql`select 1 from pg_auth_members where member = 'app_user'::regrole`,
    );
    expect(member).toHaveLength(0);
    await expectPgError(
      app.db.execute(sql`create table evil (x int)`),
      /permission denied/i,
    );
    await expectPgError(
      app.db.execute(sql`truncate stores`),
      /permission denied/i,
    );
  });

  it("PUBLIC has no privileges on the tables; app_user has exactly the granted ones", async () => {
    const r = await rows<{ rel: string; grantee: string; priv: string }>(
      owner,
      sql`select c.relname as rel, coalesce(nullif(a.grantee,0)::regrole::text,'PUBLIC') as grantee, a.privilege_type as priv
          from pg_class c, aclexplode(c.relacl) a
          where c.relnamespace = 'public'::regnamespace and c.relname in ('stores','domains')
            and a.grantee <> c.relowner order by 1,2,3`,
    );
    const privs = (rel: string) =>
      r.filter((x) => x.rel === rel).map((x) => `${x.grantee}:${x.priv}`);
    expect(privs("stores")).toEqual([
      "app_user:INSERT",
      "app_user:SELECT",
      "app_user:UPDATE",
    ]);
    expect(privs("domains")).toEqual([
      "app_user:DELETE",
      "app_user:INSERT",
      "app_user:SELECT",
      "app_user:UPDATE",
    ]);
  });
});

describe("AC3 and C5: cross-tenant access from the database", () => {
  it("context A sees its own rows (count > 0) and 0 rows of B", async () => {
    await withStoreTx(A.id, async (tx) => {
      const own = await tx.select().from(domains);
      expect(own.map((d) => d.host)).toEqual([A.host]);
      const ownStores = await tx.select().from(stores);
      expect(ownStores.map((s) => s.id)).toEqual([A.id]);
      const foreign = await tx.execute(
        sql`select * from domains where store_id = ${B.id}::uuid`,
      );
      expect(foreign.rows).toHaveLength(0);
      const foreignStore = await tx.execute(
        sql`select * from stores where id = ${B.id}::uuid`,
      );
      expect(foreignStore.rows).toHaveLength(0);
      const agg = await tx.execute(sql`select count(*)::int as n from domains`);
      expect(agg.rows).toEqual([{ n: 1 }]);
    });
  });

  it("UPDATE and DELETE on rows of B affect 0 rows", async () => {
    await withStoreTx(A.id, async (tx) => {
      const upd = await tx.execute(
        sql`update domains set host = 'hijack.vitrinia.cl' where id = ${B.domainId}::uuid`,
      );
      expect(upd.rowCount).toBe(0);
      const del = await tx.execute(
        sql`delete from domains where id = ${B.domainId}::uuid`,
      );
      expect(del.rowCount).toBe(0);
      const updStore = await tx.execute(
        sql`update stores set name = 'x' where id = ${B.id}::uuid`,
      );
      expect(updStore.rowCount).toBe(0);
    });
    const still = await withStoreTx(B.id, (tx) => tx.select().from(domains));
    expect(still.map((d) => d.host)).toEqual([B.host]);
  });

  it("INSERT with the store_id of B from context A is rejected by WITH CHECK", async () => {
    await expectPgError(
      withStoreTx(A.id, (tx) =>
        tx
          .insert(domains)
          .values({ id: uuidv7(), storeId: B.id, host: "evil.vitrinia.cl" }),
      ),
      /row-level security/i,
    );
    await expectPgError(
      withStoreTx(A.id, (tx) =>
        tx.insert(stores).values({
          id: B.id === A.id ? uuidv7() : newStoreId(),
          slug: "evil",
          name: "e",
        }),
      ),
      /row-level security/i,
    );
  });

  it("UPDATE that moves an own row to store B is rejected by WITH CHECK", async () => {
    await expectPgError(
      withStoreTx(A.id, (tx) =>
        tx.execute(
          sql`update domains set store_id = ${B.id}::uuid where id = ${A.domainId}::uuid`,
        ),
      ),
      /row-level security/i,
    );
  });
});

describe("AC4, AC5 and C4: no tenant context survives in the pool", () => {
  const ctx = (tx: Pick<StoreTx, "execute">) =>
    tx.execute(
      sql`select current_setting('app.store_id', true) as v, pg_backend_pid() as pid`,
    );

  it("pool of 1: after a committed tx of A the same connection has no context", async () => {
    const single = openAppUser(1);
    try {
      const w = bindWithStoreTx(single.db);
      const inside = await w(A.id, async (tx) => ({
        seen: (await tx.select().from(domains)).length,
        c: (await ctx(tx)).rows[0] as { v: string; pid: number },
      }));
      expect(inside.seen).toBe(1);
      expect(inside.c.v).toBe(A.id);
      const after = (await single.db.execute(sql`select * from domains`)).rows;
      expect(after).toHaveLength(0);
      const c = (await ctx(single.db)).rows[0] as {
        v: string | null;
        pid: number;
      };
      expect(c.pid).toBe(inside.c.pid); // proves it is the SAME connection
      expect(c.v === null || c.v === "").toBe(true);
    } finally {
      await single.close();
    }
  });

  it("pool of 1: a ROLLBACK of A leaves no context either", async () => {
    const single = openAppUser(1);
    try {
      const w = bindWithStoreTx(single.db);
      await expect(
        w(A.id, async () => {
          throw new Error("boom");
        }),
      ).rejects.toThrow("boom");
      expect(
        (await single.db.execute(sql`select * from domains`)).rows,
      ).toHaveLength(0);
      const c = (await ctx(single.db)).rows[0] as { v: string | null };
      expect(c.v === null || c.v === "").toBe(true);
    } finally {
      await single.close();
    }
  });

  it("pool of 1 alternating A, B, A never mixes data", async () => {
    const single = openAppUser(1);
    try {
      const w = bindWithStoreTx(single.db);
      for (const s of [A, B, A, B]) {
        const hosts = await w(s.id, async (tx) =>
          (await tx.select().from(domains)).map((d) => d.host),
        );
        expect(hosts).toEqual([s.host]);
      }
    } finally {
      await single.close();
    }
  });

  it("concurrent transactions of A and B overlap and no pooled connection keeps app.store_id", async () => {
    const size = 4;
    const pool = openAppUser(size);
    try {
      const w = bindWithStoreTx(pool.db);
      // Barrier: both transactions are open at the same time, on different connections.
      const overlap = async () => {
        let arrived = 0;
        let release: () => void = () => {};
        const gate = new Promise<void>((r) => {
          release = r;
        });
        const run = (s: SeededStore) =>
          w(s.id, async (tx) => {
            arrived++;
            if (arrived === 2) release();
            await gate;
            const hosts = (await tx.select().from(domains)).map((d) => d.host);
            const pid = ((await ctx(tx)).rows[0] as { pid: number }).pid;
            return { hosts, pid };
          });
        return Promise.all([run(A), run(B)]);
      };
      // Several rounds so connections are reused across tenants.
      for (let round = 0; round < 3; round++) {
        const [ra, rb] = await overlap();
        expect(ra?.hosts).toEqual([A.host]);
        expect(rb?.hosts).toEqual([B.host]);
        expect(ra?.pid).not.toBe(rb?.pid);
      }

      // Check out EVERY connection of the pool at once and inspect each one.
      const clients = await Promise.all(
        Array.from({ length: size }, () => pool.pool.connect()),
      );
      try {
        const seen = await Promise.all(
          clients.map((c) =>
            c.query("select current_setting('app.store_id', true) as v"),
          ),
        );
        for (const res of seen) {
          const v = res.rows[0]?.v as string | null;
          expect(v === null || v === "").toBe(true);
        }
      } finally {
        for (const c of clients) c.release();
      }
    } finally {
      await pool.close();
    }
  });
});

describe("AC6 and C8/G4: resolve_host", () => {
  const resolve = async (host: string | null) => {
    const r = await app.db.execute(sql`select resolve_host(${host}) as id`);
    return (r.rows[0] as { id: string | null }).id;
  };

  it("resolves a verified host to the StoreId with verified_at not null, without context", async () => {
    expect(await resolve(A.host)).toBe(A.id);
    expect(await resolve(B.host)).toBe(B.id);
    const d = await withStoreTx(A.id, (tx) => tx.select().from(domains));
    expect(d[0]?.verifiedAt).toBeInstanceOf(Date);
  });

  it("returns NULL for unknown and for unverified hosts, indistinguishably", async () => {
    const pending = await seedStore(app, unique("pendiente"), {
      verified: false,
    });
    expect(await resolve(pending.host)).toBeNull();
    expect(await resolve("no-existe.vitrinia.cl")).toBeNull();
  });

  it.each([
    ["uppercase", (h: string) => h.toUpperCase()],
    ["port", (h: string) => `${h}:3000`],
    ["trailing dot", (h: string) => `${h}.`],
    ["surrounding spaces", (h: string) => `  ${h} `],
  ])("normalises input: %s", async (_n, mutate) => {
    expect(await resolve(mutate(A.host))).toBe(A.id);
  });

  it.each([
    ["null", null],
    ["empty", ""],
    ["wildcard", "*.vitrinia.cl"],
    ["subdomain of a store", `x.${"tienda-a.vitrinia.cl"}`],
    ["suffix only", "vitrinia.cl"],
    ["path injection", "tienda-a.vitrinia.cl/evil"],
    ["credentials", "a@tienda-a.vitrinia.cl"],
    ["double dot", "tienda-a..vitrinia.cl"],
    ["leading dot", ".tienda-a.vitrinia.cl"],
    ["ipv6 literal", "[::1]:3000"],
    ["newline", "tienda-a.vitrinia.cl\n"],
    ["kelvin sign aliasing k", "tienda-a.vitrinia.cl".replace("t", "K")],
    ["too long", `${"a".repeat(300)}.vitrinia.cl`],
    ["sql injection", "' or '1'='1"],
  ])("returns NULL for hostile or malformed input: %s", async (_n, host) => {
    expect(await resolve(host)).toBeNull();
  });

  it("is a bounded SECURITY DEFINER owned by host_resolver (definition review)", async () => {
    const [f] = await rows<{
      owner: string;
      secdef: boolean;
      vol: string;
      config: string[];
      ret: string;
      lang: string;
    }>(
      owner,
      sql`select pg_get_userbyid(proowner) as owner, prosecdef as secdef, provolatile as vol,
                 proconfig as config, prorettype::regtype::text as ret, l.lanname as lang
          from pg_proc p join pg_language l on l.oid = p.prolang
          where proname = 'resolve_host' and pronamespace = 'public'::regnamespace`,
    );
    expect(f?.owner).toBe("host_resolver");
    expect(f?.secdef).toBe(true);
    expect(f?.vol).toBe("s");
    expect(f?.ret).toBe("uuid");
    expect(f?.config).toEqual(["search_path=pg_catalog, public"]);
  });

  it("EXECUTE is revoked from PUBLIC and granted only to app_user (and the owner)", async () => {
    const acl = await rows<{ grantee: string }>(
      owner,
      sql`select coalesce(nullif(a.grantee,0)::regrole::text,'PUBLIC') as grantee
          from pg_proc p, aclexplode(p.proacl) a
          where proname = 'resolve_host' and a.privilege_type = 'EXECUTE' order by 1`,
    );
    expect(acl.map((a) => a.grantee)).toEqual(["app_user", "host_resolver"]);
    const pub = await rows<{ ok: boolean }>(
      owner,
      sql`select has_function_privilege('public', 'resolve_host(text)', 'EXECUTE') as ok`,
    );
    expect(pub[0]?.ok).toBe(false);
  });

  it("host_resolver can read only host, store_id and verified_at of domains", async () => {
    const cols = await rows<{ column_name: string; ok: boolean }>(
      owner,
      sql`select column_name, has_column_privilege('host_resolver', 'public.domains', column_name, 'SELECT') as ok
          from information_schema.columns where table_name = 'domains' and table_schema = 'public' order by 1`,
    );
    expect(cols.filter((c) => c.ok).map((c) => c.column_name)).toEqual([
      "host",
      "store_id",
      "verified_at",
    ]);
    const tables = await rows<{ ok: boolean }>(
      owner,
      sql`select has_table_privilege('host_resolver', 'public.stores', 'SELECT') as ok`,
    );
    expect(tables[0]?.ok).toBe(false);
  });
});

describe("G5: invalid tenant values", () => {
  it.each([
    "",
    "not-a-uuid",
    "3b241101-e2bb-4255-8caf-4136c566a962",
    "'; drop table stores;--",
  ])("withStoreTx rejects %j without opening a transaction", async (bad) => {
    await expect(
      withStoreTx(bad as StoreId, async () => "should not run"),
    ).rejects.toBeInstanceOf(InvalidStoreContextError);
  });

  it("a non-UUID app.store_id makes the policy error, it does not return rows", async () => {
    await expectPgError(
      app.db.transaction(async (tx) => {
        await tx.execute(
          sql`select set_config('app.store_id', 'garbage', true)`,
        );
        return tx.execute(sql`select * from domains`);
      }),
      /invalid input syntax for type uuid/i,
    );
  });
});

describe("AC7: ids, timestamps, version", () => {
  it("application ids are UUID v7 and the database enforces it", async () => {
    expect(isUuidV7(A.id)).toBe(true);
    expect(isUuidV7(A.domainId)).toBe(true);
    const s = await withStoreTx(A.id, (tx) =>
      tx.execute(sql`select substr(id::text, 15, 1) as v from stores`),
    );
    expect(s.rows).toEqual([{ v: "7" }]);
    const v4 = "3b241101-e2bb-4255-8caf-4136c566a962";
    await expectPgError(
      app.db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.store_id', ${v4}, true)`);
        await tx.execute(
          sql`insert into stores (id, slug, name) values (${v4}::uuid, 'v4', 'v4')`,
        );
      }),
      /stores_id_uuid_v7/,
    );
  });

  it("there is no database default for ids (v4 gen_random_uuid is not used)", async () => {
    const r = await rows<{ column_default: string | null }>(
      owner,
      sql`select column_default from information_schema.columns
          where table_schema = 'public' and table_name in ('stores','domains') and column_name = 'id'`,
    );
    expect(r.every((x) => x.column_default === null)).toBe(true);
  });

  it("all date columns are timestamptz and version defaults to 1", async () => {
    const dates = await rows<{
      table_name: string;
      column_name: string;
      data_type: string;
    }>(
      owner,
      sql`select table_name, column_name, data_type from information_schema.columns
          where table_schema = 'public' and table_name in ('stores','domains') and column_name like '%\\_at'`,
    );
    expect(dates.length).toBe(6);
    expect(dates.every((c) => c.data_type === "timestamp with time zone")).toBe(
      true,
    );
    const rowsV = await withStoreTx(A.id, (tx) => tx.select().from(stores));
    expect(rowsV[0]?.version).toBe(1);
    const domainRows = await withStoreTx(A.id, (tx) =>
      tx.select().from(domains),
    );
    expect(domainRows[0]?.version).toBe(1);
    expect(domainRows[0]?.releasedAt).toBeNull();
  });

  it("the host CHECK refuses non-normalised hosts and (store_id, id) is unique for composite FKs", async () => {
    for (const host of [
      "UPPER.vitrinia.cl",
      "con-puerto.vitrinia.cl:80",
      "*.vitrinia.cl",
      "punto.final.",
    ]) {
      await expectPgError(
        withStoreTx(A.id, (tx) =>
          tx.insert(domains).values({ id: uuidv7(), storeId: A.id, host }),
        ),
        /domains_host_format/,
      );
    }
    const [k] = await rows<{ n: number }>(
      owner,
      sql`select count(*)::int as n from pg_constraint where conname = 'domains_store_id_id_key' and contype = 'u'`,
    );
    expect(k?.n).toBe(1);
  });

  it("host stays unique across tenants", async () => {
    await expectPgError(
      withStoreTx(A.id, (tx) =>
        tx
          .insert(domains)
          .values({ id: uuidv7(), storeId: A.id, host: B.host }),
      ),
      /domains_host_key|duplicate key/,
    );
  });
});

describe("AC8: migration applied and recorded", () => {
  it("drizzle recorded the migration applied by migrator", async () => {
    const r = await rows<{ n: number }>(
      owner,
      sql`select count(*)::int as n from drizzle.__drizzle_migrations`,
    );
    expect(r[0]?.n).toBeGreaterThanOrEqual(1);
  });
});
