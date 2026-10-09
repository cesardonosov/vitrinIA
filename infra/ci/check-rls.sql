-- VIT-105 AC6 / threat model C1, C6, G9. Run as the bootstrap superuser against the ephemeral CI database.
-- Any violation raises an exception naming the offender; psql runs with ON_ERROR_STOP=1.

-- A "tenant policy" is a PERMISSIVE policy that applies to app_user (or PUBLIC), whose USING and
-- WITH CHECK expressions (as deparsed by pg_get_expr) both reference current_setting('app.store_id'.
-- A table is covered for writes when it has either one FOR ALL tenant policy, or a FOR INSERT policy
-- (WITH CHECK) plus a FOR UPDATE policy (USING + WITH CHECK), each a tenant policy.
-- A policy with USING (true), without WITH CHECK, or granted only to another role does not count.
CREATE FUNCTION pg_temp.tenant_policy_ok(rel oid) RETURNS boolean
LANGUAGE sql STABLE AS $f$
  WITH p AS (
    SELECT polcmd,
      coalesce(pg_get_expr(polqual, polrelid), '') LIKE '%current_setting(''app.store_id''%' AS using_ok,
      polwithcheck IS NOT NULL
        AND coalesce(pg_get_expr(polwithcheck, polrelid), '') LIKE '%current_setting(''app.store_id''%' AS check_ok,
      (0 = ANY (polroles)
        OR EXISTS (SELECT 1 FROM pg_roles r WHERE r.oid = ANY (polroles) AND r.rolname = 'app_user')) AS roles_ok
    FROM pg_policy
    WHERE polrelid = rel AND polpermissive
  )
  SELECT EXISTS (SELECT 1 FROM p WHERE polcmd = '*' AND using_ok AND check_ok AND roles_ok)
      OR (EXISTS (SELECT 1 FROM p WHERE polcmd = 'a' AND check_ok AND roles_ok)
          AND EXISTS (SELECT 1 FROM p WHERE polcmd = 'w' AND using_ok AND check_ok AND roles_ok));
$f$;

DO $$
DECLARE
  offenders text;
  r record;
  r_name text;
BEGIN
  -- 1. The application roles must exist (otherwise the role checks pass vacuously).
  FOREACH r_name IN ARRAY ARRAY['app_user', 'migrator', 'host_resolver'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r_name) THEN
      RAISE EXCEPTION 'RLS check: required role % does not exist', r_name;
    END IF;
  END LOOP;

  -- 2. Roles: no superuser / bypassrls (app_user, migrator, host_resolver if present).
  SELECT string_agg(rolname, ', ') INTO offenders
  FROM pg_roles
  WHERE rolname IN ('app_user', 'migrator', 'host_resolver')
    AND (rolsuper OR rolbypassrls);
  IF offenders IS NOT NULL THEN
    RAISE EXCEPTION 'RLS check: roles with rolsuper/rolbypassrls: %', offenders;
  END IF;

  -- 2b. host_resolver owns the SECURITY DEFINER resolver: it must never be able to log in.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'host_resolver' AND (rolcanlogin OR rolcreaterole OR rolcreatedb)) THEN
    RAISE EXCEPTION 'RLS check: host_resolver must be NOLOGIN NOCREATEROLE NOCREATEDB';
  END IF;

  -- 3. app_user: no CREATEROLE/CREATEDB, owns nothing, no blanket data roles.
  SELECT string_agg(rolname, ', ') INTO offenders
  FROM pg_roles WHERE rolname = 'app_user' AND (rolcreaterole OR rolcreatedb);
  IF offenders IS NOT NULL THEN
    RAISE EXCEPTION 'RLS check: app_user has CREATEROLE/CREATEDB';
  END IF;

  SELECT string_agg(format('%I.%I', n.nspname, c.relname), ', ') INTO offenders
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_roles o ON o.oid = c.relowner
  WHERE o.rolname = 'app_user'
    AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast');
  IF offenders IS NOT NULL THEN
    RAISE EXCEPTION 'RLS check: app_user owns relations: %', offenders;
  END IF;

  SELECT string_agg(g.rolname, ', ') INTO offenders
  FROM pg_auth_members m
  JOIN pg_roles u ON u.oid = m.member AND u.rolname = 'app_user'
  JOIN pg_roles g ON g.oid = m.roleid
  WHERE g.rolname IN ('pg_read_all_data', 'pg_write_all_data', 'pg_execute_server_program',
                      'pg_read_server_files', 'pg_write_server_files');
  IF offenders IS NOT NULL THEN
    RAISE EXCEPTION 'RLS check: app_user is member of: %', offenders;
  END IF;

  -- 4. Every table/partitioned table with a store_id column (partitions included, they are relkind r)
  --    and the `stores` table (policy by id) must have ENABLE + FORCE RLS and at least one policy.
  SELECT string_agg(format('%I.%I', n.nspname, c.relname), ', ' ORDER BY n.nspname, c.relname)
  INTO offenders
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r', 'p')
    AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    AND (
      EXISTS (SELECT 1 FROM pg_attribute a
              WHERE a.attrelid = c.oid AND a.attname = 'store_id'
                AND a.attnum > 0 AND NOT a.attisdropped)
      OR (n.nspname = 'public' AND c.relname = 'stores')
    )
    AND NOT (c.relrowsecurity AND c.relforcerowsecurity);
  IF offenders IS NOT NULL THEN
    RAISE EXCEPTION 'RLS check: tables without ENABLE+FORCE ROW LEVEL SECURITY: %', offenders;
  END IF;

  -- 5. Every non-partition tenant table (store_id column, or `stores`) needs a tenant policy that
  --    covers INSERT and UPDATE (see pg_temp.tenant_policy_ok above), not merely "some policy".
  SELECT string_agg(format('%I.%I', n.nspname, c.relname), ', ' ORDER BY n.nspname, c.relname)
  INTO offenders
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r', 'p')
    AND NOT c.relispartition
    AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    AND (
      EXISTS (SELECT 1 FROM pg_attribute a
              WHERE a.attrelid = c.oid AND a.attname = 'store_id'
                AND a.attnum > 0 AND NOT a.attisdropped)
      OR (n.nspname = 'public' AND c.relname = 'stores')
    )
    AND NOT pg_temp.tenant_policy_ok(c.oid);
  IF offenders IS NOT NULL THEN
    RAISE EXCEPTION 'RLS check: tables without a tenant policy for INSERT/UPDATE (permissive, app_user or PUBLIC, USING and WITH CHECK on current_setting(app.store_id)): %', offenders;
  END IF;

  -- 5b. No permissive policy for app_user/PUBLIC on a tenant table may ignore the tenant context:
  --     permissive policies are OR-ed, so one USING (true) next to a good policy opens the table.
  SELECT string_agg(format('%I.%I (policy %I)', n.nspname, c.relname, p.polname), ', ' ORDER BY n.nspname, c.relname)
  INTO offenders
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE p.polpermissive
    AND (0 = ANY (p.polroles)
         OR EXISTS (SELECT 1 FROM pg_roles ro WHERE ro.oid = ANY (p.polroles) AND ro.rolname = 'app_user'))
    AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    AND (
      EXISTS (SELECT 1 FROM pg_attribute a
              WHERE a.attrelid = c.oid AND a.attname = 'store_id'
                AND a.attnum > 0 AND NOT a.attisdropped)
      OR (n.nspname = 'public' AND c.relname = 'stores')
    )
    AND (
      (p.polqual IS NOT NULL
        AND pg_get_expr(p.polqual, p.polrelid) NOT LIKE '%current_setting(''app.store_id''%')
      OR (p.polwithcheck IS NOT NULL
        AND pg_get_expr(p.polwithcheck, p.polrelid) NOT LIKE '%current_setting(''app.store_id''%')
    );
  IF offenders IS NOT NULL THEN
    RAISE EXCEPTION 'RLS check: permissive policies for app_user/PUBLIC that ignore app.store_id: %', offenders;
  END IF;

  -- 6. Partitions. A parent's policy does NOT apply to a partition queried directly: Postgres
  --    evaluates the policies of the relation named in the query. A partition is safe only if
  --    app_user has no direct privilege on it (queries must go through the parent) or the
  --    partition has its own tenant policy.
  SELECT string_agg(format('%I.%I', n.nspname, c.relname), ', ' ORDER BY n.nspname, c.relname)
  INTO offenders
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r', 'p')
    AND c.relispartition
    AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    AND has_table_privilege('app_user', c.oid, 'SELECT, INSERT, UPDATE, DELETE')
    AND NOT pg_temp.tenant_policy_ok(c.oid);
  IF offenders IS NOT NULL THEN
    RAISE EXCEPTION 'RLS check: partitions with direct app_user privilege and no tenant policy of their own: %', offenders;
  END IF;

  -- 7. Materialized views cannot have RLS. Any matview readable by app_user that has a store_id
  --    column or is built on a table with one leaks every tenant's rows.
  SELECT string_agg(format('%I.%I', n.nspname, c.relname), ', ' ORDER BY n.nspname, c.relname)
  INTO offenders
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'm'
    AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    AND has_table_privilege('app_user', c.oid, 'SELECT')
    AND (
      EXISTS (SELECT 1 FROM pg_attribute a
              WHERE a.attrelid = c.oid AND a.attname = 'store_id'
                AND a.attnum > 0 AND NOT a.attisdropped)
      OR EXISTS (
        SELECT 1
        FROM pg_rewrite rw
        JOIN pg_depend d ON d.classid = 'pg_rewrite'::regclass AND d.objid = rw.oid
                        AND d.refclassid = 'pg_class'::regclass AND d.refobjid <> c.oid
        JOIN pg_attribute a2 ON a2.attrelid = d.refobjid AND a2.attname = 'store_id'
                            AND a2.attnum > 0 AND NOT a2.attisdropped
        WHERE rw.ev_class = c.oid
      )
    );
  IF offenders IS NOT NULL THEN
    RAISE EXCEPTION 'RLS check: materialized views readable by app_user that expose tenant data (matviews cannot have RLS): %', offenders;
  END IF;

  RAISE NOTICE 'RLS check ok';
END
$$;
