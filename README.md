© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-28

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

TiltCheck is a non-custodial gambling-defense product for degens who want proof before trust and hard exits before tilt burns the bankroll.

It does not try to stop degens from being degens.  
It helps them verify casinos, protect live sessions, and lock in wins before chaos takes over.

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

## North Star Product Loop

TiltCheck is being refocused around one clear product loop:

- **Web** proves trust, explains risk, and drives installs.
- **Chrome extension** protects users during live sessions.
- **Dashboard** owns durable controls, history, exclusions, vault rules, and accountability settings.
- **Discord** sends alerts, summaries, and nudges.
- **API** handles auth, scoring, routing, and enforcement.

Anything that does not strengthen trust proof, extension activation, durable protections, or retained protected usage is not core.

### Surface ownership

| Surface | Owns | Does not own |
| --- | --- | --- |
| **Web** | Trust proof, casino pages, education, install funnel | Durable account controls, internal ops, side experiments in primary nav |
| **Chrome extension** | Live session detection, warnings, interventions, in-session protection | Long-form account management, broad content discovery |
| **Dashboard** | Rules, history, exclusions, vault controls, accountability settings | Top-of-funnel discovery, anonymous acquisition |
| **Discord** | Alerts, summaries, nudges, accountability follow-through | Primary onboarding, complex settings, account management |
| **API** | Auth, scoring, routing, enforcement, integrations | User-facing product storytelling |
| **Control-room** | Internal operations, diagnostics, moderation | Public user journey |

### Current focus freeze

Until the core loop is clean, TiltCheck is freezing work that does not directly improve:

- trust proof on web
- extension install and activation
- durable protections and history in the dashboard
- retained protected usage after first setup

---

## Platform capabilities

TiltCheck exposes its core intelligence engines through a shared API layer, but that platform capability is downstream of the main product loop above:

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
├── programs/cooldown/       # Solana self-exclusion registry (no custody)
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

## Cooldown

Cooldown is the on-chain safety layer for TiltCheck. A person locks their own wallet out of gambling. Any casino, tip bot, wallet, or sweepstakes site can check that lock. The program stores lock records only: wallet public keys, timestamps, and sha256 hashes of game ids. It does not hold tokens, custody funds, or personal data.

A lock can only get stronger until it expires or a delayed cancel finishes. Stronger means a later end time, a wider scope, or more listed operators and games. Scope `0` excludes all gambling. Scope `1` excludes listed operators. Scope `2` excludes listed game hashes. Moving from operators or games to all-gambling is allowed. Going the other way, shrinking the end time, or dropping an entry is rejected. That is deliberate: a self-exclusion you can undo in the moment of tilt does not work.

Getting out takes time. `request_cancel` starts a 7-day clock (`CANCEL_DELAY_SECS = 604800`) and the lock stays fully active during it. `finalize_cancel` closes the account only after those 7 days and returns the rent to the authority. Extending the lock clears a pending cancel, so the 7 days start over if you ask again. `close_expired` closes the account only once `now > until`.

The devnet program id is `7guGrKGy9BoTDe7kC9ng5Yn9B1Ykaa7uAp6e4TRZYeB2`.

### SDK

`@tiltcheck/cooldown-sdk` checks a wallet and builds the transactions. No lock, or `now > endTime`, means not locked.

```ts
import { isLocked, setLock, hashTarget, zeroTarget, SCOPE_ALL, SCOPE_GAME } from '@tiltcheck/cooldown-sdk';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const wallet = new PublicKey('...');

// Check lock status (priority: All > Category > Game)
const status = await isLocked(connection, wallet, {
  game: 'pragmatic:plinko',   // optional, hashed internally
  category: 'crash',          // optional
});
// { locked: boolean; scope: 'all'|'category'|'game'|null; endTime: number | null }

// Build a set_lock instruction (30-day all-scope lock)
const endTime = Math.floor(Date.now() / 1000) + 30 * 86_400;
const ix = setLock(wallet, SCOPE_ALL, zeroTarget(), endTime);
const tx = new Transaction().add(ix);
```

Also exports: `extendLock`, `hashTarget`, `zeroTarget`, `SCOPE_ALL`, `SCOPE_GAME`.

### API

Sweepstakes sites can check a wallet without a Solana client. The route is read-only, CORS-open, and caches for 30 seconds.

