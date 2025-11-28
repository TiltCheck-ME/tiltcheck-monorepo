# TiltCheck Ecosystem

[![Health Full](https://github.com/jmenichole/tiltcheck-monorepo/actions/workflows/health-check.yml/badge.svg)](https://github.com/jmenichole/tiltcheck-monorepo/actions/workflows/health-check.yml)
[![Health Smoke](https://github.com/jmenichole/tiltcheck-monorepo/actions/workflows/health-smoke.yml/badge.svg)](https://github.com/jmenichole/tiltcheck-monorepo/actions/workflows/health-smoke.yml)
[![CodeQL](https://github.com/jmenichole/tiltcheck-monorepo/actions/workflows/codeql.yml/badge.svg)](https://github.com/jmenichole/tiltcheck-monorepo/actions/workflows/codeql.yml)
[![Security Audit](https://github.com/jmenichole/tiltcheck-monorepo/actions/workflows/security-audit.yml/badge.svg)](https://github.com/jmenichole/tiltcheck-monorepo/actions/workflows/security-audit.yml)

**Built by a degen, for degens.**

TiltCheck is a modular, AI-assisted ecosystem designed to fix the worst parts of online casino culture — scams, unfair bonuses, predatory patterns, tilt-driven decisions, and chaotic Discord communities.

It doesn't try to stop degens from being degens.  
It just gives them a smarter, safer, and more transparent way to play.

---

## What Is TiltCheck?

TiltCheck is a suite of independent but interoperable tools that help casino communities:

- **reduce scams** (SusLink)
- **track bonuses** (CollectClock)
- **validate promos** (FreeSpinScan)
- **tip safely** (JustTheTip)
- **detect tilt** (TiltCheck Core)
- **score casinos** (Casino Trust Engine)
- **score users** (Degen Trust Engine)
- **route surveys** (QualifyFirst)
- **play games** (DA&D)
- **stay accountable** (Accountabilibuddy)

Every module is Discord-first, non-custodial, and optimized for low-cost serverless infrastructure.

---

## Core Principles

1. **Modularity** — Every tool stands alone
2. **Interoperability** — Tools share insights through trust engines
3. **Predictive Intelligence** — AI evaluates fairness, bonus cycles, and tilt
4. **Cost Discipline** — Built on free-tier infra (Cloudflare, Supabase, etc.)
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

**Quick Start:**
- Most automations are already active and require no setup
- See [AUTOMATION-SETUP.md](./AUTOMATION-SETUP.md) for configuration guide
- See [AUTOMATION-REFERENCE.md](./AUTOMATION-REFERENCE.md) for quick reference

---

## Repository Structure

```
tiltcheck-monorepo/
├── docs/tiltcheck/          # Complete system documentation
│   ├── 0-intro.md           # Ecosystem introduction
│   ├── 1-brand.md           # Brand identity
│   ├── 2-founder-voice.md   # Communication style
│   ├── 3-ecosystem-overview.md
│   ├── 4-tools-overview.md
│   ├── 5-tool-specs-1.md    # JustTheTip, SusLink, CollectClock
│   ├── 6-tool-specs-2.md    # FreeSpinScan, QualifyFirst
│   ├── 7-tool-specs-3.md    # DA&D, TiltCheck Core, Funding Intelligence
│   ├── 8-trust-engines.md   # Casino + Degen trust engines
│   ├── 9-architecture.md    # System architecture
│   ├── 10-data-models.md    # Database schemas
│   ├── 11-system-prompts.md # AI behavior models
│   ├── 12-apis.md           # API specifications
│   ├── 13-discord-bots.md   # Discord bot architecture
│   ├── 14-poker-module.md   # Future poker module
│   ├── 15-future-roadmap.md # Development roadmap
│   └── 16-diagrams.md       # System diagrams
├── .github/
│   ├── agents/              # Custom Copilot Agent
│   └── workflows/           # CI/CD workflows
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
Flat fee only. No custody. No balance storage.

### 🔗 **SusLink**
AI-powered link scanner that detects scam sites, redirects, and impersonation.

### ⏰ **CollectClock**
Daily bonus tracker with nerf detection and bonus cycle prediction.

### 🎁 **FreeSpinScan**
Promo submission system with auto-classification, mod approval queue, and prediction engine.

### 📋 **QualifyFirst**
AI survey router that pre-screens users to prevent screen-outs and wasted time.
\n+Phase 1 implementation (module `@tiltcheck/qualifyfirst`):
- Deterministic heuristic scoring (no external AI yet)
- Emits events: `survey.match.predicted`, `survey.route.generated`
- Transparent reasons & risk flags (no bypass of legit exclusion criteria)
- Ready for Phase 2 adaptive weighting & trust integration

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

### Quick Start

```bash
# Install dependencies
pnpm install

# Configure Discord bot and dashboard
cp apps/discord-bot/.env.example apps/discord-bot/.env
cp services/dashboard/.env.example services/dashboard/.env
# Edit .env files with your Discord credentials

# Start dashboard (terminal 1)
pnpm --filter @tiltcheck/dashboard dev

# Start Discord bot (terminal 2)
pnpm --filter discord-bot dev

# Test in Discord
# /ping
# /trust casino stake.com
# /trust user @username
# /scan https://example.com
```

See **[QUICKSTART.md](./QUICKSTART.md)** for 5-minute setup, **[DEPLOYMENT.md](./DEPLOYMENT.md)** for production deployment, or **[SPACESHIP-DEPLOYMENT-ENV.md](./SPACESHIP-DEPLOYMENT-ENV.md)** for complete Spaceship/Hyperlift environment variables.

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
- `SETUP.md` for monorepo setup
- `docs/tiltcheck/0-intro.md` for ecosystem overview
- `docs/tiltcheck/9-architecture.md` for system design
- `services/event-router/README.md` for event system
- `docs/tiltcheck/13-discord-bots.md` for Discord integration

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
- **Cloudflare Workers** — Serverless compute
- **Supabase** — Database + edge functions
- **Magic.link** — Non-custodial wallet creation
- **Jupiter** — Solana swaps
- **SQLite / KV** — Lightweight storage

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
- JustTheTip, SusLink, CollectClock, FreeSpinScan
- Basic trust engines
- TiltCheck Core
- Discord bot

### Phase 2 — Intelligence Expansion
- Prediction models
- Advanced trust scoring
- QualifyFirst
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

© 2024–2025 TiltCheck Ecosystem (Created by jmenichole). All Rights Reserved.

---

## Contact

**Founder:** jmenichole  
**Security:** jmenichole007@outlook.com

---

**TiltCheck — Made for Degens. By Degens.**
