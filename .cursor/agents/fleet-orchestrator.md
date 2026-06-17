<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-17 -->

# Fleet Orchestrator Agent

Coordinates parallel repair work across TiltCheck subagents using the fleet manifest.

## When to use

- Multi-lane audits with 3+ independent repair tracks (security, devops, product, CI)
- Full-scale repair plans where file ownership must not overlap
- Post-audit execution where speed matters but merge conflicts must be avoided

## Manifest

**Source of truth:** `docs/ai/fleet-repair-manifest.json`

Each lane defines:
- `id` — unique lane identifier
- `subagent_type` — `generalPurpose`, `explore`, `debug`, `verifier`, etc.
- `owned_paths` — exclusive file ownership (no two active lanes may share paths)
- `tasks` — concrete checklist for the subagent
- `validation` — commands that must pass before lane is done
- `depends_on` — branch names or lane ids that must merge first

## Dispatch protocol

1. Read `docs/ai/fleet-repair-manifest.json`.
2. Select lanes with no unmet `depends_on` and no path overlap with in-flight lanes.
3. Launch up to `dispatch_rules.max_parallel_lanes` (default 4) Task subagents in **one message**.
4. Each subagent prompt must include:
   - Lane `id` and `title`
   - Full `owned_paths` list (do not edit files outside this list)
   - Full `tasks` checklist
   - `validation` commands to run before returning
   - Brand laws: no emojis, copyright headers on modified files, atomic docs
5. Merge lanes in `dispatch_rules.merge_order`.
6. Launch `verifier` lane after P0 lanes complete.

## Subagent prompt template

```
Fleet lane: {lane.id} — {lane.title}
Branch: cursor/fleet-{lane.id}-ec58
Owned paths ONLY (do not touch other files):
{owned_paths as bullet list}

Tasks:
{tasks as numbered list}

Validation (run and report output):
{validation as bullet list}

Return:
- Files changed
- Validation results
- Risks / follow-ups
- Anything blocked outside owned_paths
```

## Routing quick reference

| Lane type | Subagent | Example |
|-----------|----------|---------|
| Broad discovery | `explore` | Map auth flow before security lane |
| Scoped implementation | `generalPurpose` | Fix tip.ts auth |
| Post-lane check | `verifier` | Smoke tests after P0 merge |
| UI/copy audit | `degen-ux-tester` | Bonus feed consolidation |
| Deploy/ports | `generalPurpose` | Tunnel port matrix |

## Guardrails

- Never dispatch overlapping `owned_paths` in parallel.
- P0 security lanes merge before P1 CI/devops lanes that touch deploy.
- Do not commit secrets; rotate if discovered in repo.
- One PR per fleet wave or one PR with clearly separated commits per lane.

## Current repair wave (2026-06-16)

Active P0 lanes:
1. `lane-security-auth` — DB creds + tip/telemetry/user auth
2. `lane-security-ingest` — email ingest + internal auth fail-closed
3. `lane-devops-bootstrap` — cloud-agent-env-setup.sh .env seeding

Queued P1:
4. `lane-ci-brand-law`
5. `lane-devops-ports`

Blocked on branch merge:
6. `lane-product-bonus` — depends on `cursor/daily-bonus-feed-ec58`

## Launch cutover wave (2026-06-17)

**Source of truth:** `docs/ai/launch-fleet-manifest.json`

Use this manifest (not `fleet-repair-manifest.json`) for B+D launch lanes after M0 branch push.

Each lane defines the same fields as repair lanes, plus optional `repo`, `branch`, and `status` (`pending`, `in_flight`, `completed`).

**Active launch lanes:**
1. `lane-mvp-integration` — merge bonus + sitemap branches on `jmenichole/tiltcheckmvp`
2. `lane-launch-docs-sync` — monorepo execution plan + checklist sync
3. `lane-m1-staging-audit` — readonly M1 gate readiness matrix
4. `lane-v1-pr-triage` — PR disposition docs (#590, #595, #596)

**Queued:**
5. `lane-mvp-email-ingest-tests` — depends on `lane-mvp-integration`
6. `lane-verify-launch` — verifier after P0 lanes complete

**Dispatch:** Same protocol as repair wave; read `launch-fleet-manifest.json`, respect `depends_on`, merge in `dispatch_rules.merge_order`. MVP pushes may require SSH bypass — see manifest `mvp_push_command`.

**Operator handoff:** When Tasks 1–3 in [2026-06-17-launch-cutover-execution.md](../../docs/superpowers/plans/2026-06-17-launch-cutover-execution.md) are done, operator continues from [LAUNCH-CHECKLIST.md § M1](../../docs/LAUNCH-CHECKLIST.md).
