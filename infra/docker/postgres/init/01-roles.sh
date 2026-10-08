#!/bin/sh
# Runs only on an EMPTY data volume (official postgres image behavior).
# Passwords come from the container environment; never hardcoded.
set -eu

: "${MIGRATOR_PASSWORD:?MIGRATOR_PASSWORD is required}"
: "${APP_USER_PASSWORD:?APP_USER_PASSWORD is required}"

psql -v ON_ERROR_STOP=1 \
  -v migrator_pw="$MIGRATOR_PASSWORD" \
  -v app_pw="$APP_USER_PASSWORD" \
  --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -f /docker-entrypoint-initdb.d/01-roles.sql
