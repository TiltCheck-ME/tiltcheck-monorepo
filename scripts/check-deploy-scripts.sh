#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/4] Shell syntax checks"
bash -n deploy-vps.sh
bash -n scripts/deploy-gcloud.sh
bash -n scripts/deploy-gcloud-rollback.sh
bash -n scripts/gcp/deploy-cloud-run-service.sh

echo "[2/4] Legacy VPS deploy dry-run gate"
TMP_ENV_CREATED=0
if [[ ! -f ".env" ]]; then
  TMP_ENV_CREATED=1
  cat > .env <<'EOF'
DISCORD_TOKEN=ci_dummy_token
SUPABASE_URL=https://example.supabase.co
SUPABASE_ANON_KEY=ci_dummy_key
JWT_SECRET=ci_dummy_jwt_secret
SESSION_SECRET=ci_dummy_session_secret
EOF
fi
ALLOW_LEGACY_VPS_DEPLOY=1 bash deploy-vps.sh --dry-run >/dev/null
if [[ "$TMP_ENV_CREATED" == "1" ]]; then
  rm -f .env
fi

echo "[3/4] GCloud VM deploy preflight gate"
mkdir -p dist-bundle
TMP_BUNDLE_ENV_CREATED=0
if [[ ! -f dist-bundle/.env ]]; then
  TMP_BUNDLE_ENV_CREATED=1
  cat > dist-bundle/.env <<'EOF'
DISCORD_TOKEN=ci_dummy_token
SUPABASE_URL=https://example.supabase.co
SUPABASE_ANON_KEY=ci_dummy_key
JWT_SECRET=ci_dummy_jwt_secret
SESSION_SECRET=ci_dummy_session_secret
EOF
fi
PROJECT_ID=tiltcheck-ci bash scripts/deploy-gcloud.sh --preflight >/dev/null
if [[ "$TMP_BUNDLE_ENV_CREATED" == "1" ]]; then
  rm -f dist-bundle/.env
fi

echo "[4/4] Cloud Run deploy preflight gate"
PROJECT_ID=tiltcheck-ci bash scripts/gcp/deploy-cloud-run-service.sh --preflight api >/dev/null

echo "Deploy script checks passed."
