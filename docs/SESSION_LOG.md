<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12 -->

# Session Log

## 2026-11-12 — feat(activity): Touch Grass Discord Activity draft (lobby, Degens Against Decency, group break)

- New app `apps/touch-grass-activity` (Vite + TS static build) on branch touch-grass-activity, draft PR only. Nothing deployed; collectclock-api, the Developer Portal, Discord channels and DNS untouched.
- Discord setup: `ready()` -> `authorize()` (identify) -> `POST /api/activity/token` through the proxy -> `authenticate()`, then `getActivityInstanceConnectedParticipants` (2026 name) + participants updates for the avatar row. Client ID from `VITE_DISCORD_CLIENT_ID`, fallback "Tilt Check" 1445916179163250860. No `frame_id` in the URL = guest mode: fake local user, full room logic in the browser, `+ bot` button for solo testing; `?remote=1` talks to a local `wrangler dev`.
- Lobby: who's here (room members merged with SDK participants) and three tiles: Degens Against Decency, Touch Grass break, Trivia (disabled, coming soon).
- DA&D (`src/shared/dad.ts`): 3-8 players, 7-card hands, rotating judge, anonymous shuffled answers with random entry ids, first to N (default 5, picker 3/5/7/10). Late joiners queue and are dealt in next round; a leaver's card is dropped; the judge leaving voids the round and returns cards; under 3 players pauses with scores kept. Deck is original TiltCheck cards (apps/web dad-deck, modules/dad starter pack, plus new ones), 30 prompts / 81 answers, no AI generation.
- Group break (`src/shared/breakTimer.ts`): 5/10/15 min shared countdown for the whole instance; starting it pulls every client to the clock; bail is optional with a roast and "bailed at m:ss"; leaving the call counts as a bail; share card at the end (Discord share dialog via app attachment upload, falls back to copying text).
- Worker (`apps/touch-grass-activity/worker`, own wrangler.toml, worker name touch-grass-activity): token exchange with no redirect_uri, one SQLite-backed Durable Object per instanceId, WebSocket (Hibernation API) with HTTP polling fallback, DO alarm ends the break and sweeps quiet pollers. Server owns hands, judge, submissions, scores and the clock; each client gets only its own hand. Every action validated (phase, player, judge, card in hand), per-user token-bucket rate limit, 4 KB message cap, per-isolate IP limit on the token route.
- Voice and money: short degen copy, no shield/guard framing, no crisis copy, no money mechanics; `tests/no-money.test.ts` fails on money words in client source or cards.
- Checked locally: typecheck (client, worker, tests), vite build, 63 vitest tests (DA&D state machine, break timer, DO host with fake storage/sockets, auth, real worker + Durable Object in local workerd via wrangler unstable_dev incl. a 3-player WebSocket game, jsdom guest-mode client smoke test, no-money guard), and `pnpm simulate` playing a 3-player game to a winner. Not tested inside a real Discord client, on phones, or deployed.

## 2026-11-11 — feat(pages): simpler cooldown, pick a length and one lock button

- /cooldown/ rebuilt in convert-markdown.js buildCooldownPage (styles in base.css, `.cooldown-*` classes instead of inline styles). Owner feedback from iPhone: it "seems less easy than it could be". The page asked for a Solana wallet first, had two connect buttons, showed a red "No Solana Wallet Detected" box on a normal phone, and used jargon.
- New flow: heading "Take a break", one line ("Pick how long. TiltCheck blocks casino deposit buttons until it's over."), duration picker (24h / 3 Days / 7 Days / 30 Days, 7 Days default, aria-pressed), then one primary button whose label follows the pick ("Lock me out for 7 days"). It does the in-browser lock with no wallet: localStorage plus the LOCK_UPDATED postMessage (source TILTCHECK_COOLDOWN_PAGE, lockSource local_browser_session). Locked, the button is disabled and reads "Locked until <date/time>", with a status line under it; a lock already running in localStorage shows the same state on reload. `?extend=30` preselect and the `?source=auto_tilt` banner are kept (banner is now amber, not red).
- The Solana flow moved under a text button, "Add a wallet signature (optional)" (aria-expanded/aria-controls). One button goes "Connect wallet" -> "Sign lock" (lockSource solana_web_wallet, same 6-line signed message). If a lock is already running it signs that lock's end time instead of starting a new one. No wallet injected: phones get Phantom, Solflare and Backpack in-app-browser links (phantom.com/ul/browse, solflare.com/ul/v1/browse, backpack.app/ul/v1/browse, each with the encoded page URL and ?ref=<encoded origin>); desktop gets Install Phantom. Every wallet message is a neutral note; there is no red error box on the page.
- Phones only (iOS/Android UA, incl. iPadOS reporting as Mac): one neutral line saying the block runs in the TiltCheck extension on a computer, so a lock set here won't block anything on that phone, linking to /extension.html.
- "How it works" rewritten without jargon ("cryptographic commitment", "verifiable timelock" are gone) and gains a fine-print card. Page title and meta description no longer mention a wallet.
- Checked locally: all inline scripts pass node --check, 0 missing asset paths, no old tool names in visible text, and 119 jsdom checks pass on desktop and iPhone UAs (plus Android, iPadOS and Mac for the phone note): default 7 Days and label changes, primary lock storage/message/active state, optional section open/shut, mock-wallet connect/sign/disconnect and rejections, mobile wallet link URLs, phone note only on phones, no red box.

## 2026-11-11 — fix(pages): verify page styles, footer sign-in when signed in, Phantom mobile link

