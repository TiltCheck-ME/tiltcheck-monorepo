#!/usr/bin/env bash
# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly MAX_ROOT_MARKDOWN_FILES=8
readonly ALLOWED_ROOT_MARKDOWN_FILES=(
  "0-FULL-BUILD-GUIDE.md"
  "AGENTS.md"
  "CHANGELOG.md"
  "CONTRIBUTING.md"
  "QUICKSTART.md"
  "README.md"
  "SECURITY.md"
  "TODO.md"
)

cd "$REPO_ROOT"

mapfile -t root_markdown_files < <(python3 - <<'PY'
from pathlib import Path

for path in sorted(Path(".").iterdir()):
    if path.is_file() and path.suffix.lower() == ".md":
        print(path.name)
PY
)

declare -A allowed_lookup=()
for file in "${ALLOWED_ROOT_MARKDOWN_FILES[@]}"; do
  allowed_lookup["$file"]=1
done

unexpected_files=()
for file in "${root_markdown_files[@]}"; do
  if [[ -z "${allowed_lookup[$file]:-}" ]]; then
    unexpected_files+=("$file")
  fi
done

if (( ${#root_markdown_files[@]} > MAX_ROOT_MARKDOWN_FILES )); then
  echo "Root cleanliness check failed: found ${#root_markdown_files[@]} root markdown files; max allowed is ${MAX_ROOT_MARKDOWN_FILES}."
  printf 'Current root markdown files:\n'
  printf ' - %s\n' "${root_markdown_files[@]}"
  exit 1
fi

if (( ${#unexpected_files[@]} > 0 )); then
  echo "Root cleanliness check failed: unexpected root markdown files detected."
  printf 'Unexpected files:\n'
  printf ' - %s\n' "${unexpected_files[@]}"
  printf 'Archive historical docs under docs/history/ or extend the allowlist deliberately.\n'
  exit 1
fi

echo "Root cleanliness check passed: ${#root_markdown_files[@]} root markdown files within limit ${MAX_ROOT_MARKDOWN_FILES}."
