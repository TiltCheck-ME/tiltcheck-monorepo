#!/bin/sh
# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
# Entrypoint for Railway channel-watcher service.
# Builds a minimal Playwright session file from DISCORD_TOKEN (preferred, ~70 chars)
# or falls back to DISCORD_SESSION_JSON (base64 or raw JSON).
# Runs the scraper once and exits — Railway Cron triggers each run.

set -e

DATA_DIR="${DATA_DIR:-/data}"
SESSION_FILE="$DATA_DIR/.session.json"

mkdir -p "$DATA_DIR"
echo "[entrypoint] DATA_DIR=$DATA_DIR"

if [ -n "$DISCORD_TOKEN" ]; then
  # Preferred: just the raw Discord user token (~70 chars). Build a minimal
  # Playwright storageState file from it — no base64 encoding needed.
  echo "[entrypoint] Building session from DISCORD_TOKEN..."
  cat > "$SESSION_FILE" <<EOF
{
  "cookies": [],
  "origins": [
    {
      "origin": "https://discord.com",
      "localStorage": [
        { "name": "token", "value": "\"${DISCORD_TOKEN}\"" }
      ]
    }
  ]
}
EOF
  echo "[entrypoint] Session file written to $SESSION_FILE"

elif [ -n "$DISCORD_SESSION_JSON" ]; then
  echo "[entrypoint] Writing Discord session from DISCORD_SESSION_JSON..."
  first_char=$(echo "$DISCORD_SESSION_JSON" | cut -c1)
  if [ "$first_char" = "{" ]; then
    echo "$DISCORD_SESSION_JSON" > "$SESSION_FILE"
  else
    echo "$DISCORD_SESSION_JSON" | base64 -d > "$SESSION_FILE"
  fi
  echo "[entrypoint] Session file written to $SESSION_FILE"

elif [ ! -f "$SESSION_FILE" ]; then
  echo "[entrypoint] ERROR: No session available."
  echo "[entrypoint] Set DISCORD_TOKEN in Railway env vars (your Discord user token)."
  echo "[entrypoint] To find it: Open Discord in browser -> DevTools -> Network -> any API request -> Authorization header."
  exit 1

else
  echo "[entrypoint] Using existing session file at $SESSION_FILE"
fi

echo "[entrypoint] Starting channel watcher..."
exec node /app/index.js "$@"
