#!/usr/bin/env bash

# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17
# MVP beta-testing tool smoke test.
# Verifies critical public pages for the beta program and core tools.

set -euo pipefail

BASE_URL="${1:-https://tiltcheck.me}"

if [[ "${BASE_URL}" == */ ]]; then
  BASE_URL="${BASE_URL%/}"
fi

CHECK_PATHS=(
  "/beta-tester"
  "/tools/justthetip"
  "/tools/domain-verifier"
  "/tools/collectclock"
  "/tools/verify"
)

PASS_COUNT=0
FAILURES=()

echo "Running MVP beta smoke checks against ${BASE_URL}"

for path in "${CHECK_PATHS[@]}"; do
  url="${BASE_URL}${path}"
  # Follow redirects and fail fast on 4xx/5xx.
  if curl --silent --show-error --fail --location --max-time 10 "${url}" > /dev/null; then
    echo "  PASS ${path}"
    ((PASS_COUNT += 1))
  else
    echo "  FAIL ${path}"
    FAILURES+=("${path}")
  fi
done

if (( ${#FAILURES[@]} > 0 )); then
  echo
  echo "MVP beta smoke checks failed (${PASS_COUNT}/${#CHECK_PATHS[@]} passed)."
  echo "Failed paths:"
  for failed in "${FAILURES[@]}"; do
    echo "  - ${failed}"
  done
  exit 1
fi

echo
echo "MVP beta smoke checks passed (${PASS_COUNT}/${#CHECK_PATHS[@]})."
