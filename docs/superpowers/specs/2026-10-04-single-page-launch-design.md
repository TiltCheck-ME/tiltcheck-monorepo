<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04 -->

# Single-page launch — design spec

Status: Approved (design)  
Owner: founder (solo)  
Surface: `apps/web` public site (`tiltcheck.me`)  
Date: 2026-10-04

## Problem

The public site sells four products at once: the extension, casino grades, Instant Redeem, and a tools index. Most of those routes are unfinished or aimed at a different customer. That split stalled the launch. The domain is viewable. The site has to match the zip a stranger actually downloads.

## Mission

Play stays fun. Psychological tactics that push someone to tilt get interrupted. Wins stay won.

The long-term mark is **TiltCheck Approved**: a casino that publishes how games pay and does not push deposits or session length once a player is already cooked. That stamp does not exist yet. This launch does not mention it.

Instant Redeem is back-burnered. It does not appear on the public site.

## What the zip does

Default Core install (`apps/web/public/downloads/tiltcheck-extension.zip`):

1. Counts clicks on a supported casino tab.
2. When clicking gets frantic, covers that tab for about two minutes (`TOUCH_GRASS_DURATION_MS` = 120000). The pause is called Touch Grass. The player cannot dismiss it. When the timer ends, the site comes back.
3. Before a casino-looking URL opens, SusLink may check it. A critical result replaces the tab with the extension warning page. If that check is down, the link opens normally.

Supported tabs, from the extension manifest: Stake, Stake.us, Roobet, BC.Game, Rollbit, Shuffle, Gamdom, CSGOEmpire.

Pro (spin reading, session return, seed paste, analyzer socket) loads only when `tiltcheck_pro_monolith_enabled` is true in extension storage. A normal sideload does not set that flag. This launch does not turn Pro on and does not describe it on the public site.

There is no published-RTP comparison and no watcher for the casino's code or network failures.

## Goals

- `tiltcheck.me` has one marketing page: `/`.
- A cold visitor can tell what the add-on does: it counts clicks and covers the tab.
- The only marketing action is downloading the zip.
- Old product URLs temporarily redirect home.
- Legal, account, Touch Grass, real intel-share tokens, the zip, and API routes keep working.

## Non-goals

- Turning Pro on, or documenting the Pro flag on the site.
- Deleting old page files. They stay in the repo behind redirects.
- Casino grades, Approved applications, Instant Redeem, operator pricing, tools, blog, docs, Ask Intel index, bonuses, AutoVault setup pages.
- Adding a `/vault` page. The extension already opens `https://tiltcheck.me/vault`, and this app has no such page. This work does not add one.
- Chrome Web Store listing.
- GitHub Pages clone (`docs/superpowers/specs/2026-07-18-pages-site-clone-design.md`).
- Rewriting extension behavior.

## Public page (`/`)

Top to bottom. One primary button.

### Nav

Logo, **Download** (in-page link to `#install`), Discord (`DISCORD_INVITE_URL`), Account (existing login handoff via `getWebLoginRedirect`). Account is not a pitch.

### Hero

- H1, two forced lines: `STOP GIVING` / `WINS BACK.`
- Kicker line 1: `The math isn't rigged. Your dopamine is.`
- Kicker line 2: `The house banks on your tilt.`
- Lede: Download the zip and load it in Chrome. Open a casino you already use. TiltCheck counts clicks on that tab. When the clicking gets frantic, it covers the whole tab for about two minutes so you cannot keep betting. That pause is called Touch Grass. When the timer ends, the site comes back.
- Button label: `DOWNLOAD THE ZIP`
- Button target: `/downloads/tiltcheck-extension.zip` with the `download` attribute.
- Funnel attributes on that button: `data-funnel-event="landing_install_click"`, `data-funnel-source="web-home-hero"`, `data-funnel-label="Download the zip"`.
- Privacy line: Does not read your wallet or your password. No account needed. You install the zip yourself.

No second button. No casino, operator, or tools link in the hero.

### Install (`#install`)

1. Download the zip. Extract it to a folder.
2. Open `chrome://extensions`. Turn on Developer mode. Click Load unpacked. Select that folder.
3. Open a supported casino and play. If the clicking gets frantic, the tab gets covered for about two minutes.

