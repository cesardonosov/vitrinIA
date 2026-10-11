-- Rollback for 0002_orders_tables. Run as migrator. DESTROYS every order and buyer contact:
-- on a database with real data, restore a backup and write a corrective migration instead.
-- The migration row is deleted by the sha256 of the migration file (what drizzle stores in "hash"),
-- not by max(created_at), so a later migration is never unregistered by mistake.
-- If 0002_orders_tables.sql ever changes, recompute: sha256sum drizzle/migrations/0002_orders_tables.sql
DROP TABLE IF EXISTS "order_contacts";
DROP TABLE IF EXISTS "order_items";
DROP TABLE IF EXISTS "orders";
DELETE FROM "drizzle"."__drizzle_migrations" WHERE "hash" = 'a065308bb313aaa495a92e23b90b1dea848357b19b8f9f7795d606545e095e22';
