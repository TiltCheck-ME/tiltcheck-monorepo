#!/bin/bash
# Validate that Docker Hub credentials are configured
# This script is used by CI/CD workflows before attempting Docker login

set -e

# Check if DOCKER_USERNAME is set and not empty
if [ -z "${DOCKER_USERNAME}" ]; then
  echo "::error::DOCKER_USERNAME secret is not configured."
  echo "::error::Please add DOCKER_USERNAME to your GitHub repository secrets."
  echo "::error::See .github/DOCKER_HUB_SETUP.md for setup instructions."
  exit 1
fi

# Check if DOCKER_PASSWORD is set and not empty
if [ -z "${DOCKER_PASSWORD}" ]; then
  echo "::error::DOCKER_PASSWORD secret is not configured."
  echo "::error::Please add DOCKER_PASSWORD to your GitHub repository secrets."
  echo "::error::See .github/DOCKER_HUB_SETUP.md for setup instructions."
  exit 1
fi

echo "✅ Docker Hub credentials are configured"
exit 0
