# TiltCheck Quick Reference

## 🔥 Most Common Commands

```bash
# Test Discord bot (no token needed)
npx tsx apps/discord-bot/examples/test-bot.ts

# Fresh start
npx pnpm install
npx pnpm build

# Run integration demo (shows everything working)
npx tsx modules/suslink/examples/integration.ts

# Deploy Discord slash commands
npx tsx apps/discord-bot/src/deploy-commands.ts

# Run Discord bot (dev mode)
npx pnpm --filter @tiltcheck/discord-bot dev

# Build specific package
npx pnpm --filter @tiltcheck/suslink build
npx pnpm --filter @tiltcheck/event-router build

# Dev mode with auto-rebuild
npx pnpm --filter @tiltcheck/suslink dev

# Clean build artifacts
npx pnpm clean
```

## 📁 Monorepo Structure

```
tiltcheck-monorepo/
├── apps/                    # User-facing applications
│   └── discord-bot/         # ✅ Discord bot
├── modules/                 # TiltCheck modules
│   └── suslink/             # ✅ Link scanning
├── services/                # Infrastructure services
│   └── event-router/        # ✅ Event bus
├── packages/                # Shared libraries
│   └── types/               # ✅ TypeScript types
│   └── discord-utils/       # ✅ Discord utilities
└── docs/                    # Documentation
```

## 🎯 Creating a New Module

1. **Create directory**

   ```bash
   mkdir -p modules/my-module/src
   cd modules/my-module
   ```

2. **Create `package.json`**

   ```json
   {
     "name": "@tiltcheck/my-module",
     "version": "0.1.0",
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     "scripts": {
       "build": "tsc",
       "dev": "tsc --watch"
     },
     "dependencies": {
       "@tiltcheck/types": "workspace:*",
       "@tiltcheck/event-router": "workspace:*"
     }
   }
   ```

3. **Create `tsconfig.json`**

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

4. **Create module class** (`src/module.ts`)

   ```typescript
   import { eventRouter } from '@tiltcheck/event-router';
   import type { TiltCheckEvent } from '@tiltcheck/types';

   export class MyModule {
     constructor() {
       this.setupEventHandlers();
       console.log('[MyModule] Initialized ✅');
     }

     private setupEventHandlers() {
       eventRouter.subscribe(
         'some.event',
         this.handleEvent.bind(this),
         'my-module'
       );
     }

     private async handleEvent(event: TiltCheckEvent) {
       // Your logic here
       
       // Publish results
       await eventRouter.publish(
         'my.result',
         'my-module',
         { data: 'here' },
         event.userId
       );
     }
   }

   export const myModule = new MyModule();
   ```

5. **Create index** (`src/index.ts`)

   ```typescript
   export * from './module';
   ```

6. **Install and build**

   ```bash
   npx pnpm install
   npx pnpm --filter @tiltcheck/my-module build
   ```

## 🎪 Event Router Cheat Sheet

```typescript
import { eventRouter } from '@tiltcheck/event-router';

// Subscribe to events
eventRouter.subscribe(
  'event.type',        // Event type
  handler,             // Function to call
  'module-id'          // Your module ID
);

// Publish events
await eventRouter.publish(
  'event.type',        // Event type
  'module-id',         // Your module ID
  { my: 'data' },      // Event data
  'user123',           // Optional: userId
  { meta: 'data' }     // Optional: metadata
);

// Get event history
const history = eventRouter.getHistory({
  eventType: 'link.scanned',
  limit: 10
});

// Get stats
const stats = eventRouter.getStats();
```

## 📊 Available Event Types

```typescript
// Promo Events
'promo.submitted'      // User submits promo link
'promo.approved'       // Promo passes validation
'promo.rejected'       // Promo fails validation

// Link Events
'link.scanned'         // Link scan completed
'link.flagged'         // High-risk link detected

// Tip Events
'tip.initiated'        // User starts tip flow
'tip.completed'        // Tip successfully sent
'tip.failed'           // Tip failed

// Trust Events
'trust.casino.updated' // Casino trust score changed
'trust.degen.updated'  // User trust score changed

// Tilt Events
'tilt.detected'        // Tilt behavior detected
'tilt.warning'         // User warned about tilt
'tilt.recovery'        // User recovering from tilt

// Bonus Events
'bonus.earned'         // User earned bonus
'bonus.claimed'        // User claimed bonus
'bonus.expired'        // Bonus expired
```

## 🛠️ Common Patterns

### Scan a link (SusLink)

```typescript
import { suslink } from '@tiltcheck/suslink';

const result = await suslink.scanUrl('https://suspicious-site.com');
console.log(result.riskLevel); // 'safe' | 'suspicious' | 'high' | 'critical'
```

### React to scan results

```typescript
eventRouter.subscribe(
  'link.scanned',
  async (event) => {
    const { url, riskLevel } = event.data;
    if (riskLevel === 'critical') {
      // Take action
    }
  },
  'my-module'
);
```

### Chain multiple modules

```typescript
// Module A publishes
await eventRouter.publish('step.one', 'module-a', { data });

// Module B listens
eventRouter.subscribe('step.one', async (event) => {
  // Process and publish next step
  await eventRouter.publish('step.two', 'module-b', { result });
}, 'module-b');

// Module C listens
eventRouter.subscribe('step.two', async (event) => {
  // Final step
}, 'module-c');
```

## 🐛 Debugging Tips

1. **Check event flow**

   ```typescript
   const history = eventRouter.getHistory();
   console.log(history);
   ```

2. **Check subscriptions**

   ```typescript
   const stats = eventRouter.getStats();
   console.log(stats); // Shows all active subscriptions
   ```

3. **Add logging**

   ```typescript
   eventRouter.subscribe('event.type', async (event) => {
     console.log('Received:', event);
     // Your logic
   }, 'module-id');
   ```

4. **Test in isolation**

   ```bash
   npx tsx modules/my-module/examples/test.ts
   ```

## 📦 Package Dependencies

```
@tiltcheck/types           # Required by all packages
@tiltcheck/event-router    # Required by all modules
@tiltcheck/suslink         # Optional: if you need link scanning
@tiltcheck/discord-utils   # Optional: Discord embed/formatting helpers
@tiltcheck/database        # Shared Supabase schemas for user stats, game history, and leaderboards
```

## 🚨 Gotchas

1. **Always use package names in imports**

   ```typescript
   // ✅ Good
   import { eventRouter } from '@tiltcheck/event-router';
   
   // ❌ Bad - creates duplicate singletons
   import { eventRouter } from '../../../services/event-router/src';
   ```

2. **Build before running**

   ```bash
   # If you see "Cannot find module" errors
   npx pnpm build
   ```

3. **Event timing**

   ```typescript
   // Events are async - wait for processing
   await eventRouter.publish('event', 'source', data);
   await new Promise(r => setTimeout(r, 100)); // Give handlers time
   ```

4. **Module IDs must match types**

   ```typescript
   // Must be in ModuleId type (packages/types/src/index.ts)
   eventRouter.subscribe('event', handler, 'valid-module-id');
   ```

## 📖 Further Reading

- `README.md` - Project overview
- `SETUP.md` - Detailed setup guide
- `MIGRATION.md` - Migrating existing code
- `docs/tiltcheck/` - Full ecosystem documentation
- `STATUS.md` - Current build status
