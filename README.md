© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/icons/tiltcheck-logo.svg">
    <source media="(prefers-color-scheme: light)" srcset="assets/icons/tiltcheck-logo.svg">
    <img alt="TiltCheck Logo" src="logocurrent.png" width="200" height="200">
  </picture>
</p>

<h1 align="center">TiltCheck Ecosystem</h1>

<p align="center">
  <a href="https://github.com/jmenichole/tiltcheck-monorepo/actions/workflows/health-check.yml"><img src="https://github.com/jmenichole/tiltcheck-monorepo/actions/workflows/health-check.yml/badge.svg" alt="Health Check"></a>
  <a href="https://github.com/jmenichole/tiltcheck-monorepo/actions/workflows/codeql.yml"><img src="https://github.com/jmenichole/tiltcheck-monorepo/actions/workflows/codeql.yml/badge.svg" alt="CodeQL"></a>
  <a href="https://github.com/jmenichole/tiltcheck-monorepo/actions/workflows/security-audit.yml"><img src="https://github.com/jmenichole/tiltcheck-monorepo/actions/workflows/security-audit.yml/badge.svg" alt="Security Audit"></a>
</p>

<p align="center">
  <a href="https://discord.com/oauth2/authorize?client_id=1445916179163250860"><img src="https://img.shields.io/badge/Add%20to%20Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Add to Discord"></a>
  <a href="https://discord.gg/gdBsEJfCar"><img src="https://img.shields.io/badge/Join%20Community-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Join Discord"></a>
</p>

**Built by a degen, for degens.**

TiltCheck is a modular, AI-assisted ecosystem designed to fix the worst parts of online casino culture — scams, unfair bonuses, predatory patterns, tilt-driven decisions, and chaotic Discord communities.

It doesn't try to stop degens from being degens.  
It just gives them a smarter, safer, and more transparent way to play.

### Core Philosophy: Redeem-to-Win

Our primary goal is to shift the definition of a "win." Instead of encouraging endless play, TiltCheck actively nudges users to **cash out (redeem)** their winnings once they cross a profitable threshold. It's a disciplined "hit and run" strategy, turning profitable sessions into tangible wins in your wallet. We're here to help you secure the win, not just prevent the loss.

---

## Recent Product/Platform Updates (Mar 2026)

- **OAuth callback hardening:** `/auth/discord/callback` now derives auth source from the signed `state` value (`ext_` / `web_`) and rejects cookie/state source mismatches.
- **Extension no-login usability:** the Chrome extension can run in a built-in **demo mode** when no Discord token is present, with mock responses for core sidebar actions.
- **Web dashboard auth gate:** `/dashboard/` now redirects unauthenticated users into the Discord login flow and sends authenticated users to `/play/profile.html`.
- **Static asset packaging fix:** `apps/web` build now copies non-Vite static files into `dist/` so icon/logo and legacy page assets ship correctly.

---

<!-- docs-agent:start:mr-code-impact -->
### MR Code Impact (Auto-updated)

- Generated for ref: `pending`
- Diff source: `pending`
- Changed files detected: **0**
- Touched areas: none

#### Files in scope
- No changed files were detected.
<!-- docs-agent:end:mr-code-impact -->

---

## What Is TiltCheck?

TiltCheck is a suite of independent but interoperable tools that help casino communities:

- **reduce scams** (SusLink)
- **track bonuses** (CollectClock)
- **tip safely** (JustTheTip)
- **detect tilt** (TiltCheck Core)
- **score casinos** (Casino Trust Engine)
- **score users** (Degen Trust Engine)
- **play games** (DA&D)
- **stay accountable** (Accountabilibuddy)

Every module is Discord-first, non-custodial, and optimized for low-cost serverless infrastructure.

---

## 🚀 RGaaS Pivot: Responsible Gaming as a Service

TiltCheck has expanded from a consumer toolset into a **Responsible Gaming as a Service (RGaaS)** provider. We expose our core intelligence engines via a unified API for 3rd-party integration:

- **Tilt Detection API**: Behavioral risk analysis for active sessions.
- **Trust Scoring API**: Real-time reputation checks for casinos and users.
- **Link Scanning API**: Instant threat detection for gambling-related URLs.
- **Risk Profiling**: Unified behavioral snapshots for immediate intervention.

See [16. RGaaS Pivot Docs](./docs/tiltcheck/16-rgaas-pivot.md) for full integration details.

---

## Core Principles

1. **Modularity** — Every tool stands alone
2. **Interoperability** — Tools share insights through trust engines
3. **Predictive Intelligence** — AI evaluates fairness, bonus cycles, and tilt
4. **Cost Discipline** — Built on GCP serverless infrastructure
5. **Degen Ergonomics** — Simple, funny, blunt, and extremely practical

