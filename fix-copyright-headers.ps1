# scripts/fix-copyright-headers.ps1
#
# This script automatically adds the standard TiltCheck copyright header
# to staged .ts, .tsx, .js, and .jsx files that are missing it.
#
# Usage:
#   .\scripts\fix-copyright-headers.ps1
#

$ErrorActionPreference = "Stop"

Write-Host "[FIX] Running Copyright Header Fixer..."
Write-Host "------------------------------------------"

$copyrightHeader = "// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved."
$filesFixed = 0

# Get staged files
# We operate on staged files to align with the local-brand-enforcer.ps1's scope
$stagedFiles = git diff --staged --name-only

foreach ($file in $stagedFiles) {
    if ($file -match "\.(ts|tsx|js|jsx)$") {
        if (Test-Path -Path $file) {
            $content = Get-Content -Path $file -Raw
            $firstLine = $content.Split([Environment]::NewLine)[0]

            # Check if the file already has a TiltCheck Ecosystem copyright header
            if ($firstLine -notmatch "TiltCheck Ecosystem") {
                Write-Host "   Fixing: '$file' - Adding copyright header." -ForegroundColor Cyan
                $newContent = "$copyrightHeader`n$content"
                Set-Content -Path $file -Value $newContent -Encoding UTF8 # Ensure consistent encoding
                git add $file # Stage the fixed file automatically
                $filesFixed++
            }
        }
    }
}

if ($filesFixed -gt 0) {
    Write-Host "------------------------------------------"
    Write-Host "[OK] Successfully added copyright headers to $filesFixed file(s)." -ForegroundColor Green
    Write-Host "   These files have been automatically staged."
} else {
    Write-Host "[OK] No missing copyright headers found in staged .ts/.tsx/.js/.jsx files." -ForegroundColor Green
}

Write-Host "------------------------------------------"