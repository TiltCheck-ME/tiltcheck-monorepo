#!/usr/bin/env bash
# Install a systemd monthly timer for scripts/monthly-trust-refresh.sh

set -euo pipefail

SERVICE_NAME="tiltcheck-monthly-refresh"
RUN_USER="${RUN_USER:-$USER}"
REPO_DIR="${REPO_DIR:-/opt/tiltcheck-monorepo}"
RUN_SCRIPT="${RUN_SCRIPT:-$REPO_DIR/scripts/monthly-trust-refresh.sh}"
BRANCH="${BRANCH:-main}"

if [[ "${1:-}" == "--help" ]]; then
  cat <<EOF
Usage:
  sudo RUN_USER=<linux-user> REPO_DIR=<repo-path> BRANCH=<branch> bash scripts/install-monthly-trust-refresh-timer.sh

Defaults:
  RUN_USER=$RUN_USER
  REPO_DIR=$REPO_DIR
  BRANCH=$BRANCH
  RUN_SCRIPT=$RUN_SCRIPT
EOF
  exit 0
fi

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root (sudo) to install systemd unit files."
  exit 1
fi

if ! id -u "$RUN_USER" >/dev/null 2>&1; then
  echo "RUN_USER does not exist: $RUN_USER"
  exit 1
fi

if [[ ! -f "$RUN_SCRIPT" ]]; then
  echo "Refresh script not found: $RUN_SCRIPT"
  echo "Ensure the repo exists at REPO_DIR and includes scripts/monthly-trust-refresh.sh."
  exit 1
fi

cat >/etc/systemd/system/${SERVICE_NAME}.service <<EOF
[Unit]
Description=TiltCheck monthly trust refresh
After=network-online.target ollama.service
Wants=network-online.target

[Service]
Type=oneshot
User=${RUN_USER}
WorkingDirectory=${REPO_DIR}
Environment=REPO_DIR=${REPO_DIR}
Environment=BRANCH=${BRANCH}
ExecStart=/usr/bin/bash ${RUN_SCRIPT}
TimeoutStartSec=1800
EOF

cat >/etc/systemd/system/${SERVICE_NAME}.timer <<EOF
[Unit]
Description=Run TiltCheck monthly trust refresh

[Timer]
OnCalendar=monthly
Persistent=true
RandomizedDelaySec=20m
Unit=${SERVICE_NAME}.service

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now ${SERVICE_NAME}.timer

echo "Installed ${SERVICE_NAME}.service and ${SERVICE_NAME}.timer"
echo "Next trigger:"
systemctl list-timers ${SERVICE_NAME}.timer --no-pager
echo
echo "Manual run:"
echo "  sudo systemctl start ${SERVICE_NAME}.service"
echo "Logs:"
echo "  sudo journalctl -u ${SERVICE_NAME}.service -n 200 --no-pager"
