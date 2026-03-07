#!/usr/bin/env bash
set -euo pipefail

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd gcloud

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${REGION:-us-central1}"
AR_REPO="${AR_REPO:-tiltcheck-services}"
DEPLOYER_MEMBER="${DEPLOYER_MEMBER:-}"
RUNTIME_SA_NAME="${RUNTIME_SA_NAME:-sa-cloudrun-runtime}"
BUILDER_SA_NAME="${BUILDER_SA_NAME:-sa-cloudbuild-deployer}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "PROJECT_ID is required (or configure gcloud default project)." >&2
  exit 1
fi

echo "Project: $PROJECT_ID"
echo "Region:  $REGION"
echo "Repo:    $AR_REPO"

echo "Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudscheduler.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  --project "$PROJECT_ID"

if ! gcloud artifacts repositories describe "$AR_REPO" \
  --location "$REGION" --project "$PROJECT_ID" >/dev/null 2>&1; then
  echo "Creating Artifact Registry repository..."
  gcloud artifacts repositories create "$AR_REPO" \
    --repository-format=docker \
    --location="$REGION" \
    --description="TiltCheck Cloud Run images" \
    --project "$PROJECT_ID"
fi

if ! gcloud iam service-accounts describe \
  "${RUNTIME_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --project "$PROJECT_ID" >/dev/null 2>&1; then
  echo "Creating runtime service account..."
  gcloud iam service-accounts create "$RUNTIME_SA_NAME" \
    --display-name="TiltCheck Cloud Run runtime" \
    --project "$PROJECT_ID"
fi

if ! gcloud iam service-accounts describe \
  "${BUILDER_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --project "$PROJECT_ID" >/dev/null 2>&1; then
  echo "Creating build/deploy service account..."
  gcloud iam service-accounts create "$BUILDER_SA_NAME" \
    --display-name="TiltCheck Cloud Build deployer" \
    --project "$PROJECT_ID"
fi

if [[ -n "$DEPLOYER_MEMBER" ]]; then
  echo "Applying deployer IAM bindings for $DEPLOYER_MEMBER..."
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="$DEPLOYER_MEMBER" \
    --role="roles/run.admin" >/dev/null
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="$DEPLOYER_MEMBER" \
    --role="roles/artifactregistry.writer" >/dev/null
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="$DEPLOYER_MEMBER" \
    --role="roles/iam.serviceAccountUser" >/dev/null
fi

echo "Foundation bootstrap complete."
