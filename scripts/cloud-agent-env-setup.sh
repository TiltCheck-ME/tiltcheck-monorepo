#!/usr/bin/env bash
# ================================================================
# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
# Created by jmenichole (https://github.com/jmenichole)
#
# This file is part of the TiltCheck project.
# For licensing information, see LICENSE file in the project root.
# ================================================================
#
# Idempotent cloud-agent bootstrap:
# - ensures pnpm is available
# - installs workspace deps only when lockfile changed
# - verifies vitest + jsdom are available for `pnpm vitest --run`

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is required but not installed."
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    corepack enable
    corepack prepare pnpm@10.29.1 --activate
  else
    echo "❌ pnpm is missing and corepack is unavailable."
    exit 1
  fi
fi

LOCKFILE="$ROOT_DIR/pnpm-lock.yaml"
if [[ ! -f "$LOCKFILE" ]]; then
  echo "❌ pnpm-lock.yaml not found at repository root."
  exit 1
fi

SENTINEL_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/tiltcheck-cloud-agent"
SENTINEL_FILE="$SENTINEL_DIR/pnpm-lock.sha256"
mkdir -p "$SENTINEL_DIR"

LOCK_HASH="$(sha256sum "$LOCKFILE" | awk '{print $1}')"
PREV_HASH=""
if [[ -f "$SENTINEL_FILE" ]]; then
  PREV_HASH="$(tr -d '[:space:]' < "$SENTINEL_FILE")"
fi

if [[ -d "$ROOT_DIR/node_modules" && "$LOCK_HASH" == "$PREV_HASH" ]]; then
  echo "✅ Dependencies already synced for current lockfile hash."
else
  echo "📦 Installing workspace dependencies (lockfile changed or cache missing)..."
  pnpm install --frozen-lockfile
  printf "%s\n" "$LOCK_HASH" > "$SENTINEL_FILE"
fi

echo "🔎 Verifying vitest/jsdom toolchain..."
pnpm vitest --version >/dev/null
node -e "import('vitest'); import('jsdom');"

echo "✅ Cloud agent environment ready: pnpm + vitest/jsdom available."
