#!/usr/bin/env bash
# Blocks source files that are over the size limit (CLAUDE.md: "File size").
#
# A file over LIMIT fails the check when it is new to the limit (was at or
# under LIMIT before) or when this change makes it longer. Existing oversized
# files can still be edited as long as they do not grow.
#
# Usage: check-file-size.sh <base> <target>
#   pre-commit: base=HEAD  target=""   (target "" means the staged index)
#   pre-push:   base=<remote sha>  target=<local sha>
set -euo pipefail

LIMIT=400
ZERO_SHA='^0+$'
base="$1"
target="$2"

is_checked() {
  case "$1" in
    src/lang/*|public/lang/*|public/vender/*|build/*|public/css/app.css|*.min.*) return 1 ;;
  esac
  case "$1" in
    *.js|*.ts|*.scss|*.css|*.html) return 0 ;;
  esac
  return 1
}

# Line count of a file at a revision ("" = index). Missing file counts as 0.
lines_at() {
  local rev="$1" path="$2"
  # A path missing at this revision makes git show fail; under pipefail that
  # would abort the script, so the pipeline is allowed to fail and we count 0.
  # tr strips the padding that BSD wc (macOS) adds before the number.
  if [ -z "$rev" ]; then
    git show ":$path" 2>/dev/null | wc -l | tr -d ' ' || true
  else
    git show "$rev:$path" 2>/dev/null | wc -l | tr -d ' ' || true
  fi
}

# Base for a new branch (remote sha is all zeros): merge-base with main.
if [[ "$base" =~ $ZERO_SHA ]]; then
  base="$(git merge-base "$target" main 2>/dev/null || git merge-base "$target" origin/main 2>/dev/null || true)"
  if [ -z "$base" ]; then
    echo "file-size: no base branch found, skipping" >&2
    exit 0
  fi
fi

if [ -z "$target" ]; then
  files="$(git diff --cached --name-only --diff-filter=ACMR)"
else
  files="$(git diff --name-only --diff-filter=ACMR "$base" "$target")"
fi

failed=0
while IFS= read -r file; do
  [ -z "$file" ] && continue
  is_checked "$file" || continue

  new=$(lines_at "$target" "$file")
  [ "$new" -le "$LIMIT" ] && continue

  old=$(lines_at "$base" "$file")
  if [ "$old" -le "$LIMIT" ] || [ "$new" -gt "$old" ]; then
    if [ "$failed" -eq 0 ]; then
      echo "File size check failed (limit $LIMIT lines):" >&2
    fi
    echo "  $file: $new lines (was $old)" >&2
    failed=1
  fi
done <<< "$files"

if [ "$failed" -eq 1 ]; then
  echo "Split the code into a new module, then commit again. See CLAUDE.md, 'File size'." >&2
  exit 1
fi
