#!/usr/bin/env bash
set -e

#
# TiltCheck Google Cloud Deployment Script
#
# This script deploys the bundled bots to a Google Cloud e2-micro (free tier) VM.
#
# Prerequisites:
#   1. Google Cloud account with billing enabled (needed even for free tier)
#   2. gcloud CLI installed: https://cloud.google.com/sdk/docs/install
#   3. Run: gcloud auth login && gcloud config set project YOUR_PROJECT_ID
#   4. Run: pnpm bundle:bots (generates dist-bundle/)
#
# Usage:
#   bash scripts/deploy-gcloud.sh           # First-time setup + deploy
#   bash scripts/deploy-gcloud.sh --update  # Update existing VM with new bundle
#

# ─── Configuration ──────────────────────────────────────────
VM_NAME="tiltcheck-bot"
ZONE="us-central1-a"           # Free tier zone
MACHINE_TYPE="e2-micro"        # Free tier: 0.25 vCPU, 1 GB RAM
DISK_SIZE="30"                 # Free tier: 30 GB standard
IMAGE_FAMILY="debian-12"
IMAGE_PROJECT="debian-cloud"
REMOTE_DIR="/opt/tiltcheck"
BUNDLE_DIR="dist-bundle"

# ─── Helpers ────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ─── Pre-flight checks ─────────────────────────────────────
command -v gcloud >/dev/null 2>&1 || error "gcloud CLI not found. Install: https://cloud.google.com/sdk/docs/install"

if [ ! -d "$BUNDLE_DIR" ]; then
  error "dist-bundle/ not found. Run: pnpm bundle:bots"
fi

if [ ! -f "$BUNDLE_DIR/.env" ] && [ "$1" != "--update" ]; then
  warn ".env not found in dist-bundle/. Copy .env.example to .env and fill in your secrets before deploying."
  warn "  cp dist-bundle/.env.example dist-bundle/.env"
  warn "  Then edit dist-bundle/.env with your Discord tokens, Supabase keys, etc."
  exit 1
fi

PROJECT=$(gcloud config get-value project 2>/dev/null)
[ -z "$PROJECT" ] && error "No GCloud project set. Run: gcloud config set project YOUR_PROJECT_ID"
info "Using project: $PROJECT"

# ─── Update-only mode ──────────────────────────────────────
if [ "$1" == "--update" ]; then
  info "Updating existing VM with new bundle..."

  # Upload bundle
  gcloud compute scp --zone="$ZONE" --recurse "$BUNDLE_DIR"/* "$VM_NAME:~/tiltcheck-upload/" --quiet

  # Deploy on VM
  gcloud compute ssh "$VM_NAME" --zone="$ZONE" --command="
    sudo rsync -av --exclude='.env' --exclude='node_modules' ~/tiltcheck-upload/ $REMOTE_DIR/
    cd $REMOTE_DIR
    sudo npm install --production
    sudo pm2 restart ecosystem.config.cjs
    sudo pm2 save
    echo 'Deploy complete!'
  "
  info "Update complete!"
  exit 0
fi

# ─── First-time VM Creation ────────────────────────────────
info "Checking if VM '$VM_NAME' exists..."
if gcloud compute instances describe "$VM_NAME" --zone="$ZONE" &>/dev/null; then
  warn "VM '$VM_NAME' already exists. Use --update to deploy new code."
  exit 1
fi

info "Creating VM: $VM_NAME ($MACHINE_TYPE in $ZONE)..."
gcloud compute instances create "$VM_NAME" \
  --zone="$ZONE" \
  --machine-type="$MACHINE_TYPE" \
  --image-family="$IMAGE_FAMILY" \
  --image-project="$IMAGE_PROJECT" \
  --boot-disk-size="${DISK_SIZE}GB" \
  --boot-disk-type="pd-standard" \
  --tags="tiltcheck" \
  --metadata=startup-script='#!/bin/bash
    # Install Node.js 20
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    # Install PM2
    npm install -g pm2
    # Create app directory
    mkdir -p /opt/tiltcheck
  '

info "Waiting for VM to be ready..."
sleep 30

# Wait for startup script to finish
for i in {1..20}; do
  if gcloud compute ssh "$VM_NAME" --zone="$ZONE" --command="command -v pm2" &>/dev/null; then
    break
  fi
  info "  Waiting for startup script... ($i/20)"
  sleep 10
done

# Upload bundle
info "Uploading bundle..."
gcloud compute scp --zone="$ZONE" --recurse "$BUNDLE_DIR"/* "$VM_NAME:~/tiltcheck-upload/" --quiet

# Setup on VM
info "Setting up on VM..."
gcloud compute ssh "$VM_NAME" --zone="$ZONE" --command="
  sudo cp -r ~/tiltcheck-upload/* $REMOTE_DIR/
  cd $REMOTE_DIR

  # Install production dependencies
  sudo npm install --production

  # Start bots with PM2
  sudo pm2 start ecosystem.config.cjs
  sudo pm2 save
  sudo pm2 startup | tail -1 | sudo bash

  echo ''
  echo '=============================='
  echo '  TiltCheck deployed!'
  echo '  PM2 status:'
  sudo pm2 list
  echo '=============================='
"

# Reserve a static IP (free while attached to a running VM)
info "Reserving static IP..."
gcloud compute addresses create tiltcheck-ip --region=us-central1 2>/dev/null || true
STATIC_IP=$(gcloud compute addresses describe tiltcheck-ip --region=us-central1 --format='get(address)' 2>/dev/null)

if [ -n "$STATIC_IP" ]; then
  # Assign to VM
  gcloud compute instances delete-access-config "$VM_NAME" --zone="$ZONE" --access-config-name="external-nat" 2>/dev/null || true
  gcloud compute instances add-access-config "$VM_NAME" --zone="$ZONE" --address="$STATIC_IP" 2>/dev/null || true
  info "Static IP: $STATIC_IP"
  info "Point api.tiltcheck.me A record to: $STATIC_IP"
fi

info ""
info "Deployment complete!"
info ""
info "Next steps:"
info "  1. SSH in:  gcloud compute ssh $VM_NAME --zone=$ZONE"
info "  2. Logs:    sudo pm2 logs"
info "  3. Status:  sudo pm2 list"
info "  4. Update:  bash scripts/deploy-gcloud.sh --update"
