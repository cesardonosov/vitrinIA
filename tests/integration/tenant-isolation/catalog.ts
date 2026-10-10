import { sql } from "drizzle-orm";
import type { DatabaseHandle } from "@/infra/db/client";

/**
 * Catalog enumeration for the cross-tenant harness (VIT-109, threat model C2/C6/G3).
 *
 * Runs on the OWNER connection (migrator) because app_user cannot read every
 * catalog detail it needs (grants of other roles, ownership). It only reads
 * pg_catalog; it never touches tenant rows.
 *
 * A "tenant table" is every relation of kind r (ordinary table or partition) or
 * p (partitioned table), outside the system schemas, that has a `store_id`
 * column, plus `public.stores`, whose tenant key is `id`. Partitions are also
 * reached through pg_inherits from every partitioned parent, so a partition is
 * listed even if its columns ever diverged from the parent (they cannot today,
 * but the harness must not depend on it).
 */

export type Privilege = "SELECT" | "INSERT" | "UPDATE" | "DELETE";
export const PRIVILEGES: readonly Privilege[] = [
  "SELECT",
  "INSERT",
  "UPDATE",
  "DELETE",
];

/** Command letters as stored in pg_policy.polcmd. */
export type PolicyCmd = "*" | "r" | "a" | "w" | "d";

export interface PolicyInfo {
  readonly name: string;
  readonly cmd: PolicyCmd;
  readonly permissive: boolean;
  /** Role names the policy applies to; "public" when polroles = {0}. */
  readonly roles: readonly string[];
  readonly using: string | null;
  readonly check: string | null;
}

export interface ColumnInfo {
  readonly name: string;
  /** format_type() output, e.g. "uuid", "text", "timestamp with time zone". */
  readonly type: string;
  readonly notNull: boolean;
  readonly hasDefault: boolean;
  readonly generated: boolean;
  /** app_user may UPDATE this column (table-level or column-level grant). */
  readonly appUserCanUpdate: boolean;
  /** Target table ("schema.name") when the column is part of a FOREIGN KEY. */
  readonly referencesTable: string | null;
}

export interface TenantTable {
  /** Qualified name "schema.name" (unquoted; used as registry key). */
  readonly qualified: string;
  readonly schema: string;
  readonly name: string;
  readonly relkind: "r" | "p";
  readonly isPartition: boolean;
  /** Qualified name of the partition parent when isPartition. */
  readonly parent: string | null;
  readonly owner: string;
  readonly rlsEnabled: boolean;
  readonly rlsForced: boolean;
  /** Column the tenant policy must compare: "store_id", or "id" for public.stores. */
  readonly tenantKey: "store_id" | "id";
  readonly policies: readonly PolicyInfo[];
  /**
   * Privileges app_user holds directly on this relation. UPDATE counts a column-level
   * grant too (has_any_column_privilege): has_table_privilege alone ignores them and the
   * harness would skip the UPDATE tests for tables like orders (#106).
   */
  readonly appUserPrivileges: readonly Privilege[];
  readonly columns: readonly ColumnInfo[];
  /** Qualified names of tenant tables this table references through FKs (for seeding order). */
  readonly dependsOn: readonly string[];
}

export interface Catalog {
  /** Every tenant table, in a FK-safe insertion order (parents before children). */
  readonly tables: readonly TenantTable[];
  readonly byName: ReadonlyMap<string, TenantTable>;
}

const SYSTEM_SCHEMAS = ["pg_catalog", "information_schema", "pg_toast"];

interface RelRow {
  oid: number;
  schema: string;
  name: string;
  relkind: "r" | "p";
  relispartition: boolean;
  parent: string | null;
  owner: string;
  relrowsecurity: boolean;
  relforcerowsecurity: boolean;
  has_store_id: boolean;
}

interface PolicyRow {
  oid: number;
  polname: string;
  polcmd: PolicyCmd;
  polpermissive: boolean;
  roles: string[] | null;
  using: string | null;
  check: string | null;
}

interface PrivRow {
  oid: number;
  priv: Privilege;
  ok: boolean;
}

interface ColumnRow {
  oid: number;
  name: string;
  type: string;
  notnull: boolean;
  hasdefault: boolean;
  generated: boolean;
  can_update: boolean;
  ref: string | null;
}

/** Drizzle expands JS arrays into tuples; pass Postgres array literals instead. */
function pgArray(values: readonly (string | number)[]): string {
  return `{${values.map((v) => `"${String(v).replace(/"/g, '\\"')}"`).join(",")}}`;
}

