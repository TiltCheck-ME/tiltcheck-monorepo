#!/usr/bin/env bash
# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-17
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/infra/compose/docker-compose.ghcr.yml}"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"

export GHCR_OWNER="${GHCR_OWNER:-tiltcheck-me}"
export IMAGE_TAG="${IMAGE_TAG:-latest}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE"
  echo "Copy .env.example and fill production values before deploying."
  exit 1
fi

cd "$ROOT_DIR"

echo "Pulling GHCR images (owner=$GHCR_OWNER tag=$IMAGE_TAG)..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull

echo "Starting stack..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --remove-orphans

echo "Stack status:"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
