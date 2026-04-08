#!/usr/bin/env bash
# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-08
# Upsert a Cloudflare DNS record for tiltcheck.me
# Usage: ./scripts/dns-upsert.sh <name> <content> <type>
# Examples:
#   ./scripts/dns-upsert.sh www frp1rt88.up.railway.app CNAME
#   ./scripts/dns-upsert.sh hub tiltcheck-edge-hub.<account>.workers.dev CNAME
#   ./scripts/dns-upsert.sh api cu6ormlb.up.railway.app CNAME

set -euo pipefail

NAME="${1:?Usage: $0 <name> <content> <type>}"
CONTENT="${2:?Missing content}"
TYPE="${3:-CNAME}"
PROXIED="${4:-true}"

ZONE_ID="${CLOUDFLARE_ZONE_ID:?Set CLOUDFLARE_ZONE_ID}"
TOKEN="${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN}"
FQDN="${NAME}.tiltcheck.me"

echo "Upserting ${TYPE} ${FQDN} -> ${CONTENT} (proxied=${PROXIED})"

EXISTING=$(curl -sf "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${FQDN}&type=${TYPE}" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r '.result[0].id // empty')

if [ -n "$EXISTING" ]; then
  RESULT=$(curl -sf -X PATCH "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${EXISTING}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"content\":\"${CONTENT}\",\"proxied\":${PROXIED}}")
  echo "Updated (id=${EXISTING}): $(echo "$RESULT" | jq '.success')"
else
  RESULT=$(curl -sf -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"${TYPE}\",\"name\":\"${NAME}\",\"content\":\"${CONTENT}\",\"proxied\":${PROXIED},\"ttl\":1}")
  echo "Created: $(echo "$RESULT" | jq '.success')"
fi
