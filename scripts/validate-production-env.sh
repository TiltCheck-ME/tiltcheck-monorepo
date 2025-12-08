#!/usr/bin/env bash
# TiltCheck Production Environment Validation Script
# Validates environment variables and configuration for production deployment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if Railway CLI is available
check_railway_cli() {
    if ! command -v railway >/dev/null 2>&1; then
        log_error "Railway CLI not installed"
        log_info "Install with: npm install -g @railway/cli"
        return 1
    fi
    log_success "Railway CLI is installed"
    return 0
}

# Check if logged into Railway
check_railway_auth() {
    if ! railway whoami >/dev/null 2>&1; then
        log_error "Not logged into Railway"
        log_info "Login with: railway login"
        return 1
    fi
    local user=$(railway whoami)
    log_success "Logged into Railway as: $user"
    return 0
}

# Check if project is linked
check_railway_project() {
    if ! railway status >/dev/null 2>&1; then
        log_error "No Railway project linked"
        log_info "Link project with: railway link"
        return 1
    fi
    log_success "Railway project is linked"
    return 0
}

# Validate environment variable exists
check_var() {
    local var_name="$1"
    local required="${2:-false}"
    local description="${3:-}"
    
    if railway variables get "$var_name" >/dev/null 2>&1; then
        local value=$(railway variables get "$var_name")
        # Hide sensitive values
        if [[ "$var_name" =~ (TOKEN|KEY|SECRET|PASSWORD) ]]; then
            value="***${value: -4}"
        fi
        log_success "$var_name is set ($value)"
        return 0
    else
        if [[ "$required" == "true" ]]; then
            log_error "$var_name is not set (REQUIRED) - $description"
            return 1
        else
            log_warning "$var_name is not set (optional) - $description"
            return 0
        fi
    fi
}

# Validate environment variable format
check_var_format() {
    local var_name="$1"
    local pattern="$2"
    local description="$3"
    
    if ! railway variables get "$var_name" >/dev/null 2>&1; then
        return 0  # Skip if not set
    fi
    
    local value=$(railway variables get "$var_name")
    if [[ ! "$value" =~ $pattern ]]; then
        log_error "$var_name has invalid format - $description"
        return 1
    fi
    
    log_success "$var_name format is valid"
    return 0
}