async function query<T>(
  owner: DatabaseHandle,
  q: ReturnType<typeof sql>,
): Promise<T[]> {
  return (await owner.db.execute(q)).rows as T[];
}

export async function loadCatalog(owner: DatabaseHandle): Promise<Catalog> {
  // 1. Relations with a store_id column, plus public.stores, kinds r and p,
  //    UNION every partition reached through pg_inherits from a partitioned parent.
  const rels = await query<RelRow>(
    owner,
    sql`
      with candidates as (
        select c.oid
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where c.relkind in ('r', 'p')
          and n.nspname <> all(${pgArray(SYSTEM_SCHEMAS)}::text[])
          and (
            exists (
              select 1 from pg_attribute a
              where a.attrelid = c.oid and a.attname = 'store_id'
                and a.attnum > 0 and not a.attisdropped
            )
            or (n.nspname = 'public' and c.relname = 'stores')
          )
      ),
      with_partitions as (
        select oid from candidates
        union
        select i.inhrelid
        from pg_inherits i
        join candidates p on p.oid = i.inhparent
        join pg_class child on child.oid = i.inhrelid
        where child.relkind in ('r', 'p') and child.relispartition
      )
      select c.oid::int as oid,
             n.nspname as schema,
             c.relname as name,
             c.relkind::text as relkind,
             c.relispartition,
             (select format('%s.%s', pn.nspname, pc.relname)
                from pg_inherits i
                join pg_class pc on pc.oid = i.inhparent
                join pg_namespace pn on pn.oid = pc.relnamespace
               where i.inhrelid = c.oid
               limit 1) as parent,
             pg_get_userbyid(c.relowner) as owner,
             c.relrowsecurity,
             c.relforcerowsecurity,
             exists (
               select 1 from pg_attribute a
               where a.attrelid = c.oid and a.attname = 'store_id'
                 and a.attnum > 0 and not a.attisdropped
             ) as has_store_id
      from with_partitions w
      join pg_class c on c.oid = w.oid
      join pg_namespace n on n.oid = c.relnamespace
      order by n.nspname, c.relname
    `,
  );
  if (rels.length === 0) return { tables: [], byName: new Map() };
  const oids = pgArray(rels.map((r) => r.oid));

  const policies = await query<PolicyRow>(
    owner,
    sql`
      select p.polrelid::int as oid,
             p.polname,
             p.polcmd::text as polcmd,
             p.polpermissive,
             case when p.polroles = '{0}'::oid[] then array['public']
                  else (select array_agg(r.rolname::text order by r.rolname)
                          from pg_roles r where r.oid = any(p.polroles)) end as roles,
             pg_get_expr(p.polqual, p.polrelid) as using,
             pg_get_expr(p.polwithcheck, p.polrelid) as check
      from pg_policy p
      where p.polrelid = any(${oids}::oid[])
      order by p.polrelid, p.polname
    `,
  );

  const privs = await query<PrivRow>(
    owner,
    sql`
      select c.oid::int as oid, pr.priv, case when pr.priv = 'UPDATE'
                  then has_table_privilege('app_user', c.oid, 'UPDATE')
                    or has_any_column_privilege('app_user', c.oid, 'UPDATE')
                  else has_table_privilege('app_user', c.oid, pr.priv) end as ok
      from pg_class c
      cross join unnest(${pgArray(PRIVILEGES)}::text[]) as pr(priv)
      where c.oid = any(${oids}::oid[])
    `,
  );

  const columns = await query<ColumnRow>(
    owner,
    sql`
      select a.attrelid::int as oid,
             a.attname as name,
             format_type(a.atttypid, a.atttypmod) as type,
             a.attnotnull as notnull,
             a.atthasdef as hasdefault,
             (a.attidentity <> '' or a.attgenerated <> '') as generated,
             has_column_privilege('app_user', a.attrelid, a.attnum, 'UPDATE') as can_update,
             (select format('%s.%s', fn.nspname, fc.relname)
                from pg_constraint k
                join pg_class fc on fc.oid = k.confrelid
                join pg_namespace fn on fn.oid = fc.relnamespace
               where k.conrelid = a.attrelid and k.contype = 'f'
                 and a.attnum = any(k.conkey)
               limit 1) as ref
      from pg_attribute a
      where a.attrelid = any(${oids}::oid[]) and a.attnum > 0 and not a.attisdropped
      order by a.attrelid, a.attnum
    `,
  );

  const unordered: TenantTable[] = rels.map((r) => {
    const qualified = `${r.schema}.${r.name}`;
    const cols: ColumnInfo[] = columns
      .filter((c) => c.oid === r.oid)
      .map((c) => ({
        name: c.name,
        type: c.type,
        notNull: c.notnull,
        hasDefault: c.hasdefault,
        generated: c.generated,
        appUserCanUpdate: c.can_update,
        referencesTable: c.ref,
      }));
    const dependsOn = [
      ...new Set(
        cols
          .map((c) => c.referencesTable)
          .filter((t): t is string => t !== null && t !== qualified),
      ),
    ];
    if (r.relispartition && r.parent) dependsOn.push(r.parent);
    return {
      qualified,
      schema: r.schema,
      name: r.name,
      relkind: r.relkind,
      isPartition: r.relispartition,
      parent: r.parent,
      owner: r.owner,
      rlsEnabled: r.relrowsecurity,
      rlsForced: r.relforcerowsecurity,
      tenantKey: qualified === "public.stores" ? "id" : "store_id",
      policies: policies
        .filter((p) => p.oid === r.oid)
        .map((p) => ({
          name: p.polname,
          cmd: p.polcmd,
          permissive: p.polpermissive,
          roles: p.roles ?? [],
          using: p.using,
          check: p.check,
        })),
      appUserPrivileges: PRIVILEGES.filter((priv) =>
        privs.some((p) => p.oid === r.oid && p.priv === priv && p.ok),
      ),
      columns: cols,
      dependsOn,
    };
  });

  const tables = topologicalOrder(unordered);
  return { tables, byName: new Map(tables.map((t) => [t.qualified, t])) };
}

