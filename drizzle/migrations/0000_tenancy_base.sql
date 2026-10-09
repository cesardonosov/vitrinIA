CREATE TABLE "domains" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"host" text NOT NULL,
	"verified_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "domains_host_key" UNIQUE("host"),
	CONSTRAINT "domains_store_id_id_key" UNIQUE("store_id","id"),
	CONSTRAINT "domains_id_uuid_v7" CHECK (id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
	CONSTRAINT "domains_host_format" CHECK (char_length(host) <= 253 AND host ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$'),
	CONSTRAINT "domains_version_positive" CHECK ("domains"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "stores_slug_key" UNIQUE("slug"),
	CONSTRAINT "stores_id_uuid_v7" CHECK (id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
	CONSTRAINT "stores_slug_format" CHECK (slug ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'),
	CONSTRAINT "stores_name_length" CHECK (char_length("stores"."name") BETWEEN 1 AND 80),
	CONSTRAINT "stores_version_positive" CHECK ("stores"."version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

-- ===========================================================================
-- Hand-written section (reviewed line by line; Drizzle cannot express it).
-- Threat model docs/security/threat-models/tenancy.md: C1, C2, C8.
-- This migration runs as `migrator` (owner of every object it creates).
-- ===========================================================================

-- Fail with a clear message if the NOLOGIN role from the init script is missing.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'host_resolver') THEN
    RAISE EXCEPTION 'role host_resolver is missing: recreate the database volume with infra/docker/postgres/init';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
    RAISE EXCEPTION 'role app_user is missing: recreate the database volume with infra/docker/postgres/init';
  END IF;
END
$$;
--> statement-breakpoint

-- Nobody but the owner gets anything by default.
REVOKE ALL ON TABLE "stores", "domains" FROM PUBLIC;
--> statement-breakpoint

-- C2: ENABLE + FORCE RLS (FORCE makes the policies bind the owner as well).
ALTER TABLE "stores" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "stores" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "domains" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "domains" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

-- C2: fail-closed policies. NULLIF(..., '') turns the empty string that remains
-- after a transaction-local set_config into NULL, and `x = NULL` is never true,
-- so no context means zero rows. A non-UUID value makes the ::uuid cast raise
-- an error instead of returning rows. No `OR ... IS NULL` escape hatch exists.
CREATE POLICY "stores_tenant" ON "stores" AS PERMISSIVE FOR ALL TO "app_user"
  USING ("id" = NULLIF(current_setting('app.store_id', true), '')::uuid)
  WITH CHECK ("id" = NULLIF(current_setting('app.store_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "domains_tenant" ON "domains" AS PERMISSIVE FOR ALL TO "app_user"
  USING ("store_id" = NULLIF(current_setting('app.store_id', true), '')::uuid)
  WITH CHECK ("store_id" = NULLIF(current_setting('app.store_id', true), '')::uuid);
--> statement-breakpoint

-- C1: least privilege for app_user. No DELETE on stores (deleting a tenant is a
-- separate, audited flow); no DDL, no TRUNCATE, no REFERENCES.
GRANT SELECT, INSERT, UPDATE ON TABLE "stores" TO "app_user";
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "domains" TO "app_user";
--> statement-breakpoint

-- C8: host_resolver reads only three columns of verified rows, through its own policy.
GRANT USAGE ON SCHEMA "public" TO "host_resolver";
--> statement-breakpoint
GRANT SELECT ("host", "store_id", "verified_at") ON TABLE "domains" TO "host_resolver";
--> statement-breakpoint
CREATE POLICY "domains_host_resolver" ON "domains" AS PERMISSIVE FOR SELECT TO "host_resolver"
  USING ("verified_at" IS NOT NULL);
--> statement-breakpoint

-- C8: resolve_host(host) -> store_id | NULL. Runs with host_resolver's rights
-- (SECURITY DEFINER), fixed search_path, never returns more than the store id.
-- Unknown, unverified and malformed hosts all return NULL (indistinguishable).
CREATE FUNCTION "public"."resolve_host"(p_host text) RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
  v_host text;
  v_store uuid;
BEGIN
  IF p_host IS NULL OR char_length(p_host) > 260 THEN
    RETURN NULL;
  END IF;
  v_host := btrim(p_host);
  -- ASCII allow-list BEFORE lower(): some Unicode characters (e.g. the Kelvin
  -- sign) lowercase to ASCII letters and would alias another host.
  IF v_host !~ '^[A-Za-z0-9.:-]+$' THEN
    RETURN NULL;
  END IF;
  v_host := lower(v_host);
  v_host := regexp_replace(v_host, ':[0-9]{1,5}$', '');
  v_host := regexp_replace(v_host, '\.$', '');
  IF char_length(v_host) = 0
     OR char_length(v_host) > 253
     OR v_host !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$' THEN
    RETURN NULL;
  END IF;
  SELECT d.store_id INTO v_store
    FROM public.domains AS d
   WHERE d.host = v_host
     AND d.verified_at IS NOT NULL;
  RETURN v_store;
END
$fn$;
--> statement-breakpoint

-- ACL first (while migrator still owns the function), ownership last.
REVOKE ALL ON FUNCTION "public"."resolve_host"(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "public"."resolve_host"(text) TO "app_user";
--> statement-breakpoint

-- ALTER ... OWNER needs CREATE on the schema for the new owner: grant it only for this statement.
GRANT CREATE ON SCHEMA "public" TO "host_resolver";
--> statement-breakpoint
ALTER FUNCTION "public"."resolve_host"(text) OWNER TO "host_resolver";
--> statement-breakpoint
REVOKE CREATE ON SCHEMA "public" FROM "host_resolver";
