# TiltCheck Monorepo Setup Guide

This guide will help you set up the TiltCheck monorepo and start building modules.

## Prerequisites

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0 (Install with: `npm install -g pnpm`)
- **Git**

---

## Initial Setup

### 1. Install Dependencies

```bash
pnpm install
```

This will install all dependencies across all packages in the monorepo.

### 2. Build Shared Packages

```bash
# Build types package (required by other modules)
cd packages/types
pnpm build

# Build event router
cd ../../services/event-router
pnpm build
```

Or build everything at once:

```bash
pnpm build
```

---

## Project Structure

```
tiltcheck-monorepo/
├── apps/                    # Applications (Discord bot, web UI)
├── modules/                 # TiltCheck modules
│   ├── justthetip/
│   ├── suslink/
│   ├── collectclock/
│   └── ...
├── services/                # Core services
│   ├── event-router/        # ✅ Event bus
│   └── trust-engines/
├── packages/                # Shared packages
│   ├── types/               # ✅ Shared TypeScript types
│   ├── database/
│   └── discord-utils/
├── docs/                    # Documentation
├── scripts/                 # Utility scripts
└── infrastructure/          # Deployment configs
```

---

## How the Monorepo Works

### Workspaces

This monorepo uses **pnpm workspaces**. Each folder in `apps/`, `modules/`, `services/`, and `packages/` is a separate package.

Packages can depend on each other using the `workspace:*` protocol:

```json
{
  "dependencies": {
    "@tiltcheck/types": "workspace:*",
    "@tiltcheck/event-router": "workspace:*"
  }
}
```

### Building

Each package has its own build script:

```bash
# Build a specific package
cd packages/types
pnpm build

# Build all packages
pnpm --recursive build
```

### Development

Run dev mode for all packages:

```bash
pnpm dev
```

Or for a specific package:

```bash
cd services/event-router
pnpm dev
```

---

## Creating a New Module

### 1. Create Module Directory

```bash
mkdir -p modules/my-module/src
cd modules/my-module
```

### 2. Initialize package.json

```json
{
  "name": "@tiltcheck/my-module",
  "version": "0.1.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "clean": "rm -rf dist"
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

### 3. Create tsconfig.json

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

### 4. Create src/index.ts

```typescript
import { eventRouter } from '@tiltcheck/event-router';
import type { TiltCheckEvent } from '@tiltcheck/types';

export class MyModule {
  constructor() {
    // Subscribe to events
    eventRouter.subscribe(
      'some.event',
      this.handleEvent.bind(this),
      'my-module'
    );
  }

  private async handleEvent(event: TiltCheckEvent) {
    console.log('Received event:', event);
  }

  async doSomething() {
    // Publish events
    await eventRouter.publish(
      'some.event',
      'my-module',
      { foo: 'bar' }
    );
  }
}
```

### 5. Install Dependencies

```bash
pnpm install
```

### 6. Build and Test

```bash
pnpm build
pnpm dev
```

---

## Using the Event Router

The Event Router is the communication backbone. See `services/event-router/README.md` for full documentation.

### Quick Example

```typescript
import { eventRouter } from '@tiltcheck/event-router';

// Subscribe to events
eventRouter.subscribe(
  'tip.completed',
  async (event) => {
    console.log('Tip completed!', event.data);
  },
  'my-module'
);

// Publish events
await eventRouter.publish(
  'tip.completed',
  'justthetip',
  { amount: 1.0, token: 'SOL' },
  'user123'
);
```

---

## Common Commands

```bash
# Install all dependencies
pnpm install

# Build all packages
pnpm build

# Run all packages in dev mode
pnpm dev

# Clean all build outputs
pnpm clean

# Format code
pnpm format

# Run tests
pnpm test
```

---

## Testing

This repo uses Vitest at the root to run tests across all packages.

```bash
# If pnpm isn't installed yet
npm install -g pnpm

# Install dependencies
pnpm install

# Run all tests once
pnpm test

# Watch mode
pnpm test:watch

# Coverage report (local)
pnpm coverage

# Coverage with CI thresholds (optional)
pnpm coverage:ci
```

Test files live under `**/tests/**/*.test.ts` inside each package.

---

## Next Steps

1. **Review the documentation** in `/docs/tiltcheck/`
2. **Explore the Event Router** in `/services/event-router/`
3. **Check out event types** in `/packages/types/src/index.ts`
4. **Build your first module** following the guide above
5. **Ask the Copilot Agent** for help with architecture questions

---

## Troubleshooting

### Type errors in imports

If you see errors like `Cannot find module '@tiltcheck/types'`:

1. Build the types package: `cd packages/types && pnpm build`
2. Re-run `pnpm install` at the root

### pnpm not found

Install pnpm globally:
```bash
npm install -g pnpm
```

### Build failures

Clean and rebuild:
```bash
pnpm clean
pnpm install
pnpm build
```

---

**Built by a degen, for degens. 🎰**
