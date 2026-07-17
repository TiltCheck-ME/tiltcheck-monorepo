#!/usr/bin/env bash
# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-17
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/infra/compose/docker-compose.ghcr.yml}"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"

export GHCR_OWNER="${GHCR_OWNER:-tiltcheck-me}"
export IMAGE_TAG="${IMAGE_TAG:-latest}"

failures=0

check_http() {
  local name="$1"
  local url="$2"
  if curl -sf --max-time 15 "$url" > /dev/null; then
    echo "OK  $name ($url)"
  else
    echo "FAIL $name ($url)"
    failures=$((failures + 1))
  fi
}

echo "=== Docker container status ==="
if ! docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps; then
  echo "docker compose ps failed"
  exit 1
fi

not_running=$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps --status exited --status dead -q | wc -l)
if [[ "$not_running" -gt 0 ]]; then
  echo "WARN: $not_running container(s) not running"
  failures=$((failures + 1))
fi

if [[ "${VERIFY_PUBLIC:-0}" == "1" ]]; then
  echo ""
  echo "=== Public edge checks (Cloudflare) ==="
  check_http "api" "https://api.tiltcheck.me/health"
  check_http "web" "https://tiltcheck.me/"
  check_http "dashboard" "https://dashboard.tiltcheck.me/health"
  check_http "activity" "https://activity.tiltcheck.me/"
fi

if [[ "$failures" -gt 0 ]]; then
  echo ""
  echo "$failures check(s) failed."
  exit 1
fi

echo ""
echo "Stack health checks passed."
