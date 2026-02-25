#!/usr/bin/env bash
# ================================================================
# © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
# Created by jmenichole (https://github.com/jmenichole)
# 
# This file is part of the TiltCheck project.
# For licensing information, see LICENSE file in the project root.
# ================================================================

set -euo pipefail

# TiltCheck Repo Migration Helper
# Usage: ./scripts/migrate-repo.sh <source_repo_path> <target_module_name>
# Example: ./scripts/migrate-repo.sh ../legacy-suslink suslink

SRC=${1:-}
MODULE=${2:-}

if [[ -z "$SRC" || -z "$MODULE" ]]; then
  echo "Usage: $0 <source_repo_path> <target_module_name>" >&2
  exit 1
fi

TARGET="modules/$MODULE"

if [[ ! -d "$SRC" ]]; then
  echo "Source repo path '$SRC' not found" >&2
  exit 1
fi

if [[ -d "$TARGET" ]]; then
  echo "Target module directory '$TARGET' already exists (will merge)" >&2
else
  mkdir -p "$TARGET/src"
fi

echo "[Migration] Copying source files..."
# Copy common source directories (customize per repo)
for dir in src lib; do
  if [[ -d "$SRC/$dir" ]]; then
    rsync -av --exclude 'dist' --exclude 'node_modules' "$SRC/$dir/" "$TARGET/src/"
  fi
done

# Move types into shared package suggestion list
if grep -R "interface" "$SRC" >/dev/null 2>&1; then
  echo "[Migration] Scan for candidate shared types (manual review needed):"
  grep -R "export interface" "$SRC" | head -20 || true
fi

# Create basic package.json if missing
PKG="$TARGET/package.json"
if [[ ! -f "$PKG" ]]; then
cat > "$PKG" <<EOF
{
  "name": "@tiltcheck/$MODULE",
  "version": "0.1.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@tiltcheck/types": "workspace:*",
    "@tiltcheck/event-router": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
EOF
fi

# Add tsconfig if missing
if [[ ! -f "$TARGET/tsconfig.json" ]]; then
cat > "$TARGET/tsconfig.json" <<EOF
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
EOF
fi

echo "[Migration] Inject module bootstrap (index.ts placeholder)"
BOOT="$TARGET/src/index.ts"
if [[ ! -f "$BOOT" ]]; then
cat > "$BOOT" <<EOF
import { eventRouter } from '@tiltcheck/event-router';
import type { TiltCheckEvent } from '@tiltcheck/types';

export class ${MODULE^}Module {
  constructor() {
    // Subscribe example (replace with actual events)
    eventRouter.subscribe('promo.submitted', this.onEvent.bind(this), '$MODULE');
  }
  private async onEvent(event: TiltCheckEvent) {
    console.log('[${MODULE^}] Event received', event.type);
  }
}
export const ${MODULE} = new ${MODULE^}Module();
EOF
fi

echo "[Migration] Done. Next steps:"
echo "  1. Review copied code in $TARGET/src"
echo "  2. Replace any legacy event bus usage with eventRouter.publish/subscribe"
echo "  3. Move shared types to packages/types"
echo "  4. Add README documenting events consumed/emitted"
echo "  5. Add tests under $TARGET/tests (after Vitest setup)"
