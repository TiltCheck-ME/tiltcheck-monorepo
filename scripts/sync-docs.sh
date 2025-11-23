#!/usr/bin/env bash
set -euo pipefail

# Sync markdown docs into landing public docs-md folder for Pages deploy preview.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$ROOT_DIR/docs/tiltcheck"
DEST_DIR="$ROOT_DIR/services/landing/public/docs-md"

mkdir -p "$DEST_DIR"
rsync -av --delete "$SRC_DIR/" "$DEST_DIR/"

echo "Docs synced to services/landing/public/docs-md"