/** Parents before children so a generic seed can insert in one pass. Cycles fail loudly. */
function topologicalOrder(tables: readonly TenantTable[]): TenantTable[] {
  const known = new Set(tables.map((t) => t.qualified));
  const done = new Set<string>();
  const result: TenantTable[] = [];
  let remaining = [...tables];
  while (remaining.length > 0) {
    const ready = remaining.filter((t) =>
      t.dependsOn.every((d) => !known.has(d) || done.has(d)),
    );
    if (ready.length === 0) {
      throw new Error(
        `tenant tables have a FK cycle: ${remaining.map((t) => t.qualified).join(", ")}`,
      );
    }
    for (const t of ready) {
      done.add(t.qualified);
      result.push(t);
    }
    remaining = remaining.filter((t) => !done.has(t.qualified));
  }
  return result;
}

/**
 * Column the UPDATE tests write: the tenant key when app_user may update it, otherwise
 * the first column it may update (e.g. orders.status). Null when none (no UPDATE at all).
 */
export function updatableColumn(table: TenantTable): string | null {
  const cols = table.columns.filter((c) => c.appUserCanUpdate);
  return (
    cols.find((c) => c.name === table.tenantKey)?.name ?? cols[0]?.name ?? null
  );
}

/** app_user may rewrite the tenant key (needed for the "move a row to B" test). */
export function canUpdateTenantKey(table: TenantTable): boolean {
  return table.columns.some(
    (c) => c.name === table.tenantKey && c.appUserCanUpdate,
  );
}

/** Exact fail-closed predicate Postgres stores for `key = NULLIF(current_setting('app.store_id', true), '')::uuid`. */
export function expectedPolicyExpression(key: "store_id" | "id"): string {
  return `(${key} = (NULLIF(current_setting('app.store_id'::text, true), ''::text))::uuid)`;
}

/** Permissive policies that widen what app_user can do (directly or via PUBLIC). */
export function appUserPolicies(table: TenantTable): PolicyInfo[] {
  return table.policies.filter(
    (p) =>
      p.permissive &&
      (p.roles.includes("app_user") || p.roles.includes("public")),
  );
}

const CMD_FOR_PRIVILEGE: Record<Privilege, PolicyCmd> = {
  SELECT: "r",
  INSERT: "a",
  UPDATE: "w",
  DELETE: "d",
};

/** Privileges app_user holds on the table that no app_user policy covers. */
export function uncoveredPrivileges(table: TenantTable): Privilege[] {
  const pols = appUserPolicies(table);
  return table.appUserPrivileges.filter(
    (priv) =>
      !pols.some((p) => p.cmd === "*" || p.cmd === CMD_FOR_PRIVILEGE[priv]),
  );
}
