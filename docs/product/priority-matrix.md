<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-29 -->

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

## P0 — this week

| ID | Task | Why |
| :--- | :--- | :--- |
| WEB-1 | Kill not-live wallpaper on home + extension + nav | Site is live. Zip is gated. Different sentences. |
| WEB-2 | Retire "self-exclusion" on public web copy | Regulated noun. Use wallet lock / browser filter. |
| WEB-3 | Keep Pages twin in lockstep; push to `main` to hit tiltcheck.me | Next-only edits never deploy. |
| EXT-1 | Never hide Guards for email-only login | Chicken block is the product. |
| EXT-2 | Filters first + one-tap Chicken/Mines | Antecedent before 2s brake. |
| EXT-3 | Spin brake opt-in (default off); overlay "You put this on your list" | Agency. Not nanny. Not casino ban voice. |

## P1 — next

| ID | Task |
| :--- | :--- |
| EXT-4 | Lounge mounts only when game-arena is up |
| EXT-5 | Remove Core sensitivity slider (placebo) |
| DOC-1 | Rename surgical-self-exclusion docs; RGaaS 403 as optional appendix |
| RG-1 | Signpost GAMSTOP / NCPG next to browser filters |

## P2 — later

| ID | Task |
| :--- | :--- |
| EXT-6 | Delete dead extension trees (`src/v2`, `sidebar.ts`, `sw.js`, unused engines) |
| SIG-1 | Do not fake tilt history. Wire `recordBet` only if we want the warn ladder |
| REL-1 | Ungate public zip only after EXT-1–3 |
| CHN-1 | Cooldown mainnet + Chrome Web Store |

## Decision rules

- Lead game filters, then opt-in pace, then user-set pause. Do not sell pulse/last-call until it fires.
- Do not ungated the zip while Magic login hides Guards.
- Do not build operator self-exclusion registers.
- `soon™` mocks casino payout timelines, not our own homepage.
