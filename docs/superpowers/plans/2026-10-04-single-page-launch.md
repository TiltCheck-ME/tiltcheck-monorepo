<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04 -->

# Single-Page Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `tiltcheck.me` a one-page sideload pitch for the Core zip, and temporarily send every other marketing page home.

**Architecture:** A pure path gate decides stay versus 307. Next.js middleware calls that gate. Homepage, nav, and footer read locked copy from small modules so tests can assert the words without rendering React. Old page files stay on disk.

**Tech Stack:** Next.js app router (`apps/web`), TypeScript, Vitest from the repo root (`pnpm exec vitest --run <file>`).

## Global Constraints

- Public marketing page is `/` only. Headline lines are `STOP GIVING` and `WINS BACK.`
- Kicker lines are `The math isn't rigged. Your dopamine is.` and `The house banks on your tilt.`
- The zip button label is `DOWNLOAD THE ZIP` and the href is `/downloads/tiltcheck-extension.zip`.
- Core promise is click counting plus a cover of about two minutes (Touch Grass), plus the scam-link honesty line. Pro stays off the page. Do not set `tiltcheck_pro_monolith_enabled`.
- Do not mention Approved, Instant Redeem, casino grades, or AutoVault on `/`, the nav, or the footer.
- Redirects are 307, not 301 or 308.
- Stay paths: `/`, `/privacy`, `/terms`, `/legal`, `/login`, `/dashboard`, `/touch-grass`, `/ask/v` and `/ask/v/*`, `/api` and `/api/*`, `/downloads` and `/downloads/*`, `/_next` and `/_next/*`, `/sitemap.xml`, `/robots.txt`, and any path containing a file extension.
- `/legal/limit` redirects. `/ask` redirects. A missing `/ask/v/[token]` still 404s inside the page.
- Do not delete old page files. Do not add `/vault`. Do not rebuild the extension zip.
- Do not edit the GitHub Pages clone spec or the Instant Redeem product docs.
- Every new or modified file starts with `© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04`.
- UI tagline uses `BrandTagline`. No emoji in code, comments, or docs.
- Spec: `docs/superpowers/specs/2026-10-04-single-page-launch-design.md`.

---

### Task 1: Public route gate

**Files:**
- Create: `apps/web/src/lib/public-route-gate.ts`
- Test: `apps/web/src/lib/public-route-gate.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `decidePublicRoute(pathname: string): { action: 'next' } | { action: 'redirect'; status: 307; destination: '/' }`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/public-route-gate.test.ts`:

```ts
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04
import { describe, expect, it } from 'vitest';
import { decidePublicRoute } from './public-route-gate';

describe('decidePublicRoute', () => {
  it('keeps the launch pages and the zip', () => {
    for (const path of ['/', '/privacy', '/terms', '/legal', '/login', '/dashboard', '/touch-grass', '/sitemap.xml', '/robots.txt', '/downloads/tiltcheck-extension.zip']) {
      expect(decidePublicRoute(path)).toEqual({ action: 'next' });
    }
  });

  it('keeps api, next assets, intel share tokens, and files with an extension', () => {
    for (const path of ['/api/funnel', '/_next/static/chunk.js', '/ask/v/abc', '/icon.png']) {
      expect(decidePublicRoute(path)).toEqual({ action: 'next' });
    }
  });

  it('sends retired marketing paths home with a temporary redirect', () => {
    for (const path of ['/casinos', '/casinos/stake', '/tools', '/tools/auto-vault', '/operators', '/operators/instant-redeem', '/extension', '/blog', '/blog/hello', '/docs', '/legal/limit', '/ask', '/site-map']) {
      expect(decidePublicRoute(path)).toEqual({ action: 'redirect', status: 307, destination: '/' });
    }
  });

  it('ignores a trailing slash and does not treat /legal/limit as /legal', () => {
    expect(decidePublicRoute('/privacy/')).toEqual({ action: 'next' });
    expect(decidePublicRoute('/legal/limit/')).toEqual({ action: 'redirect', status: 307, destination: '/' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest --run apps/web/src/lib/public-route-gate.test.ts`

Expected: FAIL. Cannot find module `./public-route-gate`.

- [ ] **Step 3: Write the gate**

Create `apps/web/src/lib/public-route-gate.ts`:

```ts
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04

export type PublicRouteDecision =
  | { action: 'next' }
  | { action: 'redirect'; status: 307; destination: '/' };

const STAY_EXACT = new Set([
  '/',
  '/privacy',
  '/terms',
  '/legal',
  '/login',
  '/dashboard',
  '/touch-grass',
  '/sitemap.xml',
  '/robots.txt',
]);

export function normalizePublicPath(pathname: string): string {
  const withoutSuffix = pathname.split('?')[0]?.split('#')[0] ?? '/';
  if (withoutSuffix === '/') return '/';
  const trimmed = withoutSuffix.endsWith('/') ? withoutSuffix.slice(0, -1) : withoutSuffix;
  return trimmed.length > 0 ? trimmed : '/';
}

function hasFileExtension(pathname: string): boolean {
  const last = pathname.split('/').pop() ?? '';
  return last.includes('.');
}

export function decidePublicRoute(pathname: string): PublicRouteDecision {
  const path = normalizePublicPath(pathname);
  if (STAY_EXACT.has(path)) return { action: 'next' };
  if (path === '/api' || path.startsWith('/api/')) return { action: 'next' };
  if (path === '/ask/v' || path.startsWith('/ask/v/')) return { action: 'next' };
  if (path === '/downloads' || path.startsWith('/downloads/')) return { action: 'next' };
  if (path === '/_next' || path.startsWith('/_next/')) return { action: 'next' };
  if (hasFileExtension(path)) return { action: 'next' };
  return { action: 'redirect', status: 307, destination: '/' };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest --run apps/web/src/lib/public-route-gate.test.ts`

Expected: PASS. 4 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/public-route-gate.ts apps/web/src/lib/public-route-gate.test.ts
git commit -m "feat: add temporary redirect gate for retired marketing routes"
```

---

### Task 2: Wire the gate into middleware

**Files:**
- Create: `apps/web/src/middleware.ts`
- Test: `apps/web/src/middleware.test.ts`

**Interfaces:**
- Consumes: `decidePublicRoute` from `apps/web/src/lib/public-route-gate.ts`
- Produces: Next.js `middleware` that 307s to `/` when the gate says redirect

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/middleware.test.ts`:

```ts
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('middleware source', () => {
  const source = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'middleware.ts'), 'utf8');

  it('calls the route gate and redirects with 307', () => {
    expect(source).toContain('decidePublicRoute');
    expect(source).toContain('307');
    expect(source).not.toContain('308');
    expect(source).not.toContain('permanent: true');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest --run apps/web/src/middleware.test.ts`

Expected: FAIL. `middleware.ts` does not exist.

- [ ] **Step 3: Write middleware**

Create `apps/web/src/middleware.ts`:

```ts
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decidePublicRoute } from '@/lib/public-route-gate';

export function middleware(request: NextRequest) {
  const decision = decidePublicRoute(request.nextUrl.pathname);
  if (decision.action === 'redirect') {
    const url = request.nextUrl.clone();
    url.pathname = decision.destination;
    url.search = '';
    return NextResponse.redirect(url, decision.status);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest --run apps/web/src/middleware.test.ts apps/web/src/lib/public-route-gate.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/middleware.ts apps/web/src/middleware.test.ts
git commit -m "feat: redirect retired public routes to the homepage"
```

---

### Task 3: Legacy HTML redirects

**Files:**
- Modify: `apps/web/next.config.mjs`
- Test: `apps/web/src/lib/legacy-redirects.test.ts`

**Interfaces:**
- Consumes: nothing from the gate. These redirects run before middleware.
- Produces: `/casinos.html` and `/tools/auto-vault/install` destinations equal to `/`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/legacy-redirects.test.ts`:

```ts
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

function destinationFor(source: string, config: string): string | undefined {
  const pattern = new RegExp(`source: '${source.replaceAll('/', '\\/')}'[\\s\\S]*?destination: '([^']+)'`);
  return config.match(pattern)?.[1];
}