## Branch Protection & Required Checks

TiltCheck protects `main` with required status checks:

- `components-a11y` (shared components: bundle, contrast, a11y)
- `landing-a11y` (landing pages: a11y)
- `Analyze Code` (CodeQL security scanning)

See [`docs/tiltcheck/17-branch-protection.md`](docs/tiltcheck/17-branch-protection.md) for details on the ruleset.

## Automation & Security

TiltCheck includes comprehensive automation for security, reliability, and maintenance:

- **🔐 Security Scanning:** CodeQL (daily), Dependabot (weekly), pnpm audit (daily)
- **🤖 Dependency Updates:** Automated PRs with safe auto-merge for patch/minor updates
- **📋 Issue/PR Templates:** Standardized reporting with security checklists
- **🏷️ Auto-labeling:** Automatic PR labels based on changed files and size
- **🧹 Stale Bot:** Automatic cleanup of inactive issues/PRs
- **👥 CODEOWNERS:** Automatic review requests for security-sensitive changes
- **💚 Health Monitoring:** Production service health checks every 6 hours
- **📝 MR Docs Agent (GitLab MVP):** Optional MR-triggered section updates for README/hackathon docs via marker-owned blocks

**Quick Start:**

- Most automations are already active and require no setup
- See [GITHUB-AUTOMATION-SETUP.md](./docs/GITHUB-AUTOMATION-SETUP.md) for configuration guide
- See [GITHUB-AUTOMATION-REFERENCE.md](./docs/GITHUB-AUTOMATION-REFERENCE.md) for quick reference
- See [docs/hackathon/gitlab-duo-agent-mvp.md](./docs/hackathon/gitlab-duo-agent-mvp.md) for Duo Agent MVP setup

---

## Repository Structure

```
tiltcheck-monorepo/
├── apps/                    # User-facing applications (bot, web, dashboard)
├── services/                # Backend infrastructure and core services
├── modules/                 # Business logic modules (suslink, justthetip, etc.)
├── packages/                # Shared libraries and utilities
├── docs/                    # Documentation
│   ├── history/             # Historical reports and one-off project docs
│   └── tiltcheck/           # Core ecosystem specifications
├── scripts/                 # Utility / CI scripts
├── CONTRIBUTING.md          # Contribution guidelines
├── CHANGELOG.md             # Version history
├── SECURITY.md              # Security policy
└── README.md                # This file
```

---

## Modules Overview

### 🪙 **JustTheTip**

Non-custodial tipping, airdrops, and swaps.  
Community-funded via a **2.5% protocol fee** for free users. No custody. Elite Tier removes all fees.

### 🔗 **SusLink**

AI-powered link scanner that detects scam sites, redirects, and impersonation.

### ⏰ **CollectClock**

Daily bonus tracker with nerf detection and bonus cycle prediction.

### 🎁 **FreeSpinScan** *(archived concept)*

Historical promo submission system with auto-classification, mod approval queue, and prediction engine.  
Removed from the current MVP roadmap but preserved in the codebase/docs for future reference.

### 📋 **QualifyFirst** *(archived concept)*

Historical AI survey router that pre-screened users to prevent screen-outs and wasted time.  
No longer an active project; referenced only as an archived design.

### 🎮 **DA&D (Degens Against Decency)**

AI-powered card game built for degen communities.

### 🧠 **TiltCheck Core**

Tilt detection, cooldown nudges, and accountability tools.

### 🤝 **Accountabilibuddy**

Shared wallet notifications and "phone-a-friend" tilt intervention.

### 🏛️ **Trust Engines**

- **Casino Trust Engine** — Scores casinos based on RTP, bonus nerfs, payout delays, etc.
- **Degen Trust Engine** — Scores users based on behavior patterns, tilt signals, and community actions.

---

## Getting Started

### Cursor Cloud Agent Startup (Recommended)

To bootstrap cloud sessions with preinstalled workspace dependencies and trust-engine readiness, set your Cursor startup command to:

```bash
bash scripts/cloud-agent-env-setup.sh
```

This startup script will:
- sync `pnpm` workspace dependencies (lockfile-aware/idempotent)
- verify TypeScript + Vitest tooling
- prebuild trust-engine dependencies
- seed runtime trust data when scrape artifacts exist
- verify `pnpm trust:start` works end-to-end

### Quick Start

```bash
# Install dependencies
pnpm install

# Configure Discord bot and dashboard
cp apps/discord-bot/.env.example apps/discord-bot/.env
cp apps/dashboard/.env.example apps/dashboard/.env
# Edit .env files with your Discord credentials

# Start dashboard (terminal 1)
pnpm --filter @tiltcheck/dashboard dev

# Start Discord bot (terminal 2)
pnpm --filter discord-bot dev

# Optional: run landing/web app (terminal 3)
pnpm -C apps/web dev

# Test in Discord
# /ping
# /casino stake.com
# /reputation @username
# /scan https://example.com
```

