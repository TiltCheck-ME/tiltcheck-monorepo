#!/usr/bin/env bash
set -euo pipefail

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd gcloud

BILLING_ACCOUNT="${BILLING_ACCOUNT:-}"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
BUDGET_AMOUNT="${BUDGET_AMOUNT:-300}"
DISPLAY_NAME="${DISPLAY_NAME:-tiltcheck-migration-cap}"
PUBSUB_TOPIC="${PUBSUB_TOPIC:-}"

if [[ -z "$BILLING_ACCOUNT" ]]; then
  echo "BILLING_ACCOUNT is required (format: 000000-000000-000000)." >&2
  exit 1
fi

if [[ -z "$PROJECT_ID" ]]; then
  echo "PROJECT_ID is required." >&2
  exit 1
fi

FILTER="projects/${PROJECT_ID}"
THRESHOLDS="0.4,0.6,0.8,0.9,1.0"

ARGS=(
  billing budgets create
  --billing-account="$BILLING_ACCOUNT"
  --display-name="$DISPLAY_NAME"
  --budget-amount="$BUDGET_AMOUNT"
  --filter-projects="$FILTER"
  --threshold-rule=percent=0.4
  --threshold-rule=percent=0.6
  --threshold-rule=percent=0.8
  --threshold-rule=percent=0.9
  --threshold-rule=percent=1.0
)

if [[ -n "$PUBSUB_TOPIC" ]]; then
  ARGS+=(--notifications-rule-pubsub-topic="$PUBSUB_TOPIC")
fi

echo "Creating budget alerts for project $PROJECT_ID ($BUDGET_AMOUNT USD)..."
gcloud "${ARGS[@]}"
echo "Budget alert setup complete. Thresholds: $THRESHOLDS"
