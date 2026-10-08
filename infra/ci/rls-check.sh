#!/usr/bin/env bash
# Runs the RLS/roles catalog check, preceded by a self-test proving that it can fail.
# Usage: ADMIN_DATABASE_URL=postgres://postgres:...@host/db infra/ci/rls-check.sh
set -euo pipefail
: "${ADMIN_DATABASE_URL:?ADMIN_DATABASE_URL is required}"
here="$(cd "$(dirname "$0")" && pwd)"
psqlx() { psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 -q "$@"; }

expect_fail() { # name, setup sql, cleanup sql
  psqlx -c "$2"
  if psqlx -f "$here/check-rls.sql" >/dev/null 2>&1; then
    psqlx -c "$3"
    echo "SELF-TEST FAILED: check passed with: $1"; exit 1
  fi
  psqlx -c "$3"
  echo "self-test ok: check fails with $1"
}

echo "== real check =="
psqlx -f "$here/check-rls.sql"

echo "== self-tests (must fail) =="
expect_fail "table with store_id and no RLS" \
  "create table public.selftest_t (store_id uuid not null);" "drop table public.selftest_t;"
expect_fail "table with store_id, RLS enabled but not forced" \
  "create table public.selftest_t (store_id uuid not null); alter table public.selftest_t enable row level security;" \
  "drop table public.selftest_t;"
expect_fail "app_user with BYPASSRLS" "alter role app_user bypassrls;" "alter role app_user nobypassrls;"
expect_fail "migrator with BYPASSRLS" "alter role migrator bypassrls;" "alter role migrator nobypassrls;"
expect_fail "host_resolver with LOGIN" "alter role host_resolver login;" "alter role host_resolver nologin;"
expect_fail "host_resolver with BYPASSRLS" "alter role host_resolver bypassrls;" "alter role host_resolver nobypassrls;"
expect_fail "app_user as superuser" "alter role app_user superuser;" "alter role app_user nosuperuser;"
expect_fail "app_user owning a table" \
  "create table public.selftest_o (id int); alter table public.selftest_o owner to app_user;" \
  "drop table public.selftest_o;"

echo "== real check again (clean state) =="
psqlx -f "$here/check-rls.sql"
