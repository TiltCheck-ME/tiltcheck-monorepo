
# ================================================================
# © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
# Created by jmenichole (https://github.com/jmenichole)
# 
# This file is part of the TiltCheck project.
# For licensing information, see LICENSE file in the project root.
# ================================================================

Write-Host "Building TiltCheck Monorepo (ordered build for Docker)"

# Stage 1: Core packages with no internal dependencies
Write-Host "Stage 1: Core packages..."
pnpm --filter @tiltcheck/types build
pnpm --filter @tiltcheck/config build
pnpm --filter @tiltcheck/esm-utils build
pnpm --filter @tiltcheck/analytics build
pnpm --filter @tiltcheck/shared build
pnpm --filter @tiltcheck/logger build

# Stage 2: Packages that depend on core packages
Write-Host "Stage 2: Core services..."
pnpm --filter @tiltcheck/event-router build
pnpm --filter @tiltcheck/pricing-oracle build

# Stage 3: Extended packages (parallel)
Write-Host "Stage 3: Extended packages..."
Start-Job -ScriptBlock { pnpm --filter @tiltcheck/ai-client build }
Start-Job -ScriptBlock { pnpm --filter @tiltcheck/auth build }
Start-Job -ScriptBlock { pnpm --filter @tiltcheck/database build }
Start-Job -ScriptBlock { pnpm --filter @tiltcheck/db build }
Start-Job -ScriptBlock { pnpm --filter @tiltcheck/natural-language-parser build }
Start-Job -ScriptBlock { pnpm --filter @tiltcheck/discord-utils build }
Start-Job -ScriptBlock { pnpm --filter @tiltcheck/identity-core build }
Start-Job -ScriptBlock { pnpm --filter @tiltcheck/cli build }
Start-Job -ScriptBlock { pnpm --filter @tiltcheck/supabase-auth build }
Start-Job -ScriptBlock { pnpm --filter @tiltcheck/trust-engines build }

Write-Host "Waiting for Stage 3 to complete..."
Get-Job | Wait-Job | Remove-Job

# Stage 4: Modules (sequential for reliability)
Write-Host "Stage 4: Modules..."
pnpm -r --workspace-concurrency=1 --filter './modules/**' --filter '!@tiltcheck/event-router' --filter '!@tiltcheck/pricing-oracle' build

# Stage 5: Apps
Write-Host "Stage 5: Apps..."
pnpm -r --filter './apps/**' build

Write-Host "Build complete!"
