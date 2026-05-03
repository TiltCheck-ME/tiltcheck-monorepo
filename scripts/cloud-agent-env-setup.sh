#!/usr/bin/env bash
# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03
#
# Idempotent cloud-agent bootstrap for Cursor Cloud sessions:
# - installs a managed Node 20 toolchain when the base image is missing Node
# - exposes node/npm/npx/corepack/pnpm on PATH for future shells
# - installs workspace deps only when lockfile or toolchain fingerprint changes
# - prebuilds workspace packages needed by `pnpm --filter web build`
# - verifies the targeted partner test command works without manual bootstrap
# - preserves the existing trust-engine readiness path

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TARGET_NODE_VERSION="20.19.0"
TARGET_NODE_MAJOR="20"
TARGET_PNPM_VERSION="10.29.1"
CACHE_ROOT="${XDG_CACHE_HOME:-$HOME/.cache}/tiltcheck-cloud-agent"
TOOLS_DIR="$CACHE_ROOT/tools"
DOWNLOADS_DIR="$CACHE_ROOT/downloads"
STATE_DIR="$CACHE_ROOT/state"
LOCAL_BIN_DIR="$HOME/.local/bin"
LOCKFILE="$ROOT_DIR/pnpm-lock.yaml"
DEPENDENCY_STATE_FILE="$STATE_DIR/workspace-bootstrap.state"
PROFILE_BEGIN="# >>> tiltcheck cloud agent path >>>"
PROFILE_END="# <<< tiltcheck cloud agent path <<<"

log() {
  printf '[cloud-agent-env] %s\n' "$*"
}

fail() {
  printf '[cloud-agent-env] %s\n' "$*" >&2
  exit 1
}

ensure_directory() {
  mkdir -p "$1"
}

detect_node_distro() {
  local os arch
  case "$(uname -s)" in
    Linux) os="linux" ;;
    *)
      fail "Unsupported operating system for managed Node bootstrap: $(uname -s)"
      ;;
  esac

  case "$(uname -m)" in
    x86_64|amd64) arch="x64" ;;
    aarch64|arm64) arch="arm64" ;;
    *)
      fail "Unsupported CPU architecture for managed Node bootstrap: $(uname -m)"
      ;;
  esac

  printf 'node-v%s-%s-%s' "$TARGET_NODE_VERSION" "$os" "$arch"
}

sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
    return
  fi

  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
    return
  fi

  fail "Neither sha256sum nor shasum is available."
}

