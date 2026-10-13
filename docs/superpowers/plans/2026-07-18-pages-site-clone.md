# GitHub Pages Site Clone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make GitHub Pages `/` a static visual twin of the tiltcheck.me homepage with locked hero line `House always wins? FUCK THAT.`, product CTAs to live URLs, and specs only under `/docs`.

**Architecture:** Keep the existing `convert-markdown.js` + `pages-assets` pipeline. Replace `buildRootLanding` with product-landing HTML mirroring `apps/web/src/app/page.tsx`. Expand `base.css` with landing-critical web tokens/classes. Docs pages keep shared product nav + footer but stay doc-layout under `/docs`.

**Tech Stack:** Node ESM script (no deps), static HTML/CSS, GitHub Pages via `.github/workflows/pages.yml`, Google Fonts (Inter + JetBrains Mono).

**Spec:** [docs/superpowers/specs/2026-07-18-pages-site-clone-design.md](../specs/2026-07-18-pages-site-clone-design.md)

## Global Constraints

- Copyright header on every new/modified file: `© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18`
- No emojis in code, comments, or docs
- User-facing footer must include: `Made for Degens. By Degens.`
- Hero headline verbatim: `House always wins? FUCK THAT.`
- Relative asset paths only (project Pages base path `/tiltcheck-monorepo/`)
- Atomic docs: update `docs/GITHUB-PAGES-TROUBLESHOOTING.md` with landing changes
- CTAs leave to live `https://tiltcheck.me/*` — no fake app routes on Pages
- Specs must not appear in the first viewport

## File map

| Path | Responsibility |
|------|----------------|
| `scripts/pages-assets/styles/base.css` | Brand tokens + landing + shared nav/footer + doc chrome |
| `scripts/convert-markdown.js` | Generate root product landing + `/docs/*` HTML |
| `docs/GITHUB-PAGES-TROUBLESHOOTING.md` | Path table / verification notes for the clone |
| `docs/superpowers/plans/2026-07-18-pages-site-clone.md` | This plan |

---

### Task 1: Product landing CSS (web twin)

**Files:**
- Modify: `scripts/pages-assets/styles/base.css`

**Interfaces:**
- Produces CSS classes used by Task 2 HTML:
  - `.landing-page`, `.hero-surface`, `.landing-shell`, `.landing-hero-centered`
  - `.brand-wordmark`, `.brand-eyebrow`, `.landing-hero-title`, `.landing-hero-subtitle`
  - `.hero-actions`, `.btn`, `.btn-primary`, `.hero-actions__secondary-link`
  - `.public-page-section`, `.public-page-section-heading`, `.public-page-grid--3`
  - `.public-page-card`, `.public-page-card__eyebrow`, `.public-page-card__title`, `.public-page-card__copy`
  - `.site-nav`, `.site-footer` (product nav, not docs-first)

- [ ] **Step 1: Rewrite `base.css` for product landing**

Replace the current docs-mini-landing styles with web-aligned tokens and landing structure. Keep doc page styles (`.doc-hero`, `.doc-main`, `.spec-list`) for `/docs` only.

Required token values:

```css
--color-primary: #17c3b2;
--bg-primary: #06080b;
--text-secondary: #c4ced8;
--border-default: #283347;
--font-sans: "Inter", ...;
--font-mono: "JetBrains Mono", ...;
```

Hero title must be large display type (clamp ~3rem–5.5rem), uppercase stroke/shadow treatment matching web. First viewport: full-bleed atmosphere, no cards in hero. Include 2–3 motions (rise-in, grain drift, CTA hover) with `prefers-reduced-motion` kill switch.

- [ ] **Step 2: Smoke-check CSS file**

Run: `rg -n "House|landing-hero-title|17c3b2|Made for Degens|doc-hero" scripts/pages-assets/styles/base.css | head`
Expected: tokens + landing + doc chrome selectors present; no `#00d4aa`.

- [ ] **Step 3: Commit**

```bash
git add scripts/pages-assets/styles/base.css
git commit -m "feat(pages): product landing CSS twin for tiltcheck.me"
```

---

### Task 2: Root HTML generator = product home

**Files:**
- Modify: `scripts/convert-markdown.js`

**Interfaces:**
- Consumes CSS classes from Task 1
- Produces:
  - `buildRootLanding()` → product home HTML written to site root `index.html`
  - Shared `navHtml(depth, current)` with product links (Extension, Casinos, Discord)
  - Docs builders unchanged in purpose (`buildPage`, `buildIndexPage`) but share product nav

