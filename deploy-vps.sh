#!/usr/bin/env bash
# ================================================================
# TiltCheck VPS Deployment Automator
# © 2024–2025 TiltCheck Ecosystem
# ================================================================

set -euo pipefail

DRY_RUN=0
if [ "${1:-}" = "--dry-run" ]; then
  DRY_RUN=1
fi

is_placeholder() {
  local v
  v="$(echo "${1:-}" | tr '[:upper:]' '[:lower:]' | xargs)"
  [[ -z "$v" || "$v" == *"changeme"* || "$v" == *"replace-me"* || "$v" == *"your_"* || "$v" == "<"*">" ]]
}

validate_env_file() {
  local env_file="$1"
  local required_keys=("DISCORD_TOKEN" "SUPABASE_URL" "SUPABASE_ANON_KEY" "JWT_SECRET" "SESSION_SECRET")
  [ -f "$env_file" ] || { echo "❌ Missing required env file: $env_file"; exit 1; }
  for key in "${required_keys[@]}"; do
    local line raw
    line="$(rg "^${key}=" "$env_file" -N || true)"
    [ -n "$line" ] || { echo "❌ Missing required env key in $env_file: $key"; exit 1; }
    raw="${line#*=}"
    raw="${raw%\"}"
    raw="${raw#\"}"
    if is_placeholder "$raw"; then
      echo "❌ Refusing deploy: $key appears unset or placeholder in $env_file"
      exit 1
    fi
  done
}

run_or_echo() {
  if [ "$DRY_RUN" = "1" ]; then
    echo "[dry-run] $*"
  else
    eval "$@"
  fi
}

echo "This script is deprecated: VPS deployment is no longer the primary path."
echo "Use the VPS-free plan in DEPLOYMENT_PLAN.md (Vercel + Railway/Render)."
echo "If you intentionally need legacy VPS deployment, set ALLOW_LEGACY_VPS_DEPLOY=1."
if [ "${ALLOW_LEGACY_VPS_DEPLOY:-0}" != "1" ]; then
  exit 1
fi

# VPS CONFIG
VPS_IP="85.209.95.175"
VPS_USER="jme"
REMOTE_PATH="/home/jme/tiltcheck-monorepo"

echo "🚀 Preparing deployment to TiltCheck VPS ($VPS_IP)..."
validate_env_file ".env"

# 1. Sync the environment file (Master config)
echo "📡 Syncing .env to VPS..."
run_or_echo "rsync -avz .env $VPS_USER@$VPS_IP:$REMOTE_PATH/.env"

# 2. Trigger the remote build
echo "🏗️  Starting remote build and restart via Docker Compose..."
if [ "$DRY_RUN" = "1" ]; then
  echo "[dry-run] ssh $VPS_USER@$VPS_IP (deploy + smoke test + rollback on failure)"
else
  ssh "$VPS_USER@$VPS_IP" << EOF
    set -euo pipefail
    cd "$REMOTE_PATH"
    PREV_COMMIT=\$(git rev-parse HEAD)
    git pull origin main
    docker compose pull
    docker compose up -d --build
    docker image prune -f
    echo "🧪 Running post-deploy smoke checks (landing service)..."
    if ! bash scripts/mvp-beta-tools-smoke.sh http://localhost:8080; then
      echo "❌ Smoke checks failed. Rolling back to commit \$PREV_COMMIT"
      git reset --hard "\$PREV_COMMIT"
      docker compose up -d --build
      exit 1
    fi
    echo "✅ Post-deploy verification passed"
EOF
fi

echo "✅ Deployment complete!"
echo "📡 Monitoring logs: ssh $VPS_USER@$VPS_IP 'cd $REMOTE_PATH && docker compose logs -f'"
