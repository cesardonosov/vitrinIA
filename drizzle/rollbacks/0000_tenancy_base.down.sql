-- Rollback for 0000_tenancy_base. Run as migrator. DESTROYS all stores and domains:
-- on a database with real data use the plan in the PR (restore backup + corrective migration).
-- Afterwards remove the row from drizzle.__drizzle_migrations to be able to re-apply.
DROP FUNCTION IF EXISTS "public"."resolve_host"(text);
DROP TABLE IF EXISTS "domains";
DROP TABLE IF EXISTS "stores";
REVOKE USAGE ON SCHEMA "public" FROM "host_resolver";
DELETE FROM "drizzle"."__drizzle_migrations" WHERE "created_at" = (SELECT max("created_at") FROM "drizzle"."__drizzle_migrations");
