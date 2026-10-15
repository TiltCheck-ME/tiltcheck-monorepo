<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-14 -->

# Pages landing clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make live GitHub Pages `tiltcheck.me` scannable (punch + cards + three honesty bullets), keep **wen**, and give `/cooldown` and `/extension` real static pages instead of a 404 and a home redirect.

**Architecture:** Live copy lives in `scripts/pages-product-data.mjs`. `scripts/convert-markdown.js` emits `index.html`, `cooldown/index.html`, and `extension/index.html`. CSS in `scripts/pages-assets/styles/base.css`. `apps/web` `HOME_LAUNCH` stays in lockstep for local Next.js only. Do not deploy Railway `web`.

**Tech Stack:** Node ESM Pages builder, static HTML/CSS, Vitest source scans, Next.js local twin.

**Spec:** `docs/superpowers/specs/2026-10-14-pages-landing-clarity-design.md` (founder-approved 2026-10-14).

## File map

| File | Responsibility |
| :--- | :--- |
| `scripts/pages-product-data.mjs` | Live copy, CTAs, cards, honesty, cooldown/extension page copy |
| `scripts/convert-markdown.js` | HTML for home, cooldown, extension; nav; stop home-redirect on extension |
| `scripts/pages-assets/styles/base.css` | Hero stack, wen, privacy caption, section gap |
| `tests/pages-launch.test.ts` | Copy + builder source contracts |
| `apps/web/src/lib/home-launch-copy.ts` | Local Next twin of the same copy |
| `apps/web/src/app/page.tsx` | Local home layout lockstep |
| `apps/web/src/components/GatedZipCta.tsx` | Gated zip; Cooldown is the filled primary |
| `apps/web/src/app/globals.css` | Same hero stack classes for local |
| `apps/web/src/app/extension/page.tsx` | Local extension twin |
| `CHANGELOG.md` | Unreleased note |

Do not invent a Cooldown signing form. Do not flip `CTA_READY`. Discard any in-progress hero **lede** blob — spec says no long lede.

## Global Constraints

- Public host is GitHub Pages, not Railway.
- H1 stays `House always wins?` / `FUCK THAT.`
- Keep **wen**: hero `Wen mainnet? soon.` and `#install` title `Wen zip`.
- No long hero lede. Product facts live in three cards only.
- Cooldown button is the real primary. Zip is gated. Extension is secondary.
- Zip stays `ZIP DROPS SOON™` until `CTA_READY === true`.
- Write `cooldown/index.html` and `extension/index.html`. `extension.html` must not redirect home.
- Honesty is exactly three bullets. Kill the live-stack card.
- No wallet form on `/cooldown`. No custody. No `@solana/pay` 1.x. No emojis.
- Copyright on touched files: `© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-14`.
- Footer keeps 1-800-GAMBLER / NCPG and Made for Degens. By Degens.

---

### Task 1: Pages copy constants

**Files:**
- Modify: `scripts/pages-product-data.mjs`
- Modify: `tests/pages-launch.test.ts`

**Interfaces:**

