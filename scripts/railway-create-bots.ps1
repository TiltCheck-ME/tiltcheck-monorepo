# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
# Creates justthetip-bot and dad-bot services in Railway via GraphQL API,
# then patches deploy-railway.yml with the returned service IDs.

$PROJECT_ID   = "e48fdf5a-7857-4c69-a578-1ce8fa10d93e"
$ENV_ID       = "3558050f-0c00-4ba7-8763-e960a1ecaf96"
$API_URL      = "https://backboard.railway.com/graphql/v2"
$GHCR_OWNER   = "tiltcheck-me"
$WORKFLOW     = Join-Path $PSScriptRoot "..\\.github\\workflows\\deploy-railway.yml"

$token = $env:RAILWAY_TOKEN
if (-not $token) {
    $secureToken = Read-Host "Enter RAILWAY_TOKEN" -AsSecureString
    $token = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
    )
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

function Invoke-RailwayGQL($query) {
    $body = @{ query = $query } | ConvertTo-Json -Compress
    $resp = Invoke-RestMethod -Uri $API_URL -Method POST -Headers $headers -Body $body
    if ($resp.errors) {
        Write-Error "GraphQL error: $($resp.errors | ConvertTo-Json)"
        exit 1
    }
    return $resp.data
}

# --- Step 1: Create services ---

Write-Host "`nCreating justthetip-bot service..."
$jttData = Invoke-RailwayGQL @"
mutation {
  serviceCreate(input: { projectId: "$PROJECT_ID", name: "justthetip-bot" }) {
    id
    name
  }
}
"@
$jttId = $jttData.serviceCreate.id
Write-Host "  Created: $jttId"

Write-Host "`nCreating dad-bot service..."
$dadData = Invoke-RailwayGQL @"
mutation {
  serviceCreate(input: { projectId: "$PROJECT_ID", name: "dad-bot" }) {
    id
    name
  }
}
"@
$dadId = $dadData.serviceCreate.id
Write-Host "  Created: $dadId"

# --- Step 2: Set GHCR image source ---

Write-Host "`nSetting image source for justthetip-bot..."
Invoke-RailwayGQL @"
mutation {
  serviceInstanceUpdate(
    serviceId: "$jttId",
    environmentId: "$ENV_ID",
    input: { source: { image: "ghcr.io/$GHCR_OWNER/tiltcheck-justthetip-bot:latest" } }
  )
}
"@ | Out-Null

Write-Host "Setting image source for dad-bot..."
Invoke-RailwayGQL @"
mutation {
  serviceInstanceUpdate(
    serviceId: "$dadId",
    environmentId: "$ENV_ID",
    input: { source: { image: "ghcr.io/$GHCR_OWNER/tiltcheck-dad-bot:latest" } }
  )
"@ | Out-Null

# --- Step 3: Patch deploy-railway.yml ---

Write-Host "`nPatching deploy-railway.yml..."
$yml = Get-Content $WORKFLOW -Raw

# Add to build matrix
$buildInsert = "          - activity`n          - cloudflared"
$buildReplace = "          - activity`n          - cloudflared`n          - justthetip-bot`n          - dad-bot"
$yml = $yml.Replace($buildInsert, $buildReplace)

# Add to deploy matrix
$deployInsert = @"
          - service: cloudflared
            railway_service_id: "18649391-7fe0-43a7-9a79-c4c3bf432eb8"
"@
$deployReplace = @"
          - service: cloudflared
            railway_service_id: "18649391-7fe0-43a7-9a79-c4c3bf432eb8"
          - service: justthetip-bot
            railway_service_id: "$jttId"
          - service: dad-bot
            railway_service_id: "$dadId"
"@
$yml = $yml.Replace($deployInsert, $deployReplace)

Set-Content $WORKFLOW $yml -NoNewline
Write-Host "  Workflow updated."

Write-Host "`nDone."
Write-Host "  justthetip-bot service ID : $jttId"
Write-Host "  dad-bot service ID        : $dadId"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Add JTT_DISCORD_BOT_TOKEN + JTT_DISCORD_CLIENT_ID to the justthetip-bot service in Railway"
Write-Host "  2. Add DAD_DISCORD_BOT_TOKEN + DAD_DISCORD_CLIENT_ID to the dad-bot service in Railway"
Write-Host "  3. Commit the updated deploy-railway.yml and the new app directories"
Write-Host "  4. Push to main — CI will build GHCR images and trigger Railway redeploy"
