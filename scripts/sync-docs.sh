#!/usr/bin/env bash
# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-17
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$ROOT_DIR/docs/tiltcheck"
DEST_DIR="$ROOT_DIR/out/docs-md"

mkdir -p "$DEST_DIR"
rsync -av --delete "$SRC_DIR/" "$DEST_DIR/"

echo "Docs synced to out/docs-md"
