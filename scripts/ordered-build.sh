#!/usr/bin/env bash
# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "[ordered-build] pnpm is required but was not found in PATH." >&2
  exit 1
fi

echo "[ordered-build] Running safe sequential monorepo build from ${REPO_ROOT}..."
cd "${REPO_ROOT}"

pnpm run build:legacy

echo "[ordered-build] Sequential build completed successfully."
