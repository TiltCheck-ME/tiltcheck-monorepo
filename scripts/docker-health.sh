#!/usr/bin/env bash
# ================================================================
# © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
# Created by jmenichole (https://github.com/jmenichole)
# 
# This file is part of the TiltCheck project.
# For licensing information, see LICENSE file in the project root.
# ================================================================

#
# docker-health.sh - Docker HEALTHCHECK script
#
# Unified healthcheck script for Docker containers
# Checks the appropriate health endpoint based on SERVICE_NAME env var
#
# Usage in Dockerfile:
#   HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
#     CMD ["bash", "scripts/docker-health.sh"]

set -e

SERVICE_NAME=${SERVICE_NAME:-"unknown"}
HEALTH_PORT=${HEALTH_PORT:-8080}
HEALTH_PATH=${HEALTH_PATH:-"/health"}

# Determine health check URL based on service
case "$SERVICE_NAME" in
  "discord-bot")
    HEALTH_PORT=${DISCORD_BOT_HEALTH_PORT:-8081}
    ;;
  "dad-bot")
    HEALTH_PORT=${DAD_BOT_HEALTH_PORT:-8082}
    ;;
  "api"|"api-gateway")
    HEALTH_PORT=${PORT:-3001}
    ;;
  "dashboard")
    HEALTH_PORT=${PORT:-5055}
    ;;
  "landing")
    HEALTH_PORT=${PORT:-8080}
    ;;
  "control-room")
    HEALTH_PORT=${CONTROL_ROOM_PORT:-3001}
    ;;
  *)
    echo "Unknown service: $SERVICE_NAME"
    exit 1
    ;;
esac

HEALTH_URL="http://localhost:${HEALTH_PORT}${HEALTH_PATH}"

# Perform health check
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
  echo "Service $SERVICE_NAME is healthy (HTTP $HTTP_CODE)"
  exit 0
else
  echo "Service $SERVICE_NAME is unhealthy (HTTP $HTTP_CODE)"
  exit 1
fi
