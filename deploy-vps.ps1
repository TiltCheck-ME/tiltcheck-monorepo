# ================================================================
# TiltCheck VPS Deployment Automator (PowerShell Version)
# ================================================================

$VPS_IP = "85.209.95.175"
$VPS_USER = "jme"
$REMOTE_PATH = "/home/jme/tiltcheck-monorepo"

Write-Host "🚀 Preparing deployment to TiltCheck VPS ($VPS_IP)..." -ForegroundColor Cyan

# 1. Sync the environment file (Master config)
Write-Host "📡 Syncing .env to VPS..." -ForegroundColor Yellow
# Note: This assumes you have rsync or scp in your path (standard with Git for Windows)
scp .env "$($VPS_USER)@$($VPS_IP):$($REMOTE_PATH)/.env"

# 2. Trigger the remote build
Write-Host "🏗️  Starting remote build and restart via Docker Compose..." -ForegroundColor Yellow
ssh "$($VPS_USER)@$($VPS_IP)" "cd $($REMOTE_PATH) && git pull origin main && docker compose pull && docker compose up -d --build && docker image prune -f"

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "📡 Monitoring logs: ssh $($VPS_USER)@$($VPS_IP) 'cd $($REMOTE_PATH) && docker compose logs -f'"
