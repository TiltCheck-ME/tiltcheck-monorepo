# Cutover smoke checklist

## Phase 1 — marketing (staging / prod)

- [ ] Home hero CTAs → `/extension` and `/casinos`
- [ ] Casino directory loads; live feed or static fallback
- [ ] Casino slug detail renders pillars
- [ ] `GET /health` + `GET /rgaas/casino-scores` green on staging API
- [ ] `pnpm seed:casinos` run against staging Supabase (optional; static fallback works)
- [ ] Tools pages not linked from primary nav (`NEXT_PUBLIC_SHOW_TOOLS_NAV=false`)

## Phase 2 — protected session (staging gate)

- [ ] Discord OAuth redirect URIs for staging + prod API callbacks
- [ ] Discord login → `/dashboard` with `tc_session` cookie on web domain
- [ ] Dashboard **Profile + Vault** tabs only; session cap saves via `POST /vault` (no `stub: true`)
- [ ] Extension: Discord connect → token in storage → `sync-vault` loads rules
- [ ] Extension: critical tilt → **enforcement fires** (see below)
- [ ] Playwright smoke job green on CI

### Definition: enforcement fires

A protected session counts when **all** of the following occur on staging:

1. User is logged in (extension has `tc_session_token`, `tc_demo: false`).
2. User has an enabled `session_cap` vault rule (from dashboard `POST /vault`).
3. On a test casino page, tilt detection reaches **`critical`** (e.g. sustained fast-click pattern).
4. The extension shows the **Touch Grass fullscreen overlay** (`#tiltcheck-lockdown-root`) for the configured duration (minutes from vault rule, default 5).
5. Betting/spin controls are disabled (`blockBettingUI`) until the timer reaches zero.
6. Overlay cannot be dismissed early (no close button; clicks on overlay do not propagate).

Manual check: open DevTools → confirm `[TiltCheck] Enforcement fired` in the service worker console after the overlay appears.

## Phase 5 — DNS + legacy

- [ ] CI green on `main` (build + Playwright)
- [ ] DNS: `tiltcheck.me` → Railway **web**
- [ ] DNS: `api.tiltcheck.me` → Railway **api**
- [ ] `dashboard.tiltcheck.me` → 301 redirect to `https://tiltcheck.me/dashboard`
- [ ] Chrome Web Store extension update points `EXTENSION_API_URL` at production API
- [ ] v1 monorepo archived read-only ([v1-ops.md](./v1-ops.md))
- [ ] Email crawler still on v1 until v2 `email-ingest` ships

## Deferred (not cutover blockers)

- [ ] `/tools/domain-verifier` and `/tools/scan-scams` (Phase 4; pages may stay `noindex`)
- [ ] Buddies / analytics / bonuses (Phase 3)
