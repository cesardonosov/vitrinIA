CREATE TABLE "order_contacts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"note" text,
	"region" text,
	"commune" text,
	"street" text,
	"address_extra" text,
	"rut" text,
	"business_name" text,
	"business_activity" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"anonymized_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "order_contacts_store_id_id_key" UNIQUE("store_id","id"),
	CONSTRAINT "order_contacts_store_order_key" UNIQUE("store_id","order_id"),
	CONSTRAINT "order_contacts_id_uuid_v7" CHECK (id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
	CONSTRAINT "order_contacts_name_length" CHECK (char_length("order_contacts"."name") BETWEEN 1 AND 80),
	CONSTRAINT "order_contacts_phone_length" CHECK (char_length("order_contacts"."phone") BETWEEN 1 AND 20),
	CONSTRAINT "order_contacts_email_length" CHECK (char_length("order_contacts"."email") BETWEEN 3 AND 254),
	CONSTRAINT "order_contacts_note_length" CHECK (char_length("order_contacts"."note") BETWEEN 1 AND 500),
	CONSTRAINT "order_contacts_region_length" CHECK (char_length("order_contacts"."region") BETWEEN 1 AND 80),
	CONSTRAINT "order_contacts_commune_length" CHECK (char_length("order_contacts"."commune") BETWEEN 1 AND 80),
	CONSTRAINT "order_contacts_street_length" CHECK (char_length("order_contacts"."street") BETWEEN 1 AND 120),
	CONSTRAINT "order_contacts_address_extra_length" CHECK (char_length("order_contacts"."address_extra") BETWEEN 1 AND 120),
	CONSTRAINT "order_contacts_rut_length" CHECK (char_length("order_contacts"."rut") BETWEEN 3 AND 12),
	CONSTRAINT "order_contacts_business_name_length" CHECK (char_length("order_contacts"."business_name") BETWEEN 1 AND 120),
	CONSTRAINT "order_contacts_business_activity_length" CHECK (char_length("order_contacts"."business_activity") BETWEEN 1 AND 80),
	CONSTRAINT "order_contacts_address_complete" CHECK (("order_contacts"."region" IS NULL AND "order_contacts"."commune" IS NULL AND "order_contacts"."street" IS NULL AND "order_contacts"."address_extra" IS NULL)
        OR ("order_contacts"."region" IS NOT NULL AND "order_contacts"."commune" IS NOT NULL AND "order_contacts"."street" IS NOT NULL)),
	CONSTRAINT "order_contacts_invoice_complete" CHECK (("order_contacts"."rut" IS NULL AND "order_contacts"."business_name" IS NULL AND "order_contacts"."business_activity" IS NULL)
        OR ("order_contacts"."rut" IS NOT NULL AND "order_contacts"."business_name" IS NOT NULL AND "order_contacts"."business_activity" IS NOT NULL)),
	CONSTRAINT "order_contacts_version_positive" CHECK ("order_contacts"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"variant_id" uuid,
	"position" integer NOT NULL,
	"product_name" text NOT NULL,
	"variant_label" text NOT NULL,
	"unit_price_clp" integer NOT NULL,
	"quantity" integer NOT NULL,
	"line_total_clp" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_store_id_id_key" UNIQUE("store_id","id"),
	CONSTRAINT "order_items_store_order_position_key" UNIQUE("store_id","order_id","position"),
	CONSTRAINT "order_items_id_uuid_v7" CHECK (id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
	CONSTRAINT "order_items_position_range" CHECK ("order_items"."position" BETWEEN 0 AND 49),
	CONSTRAINT "order_items_product_name_length" CHECK (char_length("order_items"."product_name") BETWEEN 1 AND 120),
	CONSTRAINT "order_items_variant_label_length" CHECK (char_length("order_items"."variant_label") BETWEEN 1 AND 40),
	CONSTRAINT "order_items_unit_price_range" CHECK ("order_items"."unit_price_clp" BETWEEN 0 AND 100000000),
	CONSTRAINT "order_items_quantity_range" CHECK ("order_items"."quantity" BETWEEN 1 AND 99),
	CONSTRAINT "order_items_line_total" CHECK ("order_items"."line_total_clp" = "order_items"."unit_price_clp"::bigint * "order_items"."quantity")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"code" text NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"request_hash" text NOT NULL,
	"status" text DEFAULT 'intent' NOT NULL,
	"channel" text DEFAULT 'whatsapp' NOT NULL,
	"delivery_type" text NOT NULL,
	"delivery_zone" text,
	"invoice" boolean DEFAULT false NOT NULL,
	"currency" text DEFAULT 'CLP' NOT NULL,
	"subtotal_clp" bigint NOT NULL,
	"shipping_clp" bigint NOT NULL,
	"total_clp" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "orders_store_id_id_key" UNIQUE("store_id","id"),
	CONSTRAINT "orders_store_id_idempotency_key_key" UNIQUE("store_id","idempotency_key"),
	CONSTRAINT "orders_store_id_code_key" UNIQUE("store_id","code"),
	CONSTRAINT "orders_id_uuid_v7" CHECK (id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
	CONSTRAINT "orders_code_format" CHECK ("orders"."code" ~ '^[A-Z2-9]{6,12}$'),
	CONSTRAINT "orders_request_hash_format" CHECK ("orders"."request_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "orders_status_valid" CHECK ("orders"."status" IN ('intent', 'confirmed', 'cancelled')),
	CONSTRAINT "orders_channel_valid" CHECK ("orders"."channel" IN ('whatsapp', 'payment_link')),
	CONSTRAINT "orders_delivery_type_valid" CHECK ("orders"."delivery_type" IN ('delivery', 'pickup')),
	CONSTRAINT "orders_delivery_zone_coherent" CHECK (("orders"."delivery_type" = 'delivery' AND "orders"."delivery_zone" IS NOT NULL AND char_length("orders"."delivery_zone") BETWEEN 1 AND 60)
        OR ("orders"."delivery_type" = 'pickup' AND "orders"."delivery_zone" IS NULL)),
	CONSTRAINT "orders_currency_clp" CHECK ("orders"."currency" = 'CLP'),
	CONSTRAINT "orders_amounts_range" CHECK ("orders"."subtotal_clp" BETWEEN 0 AND 1000000000000
        AND "orders"."shipping_clp" BETWEEN 0 AND 1000000000000
        AND "orders"."total_clp" BETWEEN 0 AND 1000000000000),
	CONSTRAINT "orders_total_is_subtotal_plus_shipping" CHECK ("orders"."total_clp" = "orders"."subtotal_clp" + "orders"."shipping_clp"),
	CONSTRAINT "orders_version_positive" CHECK ("orders"."version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "order_contacts" ADD CONSTRAINT "order_contacts_order_fk" FOREIGN KEY ("store_id","order_id") REFERENCES "public"."orders"("store_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_fk" FOREIGN KEY ("store_id","order_id") REFERENCES "public"."orders"("store_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_store_created_idx" ON "orders" USING btree ("store_id","created_at");
-- ===========================================================================
-- Hand-written section (reviewed line by line; Drizzle cannot express it).
-- Threat model docs/security/threat-models/orders.md: O8, O9, O10, O22.
-- Runs as `migrator`, owner of the three tables.
-- ===========================================================================

-- store_id -> stores(id). Written here because `stores` lives in another module's schema.
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "order_contacts" ADD CONSTRAINT "order_contacts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

-- O9: the variant is referenced as (store_id, variant_id), so an item can never point at another
-- store's variant. If the seller deletes the variant the item keeps its snapshot and loses the link
-- (PG 15+: only variant_id is set to NULL, store_id stays).
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_fk" FOREIGN KEY ("store_id", "variant_id") REFERENCES "public"."product_variants"("store_id", "id") ON DELETE SET NULL ("variant_id") ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "order_items_store_order_idx" ON "order_items" ("store_id", "order_id");
--> statement-breakpoint

REVOKE ALL ON TABLE "orders", "order_items", "order_contacts" FROM PUBLIC;
--> statement-breakpoint

-- O8 / C2: ENABLE + FORCE RLS.
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "orders" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "order_items" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "order_contacts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "order_contacts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

-- C2: fail-closed policies, same predicate as 0000 (no context = zero rows).
CREATE POLICY "orders_tenant" ON "orders" AS PERMISSIVE FOR ALL TO "app_user"
  USING ("store_id" = NULLIF(current_setting('app.store_id', true), '')::uuid)
  WITH CHECK ("store_id" = NULLIF(current_setting('app.store_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "order_items_tenant" ON "order_items" AS PERMISSIVE FOR ALL TO "app_user"
  USING ("store_id" = NULLIF(current_setting('app.store_id', true), '')::uuid)
  WITH CHECK ("store_id" = NULLIF(current_setting('app.store_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "order_contacts_tenant" ON "order_contacts" AS PERMISSIVE FOR ALL TO "app_user"
  USING ("store_id" = NULLIF(current_setting('app.store_id', true), '')::uuid)
  WITH CHECK ("store_id" = NULLIF(current_setting('app.store_id', true), '')::uuid);
--> statement-breakpoint

-- O10: the snapshot is immutable for app_user. No DELETE anywhere (R5: retention is a later issue).
--   orders: INSERT, SELECT, and UPDATE only on the state columns (never amounts, items or code).
--   order_items: INSERT and SELECT only.
--   order_contacts: UPDATE too, because the retention job anonymises it (VIT-188, O22).
GRANT SELECT, INSERT ON TABLE "orders" TO "app_user";
--> statement-breakpoint
GRANT UPDATE ("status", "version", "updated_at") ON TABLE "orders" TO "app_user";
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "order_items" TO "app_user";
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "order_contacts" TO "app_user";