```js
export const SITE_KICKER = [
  'The house banks on your tilt.',
  'Harm reduction made for degens, by degens. Tested tools — not a lecture from your mom.',
  'Cooldown v2: you sign. No keys. Wen mainnet? soon.',
];
export const CTA_READY = false;
export const CTA_GATED_LABEL = 'ZIP DROPS SOON™';
export const CTA_GATED_HINT = 'Zip is not public yet. Cooldown is the lock that ships today.';
export const SECONDARY_CTAS = [
  { label: 'SET A COOLDOWN LOCK', href: '/cooldown', primary: true },
  { label: 'EXTENSION DETAILS', href: '/extension', primary: false },
];
export const INSTALL_STEPS = [
  'Zip is not public. soon™. Do not hunt a sideload.',
  'When it drops: Load unpacked in chrome://extensions.',
  'Core is a 2s spin lock. Touch Grass is Pro.',
];
export const LAUNCH_CARDS = [
  { step: '01', title: 'Cooldown', body: 'On-chain lock you sign. No cancel in v1. Devnet.' },
  { step: '02', title: 'Session intel', body: '2s spin lock on supported tabs when the zip drops. Touch Grass is Pro.' },
  { step: '03', title: 'Trust receipts', body: 'Public RTP, filings, payout evidence. Not a casino-sponsored grade.' },
];
export const LAUNCH_HONESTY = [
  'Cooldown is Solana devnet. Not mainnet.',
  'Zip is not public. Core is 2s. Touch Grass is Pro. No Chrome Web Store.',
  'Trust scores use live feeds when the API is up. Curated baselines when it is not.',
];
export const COOLDOWN_PAGE = {
  eyebrow: 'Cooldown',
  title: 'On-chain lock. You sign. We never hold keys.',
  lede: 'Self-exclusion you cannot weasel off in a settings menu. v1 has no cancel. Devnet. Wen mainnet? soon.',
  canLock: 'Lock everything, a category, or one game. Stronger only.',
  notThis: [
    'Not a form on this page.',
    'Not custody. We never hold keys.',
    'Not a casino RG checkbox.',
  ],
};
export const EXTENSION_PAGE = {
  eyebrow: 'Browser extension // Core',
  title: 'Session intel in the tab. Two-second spin lock.',
  beats: [
    { title: 'Watches the tab', body: 'Read-only signals on supported casino tabs. Click pacing, not wallet keys.' },
    { title: '2s spin lock', body: 'Core locks the spin button for two seconds. A click during the lock does not spin.' },
    { title: 'Not the Pro HUD', body: 'Fullscreen Touch Grass is Pro. This zip does not turn that on.' },
  ],
  honesty: [
    'Not on the Chrome Web Store.',
    'Zip is not public yet — soon™.',
    'No wallet keys. No casino passwords.',
  ],
};
```

Delete `SITE_LEDE` from the landing (or leave unused). Do not export a hero lede paragraph. Delete `LAUNCH_MOCK` if nothing else uses it. `SITE_PRIVACY` is `'No wallet keys. No casino passwords.'` Keep `INSTALL_NOTE` unused on home (spec: no extra paragraph under Wen zip).

- [ ] **Step 1: Write the failing test**

Replace `tests/pages-launch.test.ts` with:

```ts
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-14
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CTA_GATED_HINT,
  CTA_READY,
  LAUNCH_CARDS,
  LAUNCH_HONESTY,
  SECONDARY_CTAS,
  SITE_KICKER,
  SITE_PRIVACY,
} from '../scripts/pages-product-data.mjs';

describe('GitHub Pages launch copy', () => {
  it('keeps the hero punch and wen, without a lede blob', () => {
    expect(SITE_KICKER).toEqual([
      'The house banks on your tilt.',
      'Harm reduction made for degens, by degens. Tested tools — not a lecture from your mom.',
      'Cooldown v2: you sign. No keys. Wen mainnet? soon.',
    ]);
    expect(SITE_PRIVACY).toBe('No wallet keys. No casino passwords.');
    expect(CTA_READY).toBe(false);
    expect(CTA_GATED_HINT).toBe('Zip is not public yet. Cooldown is the lock that ships today.');
  });

  it('makes Cooldown the real primary and Extension a same-origin page', () => {
    expect(SECONDARY_CTAS[0]).toEqual({
      label: 'SET A COOLDOWN LOCK',
      href: '/cooldown',
      primary: true,
    });
    expect(SECONDARY_CTAS[1]).toEqual({
      label: 'EXTENSION DETAILS',
      href: '/extension',
      primary: false,
    });
  });

  it('puts product facts in three short cards and three honesty bullets', () => {
    expect(LAUNCH_CARDS).toHaveLength(3);
    expect(LAUNCH_CARDS[0]?.body).toMatch(/No cancel in v1/);
    expect(LAUNCH_HONESTY).toHaveLength(3);
    expect(LAUNCH_HONESTY.join(' ')).not.toContain('JustTheTip');
    expect(LAUNCH_HONESTY.join(' ')).not.toContain('SusLink');
  });
});

describe('GitHub Pages builder source', () => {
  const source = readFileSync(path.join(process.cwd(), 'scripts/convert-markdown.js'), 'utf8');

  it('writes cooldown and extension index pages and does not retire extension home', () => {
    expect(source).toContain("path.join(siteRoot, 'cooldown')");
    expect(source).toContain("path.join(siteRoot, 'extension')");
    expect(source).toContain('buildCooldownPage()');
    expect(source).toContain('buildExtensionPage()');
    expect(source).not.toContain("retired of ['extension.html'");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/pages-launch.test.ts`

