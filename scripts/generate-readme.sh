#!/bin/bash
# TiltCheck Monorepo - README Generator
# Usage: ./scripts/generate-readme.sh <module-path>

MODULE_PATH="$1"
README_PATH="$MODULE_PATH/README.md"
MODULE_NAME=$(basename "$MODULE_PATH")

if [ -z "$MODULE_PATH" ] || [ ! -d "$MODULE_PATH" ]; then
  echo "Usage: $0 <module-path>"
  exit 1
fi

# Detect main class or export
MAIN_CLASS=$(grep -E 'export class |export const ' "$MODULE_PATH/src/index.ts" | head -n1)

cat <<EOF > "$README_PATH"
# $MODULE_NAME Module

_Auto-generated README. Edit as needed._

## API

$MAIN_CLASS

## Usage
```ts
import { $MODULE_NAME } from './src/index';
// See module docs for details
```

## Migration Notes
- Placeholder logic; expand as code migrates.
- Event-driven, non-custodial, modular.

## Test Coverage
- Minimal smoke test included.

---
TiltCheck Ecosystem © 2024–2025.
EOF

echo "README.md generated for $MODULE_NAME at $README_PATH"