# Validate environment variable length
check_var_length() {
    local var_name="$1"
    local min_length="$2"
    local description="$3"
    
    if ! railway variables get "$var_name" >/dev/null 2>&1; then
        return 0  # Skip if not set
    fi
    
    local value=$(railway variables get "$var_name")
    if (( ${#value} < min_length )); then
        log_error "$var_name is too short (min: $min_length) - $description"
        return 1
    fi
    
    log_success "$var_name length is valid (>=$min_length)"
    return 0
}

# Check Discord configuration
check_discord_config() {
    log_info "Validating Discord configuration..."
    
    check_var "DISCORD_TOKEN" "true" "Discord bot authentication token"
    check_var_format "DISCORD_TOKEN" "^[A-Za-z0-9_\.-]{50,}" "Should be at least 50 characters (Discord bot token)"
    
    check_var "DISCORD_CLIENT_ID" "true" "Discord application client ID"
    check_var_format "DISCORD_CLIENT_ID" "^[0-9]{17,19}$" "Should be 17-19 digit snowflake ID"
    
    check_var "DISCORD_CLIENT_SECRET" "false" "Discord OAuth client secret (needed for OAuth)"
    
    check_var "DISCORD_GUILD_ID" "false" "Discord server ID for slash commands"
    check_var_format "DISCORD_GUILD_ID" "^[0-9]{17,19}$" "Should be 17-19 digit snowflake ID"
    
    echo ""
}

# Check application configuration
check_app_config() {
    log_info "Validating application configuration..."
    
    check_var "NODE_ENV" "true" "Application environment"
    if railway variables get "NODE_ENV" >/dev/null 2>&1; then
        local node_env=$(railway variables get "NODE_ENV")
        if [[ "$node_env" != "production" ]]; then
            log_warning "NODE_ENV is '$node_env', should be 'production' for production deployment"
        fi
    fi
    
    check_var "PORT" "false" "Main application port (default: 8080)"
    check_var "LANDING_LOG_PATH" "false" "Landing page request log path"
    
    echo ""
}

# Check security configuration
check_security_config() {
    log_info "Validating security configuration..."
    
    check_var "ADMIN_IP_1" "false" "Primary admin IP for landing page access"
    check_var_format "ADMIN_IP_1" "^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$" "Should be valid IPv4 address"
    
    check_var "ADMIN_IP_2" "false" "Secondary admin IP"
    check_var "ADMIN_IP_3" "false" "Tertiary admin IP"
    
    # Warn if no admin IPs set
    if ! railway variables get "ADMIN_IP_1" >/dev/null 2>&1; then
        log_warning "No admin IPs configured - landing page will be publicly accessible"
    fi
    
    echo ""
}

# Check AI Gateway configuration
check_ai_config() {
    log_info "Validating AI Gateway configuration..."
    
    check_var "OPENAI_API_KEY" "false" "OpenAI API key for production AI features"
    check_var_format "OPENAI_API_KEY" "^sk-[A-Za-z0-9_-]{20,}$" "Should start with 'sk-' and contain valid characters"
    
    check_var "OPENAI_MODEL" "false" "OpenAI model selection (default: gpt-4o-mini)"
    
    if ! railway variables get "OPENAI_API_KEY" >/dev/null 2>&1; then
        log_warning "AI Gateway will use mock responses (no OPENAI_API_KEY)"
        log_info "Set OPENAI_API_KEY for production AI features"
    else
        log_success "AI Gateway configured for production mode"
    fi
    
    echo ""
}

# Check Trust Rollup configuration
check_trust_config() {
    log_info "Validating Trust Rollup configuration..."
    
    check_var "USE_MOCK_TRUST_DATA" "false" "Use mock trust data (default: true)"
    
    check_var "CASINO_GURU_API_KEY" "false" "CasinoGuru API key for RTP data"
    check_var "ASKGAMBLERS_API_KEY" "false" "AskGamblers API key for complaints"
    
    local use_mock="true"
    if railway variables get "USE_MOCK_TRUST_DATA" >/dev/null 2>&1; then
        use_mock=$(railway variables get "USE_MOCK_TRUST_DATA")
    fi
    
    if [[ "$use_mock" == "false" ]]; then
        if ! railway variables get "CASINO_GURU_API_KEY" >/dev/null 2>&1; then
            log_warning "USE_MOCK_TRUST_DATA=false but no CASINO_GURU_API_KEY set"
        fi
        if ! railway variables get "ASKGAMBLERS_API_KEY" >/dev/null 2>&1; then
            log_warning "USE_MOCK_TRUST_DATA=false but no ASKGAMBLERS_API_KEY set"
        fi
    else
        log_warning "Trust Rollup will use mock data"
        log_info "Set USE_MOCK_TRUST_DATA=false and API keys for real data"
    fi
    
    echo ""
}

# Check database configuration
check_database_config() {
    log_info "Validating database configuration..."
    
    check_var "SUPABASE_URL" "false" "Supabase project URL"
    check_var_format "SUPABASE_URL" "^https://[a-z0-9-]+\.supabase\.co$" "Should be https://project.supabase.co"
    
    check_var "SUPABASE_ANON_KEY" "false" "Supabase public anon key"
    check_var_length "SUPABASE_ANON_KEY" 100 "Should be long JWT token"
    
    check_var "SUPABASE_SERVICE_ROLE_KEY" "false" "Supabase service role key (keep secret!)"
    check_var_length "SUPABASE_SERVICE_ROLE_KEY" 100 "Should be long JWT token"
    
    if ! railway variables get "SUPABASE_URL" >/dev/null 2>&1; then
        log_warning "No Supabase database configured"
        log_info "Data will not persist across restarts"
        log_info "Set SUPABASE_* variables for persistent storage"
    else
        log_success "Supabase database configured"
    fi
    
    echo ""
}

# Check optional services
check_optional_services() {
    log_info "Validating optional services..."
    
    check_var "CHANGENOW_API_KEY" "false" "ChangeNOW API for LTC bridge"
    check_var "STRIPE_SECRET_KEY" "false" "Stripe secret key for subscriptions"
    check_var "STRIPE_PUBLIC_KEY" "false" "Stripe public key"
    check_var "STRIPE_WEBHOOK_SECRET" "false" "Stripe webhook signing secret"
    check_var "DISCORD_WEBHOOK_URL" "false" "Discord webhook for system alerts"
    
    echo ""
}

# Check health endpoints
check_health_ports() {
    log_info "Validating health check port configuration..."
    
    check_var "DISCORD_BOT_HEALTH_PORT" "false" "Discord bot health check port (default: 8081)"
    check_var "EVENT_ROUTER_HEALTH_PORT" "false" "Event router health check port (default: 8082)"
    
    echo ""
}

# Check for common misconfigurations
check_common_issues() {
    log_info "Checking for common misconfigurations..."
    
    # Check if using default/example values
    if railway variables get "DISCORD_TOKEN" >/dev/null 2>&1; then
        local token=$(railway variables get "DISCORD_TOKEN")
        if [[ "$token" == "your_discord_bot_token_here" ]] || [[ "$token" == "YOUR_TOKEN_HERE" ]]; then
            log_error "DISCORD_TOKEN appears to be a placeholder value"
        fi
    fi
    
    # Check for test/development values in production
    if railway variables get "NODE_ENV" >/dev/null 2>&1; then
        local env=$(railway variables get "NODE_ENV")
        if [[ "$env" =~ ^(development|dev|test)$ ]]; then
            log_error "NODE_ENV is set to '$env' - should be 'production'"
        fi
    fi
    
    # Check for localhost URLs
    if railway variables get "SUPABASE_URL" >/dev/null 2>&1; then
        local url=$(railway variables get "SUPABASE_URL")
        if [[ "$url" =~ localhost ]]; then
            log_error "SUPABASE_URL contains 'localhost' - should be production URL"
        fi
    fi
    
    echo ""
}

# Provide recommendations
provide_recommendations() {
    log_info "Production readiness recommendations:"
    
    echo ""
    echo "📊 Monitoring:"
    echo "   - Set up UptimeRobot for health monitoring"
    echo "   - Configure OpenAI usage alerts"
    echo "   - Enable Railway deployment notifications"
    
    echo ""
    echo "💰 Cost Optimization:"
    echo "   - Use gpt-4o-mini for AI (most cost-efficient)"
    echo "   - Enable caching to reduce API calls"
    echo "   - Monitor monthly spending in dashboards"
    
    echo ""
    echo "🔒 Security:"
    echo "   - Rotate API keys regularly"
    echo "   - Use different keys for dev/prod"
    echo "   - Enable 2FA on all service accounts"
    echo "   - Never commit secrets to git"
    
    echo ""
    echo "📚 Documentation:"
    echo "   - docs/PRODUCTION-RUNBOOK.md - Operations guide"
    echo "   - docs/PRODUCTION-MONITORING.md - Monitoring setup"
    echo "   - docs/RAILWAY-DEPLOYMENT-GUIDE.md - Deployment guide"
    
    echo ""
}

# Main validation flow
main() {
    echo "=========================================="
    echo "TiltCheck Production Environment Validation"
    echo "=========================================="
    echo ""
    
    # Check Railway CLI setup
    if ! check_railway_cli; then
        exit 1
    fi
    
    if ! check_railway_auth; then
        exit 1
    fi
    
    if ! check_railway_project; then
        exit 1
    fi
    
    echo ""
    log_info "Starting environment validation..."
    echo ""
    
    # Run all validation checks
    check_discord_config
    check_app_config
    check_security_config
    check_ai_config
    check_trust_config
    check_database_config
    check_optional_services
    check_health_ports
    check_common_issues
    
    # Summary
    echo "=========================================="
    echo "Validation Summary"
    echo "=========================================="
    echo -e "${GREEN}Passed:${NC}   $PASSED"
    echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
    echo -e "${RED}Failed:${NC}   $FAILED"
    echo ""
    
    # Recommendations
    provide_recommendations
    
    # Exit code
    if (( FAILED > 0 )); then
        echo -e "${RED}✗ Validation FAILED${NC}"
        echo ""
        echo "Fix the errors above before deploying to production."
        echo "See docs/RAILWAY-DEPLOYMENT-GUIDE.md for configuration help."
        exit 1
    elif (( WARNINGS > 0 )); then
        echo -e "${YELLOW}⚠ Validation PASSED with warnings${NC}"
        echo ""
        echo "All required configuration is valid, but some optional features are not configured."
        echo "Review warnings above to enable additional features."
        exit 0
    else
        echo -e "${GREEN}✓ Validation PASSED${NC}"
        echo ""
        echo "All configuration is valid! Ready for production deployment."
        echo ""
        echo "Next steps:"
        echo "1. Deploy: railway up"
        echo "2. Verify: bash scripts/verify-railway-deployment.sh"
        echo "3. Monitor: railway logs --follow"
        exit 0
    fi
}

# Run main function
main "$@"
