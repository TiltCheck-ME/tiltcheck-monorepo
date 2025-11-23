#!/usr/bin/env bash
set -euo pipefail
# Bundle TiltCheck component HTML files for marketing use.
# Produces dist/components with both original and minified variants.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$ROOT_DIR/services/dashboard/public/components"
OUT_DIR="$ROOT_DIR/dist/components"

mkdir -p "$OUT_DIR"

echo "[bundle] Copying component HTML files..."
shopt -s nullglob
for src_file in "$SRC_DIR"/*.html; do
  name=$(basename "$src_file")
  base="${name%.html}"
  cp "$src_file" "$OUT_DIR/$name"
  # Minify: collapse consecutive whitespace + tighten tags
  sed -E 's/[[:space:]]+/ /g' "$src_file" | sed -E 's/> </></g' > "$OUT_DIR/${base}.min.html"
  echo "[bundle] Added: $name (+ minified)"
done

echo "[bundle] Done. Output directory: $OUT_DIR"

echo "Usage: open dist/components/index.html or deploy artifacts."