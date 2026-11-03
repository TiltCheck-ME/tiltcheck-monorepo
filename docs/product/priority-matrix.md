<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-02 -->

# TiltCheck priority matrix

Made for Degens. By Degens.

Public `tiltcheck.me` is GitHub Pages (`scripts/pages-product-data.mjs` + `scripts/convert-markdown.js`). Next.js `apps/web` is the twin. Edit both or production still looks gated.

Zip download stays gated (`ctaReady: false`) until Chrome Core's play path is not broken. That is not permission to wallpaper the homepage with "not live."

## Live vs gated

| Surface | Delivery | Reality |
| :--- | :--- | :--- |
| tiltcheck.me | GitHub Pages | Live. Copy must not read as a coming-soon page. |
| Cooldown | API + Solana devnet | Live wallet lock. Operators are not required to honor it. Not GAMSTOP. |
| Trust intel / casinos | API + rollup | Live advisory scores. Baselines if API is down. |
| Discord / JustTheTip / dad-bot | Railway | Live. |
| Chrome Core | Load unpacked `apps/chrome-extension/dist` | Works on 8 casino hosts. Not Chrome Web Store. Zip not on the site. |
| Pro HUD | `tiltcheck_pro_monolith_enabled` | Off by default. |
| GGR / historical tilt | none | Cannot be computed. Do not sell it. |

## P0 — this week (Completed)

| ID | Task | Status | Why |
| :--- | :--- | :--- | :--- |
| WEB-1 | Kill not-live wallpaper on home + extension + nav | Done | Site is live. Zip is gated. Different sentences. |
| WEB-2 | Retire "self-exclusion" on public web copy | Done | Regulated noun. Use wallet lock / browser filter. |
| WEB-3 | Keep Pages twin in lockstep; push to `main` to hit tiltcheck.me | Done | Next-only edits never deploy. |
| EXT-1 | Never hide Guards for email-only login | Done | Chicken block is the product. |
| EXT-2 | Filters first + one-tap Chicken/Mines | Done | Antecedent before 2s brake. |
| EXT-3 | Spin brake opt-in (default off); overlay "You put this on your list" | Done | Agency. Not nanny. Not casino ban voice. |

## P1 — next (Completed)

| ID | Task | Status | Note |
| :--- | :--- | :--- | :--- |
| EXT-4 | Lounge mounts only when game-arena is up | Done | Host is attached only on successful state ping; unmounted when offline. |
| EXT-5 | Remove Core sensitivity slider (placebo) | Done | Removed from popup.html & popup.ts; 2s brake is fixed. |
| DOC-1 | Rename surgical-self-exclusion docs; RGaaS 403 as optional appendix | Done | Documented as Browser Game Filters with appendix for RGaaS. |
| RG-1 | Signpost GAMSTOP / NCPG next to browser filters | Done | Signpost added in popup.html Guards panel with 1-800-GAMBLER links. |
| EXT-6 | Delete dead extension trees (`src/v2`, `sidebar.ts`, `sw.js`, unused engines) | Done | Pruned src/v2, legacy sidebar.ts, sw.js, originals-detector.ts, SolanaProvider.ts, fairness-tutorial.ts. |
| CAS-1 | Audit & expand Casino Trust Directory (`/casinos`) with evidence and RTP data for Stake, Roobet, and BC.Game | Done | Added deep-dive showcase, provably fair RTP math, slot downgrade profiles, AutoVault support, and verified receipts. |
| CLI-1 | Modernize CLI into offline-first suite (verify, rtp, trust, cooldown); prune GCP & localhost:4000 stubs | Done | Full local-first suite with Ed25519 cooldown, HMAC-SHA256 verifier, RTP inspector, and 34 passing tests. |
| SPOT-1 | Extension Spotter architecture: Stake.us AutoVault cookie fix, Core Touch Grass timeout, spotter copy, legacy sidebar tree pruned | Done | Fixed Stake.us GraphQL endpoint; wired rapid-click & loss escalation Touch Grass timeout in Core; pruned 15 unmaintained sidebar files. |

## P2 — later

| ID | Task |
| :--- | :--- |
| SIG-1 | Do not fake tilt history. Wire `recordBet` only if we want the warn ladder |
| REL-1 | Ungate public zip only after EXT-1–3 |
| CHN-1 | Cooldown mainnet + Chrome Web Store |

## Decision rules

- Lead game filters, then opt-in pace, then user-set pause. Do not sell pulse/last-call until it fires.
- Do not ungated the zip while Magic login hides Guards.
- Do not build operator self-exclusion registers.
- `soon™` mocks casino payout timelines, not our own homepage.