persist_local_bin_path() {
  local profile snippet
  snippet=$(cat <<'EOF'
# >>> tiltcheck cloud agent path >>>
if [ -d "$HOME/.local/bin" ] && [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
  export PATH="$HOME/.local/bin:$PATH"
fi
# <<< tiltcheck cloud agent path <<<
EOF
)

  for profile in "$HOME/.profile" "$HOME/.bashrc"; do
    if [[ ! -f "$profile" ]]; then
      touch "$profile"
    fi

    if ! grep -Fq "$PROFILE_BEGIN" "$profile"; then
      printf '\n%s\n' "$snippet" >> "$profile"
    fi
  done
}

ensure_managed_node() {
  local node_distro archive_name archive_path extracted_path temp_dir

  node_distro="$(detect_node_distro)"
  MANAGED_NODE_DIR="$TOOLS_DIR/$node_distro"
  MANAGED_NODE_BIN_DIR="$MANAGED_NODE_DIR/bin"
  archive_name="${node_distro}.tar.xz"
  archive_path="$DOWNLOADS_DIR/$archive_name"
  extracted_path="$TOOLS_DIR/$node_distro"

  ensure_directory "$TOOLS_DIR"
  ensure_directory "$DOWNLOADS_DIR"
  ensure_directory "$STATE_DIR"
  ensure_directory "$LOCAL_BIN_DIR"

  if [[ ! -x "$MANAGED_NODE_BIN_DIR/node" ]]; then
    if [[ ! -f "$archive_path" ]]; then
      log "Downloading managed Node $TARGET_NODE_VERSION..."
      if command -v curl >/dev/null 2>&1; then
        curl -fsSL "https://nodejs.org/dist/v${TARGET_NODE_VERSION}/${archive_name}" -o "$archive_path"
      elif command -v wget >/dev/null 2>&1; then
        wget -q "https://nodejs.org/dist/v${TARGET_NODE_VERSION}/${archive_name}" -O "$archive_path"
      else
        fail "Neither curl nor wget is available to download Node.js."
      fi
    fi

    temp_dir="$(mktemp -d "$TOOLS_DIR/node-extract.XXXXXX")"
    tar -xJf "$archive_path" -C "$temp_dir"
    rm -rf "$extracted_path"
    mv "$temp_dir/$node_distro" "$extracted_path"
    rm -rf "$temp_dir"
  fi

  ln -sfn "$MANAGED_NODE_BIN_DIR/node" "$LOCAL_BIN_DIR/node"
  ln -sfn "$MANAGED_NODE_BIN_DIR/npm" "$LOCAL_BIN_DIR/npm"
  ln -sfn "$MANAGED_NODE_BIN_DIR/npx" "$LOCAL_BIN_DIR/npx"
  ln -sfn "$MANAGED_NODE_BIN_DIR/corepack" "$LOCAL_BIN_DIR/corepack"

  export PATH="$LOCAL_BIN_DIR:$MANAGED_NODE_BIN_DIR:$PATH"
  persist_local_bin_path

  if [[ "$(node --version)" != v${TARGET_NODE_MAJOR}* ]]; then
    fail "Managed Node bootstrap did not activate the expected Node $TARGET_NODE_MAJOR runtime."
  fi
}

ensure_pnpm() {
  if ! command -v corepack >/dev/null 2>&1; then
    fail "corepack is unavailable after managed Node bootstrap."
  fi

  if corepack enable --install-directory "$LOCAL_BIN_DIR" >/dev/null 2>&1; then
    :
  else
    corepack enable >/dev/null 2>&1
  fi

  corepack prepare "pnpm@${TARGET_PNPM_VERSION}" --activate >/dev/null
  hash -r

  if [[ "$(pnpm --version)" != "$TARGET_PNPM_VERSION" ]]; then
    fail "Expected pnpm $TARGET_PNPM_VERSION but found $(pnpm --version)."
  fi
}

sync_workspace_dependencies() {
  local lock_hash fingerprint previous_fingerprint

  if [[ ! -f "$LOCKFILE" ]]; then
    fail "pnpm-lock.yaml not found at repository root."
  fi

  lock_hash="$(sha256_file "$LOCKFILE")"
  fingerprint="${lock_hash}|node=${TARGET_NODE_VERSION}|pnpm=${TARGET_PNPM_VERSION}"
  previous_fingerprint=""

  if [[ -f "$DEPENDENCY_STATE_FILE" ]]; then
    previous_fingerprint="$(tr -d '[:space:]' < "$DEPENDENCY_STATE_FILE")"
  fi

  if [[ -d "$ROOT_DIR/node_modules" && "$fingerprint" == "$previous_fingerprint" ]]; then
    log "Workspace dependencies already match lockfile and toolchain fingerprint."
    return
  fi

  log "Installing workspace dependencies for the current lockfile and toolchain..."
  pnpm install --frozen-lockfile
  printf '%s\n' "$fingerprint" > "$DEPENDENCY_STATE_FILE"
}

build_workspace_prerequisites() {
  log "Verifying vitest and jsdom toolchain..."
  pnpm vitest --version >/dev/null
  node -e "import('vitest'); import('jsdom');"

  log "Verifying TypeScript toolchain..."
  pnpm exec tsc --version >/dev/null

  log "Building workspace packages required by web and API flows..."
  pnpm --filter @tiltcheck/shared... build >/dev/null
  pnpm --filter @tiltcheck/auth build >/dev/null
  pnpm --filter @tiltcheck/db build >/dev/null
  pnpm --filter @tiltcheck/error-factory build >/dev/null

  log "Building trust-engine dependency graph..."
  pnpm --filter @tiltcheck/event-router... build >/dev/null
  pnpm --filter @tiltcheck/database... build >/dev/null
  pnpm --filter @tiltcheck/config... build >/dev/null
  pnpm --filter @tiltcheck/trust-engines build >/dev/null
}

seed_runtime_trust_state() {
  if [[ -f "$ROOT_DIR/data/trust-engine/remaining-sweepstakes-records.v3.json" ]]; then
    log "Seeding runtime trust data from scrape artifacts..."
    node "$ROOT_DIR/scripts/seed-casino-trust-from-scrape.js" \
      --include-existing \
      --output "$CACHE_ROOT/casino-trust.seeded.json" \
      --runtime-output "$ROOT_DIR/data/casino-trust.json" >/dev/null
    return
  fi

  log "No v3 scrape artifact found. Skipping trust seed generation."
}

verify_target_commands() {
  log "Verifying partner route test command..."
  pnpm --filter @tiltcheck/api exec vitest run tests/routes/partner.test.ts >/dev/null

  log "Verifying web typecheck prerequisite for Next build..."
  pnpm --filter web exec tsc --noEmit >/dev/null

  log "Verifying trust startup command..."
  pnpm trust:start >/dev/null
}

ensure_managed_node
ensure_pnpm
sync_workspace_dependencies
build_workspace_prerequisites
seed_runtime_trust_state
verify_target_commands

log "Cloud agent environment ready: Node ${TARGET_NODE_VERSION}, pnpm ${TARGET_PNPM_VERSION}, workspace deps, and target command prerequisites validated."
