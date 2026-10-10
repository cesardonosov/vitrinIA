-- Rollback for 0001_catalog_tables. Run as migrator. DESTROYS every catalog:
-- on a database with real data, restore a backup and write a corrective migration instead.
-- The migration row is deleted by the sha256 of the migration file (what drizzle stores in "hash"),
-- not by max(created_at), so a later migration is never unregistered by mistake.
-- If 0001_catalog_tables.sql ever changes, recompute: sha256sum drizzle/migrations/0001_catalog_tables.sql
DROP TABLE IF EXISTS "product_variants";
DROP TABLE IF EXISTS "products";
DROP TABLE IF EXISTS "categories";
DELETE FROM "drizzle"."__drizzle_migrations" WHERE "hash" = '7b2978e9b63b2e068736e4be1f385c6b36da43b956672231670316caf410dce3';
