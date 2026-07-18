<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-17 -->

# Research + Task Ops Employee — Design Spec

Status: Implemented (v1)  
Owner: founder (solo)  
Replaces: Polsia-hosted research reports + self-filling task board (roles 1 and 2 only)  
Coordination: [docs/ops/AGENT-COHESION.md](../../ops/AGENT-COHESION.md)  
Plan: [docs/superpowers/plans/2026-07-17-research-ops-employee.md](../plans/2026-07-17-research-ops-employee.md)

## Problem

Polsia felt like an employee because it:

1. Produced **market / competitor research reports** on demand and on a cadence
2. Kept a **TO DO / RECURRING task board** that filled itself from research gaps

That loop is useful. Paying a hosted agent platform for it is not. TiltCheck already has Linear sync (`scripts/linear-sync.mjs`), daily task AI (`scripts/daily-task-ai.mjs`), casino scrape (`pnpm crawl:casinos`), and Cursor/GitHub Actions capacity.

## Goals

- Cheap or free recurring **research briefs** with sourced feature matrices
- Automatic **Linear issues** from research gaps + recurring templates
- Explicit `unknown` cells — no invented competitor stats
- Cap issue spam (max 5 new issues per run)
- Auditable in git (`docs/research/`, `docs/ops/`)

## Non-goals

- Full autonomous coding employee (out of scope)
- Marketing site hosting (use `tiltcheck.me` / `apps/web`)
- Discord approval UX (Phase 2 skin only; not required for v1)
- Always-on OpenHands / unsupervised browsing agent

## Architecture (v1)

```
GitHub Actions cron (Mon/Thu) + workflow_dispatch
        │
        ▼
scripts/ops/research-brief.mjs
  - fetch allowlisted competitor URLs (public HTML)
  - optional cheap LLM structure pass (matrix only; no new facts)
  - write docs/research/YYYY-MM-DD-<slug>.md
  - emit proposedTasks[] (max 5)
        │
        ▼
scripts/ops/merge-proposed-tasks.mjs
  - merge into docs/ops/linear-tasks.json by unique key
  - merge recurring templates from docs/ops/recurring-tasks.json
        │
        ▼
scripts/linear-sync.mjs
  - create Linear issues with [tc-task:<key>] markers
  - skip duplicates
```

### Existing pieces to reuse

| Piece | Path | Role |
|-------|------|------|
| Linear sync | `scripts/linear-sync.mjs` | Issue create/skip |
| Task source | `docs/ops/linear-tasks.json` | Canonical task file |
| Linear workflow doc | `docs/ops/LINEAR-WORKFLOW.md` | Operator runbook |
| Casino scrape | `scripts/scrape-casinos.ts` | Optional signal input later |
| Daily task AI | `scripts/daily-task-ai.mjs` | Pattern reference (Ollama); not the v1 runner |

## Research employee

### Inputs

**Competitor allowlist (v1):**

- AskGamblers
- Casino.guru
- Casino.org
- FairGambling
- TrustedGamble (canonicalize spelling in code; aliases tolerated in reports)

**Feature axes (matrix columns):**

| Axis | Meaning |
|------|---------|
| `ai_link_scan` | AI / scam link scanning |
| `trust_scoring` | Trust / safety score methodology |
| `redeem_vault` | Redeem / vault / cashout-protection tools |
| `pricing` | Public pricing for tools or APIs |
| `community_reach` | Public traffic / community metrics if disclosed |

**Source rules:**

- Public pages only (homepage, about, methodology, pricing, blog)
- May cite TiltCheck monorepo docs as first-party context
- Every matrix cell is `yes` | `no` | `partial` | `unknown` with optional URL footnote
- If fetch fails or page lacks evidence → `unknown`

### Output brief format

Path: `docs/research/YYYY-MM-DD-<slug>.md`

Required sections:

1. **Meta** — run date, slug, model/tool versions, fetch status per URL
2. **Feature matrix** — competitors × axes
3. **Gaps** — empty / unknown cells listed explicitly (primary section, not apology)
4. **Proposed tasks** — 0–5 items with `key`, `title`, `description`, `priority`, `labels`
5. **Footer** — `Made for Degens. By Degens.` + copyright stamp

### Proposed task shape

```json
{
  "key": "RES-2026-07-17-ASKGAMBLERS-TRUST-METHOD",
  "title": "Document AskGamblers trust/safety score methodology",
  "description": "Gap from research brief 2026-07-17: trust_scoring=unknown. Source: <url or none>.",
  "priority": 3,
  "labels": ["RESEARCH"]
}
```

Key rules:

