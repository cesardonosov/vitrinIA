-- ADR-0003: two application roles.
--   migrator: owns the schema and every table; used ONLY by the `migrate` service.
--   app_user: used by `app` and `worker`; never owns tables, never bypasses RLS.
-- The bootstrap superuser (POSTGRES_USER) is for administration only; no service uses it.

CREATE ROLE migrator LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE
  PASSWORD :'migrator_pw';
CREATE ROLE app_user LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE
  PASSWORD :'app_pw';

-- Only the two roles may connect.
REVOKE ALL ON DATABASE vitrinia FROM PUBLIC;
GRANT CONNECT ON DATABASE vitrinia TO migrator, app_user;
ALTER DATABASE vitrinia OWNER TO migrator;

-- Schema owned by migrator; nobody else can create objects in it.
ALTER SCHEMA public OWNER TO migrator;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO app_user;

-- No table grants here: migrations (VIT-107) give app_user the minimum per table.
