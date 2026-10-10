-- Local demo seed (VIT-182): the Kanuwiñ store and its local host.
-- Runs as app_user (no BYPASSRLS) inside one transaction with the tenant set
-- the same way withStoreTx does. Idempotent: re-running changes nothing.
-- Local only: `pnpm db:seed:demo` runs it inside the docker compose Postgres.
-- The store id matches KANUWIN_DEMO_STORE_ID (src/modules/catalog/infrastructure/seed/kanuwin.ts).
\set ON_ERROR_STOP on

BEGIN;

SELECT set_config('app.store_id', '0199d0a0-0000-7000-8000-00000000c0de', true) AS tenant \gset

INSERT INTO stores (id, slug, name)
VALUES ('0199d0a0-0000-7000-8000-00000000c0de', 'kanuwin', 'Kanuwiñ')
ON CONFLICT (id) DO NOTHING;

-- Verified on insert, like every *.vitrinia.cl subdomain (ADR-0003 §1).
-- kanuwin.localhost works in Chrome, Edge and Firefox without editing hosts.
INSERT INTO domains (id, store_id, host, verified_at)
VALUES ('0199d0a0-0000-7000-8000-0000000d0001', '0199d0a0-0000-7000-8000-00000000c0de', 'kanuwin.localhost', now())
ON CONFLICT (host) DO NOTHING;

COMMIT;

SELECT 'kanuwin.localhost -> ' || coalesce(resolve_host('kanuwin.localhost')::text, 'NOT RESOLVED') AS seed_result;
