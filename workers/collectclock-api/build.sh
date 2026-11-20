#!/bin/sh
# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
# Bundle src/push.js + src/beta.js + src/index.js into one module (dist/index.js), so deploy keeps the single-file
# upload that is known to work with the code-only content endpoint.
set -e
cd "$(dirname "$0")"
mkdir -p dist
{
  for m in push beta; do echo "// ---- $m.js (bundled) ----"; sed -E 's/^export (async function|function|const) /\1 /' "src/$m.js"; echo; done
  echo "// ---- index.js ----"; grep -vE "^import \{[^}]*\} from '\./(push|beta)\.js';" src/index.js
} > dist/index.js
node --check dist/index.js