Expected: FAIL on kicker/honesty length and/or builder paths.

- [ ] **Step 3: Write the copy in `scripts/pages-product-data.mjs`**

Stamp `Last Updated: 2026-10-14`. Set the exports in Interfaces. Remove `LAUNCH_MOCK` and any `SITE_LEDE` array/paragraph used as a hero blob. Add `COOLDOWN_PAGE` and `EXTENSION_PAGE`.

Leave the builder `run()` failing the last describe until Task 4. If that last test fails on `buildCooldownPage`, that is expected until Task 4. Split it: **move the builder-source describe into Task 4** if you want this task green. Preferred: keep the builder assertions in Task 4 only.

For Task 1, use only the `GitHub Pages launch copy` describe. Put the builder-source describe in Task 4.

- [ ] **Step 4: Run tests**

Run: `pnpm exec vitest run tests/pages-launch.test.ts`

Expected: PASS for the copy describe.

- [ ] **Step 5: Commit**

```bash
git add scripts/pages-product-data.mjs tests/pages-launch.test.ts
git commit -m "feat(pages): cut landing copy to punch, cards, and three honesty bullets"
```

---

### Task 2: Hero CSS stack

**Files:**
- Modify: `scripts/pages-assets/styles/base.css`
- Modify: `apps/web/src/app/globals.css` (same class names for local twin)

**Interfaces:** classes `landing-hero-stack`, `landing-hero-wen`, `landing-hero-privacy`. Existing `landing-hero-retort` stays mint. `.public-page-section` gets vertical padding so Wen zip / cards / honesty do not smear.

- [ ] **Step 1: Add CSS**

In `scripts/pages-assets/styles/base.css` after `.landing-hero-retort`:

```css
.landing-hero-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
  max-width: 34rem;
  margin: 1.75rem auto 0;
}

.landing-hero-stack .landing-hero-subtitle,
.landing-hero-stack .landing-hero-retort {
  margin: 0;
  text-align: center;
}

.landing-hero-wen {
  margin: 0.9rem 0 0;
  font-family: var(--font-mono);
  font-size: 0.86rem;
  line-height: 1.5;
  letter-spacing: 0.04em;
  color: #17c3b2;
  text-align: center;
}

.landing-hero-privacy {
  margin: 1.1rem auto 0;
  max-width: 28rem;
  font-size: 0.78rem;
  line-height: 1.45;
  color: #5a6472;
  text-align: center;
}

.public-page-section {
  padding: 2.75rem 1.25rem 0;
}
```

Mirror the stack/wen/privacy rules in `apps/web/src/app/globals.css` next to `.landing-hero-retort`.

- [ ] **Step 2: Confirm the class names exist**

Run: `rg "landing-hero-wen" scripts/pages-assets/styles/base.css apps/web/src/app/globals.css`

Expected: matches in both files.

- [ ] **Step 3: Commit**

```bash
git add scripts/pages-assets/styles/base.css apps/web/src/app/globals.css
git commit -m "style(pages): space the hero stack so the punch can breathe"
```

---

### Task 3: Home HTML — punch, buttons, Wen zip, cards

**Files:**
- Modify: `scripts/convert-markdown.js` (`navHtml`, `buildRootLanding`, `kickerHtml`)
- Test: `tests/pages-launch.test.ts` (add a home-source describe)

**Interfaces:**

- `kickerHtml()` emits subtitle / retort / wen classes. No lede/beats.
- `buildRootLanding()` button order: Cooldown primary, then `zipCtaHtml()`, then Extension secondary.
- No live-stack section. No `INSTALL_NOTE` under Wen zip.
- Nav: Cooldown `/cooldown`, Extension `/extension`, Zip soon™ `#install` (or `../index.html#install` at docs depth), Discord.

- [ ] **Step 1: Write the failing test**

Append to `tests/pages-launch.test.ts`:

