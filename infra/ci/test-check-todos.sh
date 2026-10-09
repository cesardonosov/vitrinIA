#!/usr/bin/env bash
# Self-test for check-todos.sh against a throwaway git repo.
set -euo pipefail
script="$(cd "$(dirname "$0")" && pwd)/check-todos.sh"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
cd "$work"
git init -q
mkdir -p src
run() { TODO_CHECK_OPEN_IDS="${1}" "$script" >/dev/null 2>&1; }

printf '// TODO(VIT-105) ok\n' >src/a.ts
run "105 106" || { echo "FAIL: valid TODO rejected"; exit 1; }
run "106" && { echo "FAIL: closed/missing issue accepted"; exit 1; }
printf '// TODO fix later\n' >src/a.ts
run "105" && { echo "FAIL: bare TODO accepted"; exit 1; }
printf '// FIXME(VIT-105)\n' >src/a.ts
run "105" && { echo "FAIL: FIXME accepted"; exit 1; }
printf '// HACK\n' >src/a.ts
run "105" && { echo "FAIL: HACK accepted"; exit 1; }
printf '// TODO(VIT-105) and TODO later\n' >src/a.ts
run "105" && { echo "FAIL: mixed line accepted"; exit 1; }
printf 'const todo = 1;\n' >src/a.ts
run "" || { echo "FAIL: lowercase word rejected"; exit 1; }
echo "check-todos self-test ok"
