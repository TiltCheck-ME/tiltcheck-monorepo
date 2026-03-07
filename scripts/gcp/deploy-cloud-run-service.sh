#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash scripts/gcp/deploy-cloud-run-service.sh <service-name>

Required environment variables:
  PROJECT_ID

Optional environment variables:
  REGION=us-central1
  AR_REPO=tiltcheck-services
  CLOUD_RUN_RUNTIME_SA=sa-cloudrun-runtime@<PROJECT_ID>.iam.gserviceaccount.com
  ENV_VARS_FILE=.env.gcp.<service-name>

Service definitions are read from:
  infra/gcp/cloudrun/services.env
EOF
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

SERVICE_NAME="$1"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${REGION:-us-central1}"
AR_REPO="${AR_REPO:-tiltcheck-services}"
SERVICES_FILE="infra/gcp/cloudrun/services.env"

require_cmd gcloud

if [[ -z "$PROJECT_ID" ]]; then
  echo "PROJECT_ID is required." >&2
  exit 1
fi

if [[ ! -f "$SERVICES_FILE" ]]; then
  echo "Missing service definitions file: $SERVICES_FILE" >&2
  exit 1
fi

LINE="$(rg "^${SERVICE_NAME}\\|" "$SERVICES_FILE" -N || true)"
if [[ -z "$LINE" ]]; then
  echo "Service '$SERVICE_NAME' not found in $SERVICES_FILE" >&2
  exit 1
fi

IFS='|' read -r NAME DOCKERFILE PORT ALLOW_UNAUTH MEMORY CPU MIN_INSTANCES MAX_INSTANCES <<<"$LINE"
if [[ -z "$NAME" || -z "$DOCKERFILE" ]]; then
  echo "Invalid service definition: $LINE" >&2
  exit 1
fi

if [[ ! -f "$DOCKERFILE" ]]; then
  echo "Dockerfile not found: $DOCKERFILE" >&2
  exit 1
fi

IMAGE="us-central1-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${NAME}:$(date +%Y%m%d-%H%M%S)"
RUNTIME_SA="${CLOUD_RUN_RUNTIME_SA:-sa-cloudrun-runtime@${PROJECT_ID}.iam.gserviceaccount.com}"

echo "Building image: $IMAGE"
gcloud builds submit . \
  --project "$PROJECT_ID" \
  --tag "$IMAGE" \
  --file "$DOCKERFILE"

DEPLOY_ARGS=(
  run deploy "$NAME"
  --project "$PROJECT_ID"
  --region "$REGION"
  --image "$IMAGE"
  --port "$PORT"
  --memory "$MEMORY"
  --cpu "$CPU"
  --min-instances "$MIN_INSTANCES"
  --max-instances "$MAX_INSTANCES"
  --service-account "$RUNTIME_SA"
)

if [[ "$ALLOW_UNAUTH" == "true" ]]; then
  DEPLOY_ARGS+=(--allow-unauthenticated)
else
  DEPLOY_ARGS+=(--no-allow-unauthenticated)
fi

ENV_VARS_FILE="${ENV_VARS_FILE:-.env.gcp.${NAME}}"
if [[ -f "$ENV_VARS_FILE" ]]; then
  echo "Applying env vars from $ENV_VARS_FILE"
  DEPLOY_ARGS+=(--env-vars-file "$ENV_VARS_FILE")
fi

echo "Deploying Cloud Run service: $NAME"
gcloud "${DEPLOY_ARGS[@]}"

URL="$(gcloud run services describe "$NAME" --project "$PROJECT_ID" --region "$REGION" --format='value(status.url)')"
echo "Deployed $NAME at $URL"
