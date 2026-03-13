# TiltCheck Copilot Instructions

## Quick Start Commands

### Build & Test
```bash
# Full build (respects dependency order)
pnpm build

# Watch dev servers (all workspaces in parallel)
pnpm dev

# Run tests for entire monorepo
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests for a single workspace
pnpm --filter @tiltcheck/api test

# Lint all code
pnpm lint

# Fix lint issues
pnpm lint:fix
```

### Single Test File
```bash
# Run a specific test file
vitest --run path/to/test.test.ts

# Run a single test with watch
vitest path/to/test.test.ts
```

## Monorepo Structure

**This is a pnpm workspace monorepo** with three workspace categories:

### 1. **apps/** - Deployable services
- `api` - Central Express gateway (auth, trust APIs, event routing)
- `web` - Landing page and public docs (Vite + static assets)
- `discord-bot` - Discord bot (Discord.js)
- `user-dashboard` - User profile hub (Vite + SPA)
- `control-room` - Admin panel for operators
- `game-arena` - Multiplayer socket.io server
- `trust-rollup` - Trust engine aggregator
- `chrome-extension` - Browser extension (content scripts + service worker)

### 2. **modules/** - Reusable business logic (published as @tiltcheck/*)
- `tiltcheck-core` - Tilt detection engine
- `suslink` - Link scanning & threat detection
- `collectclock` - Bonus tracking
- `justthetip` - Tipping logic & financial flows
- `linkguard` - URL validation
- Plus: `dad`, `stake`, `poker`, `triviadrops`, `walletcheck`, `lockvault`

### 3. **packages/** - Shared utilities & types
- Internal packages found under `packages/` (auth, db, config, event-types, etc.)

## Key Conventions

### Dependencies & Imports
- **Workspace internal refs**: Always use `@tiltcheck/*` package names, not relative paths
  - ✅ `import { tiltScore } from '@tiltcheck/tiltcheck-core'`
  - ❌ `import { tiltScore } from '../../modules/tiltcheck-core'`
- **Built-in dependencies**: Use `workspace:*` in package.json—pnpm handles symlinks automatically
- Dependencies are resolved at build-time via TypeScript, not runtime imports

### Code Standards (from .cursorrules)
- **No emojis** in code, comments, or docs
- **File headers required**: Every new or modified file must include:
  ```
  © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: [YYYY-MM-DD]
  ```
- **UI footer**: Every user-facing interface must display "Made for Degens. By Degens."
- **Atomic docs**: Documentation updates must be in the same commit as code changes
- **Tone**: Direct, blunt, professional—no fluff or apologies

### TypeScript & Linting
- **Config**: `tsconfig.json` (root) + `eslint.config.js` (flat config, ESLint v9+)
- **Minimal rules**: ESLint is intentionally sparse; team-specific rules in workspace configs
- **Ignored paths**: `dist/`, `build/`, `.next/`, `node_modules/`, `coverage/`, `.cache/`
- **Type checking**: Run `tsc` in any workspace to check locally before commit

### Build System
- **Turbo** orchestrates parallel builds respecting dependency graph (`turbo.json`)
- **Build outputs**: `dist/`, `.next/`, or framework-specific directories
- **Task dependencies**: `"build"` depends on `^build` (deps must build first)
- **Ordered build script**: `scripts/ordered-build.sh` ensures safe ordering for CI
- **PostInstall hook**: Builds `@tiltcheck/utils` and dependencies immediately after `pnpm install`

### Testing
- **Framework**: Vitest (config in `vitest.config.ts`)
- **Coverage**: Turbo caches coverage reports in `coverage/`
- **CI coverage**: `pnpm coverage:ci` (sets `CI=true` env var)
- **Branch protection requires**:
  - `components-a11y` (shared components: bundle, contrast, a11y)
  - `landing-a11y` (landing pages)
  - CodeQL security scanning

### Environment & Secrets
- **Local**: Copy `.env.example` to `.env` in monorepo root
- **PR rule**: `.env.example` can contain placeholders; never commit real credentials
- **Secret types blocked**: Private keys, production API tokens, database passwords
- **Vault**: Secrets stored in `@tiltcheck/lockvault` (production-only encryption wrapper)

## Architecture Insights

### Core System Integration Points

1. **Event Routing** (@tiltcheck/event-types)
   - Modules communicate via typed events, not direct calls
   - Reduces coupling; allows independent scaling

