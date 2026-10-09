#!/usr/bin/env bash
# VIT-105: TODO/FIXME/HACK policy (docs/VITRINIA.md 11.2).
#   - FIXME and HACK are forbidden.
#   - TODO is only valid as TODO(VIT-123) and VIT-123 must be an OPEN issue (title starting with VIT-123).
# Env:
#   GH_TOKEN + GITHUB_REPOSITORY  -> validate against open issues (CI).
#   TODO_CHECK_OFFLINE=1          -> only validate the format (local runs, fixtures).
#   TODO_CHECK_OPEN_IDS="105 106" -> inject the list of open ids (tests).
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# Scan tracked + untracked-not-ignored files; docs and agent prompts describe the rule itself.
mapfile -t files < <(git ls-files -co --exclude-standard -- . \
  ':!docs' ':!.claude' ':!*.md' ':!pnpm-lock.yaml' ':!*.zip' ':!infra/ci/check-todos.sh' ':!infra/ci/test-check-todos.sh')

fail=0
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

if [ "${#files[@]}" -gt 0 ]; then
  grep -nIE '\b(TODO|FIXME|HACK)\b' -- "${files[@]}" >"$tmp" || true
fi

valid='TODO\(VIT-[0-9]+\)'
refs=()
while IFS= read -r line; do
  [ -z "$line" ] && continue
  # Strip every valid TODO(VIT-n) and see if any bare marker remains on the line.
  rest="$(printf '%s' "$line" | sed -E "s/$valid//g")"
  if printf '%s' "$rest" | grep -qE '\b(TODO|FIXME|HACK)\b'; then
    echo "::error::Invalid marker (use TODO(VIT-xxx), FIXME/HACK are forbidden): $line"
    fail=1
  fi
  while IFS= read -r id; do
    refs+=("$id")
  done < <(printf '%s' "$line" | grep -oE "$valid" | grep -oE '[0-9]+' || true)
done <"$tmp"

if [ "${#refs[@]}" -gt 0 ] && [ "${TODO_CHECK_OFFLINE:-0}" != "1" ]; then
  if [ -n "${TODO_CHECK_OPEN_IDS:-}" ]; then
    open_ids="${TODO_CHECK_OPEN_IDS}"
  else
    : "${GH_TOKEN:?GH_TOKEN is required (or set TODO_CHECK_OFFLINE=1)}"
    : "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
    # The issues endpoint also returns PRs; keep only issues whose title starts with VIT-n.
    open_ids="$(gh api --paginate "repos/${GITHUB_REPOSITORY}/issues?state=open&per_page=100" \
      --jq '.[] | select(.pull_request | not) | .title' \
      | grep -oE '^VIT-[0-9]+' | grep -oE '[0-9]+' | tr '\n' ' ')"
  fi
  for id in $(printf '%s\n' "${refs[@]}" | sort -u); do
    case " $open_ids " in
      *" $id "*) ;;
      *) echo "::error::TODO(VIT-$id) references an issue that does not exist or is not open"; fail=1 ;;
    esac
  done
fi

if [ "$fail" -ne 0 ]; then
  echo "todo-check failed. See docs/VITRINIA.md 11.2."
  exit 1
fi
echo "todo-check ok (${#refs[@]} valid TODO reference(s))."