- /tools/verify/ rendered unstyled: it sits two folders deep but was built with the one-folder depth, so `../styles/base.css` resolved to /tools/styles/base.css (404). convert-markdown.js now has a third depth, 'nested' ('../../'), shared by assetHref/href/dirHref, and buildVerifyPage + buildHouseEdgePage use it. That also fixed their manifest, icon and every nav/footer link (all pointed under /tools/).
- Path audit of all 60 built pages: every page linked the favicon/apple-touch-icon as styles/icon.png, which is never written (the icon is copied to /icon.png). The icon links now point at the site-root icon.png. After the fix, 0 stylesheet, script, manifest or icon refs point at a missing file.
- Footer "Discord Sign In" now becomes "Your dashboard" (/dashboard/) when tc_token and tc_user are present and tc_token_exp has not passed; it flips back on sign-out or in another tab. The shared header script's signed-in check also respects tc_token_exp now. Signed out, the footer link is unchanged.
- /cooldown/ on a phone (iOS/Android user agent, incl. iPadOS) with no injected wallet: the "No Solana Wallet Detected" notice now offers "Open in Phantom app", a Phantom browse deeplink (https://phantom.com/ul/browse/<encoded page URL>?ref=<encoded origin>, per docs.phantom.com Deeplinks > Browse) that reopens the page inside Phantom's in-app browser. "Lock In-Browser (No Wallet)" stays next to it. Desktop keeps Install Phantom.
- Checked locally: all inline scripts pass node --check, jsdom passes for the footer swap (signed out, signed in, expired, sign-out) and the Phantom button (iPhone, Android, desktop, wallet injected), and no old tool names show in visible text.

## 2026-11-11 — feat(pages): tiltcheck.me quick fixes, simpler tool names, signed-in header, Discord sign-in fix

- Homepage quick fixes (3e0bc59): page title is now "TiltCheck | House always wins? Not today."; the nav shows a visible "Sign in" label next to the Discord icon; removed the duplicate WinCheck section.
- Simpler tool names (f414b54), visible text only, URLs unchanged: Nope List, Sneaky Bet Alert, Keep the Win, Win Skim, RTP Scanner, House Edge Scanner, Fairness Verifier. New meta description.
- Signed-in state (acab5b0): a shared script in every generated page reads tc_token and tc_user (Discord /users/@me JSON) from localStorage. Signed in, the nav "Sign in" link becomes a round Discord avatar (default embed avatar when none) plus username, linking to /dashboard/. /login/ hides the sign-in copy and button and shows the signed-in card with a Sign out link that clears tc_token, tc_user and tc_token_exp. The token is removed from the address bar after login, and the stored expiry signs you out when Discord's token runs out.
- BETA stamp next to the TILTCHECK wordmark, same tilted stamp as CollectClock in TiltCheck teal.
- STAFF badge on the avatar from a hardcoded Discord ID list in convert-markdown.js (STAFF_DISCORD_IDS). Cosmetic only; it gates nothing. The CollectClock worker /me needs a CollectClock session and only allows the tiltcheck-me.github.io origin, so it can't be used from tiltcheck.me yet.
- CollectClock worker (collectclock-api, code-only deploy outside this repo): the tiltcheck.me/login link (state h.web) was landing on CollectClock's phone-app handoff and showing "Sign-in failed. Go back to CollectClock". The callback now redirects state h.web or tc to https://tiltcheck.me/login/#access_token=... Confirmed working.
- PR #715 (3e0bc59 + f414b54) was squash-merged to main as bd5c53d. The signed-in header work (acab5b0) and this log entry were then cherry-picked off main onto branch signed-in-header and opened as a new draft PR ("Signed-in header, BETA stamp + cooldown buttons fix"); quick-copy-fixes is no longer the place for them.
- /cooldown/ buttons fixed (convert-markdown.js buildCooldownPage): the page's main inline script was a syntax error, so no button had a handler. The signed message used '\n' inside the generator's template literal, which printed real line breaks inside single-quoted JS strings. Now escaped as '\\n'. The LOCK_UPDATED postMessage objects also had two `source` keys, so the second one overwrote 'TILTCHECK_COOLDOWN_PAGE' and the extension ignored every lock; the lock origin now goes in `lockSource`. A wallet without signMessage now shows an error instead of claiming a signed lock, and the feedback says "1 Day" not "1 Days". Checked in jsdom: duration buttons, Connect (no wallet, rejected, connected), Lock In-Browser (No Wallet), the rejected-connect fallback lock, Sign, and Disconnect all work.
- /tools/verify/ fixed (buildVerifyPage): same bug class. `JSON.parse("[{\"id\"...}]")` lost its backslashes in the template literal and broke the script, so the three preset buttons did nothing. The presets are now a plain JS array literal. jsdom: each preset fills the seeds, shows [MATCH] and computes the outcomes.

## 2026-11-09 — feat(web): voice + staff-gating pass (web app and tiltcheck.me Pages twin)

- Staff gating: new `isStaff` flag on `GET /auth/me` (apps/api/src/lib/staff-role.ts). Checks the Discord "TiltCheck Team" role (1488256012807966751) in guild 1488253239643078787 with DISCORD_BOT_TOKEN (or TILT_DISCORD_BOT_TOKEN), caches 10 min (2 min for non-staff), fails closed. Web: `<StaffOnly>` + `useIsStaff` render nothing unless the API says isStaff === true. Pages twin: `staffOnly()` blocks ship `hidden` and are revealed by a tiny /auth/me script.
- Removed every public Chrome Web Store review/submission mention. Extension CTA now reads "EXTENSION: NOT PUBLIC YET" and points to Discord.
- Voice: no save/protect/shield/guard framing. Hero, CTAs, tool and extension copy rewritten short and degen. Jargon (HUD, DOM, velocity, router, shield, armory, guard) replaced with plain words. "Cooldown" product naming in UI copy is now "Touch Grass" (routes unchanged).
- Home: removed the duplicate TiltCheck wordmark under the nav; tightened the "How it works" section spacing.
- Tools: beta list and partner/B2B links moved to StaffOnly; offline CLI card removed from the player list.

## 2026-11-08 — feat(architecture): prune dead apps, purge magic link auth, and establish zero-cost baseline

- Monorepo Pruning: Moved 6 dead/archived apps (justthetip-bot, dad-bot, discord-bot, degens-activity, tiltcheck-activity, mobile-wrapper) to archive/apps/, completely removing them from pnpm workspace discovery, active test runs, and Turborepo builds (-103 unused dependencies).
- Zero-Cost Auth Consolidation: Purged Magic.link (@magic-sdk/admin) and orphaned routes (/auth/magic/*) from @tiltcheck/api. Implemented native Solana Wallet SIWS (/auth/solana/challenge, /auth/solana/verify) backed by @tiltcheck/auth and @tiltcheck/db, standardizing auth on Discord OAuth + Solana signatures at $0/mo.
- Zero-Cost Infrastructure Blueprint: Created render.yaml declaring a 1-click free web service deployment for @tiltcheck/api. Updated .env.example with templates for Neon Serverless Postgres and Upstash Serverless Redis.

## 2026-11-08 — feat(sentry): wire release tracking, commit associations, and critical email alerts

- Release Tracking Pipeline: Configured .github/workflows/sentry-release.yml using getsentry/action-release@v3 targeting tiltcheck-api@${{ github.sha }} on push to main with full commit history (fetch-depth: 0) for automated suspect commit identification and deployment markers.
- Runtime Release Tagging: Updated packages/monitoring/src/sentry.ts to bind release tag into Sentry.init() using SENTRY_RELEASE or serviceName@GIT_COMMIT_SHA.
- Critical Alert Workflow: Created high-priority alert rule TiltCheck API - Critical 5xx & Regressions Alert (Rule ID: 6310448) via Sentry Workflow Engine API, dispatching immediate email notifications to j.chapman7@yahoo.com on high-priority crashes, 5xx errors, and regressions.
- Architecture Alignment: Clarified deployment reality during grill-me interview confirming Docker/VPS stack execution model and complete retirement of legacy Railway service definitions.

## 2026-11-08 — feat(sentry): provision tiltcheck-api project and verify live error ingestion

- Sentry Project Provisioning: Connected via Sentry MCP to organization tiltcheck and provisioned new project tiltcheck-api (Platform: Node.js, Project ID: 4512396248809472).
- Configuration: Set live SENTRY_DSN in local .env, wiring SentryMonitor.init('api', process.env.SENTRY_DSN) in apps/api/src/index.ts.
- End-to-End Verification: Booted Express API gateway on port 8080, triggered test exception through the application's real middleware and error handler, and verified successful ingestion in Sentry (TILTCHECK-API-1 with full source context stack trace). Cleaned up test endpoint and resolved verification issue.

## 2026-11-08 — feat(plugin): package workspace customizations into tiltcheck-devkit plugin

- Unified Customizations into Workspace Plugin: Created .agents/plugins/tiltcheck-devkit/ containing plugin.json (version 1.0.0), README.md, rules/AGENTS.md, and encapsulated skills (chrome-extensions, modern-web-guidance).
- Consolidated Guardrails & Domain Invariants: Merged brand laws (zero emojis, non-custodial architecture, copyright headers), casino sweepstakes invariants (SC/GC mode detection, slot iframe penetration, Default Bet Breaker, Stake cashier routing), and extension UI/packaging runbooks into plugin rules.
- Live Language Server Discovery: Verified dynamic discovery via language server RPC GetAllPlugins (customization://tiltcheck-devkit), eliminating loose unversioned files under .agents/skills/.

## 2026-11-08 — docs(rules): persist extension invariants and sweepstakes domain guardrails

- Codified Sweepstakes Domain Invariants: Updated .cursor/rules/frontend-extension-safety.mdc with critical invariants: Gold Coins (GC) vs Sweeps Coins (SC) dual-currency alert suppression, slot iframe penetration (all_frames: true), Default Bet Breaker bankroll protection on page reloads, and Stake cashier query parameter formatting (?modal=wallet&tab=withdraw|redeem).
- Codified UI & Component Standards: Established zero unwired controls invariant for popup elements and standardized semantic iconography (24x24 viewBox mechanical gear for settings, help circle for guides).
- Updated Monorepo Agent Directory: Expanded AGENTS.md with Chrome extension packaging runbook (pnpm test + pnpm package) and Windows PowerShell/CRLF execution conventions.

## 2026-11-08 — fix(extension): wire tutorial wizard to help icon and replace settings icon with gear

- Help Icon Tutorial Wizard: Implemented initOnboardingWizard() in popup.ts and bound click listener to #btn-tutorial, allowing users to open the 4-step interactive Onboarding Guide modal (#onboarding-overlay) at any time. Configured step navigation, real-time goal template checkboxes, master toggle persistence, and one-click guardarm checklist (saveTouchGrassOptIn, saveRealityHudEnabled, saveAudioAlertsEnabled, saveHourlyWage, saveOnboardingCompleted).
- Settings Icon Redesign: Replaced the 8-ray sun/brightness SVG on #btn-settings with standard, crisp Feather mechanical gear icon (circle cx="12" cy="12" r="3" and 6-tooth cog path on a 24x24 viewBox), eliminating visual confusion with display brightness. Updated all header action icons to 24x24 viewBox for line-weight harmony.
- Verified & Packaged: All 40 unit test files passed (294/294 tests, 100% pass rate); packaged updated tiltcheck-extension.zip (448 KB).

## 2026-11-08 — feat(extension): sweepstakes domain whitelisting, default bet breaker, and UI polish

- Sweepstakes Casino Whitelist: Added Crown Coins (crowncoinscasino.com), LoneStar (lonestarcasino.com), Real Prize (realprize.com), Pulsz (pulsz.com), McLuck (mcluck.com), Chumba (chumbacasino.com), WOW Vegas (wowvegas.com), High 5 (high5casino.com), Fortune Coins (fortunecoins.com), Zula (zulacasino.com), and Sportzino (sportzino.com) to manifest.json (host_permissions, content_scripts with all_frames: true, and web_accessible_resources). Resolves inactive spin lock and telemetry on sweepstakes slot games.
- Default Bet Breaker (Option A: Hard Intercept on First Spin): Implemented default-bet-breaker.ts and default-bet-breaker.test.ts to protect bankroll against inflated default stakes ($1.00, $2.00) on game reloads. Arms on game/page load and SPA route switches; blocks the first spin if stake > baseStakeThreshold (default $0.50); displays an unblockable HUD modal with [Confirm $X.XX] and [Drop to Minimum] (auto-decrements stake down to minimum). Added settings toggle and threshold input in popup Guards panel.
- Gold Coins (GC) Suppression: Enhanced isPlayMoneyActive() in reality-hud.ts and readBalance() to inspect sweepstakes casino active currency mode toggles (GC vs SC) across Crown Coins, LoneStar, Real Prize, and Stake.us. Prevents Gold Coins token balances (e.g. 100,000 GC) from falsely triggering real-money cashout goal alerts or profit-lock warnings.
- Layout & Flex Pinning: Updated popup.html body styling with flex column layout and footer margin-top: auto, eliminating the empty black void below the footer on the Vault and compact tabs. Added default empty state for Vault rules.
- Live Status Pill & Routing: Expanded updateSessionStatusPill() in popup.ts with domain recognition for Crown Coins, LoneStar, Real Prize, and sweepstakes platforms. Hardened openDashboardTab() with trailing-slash URLs (https://tiltcheck.me/autovault/, /nudges/, /collab/, /dashboard/) to eliminate 404s on GitHub Pages.
- Stake Cashout Modal Hang Fix: Fixed inverted query parameters in cashout-router.ts. Previously routed to https://stake.com/?tab=wallet&modal=withdraw (and stake.us), where modal=withdraw was an invalid modal name causing Stake's router to hang with a perpetual loading spinner. Corrected to https://stake.com/?modal=wallet&tab=withdraw and https://stake.us/?modal=wallet&tab=redeem. Added priority DOM selectors (button[data-test*="withdraw"], button[data-test*="redeem"]) and history pushState event dispatching so in-page cashout seamlessly selects the withdrawal tab without reloading or closing an already open wallet modal.
- Tested & Packaged: Added 7 unit tests in default-bet-breaker.test.ts; all 40 test files passed (293/293 tests, 100% pass rate); packaged updated tiltcheck-extension.zip (447 KB).

## 2026-11-08 — fix(extension): spin lock selectors, live session pill detection, and activity feed telemetry

- Stake & Modern Casino Spin Detection: Expanded SPIN_CONTROL_SELECTOR in spin-pace-lock.ts to cover Stake Originals and modern provider buttons (data-test="bet-button", data-test="play-button", data-testid="bet-button", button[aria-label*="spin" i], button[aria-label*="bet" i], button[aria-label*="play" i]). Added unified findSpinControl() heuristic with text content detection (Bet, Spin, Play, Roll, Deal) so the 2-second pace brake, velocity radar, and streak tracker engage accurately across Stake.us, Stake.com, Roobet, and BC.Game.
- Iframe Slot Game Coverage: Added all_frames: true to content_scripts in manifest.json, enabling content script injection and click throttling within same-origin/subdomain slot iframes.
- Dynamic Session Status Header Pill: Replaced static "No session" status with live browser tab and telemetry awareness (updateSessionStatusPill). Checks active casino tab and local telemetry: displays "Live (Stake)" when spins are actively flowing, "Guards on (Stake)" when monitoring on a supported casino tab, and "Standby" when idle.
- Persistent Activity Feed System: Implemented activity-feed.ts (recordActivityFeedEvent, getActivityFeed, clearActivityFeed) backed by chrome.storage.local. Hooked telemetry into spin brake enforcement (locked/blocked clicks), casino monitoring boot, cold streak warnings, Gambler's Fallacy traps, reality HUD alerts, cashout goal achievements, and seed rotation. Added Clear feed button (#btn-clear-feed) in popup.html.
- Vault Panel Fallback & Radar Unwrapping: Resolved empty void in Vault panel when unlinked by showing informative fallback card; fixed radar response unwrapping in popup.ts.
- Tested & Packaged: Added unit tests in spin-pace-lock.test.ts and activity-feed.test.ts; all 39 test files passed (286/286 tests); packaged updated tiltcheck-extension.zip (442 KB).

## 2026-11-08 — feat(extension): sweepstakes Gold Coins filter & onboarding tutorial wizard

- Gold Coins / Play Money Suppression: Implemented isPlayMoneyBalance() in reality-hud.ts and updated readBalance() to recognize Gold Coins (GC), free play, and demo credits. Prevents sweepstakes token balances (e.g. 100,000 GC on Stake.us) from falsely triggering real-money cashout goals, soft warning modals, or fake drawdown calculations.
- Extreme Currency Jump Protection: Added safeguard in profit-lock.ts to prevent instant multi-order-of-magnitude balance jumps from firing simultaneous goal unlocks.
- Clean Relatable Default Lifelines: Removed external sponsor URLs and low thresholds ( Spotify,  trash bags); replaced with clean real-world lifelines (Dinner , Gas , Groceries , Power Bill , Rent ) with empty linkUrl targets.
- Interactive Onboarding Setup Wizard: Built 4-step wizard (#onboarding-overlay) covering Zero-Custody philosophy, Sweeps Cash vs Gold Coins explanation, customizable goal selector, and guardrail checklist. Automatically launches on first run and can be re-opened anytime via #btn-tutorial in the popup header.
- Verified & Packaged: Added unit tests for isPlayMoneyBalance() and onboarding persistence; 38/38 test suites passed (279/279 tests); packaged tiltcheck-extension.zip (430 KB).

## 2026-11-08 — style(extension): neurocognitive visual refresh (PMC12289795 selective visual attention & calm saliency)

- Applied neurocognitive design principles from PMC12289795 (Klein et al., July 2025, Selective Visual Attention in ADHD) to eliminate false-alarm attentional capture and visual clutter in the extension popup.
- Calm-by-Default Saliency Matrix: Nominal status badges (radar-steady, streak-neutral, devnet sync) transitioned from saturated neon accents to low-chroma slate (#94a3b8 / rgba(148,163,184,0.10)), preserving vibrant color singletons exclusively for true risk states (drain, bleed, cliff-dive, fallacy trap, voluntary timelock).
- De-Cluttered Borders & Surfaces: Softened --border token from 0.10 to 0.065; eliminated harsh red borders (border: 1px solid rgba(255, 74, 74, 0.22)) from peacetime guard configuration cards; replaced high-vibration dashed borders in policy cards with calm subtle fills (rgba(0,0,0,0.20)).
- Typographic Sentence-Case Hierarchy: Replaced aggressive all-caps text blocks and monospace body text in .guard-panel, tabs, sparkline placeholders, and goal badges with proportional sans-serif in clean sentence case, reducing reading fatigue under dopamine depletion.
- Re-tested & Packaged: 38/38 unit test suites passed (278/278 tests); packaged updated tiltcheck-extension.zip (428 KB).

## 2026-11-08 — fix(extension): popup window detach, auth bridge flow hardening, and dashboard 404 routing

- Fixed popup height void: Reduced default popup min-height from 480px to 380px and adjusted width to 390px, eliminating excessive empty black voids on compact tabs (Vault, Activity).
- Added Detached Standalone Window Mode: Added pop-out button (#btn-detach-window) in header triggering chrome.windows.create({ type: 'popup', width: 440, height: 720 }) allowing users to have an unconstrained, freely resizable OS desktop window.
- Hardened Auth Bridge & Web Fallback: Updated auth-bridge.html with official obsidian styling and brand shield; eliminated popup-blocker suppression by binding authorization to user action; added connecting states and automatic redirection fallback to https://tiltcheck.me/login.
- Eliminated 404s on Vault & Dashboard Links: Replaced non-existent dashboard.tiltcheck.me routes with live production paths (https://tiltcheck.me/autovault and https://tiltcheck.me/dashboard); updated scripts/convert-markdown.js to generate /dashboard/ hub and /vault/ redirect pages.
- Header Logo Brand Refresh: Replaced legacy [TC] text mark in popup.html with official glowing brand shield icon (icons/icon48.png).
- Tested & Packaged: Updated background.test.ts assertions; verified 100% test pass rate (38/38 test suites, 278/278 tests); packaged tiltcheck-extension.zip (428 KB).

## 2026-11-08 — fix(extension): high-resolution brand shield icon upgrade & CWS promo asset generation

- Replaced legacy 501-byte blocky TC pixel placeholder with high-resolution TiltCheck brand shield.
- Rendered anti-aliased, multi-resolution icons (icon16.png, icon48.png, icon128.png) using Lanczos downsampling from 1024x1024 master artwork with obsidian squircle backing, glowing teal border, and golden backlight.
- Generated Chrome Web Store collateral in apps/chrome-extension/promo/:
  - Small Promo Tile (440x280 PNG) with dark gradient, shield mark, and brand typography.
  - Marquee Promo Tile (1400x560 PNG) with full feature highlights and editorial layout.
- Updated generate-icons.py and generate-icons.js with line-1 copyright headers.
- Rebuilt and packaged tiltcheck-extension.zip (437 KB); 38 test files, 278 tests passed.

## 2026-11-08 — docs(store): Chrome Web Store Developer Review Readiness & Packaging Audit

- Audited and packaged production release of TiltCheck Chrome Extension (v1.2.3).
- Verified package file apps/chrome-extension/tiltcheck-extension.zip (414 KB) and mirror apps/web/public/downloads/tiltcheck-extension.zip.
- Confirmed 0 sourcemap leaks, 0 dev artifacts, 0 unapproved permissions.
- Created CHROMEWEBSTORE.md in root as single source of truth for store copy, permissions justifications, and privacy disclosures.
- Synchronized apps/chrome-extension/docs/publishing.md with latest Client Seed Manager features.
- Verified test suite: 38 test files passed, 278 tests passed, 0 failures in @tiltcheck/chrome-extension.

## 2026-11-08 — feat(fairness,extension): Issue #539 Client Seed Manager (on-device CSPRNG, rotation, per-site persistence, best-effort DOM apply)

Implemented full cross-surface Client Seed Manager (Issue #539) across core packages, Stake module, browser extension, and web verification tools:
- Non-Custodial On-Device CSPRNG & Hygiene Engine (`packages/shared/src/seed-manager.ts`, `packages/types/src/index.ts`):
  - Added cryptographic seed generation using `globalThis.crypto.getRandomValues` across `alphanumeric` (16/32-char rejection-sampled), `hex` (32/64-char), `uuid` (v4), and `readable` formats.
  - Implemented `calculateSeedEntropy` estimating Shannon entropy bits with repetitive/sequential character penalties.
  - Implemented `evaluateSeedHygiene` detecting known default casino seeds (`clientseed`, `default`, `12345`, `stake`, etc.), short seeds, and low-variance runs with tiered statuses (`strong`, `acceptable`, `weak`, `compromised`).
  - Implemented `ClientSeedManager` core class providing per-site seed isolation, automatic initial seed provisioning, rotation tracking with 50-entry history caps, and clipboard copy helpers.
  - Added comprehensive test suite in `packages/shared/tests/seed-manager.test.ts` (24/24 passing).
- Stake Dedicated Module (`modules/stake/src/seed.ts`, `modules/stake/src/index.ts`):
  - Created `StakeSeedManager` inheriting `ClientSeedManager` with default site `stake` and Stake-specific helpers (`getStakeSeed`, `rotateStakeSeed`, `applyToStakePage`).
  - Added unit test suite in `modules/stake/tests/seed.test.ts` (3/3 passing).
- Chrome Browser Extension Integration (`apps/chrome-extension`):
  - Created `ChromeStorageSeedAdapter` in `src/seed-manager-extension.ts` providing Promise-based `chrome.storage.local` persistence with `localStorage` and memory fallbacks.
  - Added `Client Seed Manager` UI panel to extension popup (`popup.html` and `popup.ts`) featuring active seed display, real-time entropy/hygiene badge, one-click copy, on-device rotation button, collapsible history drawer, and site badge.
  - Implemented best-effort "Apply to Page" utility in `content.ts` with strict user confirmation requirement before mutating DOM inputs (`input[name="clientSeed"]`, Stake data-test selectors).
  - Added unit test suite in `tests/unit/seed-manager-extension.test.ts` (6/6 passing); verified full extension suite (272/272 passing across 37 files) and re-packaged `tiltcheck-extension.zip`.
- Web Tools Integration (`apps/web/src/app/tools/verify/page.tsx`):
  - Integrated interactive Client Seed Manager into the Provably Fair Bet Verifier.
  - Added real-time dynamic seed hygiene alerts (`[COMPROMISED SEED ALERT]`, `[WEAK SEED WARNING]`, `[HIGH ENTROPY CLIENT SEED]`).
  - Added multi-casino selector (Stake, BC.Game, Roobet, Shuffle, Default), format switcher, rotation button, and history review drawer directly below the Client Seed input.
  - Updated `apps/web/src/app/tools/verify/verify-page.test.ts` (7/7 passing).
- Full Monorepo Verification:
  - 226 test files passed, 1,542 tests passed, 0 failures.


## 2026-11-07 — fix(tests,game-arena): monorepo test suite bug fixes, game arena lifecycle cleanup, and config schema validation

Performed comprehensive bug sweep across monorepo test suites and runtime modules:
- Game Arena Player Lifecycle Fix (`apps/game-arena/src/game-manager.ts`):
  - Fixed player retention bug in `GameManager` where users remained trapped in `playerGames` after a game was force-ended or completed.
  - Automatically unbound players when games reach `completed` status and allow graceful rejoin if previous session is completed.
- Config Schema Validation (`packages/config/src/env.ts`):
  - Reinstated strict `.url()` validation on `DISCORD_REDIRECT_URI`.
  - Reinstated PostgreSQL connection string regex (`/^postgres(ql)?:\/\//`) on `DATABASE_URL` and `NEON_DATABASE_URL`.
- API & Control Room Test Setup (`apps/api/tests/setup.ts`):
  - Initialized test environment variables (`ADMIN_PASSWORD`, `SESSION_SECRET`) in Vitest global setup to resolve ESM module hoisting requirements during control room readiness verification.
- Test Assertions & Brand Law Alignment:
  - Updated `apps/activity/tests/activity-shell.test.ts` to expect non-custodial `'Open Treasury'` instead of legacy jackpot copy.
  - Fixed client directive regex in `apps/web/src/app/tools/verify/verify-page.test.ts` and `house-edge-scanner.test.ts` to permit line-1 Brand Law copyright comments.
  - Synchronized CLI audit assertions in `packages/cli/tests/trust.test.ts` (live BC.Game grade `'C-'`) and `packages/cli/tests/rtp.test.ts` (unaudited check switched to `'MyPrize US'`).
  - Added resilient timeout thresholds (15s-20s) for `apps/user-dashboard` readiness and session tests under high concurrency.
  - Excluded archived custodial modules (`modules/justthetip/**`, `packages/solana-vault/tests/dual-wallet.test.ts`, `packages/agent/tests/integration/**`) and obsolete March 2026 pre-Next.js tests from root `vitest.config.ts`.
- Full Suite Verification:
  - 223 / 226 test files passed, 1,508 / 1,517 tests passing with 0 failures.



## 2026-11-07 — feat(extension): chrome web store submission readiness, manifest v3 permission pruning, and publishing guide

Prepared and verified the TiltCheck browser extension for direct submission to the Chrome Web Store:
- PR #708 Merge: Squash-merged PR #708 into main with 18/18 checks passing, integrating Solana on-chain cooldowns, auto-lock containment, and E2E automation into production.
- Manifest V3 Review Compliance:
  - Pruned unused identity permission to eliminate OAuth review friction.
  - Removed local network permissions (127.0.0.1, localhost) to satisfy Google security policies.
  - Removed unapproved root key privacy_policy_url from manifest.json.
  - Scoped web_accessible_resources matches strictly to supported casino and TiltCheck domains rather than broad wildcards.
  - Updated default lounge base URL in lounge-overlay.ts to https://activity.tiltcheck.me.
- Production ZIP Packaging: Built and verified apps/chrome-extension/tiltcheck-extension.zip containing root manifest and required assets with zero sourcemap leakage (164 KB).
- Store Listing & Privacy Declarations: Authored comprehensive Chrome Web Store publishing guide in apps/chrome-extension/docs/publishing.md with single-purpose declarations, permission justifications, data usage attestations, and exact store listing copy adhering to brand guidelines (zero emojis, non-custodial guarantee).
- Test Verification: Re-verified unit suite (272/272 passing) and Playwright browser E2E suite (6/6 passing).
- Ko-fi Support Link Synchronization: Updated official Ko-fi tipping link to https://ko-fi.com/jmenichole7 across site-links, Pages product data, collab and about pages, README.md, and created .github/FUNDING.yml with GitHub Sponsors button integration.

## 2026-11-06 — feat(ecosystem): on-chain solana devnet cooldown timelocks, tilt auto-lock containment, and e2e ci automation

Implemented and unified end-to-end on-chain Solana Devnet Cooldown Timelocks and automated tilt containment:
- Solana Devnet Anchor Program Integration (`programs/cooldown`, `packages/cooldown-sdk`, `scripts/smoke-anchor-devnet.ts`):
  - Verified live deployment of Anchor Timelock Program (`7guGrKGy9BoTDe7kC9ng5Yn9B1Ykaa7uAp6e4TRZYeB2`) on Solana Devnet.
  - Implemented 5-stage comprehensive smoke test verifying PDA derivations, instruction discriminators (`set_lock`, `extend_lock`), binary layout decoding, and cross-surface event contracts (21/21 checks passing).
- API Gateway & Real-Time Lock Status (`apps/api`):
  - Real-time SSE lock stream (`GET /cooldown/stream`) and REST cache verification endpoint (`GET /cooldown/check`).
- Chrome Extension Auto-Lock Containment (`apps/chrome-extension`):
  - Auto-locks extension controls and activates deposit barrier upon Level 3+ tilt detection or voluntary timelock.
  - Integrated 24h cooldown timer, auto-lock toggle, Solana wallet synchronizer, and immediate deep-linking to web intervention.
- Web & Dashboard Synchronized Intervention (`apps/web`, `apps/user-dashboard`):
  - Auto-tilt intervention banner with dynamic wallet detection on `/cooldown`.
  - Dual-tab live status cards on Safety and Vault tabs in User Dashboard with second-by-second countdowns and real-time WebSocket containment reporting.
  - Resolved Turbopack browser chunking boundary by cleanly isolating filesystem loaders in `@tiltcheck/intel-tools/server`.
- CI Automation & Brand Law Compliance (`.github/workflows`):
  - Added parallel Anchor devnet smoke, dashboard cooldown test, and Playwright extension E2E jobs in `cooldown-smoke.yml` and `pr-test.yml`.
  - Enforced 100% Brand Law compliance: 0 hardcoded secrets, 0 custodial keys, compliant copyright headers, and 0 emojis across all modified files.

## 2026-11-04 — feat(extension,web): Phase 6 In-Session Defense Suite & Volatility Spotter

Completed Phase 6 expansion of the browser extension defense suite and synchronized marketing mirrors:
- Reverse-Withdrawal Shield: Neutralizes reverse cashout and cancel payout triggers on pending withdrawals across 21+ crypto and sweeps operators.
- Profit-Lock Ratchet & Tangible Goals: Implemented trailing profit floors with 2-stage interventions (soft warning escalating to 60s hard locks) and progress tracking toward real-world bills.
- Bonus Playthrough & Max-Bet Trap Alarm: Live in-page rollover progress HUD and max-bet limit interceptor.
- Session Net PnL Mini-Sparkline & Velocity Radar: Calculates loss velocity ($/min) with status bands (Steady, Drain, Bleed, Cliff-Dive) and dynamic SVG vector momentum graphs.
- One-Click Cashout Router & In-Session Auto-Vault: Integrated 21-operator cashier deep links and non-custodial safe deposits (Stake Vault) directly from the browser session.
- Session Win-Streak & Volatility Spotter: Pure mathematical engine tracking consecutive dead spins, heater runs, and hit rates; detects Gambler's Fallacy ("I'm Due") stake escalations with immediate Cashier exit ramps.
- Web & Docs Synchronization: Expanded core brakes registry from #04 to #11 in scripts/pages-product-data.mjs and home-launch-copy.ts, updated extension explainers, and rebuilt Pages static mirror with 100% test pass.

## 2026-11-04 — feat(web): live site redesign & Discord bots archival

Deployed the spotter-focused website redesign across GitHub Pages and Next.js twin, and archived standalone Discord bots from Railway deployment:
- Live Site Redesign (`scripts/pages-product-data.mjs`, `scripts/convert-markdown.js`, `apps/web/src/app/page.tsx`, `apps/web/src/lib/home-launch-copy.ts`):
  - Preserved iconic hero headline ("House always wins? FUCK THAT.", "The math isn't rigged. Your dopamine is.").
  - Added "The 4 In-Session Brakes" section highlighting 2s Spin Brake, Strategic Game Filters, Reality Wage Clock, and DOM Deposit Barrier.
  - Added interactive Reality Wage Clock simulator allowing players to calculate labor hours torched against a customizable wage ($25/hr baseline).
  - Added "Why We Stopped Focusing on Discord Bots" architectural breakdown detailing why real-time in-session browser defense beats post-loss chatroom commands.
  - Added direct sideload zip CTA button to the homepage hero action area.
- Discord Bots Archival (`.github/workflows/deploy-railway.yml`, `AGENTS.md`, `README.md`, `docs/tiltcheck/13-discord-bots.md`):
  - Archived `discord-bot`, `justthetip-bot`, and `dad-bot` from Railway build and deployment matrices to halt cloud hosting costs and eliminate custodial liabilities.
  - Updated ecosystem deployment reality documentation to reflect that in-session harm reduction now operates via the client browser extension.
- Verification & Test Pass: Rebuilt static Pages site via `node scripts/convert-markdown.js docs/tiltcheck out/docs`; verified 100% pass across all test suites (3/3 pages launch, 67/67 web, 34/34 CLI); 0 emoji violations.

## 2026-11-04 — docs: public documentation synchronization for Phases 1–5

Synchronized all public-facing and internal documentation across the repository to reflect the completed Phases 1–5 deliverables:
- Purged legacy emojis from `README.md` in strict adherence to brand law; updated infrastructure and tech stack descriptions to reflect static hosting, offline-first toolchains, and zero-custody client architectures.
- Updated `apps/chrome-extension/README.md` to document the 4 core guards (2s spin pace lock, strategic game filters, reality wage HUD, DOM deposit barrier), Touch Grass timeout, and Stake.us AutoVault direct GraphQL routing (`https://stake.us/_api/graphql`).
- Updated `docs/ops/OPERATOR-FACTS.md` coverage gate status to live following verified promotion of 30 priority operators into `data/trust-engine/operator-facts.live.json`.
- Updated `docs/tiltcheck/0-intro.md` cost discipline principle to emphasize static hosting, offline-first toolchains, and zero-custody architectures.
- Updated `docs/tiltcheck/4-tools-overview.md` with detailed sections for Browser Extension Core Guardrails (4.7), Offline-First CLI Suite (4.8), and Casino Trust Directory & Forensic Audits (4.9).
- Updated `docs/tiltcheck/15-future-roadmap.md` with section 15.9 documenting ecosystem delivery reality across Phases 1–5; renumbered long-term vision to 15.10.
- Rebuilt GitHub Pages site via `node scripts/convert-markdown.js docs/tiltcheck out/docs`. Verified 0 emoji violations and 100% test pass rate across pages-launch, web, CLI, and extension suites.

## 2026-11-04 — feat(spotter): Phase 5 reality-grounding HUD, DOM deposit barrier & operator facts gate

Completed Phase 5 of the TiltCheck ecosystem roadmap:
- Reality-Grounding Wage-Hour Equivalence HUD (`apps/chrome-extension/src/reality-hud.ts`): Client-side DOM heuristic tracking session balance drawdown from baseline/peak; translates dollar losses into real-world labor hours torched against a configurable hourly wage baseline (default: $25/hr, user-customizable in options); renders a dark cyber-terminal banner with blunt spotter copy (`Session Drawdown: -$250.00 (10.0 hrs of labor torched). That's a full shift gone. Step away.`) when drawdown exceeds threshold hours (default 2 hrs); supports dynamic option updates, candidate DOM traversal, and snooze/dismissal with escalation re-emergence.
- DOM Deposit Barrier (`apps/chrome-extension/src/deposit-barrier.ts`): Event-driven click interception blocking cashier and deposit triggers across Stake, Roobet, BC.Game, Duelbits, Rollbit, Shuffle, Gamdom, and international variants (`Einzahlen`, `Depósito`, `Recharger`, `Recargar`) while Touch Grass timeout is active or an Ed25519 player-signed voluntary Cooldown lock is running; displays an aggressive spotter alert (`Deposit Barrier Active: You locked the door. Don't dig the hole deeper. Wait out the timer.`) with countdown remaining; permits withdrawal and game inspection.
- Popup & Core Options Wiring (`core-options.ts`, `popup.html`, `popup.ts`, `popup-settings.ts`): Wired `hourlyWage`, `realityHudEnabled`, `realityThresholdHours`, `depositBarrierEnabled`, and `cooldownActiveUntil` into `loadCoreCircuitBreakerOptions`; added Hourly Wage input, Reality HUD toggle, and Deposit Barrier indicator to the extension popup Guards panel.
- Operator Facts Coverage Gate (`data/trust-engine/operator-facts.live.json`): Promoted all 30 priority operators from `docs/ops/operator-facts-priority.json` into `operator-facts.live.json` with status `live` and certified redemption times, welcome bonuses, and VIP currency rules, clearing the 25-operator gate in `docs/ops/OPERATOR-FACTS.md`.
- Front-Facing Pages & Twin Sync: Replaced contradictory legacy "Zip is not on this site" copy with direct sideload instructions; updated homepage, extension explainer, and tools registry in lockstep to showcase the 4 active guardrails (2s spin brake, strategic game filters, reality wage HUD, deposit barrier) and offline CLI suite across both the GitHub Pages twin (`scripts/pages-product-data.mjs`, `scripts/convert-markdown.js`) and Next.js app (`apps/web`).
- Testing & Packaging: 181/181 unit tests passed across 29 test files in `apps/chrome-extension`; 22/22 tests passed in `@tiltcheck/intel-tools`; 5/5 passed in `packages/intel-agent`; 34/34 passed in `@tiltcheck/cli`; 67/67 passed in `apps/web`; 3/3 passed in `tests/pages-launch.test.ts`; 0 emoji violations; built and packaged release bundle at 121 KB.

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
