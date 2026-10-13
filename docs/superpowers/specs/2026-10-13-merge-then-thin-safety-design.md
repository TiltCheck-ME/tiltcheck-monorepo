<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13 -->

# Merge-then-thin-safety — design spec

Status: Approved (design)
Owner: founder (solo)
Surface: GitHub PR queue, API tip routes (already on a branch), CI guard for AutoClaimer
Date: 2026-10-13

Tracking: GitHub issues and PRs only. No Notion board this cycle.

This is an ops + one-safety-issue cycle. It does not ship Cooldown mainnet, Discord bot wiring, or the #541 kill switch.

## Problem

The PR queue and safety backlog are mixed. Two PRs are MERGEABLE and unused. A financial-flow branch is pushed with no PR. PR #626 is a Solana pin buried under unrelated CI autofix history. Issue #545 is functionally true (AutoClaimer is gone) but has no CI enforcement, so it cannot close. Issues #541 and #542 stay open on purpose.

## Mission

Land the ready docs and XSS fixes. Put the Cooldown tip guard in front of a human. Pin Solana Pay without dragging leftover files. Close #545 with a real fail-the-build guard. Stop there.

## Locked sequence

1. Squash-merge [#686](https://github.com/TiltCheck-ME/tiltcheck-monorepo/pull/686) (RG tools v1 plan).
2. Squash-merge [#687](https://github.com/TiltCheck-ME/tiltcheck-monorepo/pull/687) (poker-coach innerHTML removal).
3. Open a PR from `cursor/cooldown-p1-tip-guard-main` targeting `main`. Do not auto-merge.
4. Rebase PR [#626](https://github.com/TiltCheck-ME/tiltcheck-monorepo/pull/626) onto `main` as pin-only. If history is dirtier than lockfile + two package pins, close #626 and open a fresh pin PR instead.
5. Close PR [#671](https://github.com/TiltCheck-ME/tiltcheck-monorepo/pull/671) as duplicate (axios 1.20.0 already landed).
6. Implement the AutoClaimer forbid-script, merge that PR, close issue [#545](https://github.com/TiltCheck-ME/tiltcheck-monorepo/issues/545).

Baseline CI failures remain non-blocking: `Dependency Vulnerability Audit`, `E2E Tests (Playwright)`.

Leave the rest of Dependabot parked. Do not bump `@solana/pay` to 1.x.

## Tip-guard PR (financial, human review)

Branch: `cursor/cooldown-p1-tip-guard-main` (already pushed).

Title: `feat(api): honor Cooldown locks on /tip/send and /tip/claim`

The PR already contains:

- `guardTipForWallet` called on `/tip/send` and `/tip/claim` before credit movement
- `GET /tips/log` session-auth, wallet-bound, 10 req/min
- `COOLDOWN_GUARD_FAIL_CLOSED` in `.env.example` (default `false` = fail-open)
- Tests: 24 API + 4 `tilt-hint` (28 green at push time)

Reviewers must confirm:

- Fail-open is the accepted default. Prod should set `COOLDOWN_GUARD_FAIL_CLOSED=true` if self-exclusion must survive an RPC outage.
- Sessions with no linked wallet skip the chain check. That gap stays documented. It is not fixed in this PR.
- Credit tips never hit the chain. This HTTP read of `GET /cooldown/check` is the enforcement layer for those routes. No keys. No funds held.

Out of this PR: Discord bot wiring, on-chain settlement, CreditService changes.

Rollback: revert the PR. Unset the env var. Tips resume without a Cooldown check.

## PR #626 pin-only

Keep only changes that freeze:

- `@solana/web3.js@1.98.4`
- `@solana/pay@0.2.6`

plus the matching `pnpm-lock.yaml`. Drop unrelated CI, test, and workflow files that accumulated on `cursor/ci-autofix-automation-ddb4`.

Do not add root `pnpm.overrides` for those packages this cycle.

If rebase vs current `main` is more than lockfile conflict, close #626 and open a clean pin PR from `main`. Same pins. Same review bar.

## #545 AutoClaimer guard

Absence is not a guardrail. Add a dedicated script, not knip (knip reports unused files; a used AutoClaimer would pass).

### Script

Path: `scripts/guard-no-autoclaimer.mjs`

- Scan `apps/**` and `packages/**` for `.ts`, `.tsx`, `.js`, `.jsx`, `.json` files plus any filename containing `autoclaim`.
- Fail on identifiers: `AutoClaimer`, `autoclaim`, `TG AutoClaimer` (case-insensitive) in those files, and on any matching filename.
- Do not scan `docs/`. History markdown stays. Do not scan `node_modules` or `dist`.
- English comments that mention the ban still trip the regex if they contain `AutoClaimer`. Keep the ban list inside `scripts/guard-no-autoclaimer.mjs` only, not as a comment in `apps/`.
- Exit 1 with: `AutoClaimer is out of scope for the player build. Do not ship it.`
- Exit 0 on the current tree.

### CI

Wire the script into the existing Brand Law Enforcer job. No new workflow file. Brand law: AutoClaimer never ships in the player build.

Root `package.json` gets `"guard:no-autoclaimer": "node scripts/guard-no-autoclaimer.mjs"` and the chosen job runs it.

### Test

`scripts/guard-no-autoclaimer.test.mjs` (or a vitest file under `tests/`):

- Current repo tree: exit 0.
- A temp fixture file named `autoclaimer.ts` under a fake `apps/` dir: exit 1.

### Close criteria for #545

After the script is on `main` and CI is green: close #545 citing this spec. History docs stay. No product UI. No runtime kill switch.

## Explicitly out of this cycle

- Issue #541: Core `content.js` still ignores `tiltcheck_injection_disabled`. Leave open.
- Issue #542: no extension threat ADR. Leave open.
- Issues #555, #556, #558: the plan file unblocks them (#686). It does not implement them.
- Notion task board.
- Dependabot PRs except closing #671.
- Cooldown mainnet.
- Defaulting the tip guard to fail-closed in code.

## Error handling

- Merge conflicts after #686/#687: rebase the next branch onto `origin/main` with lockfile regeneration (`pnpm install --no-frozen-lockfile`) if `pnpm-lock.yaml` conflicts. Do not take `--theirs` on `package.json` if it downgrades `jsdom` (that already broke chrome-extension tests once).
- Tip-guard PR review rejects fail-open: change is env documentation and a follow-up, not a silent default flip in this spec.
- Guard script false-positive: do not add AutoClaimer as a word in `apps/` comments. Put the ban list in the script. If a legitimate symbol collides, expand the allowlist in the script with a named exception and a comment why.

## Testing

- #686/#687: existing CI. Baseline non-blockers only.
- Tip-guard: existing 28 tests. Do not expand scope in review comments without a new spec.
- #626: `pnpm install --frozen-lockfile` must succeed after the pin.
- #545: script unit test plus CI job running the script.

## Rollback

- Merged docs/XSS PRs: revert commits.
- Tip-guard: revert PR.
- #626: revert pin; lockfile returns to floating `^` on those two packages.
- #545 script: delete the script and the CI step. Issue reopens if the guard is removed.
