<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 -->

# Agent Cohesion — Open Items + Research Ops

Unifies two concurrent Cursor agents so they stop inventing parallel backlogs and stop fighting `apps/web`.

| Agent | Branch / PR | Job |
|-------|-------------|-----|
| **Open items resolution** | `cursor/e2e-ci-gate-4f00` (#609), `cursor/security-deps-4f00` (#611) | CI gate, security deps, then landing/SEO issue batch |
| **Research ops employee** | `cursor/research-ops-employee-0c5a` (#610) | Cheap Polsia replacement: research briefs + Linear task board |

## Single backlog rule

**GitHub Issues remain the source of truth for product bugs/features.**  
**Linear is the operator queue** (what to do tonight), synced from `docs/ops/*.json`.

Do not invent a third status doc that duplicates both. Operator notes go in:

- `docs/migration/tiltcheckmvp-patches/OPERATOR-STATUS.md` (cutover / MVP only)
- `docs/ops/AGENT-COHESION.md` (this file — agent coordination only)

## Ownership split (locked)

| Surface | Owner agent | Notes |
|---------|-------------|-------|
| `.github/workflows/pr-test.yml`, E2E gate | Open items | Already shipped Wave 1 |
| Security deps / `security-audit.yml` | Open items | PR #611 |
| Landing/SEO issues `#460–#467` **code** | Open items (primary) | `apps/web` edits |
| Landing/SEO **task mirror in Linear** | Research ops | Seeded in `docs/ops/linear-tasks-landing-audit.json` |
| Competitor research briefs | Research ops | Spec + plan on #610 |
| Recurring ops templates | Research ops | `docs/ops/recurring-tasks.json` |
| `docs/DEPLOY.md` / Railway exit | Already merged (#607) | Touch only if cutover status changes |
| Operator facts (VIP / redemption / welcome bonus) | Intel `/ask` + `@tiltcheck/intel-agent` | Answers from `operator-facts.live.json` only; casino-public-data-scraper fills proposals; research-ops may queue verify/promote tasks via Linear |

## Landing page problem (what Open items is about to hit)

Open items is about to implement `#460–#467` on `apps/web`. Known traps:

1. **`pnpm -r build` / production Next prerender is fragile on main**  
   Do **not** use full monorepo build as the gate for copy/SEO PRs.  
   Verify with:
   ```bash
   pnpm -C apps/web dev
   # then check /, metadata, OG in browser
   ```
   Docker image already prebuilds `@tiltcheck/shared` + `@tiltcheck/intel-agent` (Wave 1).

2. **Live Playwright E2E**  
   Wave 1 scoped E2E to user-facing paths. Landing PRs that touch `apps/web/src/**` **will** run E2E. Keep changes small; prefer `SKIP` only via paths-filter (already in place for docs-only).

3. **Brand Law on `#467`**  
   Microgrant copy must stay degen, no apologies. Pair with Brand Law Enforcer mentally before PR.

4. **Sitemap overlap with #596**  
   Open PR `cursor/web-sitemap-ec58` (#596) already touches sitemap. For `#465`, rebase onto or coordinate with #596 — do not ship a second competing sitemap.

## Recommended sequence (cohesive)

```
1. Merge #609 (E2E gate) if not already on main
2. Merge #611 (security) after CI green
3. Landing Wave A (Open items): #460, #462, #463  — one PR
4. Landing Wave B (Open items): #466, #467, #465 (after #596) — one PR
5. Bonuses #464 — separate PR (touches /bonuses)
6. Research ops implementation (this branch): Tasks 1–6 of plan
   - First Linear sync after seed includes LAND-* keys for #460–#467
7. Cross-cutting #457, #468–#473 — Linear later; not blocking research-ops v1
```

## How research-ops helps landing (without stealing the PR)

1. Seed `docs/ops/linear-tasks-landing-audit.json` with `LAND-*` keys pointing at GitHub issue URLs.
2. Operator runs `pnpm ops:linear:sync -- --file docs/ops/linear-tasks-landing-audit.json` once secrets exist.
3. Weekly `REC-COMPETITOR-MATRIX` stays separate from landing — no mixing matrices with OG copy.

## Conflict avoidance checklist

- [ ] Open items does **not** rewrite `docs/superpowers/specs/2026-07-17-research-ops-employee-design.md`
- [ ] Research ops does **not** edit `apps/web/src/**` until Open items landing waves merge (or this doc is updated)
- [ ] Both agents rebase on `main` before starting new code
- [ ] One PR per concern — no kitchen-sink "fix everything" branches

## Resume cue

When Open items finishes Wave A (or stalls on web build), ping research-ops with **go** to start subagent-driven Tasks 1–6 on #610, after `git fetch origin main && git rebase origin/main`.

Made for Degens. By Degens.
