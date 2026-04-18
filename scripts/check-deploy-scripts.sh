#!/usr/bin/env bash
# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17

set -euo pipefail

echo "[deploy-check] Running deploy script syntax checks..."

SCRIPTS=(
  "deploy-vps.sh"
  "scripts/deploy-gcloud-rollback.sh"
  "scripts/check-health.sh"
  "scripts/ordered-build.sh"
  "scripts/validate-production-env.sh"
)

for script in "${SCRIPTS[@]}"; do
  if [[ ! -f "$script" ]]; then
    echo "[deploy-check] Missing required script: $script" >&2
    exit 1
  fi

  bash -n "$script"
  echo "[deploy-check] OK: $script"
done

echo "[deploy-check] All deploy scripts passed syntax checks."
