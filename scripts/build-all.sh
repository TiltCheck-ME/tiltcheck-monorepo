#!/bin/bash
set -e

echo "🔨 Building TiltCheck monorepo in dependency order..."

echo "📦 Layer 0: Foundation packages..."
pnpm --filter @tiltcheck/types --filter @tiltcheck/config --filter @tiltcheck/esm-utils --filter @tiltcheck/ai-client run build

echo "📦 Layer 1: Core infrastructure..."
pnpm --filter @tiltcheck/shared --filter @tiltcheck/database --filter @tiltcheck/db --filter @tiltcheck/api-client --filter @tiltcheck/auth --filter @tiltcheck/supabase-auth --filter @tiltcheck/natural-language-parser run build

echo "📦 Layer 2: Event system & CLI..."
pnpm --filter @tiltcheck/event-router --filter @tiltcheck/cli run build

echo "📦 Layer 3: Services layer..."
pnpm --filter @tiltcheck/pricing-oracle --filter @tiltcheck/discord-utils --filter @tiltcheck/trust-engines --filter @tiltcheck/trust-rollup run build

echo "📦 Layer 4: Business logic modules..."
pnpm --filter @tiltcheck/suslink --filter @tiltcheck/linkguard --filter @tiltcheck/collectclock --filter @tiltcheck/tiltcheck-core --filter @tiltcheck/justthetip --filter @tiltcheck/lockvault --filter @tiltcheck/freespinscan --filter @tiltcheck/dad --filter @tiltcheck/poker --filter @tiltcheck/qualifyfirst run build

echo "📦 Layer 5: Applications..."
pnpm --filter './apps/*' run build

echo "📦 Layer 6: Services..."
pnpm --filter './services/*' run build

echo ""
echo "✅ All packages built successfully!"
echo ""
echo "🎉 Complete monorepo build finished!"
