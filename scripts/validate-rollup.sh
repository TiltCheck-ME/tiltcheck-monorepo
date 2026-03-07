#!/usr/bin/env bash
# ================================================================
# © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
# Created by jmenichole (https://github.com/jmenichole)
# 
# This file is part of the TiltCheck project.
# For licensing information, see LICENSE file in the project root.
# ================================================================

# Validate trust-rollup snapshot after flush
set -euo pipefail
CTR="${ROLLUP_CONTAINER:-tiltcheck-rollup}"

echo "Flushing rollup snapshot inside container $CTR"
docker exec "$CTR" node -e "import('./dist/index.js').then(m=>m.flushTrustRollups())"

echo "Checking snapshot file exists"
if ! docker exec "$CTR" sh -c "test -f data/trust-rollups.json"; then
  echo "Snapshot file missing" >&2
  exit 1
fi

echo "Validating snapshot structure"
SNAP=$(docker exec "$CTR" cat data/trust-rollups.json)
if ! echo "$SNAP" | jq -e '.batches | length >= 1' >/dev/null; then
  echo "Invalid batches length" >&2
  exit 2
fi
if ! echo "$SNAP" | jq -e '.batches[-1].domain and .batches[-1].casino' >/dev/null; then
  echo "Missing domain or casino sections" >&2
  exit 3
fi

echo "Snapshot validation passed"