```
GET /cooldown/check?wallet=<pubkey>&game=<str>&category=<str>
```

```json
{ "locked": true, "scope": "game", "endTime": 1832400000 }
```

Set `COOLDOWN_PROGRAM_ID` and `COOLDOWN_RPC_URL` (defaults to devnet).

### License

The Cooldown program (`programs/cooldown`) and `@tiltcheck/cooldown-sdk` are MIT licensed. See `programs/cooldown/LICENSE`. The rest of this repository keeps its own license.

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

See **[QUICKSTART.md](./QUICKSTART.md)** for 5-minute setup, **[ONE-LAUNCH-DEPLOYMENT.md](./ONE-LAUNCH-DEPLOYMENT.md)** for one-command Docker deployment, **[docs/DEPLOY.md](./docs/DEPLOY.md)** for the canonical production guide, or **[SPACESHIP-DEPLOYMENT-ENV.md](./SPACESHIP-DEPLOYMENT-ENV.md)** for complete Spaceship/Hyperlift environment variables.

### Production Deployment

Production deploys are wired around GitHub Actions, GHCR, Railway, and external domain routing. Direct Railway custom domains are valid. `.github/workflows/configure-tunnel.yml` remains optional if you deliberately run Cloudflare Tunnel in front of Railway. `docs/DEPLOY.md` is the canonical deploy inventory.

For current deployment reality, use the following sources of truth:
- **[Canonical Deploy Inventory](./docs/DEPLOY.md)** - workflows, images, Railway services, required env, and smoke targets.
- **[Railway Deploy Workflow](./.github/workflows/deploy-railway.yml)** - builds GHCR images and triggers Railway redeploys for the wired services.
- **[Tunnel Route Workflow](./.github/workflows/configure-tunnel.yml)** - optional helper for teams that intentionally run Cloudflare Tunnel in front of Railway.

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

### ESLint layout

- Root `eslint.config.js` is the shared flat-config source for the monorepo.
- `apps/web/eslint.config.mjs` extends the shared base and layers on `eslint-config-next/core-web-vitals` plus `eslint-config-next/typescript`.
- `packages/agent/eslint.config.mjs` remains package-local and extends the shared base with package-specific overrides.
- `.eslintrc.*` files are intentionally removed. If a package needs custom lint behavior, add a local flat config instead of reviving legacy config.
- `@typescript-eslint/no-explicit-any` is re-enabled as `warn` at the shared layer. Treat new warnings as cleanup debt or add a targeted local suppression with a reason when the type truly cannot be narrowed yet.

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
- **Railway + GHCR** — Container runtime plus image registry for the wired production services
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

## Cooldown

Cooldown is a portable, non-custodial self-exclusion registry on Solana.
A user locks their wallet out of a specific game, category, or everything for a chosen duration.
Any casino, tip bot, or wallet can query the lock via the API or on-chain — no Solana client required.

**Program ID (devnet):** `7guGrKGy9BoTDe7kC9ng5Yn9B1Ykaa7uAp6e4TRZYeB2`

### Lock scopes

| Scope | Value | Meaning |
|-------|-------|---------|
| All | `0` | Blocks every gambling check for this wallet |
| Category | `1` | Blocks a named category (crash, plinko, slots-high-vol, live-dealer) |
| Game | `2` | Blocks a specific game, identified by sha256 of `"provider:game_slug"` |

Each (scope, target_id) pair is a separate PDA: `["lock", owner, scope_u8, target_id]`.
A wallet can have many concurrent locks. Game IDs are hashed — raw strings never hit the chain.

### Why a lock can only get stronger

`set_lock` is an upsert: it creates the lock PDA on first call; on subsequent calls it only accepts a `new_end_time > current_end_time`. `extend_lock` enforces the same rule. There is no instruction that shortens or closes an active lock. The account expires naturally when `now > end_time`. This means no mid-tilt cancel is possible — the user cannot rug themselves out of their own commitment window.

### SDK usage

