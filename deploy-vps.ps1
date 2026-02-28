# ================================================================
# TiltCheck VPS Deployment Automator (Ultra-Clean Version)
# ================================================================

$VPS_IP = "85.209.95.175"
$VPS_USER = "jme"
$REMOTE_PATH = "/home/jme/tiltcheck-monorepo"

Write-Host "Starting deployment to VPS: $VPS_IP"

# 1. Sync the environment file
Write-Host "Syncing .env..."
$remoteTarget = $VPS_USER + "@" + $VPS_IP + ":" + $REMOTE_PATH + "/.env"
scp .env $remoteTarget

# 2. Build the remote command
# We use semicolons for multiple commands on the remote Linux server
$c1 = "cd " + $REMOTE_PATH
$c2 = "git pull origin main"
$c3 = "docker compose pull"
$c4 = "docker compose up -d --build"
$c5 = "docker image prune -f"

$allCmds = "$c1; $c2; $c3; $c4; $c5"

Write-Host "Executing remote build..."
$sshTarget = $VPS_USER + "@" + $VPS_IP
ssh $sshTarget $allCmds

Write-Host "Deployment finished!"
Write-Host "To view logs, run: ssh $sshTarget 'cd $REMOTE_PATH && docker compose logs -f'"
