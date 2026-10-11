-- Rollback for 0003_store_configs. Run as migrator. DESTROYS every stored Store Config:
-- on a database with real data, restore a backup and write a corrective migration instead.
-- Removes its own row from drizzle.__drizzle_migrations by hash (sha256 of the .sql file) so it can be re-applied.
DROP TABLE IF EXISTS "store_configs";
DELETE FROM "drizzle"."__drizzle_migrations" WHERE "hash" = 'cb63c44bf76fc9319fddb8532c8422ab24e0b7965a2233b98d6273b1ede4e50a';