Under the steps: It works without an account. Discord is only for saving rules later.

### Cards

| Step | Title | Line |
|---|---|---|
| 01 | Counts your clicks | On a supported casino tab, it counts every click. It is looking for clicking that has gotten too fast to be a deliberate bet. |
| 02 | Covers the tab | Frantic clicking puts a full-screen pause over the game for about two minutes. That pause is called Touch Grass. You cannot close it early. |
| 03 | Gives the site back | When the timer ends, the casino comes back. You can keep playing, or close the tab. The pause is there so a win does not get clicked away. |

### Session mock

Static block on the page. Not a live extension embed. There is no `LandingSessionMock` component in the repo today; add this block in the homepage (a small component is fine if the page file would get crowded).

- Status: `Counting clicks`
- Signal: `Clicking too fast`
- Footer: `Tab covered · about 2 min`
- Chip: `Does not touch your wallet`

### Honesty

- Works with no account.
- Does not read your password. Does not move money.
- Not in the Chrome Web Store. You load the zip yourself.
- Runs on Stake, Stake.us, Roobet, BC.Game, Rollbit, Shuffle, Gamdom, and CSGOEmpire.
- Some casino links get checked before they open. If the check flags one as a serious scam, that tab goes to a warning page instead. If the check is down, the link opens normally.

### Footer

Privacy, terms, legal, NCPG (`https://www.ncpg.org`) and **1-800-GAMBLER**, plus `BrandTagline`.

Disclaimer copy: TiltCheck is not a casino and not a bank. This is not financial advice. If gambling has stopped being fun, call 1-800-GAMBLER or visit NCPG.org.

Remove the quote rotator, tool groups, intel groups, operator links, Ko-fi, beta-tester, and the second pitch.

## Metadata

`apps/web/src/lib/site-copy.ts` feeds the layout title and description. Update it so shares match this page.

- `SITE_SEO_TITLE`: `TiltCheck | Stop Giving Wins Back`
- The homepage H1 does not print `SITE_HERO_HEADLINE` as one line. It renders two forced lines: `STOP GIVING` and `WINS BACK.`
- `SITE_ONE_LINER` becomes the meta description, not the full on-page lede: `Chrome add-on that counts clicks on casino tabs and covers the tab for about two minutes when clicking gets frantic.`
- On-page kicker and lede live in the homepage, copied from this spec.

## Routes

### Stay (HTTP 200)

| URL | Why |
|---|---|
| `/` | The marketing page |
| `/privacy` | Privacy policy |
| `/terms` | Terms |
| `/legal` | Legal index. Exact path only |
| `/login` | Discord login |
| `/dashboard` | Account handoff |
| `/touch-grass` | Recovery page. Discord command links here |
| `/ask/v/[token]` | Shared intel snapshot. A missing token still 404s |
| `/downloads/tiltcheck-extension.zip` | The file the button downloads. Already present |
| `/api/*` | Existing route handlers, including funnel |
| `/sitemap.xml` | Sitemap |
| `/robots.txt` | Crawler rules |

A path with a file extension is treated as a static file and is not sent home. That covers the zip, icons, and `robots.txt`. The two legacy `.html` URLs below are redirected in `next.config` before this gate. Any other missing file, such as `/not-real.png`, 404s from static serving. Typo paths with no file extension 307 to `/`.

### Redirect to `/` (307 Temporary Redirect)

Every other page path. Temporary, not permanent, so a later Approved directory can return without a cached permanent redirect.

Includes, at minimum:

`/extension`, `/casinos`, `/casinos/[slug]`, `/tools` and every `/tools/*` page, `/stake`, `/nuts`, `/bonuses`, `/intel/rtp`, `/intel/scams`, `/intel/scanner`, `/ask` (the index, not `/ask/v/[token]`), `/operators` and every `/operators/*` page, `/how-it-works`, `/about`, `/getting-started`, `/onboarding`, `/beta-tester`, `/collab`, `/blog` and `/blog/[slug]`, `/docs` and `/docs/[...slug]`, `/microgrant`, `/pay/jackpot`, `/legal/limit`, `/site-map`.