```ts
describe('GitHub Pages home HTML source', () => {
  const source = readFileSync(path.join(process.cwd(), 'scripts/convert-markdown.js'), 'utf8');

  it('orders Cooldown primary ahead of the gated zip and has no live-stack card', () => {
    expect(source).toContain('landing-hero-wen');
    expect(source).toContain('landing-hero-privacy');
    expect(source).toContain('Wen zip');
    expect(source).not.toContain('Live stack');
    expect(source).not.toContain('LAUNCH_MOCK');
    const cooldownBtn = source.indexOf("SET A COOLDOWN LOCK");
    const zipFn = source.indexOf('zipCtaHtml()');
    expect(cooldownBtn).toBeGreaterThan(-1);
    expect(zipFn).toBeGreaterThan(-1);
  });
});
```

Do not require cooldownBtn < zipFn if both appear in helpers; instead assert `buildRootLanding` contains this exact actions block (see Step 3).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/pages-launch.test.ts`

Expected: FAIL on `landing-hero-wen` or `Wen zip` or live-stack.

- [ ] **Step 3: Implement `buildRootLanding` and nav**

`navHtml`:

```js
function navHtml(depth, current) {
  const installHref = depth === 'root' ? '#install' : '../index.html#install';
  const homeHref = href(depth, 'index.html');
  const cooldownHref = depth === 'root' ? '/cooldown' : '../cooldown/';
  const extensionHref = depth === 'root' ? '/extension' : '../extension/';
  const homeCurrent = current === 'home' ? ' aria-current="page"' : '';

  return `<nav class="site-nav" aria-label="Primary">
  <a class="site-nav__brand" href="${homeHref}"${homeCurrent}><span class="site-nav__mark" aria-hidden="true">TC</span>TiltCheck</a>
  <div class="site-nav__links">
    <a href="${cooldownHref}">Cooldown</a>
    <a href="${extensionHref}">Extension</a>
    <a href="${installHref}">${CTA_READY ? 'Download' : 'Zip soon™'}</a>
    <a href="${DISCORD_URL}" rel="noopener noreferrer">Discord</a>
  </div>
</nav>`;
}
```

`kickerHtml`:

```js
function kickerHtml() {
  const classes = ['landing-hero-subtitle', 'landing-hero-retort', 'landing-hero-wen'];
  return SITE_KICKER.map((line, index) => `<p class="${classes[index]}">${escapeHtml(line)}</p>`).join('\n        ');
}
```

Delete `ledeHtml` if present.

Hero body in `buildRootLanding`:

```html
<div class="landing-hero-stack">
  ${kickerHtml()}
</div>
<div class="hero-actions">
  <a class="btn btn-primary" href="/cooldown">SET A COOLDOWN LOCK</a>
  ${zipCtaHtml()}
  <a class="btn btn-secondary" href="/extension">EXTENSION DETAILS</a>
</div>
<p class="landing-hero-privacy">${escapeHtml(SITE_PRIVACY)}</p>
```

Install card title `Wen zip` when gated. No `INSTALL_NOTE` paragraph. No live-stack section. Cards + honesty stay.

- [ ] **Step 4: Run tests**

Run: `pnpm exec vitest run tests/pages-launch.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/convert-markdown.js tests/pages-launch.test.ts
git commit -m "feat(pages): land punchy home HTML with Cooldown as the real CTA"
```

---

### Task 4: Real `/cooldown` and `/extension` pages

**Files:**
- Modify: `scripts/convert-markdown.js` (`buildCooldownPage`, `buildExtensionPage`, `run`)
- Modify: `tests/pages-launch.test.ts`

**Interfaces:**

```js
function buildCooldownPage(): string
function buildExtensionPage(): string
```

`run()` writes:

```js
const cooldownDir = path.join(siteRoot, 'cooldown');
fs.mkdirSync(cooldownDir, { recursive: true });
fs.writeFileSync(path.join(cooldownDir, 'index.html'), buildCooldownPage());

