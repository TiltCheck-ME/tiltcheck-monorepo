# TiltCheck Monorepo - Quick Start

## 🚀 Get Running in 5 Minutes

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment

Copy the environment template:
```bash
cp .env.template .env.local
```

Then fill in your required values:
```bash
# Required - Get from https://discord.com/developers/applications
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=1445916179163250860
DISCORD_GUILD_ID=1446973117472964620  # TiltCheck main server
NODE_ENV=development

# Optional - Alert channels (for trust and support alerts)
TRUST_ALERTS_CHANNEL_ID=1447524353263665252
SUPPORT_CHANNEL_ID=1447524748069306489

# Optional but recommended
SOLANA_RPC_URL=https://api.devnet.solana.com
JUSTTHETIP_FEE_WALLET=your_fee_wallet_address
```

### 3. Start Services

**Option A: All services (recommended)**
```bash
pnpm dev
```

**Option B: Individual services**

Terminal 1 - Discord Bot:
```bash
pnpm --filter @tiltcheck/discord-bot dev
```

Terminal 2 - Dashboard:
```bash
pnpm --filter @tiltcheck/dashboard dev
```

Terminal 3 - Landing:
```bash
pnpm --filter @tiltcheck/landing dev
```

### 4. CI Modes (Smoke vs Full)
TiltCheck CI runs two separate workflows:

| Workflow | Mode  | Purpose | Discord Login | Snapshot Validation | Env Flag |
|----------|-------|---------|---------------|---------------------|----------|
| Health Smoke | smoke | Fast sanity (health + readiness) | Skipped (`SKIP_DISCORD_LOGIN=true`) | Skipped | `SKIP_DISCORD_LOGIN=true` |
| Health Full  | full  | Trust + Discord integration | Real login (requires secrets) | Enabled | `SKIP_DISCORD_LOGIN=false` |

Environment variables used:

```bash
SKIP_DISCORD_LOGIN=true   # Bypass Discord auth & config validation
REQUIRE_READY=true        # Health script fails if ready != true
WAIT_ATTEMPTS=30          # Poll attempts for health checks
WAIT_INTERVAL=3           # Seconds between polls
TRUST_ROLLUP_SNAPSHOT_DIR=/app/data  # Override snapshot location (default /app/data)
```

Health check scripts:
```bash
scripts/check-health.sh      # Poll & validate readiness
scripts/validate-rollup.sh   # Flush & assert snapshot structure (full mode)
```

To locally emulate smoke CI:
```bash
SKIP_DISCORD_LOGIN=true pnpm --filter discord-bot dev
```

To emulate full mode (requires valid Discord secrets in .env.local):
```bash
pnpm --filter discord-bot dev
```

### 5. Verify Setup

**Check environment variables:**
```bash
grep DISCORD .env.local
```

**Verify wallet persistence:**
```bash
ls -la data/justthetip-wallets.json
```

### 6. Test in Discord
```
/ping
/tip wallet view
/trust dashboard
/scan https://example.com
```

If bot doesn't respond, check logs for auth errors.

---

## 📚 Full Documentation
- **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Complete deployment guide
- **[docs/tiltcheck/](./docs/tiltcheck/)** - Architecture & design docs
- **[GITHUB-AUTOMATION-SETUP.md](./docs/GITHUB-AUTOMATION-SETUP.md)** - Automation setup guide

---

## ✅ What's Been Built

### Core Infrastructure
- ✅ **pnpm Workspaces** — Monorepo structure
- ✅ **TypeScript** — Shared configuration
- ✅ **Shared Types Package** — `@tiltcheck/types`
- ✅ **Event Router** — Communication backbone
- ✅ **Directory Structure** — apps/, modules/, services/, packages/

### Documentation
- ✅ `SETUP.md` — Installation and development guide
- ✅ `MIGRATION.md` — How to migrate existing modules
- ✅ `services/event-router/README.md` — Event system docs
- ✅ Example code in `services/event-router/examples/`

---

## 📁 Directory Structure

```
tiltcheck-monorepo/
├── apps/                    # Main applications
├── modules/                 # TiltCheck modules (justthetip, suslink, etc.)
├── services/                # Core services
│   └── event-router/        ✅ Event communication bus
├── packages/                # Shared packages
│   └── types/               ✅ TypeScript types
├── docs/                    ✅ Complete documentation
├── scripts/                 # Utility scripts
└── infrastructure/          # Deployment configs
```

---

## 🚀 Common Commands

```bash
# Install dependencies
npx pnpm install

# Build everything
npx pnpm build

# Build specific package
npx pnpm --filter @tiltcheck/types build
npx pnpm --filter @tiltcheck/event-router build

# Run in dev mode
npx pnpm dev

# Run specific package in dev mode
npx pnpm --filter @tiltcheck/your-module dev

# Clean build outputs
npx pnpm clean

# Format code
npx pnpm format
```

