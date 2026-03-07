#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd gcloud

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-comic-generator}"
COMIC_GCS_BUCKET="${COMIC_GCS_BUCKET:-}"
COMIC_STORAGE_PREFIX="${COMIC_STORAGE_PREFIX:-comics}"
COMIC_DEFAULT_COMMUNITY="${COMIC_DEFAULT_COMMUNITY:-tiltcheck-discord}"
COMIC_MAX_MESSAGES="${COMIC_MAX_MESSAGES:-180}"
COMIC_ARCHIVE_LIMIT="${COMIC_ARCHIVE_LIMIT:-180}"
COMIC_GENERATION_RETRIES="${COMIC_GENERATION_RETRIES:-2}"
GEMINI_TEXT_MODEL="${GEMINI_TEXT_MODEL:-gemini-2.0-flash}"
GEMINI_IMAGE_MODEL="${GEMINI_IMAGE_MODEL:-gemini-2.0-flash-preview-image-generation}"
ALLOW_UNAUTH="${ALLOW_UNAUTH:-true}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "PROJECT_ID is required (or configure gcloud default project)." >&2
  exit 1
fi

if [[ -z "$COMIC_GCS_BUCKET" ]]; then
  echo "COMIC_GCS_BUCKET is required." >&2
  echo "Example: COMIC_GCS_BUCKET=tiltcheck-comics-prod npm run deploy:cloudrun" >&2
  exit 1
fi

echo "Using project: $PROJECT_ID"
echo "Using region:  $REGION"
echo "Service name:  $SERVICE_NAME"
echo "Bucket:        $COMIC_GCS_BUCKET"

echo "Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  --project "$PROJECT_ID" >/dev/null

ensure_secret() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    return 0
  fi
  if gcloud secrets describe "$name" --project "$PROJECT_ID" >/dev/null 2>&1; then
    :
  else
    gcloud secrets create "$name" --replication-policy="automatic" --project "$PROJECT_ID" >/dev/null
  fi
  printf '%s' "$value" | gcloud secrets versions add "$name" --data-file=- --project "$PROJECT_ID" >/dev/null
}

GEMINI_SECRET_NAME="${GEMINI_SECRET_NAME:-comic-gemini-api-key}"
INGEST_SECRET_NAME="${INGEST_SECRET_NAME:-comic-ingest-key}"

if [[ -n "${GEMINI_API_KEY:-}" ]]; then
  echo "Publishing GEMINI_API_KEY to Secret Manager..."
  ensure_secret "$GEMINI_SECRET_NAME" "${GEMINI_API_KEY}"
fi

if [[ -n "${COMIC_INGEST_KEY:-}" ]]; then
  echo "Publishing COMIC_INGEST_KEY to Secret Manager..."
  ensure_secret "$INGEST_SECRET_NAME" "${COMIC_INGEST_KEY}"
fi

DEPLOY_ARGS=(
  run deploy "$SERVICE_NAME"
  --source "$SCRIPT_DIR"
  --project "$PROJECT_ID"
  --region "$REGION"
  --set-env-vars "COMIC_GCS_BUCKET=$COMIC_GCS_BUCKET,COMIC_STORAGE_PREFIX=$COMIC_STORAGE_PREFIX,COMIC_DEFAULT_COMMUNITY=$COMIC_DEFAULT_COMMUNITY,COMIC_MAX_MESSAGES=$COMIC_MAX_MESSAGES,COMIC_ARCHIVE_LIMIT=$COMIC_ARCHIVE_LIMIT,COMIC_GENERATION_RETRIES=$COMIC_GENERATION_RETRIES,GEMINI_TEXT_MODEL=$GEMINI_TEXT_MODEL,GEMINI_IMAGE_MODEL=$GEMINI_IMAGE_MODEL"
)

if [[ "$ALLOW_UNAUTH" == "true" ]]; then
  DEPLOY_ARGS+=(--allow-unauthenticated)
else
  DEPLOY_ARGS+=(--no-allow-unauthenticated)
fi

if [[ -n "${GEMINI_API_KEY:-}" ]]; then
  DEPLOY_ARGS+=(--set-secrets "GEMINI_API_KEY=$GEMINI_SECRET_NAME:latest")
fi

if [[ -n "${COMIC_INGEST_KEY:-}" ]]; then
  DEPLOY_ARGS+=(--set-secrets "COMIC_INGEST_KEY=$INGEST_SECRET_NAME:latest")
fi

echo "Deploying Cloud Run service..."
gcloud "${DEPLOY_ARGS[@]}"

SERVICE_URL="$(gcloud run services describe "$SERVICE_NAME" --project "$PROJECT_ID" --region "$REGION" --format='value(status.url)')"

echo
echo "Deploy complete."
echo "Service URL: $SERVICE_URL"
echo
echo "Set these in tools/channel-watcher/.env:"
echo "COMIC_API_URL=$SERVICE_URL"
if [[ -n "${COMIC_INGEST_KEY:-}" ]]; then
  echo "COMIC_API_INGEST_KEY=<same value you used for COMIC_INGEST_KEY>"
else
  echo "COMIC_API_INGEST_KEY=<if configured in service>"
fi
