CREATE TABLE "store_configs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"schema_version" integer NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "store_configs_store_id_id_key" UNIQUE("store_id","id"),
	CONSTRAINT "store_configs_store_id_revision_key" UNIQUE("store_id","revision"),
	CONSTRAINT "store_configs_id_uuid_v7" CHECK (id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
	CONSTRAINT "store_configs_revision_positive" CHECK ("store_configs"."revision" >= 1),
	CONSTRAINT "store_configs_schema_version_nonneg" CHECK ("store_configs"."schema_version" >= 0),
	CONSTRAINT "store_configs_config_shape" CHECK (jsonb_typeof("store_configs"."config") = 'object' AND "store_configs"."config" -> 'schemaVersion' = to_jsonb("store_configs"."schema_version") AND octet_length("store_configs"."config"::text) <= 65536),
	CONSTRAINT "store_configs_version_positive" CHECK ("store_configs"."version" >= 1)
);

--> statement-breakpoint

-- ===========================================================================
-- Hand-written section (reviewed line by line; Drizzle cannot express it).
-- Threat model docs/security/threat-models/tenancy.md: C1, C2, C9. VIT-191.
-- Runs as `migrator`, owner of the table.
-- ===========================================================================

-- store_id -> stores(id). Written here because `stores` lives in the same module schema but is the tenant root.
ALTER TABLE "store_configs" ADD CONSTRAINT "store_configs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

REVOKE ALL ON TABLE "store_configs" FROM PUBLIC;
--> statement-breakpoint

-- C2: ENABLE + FORCE RLS.
ALTER TABLE "store_configs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "store_configs" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

-- C2: fail-closed policy, same predicate as 0000 (no context = zero rows).
CREATE POLICY "store_configs_tenant" ON "store_configs" AS PERMISSIVE FOR ALL TO "app_user"
  USING ("store_id" = NULLIF(current_setting('app.store_id', true), '')::uuid)
  WITH CHECK ("store_id" = NULLIF(current_setting('app.store_id', true), '')::uuid);
--> statement-breakpoint

-- C1: the seller publishes new revisions and edits them; nothing is deleted from the app
-- (revisions are history, Sprint 3 audit). No DDL, TRUNCATE, DELETE or REFERENCES.
GRANT SELECT, INSERT, UPDATE ON TABLE "store_configs" TO "app_user";