const extensionDir = path.join(siteRoot, 'extension');
fs.mkdirSync(extensionDir, { recursive: true });
fs.writeFileSync(path.join(extensionDir, 'index.html'), buildExtensionPage());
```

Retired list becomes `['casinos.html', 'tools.html']` only. Optionally write `extension.html` as a redirect to `/extension/`, **not** `./`.

Import `COOLDOWN_PAGE` and `EXTENSION_PAGE` from `pages-product-data.mjs`.

- [ ] **Step 1: Write the failing test**

```ts
describe('GitHub Pages builder source', () => {
  const source = readFileSync(path.join(process.cwd(), 'scripts/convert-markdown.js'), 'utf8');

  it('writes cooldown and extension index pages and does not retire extension home', () => {
    expect(source).toContain("path.join(siteRoot, 'cooldown')");
    expect(source).toContain("path.join(siteRoot, 'extension')");
    expect(source).toContain('buildCooldownPage()');
    expect(source).toContain('buildExtensionPage()');
    expect(source).toContain("retired of ['casinos.html', 'tools.html']");
    expect(source).toContain('COOLDOWN_PAGE');
    expect(source).toContain('On-chain lock. You sign. We never hold keys.');
  });
});
```

The last `toContain` can target `COOLDOWN_PAGE.title` usage instead of the string if the title lives only in data: `expect(source).toContain('COOLDOWN_PAGE.title')`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/pages-launch.test.ts`

Expected: FAIL — `buildCooldownPage` missing; retired list still includes `extension.html`.

- [ ] **Step 3: Implement pages**

`buildCooldownPage`:

```js
function buildCooldownPage() {
  const notThis = COOLDOWN_PAGE.notThis.map((line) => `<li>${escapeHtml(line)}</li>`).join('\n');
  const actions = `
    <a class="btn btn-primary" href="${DISCORD_URL}" rel="noopener noreferrer">JOIN DISCORD</a>
    <a class="btn btn-secondary" href="/">HOME</a>
    <a class="hero-actions__secondary-link" href="/extension">Extension details</a>`;
  const content = `${productHero({
    eyebrow: COOLDOWN_PAGE.eyebrow,
    title: COOLDOWN_PAGE.title,
    lede: COOLDOWN_PAGE.lede,
    actionsHtml: actions,
  })}
<main class="product-main">
  <section class="public-page-section">
    <div class="landing-shell">
      <article class="public-page-card">
        <p class="public-page-card__eyebrow">What you can lock</p>
        <p class="public-page-card__copy">${escapeHtml(COOLDOWN_PAGE.canLock)}</p>
      </article>
      <ul class="public-page-list">${notThis}</ul>
    </div>
  </section>
</main>`;
  return shell({
    title: 'Cooldown | TiltCheck',
    description: COOLDOWN_PAGE.lede,
    depth: 'root',
    current: 'cooldown',
    body: content,
  });
}
```

`buildExtensionPage`: gated zip + link to `/cooldown`. Wen zip steps from `INSTALL_STEPS`. Beats from `EXTENSION_PAGE.beats`. Honesty from `EXTENSION_PAGE.honesty`. No wallet form. Do not link `${SITE_URL}/cooldown`.

In `run()`, write both index files. Change retired to `['casinos.html', 'tools.html']`.

- [ ] **Step 4: Run tests + dry-build**

Run: `pnpm exec vitest run tests/pages-launch.test.ts`

Expected: PASS.

Run: `node scripts/convert-markdown.js docs/tiltcheck out/docs`

Expected: files `out/cooldown/index.html` and `out/extension/index.html` exist. `out/extension.html` is not a home refresh (or does not exist). Grep `out/index.html` for `href="/cooldown"` and `Wen zip`. Do not commit `out/`.

- [ ] **Step 5: Commit**

```bash
git add scripts/convert-markdown.js tests/pages-launch.test.ts
git commit -m "feat(pages): ship static Cooldown explainer and a real Extension page"
```

---

### Task 5: Next.js local twin lockstep

