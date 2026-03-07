# AI Handoff Context (Portable)

Last updated: 2026-03-07
Canonical file: `docs/AI-HANDOFF.md`
Machine-readable pair: `docs/AI-HANDOFF.json`
Quick entry point: `AI-HANDOFF.md` (repo root)

## Goal
- Preserve migration context when switching AI tools due to rate limits.
- Avoid re-discovery work and keep decisions consistent.

## Project Snapshot
- Repo: `tiltcheck-monorepo`
- Migration objective: consolidate hosting onto GCP while keeping project open source.
- Chosen region: `us-central1`
- Current strategy: compute-first migration to GCP, then full GCP data-plane by milestones (no fixed day deadline).
- Budget mode: credit-safe migration with hybrid cap, max tolerated spend `$300` (except emergency rollback/safety actions).

## Key Decisions
- `DEC-20260307-01` Approved: primary GCP region is `us-central1`.
- `DEC-20260307-02` Approved: Option A now (compute-first), then milestone-based path to full-GCP.
- `DEC-20260307-03` Approved: hybrid budget cap with hard stop at `$300` for normal migration activity.

## Non-Negotiables
- No assumptions on ambiguous items; ask before deciding.
- Keep repository/license open source.
- Keep production secrets private (use GCP Secret Manager).
- Use milestone checkpoints with short logs to preserve continuity.

## Current Plan File
- Active plan: `c:\Users\jmeni\.cursor\plans\gcp-migration-cost-plan_b4c8417e.plan.md`

## Active Todos (High Level)
- Confirm production-active services.
- Define GCP foundation (IAM, budgets, Artifact Registry, Secret Manager, logging).
- Implement compute migration on Cloud Run.
- Continue to full-GCP data-plane via milestones.
- Enforce OSS governance and clarity gates.
- Enforce credit-safe mode and milestone checkpoint logs.

## Spend Guardrails
- Threshold actions:
  - `$120`: pause non-essential envs and review logging/egress.
  - `$200`: freeze new migrations; stabilize and reduce cost.
  - `$260`: go/no-go review before any new scope.
  - `$300`: hard stop for normal migration activity (emergency rollback/safety exceptions only).

## Next-Session Bootstrap Prompt
Use this when opening a new AI tool/session:

```text
Continue this project using docs/AI-HANDOFF.md and docs/AI-HANDOFF.json as source of truth.
Respect approved decisions DEC-20260307-01, DEC-20260307-02, DEC-20260307-03.
Do not assume on ambiguous architecture/security/cost choices; ask first.
Start by proposing the next single milestone and expected cost impact before making changes.
```

## Milestone Log Template
- Milestone ID: `MS-YYYYMMDD-XX`
- Scope completed:
- Decisions made (DEC-*):
- Current state:
- Blockers:
- Next milestone:
- Risk watch:
- Cost note:
- Timestamp:

## Session Notes
- Add newest entry at top.
- Keep entries short and factual.

### 2026-03-07
- Established full migration plan with OSS governance track.
- Added no-assumption protocol and decision log template.
- Chose milestone-based solo cadence (no fixed weekly schedule).
- Added credit-safe mode with hybrid cap at `$300`.
