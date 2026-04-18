<# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18 #>
param(
    [string]$TaskName = "TiltCheck-ChannelWatcher-Cloud",
    [string[]]$Days = @("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"),
    [string[]]$Times = @("00:00", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"),
    [int]$DurationMinutes = 2,
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
        throw "Invalid time '$Text'. Use 24-hour format HH:mm (example: 09:00 or 15:30)."
    }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$runnerScript = Join-Path $scriptDir "run-cloud-watcher.ps1"

if (-not (Test-Path $runnerScript)) {
    throw "run-cloud-watcher.ps1 was not found at $runnerScript"
}

if ($Days.Count -eq 0) {
    throw "At least one day is required."
}

if ($Times.Count -eq 0) {
    throw "At least one run time is required."
}

$validDays = @("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
foreach ($day in $Days) {
    if ($validDays -notcontains $day) {
        throw "Invalid day '$day'. Valid values: $($validDays -join ', ')"
    }
}

$triggers = @()
foreach ($timeText in $Times) {
    $time = ConvertTo-TriggerTime -Text $timeText
    $triggers += New-ScheduledTaskTrigger -Weekly -DaysOfWeek $Days -At $time
}

$argList = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", "`"$runnerScript`"",
    "-DurationMinutes", $DurationMinutes
)
$actionArgs = $argList -join " "

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $actionArgs -WorkingDirectory $scriptDir
$principal = New-ScheduledTaskPrincipal -UserId (Get-CurrentUserId) -LogonType Interactive -RunLevel Limited
$maxRuntime = New-TimeSpan -Hours 2
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit $maxRuntime

Write-Host "Registering scheduled task '$TaskName'..."
Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $triggers `
    -Principal $principal `
    -Settings $settings `
    -Description "Runs channel-watcher against cloud Ollama and stops VM after each run." `
    -Force | Out-Null

if ($DisableAfterCreate) {
    Disable-ScheduledTask -TaskName $TaskName | Out-Null
    Write-Host "Task created and disabled."
} else {
    Write-Host "Task created and enabled."
}

Write-Host ""
Write-Host "Task name: $TaskName"
Write-Host "Days: $($Days -join ', ')"
Write-Host "Times: $($Times -join ', ')"
Write-Host "Duration per run: $DurationMinutes minute(s)"
Write-Host ""
Write-Host "Useful commands:"
Write-Host "  Run now:   Start-ScheduledTask -TaskName `"$TaskName`""
Write-Host "  Disable:   Disable-ScheduledTask -TaskName `"$TaskName`""
Write-Host "  Enable:    Enable-ScheduledTask -TaskName `"$TaskName`""
Write-Host "  Remove:    Unregister-ScheduledTask -TaskName `"$TaskName`" -Confirm:`$false"
