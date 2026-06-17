<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-17 -->

# M1 Staging Gate Audit — 2026-06-17

Fleet lane: `lane-m1-staging-audit` (read-only)

**Verdict:** Staging infra mostly green (June 7 evidence). **Operator M1 gate OPEN** — enforcement sign-off required before M2 DNS.

## Status summary

| Area | Status |
|------|--------|
| Staging API + Supabase automated smoke | Mostly PASS |
| Staging web deploy | PASS |
| Extension build config in repo | PASS |
| Operator loop (login → vault → enforcement) | OPEN |
| Formal M1 sign-off (`metrics-weekly.md`) | FAIL — not recorded |
| M2 DNS cutover | BLOCKED until M1 |

## Operator next 3 actions

1. **Supabase:** Confirm `20260528120000_game_exclusions.sql` applied; run `pnpm seed:casino-scores` if needed.
2. **Extension + vault:** Build with staging URLs, Discord login, save session cap, Refresh rules in extension.
3. **Enforcement:** stake.us → critical tilt → Touch Grass → SW log `[TiltCheck] Enforcement fired`. Record in `real-accounts-signoff.md` + `metrics-weekly.md`.

## Staging URLs (Railway gate)

| Surface | URL |
|---------|-----|
| API | `https://tiltcheck-api-production.up.railway.app` |
| Web | `https://tiltcheckmvp-production.up.railway.app` |

## Extension build

```bash
export EXTENSION_API_URL="https://tiltcheck-api-production.up.railway.app"
export EXTENSION_WEB_URL="https://tiltcheckmvp-production.up.railway.app"
cd apps/extension && node build.js
```

Full checklist: [manual-tasks.md § H–I](./manual-tasks.md), [cutover-checklist.md](./cutover-checklist.md) Phase 2.

Made for Degens. By Degens.
