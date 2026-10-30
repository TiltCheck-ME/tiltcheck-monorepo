<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-29 -->

# Homepage job: brakes — design spec

Status: Approved  
Owner: founder (solo)  
Surface: `tiltcheck.me` homepage (GitHub Pages twin + Next.js `apps/web`)  
Date: 2026-10-29  
Related: `apps/web/src/lib/home-launch-copy.ts`, `scripts/pages-product-data.mjs`, `docs/product/priority-matrix.md`

This spec supersedes the homepage *job* in [2026-10-04-single-page-launch-design.md](2026-10-04-single-page-launch-design.md) (zip as the only CTA) and kills the sportsbook/pit visual that was started and rejected in session.

## Problem

Cold traffic on tiltcheck.me cannot tell what TiltCheck is. Live Pages still reads as a gated zip / coming-soon page. Local copy sells brakes but the layout is generic centered SaaS, and an earlier pass framed it as a sportsbook ticket. The founder does not want a hangout-first homepage while Degen Lounge is local-only.

## Job (locked)

**Approach A — brakes only.** The homepage tells a stranger: this is brakes for people who already gamble. Not a casino. Not a bank. Not a hangout. Point at what works in the browser today.

Hangout (Degen Lounge, lounge tips) stays off the homepage until `/lounge` is a public URL on this domain. AutoVault is below the fold, two casinos only.

## Goals

- One job in a few seconds: brakes, non-custodial, not a lecture.
- Primary click is Cooldown. The why is feeding the house (chase + “im due” + heater high).
- Secondary click is casino lookup.
- Extension is a text link, not a third hero button. Zip stays gated.
- Next.js and Pages twin stay in lockstep. Live tiltcheck.me only updates after a `main` push of the Pages pipeline.
- H1 is readable on glitter. Live site currently fails that.

## Non-goals

- Hangout-first landing, lounge walk-in, chat mock, tip UI, `/lounge` in nav or home.
- Selling AutoVault as universal or as Cooldown (Cooldown does not move funds).
- Ungating the Chrome zip or Chrome Web Store listing.
- Sportsbook / pit / parlay / betting-slip visuals or CSS names (`pit-hero`, `pit-slip`, “LIVE” lounge stamp).
- Calling Cooldown, overlays, or game lists self-exclusion or GAMSTOP.
- Mainnet Cooldown. Honesty says devnet.
- Redesigning inner pages (Cooldown, extension, AutoVault tool page) except inbound copy from home.

## Decisions (locked)

| Topic | Choice |
| :--- | :--- |
| Homepage job | Brakes only |
| H1 | `House always wins?` / `FUCK THAT.` |
| Kicker | `Chasing the loss, chasing the win, thinking you are due. That is feeding the house.` |
| Subhead | Brakes for degens who still play. Slow the next spin. Block the game that rinses you. Sign a Cooldown so 3am-you cannot put the stack back on the table until the timer ends. Look up sus casinos before you deposit. We never hold your keys or take bets. |
| Primary CTA | **DON'T FEED THE HOUSE** → `/cooldown` (Pages: `https://tiltcheck.me/cooldown`) |
| Secondary CTA | **IS THIS CASINO SUS?** → `/intel/rtp` |
| Tertiary | Text link, not a button: How the Chrome brakes work → `/extension` |
| Fine print under CTAs | Never ask for casino password or wallet seed. You sign a Cooldown. Zip is not on this site. |
| Hero buttons | Two. Funnel attrs stay on both. |
| Lounge / tips | Not on homepage |
| AutoVault | Below-fold module. Stake.us + nuts.gg only. CTA `/tools/auto-vault` |
| Zip | `ctaReady: false`. No download button. |
| Visual | Dark mod overlay on a casino tab. Copy left, decorative HUD right. Not a ticket. |
| Fonts | Distinctive display + body. Not Inter. Not Space Grotesk. Condensed display for H1; `FUCK THAT.` teal and huge. |
| Color | Teal `#17c3b2`. Amber only for devnet honesty. |
| Glitter | Keep. Landing overlay must leave H1 readable. |
| Brand | `BrandTagline` eyebrow. Footer tagline unchanged. No emojis. |

## Cooldown vs AutoVault (do not mix)

**Cooldown** is an on-chain lock the user signs on Solana (devnet). Scope: game, category, or everything. Stronger locks only until the timer ends. Operators are not required to honor it. It does not transfer wins, vault coins, or hold keys.

The homepage why: chasing a loss, chasing a win, or thinking you are due is feeding the house. The heater feels like it will keep hitting. You sign so the stack cannot go back on the table until time is up.

**AutoVault** skims a win into the casino’s own vault on Stake.us and nuts.gg only. Dashboard owns the rule. The tab presses the vault button. That is a different product and a different module.

## Above the fold

