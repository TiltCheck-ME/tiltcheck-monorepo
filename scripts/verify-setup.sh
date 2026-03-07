#!/usr/bin/env bash
# ================================================================
# © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
# Created by jmenichole (https://github.com/jmenichole)
# 
# This file is part of the TiltCheck project.
# For licensing information, see LICENSE file in the project root.
# ================================================================

#
# verify-setup.sh - Verifies TiltCheck development environment setup
#
# This script checks:
# - Required tools (node, pnpm, git)
# - Required environment variables
# - Port availability
# - Supabase connectivity
# - Discord bot token validity
#
# Usage: bash scripts/verify-setup.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
print_success() {
  echo -e "${GREEN}✓${NC} $1"
  ((PASSED++))
}

print_error() {
  echo -e "${RED}✗${NC} $1"
  ((FAILED++))
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
  ((WARNINGS++))
}

print_info() {
  echo -e "  $1"
}

# Header
echo "========================================="
echo "TiltCheck Setup Verification"
echo "========================================="
echo ""

# 1. CHECK REQUIRED TOOLS
echo "Checking required tools..."

# Node.js
if command -v node &> /dev/null; then
  NODE_VERSION=$(node --version)
  NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'.' -f1 | sed 's/v//')
  if [ "$NODE_MAJOR" -ge 18 ]; then
    print_success "Node.js $NODE_VERSION (requires >=18.0.0)"
  else
    print_error "Node.js version too old: $NODE_VERSION (requires >=18.0.0)"
  fi
else
  print_error "Node.js not found (install from https://nodejs.org/)"
fi

# pnpm
if command -v pnpm &> /dev/null; then
  PNPM_VERSION=$(pnpm --version)
  PNPM_MAJOR=$(echo "$PNPM_VERSION" | cut -d'.' -f1)
  if [ "$PNPM_MAJOR" -ge 9 ]; then
    print_success "pnpm $PNPM_VERSION (requires >=9.0.0)"
  else
    print_error "pnpm version too old: $PNPM_VERSION (requires >=9.0.0)"
  fi
else
  print_error "pnpm not found (install with: npm install -g pnpm)"
fi

# Git
if command -v git &> /dev/null; then
  GIT_VERSION=$(git --version | awk '{print $3}')
  print_success "Git $GIT_VERSION"
else
  print_error "Git not found (install from https://git-scm.com/)"
fi

echo ""

# 2. CHECK ENVIRONMENT VARIABLES
echo "Checking required environment variables..."

# Load .env file if it exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
  print_info "Loaded .env file"
else
  print_warning ".env file not found (copy from .env.template)"
fi

# Required variables
REQUIRED_VARS=(
  "DISCORD_TOKEN"
  "DISCORD_CLIENT_ID"
  "DISCORD_CLIENT_SECRET"
  "SUPABASE_URL"
  "SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "JWT_SECRET"
  "SESSION_SECRET"
  "SOLANA_RPC_URL"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    print_error "$var is not set"
  else
    # Check minimum length for secrets
    if [[ ( "$var" == *"SECRET"* || "$var" == *"KEY"* ) && "$var" != *"CLIENT_ID"* ]]; then
      VAR_LENGTH=${#!var}
      if [ "$VAR_LENGTH" -ge 32 ]; then
        print_success "$var is set (length: $VAR_LENGTH)"
      else
        print_warning "$var is set but may be too short (length: $VAR_LENGTH, recommended: >=32)"
      fi
    else
      print_success "$var is set"
    fi
  fi
done

echo ""

# 3. CHECK PORT AVAILABILITY
echo "Checking port availability..."

check_port() {
  local port=$1
  local service=$2
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_warning "Port $port ($service) is already in use"
  else
    print_success "Port $port ($service) is available"
  fi
}

check_port 3000 "Landing Page"
check_port 3001 "API Gateway / Control Room"
check_port 5055 "Dashboard"
check_port 8080 "QualifyFirst"
check_port 8081 "Discord Bot Health"
check_port 8082 "DA&D Bot Health"
check_port 6002 "Casino Data API"

echo ""

# 4. CHECK SUPABASE CONNECTIVITY
echo "Checking Supabase connectivity..."

if [ -n "$SUPABASE_URL" ]; then
  # Simple HTTP check to Supabase
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SUPABASE_URL/rest/v1/" -H "apikey: $SUPABASE_ANON_KEY" 2>/dev/null || echo "000")
  
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "404" ]; then
    print_success "Supabase is reachable (HTTP $HTTP_CODE)"
  else
    print_error "Supabase connectivity failed (HTTP $HTTP_CODE)"
  fi
else
  print_error "SUPABASE_URL not set, skipping connectivity check"
fi

echo ""

# 5. CHECK DISCORD BOT TOKEN VALIDITY
echo "Checking Discord bot token..."

if [ -n "$DISCORD_TOKEN" ]; then
  # Try to get bot user info (using temp file to avoid token in process list)
  TEMP_HEADER=$(mktemp)
  echo "Authorization: Bot $DISCORD_TOKEN" > "$TEMP_HEADER"
  BOT_INFO=$(curl -s -H @"$TEMP_HEADER" https://discord.com/api/v10/users/@me 2>/dev/null || echo "{}")
  rm -f "$TEMP_HEADER"
  
  if echo "$BOT_INFO" | grep -q '"id"'; then
    BOT_USERNAME=$(echo "$BOT_INFO" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
    print_success "Discord bot token is valid (username: $BOT_USERNAME)"
  else
    ERROR_MSG=$(echo "$BOT_INFO" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$ERROR_MSG" ]; then
      print_error "Discord bot token is invalid: $ERROR_MSG"
    else
      print_error "Discord bot token validation failed"
    fi
  fi
else
  print_error "DISCORD_TOKEN not set, skipping validation"
fi

echo ""

# 6. CHECK OPTIONAL BUT RECOMMENDED
echo "Checking optional configurations..."

OPTIONAL_VARS=(
  "OPENAI_API_KEY"
  "SENTRY_DSN"
  "LOGFLARE_API_KEY"
)

for var in "${OPTIONAL_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    print_info "$var not set (optional, but recommended for production)"
  else
    print_success "$var is set"
  fi
done

echo ""

# 7. SUMMARY
echo "========================================="
echo "Verification Summary"
echo "========================================="
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "${RED}Failed:${NC} $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
  if [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Your environment is ready.${NC}"
    exit 0
  else
    echo -e "${YELLOW}⚠ Setup is mostly complete, but there are some warnings to address.${NC}"
    exit 0
  fi
else
  echo -e "${RED}✗ Some checks failed. Please fix the errors above before proceeding.${NC}"
  echo ""
  echo "Quick fixes:"
  echo "  - Install missing tools"
  echo "  - Copy .env.template to .env and fill in required values"
  echo "  - Generate strong secrets (min 32 characters) for JWT_SECRET and SESSION_SECRET"
  echo "  - Verify your Supabase and Discord credentials"
  exit 1
fi
