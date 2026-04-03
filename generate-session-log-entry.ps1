# scripts/generate-session-log-entry.ps1
#
# This script auto-generates a new entry for SESSION_LOG.md based on the
# commit history of the current feature branch. It extracts conventional
# commit messages and formats them into a markdown block.
#
# Usage:
#   .\scripts\generate-session-log-entry.ps1
#

# --- CONFIGURATION ---
$ErrorActionPreference = "Stop"
$mainBranch = "main"
$sessionLogFile = "SESSION_LOG.md"

# --- SCRIPT START ---

Write-Host "ðŸ“ Generating SESSION_LOG.md entry from git history..."
Write-Host "--------------------------------------------------------"

# 1. Get current branch name and check if we're on a feature branch
$currentBranch = git rev-parse --abbrev-ref HEAD
if ($currentBranch -eq $mainBranch) {
    Write-Host "â Œ You are on the '$mainBranch' branch. This script must be run from a feature branch. Aborting." -ForegroundColor Red
    exit 1
}
Write-Host "   Branch: $currentBranch"

# 2. Find the common ancestor commit with the main branch
try {
    $mergeBase = git merge-base HEAD $mainBranch
} catch {
    Write-Host "â Œ Could not find a common ancestor with the '$mainBranch' branch. Is your local '$mainBranch' up to date?" -ForegroundColor Red
    exit 1
}

# 3. Get commit messages since the common ancestor
# We use a simple format (`%s` for subject) to parse each commit message.
$commits = git log "$mergeBase..HEAD" --pretty=format:"%s"

if ([string]::IsNullOrWhiteSpace($commits)) {
    Write-Host "âš ï¸  No new commits found on this branch compared to '$mainBranch'. Nothing to log." -ForegroundColor Yellow
    exit 0
}

# 4. Format the commit messages into a markdown list
$logEntries = New-Object System.Collections.Generic.List[string]
$featureCommits = 0
foreach ($commit in ($commits -split [Environment]::NewLine)) {
    # Use regex to parse conventional commit messages like "feat(api): Add new endpoint"
    if ($commit -match '^(?<type>feat|fix|refactor|perf|build|ci|docs|style|test)\(?(?<scope>[\w-]+)?\)?: (?<description>.+)') {
        $type = $Matches.type
        $scope = $Matches.scope
        $description = $Matches.description.Trim()

        # Capitalize the first letter of the description
        $description = $description.Substring(0, 1).ToUpper() + $description.Substring(1)

        if ($scope) {
            $logEntries.Add("- **$($scope.ToUpper())**: $description")
        } else {
            $logEntries.Add("- $description")
        }
        if ($type -eq "feat") {
            $featureCommits++
        }
    } else {
        # Handle non-conventional commits
        $logEntries.Add("- $($commit.Trim())")
    }
}

# 5. Construct the final markdown block
$currentDate = Get-Date -Format "yyyy-MM-dd"
$branchTitle = $currentBranch -replace '[^a-zA-Z0-9 ]', ' ' | ForEach-Object { $_.Split(' ') | ForEach-Object { $_.Substring(0,1).ToUpper() + $_.Substring(1).ToLower() } } | Join-String -Separator ' '
$logTitle = if ($featureCommits -gt 0) { $branchTitle } else { "General Updates" }

$newLogBlock = @"
## $currentDate - $logTitle

$($logEntries -join "`n")

"@

# 6. Prepend the new entry to SESSION_LOG.md
Write-Host "   Prepending new entry to '$sessionLogFile'..."
$existingContent = Get-Content -Path $sessionLogFile -Raw
$newContent = "$newLogBlock`n$existingContent"
Set-Content -Path $sessionLogFile -Value $newContent -Encoding UTF8

Write-Host "--------------------------------------------------------"
Write-Host "âœ… Successfully updated '$sessionLogFile'. Please review the new entry before committing." -ForegroundColor Green
Write-Host "--------------------------------------------------------"