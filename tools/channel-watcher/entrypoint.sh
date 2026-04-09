#!/bin/sh
# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09
# Entrypoint for Railway channel-watcher service.
# Seeds Discord session from DISCORD_SESSION_JSON env var if present,
# then runs the scraper (exits when done — Railway Cron triggers each run).

set -e

DATA_DIR="${DATA_DIR:-/data}"
SESSION_FILE="$DATA_DIR/.session.json"

echo "[entrypoint] DATA_DIR=$DATA_DIR"

# Seed Discord session from env var (base64 or raw JSON)
if [ -n "$DISCORD_SESSION_JSON" ]; then
  echo "[entrypoint] Writing Discord session from DISCORD_SESSION_JSON..."
  # Support both raw JSON and base64-encoded JSON
  first_char=$(echo "$DISCORD_SESSION_JSON" | cut -c1)
  if [ "$first_char" = "{" ]; then
    echo "$DISCORD_SESSION_JSON" > "$SESSION_FILE"
  else
    echo "$DISCORD_SESSION_JSON" | base64 -d > "$SESSION_FILE"
  fi
  echo "[entrypoint] Session file written to $SESSION_FILE"
elif [ ! -f "$SESSION_FILE" ]; then
  echo "[entrypoint] ERROR: No session file at $SESSION_FILE and DISCORD_SESSION_JSON is not set."
  echo "[entrypoint] Run 'npm run session:create' locally, then set DISCORD_SESSION_JSON in Railway."
  exit 1
else
  echo "[entrypoint] Using existing session file at $SESSION_FILE"
fi

echo "[entrypoint] Starting channel watcher..."
exec node /app/index.js "$@"
