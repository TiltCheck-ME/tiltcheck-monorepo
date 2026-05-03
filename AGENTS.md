<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 -->

# TiltCheck Agent Directory

Current Ecosystem Capacity: 100% (Readiness)

## 1. Global System Skills
Managed by Gemini CLI in ~/.agents/skills

| Name | Function |
| :--- | :--- |
| code-review | Specialist in correctness, security, and performance reviews. |
| playwright | Browser automation for UI testing and screenshots. |
| troubleshooting | Diagnoses connection/DevTools issues. |
| debug-optimize-lcp | Web performance and Core Web Vitals optimization. |
| a11y-debugging | Accessibility auditing and compliance checks. |

## 2. Domain-Specific Agents
Located in .cursor/agents/

| Name | Path | Description |
| :--- | :--- | :--- |
| Brand Law Enforcer | .cursor/agents/brand-law-enforcer.md | **NEW:** Enforces "The Degen Laws" on PRs — brand tone, copyright headers, no secrets, atomic docs. |
| Frontend & Marketing Suggestions | .cursor/agents/frontend-marketing-suggestions.md | **NEW:** Weekly code update suggestions for web, dashboard, and extension UX/UI improvements. |
| Casino Scraper | .cursor/agents/casino-public-data-scraper.md | Scrapes public casino data for the Trust Engine. |
| Daily Issue Finder | .cursor/agents/daily-issue-finder.md | (Merged) Reviews code changes and performs smoke tests on new features. |
| Regulatory Scout | .cursor/agents/regulatory-scout.md | Functional: Monitors commission filings via SusLink integration. |
| Verifier | .cursor/agents/verifier.md | Validates completed work. Skeptically confirms implementations are functional after tasks are marked done. |
| Trust Log Analyzer | .cursor/agents/trust-log-analyzer.md | Extracts GGR, Churn, and behavioral metrics from system logs. |
| Brand Specialist | .cursor/agents/design-marketing-brand.md | Visual hierarchy, CTA clarity, and copy coherence. |
| KPI Agent | .cursor/agents/kpi-agent.md | Metrics, experiment readouts, and funnel analysis. |
| Production Auditor | .cursor/agents/production-standards-auditor.md | (Renamed) Ensures codebase remains production-ready and high quality. |

## 3. Workflow & CI Agents
Located in .github/agents/ and .github/workflows/

| Name | Path | Description |
| :--- | :--- | :--- |
| Brand Law Enforcer | .github/agents/brand-law-enforcer.yml | **NEW:** Automated PR reviewer enforcing Degen Laws (tone, headers, no secrets, docs). Blocks critical violations. |
| Weekly Frontend Suggestions | .github/workflows/frontend-suggestions.yml | **NEW:** Weekly automation (Mondays 9AM UTC) generating UI/UX and copy improvement suggestions. |
| CI/CD Validator | .github/agents/ci-cd-validator.yml | Validates GitHub Actions and pipelines. |
| TiltCheck Agent | .github/agents/tiltcheck-agent.yaml | General monorepo task orchestrator. |
| Scribe Agent | .github/agents/scribe-agent.md | Enforces Zero-Drift policy and project laws. |

## 4. Deployment Reality (GHCR -> Railway)
This repo does not ship an active GCP deploy workflow. Container services build in GitHub Actions, publish to GHCR, and redeploy on Railway. Everything else is manual, deprecated, or shipped as a browser asset.

