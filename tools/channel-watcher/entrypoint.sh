#!/bin/sh
# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17
# Entrypoint for Railway channel-watcher service.
# Accepts a cookie-only DISCORD_SESSION_JSON payload, an existing session file,
# or a runtime-only DISCORD_TOKEN fallback.
# Raw Discord user tokens are never written to disk by this script.

set -e

DATA_DIR="${DATA_DIR:-/data}"
SESSION_FILE="$DATA_DIR/.session.json"

sanitize_session_file() {
  node --input-type=module -e "
import fs from 'node:fs';
const sessionFile = process.argv[1];
const raw = fs.readFileSync(sessionFile, 'utf8');
const parsed = JSON.parse(raw);
if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
  throw new Error('Session file must be a JSON object with Playwright storage state fields.');
}
parsed.cookies = Array.isArray(parsed.cookies) ? parsed.cookies : [];
parsed.origins = Array.isArray(parsed.origins)
  ? parsed.origins.map((origin) => {
      if (!origin || typeof origin !== 'object') {
        return origin;
      }
      const localStorage = Array.isArray(origin.localStorage)
        ? origin.localStorage.filter((entry) => entry && entry.name !== 'token')
        : [];
      return { ...origin, localStorage };
    })
  : [];
fs.writeFileSync(sessionFile, JSON.stringify(parsed, null, 2));
" "$SESSION_FILE"
}

write_session_from_env() {
  node --input-type=module -e "
import fs from 'node:fs';
const sessionFile = process.argv[1];
const raw = (process.env.DISCORD_SESSION_JSON || '').trim();
if (!raw) {
  throw new Error('DISCORD_SESSION_JSON is empty.');
}
const tryParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};
const direct = raw.startsWith('{') ? tryParse(raw) : null;
const decoded = direct ? raw : Buffer.from(raw, 'base64').toString('utf8');
const parsed = direct ?? tryParse(decoded);
if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
  throw new Error(
    'DISCORD_SESSION_JSON must be a sanitized Playwright storageState JSON object or its base64 encoding. Raw channel IDs, tokens, and scalars are invalid.'
  );
}
parsed.cookies = Array.isArray(parsed.cookies) ? parsed.cookies : [];
parsed.origins = Array.isArray(parsed.origins)
  ? parsed.origins.map((origin) => {
      if (!origin || typeof origin !== 'object') {
        return origin;
      }
      const localStorage = Array.isArray(origin.localStorage)
        ? origin.localStorage.filter((entry) => entry && entry.name !== 'token')
        : [];
      return { ...origin, localStorage };
    })
  : [];
fs.writeFileSync(sessionFile, JSON.stringify(parsed, null, 2));
" "$SESSION_FILE"
}

mkdir -p "$DATA_DIR"
echo "[entrypoint] DATA_DIR=$DATA_DIR"

if [ -n "$DISCORD_SESSION_JSON" ]; then
  echo "[entrypoint] Writing sanitized session from DISCORD_SESSION_JSON..."
  if write_session_from_env; then
    echo "[entrypoint] Session file written to $SESSION_FILE"
  elif [ -n "$DISCORD_TOKEN" ]; then
    echo "[entrypoint] WARNING: DISCORD_SESSION_JSON is invalid. Falling back to runtime-only DISCORD_TOKEN injection."
    rm -f "$SESSION_FILE"
  else
    echo "[entrypoint] ERROR: DISCORD_SESSION_JSON is invalid and no DISCORD_TOKEN fallback is available."
    echo "[entrypoint] Set DISCORD_SESSION_JSON to a sanitized Playwright storageState object (or base64 thereof), mount a valid session file, or provide DISCORD_TOKEN for runtime-only injection."
    exit 1
  fi

elif [ -n "$DISCORD_TOKEN" ] && [ ! -f "$SESSION_FILE" ]; then
  echo "[entrypoint] DISCORD_TOKEN detected without a session file."
  echo "[entrypoint] Starting with runtime-only token injection; no token will be written to disk."

elif [ ! -f "$SESSION_FILE" ]; then
  echo "[entrypoint] ERROR: No session available."
  echo "[entrypoint] Set DISCORD_SESSION_JSON, mount a sanitized session file, or provide DISCORD_TOKEN for runtime-only injection."
  exit 1

else
  echo "[entrypoint] Using existing session file at $SESSION_FILE"
fi

if [ -f "$SESSION_FILE" ]; then
  sanitize_session_file
fi

echo "[entrypoint] Starting channel watcher..."
exec node /app/index.js "$@"
