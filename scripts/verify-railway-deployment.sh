#!/usr/bin/env bash
# ================================================================
# © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
# Created by jmenichole (https://github.com/jmenichole)
# 
# This file is part of the TiltCheck project.
# For licensing information, see LICENSE file in the project root.
# ================================================================

# TiltCheck Railway Deployment Verification Script
# Verifies all services are healthy and production-ready on Railway

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RAILWAY_DOMAIN="${RAILWAY_DOMAIN:-}"
REQUIRE_PRODUCTION="${REQUIRE_PRODUCTION:-true}"
VERBOSE="${VERBOSE:-false}"

# Service endpoints
LANDING_PORT="${LANDING_PORT:-8080}"
DASHBOARD_PORT="${DASHBOARD_PORT:-5055}"
BOT_PORT="${BOT_PORT:-8081}"
ROLLUP_PORT="${ROLLUP_PORT:-8082}"

# Health check settings
MAX_ATTEMPTS="${MAX_ATTEMPTS:-60}"
RETRY_INTERVAL="${RETRY_INTERVAL:-5}"

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Utility functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((PASSED++))
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
    ((WARNINGS++))
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((FAILED++))
}

have_jq() {
    command -v jq >/dev/null 2>&1
}

# Get Railway domain if not provided
get_railway_domain() {
    if [[ -z "$RAILWAY_DOMAIN" ]]; then
        if command -v railway >/dev/null 2>&1; then
            RAILWAY_DOMAIN=$(railway domain 2>/dev/null || echo "")
        fi
    fi
    
    if [[ -z "$RAILWAY_DOMAIN" ]]; then
        log_error "RAILWAY_DOMAIN not set and 'railway domain' failed"
        log_info "Set RAILWAY_DOMAIN environment variable or run 'railway link'"
        return 1
    fi
    
    log_info "Railway domain: $RAILWAY_DOMAIN"
    return 0
}

# Check if service is reachable and healthy
check_service() {
    local name="$1"
    local port="$2"
    local path="${3:-/health}"
    local url="https://${RAILWAY_DOMAIN}:${port}${path}"
    
    log_info "Checking $name at $url"
    
    local attempt=1
    local resp=""
    local http_code=""
    
    while (( attempt <= MAX_ATTEMPTS )); do
        if resp=$(curl -fsS -w "\n%{http_code}" "$url" 2>/dev/null); then
            http_code=$(echo "$resp" | tail -n1)
            resp=$(echo "$resp" | head -n-1)
            
            if [[ "$http_code" == "200" ]]; then
                break
            fi
        fi
        
        if (( attempt % 10 == 0 )); then
            log_info "Still waiting for $name... (attempt $attempt/$MAX_ATTEMPTS)"
        fi
        
        sleep "$RETRY_INTERVAL"
        ((attempt++))
    done
    
    if (( attempt > MAX_ATTEMPTS )); then
        log_error "$name unreachable after $MAX_ATTEMPTS attempts"
        return 1
    fi
    
    # Validate response
    if ! have_jq; then
        log_warning "jq not installed - cannot validate JSON response"
        log_success "$name is reachable (HTTP $http_code)"
        return 0
    fi
    
    # Pretty print if verbose
    if [[ "$VERBOSE" == "true" ]]; then
        echo "$resp" | jq .
    fi
    
    # Check status
    local status=$(echo "$resp" | jq -r '.status // empty')
    if [[ "$status" != "ok" ]]; then
        log_error "$name status is not 'ok': $status"
        return 1
    fi
    
    # Check ready flag
    local ready=$(echo "$resp" | jq -r '.ready // empty')
    if [[ "$ready" != "true" ]]; then
        if [[ "$REQUIRE_PRODUCTION" == "true" ]]; then
            log_error "$name is not ready: $ready"
            return 1
        else
            log_warning "$name is not ready: $ready"
        fi
    fi
    
    # Check service name matches
    local service=$(echo "$resp" | jq -r '.service // empty')
    if [[ -n "$service" ]]; then
        log_success "$name is healthy (service: $service, ready: $ready)"
    else
        log_success "$name is healthy (ready: $ready)"
    fi
    
    return 0
}

