<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13 -->

# Research plan — gambling regulation, predatory practice, player defense

## Main question

What do real gambling regulators require, how do online casinos actually extract players, and where can TiltCheck be player-side defense — with what it already ships, and what it could add without becoming a casino, a bank, or a nanny.

## Context we already have (do not re-research)

TiltCheck today (player-facing, non-custodial):

- Cooldown: on-chain self-exclusion the player signs (Solana devnet). Casinos do not read it unless they choose to. No cancel in v1. Extend only.
- Chrome Core: 2s spin lock on supported tabs. Guest-capable.
- Pro overlay: ~2 min Touch Grass cover. Games hub at `/touch-grass` (Trivia + DA&D) during pause.
- Trust Engine / casino directory: public RTP, compliance, payout evidence. Advisory, not a block.
- Bonus intel / CollectClock: source-dated bonus feed.
- Discord: `/touchgrass` 24h TiltCheck lockout, buddy alerts, handoffs.
- Instant Redeem / RGaaS: B2B/partner rails. Not a player cashier.
- Honesty rule: no custody, no passwords, no medical/diagnostic/regulator-endorsement claims. Core ≠ Pro.

RG v1 plan already owns surface routing (extension = urgency, dashboard = durable settings, web = explainers). Issues #541/#542/#555/#556/#558 stay human-gated.

## Subtopics

### 1. Regulation rules (`findings_regulation.md`)

Expected: player-protection mandates from UKGC, MGA, key US state regimes, Curaçao / grey-market reality. Focus on: deposit/loss/session limits, self-exclusion (GAMSTOP, state lists), affordability / financial risk, bonus advertising rules, withdrawal time rules, underage/geo, operator duty of care. What is required vs theater. What a third-party player tool can legally do without being a licensed operator.

### 2. Predatory casino practices (`findings_predatory.md`)

Expected: concrete online dark patterns — bonus wagering / sticky / max-bet / expiry, withdrawal delays and document loops, VIP / host chasing, loss-back bait, autoplay / turbo / one-click deposit, loot-style mechanics, geo-spoof onboarding, license-washing, fake social proof. How they interact with tilt (pace, chase, heater giveback).

### 3. Defense stack and TiltCheck fit (`findings_defense_fit.md`)

Expected: what existing player-defense tools actually do (GAMSTOP, Gamban, BetBlocker, bank gambling blocks, GambleAware, state exclusion). Gaps they leave on crypto / Curaçao / Discord-native play. Map each gap to a TiltCheck surface that already exists vs a capability that would be new. Flag anything that would require custody, operator partnership, or a license we do not have.

## Synthesis

After the three findings files land, answer: (1) what TiltCheck already counters, (2) what it could counter next without breaking non-custodial / honesty laws, (3) what it should refuse to pretend it counters. That feeds the brainstorm design — not a code change.
