# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18
#
# Registers a Windows Task Scheduler job to run the email crawler on a recurring schedule.
# Reads env vars from the repo root .env file automatically.
#
# Usage:
#   ./scripts/register-email-crawler-task.ps1
#   ./scripts/register-email-crawler-task.ps1 -Schedule Daily -Times 06:00,18:00
#   ./scripts/register-email-crawler-task.ps1 -Schedule Weekly -Days Monday,Thursday -Times 07:00
#   ./scripts/register-email-crawler-task.ps1 -Limit 200 -DisableAfterCreate

param(
    [string]$TaskName = "TiltCheck-EmailCrawler",
    [ValidateSet("Daily", "Weekly")]
    [string]$Schedule = "Daily",
    [string[]]$Days = @("Monday", "Wednesday", "Friday"),
    [string[]]$Times = @("07:00", "19:00"),
    [int]$Limit = 500,
    [switch]$DryRun,
    [switch]$DeleteProcessed,
    [switch]$DisableAfterCreate
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent

# Resolve tsx — prefer local workspace install, fall back to global
$tsxPath = Join-Path $repoRoot "node_modules\.bin\tsx.cmd"
if (-not (Test-Path $tsxPath)) {
    $tsxCommand = Get-Command tsx -ErrorAction SilentlyContinue
    if (-not $tsxCommand) {
        throw "tsx not found. Run 'pnpm install' in the repo root first."
    }
    $tsxPath = $tsxCommand.Source
}

$runnerScript = Join-Path $repoRoot "scripts\run-email-crawler.ps1"
if (-not (Test-Path $runnerScript)) {
    throw "scripts/run-email-crawler.ps1 not found at $runnerScript"
}

$envFile = Join-Path $repoRoot ".env"
if (-not (Test-Path $envFile)) {
    throw ".env not found at $envFile. Copy .env.example to .env and fill in CRAWLER_EMAIL / CRAWLER_APP_PASSWORD."
}

function ConvertTo-TriggerTime {
    param([string]$Text)
    try {
        return [DateTime]::ParseExact($Text, "HH:mm", [System.Globalization.CultureInfo]::InvariantCulture)
    } catch {
        throw "Invalid time '$Text'. Use 24-hour format HH:mm (e.g. 07:00)."
    }
}

$validDays = @("Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday")
if ($Schedule -eq "Weekly") {
    foreach ($day in $Days) {
        if ($validDays -notcontains $day) {
            throw "Invalid day '$day'. Valid values: $($validDays -join ', ')"
        }
    }
}

# Build triggers
$triggers = @()
foreach ($timeText in $Times) {
    $time = ConvertTo-TriggerTime -Text $timeText
    if ($Schedule -eq "Daily") {
        $triggers += New-ScheduledTaskTrigger -Daily -At $time
    } else {
        $triggers += New-ScheduledTaskTrigger -Weekly -DaysOfWeek $Days -At $time
    }
}

$argList = "-NoProfile -ExecutionPolicy Bypass -File `"$runnerScript`" -Limit $Limit"
if ($DryRun) { $argList += " -DryRun" }
if ($DeleteProcessed) { $argList += " -DeleteProcessed" }

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument $argList `
    -WorkingDirectory $repoRoot

$principal = New-ScheduledTaskPrincipal `
    -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) `
    -LogonType Interactive `
    -RunLevel Limited

$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
    -MultipleInstances IgnoreNew

Write-Host "Registering scheduled task '$TaskName'..."
Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $triggers `
    -Principal $principal `
    -Settings $settings `
    -Description "Crawls casino emails via IMAP and feeds them into the TiltCheck trust engine." `
    -Force | Out-Null

if ($DisableAfterCreate) {
    Disable-ScheduledTask -TaskName $TaskName | Out-Null
    Write-Host "Task created (disabled - enable it when ready)."
} else {
    Write-Host "Task created and enabled."
}

Write-Host ""
Write-Host "Task name  : $TaskName"
Write-Host "Schedule   : $Schedule"
if ($Schedule -eq "Weekly") { Write-Host "Days       : $($Days -join ', ')" }
Write-Host "Times      : $($Times -join ', ')"
Write-Host "Limit/run  : $Limit emails"
if ($DryRun) { Write-Host "Mode       : dry-run (no API calls)" }
if ($DeleteProcessed) { Write-Host "Cleanup    : delete processed emails after successful ingest" }
Write-Host ""
Write-Host "Manage the task:"
Write-Host "  Run now : Start-ScheduledTask -TaskName `"$TaskName`""
Write-Host "  Disable : Disable-ScheduledTask -TaskName `"$TaskName`""
Write-Host "  Enable  : Enable-ScheduledTask -TaskName `"$TaskName`""
Write-Host "  Remove  : Unregister-ScheduledTask -TaskName `"$TaskName`" -Confirm:`$false"
Write-Host "  Logs    : Get-EventLog -LogName System -Source 'Task Scheduler' -Newest 20 | Where-Object Message -match '$TaskName'"
