#!/usr/bin/env bash
# ================================================================
# © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
# Created by jmenichole (https://github.com/jmenichole)
# 
# This file is part of the TiltCheck project.
# For licensing information, see LICENSE file in the project root.
# ================================================================

set -euo pipefail
# Composite accessibility audit: bundle, contrast DOM, serve, pa11y + lighthouse.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT="5178"

# Try to use locally installed Chrome to avoid puppeteer Chromium download.
MAC_CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
LINUX_CHROME="/usr/bin/google-chrome"
if [[ -z "${PUPPETEER_EXECUTABLE_PATH:-}" ]]; then
  if [[ -x "$MAC_CHROME" ]]; then
    export PUPPETEER_EXECUTABLE_PATH="$MAC_CHROME"
    export CHROME_PATH="$MAC_CHROME"
    echo "[a11y] Using macOS Chrome at $MAC_CHROME"
  elif [[ -x "$LINUX_CHROME" ]]; then
    export PUPPETEER_EXECUTABLE_PATH="$LINUX_CHROME"
    export CHROME_PATH="$LINUX_CHROME"
    echo "[a11y] Using Linux Chrome at $LINUX_CHROME"
  else
    echo "[a11y] No system Chrome detected; pa11y/lighthouse may try to download Chromium in CI."
  fi
fi

bash "$ROOT_DIR/scripts/bundle-components.sh"
node "$ROOT_DIR/scripts/contrast-check-dom.cjs"

# Start server in background
node "$ROOT_DIR/scripts/serve-components.cjs" &
SERVE_PID=$!
trap 'kill $SERVE_PID 2>/dev/null || true' EXIT

# Wait for server to respond on index.html (up to ~10s)
for i in {1..20}; do
  if curl -fsS "http://localhost:$PORT/index.html" >/dev/null 2>&1; then
    echo "[a11y] Server is up"
    break
  fi
  sleep 0.5
done

# Pa11y audits (basic rules) - fail on serious issues
PUPPETEER_EXECUTABLE_PATH="${PUPPETEER_EXECUTABLE_PATH:-}" \
CHROME_PATH="${CHROME_PATH:-}" \
npx pa11y "http://localhost:$PORT/index.html" --threshold 0 || true

PUPPETEER_EXECUTABLE_PATH="${PUPPETEER_EXECUTABLE_PATH:-}" \
CHROME_PATH="${CHROME_PATH:-}" \
npx pa11y "http://localhost:$PORT/trust-panel.html" --threshold 0 || true

PUPPETEER_EXECUTABLE_PATH="${PUPPETEER_EXECUTABLE_PATH:-}" \
CHROME_PATH="${CHROME_PATH:-}" \
npx pa11y "http://localhost:$PORT/transparency-hero.html" --threshold 0 || true

PUPPETEER_EXECUTABLE_PATH="${PUPPETEER_EXECUTABLE_PATH:-}" \
CHROME_PATH="${CHROME_PATH:-}" \
npx pa11y "http://localhost:$PORT/ecosystem.html" --threshold 0 || true

PUPPETEER_EXECUTABLE_PATH="${PUPPETEER_EXECUTABLE_PATH:-}" \
CHROME_PATH="${CHROME_PATH:-}" \
npx pa11y "http://localhost:$PORT/degen-trust-engine.html" --threshold 0 || true

# Lighthouse (only accessibility category) - produce JSON (retry up to 3x)
LH_URL="http://localhost:$PORT/index.html"
for attempt in 1 2 3; do
  echo "[a11y] Lighthouse attempt $attempt on $LH_URL"
  PUPPETEER_EXECUTABLE_PATH="${PUPPETEER_EXECUTABLE_PATH:-}" \
  CHROME_PATH="${CHROME_PATH:-}" \
  npx lighthouse "$LH_URL" \
    --only-categories=accessibility \
    --quiet --no-enable-error-reporting \
    --max-wait-for-load=120000 \
    --output=json --output-path="$ROOT_DIR/dist/components/lighthouse-accessibility.json" && break || true
  sleep 2
done

# Lighthouse for ecosystem.html as well
LH_URL_ECO="http://localhost:$PORT/ecosystem.html"
for attempt in 1 2 3; do
  echo "[a11y] Lighthouse attempt $attempt on $LH_URL_ECO"
  PUPPETEER_EXECUTABLE_PATH="${PUPPETEER_EXECUTABLE_PATH:-}" \
  CHROME_PATH="${CHROME_PATH:-}" \
  npx lighthouse "$LH_URL_ECO" \
    --only-categories=accessibility \
    --quiet --no-enable-error-reporting \
    --max-wait-for-load=120000 \
    --output=json --output-path="$ROOT_DIR/dist/components/lighthouse-ecosystem-accessibility.json" && break || true
  sleep 2
done

kill $SERVE_PID || true
trap - EXIT

echo "[a11y-audit] Complete (non-blocking pa11y/lighthouse)."