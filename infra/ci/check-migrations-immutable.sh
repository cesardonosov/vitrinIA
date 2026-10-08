#!/usr/bin/env bash
# Threat model A18/C15: an applied migration is never edited. Fails if the PR modifies, renames
# or deletes an existing .sql file under drizzle/migrations (adding new ones is fine).
# Usage: infra/ci/check-migrations-immutable.sh <base-ref>   (default origin/main)
set -euo pipefail
base="${1:-origin/main}"
changed="$(git diff --name-only --diff-filter=MDR "$base"...HEAD -- 'drizzle/migrations/*.sql' || true)"
if [ -n "$changed" ]; then
  echo "::error::Applied migrations must not be edited, renamed or deleted; create a new migration:"
  echo "$changed"
  exit 1
fi
echo "migrations-immutable ok."
