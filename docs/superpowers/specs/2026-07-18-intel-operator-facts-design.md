<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 -->

# Intel Operator Facts — Design Spec

Status: Implemented (v1 code); coverage gate not met — not product-live  
Owner: founder (solo)  
Coverage: 0 live facts in `operator-facts.live.json` (gate: ~25–40 priority operators with ≥1 live fact before marketing as live)  
Surface: `apps/web` `/ask` + floating Intel widget  
Related: [docs/api/intel-agent.md](../../api/intel-agent.md), [docs/ops/AGENT-COHESION.md](../../ops/AGENT-COHESION.md), Degen Copilot spec (different product — guardrail configure, not operator research)

## Problem

Users want to ask operator-specific questions on the website, for example:

- Can you level with gold coins on MetaWin?
- How long does Crown Coins redemption take?
- What new-player bonuses exist on a named Florida sweeps casino?

Today Ask Intel answers trust grades, filtered lists, and domain scans. It refuses freestyle research. VIP currency rules, redemption SLAs, and welcome-bonus summaries are mostly missing from live records, so those questions cannot be answered accurately yet.

## Goals

- Users ask operator-fact questions in plain English on `/ask` (and the floating widget)
- Answers come only from a curated, cited fact store (source URL + as-of date)
- Blunt refuse when no live sourced record exists — no invented VIP/bonus/redemption claims
- Hybrid enrichment: scraper/refresh proposes updates; humans promote into the live store
- Coverage gate: ~25–40 priority sweeps/crypto operators with at least one live fact before calling the feature “live”

## Non-goals (v1)

- Dice / EV / “minimal balance VIP grind” strategy math
- Unsourced state roundups (e.g. “all FL sweeps welcome bonuses”) when geo-tagged live facts are missing
- Freestyle LLM answers, legal advice, or “you should play”
- Degen Copilot `/copilot/*` (wrong product job: personal guardrails)
- Mandatory admin UI for promote/reject (scripts + git are enough for v1)

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Unsourced answers | Refuse + link proof page / tell user to check operator ToS |
| v1 question types | Operator facts only (VIP currency, redemption time, welcome bonus) |
| Surface | Extend existing `/ask` + Intel widget |
| Coverage before “live” | ~25–40 sweeps/crypto operators with ≥1 live fact |
| Data pipeline | Hybrid: curated live store + proposal lane; human-gated promote |
| Architecture | Extend Intel agent/tools — no second chat product |

## Product contract

### In scope

- VIP / loyalty currency rules (e.g. can a named currency count toward level)
- Redemption / payout timing claims on record
- Welcome / new-player bonus summaries on record (optional geo tag such as `US-FL`)
- Operator resolve (name / slug / domain → one casino record)

### Answer shapes

1. **Hit** — structured fact block(s) + source URL + as-of + link to `/casinos/[slug]`
2. **Miss** — blunt refuse; no sourced record; link proof page when available
3. **Ambiguous** — ask which operator or show top matches; do not guess

### Tone

Degen, direct, no apologies. Accuracy beats sounding helpful.

## Data model

### Live store (source of truth for answers)

Extend existing trust/casino operator data (not a parallel mystery database). Per-operator fact groups:

| Field group | Contents |
|-------------|----------|
| Identity | slug, display name, domains, category (sweeps / crypto / …) |
| VIP | `vipCurrencyRules[]` — currency name, `canLevel`, notes, `sourceUrl`, `asOf` |
| Redemption | `redemptionTime` — claim text, optional range/unit, `sourceUrl`, `asOf` |
| Welcome bonus | `welcomeBonusSummary` — short text, optional `geoTags[]`, `sourceUrl`, `asOf` |
| Meta | `verifiedBy`, `lastVerifiedAt`, `status: live \| stale \| retracted` |

Intel reads **only** facts with `status: live` (and may surface a stale label when `asOf` exceeds the staleness threshold — see below). Missing fields → refuse.

Suggested paths (implementation may adjust names, not semantics):

- Live: `data/trust-engine/operator-facts.live.json` (or fields merged into existing casino records)
- Proposals: `data/trust-engine/operator-facts.proposals.json`

### Proposal lane (not user-visible)

Refresh job / casino-public-data-scraper writes proposals with the same schema plus `proposedAt` and optional raw excerpt. Ops promote or reject. **No auto-promote** into answers.

### Coverage gate

Before marketing this as ready:

- Maintain a priority checklist of ~25–40 sweeps/crypto operators
- Each must have ≥1 live fact in VIP **or** redemption **or** welcome-bonus
- Below gate: ship code behind normal `/ask` behavior is fine, but do not claim the feature is “live”