| Surface | Delivery | Source of Truth | Verdict |
| :--- | :--- | :--- | :--- |
| **api** | GHCR -> Railway | `.github/workflows/deploy-railway.yml` | Live: Central Gateway. |
| **web** | GHCR -> Railway | `.github/workflows/deploy-railway.yml` + `.github/workflows/configure-tunnel.yml` | Live: `tiltcheck.me` and `www.tiltcheck.me`. |
| **discord-bot** | GHCR -> Railway | `.github/workflows/deploy-railway.yml` | Live: primary TiltCheck bot runtime. |
| **justthetip-bot** | GHCR -> Railway | `.github/workflows/deploy-railway.yml` | Live: separate tipping bot service. |
| **dad-bot** | GHCR -> Railway | `.github/workflows/deploy-railway.yml` | Live: separate dad bot service. |
| **trust-rollup** | GHCR -> Railway | `.github/workflows/deploy-railway.yml` | Live: Trust Engine aggregator. |
| **control-room** | GHCR -> Railway | `.github/workflows/deploy-railway.yml` + `.github/workflows/configure-tunnel.yml` | Live: `admin.tiltcheck.me`. |
| **game-arena** | GHCR -> Railway | `.github/workflows/deploy-railway.yml` + `.github/workflows/configure-tunnel.yml` | Live: `arena.tiltcheck.me`. |
| **user-dashboard** | GHCR -> Railway | `.github/workflows/deploy-railway.yml` + `.github/workflows/configure-tunnel.yml` | Live: `dashboard.tiltcheck.me` and `hub.tiltcheck.me`. |
| **activity** | GHCR -> Railway | `.github/workflows/deploy-railway.yml` + `.github/workflows/configure-tunnel.yml` | Live: `activity.tiltcheck.me`. |
| **cloudflared** | GHCR -> Railway | `.github/workflows/deploy-railway.yml` + `.github/workflows/configure-tunnel.yml` | Live: tunnel daemon backing public ingress. |
| **hub** | Deprecated manual worker path | `.github/workflows/deploy-hub.yml` intentionally blocks deployment | Not separately deployed; hostname routes to `user-dashboard`. |
| **chrome-extension** | Browser asset | Manual packaging from `apps/chrome-extension` | Functional browser asset pointing at production API. |
| **degens-activity** | Manual/browser asset | No repo-wired production workflow | Not wired to production in-repo. |
| **tiltcheck-activity** | Manual/browser asset | No repo-wired production workflow | Not wired to production in-repo. |

## 5. Core System Modules
Functional code located in modules/

| Name | Path | Function |
| :--- | :--- | :--- |
| Tilt Detector | modules/tiltcheck-core/ | Logic for monitoring community activity for tilt signals. |
| JustTheTip | modules/justthetip/ | Logic for intelligent tipping and financial transactions. |
| Solana Agent | packages/agent/ | Degen Intelligence Agent (DIA) via Google ADK. |

---
Last Updated: 2026-05-03

## 6. GitHub Copilot Custom Agents
Located in .github/agents/

These agents are available as GitHub Copilot custom agents within the repository. Invoke them in Copilot chat to scope assistance to a specific domain.

| Name | File | Description |
| :--- | :--- | :--- |
| backend-developer | .github/agents/backend-developer.agent.md | Specialized agent for backend development in TiltCheck monorepo. Handles building, refactoring, testing, and improving backend services. Always verifies compliance with brand laws and documents any bugs or errors encountered. |
| devops-agent | .github/agents/devops-agent.agent.md | Specialized agent for DevOps and deployment tasks in TiltCheck monorepo. Handles building, configuring, deploying, and monitoring infrastructure and CI/CD pipelines. Always verifies compliance with brand laws and documents any bugs or errors encountered. |
| frontend-developer | .github/agents/frontend-developer.agent.md | Specialized agent for frontend development in TiltCheck monorepo. Handles building, refactoring, testing, and improving frontend code. Always verifies compliance with brand laws and documents any bugs or errors encountered. |
| fullstack-developer | .github/agents/fullstack-developer.agent.md | Specialized agent for full-stack development in TiltCheck monorepo. Handles building, refactoring, testing, and improving cross-cutting features across frontend and backend. Always verifies compliance with brand laws and documents any bugs or errors encountered. |
| platform-strategy-agent | .github/agents/platform-strategy-agent.agent.md | Specialized agent for marketing pain-point analysis, UX friction evaluation, and platform-fit strategy. Recommends where tools and flows should live across web, dashboard, Discord, extension, control-room, and API. |
| scribe-agent | .github/agents/scribe-agent.md | Ecosystem documentarian and rule enforcer. Automates copyright headers, UI footers, and ensures zero-drift between code and docs. |

## Latest Additions (This Session)

### GitHub Copilot Custom Agents (ACTIVE)
- **Purpose:** Domain-scoped AI assistants available via GitHub Copilot chat in the repository
- **Agents:** backend-developer, devops-agent, frontend-developer, fullstack-developer, platform-strategy-agent, scribe-agent
- **Compliance:** All agents enforce brand laws (copyright headers, no emojis, atomic docs, non-custodial flows)
- **Files:** `.github/agents/backend-developer.agent.md`, `.github/agents/devops-agent.agent.md`, `.github/agents/frontend-developer.agent.md`, `.github/agents/fullstack-developer.agent.md`, `.github/agents/platform-strategy-agent.agent.md`, `.github/agents/scribe-agent.md`