See **[QUICKSTART.md](./QUICKSTART.md)** for 5-minute setup, **[ONE-LAUNCH-DEPLOYMENT.md](./ONE-LAUNCH-DEPLOYMENT.md)** for one-command Docker deployment, **[DEPLOYMENT.md](./DEPLOYMENT.md)** for full production guide, or **[SPACESHIP-DEPLOYMENT-ENV.md](./SPACESHIP-DEPLOYMENT-ENV.md)** for complete Spaceship/Hyperlift environment variables.

### Production Deployment

The TiltCheck ecosystem is deployed on Google Cloud Platform (GCP). Services are containerized and orchestrated using Google Cloud Run, with CI/CD pipelines managed by Google Cloud Build.

For details on the deployment process, see the following documents:
- **[GCP Deployment Guide](./docs/GCP-DEPLOYMENT-GUIDE.md)** - Complete GCP setup and configuration.
- **[Production Deployment Checklist](./docs/PRODUCTION-DEPLOYMENT-CHECKLIST.md)** - Pre-deployment verification.

### Components + A11y Audits

Run the brand-aligned component library and automated accessibility checks:

```bash
# Bundle + contrast + DOM contrast + Pa11y + Lighthouse
pnpm audit:all

# Serve bundled components locally
pnpm a11y:serve  # open http://localhost:5178/index.html

# Minimal DOM snapshot tests
pnpm test:components
```

Artifacts are written to `dist/components/` (including Lighthouse reports). See `docs/tiltcheck/17-components-audits.md` for details.

### For Contributors

1. **Read the docs** in `/docs/tiltcheck/`
2. **Review SETUP.md** for monorepo workflow
3. **Use the Copilot Agent** — it knows the entire architecture
4. **Follow the guidelines** in `CONTRIBUTING.md`
5. **Keep modules independent** — use the Event Router
6. **Stay non-custodial** — never hold user funds

### For Developers

Documentation is the single source of truth.  
Start with:

- **[SETUP.md](./docs/SETUP.md)** for monorepo setup
- **[docs/tiltcheck/0-intro.md](./docs/tiltcheck/0-intro.md)** for ecosystem overview
- **[docs/tiltcheck/9-architecture.md](./docs/tiltcheck/9-architecture.md)** for system design
- **[services/event-router/README.md](./services/event-router/README.md)** for event system
- **[docs/tiltcheck/13-discord-bots.md](./docs/tiltcheck/13-discord-bots.md)** for Discord integration

### Questions?

The custom Copilot Agent can answer questions like:

- "How does the Event Router work?"
- "How does JustTheTip avoid custody?"
- "Where should I add a new Discord command?"
- "What's the flat-fee rule?"
- "How do trust engines communicate?"
- "How do I create a new module?"

---

## Tech Stack

- **Discord.js** — Bot framework
- **Google Cloud Run** — Serverless compute for all backend services
- **Neon PostgreSQL** — Serverless/Edge database (PostgreSQL 16)
- **@neondatabase/serverless** — Ultra-fast stateless HTTP driver
- **Magic.link** — Non-custodial wallet creation
- **Jupiter** — Solana swaps
- **Google Cloud Storage** — Object storage

---

## Development Philosophy

TiltCheck is intentionally:

- **scrappy** (no over-engineering)
- **cheap** (free-tier optimized)
- **modular** (independent tools)
- **Discord-first** (UI comes later)
- **degen-friendly** (practical, not preachy)

It's built by someone who understands the problems firsthand.

---

## Roadmap

### Phase 1 — Core Launch (MVP)

- JustTheTip, SusLink, CollectClock
- Basic trust engines
- TiltCheck Core
- Discord bot

### Phase 2 — Intelligence Expansion

- Prediction models
- Advanced trust scoring
- Accountabilibuddy

### Phase 3 — TiltCheck Arena

- Web UI
- Casino dashboards
- DA&D game arena
- NFT identity manager

See `15-future-roadmap.md` for full details.

---

## Security

TiltCheck follows a minimal attack surface philosophy:

- No custodial systems
- No private key storage
- No sensitive personal data

See `SECURITY.md` for reporting vulnerabilities.

---

## License

© 2024–2026 TiltCheck Ecosystem (Created by jmenichole). All Rights Reserved.

---

## Contact

**Founder:** jmenichole  
**Security:** <jme@tiltcheck.me>

---

**TiltCheck — Made for Degens. By Degens.**

---

## Full License Project History

This project is licensed under **AGPL-3.0-only**. See LICENSE.
