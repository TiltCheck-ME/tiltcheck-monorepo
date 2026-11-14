© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13

# 4. TiltCheck Tools Overview

**Custody reference:** [Custody matrix](https://github.com/TiltCheck-ME/tiltcheck-monorepo/blob/main/docs/legal/custody-matrix.md) — canonical per-flow custody truth for marketing and support.

TiltCheck is composed of eight primary user-facing tools and two global trust engines.  
Each tool solves a specific frustration in the degen ecosystem: tipping, swapping, scam links, bonus cycles, free spins, survey screening, community games, and tilt management.

This document provides a top-level overview of each tool — what it does, why it exists, and how it fits into the overall architecture.

---

# 4.1 JustTheTip

**Custodial tipping, airdrops, and micro-sends via a central bot-wallet.**

### Purpose

Solve the problems of:

- custodial bots losing user funds  
- swap bots running out of liquidity  
- tip bots failing to deliver  
- inconsistent fees  
- confusion about gas + platform fees  

### Core Features

- Central bot-wallet that holds deposited crypto and credits users with SOL balance
- Users register a Solana address to receive payouts
- Tip users directly from the bot-wallet (internal credit -> on-chain transfer)
- Airdrops from the bot-wallet to multiple recipients
- Flat-fee system (founder-set) with optional swap via Jupiter
- Custodial - the bot holds user funds in its pool, eliminating liquidity-risk of pure P2P bots
- Discord-first UI
- Real-time pricing via in-memory oracle (event driven)  
- Hardened swap quoting: slippage & fee breakdown  
- Failure path detection (swap.failed)  

### Why It Exists

Degen tipping bots lose funds or run out of liquidity.  
**JustTheTip now centralizes liquidity in a custodial bot-wallet**, removing the need for each user to hold funds on-chain while still providing fast, low-fee SOL payouts.

### Pricing & Swap Hardening Additions

The module now integrates a lightweight in-memory Pricing Oracle that:

- Publishes `price.updated` events on every price change (payload includes token, oldPrice, newPrice, updatedAt, stale flag)
- Tracks update timestamps and exposes `isStale(token)`
- Applies a default TTL of 5 minutes; prices older than this are considered stale
- Supports `refreshPrice(token, fetcher)` for external integration hooks (fetcher returns Promise<number>)

Swap quotes now include:

- `slippageBps`: Maximum tolerated slippage (basis points)
- `minOutputAmount`: Minimum acceptable output after slippage tolerance
- `platformFeeBps`: Founder/platform fee applied to output
- `networkFeeLamports`: Simulated network fee (converted to SOL)
- `finalOutputAfterFees`: Output after deducting platform + network fees
- Centralized defaults provided via `swapDefaults` (`slippageBps`, `platformFeeBps`, `networkFeeLamports`) and overrideable per tip.

Events emitted by JustTheTip:

- `tip.initiated`, `tip.completed`, `tip.pending.resolved`
- `wallet.registered`, `wallet.disconnected`
- `swap.quote`, `swap.completed`, `swap.failed`
- `price.updated` (oracle service)

Failure Handling:
During execution the realized output is compared to `minOutputAmount`. If it falls below tolerance, a `swap.failed` event is published with reason `Slippage exceeded tolerance`.

These enhancements provide clearer transparency on pricing, fees, and swap reliability while enabling downstream listeners to react to stale pricing conditions or failed executions.

---

# 4.2 SusLink

**AI-powered link scanning + reputation scoring.**

### Purpose

Protect degens from:

- scam links  
- fake promo sites  
- malicious redirects  
- phishing attempts  
- burner domains  
- impersonation  

### Core Features

- URL pattern analysis  
- Domain reputation checks  
- Redirect chain inspection  
- Active prediction scoring  
- Optional integration with FreeSpinScan & CollectClock  

### Why It Exists

Degen Discord servers are full of bad links.  
SusLink reduces mod overhead and protects users automatically.

---

# 4.3 CollectClock

**Daily bonus tracking, countdown timers, nerf detection, and casino reliability signals.**

### Purpose

Fix:

- inconsistent daily bonus timers  
- hidden bonus nerfs  
- users forgetting claims  
- missing data on casino promo behavior  

### Core Features

- Bonus countdown timers  
- User-customizable tracking  
- Network-wide bonus DB  
- Automatic nerf flagging (e.g., 1SC → 0.10SC)  
- Predictive bonus cycle modeling  
- Casino Trust Engine integration  

### Why It Exists

Bonus cycles are chaotic.  
CollectClock brings clarity and predictive intelligence to daily claims.

---

# 4.6 DA&D — Degens Against Decency

**An AI-powered Cards Against Humanity-style game.**

### Purpose

Give degens a fun, social, chaotic game to play within:

- Discord  
- TiltCheck Arena  
- future web UI  

### Core Features

- Dynamic card generation  
- Community packs  
- Voting  
- Scoring  
- Seasonal pack rotation  
- Optional casino-themed expansion  

### Why It Exists

Every degen community needs fun between tilts.

---

# 4.7 TiltCheck Core (Tilt Detection)

**Behavior analysis + cooldown nudges + accountability tools.**

### Purpose

Detect:

- aggressive betting patterns  
- rapid spin behavior  
- Discord chat signs of tilt  
- risky user decisions  

### Core Features

- Vault locking  
- Cooldown suggestions  
- "Phone-a-friend" notifications  
- Accountabilibuddy double-wallet withdrawals  
- Discord-based trust score signals  

### Tilt Detection Heuristics

TiltCheck Core implements several heuristics to detect tilt behavior:

1. **Loss Streak Detection** — Tracks consecutive losses across tips, games, and bets. A loss streak of 3+ triggers tilt warnings with increasing severity.

2. **Bet Sizing Analysis** — Monitors betting patterns to detect sudden increases. If a user's bet size doubles or triples their baseline (rolling average), it flags a `bet-sizing` tilt signal. This is especially concerning after losses.

3. **Message Sentiment Analysis** — Scans Discord messages for rage indicators:
   - Rapid messaging (5+ messages in 30 seconds)
   - ALL CAPS spam
   - Rage keywords ("rigged", "scam", "fuck this", etc.)
   - Loan requests ("need money", "can someone spot me")

4. **Bad Beat Detection** — Listens to `game.completed` events and identifies unlikely losses (bad beats). A < 5% probability loss triggers high severity tilt warnings.

### Event Router Integration

TiltCheck Core emits and subscribes to events:

**Emitted Events:**

- `tilt.detected` — When tilt score exceeds threshold (includes userId, reason, severity, signals)
- `cooldown.violated` — When a user on cooldown attempts to continue

**Subscribed Events:**

- `tip.failed` — Tracks failed tip attempts as potential losses
- `game.completed` — Processes game results for winners/losers and bad beats

### Browser Extension Core Guardrails (TiltGuard)

The lightweight Manifest V3 browser extension delivers real-time client-side intervention directly on casino frontends with zero custodial keys and zero remote dependencies:

1. **2s Spin Pace Lock (Spin Brake)**: Enforces a 2-second timeout between spins on supported casino frontends to catch rapid balance desyncs and interrupt reflexive re-spins.
2. **Strategic Game Filters**: Identifies trap conditions in Mines, Chicken, Plinko, and high-volatility slots, displaying immediate mathematical house-edge awareness.
3. **Reality-Grounding Wage-Hour HUD**: Injects a clean session drawdown counter converting credits directly into equivalent real-world working hours ($25/hr baseline default, fully customizable in settings).
4. **DOM Deposit Barrier**: Intercepts and blocks cashier and deposit button clicks during active cooldowns and Touch Grass timeouts to eliminate reflexive reload impulses.
5. **Payout Lock**: Neutralizes "Cancel Withdrawal" and "Cancel Redemption" buttons on cashier and transaction history tables to prevent players on tilt from undoing cashouts back into playable balance.
6. **Profit-Lock Ratchet**: Locks in a trailing profit floor (50% default) when session balance climbs. Escalates from an in-page soft warning to a 60-second hard brake if unacted upon.
7. **Reality Cashout Goals**: Connects casino chip thresholds directly to tangible bills and essentials (Power bill $250, groceries $120, tank of gas $50, trash bags $14, Spotify $11) with one-click payment links.
8. **Touch Grass Timeout**: Automatically triggers a 60-second interaction freeze upon detecting rapid-click tilt bursts or sharp loss escalation, delivering blunt countdown spotter messaging.
9. **Stake.us AutoVault**: Performs direct non-custodial vaulting via `https://stake.us/_api/graphql` using existing browser session cookies without third-party API exposure.
10. **Bonus Playthrough Tracker & Max-Bet Trap Alarm**: Real-time HUD tracking promotional rollover wagering progress, with instant alerts and optional bet-interception if a single stake violates operator max-bet limits (e.g. $5.00 limit) to prevent bonus forfeiture.

### Why It Exists

Nobody thinks clearly on tilt.  
TiltCheck helps users slow down *without policing them*.

---

# 4.8 Offline-First CLI Suite (`@tiltcheck/cli`)

**Zero-network audit and verification toolchain for terminal-native degens.**

### Purpose

Provide 100% offline mathematical certainty and self-sovereign risk controls without relying on hosted APIs or central servers.

### Core Commands

- `tiltcheck verify <game> <serverSeed> <clientSeed> <nonce>`: Offline HMAC-SHA256 provably fair audit verification for Stake, BC.Game, Roobet, and standard crypto games.
- `tiltcheck rtp <gameName> [--stated <rtp>]`: Analyzes slot and table game configurations to detect house-edge downgrades across operator tiers.
- `tiltcheck trust <operatorName>`: Audits casino safety, licensing jurisdiction, bonus wager requirements, and redemption speeds directly against local trust facts.
- `tiltcheck cooldown <duration> [--reason <reason>]`: Generates local Ed25519 cryptographic commitment tokens for self-exclusion and wallet lockouts.

---

# 4.9 Casino Trust Directory (`/casinos`)

**Public directory and forensic audit receipts for crypto and sweepstakes casinos.**

### Purpose

Expose verified redemption rules, bonus wager traps, licensing facts, and provably fair math before a player risks funds.

### Core Features

- **116 Curated Operators**: Comprehensive database of sweeps and crypto casinos graded on licensing, payout speeds, and KYC practices.
- **Deep-Dive Forensic Audits**: In-depth audits for Stake.us, Roobet, Stake.com, and BC.Game featuring exact provably fair math formulations, code snippets, and verification recipes.
- **30-Operator Coverage Gate**: Production-verified fact database (`data/trust-engine/operator-facts.live.json`) covering minimum redemption limits, welcome bonus turnover terms, and VIP currency rules.
- **Zero-Affiliate Independence**: Unbiased scoring strictly driven by mathematical fairness and verified community withdrawal logs.

---

# End of `4-tools-overview.md`
