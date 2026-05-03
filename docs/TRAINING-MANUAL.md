# TiltCheck — Full Ecosystem Training Manual

© 2024–2026 TiltCheck Ecosystem. All Rights Reserved.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Core Modules](#2-core-modules)
3. [Discord Bots](#3-discord-bots)
4. [Discord Activities (SDK)](#4-discord-activities)
5. [Director's Booth (Live Trivia Admin)](#5-directors-booth)
6. [Live Trivia HQ](#6-live-trivia-hq)
7. [TriviaDrops (Reaction-Based)](#7-triviadrops)
8. [JustTheTip + Rain System](#8-justthetip--rain-system)
9. [SusLink (Link Scanner)](#9-suslink)
10. [CollectClock (Bonus Intelligence)](#10-collectclock)
11. [TiltCheck Core (Tilt Detection)](#11-tiltcheck-core)
12. [Trust Engines](#12-trust-engines)
13. [Game Arena Server](#13-game-arena-server)
14. [Web Tools](#14-web-tools)
15. [Web Landing Pages](#15-web-landing-pages)
16. [API Gateway](#16-api-gateway)
17. [Control Room (Admin)](#17-control-room)
18. [Chrome Extension](#18-chrome-extension)
19. [Shared Packages](#19-shared-packages)
20. [Unified Onboarding](#20-unified-onboarding)
21. [Environment Variables](#21-environment-variables)
22. [Deployment + CI](#22-deployment--ci)
23. [Legal Compliance](#23-legal-compliance)
24. [Troubleshooting](#24-troubleshooting)

---

## 1. System Architecture

```
┌──────────────────── DISCORD ─────────────────────────┐
│                                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │
│  │ TiltCheck  │  │  DAD Bot   │  │ JustTheTip Bot │  │
│  │    Bot     │  │  (Games)   │  │   (Tipping)    │  │
│  └─────┬──────┘  └─────┬──────┘  └──────┬─────────┘  │
│        │               │                │             │
│  ┌─────┴───────────────┴────────────────┴──────────┐  │
│  │              Event Router (pub/sub)              │  │
│  └─────┬───────────────┬────────────────┬──────────┘  │
│        │               │                │             │
│  ┌─────┴──────┐  ┌─────┴──────┐  ┌─────┴──────────┐  │
│  │ TiltCheck  │  │  Degens    │  │                 │  │
│  │ Activity   │  │  Activity  │  │  Chrome Ext     │  │
│  │ (Audit)    │  │  (Games)   │  │  (Session Mon)  │  │
│  └────────────┘  └────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────┘
         │               │                │
         ▼               ▼                ▼
┌──────────────────── BACKEND ─────────────────────────┐
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐   │
│  │   API    │  │  Game    │  │   Control Room    │   │
│  │ Gateway  │  │  Arena   │  │   (Admin Panel)   │   │
│  │          │  │(socket.io│  │                   │   │
│  │ /rgaas   │  │ trivia   │  │ Director's Booth  │   │
│  │ /tip     │  │ DA&D     │  │ Docker Controls   │   │
│  │ /trivia  │  │ lobbies) │  │ Trivia Moderation │   │
│  │ /safety  │  │          │  │ Reports           │   │
│  └──────────┘  └──────────┘  └───────────────────┘   │
│                                                      │
│  ┌──────────────── MODULES ──────────────────────┐   │
│  │                                               │   │
│  │  tiltcheck-core   SusLink     CollectClock    │   │
│  │  (tilt detect)    (link scan) (bonus intel)   │   │
│  │                                               │   │
│  │  JustTheTip       Trust Engines    DA&D       │   │
│  │  (tipping/rain)   (casino scores)  (cards)    │   │
│  │                                               │   │
│  └───────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ Supabase │  │  Redis   │  │  Solana  │           │
│  │ (DB)     │  │ (cache)  │  │ (chain)  │           │
│  └──────────┘  └──────────┘  └──────────┘           │
└──────────────────────────────────────────────────────┘

         ┌──────────────── WEB ──────────────────┐
         │  Next.js Landing + Tools + Casinos    │
         │  tiltcheck.me                         │
         └───────────────────────────────────────┘
```

### Service Map

| Service | Location | Port | Purpose |
|---|---|---|---|
| TiltCheck Bot | `apps/discord-bot` | 8080 | Safety, audit, accountability |
| DAD Bot | `apps/dad-bot` | 8080 | Games, trivia, entertainment |
| JustTheTip Bot | `apps/justthetip-bot` | 8083 | Tipping, rain, wallet linking |
| Game Arena | `apps/game-arena` | 3010 | Socket.io multiplayer + trivia engine |
| API Gateway | `apps/api` | 8080 | REST endpoints for everything |
| Control Room | `apps/control-room` | 3001 | Admin panel + Director's Booth |
| Degens Activity | `apps/degens-activity` | 5174 | Discord Activity (games) |
| TiltCheck Activity | `apps/tiltcheck-activity` | 5175 | Discord Activity (audit) |
| Web | `apps/web` | 3000 | Landing pages (Next.js) |
| Chrome Extension | `apps/chrome-extension` | — | Browser session monitor |

### Core Modules

| Module | Location | Purpose |
|---|---|---|
| `@tiltcheck/tiltcheck-core` | `modules/tiltcheck-core` | Tilt detection engine |
| `@tiltcheck/suslink` | `modules/suslink` | AI-powered link/domain scanner |
| `@tiltcheck/collectclock` | `modules/collectclock` | Bonus intelligence + nerf detection |
| `@tiltcheck/justthetip` | `modules/justthetip` | Tipping, rain, escrow logic |
| `@tiltcheck/dad` | `packages/dad` | Degens Against Decency card game engine |
| `@tiltcheck/trust-engines` | `packages/trust-engines` | Casino + user trust scoring |
| `@tiltcheck/discord-activities` | `packages/discord-activities` | Activity lifecycle manager |
| `@tiltcheck/discord-utils` | `packages/discord-utils` | Shared embeds, formatters, validators |
| `@tiltcheck/event-router` | `packages/event-router` | Cross-service pub/sub event bus |
| `@tiltcheck/shared` | `packages/shared` | Question banks, legal text, constants |
| `@tiltcheck/validator` | `packages/validator` | Input validation (Solana, Discord, URLs) |
| `@tiltcheck/auth` | `packages/auth` | Shared ecosystem auth (Discord OAuth, JWT) |
| `@tiltcheck/database` | `packages/database` | Supabase client wrapper |
| `@tiltcheck/db` | `packages/db` | Query helpers (findUserByDiscordId, etc.) |

---

## 2. Core Modules

### tiltcheck-core (`modules/tiltcheck-core`)

The behavioral detection engine. Watches player actions and fires tilt signals.

**What it tracks:**
- Message velocity and tone (rapid frustrated messages)
- Bet patterns (chasing losses, Martingale spirals)
- Session pacing (click speed, time between bets)
- Loss streaks and recovery patterns

**Key functions:**
- `trackMessage(userId, message)` — feed chat messages for sentiment analysis
- `trackBet(userId, bet, win)` — feed session data for pattern detection
- `getUserTiltStatus(userId)` — get current tilt score (0-100) and signals
- `evaluateRtpLegalTrigger(...)` — check if RTP drift hits legal threshold

**Events published:** `tilt.detected`, `tilt.escalated`, `session.anomaly`

**Used by:** Discord bot (tilt agent loop), game-arena (session relay), API (safety routes)

### Trust Engines (`packages/trust-engines`)

Scores casinos and users on a 0-100 trust scale with pillar breakdowns.

**Casino trust pillars:**
- Financial/Payouts — withdrawal speed, payout complaints
- Fairness/Transparency — RTP accuracy, provably fair support
- Promotional Honesty — bonus terms, nerf detection (via CollectClock)

**Functions:**
- `getCasinoScores()` — all casino scores
- `getCasinoScore(name)` — single casino score
- `getCasinoBreakdown(name)` — pillar-level breakdown
- `getDegenScore(userId)` — user trust level
- `explainCasinoScore(name)` — human-readable explanation

**Fed by:** SusLink (domain scans), CollectClock (bonus nerfs), RTP reports, community reports

---

## 3. Discord Bots

### TiltCheck Bot (`apps/discord-bot`)

Safety, accountability, and casino trust audit bot.

**Commands:**
| Command | Description |
|---|---|
| `/launch` | Opens the TiltCheck Activity |
| `/session status` | Current session tilt score |
| `/session history` | Past session summaries |
| `/casino <name>` | Casino trust lookup |
| `/verify` | Provably fair bet verification |
| `/buddy add/remove/list` | Accountability buddy system |
| `/scan <url>` | SusLink domain scan |
| `/touchgrass` | Touch Grass Protocol intervention |
| `/trust` | Trust dashboard |
| `/recover` | Responsible gaming resources |
| `/bonuses` | CollectClock bonus feed |
| `/cooldown` | Session cooldown timer |
| `/beta` | Beta access management |
| `/support` | Support ticket |

**Services:**
- Tilt Agent — background scan loop, DMs users at risk
- Trust Alerts — broadcasts trust score changes
- Bonus Feed — CollectClock integration
- Accountability Pings — buddy system check-ins
- Regulations Notifier — regulatory filing alerts
- Beta Review Queue — manages beta signups
- **Trivia Notifier** — broadcasts Live Trivia game alerts to configured channels
- Safety Interventions — internal API for forced interventions

### DAD Bot (`apps/dad-bot`)

Degens Against Decency — games, trivia drops, entertainment.

**Commands:**
| Command | Description |
|---|---|
| `/launch` | Opens the Degens Activity |
| `/lobby create/join/start/hand/submit/pick/scores/end` | DA&D card game |
| `/triviadrop` | Reaction-based trivia with SOL prizes |
| `/rain <amount>` | Channel SOL airdrop |
| `/jackpot status/fuel` | Trivia prize pool management |
| `/play <game>` | Launch a game activity |
| `/ping` | Bot health check |

### JustTheTip Bot (`apps/justthetip-bot`)

Solana tipping and financial operations.

**Commands:**
| Command | Description |
|---|---|
| `/rain voice` | Split SOL across voice channel members |
| `/rain channel` | Claim-based channel airdrop with timer |
| `/linkwallet` | Link Discord ID → Solana wallet |
| `/lockvault` | Lock profits in non-custodial vault |
| `/profitdrop` | Profit distribution (placeholder) |

---

## 4. Discord Activities

Both use `@discord/embedded-app-sdk` v2.4.1, Vite + TypeScript, socket.io-client.

### Degens Activity (`apps/degens-activity`)

| View | Purpose | Backend |
|---|---|---|
| **Lobby** | Game picker — DA&D, Trivia, Jackpot cards | Static |
| **DA&D** | Card game — play/vote phases | game-arena `play-card`/`vote-card` |
| **Trivia** | Live Trivia HQ — elimination, powerups, timer | game-arena trivia-manager |
| **Jackpot** | Prize pool + recent rain drops + fund button | game-arena `jackpot-update` |

### TiltCheck Activity (`apps/tiltcheck-activity`)

| View | Purpose | Backend |
|---|---|---|
| **Session** | RTP dashboard, drift, P/L, manual entry | hub relay `session.update` |
| **Tilt** | Tilt score 0-100, behavioral signals, The Brakes | relay `tilt.update` |
| **Trust** | Casino lookup by name/domain | API `GET /rgaas/casino-lookup` |

### SDK Auth Flow

```
Discord iframe → SDK.ready() → authorize(code) → POST /auth/discord/activity/token
→ authenticate(access_token) → user identity
→ Falls back to DEMO DEGEN outside Discord
```

---

## 5. Director's Booth

**Access:** `https://<control-room>/director.html` (admin auth required)
**Backend:** `apps/control-room/src/trivia-director.js`

### Panels

| Panel | What it does |
|---|---|
| **Game Config** | Topic, rounds, timer, prize SOL, difficulty — persists to `trivia-config.json` |
| **Live Controls** | Launch / Pause / Resume / Skip / End Game |
| **Push Notifications** | Custom message → eventRouter → Discord bot announces to channels |
| **Schedule** | Recurring games (day + time UTC), enable/disable, shows next run |
| **Player Monitor** | Live roster with scores, eliminated, powerup usage (polls 5s) |
| **KPI Bar** | Round, alive, total, prize pool |
| **Activity Log** | Timestamped admin action log |

### Schedule Auto-Run

```
Scheduler checks every 60s → matches entry time/day
→ Push notification to Discord channels
→ 30s delay for players to join
→ Auto-launch game with entry's config overrides
→ lastAutoRun prevents double-fire
```

---

## 6. Live Trivia HQ

Elimination-style game modeled after HQ Trivia. Run from Director's Booth or `/launch`.

### Game Lifecycle

```
SCHEDULED → (5s) → STARTED → ROUND 1
                               │
                     Question shown (20s timer)
                     Players answer
                     Powerups available
                               │
                     REVEAL → wrong answers eliminated
                               │
                     ┌── Buy-Back Window (15s) ──┐
                     │  Pending transactions      │
                     │  extend round transition   │
                     │  by up to 30s              │
                     └────────────────────────────┘
                               │
                     ROUND 2 ... N
                               │
                     COMPLETED → winners announced
```

### Powerups

| Powerup | Cost | Limit | Effect | Transaction Window |
|---|---|---|---|---|
| **Shield** | Free | 1 per game | Survive one wrong answer | Instant (no tx) |
| **Ape In** | Free | 1 per game | 2x points if correct, instant elimination if wrong | Instant (no tx) |
| **Buy Back** | SOL | 1 per game | Rejoin after elimination | **Requires tx confirmation** |

### Buy-Back Transaction Window

When a player purchases a buy-back:
1. Player clicks Buy Back → Solana Pay flow initiated
2. Trivia manager enters `buy-back-pending` state for that player
3. Round transition delay extends +15s (max +30s) if ANY player has pending buy-back
4. Transaction confirms on-chain → player reinstated → `trivia.player.reinstated` emitted
5. Timeout (30s) → buy-back cancelled, refund attempted → round proceeds
6. Timer in Activity UI shows "TRANSACTION PENDING" state during window

This prevents the "paid but missed the round" problem. The game waits for the money to land.

### Event Flow

```
trivia-manager → eventRouter → game-arena/server.ts → socket.io → Activity relay → trivia view

Events: trivia.started, trivia.round.start, trivia.round.reveal,
        trivia.player.eliminated, trivia.player.reinstated, trivia.completed
```

### Question Bank

`packages/shared/src/trivia.ts` — topics: casino, crypto, degen, gambling_math, strategy.
Additional questions added via Control Room trivia moderation tab → `trivia_additions.json`.

---

## 7. TriviaDrops

Casual reaction-based trivia in Discord chat. Different from Live Trivia HQ.

| Aspect | TriviaDrops | Live Trivia HQ |
|---|---|---|
| Platform | Discord chat (emoji reactions) | Discord Activity (SDK) |
| Command | `/triviadrop` | Director's Booth or `/launch` |
| Elimination | No | Yes |
| Powerups | No | Shield, Ape In, Buy Back |
| Prize split | Correct reactors split per round | Winner takes all |
| Anti-cheat | Multi-reaction = blocked | Server-validated answers |

### Flow

```
/triviadrop topic:casino prize_total:2 rounds:3 timer:30
→ Escrow keypair generated + Solana Pay link
→ Host funds escrow (2.5 min timeout)
→ FUNDED → questions drop with emoji reactions
→ Timer per question → correct reactors earn share
→ Anti-collector: multiple reactions = flagged + blocked
→ PAYOUT → linked wallets or community wallet
→ Solscan link posted
```

---

## 8. JustTheTip + Rain System

### Shared Module (`modules/justthetip`)

| File | Purpose |
|---|---|
| `core.ts` | Tip creation and execution logic |
| `credits.ts` | CreditService — transient credit ledger |
| `solana.ts` | On-chain transaction execution |
| `rain.ts` | Shared escrow utilities for rain/triviadrop |
| `types.ts` | Type definitions |

### Rain Utilities (`rain.ts`)

| Function | Purpose |
|---|---|
| `createEscrow(config)` | Generate ephemeral keypair + Solana Pay URL |
| `pollForFunding(pubkey, lamports)` | Poll balance until funded or timeout |
| `executeSplitPayout(keypair, lamports, recipients)` | Split SOL to linked wallets |
| `refundToWallet(keypair, lamports, address)` | Refund host on failure |
| `encryptKeypair/decryptKeypair` | AES-256-CBC escrow key persistence |

### Rain Flow (`/rain` in dad-bot)

```
/rain amount:5
→ Escrow created + encrypted + persisted to tmp/rain-escrow/
→ Solana Pay funding link shown
→ Host funds (2.5 min poll)
→ FUNDED → claim message with 2 buttons:
   ├── "CLAIM RAIN" (real) — first 15 claimants split pot
   └── "BOT/COLLECTOR CLAIM" (trap) — blocks bots
→ 60-second claim window
→ PAYOUT → linked wallets get SOL, no-wallet → community wallet
→ Escrow record deleted
```

### Non-Custodial Principles

- Escrow keypairs are ephemeral — created per transaction, destroyed after
- User wallets are linked via `/linkwallet`, never stored as private keys
- Bot wallet = "operational relay wallet" — signs transactions, doesn't hold user funds
- Credit ledger = transient transfer state, not held funds
- All payouts are on-chain, verifiable on Solscan

---

## 9. SusLink

**Location:** `modules/suslink` (`@tiltcheck/suslink`)

AI-powered link and domain scanner. Philosophy: "Inform, don't block."

### What it detects

| Signal | Method |
|---|---|
| Risky TLDs | `.tk`, `.xyz`, `.buzz`, etc. |
| Typosquatting | Levenshtein distance vs known casino domains (e.g. `stakee.com`) |
| Scam keywords | "free-spin", "guaranteed-win" in URL |
| Suspicious subdomains | Long chains, login/verify subdomains |
| Redirect chains | Follows HEAD requests to find hidden destinations |
| AI moderation | GPT-backed scan with 5s timeout, falls back to heuristics |

### Risk levels

| Level | Meaning |
|---|---|
| `safe` | No signals detected |
| `suspicious` | Minor flags, proceed with caution |
| `high` | Multiple signals, likely scam |
| `critical` | Known scam domain or redirect to one |

### Usage

```typescript
import { suslink } from '@tiltcheck/suslink';
const result = await suslink.scanUrl('https://stakee.com');
// { riskLevel: 'high', reason: 'Typosquatting: similar to stake.com', ... }
```

### Integration points

- `/scan` command (discord-bot) — user-facing URL scan
- `/rgaas/scan` API endpoint — programmatic scanning
- `/safety/suslink/scan` API endpoint — alternate route
- Auto-scan on promo submissions (event-driven)
- Feeds into trust engine — flagged domains penalize casino trust scores
- Domain Verifier web tool — `apps/web/src/app/tools/domain-verifier`

---

## 10. CollectClock

**Location:** `modules/collectclock` (`@tiltcheck/collectclock`)

Bonus intelligence engine — personal timer tool AND community intel feed for trust scoring.

### Two roles

**For the individual degen:**
- Track daily casino bonuses, rakeback timers, free spin schedules
- Per-user cooldown timers ("Stake daily reloads in 4h 22m")
- Custom categories (track your own bonus types like "Daily SC")
- Claim history and stats

**For the ecosystem:**
- Nerf detection — catches >15% bonus drops, fires `bonus.nerf.detected`
- RTP nerf detection — compares provider max RTP vs platform-reported RTP
- Bonus trend predictions — averages over N samples to spot degradation
- Feeds trust engines — nerf events directly penalize casino trust scores
- Community aggregation — multiple users reporting same nerf = verified signal

### Key functions

```typescript
import { collectclock } from '@tiltcheck/collectclock';

// Casino tracking
collectclock.registerCasino('Stake', 1.0);       // Register with base bonus SOL
collectclock.updateBonus('Stake', 0.8);            // Update — triggers nerf if >15% drop
collectclock.claimBonus('Stake', 'user123');        // Record a claim

// User timers
const timers = collectclock.getUserTimers('user123');
// [{ casino: 'Stake', nextClaimAt: '2026-05-03T04:00:00Z', ... }]

// RTP tracking
collectclock.reportRtp('Stake', 'Sweet Bonanza', 94.2);  // vs provider max 96.5
```

### Events published

| Event | When |
|---|---|
| `bonus.nerf.detected` | Bonus dropped >15% |
| `bonus.updated` | Any bonus value change |
| `rtp.nerf.detected` | Platform RTP below provider max |
| `trust.casino.updated` | Trust score adjusted from nerf |

### Where it surfaces

- Discord bot: `/bonuses` command, CollectClock handler
- API: `GET /bonuses` proxy endpoint
- Web: `apps/web/src/app/tools/collectclock` (client-side timers)
- Activity: Degens Activity jackpot view shows recent bonus drops
- Trust engines: nerf events feed directly into casino trust scores

---

## 11. TiltCheck Core

**Location:** `modules/tiltcheck-core` (`@tiltcheck/tiltcheck-core`)

The behavioral detection engine that powers The Brakes.

### What it watches

| Signal | Detection |
|---|---|
| Click speed | Rapid clicking patterns indicating auto-pilot |
| Bet patterns | Loss chasing, Martingale spirals, doubling down |
| Session pacing | Time between bets decreasing = tilt escalating |
| Message sentiment | Frustrated, desperate, or reckless language |
| Loss streaks | Consecutive losses beyond statistical norms |

### Tilt score (0-100)

| Range | Label | Action |
|---|---|---|
| 0-19 | CLEAR | No intervention |
| 20-39 | WATCH | Passive monitoring |
| 40-59 | ELEVATED | Buddy alerts sent |
| 60-79 | HIGH | Direct DM warning |
| 80-100 | CRITICAL | The Brakes — forced exit prompt |

### The Brakes

When tilt score hits threshold:
1. Player gets DM with tilt data and exit prompt
2. Buddies get alert ("your friend is showing HIGH tilt signs")
3. Activity UI shows ENGAGED state with exit guidance
4. Session data preserved as evidence

---

## 12. Trust Engines

**Location:** `packages/trust-engines` (`@tiltcheck/trust-engines`)

### Casino Trust Score (0-100)

**Pillars:**
| Pillar | Weight | Fed By |
|---|---|---|
| Financial/Payouts | High | Withdrawal reports, payout timing |
| Fairness/Transparency | High | RTP accuracy, provably fair support |
| Promotional Honesty | Medium | CollectClock nerf detection |

**Grade scale:** A+ (90-100), A (80-89), B (70-79), C (60-69), D (50-59), F (<50)

**Risk levels:** Low, Moderate, High, Critical

### Data inputs

- SusLink domain scans → domain safety affects trust
- CollectClock bonus nerfs → promotional honesty pillar
- RTP drift reports → fairness pillar
- Community reports → weighted by reporter trust
- Regulatory filings → via SusLink regulatory scout

---

## 13. Game Arena Server

**Location:** `apps/game-arena/src/server.ts` — Port 3010

Manages all real-time multiplayer gameplay via socket.io.

### Systems managed

| System | Engine | Description |
|---|---|---|
| DA&D | `GameManager` + `@tiltcheck/dad` | Card game lobbies, rounds, judging |
| Live Trivia | `TriviaManager` (1400+ lines) | Elimination trivia with powerups |
| Lobbies | `GameManager` | Player matching, game creation |

### Socket.io Events — Client → Server

| Event | Payload | Handler |
|---|---|---|
| `join-lobby` | — | Join lobby room, get game list |
| `join-game` | `gameId` | Join game room, get state |
| `play-card` | `{ gameId, cardId, userId }` | DA&D card play |
| `vote-card` | `{ gameId, cardId, userId }` | DA&D judge vote |
| `submit-trivia-answer` | `{ questionId, answer }` | Submit trivia answer |
| `request-ape-in` | `{ gameId, questionId }` | Activate Ape In |
| `request-shield` | `{ gameId, questionId }` | Activate Shield |
| `buy-back` | `{ gameId }` | Buy back (triggers tx window) |
| `claim-rain` | `{ rainId, timestamp }` | Claim rain drop |
| `schedule-trivia-game` | `{ category, theme, totalRounds }` | Schedule trivia |
| `reset-trivia-game` | — | End current game |

### Socket.io Events — Server → Client

| Event | When |
|---|---|
| `game-update` | Any state change (trivia-started/completed, etc.) |
| `trivia-round-start` | New round begins |
| `trivia-round-reveal` | Answer revealed |
| `trivia-player-eliminated` | Player eliminated |
| `trivia-player-reinstated` | Player bought back |
| `trivia-ape-in-result` | Ape In result |
| `trivia-shield-result` | Shield activation |
| `dad.round` | DA&D game state update |
| `jackpot-update` | Prize pool changed |
| `tip.rain` | Rain drop available |
| `tip.rain.claimed` | Rain claim acknowledged |
| `tip.sent` | Tip notification |

### Director's Booth REST Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/trivia/status` | Current game state |
| POST | `/trivia/schedule` | Launch a game |
| POST | `/trivia/control` | Pause/resume/skip/end |
| POST | `/trivia/swap-question` | Swap question (placeholder) |

---

## 14. Web Tools

All at `apps/web/src/app/tools/`. Each is a Next.js page.

| Tool | Route | Purpose | Backend? |
|---|---|---|---|
| **Bet Verifier** | `/tools/verify` | HMAC-SHA256 provably fair verification | No (client crypto) |
| **Domain Verifier** | `/tools/domain-verifier` | License checks + SusLink scanning | Yes (`/rgaas/scan`) |
| **House Edge Scanner** | `/tools/house-edge-scanner` | RTP greed premium calculator | No (client math) |
| **Session Stats** | `/tools/session-stats` | RTP data from provider master | No (static JSON) |
| **Scan Scams** | `/tools/scan-scams` | Shadow ban feed, casino flags | Yes (`/rgaas/*`) |
| **CollectClock** | `/tools/collectclock` | Bonus cooldown timers | Partial (client + `/bonuses`) |
| **AutoVault** | `/tools/auto-vault` | Vault management | Dashboard redirect |
| **Buddy System** | `/tools/buddy-system` | Safety buddy dashboard | Dashboard redirect |
| **Degens Arena** | `/tools/degens-arena` | TriviaDrop arena explainer | Static |
| **JustTheTip** | `/tools/justthetip` | Tipping system info | Yes (`/tip/*`) |
| **Geo Laws** | `/tools/geo-laws` | Gambling legality by region | No (static data) |
| **Tarot Flip** | `/tools/tarot-flip-comparison` | Tarot flip mechanic comparison | No (`@tiltcheck/shared`) |

---

## 15. Web Landing Pages

**Location:** `apps/web` (Next.js App Router)

### Site Map

| Route | Content | Audience |
|---|---|---|
| `/` | Hero + Three Jobs + Bridge CTA + RG disclaimer | Everyone |
| `/about` | Value proposition, philosophy, founder, roadmap | Deep readers |
| `/casinos` | Casino trust directory + RTP drift ticker | Players |
| `/casinos/[slug]` | Individual casino trust page | Players |
| `/how-it-works` | System explanation | New users |
| `/tools` | Tool index grid | Power users |
| `/extension` | Browser extension page | Players |
| `/bonuses` | Daily bonus tracker (CollectClock) | Players |
| `/blog` | Content + updates | Everyone |
| `/docs` | Documentation | Developers |
| `/touch-grass` | Responsible gaming resources (NCPG, 1-800-GAMBLER) | At-risk users |
| `/beta-tester` | Beta access signup | Early adopters |
| `/collab` | Contact / partnership | Platforms |
| `/terms` | Terms of service | Legal |
| `/privacy` | Privacy policy | Legal |
| `/legal/limit` | Asset risk limits | Legal |

### Navigation

**Topbar:** How it Works · Tools · Casinos · About | Blog · Docs · Bonuses · Contact | Install CTA | Auth

**Footer groups:** Tools (5 links) · Intel (5 links) · Company (6 links)

**Bottom:** Touch Grass Protocol · Terms · Privacy · Asset Risk Limits · GitHub

---

## 16. API Gateway

**Location:** `apps/api` — Port 8080

### Route Groups

| Mount | Router | Purpose |
|---|---|---|
| `/auth` | `authRouter` | Discord OAuth, JWT, activity token exchange |
| `/rgaas` | `rgaasRouter` | Trust scores, casino lookup, SusLink scan, RTP reports |
| `/tip`, `/justthetip` | `tipRouter` | Tipping, rain, claim, history |
| `/trivia` | `triviaRouter` | Jackpot pool (contribute, payout, reset) |
| `/safety` | `safetyRouter` | SusLink alternate endpoint |
| `/casino` | `casinoRouter` | Casino data |
| `/bonuses` | `bonusesRouter` | CollectClock proxy |
| `/bonus` | `bonusRouter` | Individual bonus operations |
| `/vault` | `vaultRouter` | Profit vault operations |
| `/user` | `userRouter` | User profiles, onboarding |
| `/beta` | `betaRouter` | Beta signups |
| `/stats` | `statsRouter` | RTP drift, session stats |
| `/blog` | `blogRouter` | Blog content |
| `/collab` | `collabRouter` | Contact/partnership |
| `/partner` | `partnerRouter` | Partner integrations |
| `/stripe` | `stripeRouter` | Billing |
| `/mod` | `modRouter` | Moderation |
| `/telemetry` | `telemetryRouter` | Extension telemetry |

### Key Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/rgaas/casino-lookup?q=` | Quick casino trust search |
| GET | `/rgaas/casinos` | All casino scores |
| GET | `/rgaas/trust/casino/:name` | Detailed casino breakdown |
| POST | `/rgaas/scan` | SusLink URL scan |
| GET | `/trivia/jackpot` | Current prize pool |
| POST | `/trivia/jackpot/contribute` | Add to pool |
| POST | `/trivia/jackpot/payout` | Record winner payout |
| POST | `/auth/discord/activity/token` | Activity SDK token exchange |

---

## 17. Control Room

**Location:** `apps/control-room` — Port 3001

Admin panel with Discord OAuth + password auth + IP allowlist.

### Tabs

| Tab | Purpose |
|---|---|
| **Containers** | Docker service status, start/stop/restart |
| **Logs** | Live container log streaming via SSE |
| **Reports** | Discord channel report requests with job queue |
| **Metrics** | System metrics, Docker stats |
| **Trivia** | Question moderation (candidates → review → publish to question bank) |
| **Director's Booth** | Live Trivia HQ game management (separate page: `director.html`) |

### Trivia Moderation Flow

```
AI generates question candidate → saved to trivia-candidates.json
→ Admin reviews in Trivia tab → approve/reject/edit
→ Published → appended to packages/shared/src/trivia_additions.json
→ Available in next trivia game
```

---

## 18. Chrome Extension

**Location:** `apps/chrome-extension`

Read-only browser extension that monitors live casino sessions.

**What it does:**
- Watches active casino tabs (read-only, no wallet access)
- Detects click speed, bet patterns, session pacing
- Sends telemetry to API (`/telemetry`)
- Triggers tilt detection in tiltcheck-core
- Shows overlay warnings when tilt threshold hits

**Key principle:** Read-only. No wallet access. No fund control. Browser observation only.

---

## 19. Shared Packages

| Package | Location | Purpose |
|---|---|---|
| `@tiltcheck/shared` | `packages/shared` | Question banks (TRIVIA_QUESTION_BANK), legal disclaimers, topic lists, constants |
| `@tiltcheck/types` | `packages/types` | Shared TypeScript types across all services |
| `@tiltcheck/event-router` | `packages/event-router` | Cross-service pub/sub — all services publish/subscribe through this |
| `@tiltcheck/event-types` | `packages/event-types` | Typed event definitions |
| `@tiltcheck/auth` | `packages/auth` | Shared ecosystem auth (verifySessionCookie, Discord OAuth) |
| `@tiltcheck/database` | `packages/database` | Supabase DatabaseClient wrapper |
| `@tiltcheck/db` | `packages/db` | Query helpers (findUserByDiscordId, getUserBuddies, etc.) |
| `@tiltcheck/config` | `packages/config` | Shared configuration loading |
| `@tiltcheck/validator` | `packages/validator` | Input validation (Solana addresses, Discord IDs, URLs, casino names) |
| `@tiltcheck/utils` | `packages/utils` | Utility functions (getUsdPriceSync, sentiment analyzer) |
| `@tiltcheck/logger` | `packages/logger` | Shared logging |
| `@tiltcheck/monitoring` | `packages/monitoring` | Sentry integration |
| `@tiltcheck/discord-monetization` | `packages/discord-monetization` | Discord SKU/entitlement handling |
| `@tiltcheck/natural-language-parser` | `packages/natural-language-parser` | Parse amounts from natural language ("5 bucks") |
| `@tiltcheck/esm-utils` | `packages/esm-utils` | ESM compatibility helpers |

---

## 20. Unified Onboarding

### Entry Points

| Surface | Auth Method | Onboarding Gate |
|---|---|---|
| **Discord bot** | Automatic Discord identity | Welcome DM → Terms → Risk Quiz → Preferences → `markOnboarded()` |
| **Web login** | Discord OAuth or Magic email | `/login` checks `isOnboarded` → redirects to `/onboarding` wizard if false |
| **Chrome extension** | Discord OAuth via popup | Shows onboarding banner linking to `/onboarding` if not onboarded |

### Shared State

All surfaces read/write the same Supabase `user_onboarding` table via `GET/POST /user/onboarding`.

```
user_onboarding
├── discord_id (PK)
├── is_onboarded (bool)
├── has_accepted_terms (bool)
├── risk_level ('conservative' | 'moderate' | 'degen')
├── cooldown_enabled (bool)
├── voice_intervention_enabled (bool)
├── daily_limit (int)
├── quiz_scores (jsonb)
├── notifications_tips (bool)
├── notifications_trivia (bool)
├── notifications_promos (bool)
├── share_message_contents (bool)
├── share_financial_data (bool)
├── share_session_telemetry (bool)
└── joined_at (timestamptz)
```

### Web Onboarding Wizard (`/onboarding`)

Step-by-step flow with progress bar:

```
1. TERMS — What TiltCheck is/isn't, RG disclaimer, accept terms
2. RISK QUIZ — 3 questions from @tiltcheck/utils ONBOARDING_QUESTIONS
   → Calculates suggested risk level (conservative/moderate/degen)
3. PREFERENCES — Override risk level + notification toggles
4. EXTENSION — Install/link Chrome extension (optional, can skip)
5. COMPLETE — Profile activated, dashboard link
```

Each step persists to API immediately so partial progress is saved.

### Risk Quiz Scoring

```
avg(riskWeights) <= -0.5 → conservative (hard guardrails, auto-cooldown)
avg(riskWeights) >= 0.5  → degen (minimal guardrails, data only)
else                     → moderate (standard warnings, user decides)
```

### Flow Diagram

```
ANY ENTRY POINT (Discord / Web / Extension)
     │
     ▼
  Discord OAuth (identity)
     │
     ▼
  GET /user/onboarding → isOnboarded?
     │
     ├── true → proceed to dashboard / extension / bot
     │
     └── false → onboarding flow:
           1. Terms acceptance
           2. Risk quiz (3 questions)
           3. Notification preferences
           4. Optional: Link extension
           5. POST /user/onboarding { isOnboarded: true }
```

### Key Files

| File | Purpose |
|---|---|
| `apps/web/src/app/onboarding/page.tsx` | Web onboarding wizard |
| `apps/web/src/hooks/useOnboarding.ts` | Onboarding status hook + submit helper |
| `apps/web/src/app/login/page.tsx` | Login page with onboarding redirect gate |
| `apps/discord-bot/src/handlers/onboarding.ts` | Discord bot DM onboarding flow |
| `apps/chrome-extension/src/popup.ts` | Extension onboarding banner check |
| `packages/utils/src/onboarding.ts` | Shared quiz questions + risk calculator |
| `apps/api/src/routes/user.ts` | `GET/POST /user/onboarding` API endpoints |
| `packages/db/src/index.ts` | `findOnboardingByDiscordId`, `upsertOnboarding` |

---

## 21. Environment Variables

### Discord Bots

| Var | Used By | Required |
|---|---|---|
| `TILT_DISCORD_BOT_TOKEN` | TiltCheck bot | Yes |
| `TILT_DISCORD_CLIENT_ID` | TiltCheck bot + auth | Yes |
| `TILT_DISCORD_GUILD_ID` | TiltCheck bot | No (global if empty) |
| `DAD_DISCORD_BOT_TOKEN` | DAD bot | Yes |
| `DAD_DISCORD_CLIENT_ID` | DAD bot | Yes |
| `DISCORD_CLIENT_SECRET` | OAuth flows | Yes |
| `TRIVIA_ANNOUNCE_CHANNEL_IDS` | Trivia notifier | No (comma-separated) |

### Activities

| Var | Used By | Required |
|---|---|---|
| `VITE_DISCORD_CLIENT_ID` | Both activities | No (fallback exists) |
| `VITE_TOKEN_ENDPOINT` | Both activities | No (fallback: api.tiltcheck.me) |
| `VITE_ARENA_URL` | Degens activity | No (fallback: localhost:3010) |
| `VITE_HUB_URL` | TiltCheck activity | No (fallback: api.tiltcheck.me) |

### Infrastructure

| Var | Used By | Required |
|---|---|---|
| `SOLANA_RPC_URL` | Rain, triviadrop, tipping | No (fallback: mainnet) |
| `SUPABASE_URL` | Database | Yes (prod) |
| `SUPABASE_SERVICE_ROLE_KEY` | Database | Yes (prod) |
| `JWT_SECRET` | Auth | Yes |
| `INTERNAL_API_SECRET` | Service-to-service | Yes (prod) |
| `ADMIN_PASSWORD` | Control room | Yes |
| `SESSION_SECRET` | Control room | Yes |
| `GAME_ARENA_URL` | Director's Booth | No (fallback: localhost:3010) |
| `SENTRY_DSN` | Error tracking | No |
| `ELASTIC_URL` | Telemetry/search | No |
| `ELASTIC_API_KEY` | Telemetry/search | No |

---

## 22. Deployment + CI

### Docker builds

Each service has a Dockerfile. CI builds with:
```bash
pnpm install --frozen-lockfile --filter @tiltcheck/<service>...
pnpm --filter @tiltcheck/<service>... build
```

The `...` suffix installs the entire workspace dependency subgraph.

### After code changes

1. `pnpm install` locally if deps changed (updates lockfile)
2. Commit `pnpm-lock.yaml` — CI requires frozen lockfile
3. Push to trigger CI

### Local dev (all services)

```bash
# Core backend
cd apps/api && pnpm dev              # :8080
cd apps/game-arena && pnpm dev       # :3010
cd apps/control-room && pnpm dev     # :3001

# Bots
cd apps/discord-bot && pnpm dev      # :8080
cd apps/dad-bot && pnpm dev          # :8080
cd apps/justthetip-bot && pnpm dev   # :8083

# Activities
cd apps/degens-activity && pnpm dev  # :5174
cd apps/tiltcheck-activity && pnpm dev # :5175

# Web
cd apps/web && pnpm dev              # :3000
```

### Monorepo tooling

| Tool | Purpose |
|---|---|
| `pnpm` | Package manager (workspaces) |
| `turbo` | Build orchestration (`turbo.json`) |
| `tsx` | TypeScript execution (dev mode) |
| `vitest` | Testing |

---

## 23. Legal Compliance

### Non-Custodial

TiltCheck does NOT hold user funds. Ever.
- Escrow keypairs are ephemeral (created → used → destroyed)
- Bot wallet = "operational relay wallet" — signs transactions only
- Credit ledger = transient transfer state, not held funds
- All payouts verifiable on Solscan
- No wallet private keys stored

### Responsible Gaming

Required on all player-facing surfaces:
- NCPG.org link
- 1-800-GAMBLER
- "Not financial advice" disclaimer
- "Not a casino, not a bank" language

**Pages with RG disclaimers:** Landing page, about, touch-grass, tilt view, recover command, legal/limit, microgrant.

### What NOT to say

| Bad | Good |
|---|---|
| "Guaranteed returns" | "Better visibility into the math" |
| "We hold your funds" | "Non-custodial escrow for transaction duration only" |
| "Custodial wallet" | "Operational relay wallet" |
| "You will make money" | "You will see the data the casino already has" |
| "Risk-free" | "Better informed" |
| "Financial advice" | "Not financial advice. NFA." |

### Copyright

Every source file must start with:
```
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
```

### Brand Laws (per AGENTS.md)

- No emojis in code
- No apology language in UX copy
- Atomic docs (each doc self-contained)
- Copyright headers on all files

---

## 24. Troubleshooting

### Activity shows "DEMO MODE"
- Running outside Discord → expected
- SDK auth failed → check `VITE_DISCORD_CLIENT_ID` and token endpoint
- Token exchange 4xx → check API logs for `/auth/discord/activity/token`

### Trivia not starting from Director's Booth
1. Is game-arena running? (`GET /trivia/status`)
2. Is `GAME_ARENA_URL` set in control-room env?
3. Does `INTERNAL_API_SECRET` match between services?
4. Check Director's activity log for errors

### Rain payout failed
- Check `tmp/rain-escrow/` for orphaned records
- Verify `SOLANA_RPC_URL` reachable
- Check recipient has linked wallet (`/linkwallet`)
- No wallet → funds go to community wallet (`DLP9V...`)

### CI "frozen-lockfile" error
- Dep changed but lockfile not committed
- Fix: `pnpm install --no-frozen-lockfile` locally, commit lockfile

### Socket events not reaching Activity
1. Check game-arena logs for eventRouter subscriptions
2. Check Activity topbar (LIVE vs RECONNECTING)
3. Verify client joined correct room (`game:<gameId>`)
4. Check CORS: game-arena must allow Activity origin

### SusLink scan hanging
- AI scan has 5s timeout, falls back to heuristics
- Check `@tiltcheck/ai-client` configuration
- Heuristic-only mode works without AI backend

### CollectClock nerf not firing
- Bonus drop must exceed 15% threshold
- Check `collectclock.updateBonus()` is being called
- Verify eventRouter subscription for `bonus.nerf.detected`

---

*Made for Degens. By Degens.*