2. **Trust Engines** (@tiltcheck/trust-engines)
   - Casino Trust Engine: Rates casino fairness & reputation
   - Degen Trust Engine: User behavioral scoring
   - Accessed via RGaaS API endpoints in `api` service

3. **Authentication** (@tiltcheck/auth)
   - Discord OAuth2 with signed state parameter
   - `/auth/discord/callback` validates source (extension `ext_` vs web `web_`)
   - Cookie/state source mismatch rejects silently

4. **Database Layer** (@tiltcheck/db)
   - Supabase integration
   - Schema migrations tracked in `infra/` (if present)

### Non-Custodial Principle
- **No private key storage** in TiltCheck servers
- **Wallet integration**: Users sign transactions locally; keys never leave browser
- **Payment flows**: JustTheTip routes to external processors (Stripe, Solana)

### RGaaS (Responsible Gaming as a Service)
- Exposes three public APIs:
  - Tilt Detection API
  - Trust Scoring API
  - Link Scanning API
- See `docs/tiltcheck/16-rgaas-pivot.md` for full details

## CI/CD & Deployment

### Required Checks for main
1. `components-a11y` - Bundle, contrast, a11y tests for shared components
2. `landing-a11y` - Accessibility checks for landing pages
3. `Analyze Code` - CodeQL security scan

See `docs/tiltcheck/17-branch-protection.md` for branch ruleset details.

### Local Validation Before Push
```bash
# Full validation pipeline
pnpm audit:all          # runs all audits (components, contrast, a11y, images)
pnpm knip:ci            # dead code check
pnpm lint:fix           # auto-fix style issues
pnpm test               # full test suite
```

### Deployment Flows
- **Web & API**: Cloud Build + Cloud Run (GCP)
- **Discord Bot**: Cloud Run container + event pubsub
- **Chrome Extension**: Hosted in browser stores, points to production API
- See `cloudbuild*.yaml` files for service-specific pipelines

## Common Workflows

### Adding a New Module
1. Create `modules/my-module/` with `package.json` (name: `@tiltcheck/my-module`)
2. Export types in `modules/my-module/src/index.ts`
3. Add to `pnpm-workspace.yaml` (auto-included via `packages:` glob)
4. Any app/module can now `import { foo } from '@tiltcheck/my-module'`
5. Add copyright header to all new files
6. Document in `docs/tiltcheck/` if part of core architecture

### Modifying Shared Code
- Changes to `@tiltcheck/utils`, `@tiltcheck/types`, `@tiltcheck/auth` trigger rebuilds across all dependents
- Run `pnpm build` to validate full impact
- Add test coverage in that module's `tests/` folder

### Testing an App in Dev Mode
```bash
# Start dev servers (all apps in parallel, respecting deps)
pnpm dev

# In separate terminal, watch tests for a single app
pnpm --filter @tiltcheck/api test:watch
```

### Debugging a Failing Test
```bash
# Run a specific test file with Vitest UI
vitest --ui path/to/test.test.ts

# Or standard verbose output
vitest --run --reporter=verbose path/to/test.test.ts
```

## MCP Server: Playwright

**Browser automation is configured for web testing tasks.**

Use Playwright to:
- Test web UI interactions (login flows, form submissions)
- Verify responsive design across devices
- Check Chrome extension sidebar functionality
- Validate landing page rendering and accessibility
- Take visual regression screenshots

Common test patterns in this monorepo use Puppeteer for some tasks and Playwright can complement those for UI automation needs.

## Related Documentation

- **Architecture**: `docs/tiltcheck/` (numbered guides for each system)
- **Agent Directory**: `AGENTS.md` (AI agents for code review, casino scraping, etc.)
- **Contributing**: `CONTRIBUTING.md` (PR expectations, security guidelines)
- **Governance**: `docs/governance/OSS-RUNTIME-BOUNDARY.md` (what can/cannot be committed)
- **Security Policy**: `SECURITY.md` (vulnerability disclosure process)

## Important Notes

- **No custodial behavior** in code—enforce during review
- **Tests are required** for new features; run `pnpm test` before committing
- **Atomic docs**: Update README/API docs in the same PR as code changes
- **Workspace isolation**: Avoid circular dependencies; test each module independently
- **Build caching**: Turbo caches outputs; `pnpm clean` to reset if stuck
