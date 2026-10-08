#!/bin/sh
# Runs only on an EMPTY data volume (official postgres image behavior).
# Passwords come from the container environment; never hardcoded.
set -eu

: "${MIGRATOR_PASSWORD:?MIGRATOR_PASSWORD is required}"
: "${APP_USER_PASSWORD:?APP_USER_PASSWORD is required}"

# roles.psql reads both passwords with \getenv (psql >= 15): nothing secret goes on the command line.
export MIGRATOR_PASSWORD APP_USER_PASSWORD
psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -f /docker-entrypoint-initdb.d/roles.psql
