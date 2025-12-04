#!/usr/bin/env bash
set -e

echo "🏗️  Building TiltCheck Monorepo (ordered build for Docker)"

# Stage 1: Core packages with no internal dependencies
echo "📦 Stage 1: Core packages..."
pnpm --filter @tiltcheck/types build
pnpm --filter @tiltcheck/config build
pnpm --filter @tiltcheck/esm-utils build
pnpm --filter @tiltcheck/analytics build

# Stage 2: Services that depend on core packages
echo "📦 Stage 2: Core services..."
pnpm --filter @tiltcheck/event-router build
pnpm --filter @tiltcheck/pricing-oracle build

# Stage 3: Extended packages
echo "📦 Stage 3: Extended packages..."
pnpm --filter @tiltcheck/ai-client build
pnpm --filter @tiltcheck/auth build
pnpm --filter @tiltcheck/database build
pnpm --filter @tiltcheck/db build
pnpm --filter @tiltcheck/natural-language-parser build
pnpm --filter @tiltcheck/discord-utils build
pnpm --filter @tiltcheck/identity-core build
pnpm --filter @tiltcheck/supabase-auth build

echo "⏳ Waiting for Stage 3 to complete..."
wait

# Stage 4: Remaining services and modules (sequential for Docker reliability)
echo "📦 Stage 4: Modules and services..."
pnpm -r --workspace-concurrency=1 \
  --filter './modules/**' \
  --filter './services/**' \
  --filter '!@tiltcheck/event-router' \
  --filter '!@tiltcheck/pricing-oracle' \
  build

# Stage 5: Apps
echo "📦 Stage 5: Apps..."
pnpm -r --filter './apps/**' build

# Stage 6: Frontend and backend
echo "📦 Stage 6: Frontend & Backend..."
pnpm --filter frontend build || echo "⚠️  Frontend build skipped or failed"
pnpm --filter backend build || echo "⚠️  Backend build skipped or failed"

echo "✅ Build complete!"
