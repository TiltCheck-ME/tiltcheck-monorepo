param(
    [switch]$SyncLinear,
    [bool]$LinearDryRun = $true
)

$ErrorActionPreference = "Stop"

function Step([string]$Message) {
    Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

Write-Host "TiltCheck Daily Ops Guide" -ForegroundColor Green
Write-Host "Focus rule: one milestone slice, one active branch, one next action."

Step "1) Branch sync"
Write-Host "Run: powershell -ExecutionPolicy Bypass -File ./scripts/sync-branch.ps1"

Step "2) Migration safety checks"
Write-Host "If needed: powershell -ExecutionPolicy Bypass -File ./scripts/gcp/create-budget-alerts.ps1 -BillingAccount `"<id>`""

Step "3) One service deploy (when applicable)"
Write-Host "Run: powershell -ExecutionPolicy Bypass -File ./scripts/gcp/deploy-cloud-run-service.ps1 -ServiceName `"api`" -ProjectId `"<project-id>`""

Step "4) Milestone log update"
Write-Host "Run: powershell -ExecutionPolicy Bypass -File ./scripts/gcp/new-milestone-log.ps1 -MilestoneId `"MS-<id>`""
Write-Host "Then edit: docs/migration/logs/milestone-log.md and docs/migration/logs/cost-pilot.csv"

Step "5) Linear sync"
if ($SyncLinear) {
    $nodePath = (Get-Command node -ErrorAction SilentlyContinue)?.Source
    if (-not $nodePath) { throw "node not found in PATH. Ensure Node.js is installed." }
    $syncScript = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "linear-sync.mjs"

    if ($LinearDryRun) {
        Write-Host "Running Linear sync in dry-run mode..."
        & $nodePath $syncScript --dry-run
    }
    else {
        Write-Host "Running Linear sync..."
        & $nodePath $syncScript
    }

    if ($LASTEXITCODE -ne 0) {
        throw "Linear sync failed."
    }
}
else {
    Write-Host "Optional: node scripts/linear-sync.mjs --dry-run"
}

Step "6) AI Task Generation"
Write-Host "Run: pnpm ops:task-ai"
Write-Host "This will suggest grant opportunities and prioritized next actions."

Step "7) End-of-session checkpoint"
Write-Host "- Write tomorrow's first task in docs/ops/linear-tasks.json"
Write-Host "- Keep only one active work branch"
