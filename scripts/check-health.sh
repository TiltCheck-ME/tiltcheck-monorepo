#!/usr/bin/env bash
# TiltCheck health probe script
# Exits non-zero if any service reports ready=false or endpoint unreachable.

set -euo pipefail

ROLLUP_URL="${ROLLUP_URL:-http://localhost:8082/health}"
BOT_URL="${BOT_URL:-http://localhost:8081/health}"
LANDING_URL="${LANDING_URL:-http://localhost:8080/health}"
REQUIRE_READY="${REQUIRE_READY:-true}"          # fail if ready != true
WAIT_ATTEMPTS="${WAIT_ATTEMPTS:-30}"            # max polling attempts
WAIT_INTERVAL="${WAIT_INTERVAL:-2}"             # seconds between attempts

have_jq() { command -v jq >/dev/null 2>&1; }

poll() {
  local url="$1"
  local attempt=1
  while (( attempt <= WAIT_ATTEMPTS )); do
    if resp=$(curl -fsS "$url" 2>/dev/null); then
      echo "$resp"
      return 0
    fi
    sleep "$WAIT_INTERVAL"
    attempt=$(( attempt + 1 ))
  done
  return 1
}

check() {
  local name="$1"; shift
  local url="$1"; shift
  echo "==> Checking $name ($url)"
  if ! raw=$(poll "$url"); then
    echo "ERROR: $name health endpoint unreachable after ${WAIT_ATTEMPTS} attempts" >&2
    return 1
  fi
  # Pretty print
  if have_jq; then echo "$raw" | jq . || echo "$raw"; else echo "$raw"; fi
  local readyVal
  if have_jq; then
    readyVal=$(echo "$raw" | jq -r '.ready // empty')
  else
    readyVal=$(echo "$raw" | sed -n 's/.*"ready":\s*\([^,}]*\).*/\1/p' | tr -d ' ')
  fi
  if [[ "$REQUIRE_READY" == "true" ]]; then
    # If ready field missing but status ok, treat as ready
    if [[ -z "$readyVal" ]]; then
      if echo "$raw" | grep -q '"status"[[:space:]]*:[[:space:]]*"ok"'; then
        readyVal="true"
      fi
    fi
    if [[ "$readyVal" != "true" ]]; then
      echo "ERROR: $name not ready (ready=$readyVal)" >&2
      return 2
    fi
  fi
  echo
}

overall_rc=0
check "trust-rollup" "$ROLLUP_URL" || overall_rc=$?
check "discord-bot" "$BOT_URL" || overall_rc=$?
check "landing" "$LANDING_URL" || overall_rc=$?

if (( overall_rc != 0 )); then
  echo "Health checks FAILED (rc=$overall_rc)" >&2
  exit $overall_rc
fi

echo "Health checks passed."