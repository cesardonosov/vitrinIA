import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Catalog schema (VIT-183, ADR-0003, threat model C2/C9).
 *
 * Every table carries `store_id` and is reached through `withStoreTx`. Row level
 * security, grants and policies are hand-written SQL in
 * drizzle/migrations/0001_catalog_tables.sql (Drizzle cannot express FORCE RLS).
 *
 * `store_id -> stores(id)` FKs are in the hand-written section of the migration:
 * `stores` belongs to the store-config module and modules do not import each
 * other's infrastructure.
 *
 * Children point to their parent with a composite FK `(store_id, parent_id)`
 * against the parent's UNIQUE `(store_id, id)`, so a row can never reference a
 * row of another store even if a policy were wrong (C9).
 *
 * Every text is plain text from the seller: the storefront escapes it and
 * never renders it as HTML. Length caps live here as CHECKs so a bad write fails
 * in the database too, not only in the use case.
 */

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  version: integer("version").notNull().default(1),
};

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    unique("categories_store_id_id_key").on(t.storeId, t.id),
    unique("categories_store_id_name_key").on(t.storeId, t.name),
    check(
      "categories_id_uuid_v7",
      sql`id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'`,
    ),
    check(
      "categories_name_length",
      sql`char_length(${t.name}) BETWEEN 1 AND 60`,
    ),
    check("categories_position_range", sql`${t.position} BETWEEN 0 AND 10000`),
    check("categories_version_positive", sql`${t.version} >= 1`),
  ],
);

/**
 * `nutrition` is a JSON array of `{label, value}` pairs (at most 12), already
 * worded for the buyer. `highlights` is a text array (at most 8).
 * The image is a same-origin path under /demo/ or /media/ until uploads (VIT-123).
 */
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    categoryId: uuid("category_id").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    featured: boolean("featured").notNull().default(false),
    /** Only published products reach the storefront. New products start hidden. */
    published: boolean("published").notNull().default(false),
    shortDescription: text("short_description").notNull(),
    badge: text("badge"),
    audience: text("audience"),
    highlights: text("highlights").array().notNull().default(sql`'{}'::text[]`),
    nutritionPer: text("nutrition_per"),
    nutrition: jsonb("nutrition").notNull().default(sql`'[]'::jsonb`),
    imageSrc: text("image_src"),
    imageAlt: text("image_alt"),
    imageWidth: integer("image_width"),
    imageHeight: integer("image_height"),
    imageProvisional: boolean("image_provisional").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    unique("products_store_id_id_key").on(t.storeId, t.id),
    unique("products_store_id_slug_key").on(t.storeId, t.slug),
    foreignKey({
      name: "products_category_fk",
      columns: [t.storeId, t.categoryId],
      foreignColumns: [categories.storeId, categories.id],
    }).onDelete("restrict"),
    check(
      "products_id_uuid_v7",
      sql`id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'`,
    ),
    check(
      "products_slug_format",
      sql`slug ~ '^[a-z0-9]([a-z0-9-]{0,78}[a-z0-9])?$'`,
    ),
    check(
      "products_name_length",
      sql`char_length(${t.name}) BETWEEN 1 AND 120`,
    ),
    check(
      "products_short_description_length",
      sql`char_length(${t.shortDescription}) BETWEEN 1 AND 300`,
    ),
    check(
      "products_badge_length",
      sql`char_length(${t.badge}) BETWEEN 1 AND 30`,
    ),
    check(
      "products_audience_length",
      sql`char_length(${t.audience}) BETWEEN 1 AND 200`,
    ),
    check(
      "products_nutrition_per_length",
      sql`char_length(${t.nutritionPer}) BETWEEN 1 AND 30`,
    ),
    check("products_highlights_size", sql`cardinality(${t.highlights}) <= 8`),
    check(
      "products_nutrition_shape",
      sql`jsonb_typeof(${t.nutrition}) = 'array' AND jsonb_array_length(${t.nutrition}) <= 12`,
    ),
    check("products_position_range", sql`${t.position} BETWEEN 0 AND 10000`),
    // Same-origin path only: no scheme, no host, no `..`, no query.
    check(
      "products_image_src_format",
      sql`image_src ~ '^/(demo|media)/[a-z0-9][a-z0-9/_.-]{0,199}$' AND image_src !~ '\\.\\.'`,
    ),
    check(
      "products_image_complete",
      sql`(image_src IS NULL AND image_alt IS NULL AND image_width IS NULL AND image_height IS NULL)
        OR (image_src IS NOT NULL AND image_alt IS NOT NULL AND image_width BETWEEN 1 AND 8000 AND image_height BETWEEN 1 AND 8000)`,
    ),
    check("products_image_alt_length", sql`char_length(${t.imageAlt}) <= 200`),
    check("products_version_positive", sql`${t.version} >= 1`),
  ],
);

/** What the buyer adds to the cart. Prices are final CLP with VAT, integer and positive. */
export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    productId: uuid("product_id").notNull(),
    label: text("label").notNull(),
    priceClp: integer("price_clp").notNull(),
    position: integer("position").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    unique("product_variants_store_id_id_key").on(t.storeId, t.id),
    unique("product_variants_product_label_key").on(
      t.storeId,
      t.productId,
      t.label,
    ),
    foreignKey({
      name: "product_variants_product_fk",
      columns: [t.storeId, t.productId],
      foreignColumns: [products.storeId, products.id],
    }).onDelete("cascade"),
    check(
      "product_variants_id_uuid_v7",
      sql`id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'`,
    ),
    check(
      "product_variants_label_length",
      sql`char_length(${t.label}) BETWEEN 1 AND 40`,
    ),
    // 100 million CLP cap keeps every order total far below 2^31 (threat model orders O2).
    check(
      "product_variants_price_range",
      sql`${t.priceClp} BETWEEN 1 AND 100000000`,
    ),
    check(
      "product_variants_position_range",
      sql`${t.position} BETWEEN 0 AND 1000`,
    ),
    check("product_variants_version_positive", sql`${t.version} >= 1`),
  ],
);

export type CategoryRow = typeof categories.$inferSelect;
export type NewCategoryRow = typeof categories.$inferInsert;
export type ProductRow = typeof products.$inferSelect;
export type NewProductRow = typeof products.$inferInsert;
export type ProductVariantRow = typeof productVariants.$inferSelect;
export type NewProductVariantRow = typeof productVariants.$inferInsert;
