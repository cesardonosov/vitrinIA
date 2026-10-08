#!/usr/bin/env bash
# Runs the RLS/roles catalog check, preceded by a self-test proving that it can fail.
# Usage: ADMIN_DATABASE_URL=postgres://postgres:...@host/db infra/ci/rls-check.sh
set -euo pipefail
: "${ADMIN_DATABASE_URL:?ADMIN_DATABASE_URL is required}"
here="$(cd "$(dirname "$0")" && pwd)"
psqlx() { psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 -q "$@"; }

expect_fail() { # name, setup sql, cleanup sql
  psqlx -c "$2"
  # The check must fail with its own "RLS check:" exception, not with an unrelated SQL error.
  if out="$(psqlx -f "$here/check-rls.sql" 2>&1)"; then
    psqlx -c "$3"
    echo "SELF-TEST FAILED: check passed with: $1"; exit 1
  fi
  psqlx -c "$3"
  if ! grep -q "RLS check:" <<<"$out"; then
    echo "SELF-TEST FAILED: check failed for the wrong reason with: $1"; echo "$out"; exit 1
  fi
  echo "self-test ok: check fails with $1"
}

expect_pass() { # name, setup sql, cleanup sql
  psqlx -c "$2"
  if ! psqlx -f "$here/check-rls.sql" >/dev/null 2>&1; then
    psqlx -c "$3"
    echo "SELF-TEST FAILED: check rejected a correct setup: $1"; exit 1
  fi
  psqlx -c "$3"
  echo "self-test ok: check passes with $1"
}

# Building blocks for the policy self-tests.
GOOD_EXPR="store_id = nullif(current_setting('app.store_id', true), '')::uuid"
T_RLS="create table public.selftest_t (store_id uuid not null); alter table public.selftest_t enable row level security; alter table public.selftest_t force row level security;"
DROP_T="drop table public.selftest_t cascade;"

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

expect_fail "forced RLS without any policy" "$T_RLS" "$DROP_T"
expect_fail "policy USING (true)" \
  "$T_RLS create policy p on public.selftest_t for all to app_user using (true) with check ($GOOD_EXPR);" "$DROP_T"
expect_fail "policy without WITH CHECK" \
  "$T_RLS create policy p on public.selftest_t for all to app_user using ($GOOD_EXPR);" "$DROP_T"
expect_fail "policy only for SELECT (writes not covered)" \
  "$T_RLS create policy p on public.selftest_t for select to app_user using ($GOOD_EXPR);" "$DROP_T"
expect_fail "policy that does not apply to app_user" \
  "$T_RLS create policy p on public.selftest_t for all to host_resolver using ($GOOD_EXPR) with check ($GOOD_EXPR);" "$DROP_T"
expect_fail "good policy plus a permissive USING (true) policy" \
  "$T_RLS create policy p on public.selftest_t for all to app_user using ($GOOD_EXPR) with check ($GOOD_EXPR); create policy leak on public.selftest_t for select to app_user using (true);" "$DROP_T"

PART_RLS="create table public.selftest_t (store_id uuid not null) partition by list (store_id); create table public.selftest_t_p1 partition of public.selftest_t default;
alter table public.selftest_t enable row level security; alter table public.selftest_t force row level security;
alter table public.selftest_t_p1 enable row level security; alter table public.selftest_t_p1 force row level security;
create policy p on public.selftest_t for all to app_user using ($GOOD_EXPR) with check ($GOOD_EXPR);"
expect_fail "partition with direct app_user privilege and no policy of its own" \
  "$PART_RLS grant select on public.selftest_t_p1 to app_user;" "$DROP_T"

echo "== self-tests (must pass) =="
expect_pass "FOR ALL tenant policy with USING and WITH CHECK" \
  "$T_RLS create policy p on public.selftest_t for all to app_user using ($GOOD_EXPR) with check ($GOOD_EXPR);" "$DROP_T"
expect_pass "split INSERT and UPDATE tenant policies" \
  "$T_RLS create policy pi on public.selftest_t for insert to app_user with check ($GOOD_EXPR); create policy pu on public.selftest_t for update to app_user using ($GOOD_EXPR) with check ($GOOD_EXPR);" "$DROP_T"
expect_pass "partition without direct app_user privilege (parent policy, access through the parent)" \
  "$PART_RLS" "$DROP_T"
expect_pass "partition with direct privilege and its own tenant policy" \
  "$PART_RLS grant select on public.selftest_t_p1 to app_user; create policy p on public.selftest_t_p1 for all to app_user using ($GOOD_EXPR) with check ($GOOD_EXPR);" "$DROP_T"

echo "== real check again (clean state) =="
psqlx -f "$here/check-rls.sql"