### Staleness

- If `asOf` is older than **90 days**, still answer when status is live, but label **stale — verify on source**
- `status: retracted` removes the fact from answers immediately
- Refresh job may re-propose updates; humans promote

## Architecture

```
User → /ask or Intel widget
         │
         ▼
POST /api/intel/chat  (existing BFF)
         │
         ▼
@tiltcheck/intel-agent  routeIntelIntent()
  - existing trust intents unchanged
  - new operator-fact intents when VIP/redemption/bonus clear
         │
         ▼
@tiltcheck/intel-tools
  - resolve operator (slug / alias / domain)
  - getOperatorVipFacts / Redemption / WelcomeBonus (live only)
         │
         ▼
Curated live fact store  (+ optional RGaaS read path later)
         │
         ▼
Structured blocks → IntelChatPanel / share snapshot
```

Ops path:

```
Scraper / refresh job → proposals file
         │
         ▼
Ops script: list / promote / reject → live store (git)
         │
         ▼
Next /ask answers use promoted facts only
```

### New intents

| Intent | Trigger vibes | Tool |
|--------|---------------|------|
| `operator_vip_fact` | “level with gold coins”, VIP, loyalty currency | `getOperatorVipFacts` |
| `operator_redemption_fact` | “how long to redeem”, payout/cashout time | `getOperatorRedemptionFacts` |
| `operator_welcome_bonus_fact` | “new player bonus”, welcome offer (+ optional geo) | `getOperatorWelcomeBonusFacts` |
| `operator_fact_lookup` | vague “what’s the VIP deal on X” | resolve → list available live fact types |

### Tool rules

1. Resolve operator. 0 matches → refuse. 2+ → disambiguation block.
2. Read live facts only.
3. Hit → fact text, source URL, as-of, stale flag, CTA to `/casinos/[slug]`.
4. Miss → refuse copy + proof-page link. Never invent.
5. Geo filter (e.g. Florida): if user names a state and no geo-tagged live facts match → refuse (“no sourced FL welcome-bonus records yet”). Do not synthesize roundups.

### API surface

- Reuse `POST /api/intel/chat` and `POST /api/intel/share`
- No new public chat endpoint in v1
- Update `docs/api/intel-agent.md` in the same commit as code when intents ship

## UX

### Empty-state example chips

- “Can you level with gold coins on MetaWin?”
- “How long does Crown Coins redemption take?”
- “What’s the welcome bonus on [operator]?”

### Copy patterns

**Refuse:**  
“No sourced record for that. Not guessing VIP/bonus/redemption terms. Check their ToS — or open the proof page when we have one.”

**Hit:**  
Short fact → “Source: [url] · As of [date]” → optional “Stale — verify on source” → link to casino proof page.

**Widget:** Same behavior as `/ask`. No separate “research mode” toggle in v1.

**Footer:** “Made for Degens. By Degens.” on user-facing UI (existing).

## Launch checklist

All required before calling the feature live:

1. Fact schema + live/proposal files wired; Intel tools read live only
2. ≥25 target operators with ≥1 live fact (VIP / redemption / welcome)
3. Intent + tool tests: hit, miss, ambiguous, geo-miss, stale label
4. Sample questions in empty state
5. Docs: intel-agent API note + ops promote runbook (atomic with code)
6. No LLM freestyle path for these intents

## Success criteria

- User asks a MetaWin / Crown-style fact question → cited structured block **or** blunt refuse
- Never a vibes / unsourced answer for VIP, redemption, or welcome-bonus claims
- Share snapshots work for fact answers the same as trust blocks

## Risk notes

| Risk | Mitigation |
|------|------------|
| Stale or wrong promoted fact | Source URL + as-of + 90-day stale label; retract status; human promote only |
| Users treat refuse as broken | Clear copy + proof-page CTA + example chips that match covered operators |
| Scope creep into strategy advice | Explicit non-goal; router should not invent EV/grind intents in v1 |
| Parallel “research chatbot” product | Forbidden in v1 — extend Intel only |

## Out of scope handoffs

| Need | Owner / system |
|------|----------------|
| Filling proposals at scale | Casino public data scraper + research-ops cadence |
| Personal vault/cooldown configure | Degen Copilot (separate spec) |
| Landing SEO / hero copy | Open items agent (`apps/web` marketing) |

## Open items for implementation plan (not design blockers)

- Exact JSON file paths vs embedding fields on existing `casinos.json` / trust-engine records
- Promote CLI flags and Linear task keys for the priority operator checklist
- Whether RGaaS exposes a read endpoint in v1 or web/intel-tools reads the live file directly

---

Made for Degens. By Degens.
