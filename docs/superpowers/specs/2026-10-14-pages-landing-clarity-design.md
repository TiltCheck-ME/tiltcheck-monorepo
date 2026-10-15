<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-14 -->

# Pages landing clarity — design spec

Status: Approved (founder 2026-10-14)
Owner: founder (solo)
Surface: GitHub Pages (`tiltcheck.me`) via `scripts/convert-markdown.js` + `scripts/pages-product-data.mjs`. Next.js `apps/web` stays a local twin only. Not Railway.
Date: 2026-10-14

Tracking: GitHub issues and PRs only.

The public landing is wordy because the same facts print four times. Cooldown 404s. Extension Details redirects home. This spec cuts repeats, keeps the **wen** lines, and gives both buttons real Pages destinations.

## Problem

Live `tiltcheck.me` is GitHub Pages. The hero stacks H1, three kickers, a dense lede, gated zip, Cooldown, Extension, and a privacy paragraph that restates Cooldown. Below that: Wen zip, three cards, a “live stack” card, then seven honesty bullets. Cooldown / Core / Trust show up in all of those.

**SET A COOLDOWN LOCK** hits `https://tiltcheck.me/cooldown`. That was a Next.js route. Pages never built it. 404.

**EXTENSION DETAILS** points at `extension.html`. `run()` in `convert-markdown.js` overwrites `extension.html` with `buildHomeRedirect`. The button goes home. `buildExtensionPage()` exists and is not written to disk.

Railway is not the public web. Shipping Next.js copy does not change what people see.

## Mission

Make the Pages landing scannable: punch at the top, product in the cards, honesty once. Keep degen voice and **wen**. Make Cooldown and Extension real static pages. No fake wallet form. No Chrome zip until `CTA_READY` is true.

## Locked decisions

- Approach: cut repeats, keep the bones. Do not “space the same essay.” Do not strip to a poster.
- Scope: full landing + branched pages (`/cooldown`, `/extension`).
- Public host: GitHub Pages. Source of truth for live copy: `scripts/pages-product-data.mjs` + `convert-markdown.js`. Keep `apps/web` `HOME_LAUNCH` in lockstep so local Next.js does not drift. Do not deploy `web` on Railway for this.
- H1 stays: `House always wins?` / `FUCK THAT.`
- **Wen** stays: hero “Wen mainnet? soon.” and the `#install` title **Wen zip**.
- Cooldown page is a static explainer. Not a signing UI. Not custody.
- Stop treating `extension.html` as retired. Write real HTML at `extension/index.html` and `cooldown/index.html` so `/extension` and `/cooldown` resolve on Pages.
- Zip CTA stays gated (`ZIP DROPS SOON™` + one short why) until `CTA_READY`.
- Cooldown is the real primary button. Zip is gated. Extension is secondary.
- Kill the “live stack” card.
- Honesty: three bullets. JustTheTip, Discord bot, casino list, and SusLink leave the homepage.
- Footer still has 1-800-GAMBLER / NCPG and “Made for Degens. By Degens.”
- No emojis. No new custody. No `@solana/pay` 1.x.

## Hero

Wordmark. H1. Then three lines, not a paragraph:

1. The house banks on your tilt.
2. Harm reduction made for degens, by degens. Tested tools — not a lecture from your mom.
3. Cooldown v2: you sign. No keys. Wen mainnet? soon.

No long lede. Cooldown / Core / Trust do not live here.

Buttons:

- **SET A COOLDOWN LOCK** — `btn-primary` — `/cooldown`
- **ZIP DROPS SOON™** — disabled — one line why: zip is not public; Cooldown ships today
- **EXTENSION DETAILS** — `btn-secondary` — `/extension`

Privacy caption, not a subtitle: **No wallet keys. No casino passwords.**

Spacing: house + retort tight. Air. Wen line smaller, mono. Air. Buttons. Privacy as caption.

## Below the fold

### Wen zip (`#install`)

Keep the title. Three steps. No extra paragraph under them.

1. Zip is not public. soon™. Do not hunt a sideload.
2. When it drops: Load unpacked in `chrome://extensions`.
3. Core is a 2s spin lock. Touch Grass is Pro.

### Three cards

One sentence each.

- **Cooldown** — On-chain lock you sign. No cancel in v1. Devnet.
- **Session intel** — 2s spin lock on supported tabs when the zip drops. Touch Grass is Pro.
- **Trust receipts** — Public RTP, filings, payout evidence. Not a casino-sponsored grade.

### Honesty

Three bullets:

- Cooldown is Solana devnet. Not mainnet.
- Zip is not public. Core is 2s. Touch Grass is Pro. No Chrome Web Store.
- Trust scores use live feeds when the API is up. Curated baselines when it is not.

## Branched pages

### `/cooldown`

Write `cooldown/index.html`. Static explainer.

- Title: On-chain lock. You sign. We never hold keys.
- What it is: self-exclusion you cannot weasel off in a settings menu. v1 has no cancel. Devnet. Wen mainnet? soon.
- What you can lock: everything, a category, or one game. Stronger only.
- What it is not: not a form on this page, not custody, not a casino RG checkbox.
- Primary CTA: Discord. Secondary: home. Optional: `/extension`.

### `/extension`

Write `extension/index.html`. Remove `extension.html` from the retired-redirect list (or make `extension.html` redirect to `/extension/`, not home).

- Title: Session intel in the tab. Two-second spin lock.
- Zip gated. Secondary: `/cooldown`.
- Wen zip: same three steps as home.
- Three beats: watches the tab, 2s lock, not the Pro HUD.
- Honesty: not Chrome Web Store, zip not public, no keys.

### Nav

Home nav: Cooldown → `/cooldown`, Extension → `/extension`, Zip soon™ → `/#install`, Discord. Do not label a working Download while the zip is gated.

## Visual

Dark degen Pages shell already in `scripts/pages-assets/styles/base.css`. Do not restyle the brand. Do:

- Hero stack with real gaps (not every line as the same subtitle).
- Retort in mint. Wen line mono, smaller.
- Beats (if any leftover product lines) separated from the hook by space or a hairline, not another grey paragraph.
- Cards stay `public-page-grid--3`. More section gap so Wen zip / cards / honesty do not smear into one block.

## Testing

- Pages builder writes `cooldown/index.html` and `extension/index.html`.
- Home does not link `/cooldown` as an absolute Next-only path that 404s. Same-origin `/cooldown` and `/extension`.
- `extension.html` is not a home redirect.
- Home source/copy tests: no live zip download while gated; kicker contains wen; lede blob gone; honesty length is 3; live stack copy gone.
- Builder test: landing HTML contains the three hero lines, Wen zip, Cooldown primary href, gated zip why.

## Out of scope

- Railway `web` image. Cooldown signing UI. Chrome Web Store. Flipping `CTA_READY`. Casinos/tools Pages clones. Touch Grass hub. Solana mainnet.

## Files

- `scripts/pages-product-data.mjs` — live copy
- `scripts/convert-markdown.js` — landing, cooldown page, extension page, stop home-redirect on extension
- `scripts/pages-assets/styles/base.css` — hero stack, wen, privacy caption
- `apps/web/src/lib/home-launch-copy.ts` + `apps/web/src/app/page.tsx` — local lockstep
- `apps/web/src/app/extension/page.tsx` — local lockstep, not the live host
- Tests under `tests/pages-launch.test.ts` and web copy tests
- `CHANGELOG.md`
