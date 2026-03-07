#!/usr/bin/env bash
set -euo pipefail

# Keeps local branch synced with remote using rebase.
# Usage:
#   bash scripts/sync-branch.sh
#   bash scripts/sync-branch.sh <branch>
#   REMOTE=origin bash scripts/sync-branch.sh <branch>

REMOTE="${REMOTE:-origin}"
BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"

if [[ "$BRANCH" == "HEAD" ]]; then
  echo "Detached HEAD detected. Pass an explicit branch name." >&2
  exit 1
fi

echo "Fetching latest from $REMOTE..."
git fetch "$REMOTE"

echo "Checking out $BRANCH..."
git checkout "$BRANCH"

echo "Rebasing $BRANCH onto $REMOTE/$BRANCH..."
git pull --rebase "$REMOTE" "$BRANCH"

echo
echo "Sync complete."
echo "Ahead/behind (left=local ahead, right=remote ahead):"
git rev-list --left-right --count HEAD..."$REMOTE/$BRANCH"
echo
echo "Recent commits:"
git log --oneline --decorate -n 5