- Unique, stable, uppercase kebab after prefix
- Prefix `RES-` for research-derived, `REC-` for recurring templates
- Labels subset of: `RESEARCH`, `FEATURE`, `RECURRING`

### Hard rules (anti-skem)

1. No cell becomes `yes`/`no`/`partial` without a URL in Meta or footnotes
2. No market-size claims without a cited source
3. No competitor feature invention to fill the matrix
4. LLM may only rewrite/structure text that was fetched; it may not browse freely beyond the allowlist in v1

## Task board employee

### Merge pipeline

1. Read brief’s `proposedTasks` (or sidecar JSON emitted by the research script)
2. Load `docs/ops/recurring-tasks.json`
3. For each candidate: if `key` already in `linear-tasks.json` → skip
4. Append until **5 new keys** for the run (research + newly due recurring combined)
5. Write `linear-tasks.json` (preserve copyright header)
6. Run `linear-sync` (CI uses secrets; local uses `.env`)

### Recurring templates

File: `docs/ops/recurring-tasks.json`

Example entries:

| key | cadence | title |
|-----|---------|-------|
| `REC-COMPETITOR-MATRIX` | weekly | Refresh competitor feature matrix |
| `REC-DISCORD-MAP` | weekly | Map 5 early-adopter degen Discord communities |
| `REC-TRUST-TOP20` | biweekly | Refresh trust signals for top 20 Solana casinos |

Cadence evaluation: store `lastQueuedAt` in the same file or a small state file `docs/ops/recurring-state.json` (git-committed is fine for solo ops).

### Caps and labels

- Max **5** new Linear issues per workflow run
- Priority default: research gaps = 3; recurring = 3; founder can edit JSON
- Linear project via existing `LINEAR_PROJECT_ID` optional env

### Human gate (v1)

- None. Issues land as Todo in Linear.
- Operator skims briefs in `docs/research/` and closes junk issues.
- Phase 2 (optional): Discord reaction before sync.

## Workflow / secrets

### GitHub Actions

New workflow: `.github/workflows/research-ops.yml`

Triggers:

- `schedule`: Monday and Thursday 14:00 UTC
- `workflow_dispatch` with optional `slug` input

Jobs:

1. Checkout
2. Install deps (minimal; prefer Node scripts without full monorepo build)
3. Run research brief
4. Merge proposed + recurring tasks
5. Commit research + task JSON to a branch OR open a PR (prefer PR to `main` for reviewability)
6. If `LINEAR_API_KEY` present: run `linear-sync`

Secrets:

- `LINEAR_API_KEY`, `LINEAR_TEAM_KEY`, optional `LINEAR_PROJECT_ID`
- Optional LLM: `RESEARCH_LLM_API_KEY` + `RESEARCH_LLM_BASE_URL` (OpenAI-compatible). If unset, matrix is heuristic/regex-only from fetched HTML (degraded but free).

### Local commands

```bash
pnpm ops:research:run          # generate brief
pnpm ops:research:merge-tasks  # merge into linear-tasks.json
pnpm ops:linear:dry            # preview Linear creates
pnpm ops:linear:sync           # create issues
```

## Success criteria

- [ ] Two scheduled runs produce briefs under `docs/research/` with matrices and Gaps sections
- [ ] Unknown cells stay unknown without citations
- [ ] At most 5 new Linear issues per run; duplicates skipped via `[tc-task:<key>]`
- [ ] Recurring template re-queues after cadence without duplicating open keys
- [ ] Manual `workflow_dispatch` works without LLM key (degraded mode)
- [ ] Docs updated in same PR as code (atomic docs)

## Risks

| Risk | Mitigation |
|------|------------|
| Scraped HTML thin / blocked | Mark fetch failed; cells `unknown`; still emit gap tasks |
| LLM invents features | Structure-only prompt; validate claims against fetched text; unit test fixture |
| Linear spam | Hard cap 5; key dedupe; dry-run in CI logs |
| Competitor ToS / scraping ethics | Allowlist + low frequency + public pages only; no login walls |
| Drift from Polsia copy | Briefs cite sources; product truth stays in monorepo specs |

## Rollback

- Disable `research-ops.yml` workflow
- Stop merging into `linear-tasks.json`
- Close unwanted Linear issues manually
- Research markdown remains historical (no delete required)

## Phase 2 (not in v1)

- Discord `#ops` cards + reaction gate before Linear sync
- Expand allowlist / feature axes via JSON config without code changes
- Feed casino scrape + trust-engine outputs into the same brief pipeline

## Open decisions (locked for v1 unless founder overrides)

1. **Delivery:** open a PR with research + task JSON (not direct commit to `main`)
2. **LLM:** optional; free degraded mode required
3. **Discord gate:** deferred

---

Made for Degens. By Degens.
