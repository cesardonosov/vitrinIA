-- Rollback for 0003_store_configs. Run as migrator. DESTROYS every stored Store Config:
-- on a database with real data, restore a backup and write a corrective migration instead.
-- Afterwards remove the row from drizzle.__drizzle_migrations to be able to re-apply.
DROP TABLE IF EXISTS "store_configs";
DELETE FROM "drizzle"."__drizzle_migrations" WHERE "created_at" = (SELECT max("created_at") FROM "drizzle"."__drizzle_migrations");
