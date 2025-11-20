#!/usr/bin/env bash
set -euo pipefail
# Accessibility audit for landing site: serve, pa11y + lighthouse (a11y-only)

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT="5190"

# Try to use system Chrome
MAC_CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
LINUX_CHROME="/usr/bin/google-chrome"
if [[ -z "${PUPPETEER_EXECUTABLE_PATH:-}" ]]; then
  if [[ -x "$MAC_CHROME" ]]; then
    export PUPPETEER_EXECUTABLE_PATH="$MAC_CHROME"
    export CHROME_PATH="$MAC_CHROME"
    echo "[landing-a11y] Using macOS Chrome at $MAC_CHROME"
  elif [[ -x "$LINUX_CHROME" ]]; then
    export PUPPETEER_EXECUTABLE_PATH="$LINUX_CHROME"
    export CHROME_PATH="$LINUX_CHROME"
    echo "[landing-a11y] Using Linux Chrome at $LINUX_CHROME"
  else
    echo "[landing-a11y] No system Chrome detected; pa11y/lighthouse may download Chromium in CI."
  fi
fi

# Start server in background
node "$ROOT_DIR/scripts/serve-landing.js" &
SERVE_PID=$!
trap 'kill $SERVE_PID 2>/dev/null || true' EXIT

# Wait for server to respond
for i in {1..20}; do
  if curl -fsS "http://localhost:$PORT/index.html" >/dev/null 2>&1; then
    echo "[landing-a11y] Server is up"
    break
  fi
  sleep 0.5
done

# Pa11y basic audit
PUPPETEER_EXECUTABLE_PATH="${PUPPETEER_EXECUTABLE_PATH:-}" \
CHROME_PATH="${CHROME_PATH:-}" \
npx pa11y "http://localhost:$PORT/index.html" --threshold 0 || true

PUPPETEER_EXECUTABLE_PATH="${PUPPETEER_EXECUTABLE_PATH:-}" \
CHROME_PATH="${CHROME_PATH:-}" \
npx pa11y "http://localhost:$PORT/about.html" --threshold 0 || true

# Lighthouse (a11y only)
LH_URL="http://localhost:$PORT/index.html"
for attempt in 1 2 3; do
  echo "[landing-a11y] Lighthouse attempt $attempt on $LH_URL"
  PUPPETEER_EXECUTABLE_PATH="${PUPPETEER_EXECUTABLE_PATH:-}" \
  CHROME_PATH="${CHROME_PATH:-}" \
  npx lighthouse "$LH_URL" \
    --only-categories=accessibility \
    --quiet --no-enable-error-reporting \
    --max-wait-for-load=120000 \
    --output=json --output-path="$ROOT_DIR/dist/landing-lighthouse-accessibility.json" && break || true
  sleep 2
done

kill $SERVE_PID || true
trap - EXIT

echo "[landing-a11y] Complete (non-blocking pa11y/lighthouse)."