Unknown page paths and typos also 307 to `/`.

`/ask/v/` with no real snapshot is the exception: the page's existing `notFound()` still returns 404.

### Host redirects already in `next.config.mjs`

Leave these in place:

- `hub.tiltcheck.me` still goes to `dashboard.tiltcheck.me`.
- `docs.tiltcheck.me` still rewrites onto `tiltcheck.me/docs/...`, and the new gate then sends `/docs` to `/`.
- `control.tiltcheck.me` still rewrites onto `tiltcheck.me/admin/...`, and the new gate then sends that to `/`.

Point these existing redirects straight at `/` so they do not hop through a page that will only redirect again:

- `/casinos.html` → `/`
- `/tools/auto-vault/install` → `/`

`/hub.html` → `/dashboard` stays. Dashboard remains a real page.

## Implementation shape

One allowlist gate, new middleware in `apps/web`. Do not hand-maintain forty `next.config` redirects for the page list. The gate:

1. Normalizes trailing slashes (except `/`).
2. Lets the request through when the path is an exact stay-list path, starts with `/api/`, `/ask/v/`, `/downloads/`, or `/_next/`, or contains a file extension.
3. Otherwise responds `307` to `/`.

Files to change:

| File | Change |
|---|---|
| `apps/web/src/middleware.ts` | New allowlist gate |
| `apps/web/src/app/page.tsx` | Replace the homepage with the sections above. Remove Instant Redeem and `OperatorBlock` |
| `apps/web/src/components/Nav.tsx` | Download, Discord, Account |
| `apps/web/src/components/Footer.tsx` | Legal, NCPG, tagline |
| `apps/web/src/lib/site-copy.ts` | Title and meta description |
| `apps/web/src/lib/sitemap-entries.ts` | Only the stay pages that are HTML documents: `/`, `/privacy`, `/terms`, `/legal`, `/login`, `/dashboard`, `/touch-grass` |
| `apps/web/src/app/not-found.tsx` | Recovery links: Home, Touch Grass, and the zip. Drop site map, casinos, and bonuses. Discord link uses `DISCORD_INVITE_URL` |
| `apps/web/next.config.mjs` | Retarget `/casinos.html` and `/tools/auto-vault/install` to `/` |
| `docs/migration/tiltcheckmvp-ops/phases.md` | Phase 1 public web set becomes `/` plus legal, with the redirect gate noted. Casino directory is no longer a production marketing route |

Use existing landing and public-page classes in `globals.css`. `BrandTagline` renders the tagline. Copyright header on every modified file, dated 2026-10-04.

Do not add homepage links that the gate will only bounce.

## Failure behavior

- A retired or unknown page path with no file extension returns 307 to `/`.
- A missing static file, such as `/not-real.png`, returns 404. It is not redirected.
- A bad `/ask/v/[token]` returns 404 from the existing page. The 404 screen offers Home, Touch Grass, and the zip.
- The zip path is a static file and must not be redirected. The button is wrong if that file is absent. It is present at `apps/web/public/downloads/tiltcheck-extension.zip`. Do not rebuild the extension in this work.
- Middleware must not catch `/_next` or `/api`. A broken matcher that redirects those is a ship blocker.

## Checks

- Home shows the H1, both kicker lines, the lede, one zip button, install steps, three cards, the session mock, and the scam-link honesty line.
- Nav is Download, Discord, Account.
- Footer has no tools, operators, Instant Redeem, blog, or docs.
- `/casinos`, `/tools`, `/operators`, `/extension`, `/blog`, `/legal/limit`, and `/casinos.html` respond 307 to `/`.
- `/privacy`, `/touch-grass`, `/login`, `/dashboard`, and `/legal` return 200.
- A missing `/ask/v/[token]` returns 404.
- `/downloads/tiltcheck-extension.zip` returns 200 and is not redirected.
- Sitemap XML lists only the stay HTML pages.
- Mobile width: the download button is full width and is the only button in the hero.

## Docs to leave alone

Product honesty audit, Instant Redeem one-pagers, and the GitHub Pages clone spec stay as history. This file is the source of truth for the public site until the implementation lands.
