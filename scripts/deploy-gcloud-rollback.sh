#!/usr/bin/env bash
# Roll back TiltCheck GCloud VM deployment from latest backup snapshot.
set -euo pipefail

VM_NAME="${VM_NAME:-tiltcheck-bot}"
ZONE="${ZONE:-us-central1-a}"
REMOTE_DIR="${REMOTE_DIR:-/opt/tiltcheck}"
DRY_RUN=0

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
fi

run_or_echo() {
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[dry-run] $*"
  else
    eval "$@"
  fi
}

if [[ "$DRY_RUN" != "1" ]]; then
  command -v gcloud >/dev/null 2>&1 || {
    echo "[ERROR] gcloud CLI not found."
    exit 1
  }
fi

run_or_echo "gcloud compute ssh \"$VM_NAME\" --zone=\"$ZONE\" --command='
  set -euo pipefail
  LAST_BACKUP=\$(ls -1dt /opt/tiltcheck-backups/* 2>/dev/null | head -n 1)
  test -n \"\$LAST_BACKUP\" || { echo \"No backup available\"; exit 1; }
  sudo rsync -a --delete \"\$LAST_BACKUP/\" \"$REMOTE_DIR/\"
  cd \"$REMOTE_DIR\"
  sudo npm install --production
  sudo pm2 restart ecosystem.config.cjs
  sudo pm2 save
  echo \"Rollback complete from \$LAST_BACKUP\"
'"
