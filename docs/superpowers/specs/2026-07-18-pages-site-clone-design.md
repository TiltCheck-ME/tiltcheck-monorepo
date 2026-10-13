<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 -->

# GitHub Pages Site Clone — Design Spec

Status: Approved (design)  
Owner: founder (solo)  
Surface: GitHub Pages (`gh-pages` via `.github/workflows/pages.yml`)  
Share URL: `https://tiltcheck-me.github.io/tiltcheck-monorepo/`  
Related: [docs/GITHUB-PAGES-TROUBLESHOOTING.md](../../GITHUB-PAGES-TROUBLESHOOTING.md), `apps/web` landing (`src/app/page.tsx`)

## Problem

The Railway-free share link on GitHub Pages currently reads as a docs/spec shell (nav + spec list + doc chrome). Founder needs a link that **looks like tiltcheck.me** — product landing first — when the app host is down or for quick sharing. Specs can remain available, but they must not define the home experience.

## Goals

- Pages `/` is a static visual twin of the tiltcheck.me homepage composition
- Locked hero headline: **House always wins? FUCK THAT.**
- Brand is hero-level (TILTCHECK), not only nav text
- Primary CTAs point at live product URLs on `tiltcheck.me` (extension, casinos)
- Obsidian + teal brand tokens match web (`#17c3b2`, `#06080b` / `#0a0c10`)
- Footer includes **Made for Degens. By Degens.**
- Specs remain at `/docs/*` as a secondary surface, not the home story
- Relative asset paths so project Pages under `/tiltcheck-monorepo/` resolve

## Non-goals (v1)

- Full Next.js static export of `apps/web`
- Fake dashboard / vault / auth / API routes on Pages
- Hosting interactive Intel/Ask without the API
- Custom domain on `gh-pages` (production hostname stays Railway / future VPS)
- Changing copy on live `tiltcheck.me` in this PR (Pages-only hero line unless founder later ports it)

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Approach | **A** — hand-built static HTML/CSS twin of home |
| Hero headline | `House always wins? FUCK THAT.` (verbatim; supporting one-liner allowed) |
| Supporting lede | Site one-liner from `SITE_ONE_LINER` (read-only guardrail / pacing / tilt) |
| Primary CTA | Install the Extension → `https://tiltcheck.me/extension` |
| Secondary CTA | Check Casino Trust → `https://tiltcheck.me/casinos` |
| Below-fold | Three jobs (“Protect the bankroll”) + static operator block + RG disclaimer |
| Specs | `/docs/*` only; footer link optional; no specs list in first viewport |
| Nav | Product-style: brand, Extension, Casinos, Discord (Support/Ko-fi optional) |
| Fonts | Inter + JetBrains Mono (match web) |
| Deploy | Existing `pages.yml` + `pnpm docs:pages` / converter pipeline |

## Information architecture

```
/                     → product landing clone (this spec)
/styles/base.css      → brand + landing + doc chrome
/docs/index.html      → specs index (secondary)
/docs/*.html          → converted markdown specs
/docs-md/*.md         → raw markdown mirror (unchanged)
```

## Landing composition

### First viewport (hero budget)

Exactly:

1. Brand signal — **TILTCHECK** (wordmark or eyebrow + brand weight matching web)
2. Headline — **House always wins? FUCK THAT.**
3. One short supporting sentence — `SITE_ONE_LINER`
4. CTA group — Install Extension (primary), Check Casino Trust (secondary)
5. Dominant atmosphere — full-bleed obsidian plane with subtle teal/grain (no inset hero cards, no floating badges)

Not in first viewport: specs list, “docs mirror” framing, schedules, stats strips, operator deep-dives.

Eyebrow may use “Built for Degens. By Degens.” to match web `brand-eyebrow` without crowding the brand.

### Below fold

1. **Three jobs** — same copy as `apps/web/src/app/page.tsx` `coreJobs`
2. **Operator block** — static twin of `OperatorBlock` bullets; CTA → `https://tiltcheck.me/operators`
3. **RG disclaimer** — NCPG / 1-800-GAMBLER line (match web)
4. **Footer** — Made for Degens. By Degens. + copyright; optional quiet Specs link

### Motion (2–3 intentional)

- Hero rise/fade-in on load
- Subtle grain or gradient drift in hero atmosphere
- CTA hover lift (match web btn feel)
- Respect `prefers-reduced-motion`

## Technical approach

1. Rewrite root generator in `scripts/convert-markdown.js` from “docs mini-landing” to product landing HTML matching the structure above
2. Expand `scripts/pages-assets/styles/base.css` to mirror web landing tokens/classes closely enough that a side-by-side glance reads as the same site (not a new design system)
3. Keep `buildPage` / `buildIndexPage` for `/docs/*` with shared nav/footer chrome, but doc-first layout only under `/docs`
4. Continue relative hrefs (`styles/base.css`, `docs/...`) — never absolute `/styles/...` on project Pages
5. Update `docs/GITHUB-PAGES-TROUBLESHOOTING.md` atomically

## Success criteria

- [ ] First viewport cannot be mistaken for a docs index after removing the nav
- [ ] Headline string present exactly: `House always wins? FUCK THAT.`
- [ ] CTAs hit live tiltcheck.me product paths
- [ ] Specs not in hero; discoverable via `/docs` or footer
- [ ] `pnpm docs:pages` builds; relative CSS loads under repo base path
- [ ] Footer: Made for Degens. By Degens.
- [ ] No emojis; copyright headers on touched files

## Risks / rollback

| Risk | Mitigation |
|------|------------|
| Visual drift from live Next.js CSS | Port the landing-critical rules; do not try to copy all of `globals.css` |
| Founder expects interactive pages to work on Pages | CTAs leave to tiltcheck.me; no fake apps |
| Pages deploy lag after merge | `pages.yml` path triggers + `workflow_dispatch` |
| Rollback | Revert PR; prior `gh-pages` publish restored by re-run of previous main |

## Out of band (later)

- Port the new hero line onto live `apps/web` if founder wants parity both ways
- VPS/Cloudflare cutover for the real domain (separate from this Pages clone)
