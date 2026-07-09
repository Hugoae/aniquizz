#!/usr/bin/env bash
# One-time: remove "Co-authored-by: Cursor" trailers from all commits so
# GitHub no longer lists cursoragent as a contributor.
#
# WARNING: rewrites git history. Requires force-push afterwards:
#   git push --force-with-lease origin main
#
# Run from repo root after committing other changes.

set -euo pipefail

if [[ "${1:-}" != "--confirm" ]]; then
  echo "This rewrites ALL commit messages on ALL refs."
  echo "Re-run with: bash scripts/git-strip-cursor-coauthor.sh --confirm"
  exit 1
fi

FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f \
  --msg-filter 'grep -v "^Co-authored-by: Cursor "' \
  -- --all

echo ""
echo "Done. Verify with: git log -1 --format=%B"
echo "Then: git push --force-with-lease origin main"
echo "Clean up backup refs: git for-each-ref --format='%(refname)' refs/original/ | xargs -r -n1 git update-ref -d"