```
BrandTagline
H1 (two lines)
Kicker (feeding the house)
Subhead (brakes + Cooldown why + sus lookup + no keys)
[ DON'T FEED THE HOUSE ]  [ IS THIS CASINO SUS? ]
How the Chrome brakes work  (text)
Fine print
                    | HUD: 2s frozen spin, blocked-game chip, signed Cooldown timer
```

HUD is decorative. Not a live wallet, not a live lock check, not a chat.

## Below the fold

### How it works

1. **Look up the house** — Trust scores are receipts (payout stories, licenses, scam reports), not a vibe rank.
2. **Don't feed it** — Sign a Cooldown. The win stays off the table until the timer ends. Stronger locks only. You sign. We never hold keys. Casinos do not have to honor it. You do.
3. **Slow the next click** — Chrome on the casino tab. After a spin, the bet button is dead for two seconds. Games you name stop clicking. Zip is not on this site. Devs load unpacked dist.

### AutoVault module

Headline: AutoVault — skim the win on the sites we actually support.

Body: Stake.us and nuts.gg only. Dashboard owns the rule. The tab presses the vault button so the hit is not sitting in playable balance. Not every casino.

CTA: `/tools/auto-vault`

### Honesty tape

- Live in this browser: casino lookup, Discord tools, Cooldown on Solana devnet. Mainnet later.
- Chrome zip is not here and not in the Web Store.
- Browser filters are your list. Not operator self-exclusion. Turn the extension off and play continues.
- AutoVault is two casinos. We do not fake a vault button everywhere.

No lounge sentence on this page.

## Visual

- Layout: copy left, HUD right. Mobile: HUD under buttons, CTAs full width stacked.
- HUD pieces: frozen spin + 2s count, one blocked-game chip, Cooldown timer labeled as signed / devnet.
- Motion: one page-load (copy rises, HUD slides). `prefers-reduced-motion: reduce` disables it.
- Kill existing `pit-*` class names and ticket/perforation styles if present. Replace with HUD names (`landing-hud`, `landing-hero`, etc.).
- Pages CSS must not stroke the H1 into invisibility on a dark void. Glitter or equivalent texture on Pages so live matches local.

## Files

| File | Change |
| :--- | :--- |
| `apps/web/src/lib/home-launch-copy.ts` | Locked copy. `secondaryCtas` is exactly two buttons (Cooldown, sus). Add `tertiaryLink` for extension (not a `btn`). AutoVault blurb. No weasel. No lounge. |
| `apps/web/src/lib/site-copy.ts` | SEO/one-liner stay brakes-aligned; no self-exclusion |
| `apps/web/src/app/page.tsx` | ATF + how-it-works + AutoVault module + honesty. No GatedZipCta. |
| `apps/web/src/app/layout.tsx` | Display + body font variables for landing |
| `apps/web/src/app/globals.css` | HUD layout. Remove pit/ticket. Readable H1. Lighter overlay when `.landing-page` is present. |
| `scripts/pages-product-data.mjs` | Same strings as `HOME_LAUNCH` |
| `scripts/convert-markdown.js` | Same DOM structure as `page.tsx` |
| `scripts/pages-assets/styles/base.css` | HUD + fonts + glitter/readability |
| Tests | `home-launch-copy.test.ts`, `page-launch.test.ts`, `tests/pages-launch.test.ts` |

## Testing

- Copy tests: kicker exact, primary label `DON'T FEED THE HOUSE`, href `/cooldown`, no `weasel`, no `self-exclusion`, no lounge/tip strings on home source, zip still gated, AutoVault names Stake.us and nuts.gg.
- Page source: two hero buttons, tertiary is not `className="btn"`, funnel attrs on both buttons, `id="install"` kept on how-it-works, no `GatedZipCta`.
- Pages twin: same labels, Cooldown URL absolute to tiltcheck.me, extension link relative `extension.html`, no zip download while gated.
- Browser (local `:3001`): H1 readable, both CTAs navigate, AutoVault module visible after scroll, no chat UI, mobile stacked CTAs.
- Pages twin is not live until `main` + `pages.yml`.

## Risks

| Risk | Mitigation |
| :--- | :--- |
| CTA sounds like we send money | Fine print: you sign a Cooldown. We never hold keys. AutoVault is a separate module. |
| “Feed the house” reads as casino | Subhead says brakes. HUD is a frozen spin, not a bet ticket. |
| Lounge looks live | Not on the page. |
| AutoVault = all casinos | Always name Stake.us + nuts.gg. |
| Live site unchanged | Pages twin in the same change; ship is a `main` push, called out, not silent. |
| Pit CSS leftover | Delete/replace in the same homepage change. |

## Rollback

Revert the listed files. Inner product routes (`/cooldown`, `/intel/rtp`, `/extension`, `/tools/auto-vault`) are unchanged by this spec except inbound labels.

## Out of scope ship list (not this spec)

- Push to `main` / Pages deploy (founder trigger).
- Making Degen Lounge public.
- EXT-1–3 (Guards / chicken / spin-brake). Zip stays gated until those land.
