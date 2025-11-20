# Migration Guide: Individual Repos → Monorepo

This guide explains how to migrate your existing TiltCheck modules from individual repositories into the monorepo structure.

## Overview

You currently have individual GitHub repos for each module. The monorepo consolidates them all while maintaining clean separation through workspaces.

---

## Migration Strategy

### Phase 1: Core Infrastructure ✅ (COMPLETE)

- ✅ Event Router — Central communication bus
- ✅ Shared Types — TypeScript definitions
- ✅ Workspace setup — pnpm monorepo structure
- ✅ Build system — TypeScript compilation

### Phase 2: Essential Modules (Next)

Recommended migration order:

1. **SusLink** — Simplest module, no financial risk
2. **CollectClock** — High user value, bonus tracking
3. **Trust Engines** — Core to ecosystem
4. **FreeSpinScan** — Builds on SusLink
5. **TiltCheck Core** — Tilt detection

### Phase 3: Financial Modules (High Risk)

1. **JustTheTip** — Most complex, wallet integration
2. **QualifyFirst** — Survey routing
3. **DA&D** — Game module

---

## How to Migrate a Module

### Step 1: Copy Source Code

```bash
# Create module directory
mkdir -p modules/your-module/src

# Copy your existing code
cp -r /path/to/your-repo/src/* modules/your-module/src/
```

### Step 2: Create package.json

```json
{
  "name": "@tiltcheck/your-module",
  "version": "0.1.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "clean": "rm -rf dist",
    "test": "echo \"Tests coming soon\""
  },
  "dependencies": {
    "@tiltcheck/types": "workspace:*",
    "@tiltcheck/event-router": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "tsx": "^4.7.0"
  }
}
```

### Step 3: Create tsconfig.json

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

### Step 4: Update Imports

Replace direct module imports with event-based communication:

**Before (Direct Import):**
```typescript
import { scanLink } from '../suslink';
const result = await scanLink(url);
```

**After (Event-Based):**
```typescript
import { eventRouter } from '@tiltcheck/event-router';

// Publish event
await eventRouter.publish(
  'link.scanned',
  'freespinscan',
  { url, userId },
  userId
);

// Subscribe to results elsewhere
eventRouter.subscribe(
  'link.scanned',
  async (event) => {
    const { url } = event.data;
    // Handle scan result
  },
  'suslink'
);
```

### Step 5: Install and Build

```bash
# From monorepo root
npx pnpm install
npx pnpm --filter @tiltcheck/your-module build
```

### Step 6: Test

```bash
# Run in dev mode
npx pnpm --filter @tiltcheck/your-module dev
```

---

## Example: Migrating SusLink

Let's walk through migrating the SusLink module as an example.

### 1. Create Structure

```bash
mkdir -p modules/suslink/src
```

### 2. Copy Code

```bash
# Copy from your existing SusLink repo
cp -r /path/to/suslink-repo/src/* modules/suslink/src/
```

### 3. Create package.json

```json
{
  "name": "@tiltcheck/suslink",
  "version": "0.1.0",
  "private": true,
  "main": "./dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc"
  },
  "dependencies": {
    "@tiltcheck/types": "workspace:*",
    "@tiltcheck/event-router": "workspace:*"
  }
}
```

### 4. Update Code to Use Events

**Old SusLink (Direct Export):**
```typescript
export async function scanLink(url: string): Promise<LinkScanResult> {
  // Scan logic
}
```

**New SusLink (Event-Based):**
```typescript
import { eventRouter } from '@tiltcheck/event-router';
import type { LinkScanResult } from '@tiltcheck/types';

export class SusLinkModule {
  constructor() {
    // Subscribe to link scan requests
    eventRouter.subscribe(
      'promo.submitted',
      this.handlePromoSubmission.bind(this),
      'suslink'
    );
  }

  private async handlePromoSubmission(event: any) {
    const { url, userId } = event.data;
    
    // Perform scan
    const result = await this.scanLink(url);
    
    // Publish result
    await eventRouter.publish(
      'link.scanned',
      'suslink',
      result,
      userId
    );
  }

  private async scanLink(url: string): Promise<LinkScanResult> {
    // Existing scan logic
  }
}
```

### 5. Build and Test

```bash
npx pnpm install
npx pnpm --filter @tiltcheck/suslink build
npx pnpm --filter @tiltcheck/suslink dev
```

---

## Checklist for Each Module

When migrating a module, ensure:

- [ ] Module is in correct directory (`modules/`, `services/`, or `apps/`)
- [ ] `package.json` follows monorepo conventions
- [ ] Dependencies use `workspace:*` protocol
- [ ] Module subscribes to events instead of importing other modules
- [ ] Module publishes events for other modules to consume
- [ ] TypeScript builds successfully
- [ ] No direct imports between modules (except shared packages)
- [ ] Module can run independently

---

## Benefits of Migration

### 1. Shared Code
- Types, utilities, and constants shared across modules
- No duplication

### 2. Independent Development
- Each module builds separately
- Can develop/test in isolation

### 3. Clear Communication
- Event-based architecture
- Easy to trace data flow

### 4. Easier Deployment
- Single repo to manage
- Coordinated releases

### 5. Better Testing
- Shared test infrastructure
- Integration tests easier

---

## Next Steps

1. **Choose first module to migrate** (recommend SusLink)
2. **Follow migration steps** above
3. **Test thoroughly**
4. **Repeat for next module**
5. **Update old repos** with deprecation notice pointing to monorepo

---

## Need Help?

Ask the Copilot Agent:
- "How do I migrate [module name]?"
- "What events should [module] subscribe to?"
- "How do I replace this direct import with events?"

See also:
- `SETUP.md` — Monorepo setup
- `services/event-router/README.md` — Event system docs
- `services/event-router/examples/basic-flow.ts` — Example flow

---

**Let's consolidate! 🚀**