# Check environment configuration
check_environment() {
    log_info "Checking environment configuration..."
    
    if ! command -v railway >/dev/null 2>&1; then
        log_warning "Railway CLI not installed - skipping environment checks"
        return 0
    fi
    
    # Essential variables
    local required_vars=(
        "DISCORD_TOKEN"
        "DISCORD_CLIENT_ID"
        "DISCORD_GUILD_ID"
        "NODE_ENV"
    )
    
    local missing=()
    for var in "${required_vars[@]}"; do
        if ! railway variables get "$var" >/dev/null 2>&1; then
            missing+=("$var")
        fi
    done
    
    if (( ${#missing[@]} > 0 )); then
        log_error "Missing required environment variables: ${missing[*]}"
        return 1
    fi
    
    log_success "All required environment variables are set"
    
    # Check NODE_ENV is production
    local node_env=$(railway variables get NODE_ENV 2>/dev/null || echo "")
    if [[ "$node_env" != "production" ]] && [[ "$REQUIRE_PRODUCTION" == "true" ]]; then
        log_warning "NODE_ENV is not 'production': $node_env"
    fi
    
    # Optional but recommended
    local optional_vars=(
        "OPENAI_API_KEY"
        "SUPABASE_URL"
    )
    
    for var in "${optional_vars[@]}"; do
        if railway variables get "$var" >/dev/null 2>&1; then
            log_success "$var is configured"
        else
            log_warning "$var is not configured (optional)"
        fi
    done
    
    return 0
}

# Check Discord bot connectivity
check_discord_bot() {
    log_info "Checking Discord bot connection..."
    
    # First check health endpoint
    if ! check_service "discord-bot" "$BOT_PORT" "/health"; then
        return 1
    fi
    
    # TODO: Add Discord API check if credentials available
    log_info "Discord bot health check passed"
    log_info "Verify bot is online in your Discord server manually"
    
    return 0
}

# Check data sources
check_data_sources() {
    log_info "Checking data source configuration..."
    
    if ! command -v railway >/dev/null 2>&1; then
        log_warning "Railway CLI not installed - skipping data source checks"
        return 0
    fi
    
    # Check AI Gateway mode
    if railway variables get OPENAI_API_KEY >/dev/null 2>&1; then
        log_success "AI Gateway: Production mode (OpenAI API)"
    else
        log_warning "AI Gateway: Development mode (mock responses)"
    fi
    
    # Check Trust Rollup mode
    local use_mock=$(railway variables get USE_MOCK_TRUST_DATA 2>/dev/null || echo "true")
    if [[ "$use_mock" == "false" ]]; then
        if railway variables get CASINO_GURU_API_KEY >/dev/null 2>&1; then
            log_success "Trust Rollup: Production mode (real API data)"
        else
            log_warning "Trust Rollup: USE_MOCK_TRUST_DATA=false but no API keys set"
        fi
    else
        log_warning "Trust Rollup: Development mode (mock data)"
    fi
    
    return 0
}

# Main verification flow
main() {
    echo "=========================================="
    echo "TiltCheck Railway Deployment Verification"
    echo "=========================================="
    echo ""
    
    # Get Railway domain
    if ! get_railway_domain; then
        exit 1
    fi
    
    echo ""
    log_info "Starting health checks..."
    echo ""
    
    # Check environment
    check_environment
    echo ""
    
    # Check all services
    check_service "landing" "$LANDING_PORT" "/health"
    echo ""
    
    check_service "dashboard" "$DASHBOARD_PORT" "/api/health"
    echo ""
    
    check_discord_bot
    echo ""
    
    check_service "trust-rollup" "$ROLLUP_PORT" "/health"
    echo ""
    
    # Check data sources
    check_data_sources
    echo ""
    
    # Summary
    echo "=========================================="
    echo "Verification Summary"
    echo "=========================================="
    echo -e "${GREEN}Passed:${NC}   $PASSED"
    echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
    echo -e "${RED}Failed:${NC}   $FAILED"
    echo ""
    
    if (( FAILED > 0 )); then
        echo -e "${RED}✗ Verification FAILED${NC}"
        echo ""
        echo "Some checks failed. Review the errors above and:"
        echo "1. Check Railway logs: railway logs"
        echo "2. Verify environment variables: railway variables"
        echo "3. Check service status: railway status"
        exit 1
    elif (( WARNINGS > 0 )); then
        echo -e "${YELLOW}⚠ Verification PASSED with warnings${NC}"
        echo ""
        echo "All critical checks passed, but some warnings were found."
        echo "Review the warnings above for optimization opportunities."
        exit 0
    else
        echo -e "${GREEN}✓ Verification PASSED${NC}"
        echo ""
        echo "All checks passed! Your TiltCheck deployment is healthy."
        echo ""
        echo "Next steps:"
        echo "1. Test Discord bot: Go to your server and try /tiltcheck help"
        echo "2. Visit landing page: https://$RAILWAY_DOMAIN"
        echo "3. Monitor logs: railway logs --follow"
        exit 0
    fi
}

# Run main function
main "$@"