### Platform Strategy Agent (ACTIVE)
- **Purpose:** Evaluates user pain points, UX friction, and platform-fit across the TiltCheck ecosystem so each tool lives on the right surface.
- **Focus:** Discovery vs configuration vs real-time guardrails vs durable settings vs social/accountability flows.
- **Surfaces:** `web`, `user-dashboard`, `chrome-extension`, `discord-bot`, `control-room`, and `api`.
- **Outcome:** Recommends primary surface, supporting surfaces, user journey, friction risks, and what should not be duplicated elsewhere.
- **File:** `.github/agents/platform-strategy-agent.agent.md`

### Brand Law Enforcer Agent (ACTIVE)
- **Purpose:** Automated PR gatekeeper enforcing "The Degen Laws"
- **Trigger:** Every PR open/update
- **Critical Checks:** Hardcoded secrets, custodial code, copyright headers
- **Brand Checks:** Tone (no apologies), no emojis, footer requirement, atomic docs
- **Action:** Blocks critical violations, requests changes for medium issues
- **Files:** `.cursor/agents/brand-law-enforcer.md` + `.github/agents/brand-law-enforcer.yml`

### Frontend & Marketing Suggestions Agent (ACTIVE)
- **Purpose:** Weekly (Mondays 9AM UTC) suggestions for web/extension UX improvements
- **Focus:** CTA optimization, copy clarity, mobile responsiveness, dark mode, A/B tests
- **Categories:** Conversion, messaging, visual hierarchy, friction reduction, mobile, dark mode
- **Target:** +5-15% engagement and conversion improvements
- **Files:** `.cursor/agents/frontend-marketing-suggestions.md` + `.github/workflows/frontend-suggestions.yml`

## Cursor Cloud specific instructions

### Monorepo overview

pnpm v10.29.1 workspace managed by Turborepo. Node 20. All packages are ESM (`"type": "module"`).
Standard commands are in root `package.json` scripts; see the README "Getting Started" section.

### Starting services

| Service | Command | Default port |
| :--- | :--- | :--- |
| **web** (Next.js landing) | `pnpm -C apps/web dev` | 3001 |
| **api** (Express gateway) | `pnpm --filter @tiltcheck/api dev` | 8080 |
| **discord-bot** | `pnpm --filter @tiltcheck/discord-bot dev` | 8080 (health) |
| **user-dashboard** | `pnpm --filter @tiltcheck/user-dashboard dev` | 6001 |
| **control-room** | `pnpm --filter @tiltcheck/control-room dev` | 3003 |
| **trust-rollup** | `pnpm --filter @tiltcheck/trust-rollup dev` | 3005 |
| **game-arena** | `pnpm --filter @tiltcheck/game-arena dev` | (Socket.io) |

The API uses `tsx watch --env-file=../../.env` so it picks up the root `.env` automatically.
The web app (Next.js) reads `NEXT_PUBLIC_*` vars from the root `.env` at build/dev time.

### Environment setup gotchas

- `.env` must be created from `.env.example` before starting services. Set `SKIP_ENV_VALIDATION=true` and `SKIP_DISCORD_LOGIN=true` for local/cloud dev without real credentials.
- `VAULT_ENCRYPTION_KEY` must be exactly 64 hex characters (32 bytes). Use a dummy key like `0123456789abcdef` repeated 4 times for dev.
- The API logs `ECONNREFUSED` for PostgreSQL on startup if no DB is running -- this is non-fatal. The server still starts and serves HTTP requests. DB-dependent routes will return errors.
- Sentry warns `Invalid Sentry Dsn: REPLACE_ME` on API startup -- harmless in dev.
- `pnpm -r build` fails on `apps/web` due to Next.js prerendering errors. This is a known issue on main. Use `pnpm -C apps/web dev` for development instead of building.
- Shared packages must be built before running apps: the update script handles this, but if you modify a shared package in `packages/` or `modules/`, rebuild it with `pnpm --filter <pkg>... build` before restarting dependent services.
- Some native build scripts are ignored by `pnpm.onlyBuiltDependencies` policy. The warning about `pnpm approve-builds` can be safely ignored.

### Lint / test / trust-engine verification

- **Lint:** `pnpm lint` (pre-existing warnings/errors on main are expected)
- **Test:** `pnpm test` (runs root vitest config; builds `@tiltcheck/database` first)
- **Trust engine smoke test:** `pnpm trust:start` (builds trust-engines then runs startup verification)
