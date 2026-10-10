CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "categories_store_id_id_key" UNIQUE("store_id","id"),
	CONSTRAINT "categories_store_id_name_key" UNIQUE("store_id","name"),
	CONSTRAINT "categories_id_uuid_v7" CHECK (id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
	CONSTRAINT "categories_name_length" CHECK (char_length("categories"."name") BETWEEN 1 AND 60),
	CONSTRAINT "categories_position_range" CHECK ("categories"."position" BETWEEN 0 AND 10000),
	CONSTRAINT "categories_version_positive" CHECK ("categories"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"label" text NOT NULL,
	"price_clp" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "product_variants_store_id_id_key" UNIQUE("store_id","id"),
	CONSTRAINT "product_variants_product_label_key" UNIQUE("store_id","product_id","label"),
	CONSTRAINT "product_variants_id_uuid_v7" CHECK (id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
	CONSTRAINT "product_variants_label_length" CHECK (char_length("product_variants"."label") BETWEEN 1 AND 40),
	CONSTRAINT "product_variants_price_range" CHECK ("product_variants"."price_clp" BETWEEN 1 AND 100000000),
	CONSTRAINT "product_variants_position_range" CHECK ("product_variants"."position" BETWEEN 0 AND 1000),
	CONSTRAINT "product_variants_version_positive" CHECK ("product_variants"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"short_description" text NOT NULL,
	"badge" text,
	"audience" text,
	"highlights" text[] DEFAULT '{}'::text[] NOT NULL,
	"nutrition_per" text,
	"nutrition" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"image_src" text,
	"image_alt" text,
	"image_width" integer,
	"image_height" integer,
	"image_provisional" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "products_store_id_id_key" UNIQUE("store_id","id"),
	CONSTRAINT "products_store_id_slug_key" UNIQUE("store_id","slug"),
	CONSTRAINT "products_id_uuid_v7" CHECK (id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
	CONSTRAINT "products_slug_format" CHECK (slug ~ '^[a-z0-9]([a-z0-9-]{0,78}[a-z0-9])?$'),
	CONSTRAINT "products_name_length" CHECK (char_length("products"."name") BETWEEN 1 AND 120),
	CONSTRAINT "products_short_description_length" CHECK (char_length("products"."short_description") BETWEEN 1 AND 300),
	CONSTRAINT "products_badge_length" CHECK (char_length("products"."badge") BETWEEN 1 AND 30),
	CONSTRAINT "products_audience_length" CHECK (char_length("products"."audience") BETWEEN 1 AND 200),
	CONSTRAINT "products_nutrition_per_length" CHECK (char_length("products"."nutrition_per") BETWEEN 1 AND 30),
	CONSTRAINT "products_highlights_size" CHECK (cardinality("products"."highlights") <= 8),
	CONSTRAINT "products_nutrition_shape" CHECK (jsonb_typeof("products"."nutrition") = 'array' AND jsonb_array_length("products"."nutrition") <= 12),
	CONSTRAINT "products_position_range" CHECK ("products"."position" BETWEEN 0 AND 10000),
	CONSTRAINT "products_image_src_format" CHECK (image_src ~ '^/(demo|media)/[a-z0-9][a-z0-9/_.-]{0,199}$' AND image_src !~ '\.\.'),
	CONSTRAINT "products_image_complete" CHECK ((image_src IS NULL AND image_alt IS NULL AND image_width IS NULL AND image_height IS NULL)
        OR (image_src IS NOT NULL AND image_alt IS NOT NULL AND image_width BETWEEN 1 AND 8000 AND image_height BETWEEN 1 AND 8000)),
	CONSTRAINT "products_image_alt_length" CHECK (char_length("products"."image_alt") <= 200),
	CONSTRAINT "products_version_positive" CHECK ("products"."version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_fk" FOREIGN KEY ("store_id","product_id") REFERENCES "public"."products"("store_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_fk" FOREIGN KEY ("store_id","category_id") REFERENCES "public"."categories"("store_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

-- ===========================================================================
-- Hand-written section (reviewed line by line; Drizzle cannot express it).
-- Threat model docs/security/threat-models/tenancy.md: C1, C2, C9.
-- Runs as `migrator`, owner of the three tables.
-- ===========================================================================

-- store_id -> stores(id). Written here because `stores` lives in another module's schema.
ALTER TABLE "categories" ADD CONSTRAINT "categories_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

-- Index for the product -> variants lookup (the unique keys start with store_id).
CREATE INDEX "product_variants_store_product_idx" ON "product_variants" ("store_id", "product_id", "position");
--> statement-breakpoint
CREATE INDEX "products_store_category_idx" ON "products" ("store_id", "category_id");
--> statement-breakpoint

REVOKE ALL ON TABLE "categories", "products", "product_variants" FROM PUBLIC;
--> statement-breakpoint

-- C2: ENABLE + FORCE RLS.
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "categories" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "products" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "product_variants" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "product_variants" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

-- C2: fail-closed policies, same predicate as 0000 (no context = zero rows).
CREATE POLICY "categories_tenant" ON "categories" AS PERMISSIVE FOR ALL TO "app_user"
  USING ("store_id" = NULLIF(current_setting('app.store_id', true), '')::uuid)
  WITH CHECK ("store_id" = NULLIF(current_setting('app.store_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "products_tenant" ON "products" AS PERMISSIVE FOR ALL TO "app_user"
  USING ("store_id" = NULLIF(current_setting('app.store_id', true), '')::uuid)
  WITH CHECK ("store_id" = NULLIF(current_setting('app.store_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "product_variants_tenant" ON "product_variants" AS PERMISSIVE FOR ALL TO "app_user"
  USING ("store_id" = NULLIF(current_setting('app.store_id', true), '')::uuid)
  WITH CHECK ("store_id" = NULLIF(current_setting('app.store_id', true), '')::uuid);
--> statement-breakpoint

-- C1: the seller manages their own catalog (create, edit, remove). No DDL, TRUNCATE or REFERENCES.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "categories", "products", "product_variants" TO "app_user";
