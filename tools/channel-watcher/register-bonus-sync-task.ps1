# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-14
param(
    [string]$TaskName = "TiltCheck-BonusDrops-Sync",
    [string]$ChannelUrl = "",
    [string[]]$Times = @("00:00", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"),
    [switch]$DisableAfterCreate
)

$ErrorActionPreference = "Stop"

function Get-CurrentUserId {
    return [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
}

function ConvertTo-TriggerTime {
    param([string]$Text)
    try {
        return [DateTime]::ParseExact($Text, "HH:mm", [System.Globalization.CultureInfo]::InvariantCulture)
    } catch {
        throw "Invalid time '$Text'. Use 24-hour format HH:mm."
    }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$runnerScript = Join-Path $scriptDir "run-bonus-sync.ps1"

if (-not (Test-Path $runnerScript)) {
    throw "run-bonus-sync.ps1 was not found at $runnerScript"
}

if ($Times.Count -eq 0) {
    throw "At least one schedule time is required."
}

$triggers = @()
foreach ($timeText in $Times) {
    $time = ConvertTo-TriggerTime -Text $timeText
    $triggers += New-ScheduledTaskTrigger -Daily -At $time
}

$argList = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", "`"$runnerScript`""
)

if ($ChannelUrl) {
    $argList += @("-ChannelUrl", "`"$ChannelUrl`"")
}

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument ($argList -join " ") -WorkingDirectory $scriptDir
$principal = New-ScheduledTaskPrincipal -UserId (Get-CurrentUserId) -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 45)

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $triggers `
    -Principal $principal `
    -Settings $settings `
    -Description "Scrapes the configured Discord bonus source and reposts fresh links into TiltCheck Bonus Drops." `
    -Force | Out-Null

if ($DisableAfterCreate) {
    Disable-ScheduledTask -TaskName $TaskName | Out-Null
    Write-Host "Task created and disabled."
} else {
    Write-Host "Task created and enabled."
}

Write-Host ""
Write-Host "Task name: $TaskName"
Write-Host "Times: $($Times -join ', ')"
Write-Host "Channel override: $(if ($ChannelUrl) { $ChannelUrl } else { 'env/default' })"
Write-Host ""
Write-Host "Useful commands:"
Write-Host "  Run now:   Start-ScheduledTask -TaskName `"$TaskName`""
Write-Host "  Disable:   Disable-ScheduledTask -TaskName `"$TaskName`""
Write-Host "  Enable:    Enable-ScheduledTask -TaskName `"$TaskName`""
Write-Host "  Remove:    Unregister-ScheduledTask -TaskName `"$TaskName`" -Confirm:`$false"
