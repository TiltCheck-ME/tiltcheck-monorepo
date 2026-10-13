<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 -->

# Operator Facts Ops Runbook

Human-gated promote/reject lane for curated operator facts used by Intel `/ask`. Proposals are not user-visible. Live facts are the only records Intel may answer from.

## Data files

| File | Purpose |
|------|---------|
| `data/trust-engine/operator-facts.proposals.json` | Scraper/refresh proposals (ops-only) |
| `data/trust-engine/operator-facts.live.json` | Promoted facts Intel reads (`status: live` only) |

Schema matches `@tiltcheck/intel-tools` `OperatorFactRecord`. Proposals may include extra fields such as `proposedAt`; promote copies the record as-is and only sets `status: live`.

## Promote flow

1. Scraper or refresh job writes proposals to `operator-facts.proposals.json`.
2. Ops lists pending slugs:

```bash
pnpm ops:facts:promote -- --list
```

3. Verify each claim against the cited `sourceUrl` and `asOf` date on the operator site or ToS.
4. Promote verified slugs into live:

```bash
pnpm ops:facts:promote -- --promote metawin
```

5. Reject bad or unverifiable proposals (does not touch live):

```bash
pnpm ops:facts:promote -- --reject metawin
```

6. Commit the updated JSON files in the same PR as any related code or doc changes (atomic docs).

Promote upserts by `slug` (replaces an existing live record). Reject removes the proposal only.

## Refuse policy

Intel answers operator VIP, redemption, and welcome-bonus questions **only** from live records with `status: live`.

- No live record for the operator or fact type → blunt refuse. No invented VIP, bonus, or redemption terms.
- `status: retracted` → fact is excluded from answers immediately.
- Geo-specific asks (e.g. Florida welcome bonus) require a matching geo-tagged live fact; no unsourced roundups.

Refuse copy pattern: no sourced record, not guessing, check operator ToS or proof page when available.

## 90-day stale rule

Facts with `asOf` older than **90 days** may still answer when `status: live`, but Intel labels them **stale — verify on source**. Refresh jobs may re-propose updates; humans promote again after verification.

Stale threshold logic lives in `@tiltcheck/intel-tools` (`isFactStale`).

## Coverage gate

**Status: not live.** Intel may refuse most operator-fact questions until the gate clears. Do not market operator-fact answers as ready until **`coverageGateMin` priority operators** (currently **25**) each have **≥1 live fact** (VIP, redemption, or welcome bonus).

Priority checklist: [`docs/ops/operator-facts-priority.json`](./operator-facts-priority.json) — 30 sweeps/crypto operators from `apps/web/src/data/casinos.json`, sorted by trust grade. Each row lists `needed` fact types ops should verify and promote.

Track progress: count distinct slugs in `operator-facts.live.json` that appear in the checklist with at least one populated fact field. Below the gate, code can ship; coverage is tracked separately.

## CLI reference

| Command | Action |
|---------|--------|
| `pnpm ops:facts:promote -- --list` | Print proposal slugs |
| `pnpm ops:facts:promote -- --promote <slug>` | Copy proposal → live, set `status: live`, remove proposal |
| `pnpm ops:facts:promote -- --reject <slug>` | Drop proposal only |

Direct:

```bash
node scripts/ops/promote-operator-facts.mjs --list
node scripts/ops/promote-operator-facts.mjs --promote <slug>
node scripts/ops/promote-operator-facts.mjs --reject <slug>
```

## Related

- Design: `docs/superpowers/specs/2026-07-18-intel-operator-facts-design.md`
- Intel API: `docs/api/intel-agent.md`
- Agent ownership: `docs/ops/AGENT-COHESION.md`

Made for Degens. By Degens.
