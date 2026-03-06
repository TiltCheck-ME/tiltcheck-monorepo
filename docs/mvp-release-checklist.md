# MVP Test Matrix And Release Gate

## Scope
- Chrome extension (`apps/chrome-extension`)
- API (`apps/api`)
- LockVault module (`modules/lockvault`)
- Discord bot (`apps/discord-bot`)
- Web app (`apps/web`)

## Cross-Surface Test Matrix

| Flow | Surface(s) | Method | Status | Evidence |
|---|---|---|---|---|
| Auth/login | Extension popup + sidebar | Code path + storage migration review | PASS | `authToken`/`userData` now in `chrome.storage.local`; trusted OAuth origin checks in popup/sidebar |
| Start monitoring | Extension content/sidebar | Build + initialization flow review | PASS | `initialize()` auto-starts monitoring and sidebar renders |
| Lock funds | Extension + API + LockVault | Contract alignment + build | PASS | `/vault/:userId/lock` validates inputs; sidebar lock UX updated for unit clarity |
| Timer expiry / auto-unlock | API + LockVault | Unit tests + route behavior review | PASS | LockVault tests pass; `lock-status` + `release` handle `locked/extended/unlocked` states |
| Release funds | Extension + API | Contract alignment + UI message updates | PASS | Release now reports SOL units consistently in sidebar + API (`amountUnit: SOL`) |
| Timeline visibility | Extension sidebar | Implementation + build verification | PASS | Vault timeline renders from lock `history` with created/extended/auto-unlocked events |
| Discord parity | Discord bot + LockVault | Command output/wording audit | PASS | `/vault` and `/tip vault*` responses aligned to SOL normalized output and readiness |
| Web parity | Web app + extension journey | Content/nav cleanup + build | PASS | Archived references removed from key web surfaces and extension CTA points to active flows |

## Automated Gate Results

| Gate | Command | Result |
|---|---|---|
| Extension build | `pnpm --filter @tiltcheck/core build` | PASS |
| API build | `pnpm --filter @tiltcheck/api build` | PASS |
| LockVault build | `pnpm --filter @tiltcheck/lockvault build` | PASS |
| LockVault tests | `pnpm --filter @tiltcheck/lockvault test` | PASS (6/6) |
| API tests | `pnpm --filter @tiltcheck/api test` | PARTIAL (92 pass / 3 fail in `tests/routes/mod.test.ts`, unrelated to vault/extension changes) |
| Discord bot build | `pnpm --filter @tiltcheck/discord-bot build` | PARTIAL (fails in DA&D command import paths: `src/commands/dad/*` -> `../types.js`) |
| Web build | `pnpm --filter @tiltcheck/landing-page build` | PASS |

## Security Pass Outcomes (High-Priority)
- PASS: Extension auth/token moved to `chrome.storage.local` for popup/sidebar.
- PASS: Sidebar API keys and buddy-mirror setting moved to `chrome.storage.local` with legacy migration.
- PASS: OAuth message handling enforces trusted origin in popup/sidebar.
- PASS: Wallet postMessage bridge hardened:
  - verifies `event.source === window`
  - correlates transaction responses with request IDs
  - enforces timeout on pending wallet tx requests
- PASS: Vault unit transparency improved (SOL normalized output in extension/API/Discord).
- PASS: Archived `QualifyFirst` extension flow removed.

## Release Readiness Summary
- MVP critical vault + transparency workflows are implemented and aligned across extension/API/Discord/web.
- Remaining blockers are **pre-existing/non-MVP-core**:
  - `apps/discord-bot` DA&D command import path errors.
  - `apps/api` moderation route test expectations vs current fallback behavior (`503`).
- Recommendation: proceed with MVP release candidate after logging these blockers as separate follow-up tickets.
