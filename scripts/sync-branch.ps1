param(
    [string]$Branch = "",
    [string]$Remote = "origin"
)

$ErrorActionPreference = "Stop"

if (-not $Branch) {
    $Branch = (& git rev-parse --abbrev-ref HEAD).Trim()
}

if ($Branch -eq "HEAD") {
    throw "Detached HEAD detected. Pass -Branch explicitly."
}

Write-Host "Fetching latest from $Remote..."
& git fetch $Remote
if ($LASTEXITCODE -ne 0) {
    throw "git fetch failed."
}

Write-Host "Checking out $Branch..."
& git checkout $Branch
if ($LASTEXITCODE -ne 0) {
    throw "git checkout failed."
}

Write-Host "Rebasing $Branch onto $Remote/$Branch..."
& git pull --rebase $Remote $Branch
if ($LASTEXITCODE -ne 0) {
    throw "git pull --rebase failed. Resolve conflicts and retry."
}

Write-Host ""
Write-Host "Sync complete."
Write-Host "Ahead/behind (left=local ahead, right=remote ahead):"
& git rev-list --left-right --count "HEAD...$Remote/$Branch"
Write-Host ""
Write-Host "Recent commits:"
& git log --oneline --decorate -n 5