```ts
import { isLocked, setLock, hashTarget, zeroTarget, SCOPE_ALL, SCOPE_GAME } from '@tiltcheck/cooldown-sdk';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const wallet = new PublicKey('...');

// Check if a wallet is locked (priority: All > Category > Game)
const status = await isLocked(connection, wallet, {
  game: 'pragmatic:plinko',   // optional, hashed internally
  category: 'crash',          // optional
});
// { locked: boolean; scope: 'all'|'category'|'game'|null; endTime: number | null }

// Build a set_lock instruction (30-day all-scope lock)
const endTime = Math.floor(Date.now() / 1000) + 30 * 86_400;
const ix = setLock(wallet, SCOPE_ALL, zeroTarget(), endTime);
const tx = new Transaction().add(ix);
```

### API usage

```
GET https://api.tiltcheck.me/cooldown/check?wallet=<pubkey>&game=<str>&category=<str>
```

Returns `{ locked, scope, endTime }`. CORS open. 30-second cache. No Solana client needed.

```json
{ "locked": true, "scope": "game", "endTime": 1832400000 }
```

### Lock page and demo casino

- Lock page: `/cooldown` — connect wallet, pick scope/target/duration, sign transaction
- Demo casino: `/cooldown/casino-demo` — game grid that calls `isLocked` before each bet

### JustTheTip integration

Tips and Rain sent to or from a wallet with an active all-scope lock are blocked with a clear message.
If tip velocity in the last 60 minutes is 3x or more the 7-day hourly average, the bot replies with a "Want to bench `<game>`?" tilt hint and a prefilled lock-page URL.

Tip totals (by day and by game): `GET /tips/log?wallet=<pubkey>`

### License

The Cooldown program and SDK are MIT-licensed. See `programs/cooldown/LICENSE`.

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

## Degen Lounge

Neutral hangout for people who gamble. No casino owns it. Brand line: **Show receipts or touch grass.** AIM-chatroom energy.

### Hard rules

- Non-custodial. We never hold, pool, forward, or escrow user funds. No forwarding wallets.
- No casino games, paid placement, paid scores, affiliate links, or sweepstakes promo. Scorecards may link a casino's own terms as evidence only.
- Never show wallet addresses. Never broadcast wins, balances, multipliers, or heaters.
- Nudges warn and offer a skippable breather. Never hard-freeze.
- Typing in chat is never betting activity. Nudges fire only on actual bet controls.
- Anything on-chain is **devnet only** until a lawyer reviews mainnet. `TODO: lawyer review before mainnet.`

### Phases

| Phase | What it does | Status |
| :--- | :--- | :--- |
| 1 Lounge v0 | One websocket room, presence (game title only), mute/report, rate limits | This branch. Hangout is `/lounge` on game-arena. Overlay on the Chrome extension. |
| 2 Casino scorecards | History + evidence for bink.bet and nuts.gg | Not started |
| 3 Tipping (JustTheTip) | Non-custodial USDC pouch, per-viewer HMAC labels | Not started. Do not reuse custodial credits/escrow. |
| 4 Heater protection | Private nudge only | Not started |
| 5 Peer tilt flags | 3-flagger threshold, never public | Not started |
| 6 Trivia night | Reuse game-arena trivia + host Rain | Not started |
| 7 Plans | Feature flags free/pro/streamer. No billing. | Not started |

Logger 0.4 (Bink bets table) is **not in this repo**. Phase 1 presence reuses the Chrome extension game-title readers (URL slug / `data-game-name`). No amounts.

### Run Phase 1 locally

```bash
PORT=3004 pnpm --filter @tiltcheck/game-arena dev
```

Open `http://127.0.0.1:3004/lounge`. Talk to the room. Presence is on the right.

Chrome overlay polls that origin. Override with `chrome.storage.local.tiltcheck_lounge_url`.

```bash
pnpm --filter @tiltcheck/game-arena test
pnpm --filter @tiltcheck/chrome-extension test
```

### Env vars (later phases too)

| Var | Used for |
| :--- | :--- |
| `PORT` | game-arena listen port. Use `3004` locally so it does not collide with API `8080`. |
| `REDIS_URL` | Optional. Arena adapter + future tip NX lock. |
| `SOLANA_RPC` | Must be `https://api.devnet.solana.com` until lawyer review. |
| `TIP_LABEL_SECRET` | Phase 3 HMAC for per-viewer Degen #NNNN labels. |
| `LOUNGE_MOD_USER_IDS` | Comma-separated user ids allowed to mute. Empty in local dev means anyone can mute. |

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