**Files:**
- Modify: `apps/web/src/lib/home-launch-copy.ts`
- Modify: `apps/web/src/lib/home-launch-copy.test.ts`
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/components/GatedZipCta.tsx`
- Modify: `apps/web/src/app/extension/page.tsx`

**Interfaces:** `HOME_LAUNCH` matches Pages copy. No `lede` blob on home. Button order: Cooldown, gated zip, Extension. `ctaGatedHint` matches Pages. `GatedZipCta` uses `btn-secondary btn-disabled` so Cooldown stays the filled primary.

- [ ] **Step 1: Write the failing test**

In `home-launch-copy.test.ts`:

```ts
it('matches the Pages punch and does not restack product facts in a lede', () => {
  expect(HOME_LAUNCH.kicker[2]).toContain('Wen mainnet');
  expect(HOME_LAUNCH.privacy).toBe('No wallet keys. No casino passwords.');
  expect(HOME_LAUNCH.honesty).toHaveLength(3);
  expect(HOME_LAUNCH.secondaryCtas[0]).toEqual({ label: 'SET A COOLDOWN LOCK', href: '/cooldown' });
  expect(Object.prototype.hasOwnProperty.call(HOME_LAUNCH, 'lede')).toBe(false);
});
```

If you keep `lede` as unused, instead `expect(HOME_LAUNCH).not.toHaveProperty('lede')` after deleting it.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/src/lib/home-launch-copy.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement lockstep**

Set `HOME_LAUNCH` fields to the same strings as Task 1. Delete `lede`. `page.tsx` hero:

```tsx
<div className="landing-hero-stack">
  <p className="landing-hero-subtitle">{HOME_LAUNCH.kicker[0]}</p>
  <p className="landing-hero-retort">{HOME_LAUNCH.kicker[1]}</p>
  <p className="landing-hero-wen">{HOME_LAUNCH.kicker[2]}</p>
</div>
<div className="hero-actions">
  <Link href="/cooldown" className="btn btn-primary" data-funnel-event="landing_secondary_click" data-funnel-source="web-home-hero" data-funnel-label="SET A COOLDOWN LOCK">
    SET A COOLDOWN LOCK
  </Link>
  <GatedZipCta funnelEvent="landing_install_click" funnelSource="web-home-hero" />
  <Link href="/extension" className="btn btn-secondary" data-funnel-event="landing_secondary_click" data-funnel-source="web-home-hero" data-funnel-label="EXTENSION DETAILS">
    EXTENSION DETAILS
  </Link>
</div>
<p className="landing-hero-privacy">{HOME_LAUNCH.privacy}</p>
```

No live-stack block. Wen zip without `installNote`. Cards + three honesty bullets.

`GatedZipCta` disabled class: `btn btn-secondary btn-disabled`.

`extension/page.tsx`: same title/beats/honesty as `EXTENSION_PAGE`; zip gated; Cooldown → `/cooldown`.

- [ ] **Step 4: Run tests**

Run: `pnpm exec vitest run apps/web/src/lib/home-launch-copy.test.ts apps/web/src/app/page-launch.test.ts tests/pages-launch.test.ts`

Expected: PASS. Update `page-launch.test.ts` if it still looks for a lede or zip-first CTA.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/home-launch-copy.ts apps/web/src/lib/home-launch-copy.test.ts apps/web/src/app/page.tsx apps/web/src/app/page-launch.test.ts apps/web/src/components/GatedZipCta.tsx apps/web/src/app/extension/page.tsx
git commit -m "fix(web): lockstep local home with the Pages punch and Cooldown-first CTAs"
```

---

### Task 6: Changelog

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `docs/superpowers/specs/2026-10-14-pages-landing-clarity-design.md` (Status: Approved)

- [ ] **Step 1: Changelog line**

Under `[Unreleased] — 2026-10-14` Changed:

```
- Pages landing is punch + three cards + three honesty bullets. Wen stays. `/cooldown` is a static explainer. `/extension` is a real page, not a home redirect.
```

Set spec Status to `Approved (founder 2026-10-14)`.

- [ ] **Step 2: Commit**

```bash
git add CHANGELOG.md docs/superpowers/specs/2026-10-14-pages-landing-clarity-design.md
git commit -m "docs: log Pages landing clarity and mark the spec approved"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
| :--- | :--- |
| Cut repeats / keep bones | 1, 3 |
| H1 + three punch lines + wen | 1, 3, 5 |
| No long lede | 1, 3, 5 |
| Cooldown primary, zip gated, extension secondary | 3, 5 |
| Wen zip three steps, no extra note | 1, 3 |
| Three short cards | 1, 3 |
| Kill live stack | 3, 5 |
| Honesty length 3 | 1, 5 |
| `/cooldown` static explainer | 4 |
| `/extension` real page, not home redirect | 4 |
| Nav Cooldown / Extension / Zip soon | 3 |
| Hero CSS gaps, mint retort, mono wen | 2 |
| Pages is live, not Railway | Global + 6 |
| Next.js lockstep | 5 |
| Tests | 1, 3, 4, 5 |
| Changelog | 6 |

No placeholders. No signing UI. No `CTA_READY` flip.
