# local-brand-enforcer.ps1
#
# This script checks for brand compliance and security issues in your staged git changes.
# It is the local equivalent of the 'Brand Law Enforcer' CI workflow.
#
# Usage:
#   .\scripts\local-brand-enforcer.ps1
#

# --- CONFIGURATION ---
$ErrorActionPreference = "SilentlyContinue"

# Patterns for secrets
$secretPatterns = @(
    "sk_live_",
    "DISCORD_TOKEN",
    "JWT_SECRET",
    "DATABASE_URL"
)
$secretRegex = $secretPatterns -join '|'

# Patterns for custodial code
$custodialPatterns = @(
    "privateKey",
    "private_key",
    "seed",
    "mnemonic"
)
$custodialRegex = $custodialPatterns -join '|'

# Patterns for tone violations
$apologeticTone = "sorry|we apologize|unfortunately"
$marketingTone = "powerful|revolutionary|cutting-edge|please|kindly"

# --- SCRIPT START ---

Write-Host "ðŸš¨ Running Local Brand Law Enforcer..."
Write-Host "------------------------------------------"

$criticalViolations = 0
$mediumViolations = 0
$sessionLogUpdated = $false

# Get staged files
$stagedFiles = git diff --staged --name-only

# 1. Check for hardcoded secrets in the entire diff
Write-Host "1. Checking for hardcoded secrets..."
$diffOutput = git diff --staged
if ($diffOutput | Select-String -Pattern $secretRegex -Quiet) {
    Write-Host "   âŒ  CRITICAL: Hardcoded secrets detected in staged changes!" -ForegroundColor Red
    $criticalViolations++
} else {
    Write-Host "   âœ… No hardcoded secrets found." -ForegroundColor Green
}

# 2. Check for custodial patterns in changed files
Write-Host "2. Checking for custodial code patterns..."
$custodialFound = $false
foreach ($file in $stagedFiles) {
    if (Test-Path -Path $file) {
        if (Get-Content $file | Select-String -Pattern $custodialRegex -Quiet) {
            Write-Host "   âŒ  CRITICAL: Potential custodial code detected in '$file'" -ForegroundColor Red
            $custodialFound = $true
        }
    }
}
if ($custodialFound) {
    $criticalViolations++
} else {
    Write-Host "   âœ… No custodial patterns found." -ForegroundColor Green
}

# 3. Check for copyright headers in new/changed TS/JS files
Write-Host "3. Checking for copyright headers..."
$missingHeader = $false
foreach ($file in $stagedFiles) {
    if ($file -match "\.(ts|tsx|js|jsx)$") {
        if (Test-Path -Path $file) {
            $firstLine = Get-Content -Path $file -TotalCount 1
            if ($firstLine -notmatch "TiltCheck") {
                Write-Host "   âš ï¸  MEDIUM: Missing copyright header in '$file'" -ForegroundColor Yellow
                $missingHeader = $true
            }
        }
    }
}
if ($missingHeader) {
    $mediumViolations++
} else {
    Write-Host "   âœ… All relevant files have copyright headers." -ForegroundColor Green
}

# 4. Check for SESSION_LOG.md update
Write-Host "4. Checking for SESSION_LOG.md update..."
if ($stagedFiles -contains "SESSION_LOG.md") {
    $sessionLogUpdated = $true
    Write-Host "   âœ… SESSION_LOG.md has been updated." -ForegroundColor Green
} else {
    Write-Host "   âš ï¸  MEDIUM: PR has code changes but SESSION_LOG.md was not staged." -ForegroundColor Yellow
    $mediumViolations++
}

# 5. Check for tone violations
Write-Host "5. Checking for tone violations..."
$toneIssues = 0
foreach ($file in $stagedFiles) {
    if ($file -match "\.(ts|tsx|js|jsx|md)$") {
        if (Test-Path -Path $file) {
            if (Get-Content $file | Select-String -Pattern $apologeticTone -Quiet) {
                Write-Host "   âš ï¸  Tone violation (apologetic) detected in '$file'" -ForegroundColor Yellow
                $toneIssues++
            }
            if (Get-Content $file | Select-String -Pattern $marketingTone -Quiet) {
                Write-Host "   âš ï¸  Tone violation (marketing fluff) detected in '$file'" -ForegroundColor Yellow
                $toneIssues++
            }
        }
    }
}
if ($toneIssues -gt 0) {
    $mediumViolations += $toneIssues
} else {
    Write-Host "   âœ… No tone violations found." -ForegroundColor Green
}


# --- SUMMARY ---
Write-Host "------------------------------------------"
Write-Host "ðŸ“  Compliance Check Summary"
Write-Host "------------------------------------------"

if ($criticalViolations -gt 0) {
    Write-Host "Result: ðŸ”´ FAILED (Critical Violations)" -ForegroundColor Red
    Write-Host "Found $criticalViolations critical violation(s). You must fix these before committing."
    exit 1
}

if ($mediumViolations -gt 0) {
    Write-Host "Result: ðŸŸ¡ PASSED WITH WARNINGS (Medium Violations)" -ForegroundColor Yellow
    Write-Host "Found $mediumViolations medium violation(s). Please review and fix if possible."
}

if ($criticalViolations -eq 0 -and $mediumViolations -eq 0) {
    Write-Host "Result: âœ… PASSED" -ForegroundColor Green
    Write-Host "All local brand compliance checks passed!"
}

exit 0