---

## 🎯 Next Steps

### Immediate
1. **Decide which module to migrate first** (recommend SusLink)
2. **Review MIGRATION.md** for step-by-step guide
3. **Study Event Router examples** in `services/event-router/examples/`

### Module Migration Priority
1. ⏳ SusLink (simplest, no financial risk)
2. ⏳ CollectClock (high value, bonus tracking)
3. ⏳ Trust Engines (core functionality)
4. ⏳ FreeSpinScan (builds on SusLink)
5. ⏳ TiltCheck Core (tilt detection)
6. ⏳ JustTheTip (complex, wallet integration)
7. ⏳ QualifyFirst (survey routing)
8. ⏳ DA&D (game module)

### Infrastructure to Build
- ⏳ Discord Bot shell (in `apps/discord-bot/`)
- ⏳ Trust Engine services
- ⏳ Database package (shared schemas)
- ⏳ Discord utilities package

---

## 📝 Creating a New Module

```bash
# 1. Create directory
mkdir -p modules/my-module/src

# 2. Create package.json
cat > modules/my-module/package.json << 'EOF'
{
  "name": "@tiltcheck/my-module",
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
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "tsx": "^4.7.0"
  }
}
EOF

# 3. Create tsconfig.json
cat > modules/my-module/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
EOF

# 4. Create src/index.ts
cat > modules/my-module/src/index.ts << 'EOF'
import { eventRouter } from '@tiltcheck/event-router';

export class MyModule {
  constructor() {
    eventRouter.subscribe(
      'some.event',
      this.handleEvent.bind(this),
      'my-module'
    );
  }

  private async handleEvent(event: any) {
    console.log('Event received:', event);
  }
}
EOF

# 5. Install and build
npx pnpm install
npx pnpm --filter @tiltcheck/my-module build
```

---

## 🔄 Event System Quick Reference

### Publishing Events
```typescript
import { eventRouter } from '@tiltcheck/event-router';

await eventRouter.publish(
  'tip.completed',        // Event type
  'justthetip',          // Source module
  { amount: 1.0 },       // Data
  'user123'              // User ID (optional)
);
```

### Subscribing to Events
```typescript
import { eventRouter } from '@tiltcheck/event-router';

eventRouter.subscribe(
  'tip.completed',       // Event type
  async (event) => {     // Handler
    console.log(event.data);
  },
  'my-module'           // Module ID
);
```

### Available Event Types
See `packages/types/src/index.ts` for all event types:
- `tip.*`, `swap.*`, `airdrop.*` — Financial
- `link.scanned`, `link.flagged` — Link scanning
- `promo.*` — Promo submissions
- `bonus.*` — Bonus tracking
- `trust.*` — Trust updates
- `tilt.*` — Tilt detection
- `survey.*`, `game.*` — Other

---

## 💡 Tips

### Module Independence
- Modules NEVER import each other directly
- All communication via Event Router
- Shared code goes in `packages/`

### TypeScript
- Shared types in `packages/types/`
- Build types package first
- All modules extend root `tsconfig.json`

### Testing
- Test modules independently
- Mock Event Router for unit tests
- Integration tests use real Event Router

### Deployment
- Each module can deploy independently
- Event Router can run on Cloudflare Workers
- Modules can be serverless functions

---

## 📚 Key Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Setup and development guide |
| `MIGRATION.md` | How to migrate existing modules |
| `README.md` | Project overview |
| `pnpm-workspace.yaml` | Workspace configuration |
| `services/event-router/README.md` | Event system docs |
| `packages/types/src/index.ts` | All TypeScript types |
| `docs/tiltcheck/` | Complete ecosystem documentation |

---

## 🆘 Getting Help

1. **Read the docs** — Start with `SETUP.md` and `MIGRATION.md`
2. **Check examples** — `services/event-router/examples/`
3. **Ask Copilot Agent** — It knows the entire architecture
4. **Review documentation** — `docs/tiltcheck/` has everything

### Common Questions

**Q: How do modules communicate?**  
A: Via Event Router only — no direct imports

**Q: Where do shared utilities go?**  
A: In `packages/` (e.g., `packages/discord-utils/`)

**Q: How do I add a dependency?**  
A: Add to module's `package.json`, then run `npx pnpm install`

**Q: Why use events instead of imports?**  
A: Loose coupling, independent deployment, easier testing

---

## 🎰 TiltCheck Philosophy

- **Modular** — Each tool stands alone
- **Cheap** — Free-tier optimized
- **Scrappy** — No over-engineering
- **Degen-Friendly** — Practical, not preachy
- **Non-Custodial** — Never hold user funds

---

**Built by a degen, for degens. Let's ship it! 🚀**
