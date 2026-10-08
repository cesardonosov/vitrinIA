/**
 * Mutation check for the cross-tenant harness (VIT-109 AC4, threat model C7).
 *
 * A security suite that cannot fail proves nothing. This script applies, one at
 * a time, deliberate breakages to the ISOLATED test database as the owner
 * (migrator), runs the harness, and requires the expected outcome: the suite
 * must FAIL naming the broken table for real breakages, and must PASS (covering
 * the new relations automatically) for correctly protected new tables. Every
 * mutation is reverted in a `finally`; the script ends by running the clean
 * suite, which must pass.
 *
 * Run: pnpm test:tenant-isolation:mutations (needs the same TEST_* variables as
 * pnpm test:tenant-isolation). It is plain Node + pg so CI can run it without a
 * test runner wrapper: `node tests/integration/tenant-isolation/mutation-check.ts`.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import pg from "pg";
import { requireTestUrl } from "../test-url.ts";

interface Mutation {
  readonly name: string;
  readonly criterion: string;
  readonly up: string;
  readonly down: string;
  readonly expect: "fail" | "pass";
  /** Substrings the vitest output must contain (e.g. the offending table). */
  readonly outputContains: readonly string[];
  /** Optional `vitest -t` filter to prove a specific detector on its own. */
  readonly filter?: string;
}

const TENANT_PREDICATE = (key: string) =>
  `${key} = NULLIF(current_setting('app.store_id', true), '')::uuid`;

const NOTES_TABLE = `
  create table public.notes (
    id uuid primary key,
    store_id uuid not null references public.stores(id),
    body text not null
  );
  grant select, insert, update, delete on table public.notes to app_user;`;

const NOTES_PROTECT = `
  alter table public.notes enable row level security;
  alter table public.notes force row level security;
  create policy notes_tenant on public.notes as permissive for all to app_user
    using (${TENANT_PREDICATE("store_id")}) with check (${TENANT_PREDICATE("store_id")});`;

const EVENTS_PARENT = `
  create table public.events (
    id uuid not null,
    store_id uuid not null references public.stores(id),
    occurred_at timestamptz not null,
    kind text not null,
    primary key (id, occurred_at)
  ) partition by range (occurred_at);
  grant select, insert, update, delete on table public.events to app_user;
  alter table public.events enable row level security;
  alter table public.events force row level security;
  create policy events_tenant on public.events as permissive for all to app_user
    using (${TENANT_PREDICATE("store_id")}) with check (${TENANT_PREDICATE("store_id")});
  create table public.events_2026 partition of public.events
    for values from ('2020-01-01') to ('2100-01-01');
  alter table public.events_2026 enable row level security;`;

const MUTATIONS: readonly Mutation[] = [
  {
    name: "drop the domains policy",
    criterion: "AC4 / C7: removing the policy of domains makes the suite fail",
    up: "drop policy domains_tenant on public.domains;",
    down: `create policy domains_tenant on public.domains as permissive for all to app_user
      using (${TENANT_PREDICATE("store_id")}) with check (${TENANT_PREDICATE("store_id")});`,
    expect: "fail",
    outputContains: ["public.domains"],
  },
  {
    name: "domains without FORCE ROW LEVEL SECURITY",
    criterion:
      "C2 / C6: RLS enabled but not forced is reported naming the table",
    up: "alter table public.domains no force row level security;",
    down: "alter table public.domains force row level security;",
    expect: "fail",
    outputContains: ["public.domains", "FORCE ROW LEVEL SECURITY missing"],
  },
  {
    name: "domains policy replaced by USING (true)",
    criterion:
      "C5: a permissive policy is caught by the dynamic cross-tenant tests alone (static checks filtered out)",
    up: `drop policy domains_tenant on public.domains;
      create policy domains_tenant on public.domains as permissive for all to app_user
      using (true) with check (true);`,
    down: `drop policy domains_tenant on public.domains;
      create policy domains_tenant on public.domains as permissive for all to app_user
      using (${TENANT_PREDICATE("store_id")}) with check (${TENANT_PREDICATE("store_id")});`,
    expect: "fail",
    outputContains: ["public.domains", "dynamic as app_user"],
    filter: "dynamic as app_user",
  },
  {
    name: "new table with store_id and no RLS",
    criterion:
      "AC2 / C6: a new tenant table without RLS fails naming the table",
    up: NOTES_TABLE,
    down: "drop table public.notes;",
    expect: "fail",
    outputContains: ["public.notes", "ROW LEVEL SECURITY missing"],
  },
  {
    name: "new table with store_id, correctly protected",
    criterion:
      "C6: a new tenant table is covered by the full set of cross-tenant tests with no hand-written test",
    up: NOTES_TABLE + NOTES_PROTECT,
    down: "drop table public.notes;",
    expect: "pass",
    outputContains: [
      "tenant table public.notes > dynamic as app_user (C5/G1/G2) > INSERT of a row that belongs to B from context A is rejected by WITH CHECK (G1)",
      "tenant table public.notes > dynamic as app_user (C5/G1/G2) > DELETE on rows of B from context A affects 0 rows and B keeps its rows",
    ],
  },
  {
    name: "partitioned table with store_id, correctly protected",
    criterion:
      "G3: a partitioned table and its partition are enumerated (relkind p + pg_inherits) and covered",
    up: `${EVENTS_PARENT}
      alter table public.events_2026 force row level security;`,
    down: "drop table public.events;",
    expect: "pass",
    outputContains: [
      "tenant table public.events > dynamic as app_user (C5/G1/G2) > rows seen through the partitioned parent equal the sum over its readable partitions",
      "tenant table public.events_2026 > static (C2/C6/G3) > as a partition, it is protected through its parent or has its own policies",
      "tenant table public.events_2026 > dynamic as app_user (C5/G1/G2) > app_user cannot read it directly (permission denied)",
    ],
  },
  {
    name: "partition without FORCE ROW LEVEL SECURITY",
    criterion: "G3: a partition that lost FORCE is reported by its own name",
    up: EVENTS_PARENT,
    down: "drop table public.events;",
    expect: "fail",
    outputContains: ["public.events_2026", "FORCE ROW LEVEL SECURITY missing"],
  },
];

