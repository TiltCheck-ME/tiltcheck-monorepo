<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-16 -->

# Hybrid v1 + MVP Strategy

## Direction

| Repo | Role |
|------|------|
| `TiltCheck-ME/tiltcheck-monorepo` (v1) | Production today — crawler, bots, extension in store, API at `api.tiltcheck.me` |
| `jmenichole/tiltcheckmvp` (v2) | Forward build target — lean stack, single Supabase, phased cutover |

## Fleet lanes (v1 — minimal ops)

Execute only P0 lanes from `docs/ai/fleet-repair-manifest.json`:

1. `lane-security-auth` — DB creds, tip/telemetry/user auth
2. `lane-security-ingest` — fail-closed email ingest + internal auth
3. `lane-devops-bootstrap` — cloud-agent `.env` seeding

Defer full v1 repair (ports, activity diet, bonus consolidation on v1).

## Fleet lanes (v2 — forward build)

1. `lane-mvp-bonus-feed` — `GET /bonuses/daily-feed` + public `/bonuses` page
2. Phase 2 staging gate per `tiltcheckmvp/docs/phases.md`
3. Phase 3 full dashboard bonuses tab

## MVP daily feed port (local branch)

Branch `cursor/daily-bonus-feed-port-ec58` — commit `37b2256` — built and verified (`pnpm build` passes).

Apply instructions: `docs/migration/tiltcheckmvp-bonus-feed-port.md`  
Patch artifact: `/opt/cursor/artifacts/tiltcheckmvp-daily-bonus-feed-port.patch`

## Cutover order

1. Merge v1 P0 security PR #591 (fleet wave)
2. Merge MVP daily-feed PR on `tiltcheckmvp` (branch `cursor/daily-bonus-feed-port-ec58`)
3. Pass MVP Phase 2 staging gate
4. Point crawler `CRAWLER_API_URL` at v2 API when ingest is verified
5. DNS cutover per `tiltcheckmvp/docs/cutover-checklist.md`
6. Archive v1 monorepo read-only

## Orchestrator

See `.cursor/agents/fleet-orchestrator.md` and dispatch via `docs/ai/fleet-repair-manifest.json`.