describe('legacy redirects', () => {
  const config = readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../next.config.mjs'),
    'utf8',
  );

  it('sends leftover html and autovault install straight home', () => {
    expect(destinationFor('/casinos.html', config)).toBe('/');
    expect(destinationFor('/tools/auto-vault/install', config)).toBe('/');
  });

  it('keeps the hub handoff on the dashboard', () => {
    expect(destinationFor('/hub.html', config)).toBe('/dashboard');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest --run apps/web/src/lib/legacy-redirects.test.ts`

Expected: FAIL. `/casinos.html` destination is `/casinos`. `/tools/auto-vault/install` destination is `/tools/auto-vault/android`.

- [ ] **Step 3: Retarget the two redirects**

In `apps/web/next.config.mjs`, change the `/casinos.html` destination from `/casinos` to `/`.

Change the `/tools/auto-vault/install` destination from `/tools/auto-vault/android` to `/`.

Leave the `hub.tiltcheck.me`, `docs.tiltcheck.me`, `control.tiltcheck.me`, and `/hub.html` blocks as they are.

Update the copyright line at the top of `next.config.mjs` to `Last Updated: 2026-10-04`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest --run apps/web/src/lib/legacy-redirects.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/next.config.mjs apps/web/src/lib/legacy-redirects.test.ts
git commit -m "fix: send legacy casino and autovault urls to the homepage"
```

---

### Task 4: Locked homepage copy

**Files:**
- Create: `apps/web/src/lib/home-launch-copy.ts`
- Modify: `apps/web/src/lib/site-copy.ts`
- Test: `apps/web/src/lib/home-launch-copy.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `HOME_LAUNCH` object and updated `SITE_SEO_TITLE` / `SITE_ONE_LINER`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/home-launch-copy.test.ts`:

```ts
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04
import { describe, expect, it } from 'vitest';
import { HOME_LAUNCH } from './home-launch-copy';
import { SITE_ONE_LINER, SITE_SEO_TITLE } from './site-copy';

describe('HOME_LAUNCH', () => {
  it('uses the locked headline, kicker, and zip button', () => {
    expect(HOME_LAUNCH.h1).toEqual(['STOP GIVING', 'WINS BACK.']);
    expect(HOME_LAUNCH.kicker).toEqual([
      "The math isn't rigged. Your dopamine is.",
      'The house banks on your tilt.',
    ]);
    expect(HOME_LAUNCH.ctaLabel).toBe('DOWNLOAD THE ZIP');
    expect(HOME_LAUNCH.ctaHref).toBe('/downloads/tiltcheck-extension.zip');
  });

  it('explains the click cover and the scam-link check', () => {
    expect(HOME_LAUNCH.lede).toContain('counts clicks');
    expect(HOME_LAUNCH.lede).toContain('Touch Grass');
    expect(HOME_LAUNCH.cards.map((card) => card.title)).toEqual([
      'Counts your clicks',
      'Covers the tab',
      'Gives the site back',
    ]);
    expect(HOME_LAUNCH.honesty.join(' ')).toContain('serious scam');
    expect(HOME_LAUNCH.honesty.join(' ')).not.toContain('Approved');
    expect(HOME_LAUNCH.honesty.join(' ')).not.toContain('Instant Redeem');
  });

  it('sets the share title and a short meta description', () => {
    expect(SITE_SEO_TITLE).toBe('TiltCheck | Stop Giving Wins Back');
    expect(SITE_ONE_LINER).toBe(
      'Chrome add-on that counts clicks on casino tabs and covers the tab for about two minutes when clicking gets frantic.',
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest --run apps/web/src/lib/home-launch-copy.test.ts`

Expected: FAIL. `home-launch-copy` is missing, and `SITE_SEO_TITLE` is still `TiltCheck | The Degen Audit Layer`.

- [ ] **Step 3: Write the copy modules**

Create `apps/web/src/lib/home-launch-copy.ts`:

```ts
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04

export const HOME_LAUNCH = {
  h1: ['STOP GIVING', 'WINS BACK.'],
  kicker: ["The math isn't rigged. Your dopamine is.", 'The house banks on your tilt.'],
  lede:
    'Download the zip and load it in Chrome. Open a casino you already use. TiltCheck counts clicks on that tab. When the clicking gets frantic, it covers the whole tab for about two minutes so you cannot keep betting. That pause is called Touch Grass. When the timer ends, the site comes back.',
  ctaLabel: 'DOWNLOAD THE ZIP',
  ctaHref: '/downloads/tiltcheck-extension.zip',
  privacy: 'Does not read your wallet or your password. No account needed. You install the zip yourself.',
  installSteps: [
    'Download the zip. Extract it to a folder.',
    'Open chrome://extensions. Turn on Developer mode. Click Load unpacked. Select that folder.',
    'Open a supported casino and play. If the clicking gets frantic, the tab gets covered for about two minutes.',
  ],
  installNote: 'It works without an account. Discord is only for saving rules later.',
  cards: [
    {
      step: '01',
      title: 'Counts your clicks',
      body: 'On a supported casino tab, it counts every click. It is looking for clicking that has gotten too fast to be a deliberate bet.',
    },
    {
      step: '02',
      title: 'Covers the tab',
      body: 'Frantic clicking puts a full-screen pause over the game for about two minutes. That pause is called Touch Grass. You cannot close it early.',
    },
    {
      step: '03',
      title: 'Gives the site back',
      body: 'When the timer ends, the casino comes back. You can keep playing, or close the tab. The pause is there so a win does not get clicked away.',
    },
  ],
  mock: {
    status: 'Counting clicks',
    signal: 'Clicking too fast',
    footer: 'Tab covered · about 2 min',
    chip: 'Does not touch your wallet',
  },
  honesty: [
    'Works with no account.',
    'Does not read your password. Does not move money.',
    'Not in the Chrome Web Store. You load the zip yourself.',
    'Runs on Stake, Stake.us, Roobet, BC.Game, Rollbit, Shuffle, Gamdom, and CSGOEmpire.',
    'Some casino links get checked before they open. If the check flags one as a serious scam, that tab goes to a warning page instead. If the check is down, the link opens normally.',
  ],
  footerDisclaimer:
    'TiltCheck is not a casino and not a bank. This is not financial advice. If gambling has stopped being fun, call 1-800-GAMBLER or visit NCPG.org.',
} as const;
```

Replace the title and one-liner in `apps/web/src/lib/site-copy.ts`. Leave `SITE_BRAND_TAGLINE`. Set:

```ts
export const SITE_SEO_TITLE = 'TiltCheck | Stop Giving Wins Back';

export const SITE_ONE_LINER =
  'Chrome add-on that counts clicks on casino tabs and covers the tab for about two minutes when clicking gets frantic.';

export const SITE_HERO_HEADLINE = 'STOP GIVING WINS BACK.';
```

Update that file's copyright line to `Last Updated: 2026-10-04`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest --run apps/web/src/lib/home-launch-copy.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/home-launch-copy.ts apps/web/src/lib/home-launch-copy.test.ts apps/web/src/lib/site-copy.ts
git commit -m "feat: lock homepage copy to the core zip"
```

---

### Task 5: Homepage

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Test: `apps/web/src/app/page-launch.test.ts`

**Interfaces:**
- Consumes: `HOME_LAUNCH` from `apps/web/src/lib/home-launch-copy.ts`
- Produces: the only marketing page

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/app/page-launch.test.ts`:

```ts
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('homepage source', () => {
  const source = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'page.tsx'), 'utf8');

  it('renders the locked copy and one zip button', () => {
    expect(source).toContain('HOME_LAUNCH');
    expect(source).toContain('id="install"');
    expect(source).toContain('data-funnel-event="landing_install_click"');
    expect(source).toContain('data-funnel-source="web-home-hero"');
    expect(source).toContain('data-funnel-label="Download the zip"');
  });

  it('does not sell the retired products', () => {
    expect(source).not.toContain('Instant Redeem');
    expect(source).not.toContain('OperatorBlock');
    expect(source).not.toContain('href="/casinos"');
    expect(source).not.toContain('href="/tools"');
    expect(source).not.toContain('href="/operators"');
    expect(source).not.toContain('Approved');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest --run apps/web/src/app/page-launch.test.ts`

Expected: FAIL. Current `page.tsx` contains `Instant Redeem` and `OperatorBlock`.

- [ ] **Step 3: Replace the page**

Replace `apps/web/src/app/page.tsx` with:

```tsx
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04
import BrandTagline from '@/components/BrandTagline';
import { HOME_LAUNCH } from '@/lib/home-launch-copy';

export default function Home() {
  return (
    <main className="landing-page">
      <section className="hero-surface">
        <div className="landing-shell landing-hero-centered">
          <span className="brand-eyebrow">
            <BrandTagline compact />
          </span>

          <h1 className="landing-hero-title landing-hero-title--centered">
            {HOME_LAUNCH.h1[0]}
            <br />
            {HOME_LAUNCH.h1[1]}
          </h1>

          <p className="landing-hero-subtitle landing-hero-subtitle--centered">{HOME_LAUNCH.kicker[0]}</p>
          <p className="landing-hero-subtitle landing-hero-subtitle--centered">{HOME_LAUNCH.kicker[1]}</p>

          <p className="landing-hero-subtitle landing-hero-subtitle--centered">{HOME_LAUNCH.lede}</p>

          <div className="hero-actions">
            <a
              href={HOME_LAUNCH.ctaHref}
              download
              className="btn btn-primary"
              data-funnel-event="landing_install_click"
              data-funnel-source="web-home-hero"
              data-funnel-label="Download the zip"
            >
              {HOME_LAUNCH.ctaLabel}
            </a>
          </div>

          <p className="landing-hero-subtitle landing-hero-subtitle--centered">{HOME_LAUNCH.privacy}</p>
        </div>
      </section>

      <section id="install" className="public-page-section px-4">
        <div className="landing-shell">
          <article className="public-page-card">
            <p className="public-page-card__eyebrow">Install</p>
            <h2 className="public-page-card__title">Three steps</h2>
            <ol className="public-page-list">
              {HOME_LAUNCH.installSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="public-page-card__copy">{HOME_LAUNCH.installNote}</p>
          </article>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-grid public-page-grid--3">
            {HOME_LAUNCH.cards.map((card) => (
              <article key={card.step} className="public-page-card">
                <p className="public-page-card__eyebrow">Step {card.step}</p>
                <h3 className="public-page-card__title">{card.title}</h3>
                <p className="public-page-card__copy">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <article className="public-page-card">
            <p className="public-page-card__eyebrow">{HOME_LAUNCH.mock.status}</p>
            <h2 className="public-page-card__title">{HOME_LAUNCH.mock.signal}</h2>
            <p className="public-page-card__copy">{HOME_LAUNCH.mock.footer}</p>
            <p className="public-page-card__copy">{HOME_LAUNCH.mock.chip}</p>
          </article>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <ul className="public-page-list">
            {HOME_LAUNCH.honesty.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </section>

    </main>
  );
}
```

The site footer from Task 7 owns the NCPG line and the tagline. Do not repeat them at the bottom of `page.tsx`.

Kicker and privacy use `landing-hero-subtitle`. Those are classes that already exist. Do not add `landing-hero-kicker__line` or `hero-privacy-guarantee`. They are not in `globals.css`.

Existing CSS already sets `.hero-actions .btn { width: 100%; }` at `max-width: 640px`. Do not add a second hero button.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest --run apps/web/src/app/page-launch.test.ts apps/web/src/lib/home-launch-copy.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/page.tsx apps/web/src/app/page-launch.test.ts
git commit -m "feat: replace the homepage with the zip pitch"
```

---

### Task 6: Nav

**Files:**
- Create: `apps/web/src/lib/public-nav.ts`
- Modify: `apps/web/src/components/Nav.tsx`
- Test: `apps/web/src/lib/public-nav.test.ts`

**Interfaces:**
- Consumes: `DISCORD_INVITE_URL` from `apps/web/src/lib/site-links.ts`
- Produces: `PUBLIC_NAV` with `downloadHref` `/#install` and labels `Download`, `Discord`, `Account`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/public-nav.test.ts`:

```ts
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PUBLIC_NAV } from './public-nav';

describe('PUBLIC_NAV', () => {
  it('offers download, discord, and account', () => {
    expect(PUBLIC_NAV).toEqual({
      downloadHref: '/#install',
      downloadLabel: 'Download',
      discordLabel: 'Discord',
      accountLabel: 'Account',
    });
  });

  it('is the only product link in the nav component', () => {
    const source = readFileSync(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../components/Nav.tsx'),
      'utf8',
    );
    expect(source).toContain('PUBLIC_NAV');
    expect(source).not.toContain("href: '/casinos'");
    expect(source).not.toContain("href: '/tools'");
    expect(source).not.toContain("href: '/operators'");
    expect(source).not.toContain('href="/extension"');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest --run apps/web/src/lib/public-nav.test.ts`

Expected: FAIL. `public-nav` is missing, and `Nav.tsx` still links `/casinos`, `/tools`, `/operators`, and `/extension`.

- [ ] **Step 3: Cut the nav**

Create `apps/web/src/lib/public-nav.ts`:

```ts
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04

export const PUBLIC_NAV = {
  downloadHref: '/#install',
  downloadLabel: 'Download',
  discordLabel: 'Discord',
  accountLabel: 'Account',
} as const;
```

In `apps/web/src/components/Nav.tsx`, update the copyright date to `2026-10-04`. Import `PUBLIC_NAV` from `@/lib/public-nav`. Delete `NavLink`, `NAV_LINKS`, `STACKED_ACCENT_CLASS`, and `DESKTOP_ACCENT_CLASS`.

Logged-out `AuthButton` text, compact and full, is `{PUBLIC_NAV.accountLabel}`. Logged-in compact text stays `Account`. Logged-in full text stays the username.

Replace `DesktopLinks` with:

```tsx
  const DesktopLinks = () => (
    <Link
      href={PUBLIC_NAV.downloadHref}
      className="nav-desktop-link nav-desktop-beta"
      data-funnel-event="nav_install_click"
      data-funnel-source="web-nav-desktop"
      data-funnel-label={PUBLIC_NAV.downloadLabel}
    >
      {PUBLIC_NAV.downloadLabel}
    </Link>
  );
```

Replace `MobileLinks` with:

```tsx
  const MobileLinks = () => (
    <>
      <Link
        href={PUBLIC_NAV.downloadHref}
        onClick={close}
        className="nav-sidebar-link nav-sidebar-beta"
        data-funnel-event="nav_install_click"
        data-funnel-source="web-nav-mobile"
        data-funnel-label={PUBLIC_NAV.downloadLabel}
      >
        {PUBLIC_NAV.downloadLabel}
      </Link>
      <a
        href={DISCORD_INVITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={close}
        className="nav-sidebar-link nav-discord-link"
      >
        <DiscordIcon size={16} />
        {PUBLIC_NAV.discordLabel}
      </a>
    </>
  );
```

Change the desktop Discord anchor children from `JOIN DISCORD` to `{PUBLIC_NAV.discordLabel}`. Leave the icon.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest --run apps/web/src/lib/public-nav.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/public-nav.ts apps/web/src/lib/public-nav.test.ts apps/web/src/components/Nav.tsx
git commit -m "feat: limit the public nav to download, discord, and account"
```

---

### Task 7: Footer

**Files:**
- Create: `apps/web/src/lib/public-footer.ts`
- Modify: `apps/web/src/components/Footer.tsx`
- Test: `apps/web/src/lib/public-footer.test.ts`

**Interfaces:**
- Consumes: `HOME_LAUNCH.footerDisclaimer`
- Produces: `PUBLIC_FOOTER_LINKS` of privacy, terms, and legal only

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/public-footer.test.ts`:

```ts
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PUBLIC_FOOTER_LINKS } from './public-footer';

describe('PUBLIC_FOOTER_LINKS', () => {
  it('lists privacy, terms, and legal', () => {
    expect(PUBLIC_FOOTER_LINKS).toEqual([
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
      { href: '/legal', label: 'Legal' },
    ]);
  });

  it('is what the footer renders', () => {
    const source = readFileSync(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../components/Footer.tsx'),
      'utf8',
    );
    expect(source).toContain('PUBLIC_FOOTER_LINKS');
    expect(source).toContain('BrandTagline');
    expect(source).toContain('https://www.ncpg.org');
    expect(source).toContain('1-800-GAMBLER');
    expect(source).not.toContain('KOFI_URL');
    expect(source).not.toContain('/operators');
    expect(source).not.toContain('/tools');
    expect(source).not.toContain('Instant Redeem');
    expect(source).not.toContain('QUOTES');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest --run apps/web/src/lib/public-footer.test.ts`

Expected: FAIL. Footer still contains `KOFI_URL`, `QUOTES`, and `/operators`.

- [ ] **Step 3: Replace the footer**

Create `apps/web/src/lib/public-footer.ts`:

```ts
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04

export const PUBLIC_FOOTER_LINKS = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/legal', label: 'Legal' },
] as const;
```

Replace `apps/web/src/components/Footer.tsx` with:

```tsx
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04
import Link from 'next/link';
import BrandTagline from '@/components/BrandTagline';
import { HOME_LAUNCH } from '@/lib/home-launch-copy';
import { PUBLIC_FOOTER_LINKS } from '@/lib/public-footer';

const Footer = () => {
  const [beforeHotline, afterHotline] = HOME_LAUNCH.footerDisclaimer.split('1-800-GAMBLER');
  const [beforeNcpg, afterNcpg] = afterHotline.split('NCPG.org');

  return (
    <footer className="site-footer" aria-label="Site footer">
      <div className="footer-shell">
        <div className="footer-bottom">
          <p className="footer-copy">
            {beforeHotline}
            <strong>1-800-GAMBLER</strong>
            {beforeNcpg}
            <a href="https://www.ncpg.org" target="_blank" rel="noopener noreferrer">
              NCPG.org
            </a>
            {afterNcpg}
          </p>
          <div className="footer-bottom-links">
            {PUBLIC_FOOTER_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
          <p className="footer-tagline">
            <BrandTagline />
          </p>
          <p className="footer-copyright">© 2024–2026 TiltCheck Ecosystem. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
```

`footerDisclaimer` is `TiltCheck is not a casino and not a bank. This is not financial advice. If gambling has stopped being fun, call 1-800-GAMBLER or visit NCPG.org.` The splits put the phone number and the NCPG link back in that order.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest --run apps/web/src/lib/public-footer.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/public-footer.ts apps/web/src/lib/public-footer.test.ts apps/web/src/components/Footer.tsx
git commit -m "feat: reduce the footer to legal links and the hotline"
```

---

### Task 8: Sitemap

**Files:**
- Modify: `apps/web/src/lib/sitemap-entries.ts`
- Modify: `apps/web/src/lib/sitemap-entries.test.ts`

**Interfaces:**
- Consumes: stay HTML paths from the spec
- Produces: `SITEMAP_PAGE_ENTRIES` containing only those paths

- [ ] **Step 1: Rewrite the test so the current sitemap fails it**

Replace the body of `describe('sitemap-entries')` in `apps/web/src/lib/sitemap-entries.test.ts`. Delete the filesystem walker. The test becomes:

```ts
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04
import { describe, expect, it } from 'vitest';
import { SITEMAP_PAGE_ENTRIES } from './sitemap-entries';

const STAY_PATHS = ['/', '/privacy', '/terms', '/legal', '/login', '/dashboard', '/touch-grass'];

describe('sitemap-entries', () => {
  it('lists only the pages that stay on the public site', () => {
    expect(SITEMAP_PAGE_ENTRIES.map((entry) => entry.path).sort()).toEqual([...STAY_PATHS].sort());
  });

  it('does not hand the dashboard entry to another host', () => {
    const dashboard = SITEMAP_PAGE_ENTRIES.find((entry) => entry.path === '/dashboard');
    expect(dashboard?.href).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest --run apps/web/src/lib/sitemap-entries.test.ts`

Expected: FAIL. The current array includes `/casinos`, `/tools`, and `/operators/instant-redeem`.

- [ ] **Step 3: Shrink the entries**

In `apps/web/src/lib/sitemap-entries.ts`, replace `SITEMAP_PAGE_ENTRIES` with seven objects, paths exactly `STAY_PATHS`, categories `Core` for `/`, `/login`, `/dashboard`, and `/touch-grass`, and `Legal & RG` for `/privacy`, `/terms`, and `/legal`. Do not set `href` on `/dashboard`. Remove the `getDashboardHandoffUrl` import if nothing else in the file uses it. Update the copyright date to `2026-10-04`.

Keep `SitemapCategory`, `resolveSitemapHref`, and `isExternalSitemapHref`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest --run apps/web/src/lib/sitemap-entries.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/sitemap-entries.ts apps/web/src/lib/sitemap-entries.test.ts
git commit -m "feat: sitemap only the pages the launch keeps"
```

---

### Task 9: Not-found recovery links

**Files:**
- Modify: `apps/web/src/app/not-found.tsx`
- Test: `apps/web/src/app/not-found-launch.test.ts`

**Interfaces:**
- Consumes: `PUBLIC_NAV.downloadHref`, `DISCORD_INVITE_URL`
- Produces: a 404 whose links are Home, Touch Grass, and the zip

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/app/not-found-launch.test.ts`:

```ts
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('not-found source', () => {
  const source = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'not-found.tsx'), 'utf8');

  it('recovers through home, touch grass, and the zip', () => {
    expect(source).toContain("href: '/'");
    expect(source).toContain("href: '/touch-grass'");
    expect(source).toContain("href: '/downloads/tiltcheck-extension.zip'");
    expect(source).toContain('DISCORD_INVITE_URL');
    expect(source).not.toContain("href: '/site-map'");
    expect(source).not.toContain("href: '/casinos'");
    expect(source).not.toContain("href: '/bonuses'");
    expect(source).not.toContain('discord.gg/gdBsEJfCar');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest --run apps/web/src/app/not-found-launch.test.ts`

Expected: FAIL. Current recovery links include `/site-map`, `/casinos`, and `/bonuses`, and the Discord URL is hardcoded.

- [ ] **Step 3: Edit the recovery links**

In `apps/web/src/app/not-found.tsx`:

- Update the copyright date to `2026-10-04`.
- Import `DISCORD_INVITE_URL` from `@/lib/site-links`.
- Set `RECOVERY_LINKS` to Home `/`, Touch Grass `/touch-grass`, and the zip `/downloads/tiltcheck-extension.zip`.
- Replace the hardcoded Discord anchor `href` with `DISCORD_INVITE_URL`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest --run apps/web/src/app/not-found-launch.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/not-found.tsx apps/web/src/app/not-found-launch.test.ts
git commit -m "fix: stop the 404 page from linking retired products"
```

---

### Task 10: Phase doc

**Files:**
- Modify: `docs/migration/tiltcheckmvp-ops/phases.md`

**Interfaces:**
- Consumes: the route gate behavior from Task 1
- Produces: a Phase 1 description that matches the live public site

- [ ] **Step 1: Write the failing text check**

There is no test runner for markdown. The check is a search.

Run: `rg -n "\`/\`, \`/extension\`, \`/casinos\`" docs/migration/tiltcheckmvp-ops/phases.md`

Expected: at least one match in the Phase 1 deliverables table and one in Current status.

- [ ] **Step 2: Update the three spots**

In the Phase 1 deliverables table, replace the Web cell with:

`/`, legal (`/privacy`, `/terms`, `/legal`). Other marketing paths 307 to `/` via `apps/web/src/lib/public-route-gate.ts`. Casino grades are not a public route.

Replace the three Phase 1 ship-gate bullets with:

- Marketing site live with the zip download on `/`
- Retired marketing URLs 307 to `/`
- `/privacy`, `/terms`, `/legal`, `/login`, `/dashboard`, and `/touch-grass` still load

In Current status, replace the web-routes row with:

`Web routes (`/`, legal, login, dashboard, touch-grass; other marketing paths 307 home)` | **Done**

Add a row under it:

`Casino directory on the public nav` | **Held** — pages remain in the repo behind the 307 gate

Update the copyright or "Last updated" line in that file if it has one. This file's header is a title, not the copyright stamp. Add under the title: `© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04`

- [ ] **Step 3: Re-run the search**

Run: `rg -n "\`/extension\`, \`/casinos\`" docs/migration/tiltcheckmvp-ops/phases.md`

Expected: no match.

- [ ] **Step 4: Commit**

```bash
git add docs/migration/tiltcheckmvp-ops/phases.md
git commit -m "docs: point phase 1 at the single-page public site"
```

---

### Task 11: Full check

**Files:**
- Test: the files from Tasks 1–9

- [ ] **Step 1: Run the launch tests together**

Run:

```bash
pnpm exec vitest --run apps/web/src/lib/public-route-gate.test.ts apps/web/src/middleware.test.ts apps/web/src/lib/legacy-redirects.test.ts apps/web/src/lib/home-launch-copy.test.ts apps/web/src/app/page-launch.test.ts apps/web/src/lib/public-nav.test.ts apps/web/src/lib/public-footer.test.ts apps/web/src/lib/sitemap-entries.test.ts apps/web/src/app/not-found-launch.test.ts
```

Expected: PASS.

- [ ] **Step 2: Confirm the zip file is still in place**

Run: `Test-Path apps/web/public/downloads/tiltcheck-extension.zip`

Expected: `True`. Do not rebuild the zip.

- [ ] **Step 3: Stop**

Do not commit an empty follow-up. If Step 1 failed, fix the failing task and make a new commit. Do not amend earlier commits.