const root = path.resolve(import.meta.dirname, "../../..");

function runSuite(filter?: string): { status: number; output: string } {
  const args = [
    "run",
    "--config",
    "vitest.integration.config.mts",
    "--reporter=verbose",
    "tests/integration/tenant-isolation",
  ];
  if (filter) args.push("-t", filter);
  const r = spawnSync(path.join(root, "node_modules/.bin/vitest"), args, {
    cwd: root,
    env: { ...process.env, NO_COLOR: "1", CI: "true" },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return { status: r.status ?? 1, output: `${r.stdout}\n${r.stderr}` };
}

async function main(): Promise<void> {
  const client = new pg.Client({
    connectionString: requireTestUrl("TEST_MIGRATOR_DATABASE_URL"),
  });
  await client.connect();
  const who = await client.query<{ u: string }>("select current_user as u");
  if (who.rows[0]?.u !== "migrator") {
    throw new Error("TEST_MIGRATOR_DATABASE_URL must connect as migrator");
  }
  const results: { name: string; ok: boolean; detail: string }[] = [];
  try {
    for (const m of MUTATIONS) {
      console.log(
        `\n== mutation: ${m.name} (expect ${m.expect}) ==\n   ${m.criterion}`,
      );
      await client.query(m.up);
      let run: { status: number; output: string };
      try {
        run = runSuite(m.filter);
      } finally {
        await client.query(m.down);
      }
      const outcome = run.status === 0 ? "pass" : "fail";
      const missing = m.outputContains.filter((s) => !run.output.includes(s));
      const ok = outcome === m.expect && missing.length === 0;
      const detail = ok
        ? `suite ${outcome}ed as expected; output names ${m.outputContains.map((s) => JSON.stringify(s)).join(", ")}`
        : `suite ${outcome}ed (expected ${m.expect}); missing in output: ${missing.map((s) => JSON.stringify(s)).join(", ") || "none"}`;
      results.push({ name: m.name, ok, detail });
      console.log(`   ${ok ? "OK" : "FAILED"}: ${detail}`);
      if (!ok) console.log(run.output);
    }
  } finally {
    await client.end();
  }

  console.log("\n== clean suite (must pass) ==");
  const clean = runSuite();
  const cleanOk = clean.status === 0;
  results.push({
    name: "clean suite after reverting every mutation",
    ok: cleanOk,
    detail: cleanOk ? "passed" : "FAILED (a mutation was not reverted?)",
  });
  if (!cleanOk) console.log(clean.output);

  console.log("\n== summary ==");
  for (const r of results)
    console.log(`${r.ok ? "OK    " : "FAILED"} ${r.name}: ${r.detail}`);
  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(
      `\n${failed.length} mutation check(s) failed: the harness does not detect what it claims.`,
    );
    process.exit(1);
  }
  console.log(
    `\nall ${results.length} checks ok: the harness fails when isolation breaks and covers new tables.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
