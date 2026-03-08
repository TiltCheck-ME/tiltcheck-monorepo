#!/usr/bin/env bash
# ================================================================
# Monthly trust data refresh runner for VM environments.
# - syncs latest repo changes
# - prepares workspace toolchain
# - rebuilds/validates trust engine startup
# - reseeds runtime trust data from latest scrape artifact
# ================================================================

set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/tiltcheck-monorepo}"
BRANCH="${BRANCH:-main}"
LOG_DIR="${LOG_DIR:-$REPO_DIR/logs/monthly-refresh}"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
RUN_LOG="$LOG_DIR/run-$TIMESTAMP.log"

mkdir -p "$LOG_DIR"

exec > >(tee -a "$RUN_LOG") 2>&1

echo "[$TIMESTAMP] Starting monthly trust refresh"
echo "Repo: $REPO_DIR | Branch: $BRANCH"

if [[ ! -d "$REPO_DIR/.git" ]]; then
  echo "ERROR: REPO_DIR is not a git repository: $REPO_DIR"
  exit 1
fi

cd "$REPO_DIR"

echo "==> Fetch latest changes"
git fetch --all --prune
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "==> Bootstrap cloud environment"
bash scripts/cloud-agent-env-setup.sh

echo "==> Regenerate runtime trust seed"
pnpm seed:casino-trust

echo "==> Build and boot-check trust engine"
pnpm trust:start

echo "==> Monthly trust refresh complete"
