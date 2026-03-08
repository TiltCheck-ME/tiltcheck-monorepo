#!/usr/bin/env bash
set -euo pipefail

echo "[deploy-check] Running deploy script syntax checks..."

SCRIPTS=(
  "deploy-vps.sh"
  "scripts/deploy-gcloud.sh"
  "scripts/gcp/deploy-cloud-run-service.sh"
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
