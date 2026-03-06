#!/usr/bin/env bash
# ================================================================
# TiltCheck VPS Deployment Automator
# © 2024–2025 TiltCheck Ecosystem
# ================================================================

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

# 1. Sync the environment file (Master config)
echo "📡 Syncing .env to VPS..."
rsync -avz .env $VPS_USER@$VPS_IP:$REMOTE_PATH/.env

# 2. Trigger the remote build
echo "🏗️  Starting remote build and restart via Docker Compose..."
ssh $VPS_USER@$VPS_IP << EOF
  cd $REMOTE_PATH
  git pull origin main
  docker compose pull
  docker compose up -d --build
  docker image prune -f
  echo "🧪 Running MVP beta tool smoke checks (landing service)..."
  bash scripts/mvp-beta-tools-smoke.sh http://localhost:8080
EOF

echo "✅ Deployment complete!"
echo "📡 Monitoring logs: ssh $VPS_USER@$VPS_IP 'cd $REMOTE_PATH && docker compose logs -f'"