Locked copy constants:

```js
const SITE_HERO_HEADLINE = 'House always wins? FUCK THAT.';
const SITE_ONE_LINER =
  'Read-only browser guardrail. Watches pacing and tilt in real time — pulls you out before you rug yourself.';
const SITE_URL = 'https://tiltcheck.me';
const EXTENSION_URL = `${SITE_URL}/extension`;
const CASINOS_URL = `${SITE_URL}/casinos`;
const OPERATORS_URL = `${SITE_URL}/operators`;
const DISCORD_URL = 'https://discord.gg/gdBsEJfCar';
```

`coreJobs` must match `apps/web/src/app/page.tsx`:

```js
const CORE_JOBS = [
  { step: '01', title: 'Kill the Auto-Pilot', description: 'Tracks click-speed and bet pacing. Wakes you up when you play like a bot.' },
  { step: '02', title: 'Read the Room', description: 'Flags sus pacing and pressure loops while you are still in the session.' },
  { step: '03', title: 'Enforce the Exit', description: 'Set your line. We enforce it — not passive warnings.' },
];
```

- [ ] **Step 1: Rewrite `buildRootLanding` (no specs in hero)**

Root body structure:

1. `site-nav` — brand → `index.html`; links: Extension, Casinos, Discord; optional Support
2. `main.landing-page`
   - `section.hero-surface` — brand wordmark/eyebrow, locked H1, one-liner, two CTAs
   - `section` three jobs grid
   - `section` operator block (static bullets + GET SANDBOX ACCESS → operators URL)
   - RG disclaimer section
3. `site-footer` — Made for Degens. By Degens. + copyright + quiet Specs link to `docs/index.html`

Remove from root: “Docs mirror”, “Specs without Railway”, top-of-page specs list.

- [ ] **Step 2: Align shared nav for docs depth**

For `depth === 'docs'`, Extension/Casinos still go to absolute tiltcheck.me URLs; Specs → `index.html` with `aria-current` when on docs; brand → `../index.html`.

- [ ] **Step 3: Build and assert**

Run:

```bash
pnpm docs:pages
rg -n "House always wins\? FUCK THAT\.|INSTALL THE EXTENSION|CHECK CASINO TRUST|Docs mirror|STOP GIVING" out/index.html
```

Expected:
- Headline present
- Both product CTAs present
- `Docs mirror` / `STOP GIVING` absent from root
- Footer tag present

Also:

```bash
rg -n 'href="/|src="/' out/index.html out/docs/index.html || true
```

Expected: no absolute root asset hrefs.

- [ ] **Step 4: Commit**

```bash
git add scripts/convert-markdown.js
git commit -m "feat(pages): static twin home with locked FUCK THAT hero"
```

---

### Task 3: Docs + verify + PR

**Files:**
- Modify: `docs/GITHUB-PAGES-TROUBLESHOOTING.md`

- [ ] **Step 1: Update troubleshooting path table**

Document:
- `/` = product landing clone (not redirect, not specs-first)
- Hero line locked
- CTAs to live tiltcheck.me
- `/docs` = specs secondary
- Relative paths note retained

- [ ] **Step 2: Local visual check**

```bash
python3 -m http.server 8765 --directory out
# browser: http://127.0.0.1:8765/ — product first viewport
# browser: http://127.0.0.1:8765/docs/index.html — specs still work
```

- [ ] **Step 3: Commit, push, update PR #628**

```bash
git add docs/GITHUB-PAGES-TROUBLESHOOTING.md docs/superpowers/plans/2026-07-18-pages-site-clone.md
git commit -m "docs(pages): Pages product-clone troubleshooting + plan"
git push -u origin cursor/pages-tiltcheck-brand-0c5a
```

---

## Spec coverage check

| Spec requirement | Task |
|------------------|------|
| Static twin of home | 1, 2 |
| Locked hero line | 2 |
| SITE_ONE_LINER support | 2 |
| Extension + Casinos CTAs | 2 |
| Three jobs + operator + RG | 2 |
| Specs only under `/docs` | 2, 3 |
| Relative paths | 2 |
| Footer degen line | 2 |
| Troubleshooting atomic docs | 3 |
| No Next export / no fake apps | constrained by design; enforced in Task 2 CTAs |
