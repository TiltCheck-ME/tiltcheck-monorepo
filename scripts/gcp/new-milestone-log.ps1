param(
    [Parameter(Mandatory = $true)]
    [string]$MilestoneId
)

$ErrorActionPreference = "Stop"
$logPath = "docs/migration/logs/milestone-log.md"

if (-not (Test-Path $logPath)) {
    throw "Missing log file: $logPath"
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
$entry = @"
## $MilestoneId

- Scope completed:
- Decisions made (`DEC-*`):
- Current state:
- Blockers:
- Next milestone:
- Risk watch:
- Cost note:
- Timestamp: $timestamp

---

"@

$existing = Get-Content $logPath -Raw
$header, $body = $existing -split "---", 2
Set-Content -Path $logPath -Value ($header + "---`n`n" + $entry + $body.TrimStart())
Write-Host "Added milestone template: $MilestoneId"
