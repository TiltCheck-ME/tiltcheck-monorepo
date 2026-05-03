# Dead Code Triage: Remove vs Build

Generated: 2026-03-07
Basis: targeted manual review of `DEAD_CODE_APPROVAL.md` candidates plus code/reference checks.

## A) Irrelevant / legacy code (OK to remove)

These items are high-confidence dead or legacy leftovers.

### 1) Legacy user-dashboard server implementation
- `apps/user-dashboard/src/server.js`
  - Contains explicit mock scaffolding (`Mock data stores (replace with database in production)` at line 21).
  - Not referenced by package scripts (`apps/user-dashboard/package.json` runs `src/index.ts`).
  - No code references found.
  - **Verdict:** Remove.

### 2) Orphan Discord safety-bot command files (post bot-split)
- Files:
  - `apps/discord-bot/src/commands/airdrop.ts`
  - `apps/discord-bot/src/commands/bonus.ts`
  - `apps/discord-bot/src/commands/cooldown.ts`
  - `apps/discord-bot/src/commands/dashboard.ts`
  - `apps/discord-bot/src/commands/justthetip.ts`
  - `apps/discord-bot/src/commands/scan.ts`
  - `apps/discord-bot/src/commands/setpromochannel.ts`
  - `apps/discord-bot/src/commands/support.ts`
  - `apps/discord-bot/src/commands/terms.ts`
  - `apps/discord-bot/src/commands/triviadrop.ts`
  - `apps/discord-bot/src/commands/trust.ts`
- Evidence:
  - Safety bot command barrel exports only `tiltcheck`, `tip`, `dad`, `poker` (`apps/discord-bot/src/commands/index.ts`).
  - `CommandHandler` loads command exports from that barrel, not the filesystem (`apps/discord-bot/src/handlers/commands.ts`).
  - README states bot split: safety bot vs justthetip bot vs dad bot (`apps/discord-bot/README.md`).
  - No imports of the above orphan command files found.
  - **Verdict:** Remove from this app (or migrate to the owning bot app if still needed).

### 3) Orphan helper script
- `apps/discord-bot/src/clear-broken-commands.ts`
  - No references found from package scripts or source.
  - **Verdict:** Remove.

### 4) Express-utils root loose files outside build path
- `packages/express-utils/gameplay-analyzer.ts` (empty)
- `packages/express-utils/scanner.ts` (empty)
- `packages/express-utils/triviadrops.ts` (empty)
- `packages/express-utils/vault.ts` (empty)
- `packages/express-utils/types.ts` (non-empty, but unreferenced)
- Evidence:
  - Package builds from `src/**/*.ts` only (`packages/express-utils/tsconfig.json`).
  - No references to `packages/express-utils/types.ts`.
  - **Verdict:** Remove.

### 5) Unresolved stale tests for removed modules
- `apps/discord-bot/tests/commands/walletcheck.test.ts` imports missing `../../src/commands/walletcheck.js`.
- `modules/justthetip/tests/ltc-bridge.test.ts` imports missing `../src/ltc-bridge.js`.
- **Verdict:** Remove or rewrite to target current modules.

### 6) Likely stale identity-core helper
- `packages/identity-core/src/signer.ts`
  - Not imported anywhere in `packages/identity-core/src` or workspace.
  - **Verdict:** Remove unless signing APIs are planned very soon.

---

## B) Not dead (keep) — false positives from static/dynamic wiring

These appeared unused to static analysis but are actively used.

### 1) Channel watcher tooling (keep)
- `tools/channel-watcher/index.js`
- `tools/channel-watcher/analyze-log.js`
- `tools/channel-watcher/generate-daily-comic.js`
- `tools/channel-watcher/create-session.js`
- Evidence: wired in `tools/channel-watcher/package.json` scripts (`start`, `analyze`, `comic:daily`, `session:create`).
- **Verdict:** Keep.

### 2) Web static scripts/styles/service worker (keep)
- Includes: `apps/web/scripts/*.js`, `apps/web/sw.js`, `apps/web/styles/*.css`, `apps/web/breadcrumbs.js`, `apps/web/trust-dashboard.js`.
- Evidence:
  - Referenced by many static HTML pages (`apps/web/*.html`, `apps/web/tools/*.html`).
  - `copy-static-to-dist.mjs` intentionally copies static files to `dist`.
- **Verdict:** Keep.

### 3) Game-arena public scripts (keep)
- `apps/game-arena/public/scripts/arena.js`
- `apps/game-arena/public/scripts/auth.js`
- `apps/game-arena/public/scripts/game.js`
- `apps/game-arena/public/scripts/profile.js`
- Evidence: directly referenced by `apps/game-arena/public/*.html`.
- **Verdict:** Keep.

### 4) User-dashboard legacy frontend JS (currently reachable)
- `apps/user-dashboard/public/js/app.js`
- Evidence: referenced by `apps/user-dashboard/public/index.html`.
- **Verdict:** Keep for now unless you remove the legacy `/index.html` surface together with it.

### 5) Chrome extension background worker (keep)
- `apps/chrome-extension/src/background.js`
- Evidence:
  - Manifest references service worker (`apps/chrome-extension/src/manifest.json`).
  - Build script copies it to dist (`apps/chrome-extension/build.js`).
- **Verdict:** Keep.

---

## C) Not finished yet (needs build/wiring), not removal

These are incomplete feature paths or missing integrations.

### 1) Missing workspace package for dashboard qualify API
- `apps/dashboard/src/app/api/qualify/route.ts` imports `@tiltcheck/qualifyfirst`.
- No `qualifyfirst` package exists in this repo.
- **Action:** Either add/recover `@tiltcheck/qualifyfirst` package, or remove/replace this API route.

### 2) Airdrop path in consolidated tip command is intentionally placeholder
- `apps/discord-bot/src/commands/tip.ts` returns:
  - `"Airdrops are coming soon in the consolidated bot!"`
- **Action:** implement actual airdrop flow or hide/remove that subcommand path.

### 3) Landing KPI strip is TODO, backend dependency missing
- `apps/web/index.html` comment:
  - `TODO: Wire up to /api/stats endpoint when available`
- **Action:** implement `/api/stats` endpoint and wire client fetch/update logic.

### 4) Product pages contain explicit “Coming Soon” placeholders
- e.g. Poker/DA&D cards and extension sections in `apps/web/index.html` and related pages.
- **Action:** either ship these modules and replace placeholder UX, or remove links/cards to avoid dead navigation.

### 5) Chrome extension feature files present but unintegrated
- `apps/chrome-extension/src/autovault.ts`
- `apps/chrome-extension/src/fairness-tutorial.ts`
- `apps/chrome-extension/src/SolanaProvider.ts`
- `apps/chrome-extension/src/sw.js`
- `apps/chrome-extension/src/polyfills.js`
- They are not wired through current extension build entry points/import graph.
- **Action:** either integrate into `content.ts/popup.ts/page-bridge.ts` flow or remove.

---

## Suggested execution order

1. Remove high-confidence legacy files in section A (small commits by area).
2. Keep section B untouched (these are false positives for dead-code tooling).
3. Open implementation tickets for each section C item.
4. Re-run: `pnpm dlx knip --no-exit-code --reporter json` after each removal batch.
