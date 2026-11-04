<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-03 -->

# Session Log

## 2026-11-03 — feat(release): Phase 4 sideload ungating & extension release

Completed Phase 4 of the GitHub Pages migration architecture: built, packaged, and ungated the public TiltCheck browser extension sideload zip (`CTA_READY = true`).

- Built and packaged extension zip: Ran `node apps/chrome-extension/build.js` and `node apps/chrome-extension/scripts/package-extension-zip.mjs`, creating clean 116 KB packages at `apps/chrome-extension/tiltcheck-extension.zip` and `apps/web/public/downloads/tiltcheck-extension.zip` without sourcemap clutter.
- Ungated public download flags: Set `CTA_READY = true` in `scripts/pages-product-data.mjs` and `ctaReady: true` in `apps/web/src/lib/home-launch-copy.ts`.
- Synchronized launch test assertions: Updated `tests/pages-launch.test.ts` to assert `CTA_READY` is true and confirms active download CTA markup; updated `apps/web/src/components/GatedZipCta.test.ts` and `apps/web/src/lib/home-launch-copy.test.ts` to assert active download link when `ctaReady: true`.
- Rebuilt GitHub Pages static site: Ran `node scripts/convert-markdown.js docs/tiltcheck out/docs`, generating 35 specs plus single-page apps with active `DOWNLOAD THE ZIP` button pointing directly to `downloads/tiltcheck-extension.zip`.
- Verified test suites: 100% pass across all monorepo test suites (3/3 tests in `tests/pages-launch.test.ts`, 28/28 files with 67/67 tests in `apps/web`, 27/27 files with 148/148 tests in `apps/chrome-extension/tests/unit`, and 5/5 files with 34/34 tests in `@tiltcheck/cli`).

## 2026-11-03 — feat(extension): Phase 3 extension Spotter architecture realignment

Completed Phase 3 of the ecosystem roadmap: realigned Chrome extension into an active, culturally fluent Spotter on real casino tabs.

- Stake.us AutoVault cookie fix: Dynamically resolved GraphQL endpoint (`https://stake.us/_api/graphql` or `https://api.stake.us/graphql`) based on hostname so session cookies are preserved instead of failing on cross-origin `api.stake.com`.
- Promoted Touch Grass timeout into Core content loop: Event-driven temporary button locks activate on rapid click bursts (5+ in 1500ms) and loss escalation without requiring Pro activation.
- Spotter tone overhaul: Replaced moralizing HR lecturing with witty, blunt, culturally fluent spotter copy across `touch-grass-timeout.ts`, `chase-warning.ts`, `heater-nudge.ts`, and cooldown overlays.
- Pruned legacy sidebar tree: Deleted 15 unmaintained legacy sidebar files (`apps/chrome-extension/src/sidebar/`) containing dead `/bonuses` HTTP calls and simulated blockchain timeouts; introduced decoupled lightweight `decoupled-sidebar.ts`.
- Tests & build: 27 unit test suites passed (148 tests). Clean extension packaging (116 KB zip).

## 2026-11-03 — feat(cli): Phase 2 offline-first CLI modernization

Completed Phase 2 of the GitHub Pages migration architecture: modernized `@tiltcheck/cli` into a fully offline-first toolchain running with zero remote API dependencies.

- Purged dead remote dependencies (`@google-cloud/vertexai`, `@google/genai`) and deleted defunct remote commands (`agent.ts`, `auth.ts`, `checklists.ts`).
- Implemented `tiltcheck verify <serverSeed> <clientSeed> <nonce>` for offline HMAC-SHA256 provably fair bet verification matching Stake, Roobet, and BC.Game algorithms (Dice 0-100, Crash/Limbo multipliers).
- Implemented `tiltcheck rtp <operator>` reading local certified RTP datasets and computing bankroll bleed acceleration on slot downgrades.
- Implemented `tiltcheck trust <operator>` surfacing licenses, risk tiers, vault support, and rogue casino warnings.
- Implemented `tiltcheck cooldown <hours>` generating player-signed Ed25519 voluntary self-exclusion lock tokens for extension import.
- Added package data fallbacks and upward monorepo traversal so CLI runs seamlessly from any working directory.
- Created `packages/cli/README.md` and comprehensive 34-test Vitest test suite. Enforced all brand laws (zero emojis, non-custodial, required footer).

## 2026-10-13 — feat: Touch Grass games hub

`/touch-grass` replaces the crisis page as the games hub (Live Trivia + Degens Against Decency). Crisis copy lives on the footer/legal only. Pro overlay iframes `?mode=pause` during the cover. DA&D is Discord-honest when there is no web client. No enforcement changes.

## 2026-10-13 — ci: patch HIGH CVEs + stop PR e2e from hitting GitHub Pages

PR e2e now boots local Next.js on 127.0.0.1:3001 (`PLAYWRIGHT_WEB_LOCAL=1`) so `/login` is the real app, not a Pages 404. GH Pages builder emits `/login/index.html` for the live twin. `pnpm audit:deps` overrides take published HIGH patches; advisories with no patched release warn instead of fail.

## 2026-10-13 — copy: honest Core vs Pro + Cooldown discoverability

Public copy now says Core is a two-second spin lock; fullscreen Touch Grass (~2 min) is Pro only. Cooldown is first in the tool registry, dual-primary on home, and linked from tools, getting-started, dashboard Safety, and the extension popup. Guest popup opens on Guards. No enforcement default changes.

## 2026-10-13 — guard: AutoClaimer never ships in the player build

CI walker `scripts/guard-no-autoclaimer.mjs` fails Brand Law if AutoClaimer identifiers return under apps/ or packages/. Closes #545. No product UI. No runtime kill switch.

## 2026-10-13 — feat(cooldown): on-chain self-exclusion registry v2

### Summary

Shipped the Cooldown on-chain self-exclusion system (devnet live). Key components added or modified:

- `programs/cooldown/` — Anchor/Solana program for the self-exclusion registry (PDA-based lock accounts, set/extend, scope: all/category/game)
- `packages/cooldown-sdk/` — TypeScript SDK (`isLocked`, `setLock`, `extendLock`, `hashTarget`, `zeroTarget`, `SCOPE_ALL`, `SCOPE_GAME`)
- `apps/api/src/routes/cooldown.ts` + `tips.ts` — API routes for cooldown checks and tip log reads
- `apps/web/src/app/cooldown/` — Lock page and demo casino page
- `modules/justthetip/src/tilt-hint.ts` + `tip-log.ts` — JustTheTip tilt hint and tip velocity tracking
- `apps/chrome-extension/src/chase-warning.ts` + `spin-pace-lock.ts` — Browser extension superpowers: loss-chase warning and spin pace enforcement
- CI workflows updated to `ubuntu-24.04` and Node 22
- `apps/web/src/components/TrustRollup.tsx` — Placeholder replaced with live placeholder wiring

### PR hygiene fixes (post-review)

- Fixed TypeScript type predicate error in `apps/web/src/lib/docs.ts` (`lastUpdated` made required in `DocMetadata`, was always provided)
- Fixed copyright header format in `modules/justthetip/src/index.ts`
- Removed unused variables (`RANK_NAME`, `SUIT_NAME`) and unreachable function (`normalizeCard`) from poker coach userscript
- Updated README Cooldown SDK/API section to match actual SDK exports (`isLocked`/`setLock` vs old `isExcluded`/`createLock`)
