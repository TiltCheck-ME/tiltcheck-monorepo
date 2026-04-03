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

## Workspace Filtering Tips

Use `--filter` to efficiently run commands on specific workspaces:

```bash
# Filter by exact package name
pnpm --filter @tiltcheck/api build

# Filter by workspace scope (all modules)
pnpm --filter "@tiltcheck/*" test

# Filter by app name
pnpm --filter web dev

# Filter with dependencies
pnpm --filter @tiltcheck/api --filter @tiltcheck/core build

# Filter with dependents (reverse dependency graph)
pnpm --filter @tiltcheck/types --filter "...@tiltcheck/types" test
```

## Build System & Caching

- **Turbo**: Orchestrates parallel builds with dependency graph awareness (defined in `turbo.json`)
- **Cache invalidation**: Turbo automatically invalidates cache when inputs change; use `pnpm clean` to reset entire cache if stuck
- **Build outputs**: Each app/module has different output dirs (`dist/`, `.next/`, or framework-specific)
- **PostInstall**: Automatically builds `@tiltcheck/utils` and dependencies after `pnpm install`
- **Dependency ordering**: The build task has `"dependsOn": ["^build"]`, ensuring dependencies build first

## Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Never commit real credentials—.env.example is the template

# For local Discord bot development, also set up app-specific .env files:
cp apps/discord-bot/.env.example apps/discord-bot/.env
cp apps/user-dashboard/.env.example apps/user-dashboard/.env
```

## Test Organization

- **Root vitest.config.ts**: Runs only specific integration tests (currently `tests/user-wallet-isolated.test.ts` and `packages/agent/app/agent.test.ts`)
- **Workspace tests**: Each app/module can have its own test setup; run with `pnpm --filter @workspace-name test`
- **Full test suite**: `pnpm test` runs the root config; for all tests in monorepo, use `pnpm test:all`

## Component & Accessibility Audits

Beyond unit tests, this monorepo requires component and accessibility compliance:

```bash
# Full audit (bundle, contrast, a11y, landing pages)
pnpm audit:all

# Individual checks
pnpm bundle:components      # Component bundling
pnpm contrast              # Color contrast check
pnpm contrast:dom          # DOM contrast check
pnpm a11y:audit            # Pa11y accessibility audit
pnpm a11y:audit:landing    # Landing page a11y audit

# Serve audit results
pnpm a11y:serve            # Open http://localhost:5178/index.html
```

Artifacts are written to `dist/components/` (including Lighthouse reports).

## Recommended MCP Servers for TiltCheck

Configure these MCP servers in your Copilot/Claude environment for enhanced capabilities:

### 1. Playwright (Browser Automation)
**Status**: Recommended | **Priority**: High

Use for:
- Test web UI interactions (login flows, form submissions)
- Verify responsive design across devices
- Check Chrome extension sidebar functionality
- Validate landing page rendering and accessibility
- Take visual regression screenshots
- Smoke testing after deployments

**Setup**: Available through most Copilot clients; check integration docs for your IDE.

### 2. GitHub (Repository & PR Analysis)
**Status**: Recommended | **Priority**: High

Use for:
- Explore repository structure, branches, commits
- Analyze pull requests and review threads
- Query issues and check branch protection rules
- Review code changes and diff analysis
- Access workflow/action history
- Check security scanning results (CodeQL, Dependabot)

**Useful queries**:
- "Show me the diff for PR #123"
- "What's the commit history for this file?"
- "Are there any failing CI checks?"
- "List all open issues with label 'bug'"

### 3. PostgreSQL / Supabase (Database Exploration)
**Status**: Optional | **Priority**: Medium

Use for:
- Explore Supabase schema and table relationships
- Debug database query issues
- Understand data models for TiltCheck core systems
- Verify migration history

**Prerequisites**: Requires `.env` with Supabase connection details (development/test only, never production credentials)

**Typical queries**:
- Trust engine data structure and relationships
- User profile and authentication schema
- Event routing and audit log schema

**Note**: For this monorepo, database queries are typically managed through app services (`@tiltcheck/db` package), not direct SQL. Use this MCP mainly for schema exploration and debugging.

## Using MCP Servers in Copilot Sessions

When working on TiltCheck, leverage these MCP servers strategically:

### GitHub MCP + Code Changes
```
Scenario: "I need to update the trust engine API but want to understand recent changes"
↓
1. Use GitHub MCP: "Show me the last 5 commits to packages/trust-engines/"
2. Analyze PR history: "List merged PRs that touched trust-engines/ in the last month"
3. Then make your changes with context
```

### Playwright + Web Development
```
Scenario: "Testing the Discord OAuth flow in the extension"
↓
1. Use Playwright: "Test the extension popup login flow"
2. Check responsive design: "Verify the dashboard works on mobile (375px width)"
3. Validate accessibility: "Run a11y checks on the auth modal"
```

### PostgreSQL MCP + Data Issues
```
Scenario: "User reporting tilt score not updating"
↓
1. Use PostgreSQL MCP to query: "Show the schema for user_tilt_scores table"
2. Check recent data: "SELECT * FROM user_tilt_scores WHERE user_id = X ORDER BY created_at DESC"
3. Debug via @tiltcheck/db package in code
```

## Troubleshooting

**Build fails with "module not found"**:
- Run `pnpm install` to ensure all symlinks are set up
- Check that the package is listed in `pnpm-workspace.yaml`
- Use absolute `@tiltcheck/*` imports, not relative paths

**Tests don't run**:
- Verify the test file matches the include pattern in `vitest.config.ts` or workspace config
- Try `vitest --run path/to/test.ts` to test a specific file
- Check for setup file issues: `setupFiles: ['./apps/api/tests/setup.ts']`

**Linting errors about unused variables**:
- Prefix with `_` to ignore: `const _unused = ...`
- ESLint is intentionally permissive; check `eslint.config.js` for rules

**Turbo cache seems stale**:
- `pnpm clean` clears all build outputs and Turbo cache
- For a single workspace: `pnpm --filter @workspace-name run clean`

## Agent Directory & Automation

- **Code review**: Use the `code-review` skill for correctness and security analysis
- **Browser testing**: Playwright is configured for UI testing; use the `playwright` skill
- **Custom agents**: See `AGENTS.md` for domain-specific agents (Brand Law Enforcer, Casino Scraper, Trust Log Analyzer, etc.)
- **Brand enforcement**: PRs are automatically scanned for copyright headers, tone violations, and secrets via GitHub workflows

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
- **Brand compliance**: All new/modified files must include the copyright header and follow Degen tone
- **Production safety**: Never commit real credentials, private keys, or sensitive API tokens
