# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-08
# One-shot script: reads local .env/.env.local and pushes all required vars to Railway
# via GraphQL API. Sets shared vars at environment level, then SERVICE_ID per service.
#
# Usage:
#   $env:RAILWAY_TOKEN = "your-token-here"
#   .\scripts\push-railway-vars.ps1

param(
    [string]$Token = $env:RAILWAY_TOKEN
)

if (-not $Token) {
    Write-Error "RAILWAY_TOKEN not set. Run: `$env:RAILWAY_TOKEN = 'your-token'"
    exit 1
}

$PROJECT_ID  = "e48fdf5a-7857-4c69-a578-1ce8fa10d93e"
$ENV_ID      = "3558050f-0c00-4ba7-8763-e960a1ecaf96"
$API_URL     = "https://backboard.railway.app/graphql/v2"

$headers = @{
    Authorization = "Bearer $Token"
    "Content-Type" = "application/json"
}

# ── Helper: upsert one variable (environment-level or service-level) ──────────
function Set-RailwayVar {
    param([string]$Name, [string]$Value, [string]$ServiceId = $null)

    $input = @{
        projectId     = $PROJECT_ID
        environmentId = $ENV_ID
        name          = $Name
        value         = $Value
    }
    if ($ServiceId) { $input.serviceId = $ServiceId }

    $body = @{
        query     = 'mutation($input: VariableUpsertInput!) { variableUpsert(input: $input) }'
        variables = @{ input = $input }
    } | ConvertTo-Json -Depth 10

    try {
        $resp = Invoke-RestMethod -Uri $API_URL -Method Post -Headers $headers -Body $body -ErrorAction Stop
        if ($resp.errors) {
            Write-Host "  WARN  $Name : $($resp.errors[0].message)"
            return $false
        }
        return $true
    } catch {
        Write-Host "  ERROR $Name : $_"
        return $false
    }
}

# ── Step 1: Query project for service IDs ─────────────────────────────────────
Write-Host "`n[1/3] Fetching Railway service IDs..."

$query = @{
    query = @"
query {
  project(id: "$PROJECT_ID") {
    services {
      edges {
        node { id name }
      }
    }
  }
}
"@
} | ConvertTo-Json

$proj = Invoke-RestMethod -Uri $API_URL -Method Post -Headers $headers -Body $query -ErrorAction Stop
if ($proj.errors) {
    Write-Error "Failed to query project: $($proj.errors[0].message)"
    exit 1
}

$services = @{}
foreach ($edge in $proj.data.project.services.edges) {
    $services[$edge.node.name] = $edge.node.id
    Write-Host "  Found service: $($edge.node.name) ($($edge.node.id))"
}

# ── Step 2: Load and merge .env files ─────────────────────────────────────────
Write-Host "`n[2/3] Loading local .env files..."

$envVars = @{}
$root = Split-Path $PSScriptRoot -Parent
foreach ($file in @("$root\.env", "$root\.env.local")) {
    if (Test-Path $file) {
        foreach ($line in (Get-Content $file)) {
            if ($line -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$') {
                $envVars[$matches[1]] = $matches[2].Trim().Trim('"').Trim("'")
            }
        }
        Write-Host "  Loaded: $file"
    }
}

# Vars to push at environment (shared) level
$sharedKeys = @(
    'JWT_SECRET','SERVICE_JWT_SECRET',
    'SOLANA_RPC_URL','SOLANA_NETWORK',
    'SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_PUBLISHABLE_KEY',
    'NODE_ENV',
    'TILT_DISCORD_BOT_TOKEN','TILT_DISCORD_CLIENT_ID','TILT_DISCORD_CLIENT_SECRET',
    'TILT_DISCORD_REDIRECT_URI','TILT_DISCORD_GUILD_ID','TILT_DISCORD_BOT_INVITE_LINK',
    'DAD_DISCORD_BOT_TOKEN','DAD_DISCORD_CLIENT_ID',
    'DATABASE_URL','NEON_DATABASE_URL',
    'SESSION_SECRET','COOKIE_DOMAIN','COOKIE_SECURE','COOKIE_MAX_AGE',
    'ALLOWED_ORIGINS','PUBLIC_BASE_URL','API_URL','DASHBOARD_URL',
    'TILTCHECK_API_URL','BACKEND_URL','NEXT_PUBLIC_BACKEND_URL','WS_URL',
    'VITE_API_URL','VITE_SOLANA_RPC_URL',
    'JUSTTHETIP_FEE_WALLET','TIP_FEE_WALLET','TIP_TREASURY_WALLET',
    'JUPITER_API_KEY','JUPITER_ENDPOINT',
    'TRUST_THRESHOLD','LOG_LEVEL','SUSLINK_AUTO_SCAN',
    'DATABASE_POOL_SIZE',
    'ADMIN_PASSWORD','SESSION_COOKIE_NAME',
    'COMMUNITY_INTEL_INGEST_KEY','NEWSLETTER_SALT',
    'MOD_CHANNEL_ID','MOD_NOTIFICATIONS_ENABLED','MOD_ROLE_ID',
    'SUPPORT_CHANNEL_ID','TRUST_ALERTS_CHANNEL_ID','DEMO_USER_ID',
    'OLLAMA_URL','OLLAMA_MODEL','AI_MODEL','AI_PROVIDER',
    'PORT'
)

# DATABASE_SSL must be 'true' string (config transforms it)
if (-not $envVars.ContainsKey('DATABASE_SSL')) { $envVars['DATABASE_SSL'] = 'true' }
$sharedKeys += 'DATABASE_SSL'

# ── Step 3: Push shared vars ──────────────────────────────────────────────────
Write-Host "`n[3/3] Pushing shared vars to Railway environment..."

$ok = 0; $skip = 0; $fail = 0
foreach ($key in $sharedKeys) {
    if (-not $envVars.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($envVars[$key])) {
        Write-Host "  SKIP  $key (not in .env)"
        $skip++
        continue
    }
    $result = Set-RailwayVar -Name $key -Value $envVars[$key]
    if ($result) { Write-Host "  SET   $key"; $ok++ } else { $fail++ }
}

# ── Step 4: Set SERVICE_ID per service ────────────────────────────────────────
Write-Host "`nSetting SERVICE_ID per service..."

# Map Railway service names to logical SERVICE_ID values
$serviceIdMap = @{
    'api'            = 'api'
    '@tiltcheck/api' = 'api'
    'discord-bot'    = 'discord-bot'
    'web'            = 'web'
    'trust-rollup'   = 'trust-rollup'
    'game-arena'     = 'game-arena'
    'control-room'   = 'control-room'
    'user-dashboard' = 'user-dashboard'
    'activity'       = 'activity'
    '@tiltcheck/activity' = 'activity'
}

foreach ($svcName in $services.Keys) {
    $svcId = $services[$svcName]
    $logicalId = if ($serviceIdMap.ContainsKey($svcName)) { $serviceIdMap[$svcName] } else { $svcName }
    $result = Set-RailwayVar -Name 'SERVICE_ID' -Value $logicalId -ServiceId $svcId
    if ($result) { Write-Host "  SET   SERVICE_ID=$logicalId for '$svcName'" }
}

Write-Host "`n=== Done: $ok set, $skip skipped, $fail failed ==="
Write-Host "All services will pick up new vars on next deploy/restart."
Write-Host "Trigger a redeploy from Railway dashboard or re-run the deploy workflow."
