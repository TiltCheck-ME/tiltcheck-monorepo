#!/bin/sh
# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-17
set -eu

export API_UPSTREAM="${API_UPSTREAM:-http://api:3001}"
export ARENA_UPSTREAM="${ARENA_UPSTREAM:-http://game-arena:8080}"

envsubst '${API_UPSTREAM} ${ARENA_UPSTREAM}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
