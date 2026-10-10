-- Rollback for 0002_orders_tables. Run as migrator. DESTROYS every order and buyer contact:
-- on a database with real data, restore a backup and write a corrective migration instead.
-- Afterwards remove the row from drizzle.__drizzle_migrations to be able to re-apply.
DROP TABLE IF EXISTS "order_contacts";
DROP TABLE IF EXISTS "order_items";
DROP TABLE IF EXISTS "orders";
DELETE FROM "drizzle"."__drizzle_migrations" WHERE "created_at" = (SELECT max("created_at") FROM "drizzle"."__drizzle_migrations");
