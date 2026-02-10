# TiltCheck Monorepo Build Order

This document defines the correct build order for all packages to resolve TypeScript dependencies.

## Build Dependency Layers

### Layer 0: Foundation (No @tiltcheck dependencies)
These packages have no internal dependencies and must be built first:

```bash
pnpm --filter @tiltcheck/types run build
pnpm --filter @tiltcheck/config run build
pnpm --filter @tiltcheck/esm-utils run build
pnpm --filter @tiltcheck/ai-client run build
```

### Layer 1: Core Infrastructure (Depends on Layer 0)
These depend only on types, config, or esm-utils:

```bash
pnpm --filter @tiltcheck/shared run build
pnpm --filter @tiltcheck/database run build
pnpm --filter @tiltcheck/db run build
pnpm --filter @tiltcheck/api-client run build
pnpm --filter @tiltcheck/auth run build
pnpm --filter @tiltcheck/supabase-auth run build
pnpm --filter @tiltcheck/natural-language-parser run build
```

### Layer 2: Event System (Depends on Layer 0-1)
Event router is central to the architecture:

```bash
pnpm --filter @tiltcheck/event-router run build
```

### Layer 3: Services Layer (Depends on Layer 0-2)
Services that use event-router:

```bash
pnpm --filter @tiltcheck/pricing-oracle run build
pnpm --filter @tiltcheck/discord-utils run build
pnpm --filter @tiltcheck/trust-engines run build
pnpm --filter @tiltcheck/trust-rollup run build
```

### Layer 4: Modules (Depends on Layer 0-3)
Business logic modules:

```bash
# Core modules
pnpm --filter @tiltcheck/suslink run build
pnpm --filter @tiltcheck/linkguard run build
pnpm --filter @tiltcheck/collectclock run build
pnpm --filter @tiltcheck/tiltcheck-core run build

# Feature modules
pnpm --filter @tiltcheck/justthetip run build
pnpm --filter @tiltcheck/lockvault run build
pnpm --filter @tiltcheck/freespinscan run build
pnpm --filter @tiltcheck/freespinschannelbot run build
pnpm --filter @tiltcheck/dad run build
pnpm --filter @tiltcheck/poker run build
pnpm --filter @tiltcheck/qualifyfirst run build
pnpm --filter @tiltcheck/triviadrops run build
```

### Layer 5: Services (Depends on Layer 0-4)
Additional services:

```bash
pnpm --filter "./services/collectclock" run build
pnpm --filter "./services/gameplay-analyzer" run build
pnpm --filter "./services/game-arena" run build
pnpm --filter "./services/user-dashboard" run build
```

### Layer 6: Applications (Depends on all layers)
Final applications:

```bash
pnpm --filter "./services/dashboard" run build
pnpm --filter "./apps/dashboard" run build
pnpm --filter "./apps/discord-bot" run build
pnpm --filter "./apps/bot" run build
pnpm --filter "./apps/dad-bot" run build
pnpm --filter "./apps/api" run build
pnpm --filter "./backend" run build
```

## Quick Build All Script

To build everything in order:

```bash
# Layer 0
pnpm --filter @tiltcheck/types --filter @tiltcheck/config --filter @tiltcheck/esm-utils --filter @tiltcheck/ai-client run build

# Layer 1
pnpm --filter @tiltcheck/shared --filter @tiltcheck/database --filter @tiltcheck/db --filter @tiltcheck/api-client --filter @tiltcheck/auth --filter @tiltcheck/supabase-auth --filter @tiltcheck/natural-language-parser run build

# Layer 2
pnpm --filter @tiltcheck/event-router run build

# Layer 3
pnpm --filter @tiltcheck/pricing-oracle --filter @tiltcheck/discord-utils --filter @tiltcheck/trust-engines --filter @tiltcheck/trust-rollup run build

# Layer 4 (modules)
pnpm --filter @tiltcheck/suslink --filter @tiltcheck/linkguard --filter @tiltcheck/collectclock --filter @tiltcheck/tiltcheck-core --filter @tiltcheck/justthetip --filter @tiltcheck/lockvault --filter @tiltcheck/freespinscan --filter @tiltcheck/dad --filter @tiltcheck/poker --filter @tiltcheck/qualifyfirst run build
```

## Minimal Railway Build

For Railway deployment (services/dashboard only), we need:

```bash
# Core packages (Layer 0-1)
pnpm --filter @tiltcheck/types run build
pnpm --filter @tiltcheck/config run build
pnpm --filter @tiltcheck/esm-utils run build
pnpm --filter @tiltcheck/database run build

# Event system (Layer 2)
pnpm --filter @tiltcheck/event-router run build

# Required services (Layer 3)
pnpm --filter @tiltcheck/pricing-oracle run build
pnpm --filter @tiltcheck/trust-rollup run build

# Dashboard (Layer 6)
pnpm --filter "./services/dashboard" run build
```

## Notes

- Some packages may have circular dependencies - these should be refactored
- The `.js` extension in imports is required for ESM (moduleResolution: nodenext)
- `eventRouter` is properly exported from `@tiltcheck/event-router/dist/index.js`
- Always build dependencies before dependent packages
- Use path filters `"./services/dashboard"` for packages with duplicate names
