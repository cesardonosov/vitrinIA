-- Rollback for 0001_catalog_tables. Run as migrator. DESTROYS every catalog:
-- on a database with real data, restore a backup and write a corrective migration instead.
-- Afterwards remove the row from drizzle.__drizzle_migrations to be able to re-apply.
DROP TABLE IF EXISTS "product_variants";
DROP TABLE IF EXISTS "products";
DROP TABLE IF EXISTS "categories";
DELETE FROM "drizzle"."__drizzle_migrations" WHERE "created_at" = (SELECT max("created_at") FROM "drizzle"."__drizzle_migrations");
