<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-29 -->

# Homepage brakes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `tiltcheck.me` (Next.js twin + GitHub Pages twin) a brakes-only homepage: two hero buttons, feeding-the-house Cooldown why, decorative HUD, AutoVault below the fold on two casinos, lounge off the page.

**Architecture:** Copy lives in `HOME_LAUNCH` and is mirrored in `scripts/pages-product-data.mjs`. `page.tsx` renders ATF + HUD + how-it-works + AutoVault + honesty. CSS uses `landing-hero` / `landing-hud` names only. `/tools/auto-vault` (and `/nuts`, `/stake`) must pass the public route gate or the AutoVault CTA 307s home.

**Tech Stack:** Next.js App Router (`apps/web`), GitHub Pages converter (`scripts/convert-markdown.js`), CSS in `globals.css` + `scripts/pages-assets/styles/base.css`, Vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-29-homepage-brakes-design.md`
- Copyright on every touched file: `© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-29`
- No emojis. No `weasel`. No `self-exclusion` in home copy. No lounge, tips, or `/lounge` on home.
- Zip stays gated (`ctaReady: false`). No `GatedZipCta` on home. No zip download button.
- Primary CTA label is exactly `DON'T FEED THE HOUSE` → `/cooldown`
- Secondary CTA is exactly `IS THIS CASINO SUS?` → `/intel/rtp`
- Tertiary is a text link, not `className="btn"`: `How the Chrome brakes work` → `/extension`
- Funnel attrs on the two hero buttons: `data-funnel-source="web-home-hero"`, Cooldown uses `data-funnel-event="landing_cooldown_click"`
- Cooldown does not move funds. AutoVault is a separate module. Always name Stake.us and nuts.gg in AutoVault copy.
- Kill every `pit-*` class. Do not add sportsbook, parlay, ticket, or perforation styles.
- Fonts: Big Shoulders Display + IBM Plex Sans on landing. Not Inter. Not Space Grotesk.
- Teal `#17c3b2`. Amber only for devnet on the HUD.
- Do not push to `main`. Do not ungated the zip. Do not add lounge to nav.
- Do not redesign `/cooldown`, `/extension`, or AutoVault pages except inbound labels from home.

## File map

| File | Responsibility |
| :--- | :--- |
| `apps/web/src/lib/home-launch-copy.ts` | Locked homepage copy object |
| `apps/web/src/lib/home-launch-copy.test.ts` | Copy contract |
| `apps/web/src/lib/public-route-gate.ts` | Allow AutoVault + nuts/stake |
| `apps/web/src/lib/public-route-gate.test.ts` | Gate contract |
| `apps/web/src/app/page.tsx` | Homepage markup |
| `apps/web/src/app/page-launch.test.ts` | Homepage source contract |
| `apps/web/src/app/layout.tsx` | Font CSS variables (already present; keep) |
| `apps/web/src/app/globals.css` | HUD layout; delete pit |
| `scripts/pages-product-data.mjs` | Pages copy twin |
| `scripts/convert-markdown.js` | Pages HTML twin |
| `scripts/pages-assets/styles/base.css` | Pages HUD CSS |
| `.github/workflows/pages.yml` | Copy glitter PNG into `out/assets` |
| `tests/pages-launch.test.ts` | Pages twin contract |
| `CHANGELOG.md` | Unreleased note |
| Spec status line | Draft → Approved |

---

### Task 1: HOME_LAUNCH copy contract

**Files:**
- Modify: `apps/web/src/lib/home-launch-copy.test.ts`
- Modify: `apps/web/src/lib/home-launch-copy.ts`

**Interfaces:**
- Consumes: none
- Produces: `HOME_LAUNCH` with `h1`, `kicker` (string), `lede`, `secondaryCtas` (length 2), `tertiaryLink`, `privacy`, `installEyebrow`, `installTitle`, `installMoves` (`{ title, body }[]` length 3), `hud` (`{ spin, countdown, chip, lock, lockMeta }`), `vault` (`{ title, body, ctaLabel, href }`), `honesty` (length 4), `ctaReady: false`

- [ ] **Step 1: Write the failing test**

Replace `apps/web/src/lib/home-launch-copy.test.ts` with:

```ts
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-29
import { describe, expect, it } from 'vitest';
import { HOME_LAUNCH } from './home-launch-copy';
import { SITE_ONE_LINER, SITE_OG_SUBLINE, SITE_SEO_TITLE } from './site-copy';
import { TOOL_REGISTRY } from './tool-registry';

const homeBlob = JSON.stringify(HOME_LAUNCH).toLowerCase();

describe('HOME_LAUNCH', () => {
  it('locks brakes-only hero copy', () => {
    expect(HOME_LAUNCH.h1).toEqual(['House always wins?', 'FUCK THAT.']);
    expect(HOME_LAUNCH.kicker).toBe(
      'Chasing the loss, chasing the win, thinking you are due. That is feeding the house.',
    );
    expect(HOME_LAUNCH.lede).toMatch(/Brakes for degens who still play/i);
    expect(HOME_LAUNCH.lede).toMatch(/Sign a Cooldown/i);
    expect(HOME_LAUNCH.lede).toMatch(/stack back on the table/i);
    expect(HOME_LAUNCH.lede).not.toMatch(/weasel/i);
    expect(HOME_LAUNCH.lede).not.toMatch(/Pro only/i);
  });

  it('uses two hero buttons and a text tertiary', () => {
    expect(HOME_LAUNCH.ctaReady).toBe(false);
    expect(HOME_LAUNCH.secondaryCtas).toEqual([
      { label: "DON'T FEED THE HOUSE", href: '/cooldown' },
      { label: 'IS THIS CASINO SUS?', href: '/intel/rtp' },
    ]);
    expect(HOME_LAUNCH.tertiaryLink).toEqual({
      label: 'How the Chrome brakes work',
      href: '/extension',
    });
    expect(HOME_LAUNCH.privacy).toMatch(/You sign a Cooldown/i);
    expect(HOME_LAUNCH.privacy).toMatch(/Zip is not on this site/i);
  });

  it('names how-it-works moves without weasel', () => {
    expect(HOME_LAUNCH.installMoves.map((m) => m.title)).toEqual([
      'Look up the house',
      "Don't feed it",
      'Slow the next click',
    ]);
    expect(HOME_LAUNCH.installMoves[1]?.body).toMatch(/Sign a Cooldown/i);
    expect(HOME_LAUNCH.installMoves[2]?.body).toMatch(/two seconds/i);
    expect(homeBlob).not.toContain('weasel');
    expect(homeBlob).not.toContain('self-exclusion');
  });

  it('scopes AutoVault to two casinos and keeps honesty on devnet', () => {
    expect(HOME_LAUNCH.vault.href).toBe('/tools/auto-vault');
    expect(HOME_LAUNCH.vault.title).toMatch(/sites we actually support/i);
    expect(HOME_LAUNCH.vault.body).toMatch(/Stake\.us/i);
    expect(HOME_LAUNCH.vault.body).toMatch(/nuts\.gg/i);
    expect(HOME_LAUNCH.honesty).toHaveLength(4);
    expect(HOME_LAUNCH.honesty.join(' ')).toMatch(/devnet/i);
    expect(HOME_LAUNCH.honesty.join(' ')).toMatch(/two casinos/i);
    expect(HOME_LAUNCH.honesty.join(' ')).not.toMatch(/lounge/i);
    expect(homeBlob).not.toContain('lounge');
  });

  it('does not call Cooldown self-exclusion in the pitch', () => {
    expect(SITE_OG_SUBLINE.toLowerCase()).not.toContain('self-exclusion');
    expect(TOOL_REGISTRY[0]?.href).toBe('/cooldown');
    expect(SITE_SEO_TITLE).toMatch(/Brakes/i);
    expect(SITE_ONE_LINER).toMatch(/never hold your keys/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/src/lib/home-launch-copy.test.ts`

Expected: FAIL (kicker is still an array; `DON'T FEED THE HOUSE` missing; `installMoves` undefined).

- [ ] **Step 3: Write minimal implementation**

Replace `apps/web/src/lib/home-launch-copy.ts` with:

```ts
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-29

export const HOME_LAUNCH = {
  h1: ['House always wins?', 'FUCK THAT.'],
  kicker:
    'Chasing the loss, chasing the win, thinking you are due. That is feeding the house.',
  lede:
    'Brakes for degens who still play. Slow the next spin. Block the game that rinses you. Sign a Cooldown so 3am-you cannot put the stack back on the table until the timer ends. Look up sus casinos before you deposit. We never hold your keys or take bets.',
  ctaReady: false,
  ctaLabel: 'DOWNLOAD THE ZIP',
  ctaGatedLabel: 'CHROME ZIP NOT ON THIS SITE',
  ctaHref: '/downloads/tiltcheck-extension.zip',
  ctaGatedHint:
    'The public zip is not up yet. Wallet lock and casino lookup work now. If you are building the extension, load unpacked dist from the repo.',
  secondaryCtas: [
    { label: "DON'T FEED THE HOUSE", href: '/cooldown' },
    { label: 'IS THIS CASINO SUS?', href: '/intel/rtp' },
  ] as const,
  tertiaryLink: { label: 'How the Chrome brakes work', href: '/extension' } as const,
  privacy:
    'We never ask for your casino password or wallet seed. You sign a Cooldown. Zip is not on this site.',
  installEyebrow: 'How it works',
  installTitle: 'Three moves. None of them are a lecture.',
  installMoves: [
    {
      title: 'Look up the house',
      body: 'Trust scores are receipts — payout stories, licenses, scam reports — not a vibe rank.',
    },
    {
      title: "Don't feed it",
      body: 'Sign a Cooldown. The win stays off the table until the timer ends. Stronger locks only. You sign. We never hold keys. Casinos do not have to honor it. You do.',
    },
    {
      title: 'Slow the next click',
      body: 'Chrome on the casino tab. After a spin, the bet button is dead for two seconds. Games you name stop clicking. Zip is not on this site. Devs load unpacked dist.',
    },
  ] as const,
  hud: {
    spin: 'SPIN',
    countdown: '2s',
    chip: 'On your list',
    lock: 'Cooldown signed',
    lockMeta: 'devnet',
  } as const,
  vault: {
    title: 'AutoVault — skim the win on the sites we actually support.',
    body: 'Stake.us and nuts.gg only. Dashboard owns the rule. The tab presses the vault button so the hit is not sitting in playable balance. Not every casino.',
    ctaLabel: 'AUTOVAULT SETUP',
    href: '/tools/auto-vault',
  } as const,
  honesty: [
    'This is live: casino lookup, Discord tools, and Cooldown on Solana’s test network (devnet). Mainnet is later.',
    'The Chrome zip is not on this site and not in the Chrome Web Store. The two-second spin lock and game list exist in the repo as an unpacked install.',
    'Browser filters are your list. They are not operator self-exclusion. Turn the extension off and play continues.',
    'AutoVault is two casinos. We do not fake a vault button everywhere.',
  ],
  footerDisclaimer:
    'TiltCheck is not a casino and not a bank. This is not financial advice. If gambling has stopped being fun, call 1-800-GAMBLER or visit NCPG.org.',
} as const;
```

Honesty line 3 contains `self-exclusion` as the thing we are **not**. The blob test uses `homeBlob.not.toContain('self-exclusion')` which would fail.

Change the honesty line to avoid the banned noun:

`'Browser filters are your list. Not an operator account close. Turn the extension off and play continues.',`

And keep the test `not.toContain('self-exclusion')`.

If other tests in the repo import `HOME_LAUNCH.cards`, `HOME_LAUNCH.kicker[0]`, or `secondaryCtas[2]`, update those tests in this same step to the new shape. Search first:

Run: `rg "HOME_LAUNCH\\.(cards|kicker|installSteps|secondaryCtas)" apps/web scripts tests --glob "*.{ts,tsx,mjs,js}"`

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `pnpm exec vitest run apps/web/src/lib/home-launch-copy.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/home-launch-copy.ts apps/web/src/lib/home-launch-copy.test.ts
git commit -m "test(web): lock homepage copy as brakes, not hangout"
```

If copy and tests land in the same commit after green, that is acceptable. Prefer the message above if the test file was committed first; if both land together use: `feat(web): lock homepage copy as brakes, not hangout`

---

### Task 2: Un-gate AutoVault public routes

**Files:**
- Modify: `apps/web/src/lib/public-route-gate.ts`
- Modify: `apps/web/src/lib/public-route-gate.test.ts`

**Interfaces:**
- Consumes: `decidePublicRoute(pathname: string): PublicRouteDecision`
- Produces: `next` for `/tools/auto-vault`, `/tools/auto-vault/android`, `/tools/auto-vault/share`, `/nuts`, `/stake`

Without this, `HOME_LAUNCH.vault.href` 307s to `/`.

- [ ] **Step 1: Write the failing test**

In `apps/web/src/lib/public-route-gate.test.ts`:

Add `/tools/auto-vault`, `/tools/auto-vault/android`, `/tools/auto-vault/share`, `/nuts`, `/stake` to the keep-launch-pages list.

Remove `/tools/auto-vault` from the retired-redirect list. Keep `/tools` (index) as a redirect.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/src/lib/public-route-gate.test.ts`

Expected: FAIL (`/tools/auto-vault` still redirects).

- [ ] **Step 3: Write minimal implementation**

In `apps/web/src/lib/public-route-gate.ts`:

Add to `STAY_EXACT`: `'/nuts'`, `'/stake'`

Add to `STAY_PREFIXES`: `'/tools/auto-vault'`

Do not add `'/tools'`.

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `pnpm exec vitest run apps/web/src/lib/public-route-gate.test.ts`

Expected: PASS. `/tools` still redirects. `/tools/auto-vault` does not.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/public-route-gate.ts apps/web/src/lib/public-route-gate.test.ts
git commit -m "fix(web): let AutoVault routes stay public"
```

---

### Task 3: Homepage markup

**Files:**
- Modify: `apps/web/src/app/page-launch.test.ts`
- Modify: `apps/web/src/app/page.tsx`

**Interfaces:**
- Consumes: `HOME_LAUNCH` from Task 1
- Produces: `page.tsx` with `landing-hero`, `landing-hud`, `id="install"`, `HOME_LAUNCH.vault`, no `pit-`, no `GatedZipCta`, tertiary not `className="btn"`

- [ ] **Step 1: Write the failing test**

Replace `apps/web/src/app/page-launch.test.ts` with:

```ts
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-29
import { readFileSync } from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('homepage source', () => {
  const source = readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), 'page.tsx'),
    'utf8',
  );

  it('renders brakes hero, HUD, install, AutoVault, honesty', () => {
    expect(source).toContain('HOME_LAUNCH');
    expect(source).toContain('id="install"');
    expect(source).toContain('landing-hero');
    expect(source).toContain('landing-hud');
    expect(source).toContain('HOME_LAUNCH.vault');
    expect(source).toContain('HOME_LAUNCH.tertiaryLink');
    expect(source).toContain('landing_cooldown_click');
    expect(source).toContain('data-funnel-source="web-home-hero"');
    expect(source).not.toContain('GatedZipCta');
    expect(source).not.toContain('pit-hero');
    expect(source).not.toContain('pit-slip');
    expect(source).not.toMatch(/lounge/i);
  });

  it('keeps tertiary off the button class', () => {
    expect(source).toContain('hero-actions__secondary-link');
    expect(source).not.toMatch(/tertiaryLink[\s\S]{0,200}className=\{cta\.href/);
  });

  it('does not sell the retired products', () => {
    expect(source).not.toContain('Instant Redeem');
    expect(source).not.toContain('OperatorBlock');
    expect(source).not.toContain('href="/casinos"');
    expect(source).not.toContain('href="/operators"');
    expect(source).not.toContain('Approved');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/src/app/page-launch.test.ts`

Expected: FAIL (`landing-hud` missing; `pit-hero` still present).

- [ ] **Step 3: Write minimal implementation**

Replace `apps/web/src/app/page.tsx` with:

```tsx
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-29
import Link from 'next/link';
import BrandTagline from '@/components/BrandTagline';
import JsonLd from '@/components/JsonLd';
import { HOME_LAUNCH } from '@/lib/home-launch-copy';
import { webPageJsonLd } from '@/lib/structured-data';
import { SITE_ONE_LINER, SITE_SEO_TITLE } from '@/lib/site-copy';

export default function Home() {
  return (
    <main className="landing-page">
      <JsonLd data={webPageJsonLd(SITE_SEO_TITLE, SITE_ONE_LINER, '/')} />
      <section className="landing-hero" aria-label="TiltCheck">
        <div className="landing-hero__copy">
          <span className="brand-eyebrow">
            <BrandTagline compact />
          </span>
          <h1 className="landing-hero__title">
            <span className="landing-hero__title-q">{HOME_LAUNCH.h1[0]}</span>
            <span className="landing-hero__title-a">{HOME_LAUNCH.h1[1]}</span>
          </h1>
          <p className="landing-hero__kicker">{HOME_LAUNCH.kicker}</p>
          <p className="landing-hero__lede">{HOME_LAUNCH.lede}</p>
          <div className="hero-actions landing-hero__actions">
            {HOME_LAUNCH.secondaryCtas.map((cta) => (
              <Link
                key={cta.href}
                href={cta.href}
                className={cta.href === '/cooldown' ? 'btn btn-primary' : 'btn btn-secondary'}
                data-funnel-event={
                  cta.href === '/cooldown' ? 'landing_cooldown_click' : 'landing_secondary_click'
                }
                data-funnel-source="web-home-hero"
                data-funnel-label={cta.label}
              >
                {cta.label}
              </Link>
            ))}
          </div>
          <Link
            href={HOME_LAUNCH.tertiaryLink.href}
            className="hero-actions__secondary-link"
            data-funnel-event="landing_extension_click"
            data-funnel-source="web-home-hero"
            data-funnel-label={HOME_LAUNCH.tertiaryLink.label}
          >
            {HOME_LAUNCH.tertiaryLink.label}
          </Link>
          <p className="landing-hero__privacy">{HOME_LAUNCH.privacy}</p>
        </div>
        <aside className="landing-hud" aria-hidden="true">
          <div className="landing-hud__spin">
            <span className="landing-hud__spin-label">{HOME_LAUNCH.hud.spin}</span>
            <span className="landing-hud__count">{HOME_LAUNCH.hud.countdown}</span>
          </div>
          <span className="landing-hud__chip">{HOME_LAUNCH.hud.chip}</span>
          <p className="landing-hud__lock">{HOME_LAUNCH.hud.lock}</p>
          <p className="landing-hud__meta">{HOME_LAUNCH.hud.lockMeta}</p>
        </aside>
      </section>
      <section id="install" className="landing-moves" aria-label="How it works">
        <p className="landing-moves__eyebrow">{HOME_LAUNCH.installEyebrow}</p>
        <h2 className="landing-moves__title">{HOME_LAUNCH.installTitle}</h2>
        <ol className="landing-moves__list">
          {HOME_LAUNCH.installMoves.map((move, index) => (
            <li key={move.title} className="landing-move">
              <span className="landing-move__num">{String(index + 1).padStart(2, '0')}</span>
              <h3 className="landing-move__title">{move.title}</h3>
              <p>{move.body}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="landing-vault" aria-label="AutoVault">
        <h2 className="landing-vault__title">{HOME_LAUNCH.vault.title}</h2>
        <p className="landing-vault__body">{HOME_LAUNCH.vault.body}</p>
        <Link href={HOME_LAUNCH.vault.href} className="btn btn-secondary">
          {HOME_LAUNCH.vault.ctaLabel}
        </Link>
      </section>
      <section className="landing-tape" aria-label="Honesty">
        <p className="landing-tape__label">THE FINE PRINT</p>
        <ul className="landing-tape__list">
          {HOME_LAUNCH.honesty.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `pnpm exec vitest run apps/web/src/app/page-launch.test.ts apps/web/src/lib/home-launch-copy.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/page.tsx apps/web/src/app/page-launch.test.ts
git commit -m "feat(web): render brakes hero and HUD on home"
```

---

### Task 4: HUD CSS, kill pit, readable H1

**Files:**
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/app/layout.tsx` (only if font variables are missing)

**Interfaces:**
- Consumes: class names from Task 3 (`landing-hero`, `landing-hud`, `landing-moves`, `landing-vault`, `landing-tape`)
- Produces: no `.pit-*` rules; landing overlay lighter than 0.88; H1 without black text-stroke

- [ ] **Step 1: Confirm fonts are wired**

`layout.tsx` must already export CSS variables `--font-display` (Big_Shoulders_Display) and `--font-plex` (IBM_Plex_Sans) on `<body>`. If missing, add them. Keep Inter only as a fallback for non-landing pages.

- [ ] **Step 2: Replace pit CSS**

In `apps/web/src/app/globals.css`:

1. Keep `body.degen-background:has(.landing-page)::before` overlay at or below `rgba(5, 7, 10, 0.55)` so glitter and H1 read.
2. Delete every `.pit-*` rule and `pit-rise` / `pit-slide` / `pit-pulse` keyframes.
3. Do not apply `-webkit-text-stroke` to `.landing-hero__title`.
4. Add the following after `.landing-page {`:

```css
.landing-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(16rem, 0.85fr);
  gap: clamp(1.5rem, 4vw, 3.25rem);
  align-items: start;
  width: min(100% - 2rem, 78rem);
  margin: 0 auto;
  padding: clamp(2rem, 5vw, 4.5rem) 0 0;
}

.landing-hero__copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  animation: landing-rise 0.8s ease-out both;
}

.landing-hero__title {
  display: flex;
  flex-direction: column;
  gap: 0.08em;
  margin: 1.1rem 0 0;
  max-width: 12ch;
  font-family: var(--font-display), "Big Shoulders Display", sans-serif;
  font-weight: 900;
  line-height: 0.86;
  letter-spacing: -0.03em;
  text-transform: uppercase;
}

.landing-hero__title-q {
  font-size: clamp(2.4rem, 6.5vw, 5.2rem);
  color: #e8eee8;
}

.landing-hero__title-a {
  font-size: clamp(3.1rem, 8.4vw, 6.8rem);
  color: #17c3b2;
  text-shadow: 0 0 42px rgba(23, 195, 178, 0.35);
}

.landing-hero__kicker {
  margin: 1.15rem 0 0;
  max-width: 40rem;
  font-size: clamp(1.05rem, 1.05rem + 0.2vw, 1.22rem);
  line-height: 1.55;
  color: #d7e0d8;
}

.landing-hero__lede,
.landing-hero__privacy {
  margin: 1.1rem 0 0;
  max-width: 40rem;
  color: #c5d0c8;
  line-height: 1.68;
}

.landing-hero__privacy {
  font-size: 0.88rem;
  color: #8fa197;
}

.landing-hero__actions {
  justify-content: flex-start;
  margin-top: 1.75rem;
}

.landing-hero .hero-actions__secondary-link {
  margin-top: 0.85rem;
}

.landing-hud {
  display: grid;
  gap: 0.85rem;
  padding: 1.2rem 1.25rem 1.3rem;
  border: 1px solid rgba(23, 195, 178, 0.38);
  background: linear-gradient(165deg, #12181a 0%, #0b1012 100%);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
  animation: landing-slide 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s both;
}

.landing-hud__spin {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem;
  border: 1px solid rgba(23, 195, 178, 0.45);
  background: rgba(8, 12, 12, 0.9);
  font-family: var(--font-display), "Big Shoulders Display", sans-serif;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8fa197;
}

.landing-hud__count {
  font-family: var(--font-mono);
  color: #17c3b2;
}

.landing-hud__chip {
  justify-self: start;
  padding: 0.25rem 0.55rem;
  border: 1px solid rgba(255, 176, 32, 0.5);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #ffb020;
}

.landing-hud__lock {
  margin: 0;
  font-family: var(--font-display), "Big Shoulders Display", sans-serif;
  font-size: 1.35rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #f4f7f2;
}

.landing-hud__meta {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #ffb020;
}

.landing-moves,
.landing-vault,
.landing-tape {
  width: min(100% - 2rem, 78rem);
  margin: 0 auto;
}

.landing-moves__eyebrow,
.landing-tape__label {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #17c3b2;
}

.landing-moves__title,
.landing-vault__title,
.landing-move__title {
  font-family: var(--font-display), "Big Shoulders Display", sans-serif;
  font-weight: 800;
  text-transform: uppercase;
  color: #f4f7f2;
}

.landing-moves__title {
  margin: 0.4rem 0 0;
  max-width: 16ch;
  font-size: clamp(2rem, 4vw, 3.1rem);
  line-height: 0.92;
}

.landing-moves__list {
  list-style: none;
  margin: 1.75rem 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.25rem 1.5rem;
}

.landing-move {
  display: grid;
  gap: 0.45rem;
  padding: 1.1rem 0 0;
  border-top: 2px solid #17c3b2;
}

.landing-move__num {
  font-family: var(--font-display), "Big Shoulders Display", sans-serif;
  font-size: 1.8rem;
  font-weight: 800;
  color: #17c3b2;
}

.landing-move p,
.landing-vault__body,
.landing-tape__list li {
  margin: 0;
  color: #c5d0c8;
  line-height: 1.6;
}

.landing-vault {
  padding: 1.25rem 0 0;
  border-top: 1px solid rgba(23, 195, 178, 0.25);
}

.landing-vault__title {
  margin: 0;
  font-size: clamp(1.6rem, 3vw, 2.2rem);
}

.landing-vault__body {
  margin: 0.75rem 0 1.1rem;
  max-width: 44rem;
}

.landing-tape {
  padding: 1.25rem 1.35rem 1.35rem;
  border-left: 4px solid #17c3b2;
  background: linear-gradient(90deg, rgba(23, 195, 178, 0.08), rgba(8, 12, 10, 0.55));
}

.landing-tape__list {
  list-style: none;
  margin: 0.85rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.7rem;
}

@keyframes landing-rise {
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: none; }
}

@keyframes landing-slide {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .landing-hero__copy,
  .landing-hud {
    animation: none;
  }
}

@media (max-width: 899px) {
  .landing-hero {
    grid-template-columns: 1fr;
  }
  .landing-moves__list {
    grid-template-columns: 1fr;
  }
}
```

Also add at 640px (existing breakpoint): `.landing-hero__actions` stacks; `.btn` full width (already true for `.hero-actions`).

- [ ] **Step 3: Grep for leftovers**

Run: `rg "pit-hero|pit-slip|pit-leg|Sportsbook pit" apps/web/src/app --glob "*.{css,tsx}"`

Expected: no matches.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/globals.css apps/web/src/app/layout.tsx
git commit -m "style(web): HUD homepage, drop pit ticket"
```

---

### Task 5: GitHub Pages twin

**Files:**
- Modify: `scripts/pages-product-data.mjs`
- Modify: `scripts/convert-markdown.js`
- Modify: `scripts/pages-assets/styles/base.css`
- Modify: `.github/workflows/pages.yml`
- Modify: `tests/pages-launch.test.ts`

**Interfaces:**
- Consumes: same strings as `HOME_LAUNCH` from Task 1
- Produces: Pages `/` HTML with two buttons, tertiary text link `extension.html`, HUD, AutoVault linking `https://tiltcheck.me/tools/auto-vault`, no zip download, no `pit-`

- [ ] **Step 1: Write the failing test**

Replace `tests/pages-launch.test.ts` with:

```ts
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-29
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CTA_READY,
  SECONDARY_CTAS,
  SITE_KICKER,
  TERTIARY_LINK,
  VAULT,
} from '../scripts/pages-product-data.mjs';

const convertMarkdown = readFileSync(
  path.join(process.cwd(), 'scripts/convert-markdown.js'),
  'utf8',
);

describe('GitHub Pages launch twin', () => {
  it('locks brakes hero copy to the Next twin', () => {
    expect(CTA_READY).toBe(false);
    expect(SITE_KICKER).toMatch(/thinking you are due/i);
    expect(SECONDARY_CTAS).toHaveLength(2);
    expect(SECONDARY_CTAS[0]).toEqual({
      label: "DON'T FEED THE HOUSE",
      href: 'https://tiltcheck.me/cooldown',
      primary: true,
    });
    expect(TERTIARY_LINK.href).toBe('extension.html');
    expect(VAULT.href).toBe('https://tiltcheck.me/tools/auto-vault');
    expect(VAULT.body).toMatch(/Stake\.us/i);
    expect(convertMarkdown).toContain('landing-hud');
    expect(convertMarkdown).not.toContain('pit-hero');
    expect(convertMarkdown).not.toMatch(/Zip soon™/);
    expect(convertMarkdown).not.toMatch(/lounge/i);
  });

  it('does not emit a live zip download while the sideload is gated', () => {
    expect(convertMarkdown).not.toContain(
      'href="downloads/tiltcheck-extension.zip" download>DOWNLOAD THE ZIP',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/pages-launch.test.ts`

Expected: FAIL (`SITE_KICKER` still an array; `TERTIARY_LINK` missing).

- [ ] **Step 3: Mirror copy in `scripts/pages-product-data.mjs`**

Set:

```js
export const SITE_KICKER =
  'Chasing the loss, chasing the win, thinking you are due. That is feeding the house.';
export const SITE_LEDE =
  'Brakes for degens who still play. Slow the next spin. Block the game that rinses you. Sign a Cooldown so 3am-you cannot put the stack back on the table until the timer ends. Look up sus casinos before you deposit. We never hold your keys or take bets.';
export const SITE_PRIVACY =
  'We never ask for your casino password or wallet seed. You sign a Cooldown. Zip is not on this site.';
export const SECONDARY_CTAS = [
  { label: "DON'T FEED THE HOUSE", href: `${SITE_URL}/cooldown`, primary: true },
  { label: 'IS THIS CASINO SUS?', href: `${SITE_URL}/intel/rtp`, primary: false },
];
export const TERTIARY_LINK = {
  label: 'How the Chrome brakes work',
  href: 'extension.html',
};
export const INSTALL_MOVES = [
  { title: 'Look up the house', body: 'Trust scores are receipts — payout stories, licenses, scam reports — not a vibe rank.' },
  { title: "Don't feed it", body: 'Sign a Cooldown. The win stays off the table until the timer ends. Stronger locks only. You sign. We never hold keys. Casinos do not have to honor it. You do.' },
  { title: 'Slow the next click', body: 'Chrome on the casino tab. After a spin, the bet button is dead for two seconds. Games you name stop clicking. Zip is not on this site. Devs load unpacked dist.' },
];
export const HUD = {
  spin: 'SPIN',
  countdown: '2s',
  chip: 'On your list',
  lock: 'Cooldown signed',
  lockMeta: 'devnet',
};
export const VAULT = {
  title: 'AutoVault — skim the win on the sites we actually support.',
  body: 'Stake.us and nuts.gg only. Dashboard owns the rule. The tab presses the vault button so the hit is not sitting in playable balance. Not every casino.',
  ctaLabel: 'AUTOVAULT SETUP',
  href: `${SITE_URL}/tools/auto-vault`,
};
export const LAUNCH_HONESTY = [
  'This is live: casino lookup, Discord tools, and Cooldown on Solana’s test network (devnet). Mainnet is later.',
  'The Chrome zip is not on this site and not in the Chrome Web Store. The two-second spin lock and game list exist in the repo as an unpacked install.',
  'Browser filters are your list. They are not an operator account close. Turn the extension off and play continues.',
  'AutoVault is two casinos. We do not fake a vault button everywhere.',
];
```

Keep `SITE_H1_LINES` unchanged. Remove home use of `LAUNCH_CARDS` / `INSTALL_STEPS` if nothing else imports them. If other Pages builders still import `INSTALL_STEPS`, leave the export but stop using it on `/`.

- [ ] **Step 4: Rewrite `buildRootLanding` in `scripts/convert-markdown.js`**

Import `TERTIARY_LINK`, `INSTALL_MOVES`, `HUD`, `VAULT` (and drop home-only use of `INSTALL_STEPS`, `LAUNCH_CARDS`, `LAUNCH_MOCK`).

`FONT_LINKS` becomes:

```js
const FONT_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/><link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700;800&display=swap" rel="stylesheet"/>`;
```

`kickerHtml()` returns one `<p class="landing-hero__kicker">`.

`secondaryCtaHtml()` maps `SECONDARY_CTAS` only (length 2).

`buildRootLanding` body (no zip button):

```js
function buildRootLanding() {
  const moves = INSTALL_MOVES.map(
    (move, index) => `<li class="landing-move">
  <span class="landing-move__num">${String(index + 1).padStart(2, '0')}</span>
  <h3 class="landing-move__title">${escapeHtml(move.title)}</h3>
  <p>${escapeHtml(move.body)}</p>
</li>`,
  ).join('\n');
  const honesty = LAUNCH_HONESTY.map((line) => `<li>${escapeHtml(line)}</li>`).join('\n');
  const content = `<main class="landing-page">
  <section class="landing-hero" aria-label="TiltCheck">
    <div class="landing-hero__copy">
      <p class="brand-wordmark">Tilt<span>Check</span></p>
      <h1 class="landing-hero__title"><span class="landing-hero__title-q">${escapeHtml(SITE_H1_LINES[0])}</span><span class="landing-hero__title-a">${escapeHtml(SITE_H1_LINES[1])}</span></h1>
      <p class="landing-hero__kicker">${escapeHtml(SITE_KICKER)}</p>
      <p class="landing-hero__lede">${escapeHtml(SITE_LEDE)}</p>
      <div class="hero-actions landing-hero__actions">
        ${secondaryCtaHtml()}
      </div>
      <a class="hero-actions__secondary-link" href="${escapeHtml(TERTIARY_LINK.href)}">${escapeHtml(TERTIARY_LINK.label)}</a>
      <p class="landing-hero__privacy">${escapeHtml(SITE_PRIVACY)}</p>
    </div>
    <aside class="landing-hud" aria-hidden="true">
      <div class="landing-hud__spin"><span>${escapeHtml(HUD.spin)}</span><span class="landing-hud__count">${escapeHtml(HUD.countdown)}</span></div>
      <span class="landing-hud__chip">${escapeHtml(HUD.chip)}</span>
      <p class="landing-hud__lock">${escapeHtml(HUD.lock)}</p>
      <p class="landing-hud__meta">${escapeHtml(HUD.lockMeta)}</p>
    </aside>
  </section>
  <section class="landing-moves" id="install" aria-label="How it works">
    <p class="landing-moves__eyebrow">${escapeHtml(INSTALL_EYEBROW)}</p>
    <h2 class="landing-moves__title">${escapeHtml(INSTALL_TITLE)}</h2>
    <ol class="landing-moves__list">${moves}</ol>
  </section>
  <section class="landing-vault" aria-label="AutoVault">
    <h2 class="landing-vault__title">${escapeHtml(VAULT.title)}</h2>
    <p class="landing-vault__body">${escapeHtml(VAULT.body)}</p>
    <a class="btn btn-secondary" href="${escapeHtml(VAULT.href)}">${escapeHtml(VAULT.ctaLabel)}</a>
  </section>
  <section class="landing-tape" aria-label="Honesty">
    <p class="landing-tape__label">THE FINE PRINT</p>
    <ul class="landing-tape__list">${honesty}</ul>
  </section>
</main>`;
  return shell({
    title: 'TiltCheck | House always wins? FUCK THAT.',
    description: SITE_META_DESCRIPTION,
    depth: 'root',
    current: 'home',
    body: content,
  });
}
```

In `run()`, copy glitter:

```js
const glitterSrc = path.join(repoRoot, 'apps/web/public/assets/backgroundglitter.png');
const assetsDir = path.join(siteRoot, 'assets');
fs.mkdirSync(assetsDir, { recursive: true });
if (fs.existsSync(glitterSrc)) {
  fs.copyFileSync(glitterSrc, path.join(assetsDir, 'backgroundglitter.png'));
}
```

- [ ] **Step 5: Pages CSS**

In `scripts/pages-assets/styles/base.css`:

- `--font-sans: "IBM Plex Sans", "Segoe UI", sans-serif;`
- `--font-display: "Big Shoulders Display", Impact, "Arial Narrow", sans-serif;`
- Body background: glitter `url("../assets/backgroundglitter.png")` plus dark radial teal. No 0.88 black overlay.
- Copy the Task 4 HUD rules (same class names).
- Delete or stop using `.landing-hero-centered` on home. Do not stroke `.landing-hero__title` with black.
- `.hero-actions` inside `.landing-hero` is `justify-content: flex-start`.

In `.github/workflows/pages.yml` Add shared assets step:

```yaml
mkdir -p out/assets
cp apps/web/public/assets/backgroundglitter.png out/assets/backgroundglitter.png
```

- [ ] **Step 6: Run Pages tests**

Run: `pnpm exec vitest run tests/pages-launch.test.ts`

Expected: PASS

Optional local build: `pnpm docs:pages` then open `out/index.html` and confirm two buttons, no zip, HUD present.

- [ ] **Step 7: Commit**

```bash
git add scripts/pages-product-data.mjs scripts/convert-markdown.js scripts/pages-assets/styles/base.css .github/workflows/pages.yml tests/pages-launch.test.ts
git commit -m "feat(pages): mirror brakes homepage on GitHub Pages twin"
```

---

### Task 6: Docs + spec status

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `docs/superpowers/specs/2026-10-29-homepage-brakes-design.md`

**Interfaces:**
- Consumes: shipped markup from Tasks 3–5
- Produces: Unreleased changelog line; spec Status `Approved`

- [ ] **Step 1: Changelog**

Under `[Unreleased]`, add a Changed bullet:

`- Homepage job is brakes only: DON'T FEED THE HOUSE → Cooldown, sus lookup second, extension as a text link. AutoVault sits below the fold for Stake.us and nuts.gg. Degen Lounge is not on tiltcheck.me. GitHub Pages twin matches. Zip stays gated.`

Update the changelog header date to `2026-10-29`.

- [ ] **Step 2: Spec status**

Change the spec header from `Status: Draft (awaiting founder review of this file)` to `Status: Approved`.

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md docs/superpowers/specs/2026-10-29-homepage-brakes-design.md
git commit -m "docs(web): mark homepage brakes spec approved"
```

---

### Task 7: Browser check (local, not live)

**Files:** none unless a bug is found

**Interfaces:**
- Consumes: `pnpm -C apps/web dev` on port 3001
- Produces: pass/fail notes; fix in place if H1 is unreadable or a CTA 307s

- [ ] **Step 1: Start web if it is not running**

Run: `pnpm -C apps/web dev`

Expected: Next.js on `http://127.0.0.1:3001`

- [ ] **Step 2: Desktop pass**

Open `/`. Confirm:

- H1 readable on glitter (`FUCK THAT.` teal)
- Kicker is the feeding-the-house sentence
- Primary button label `DON'T FEED THE HOUSE` goes to `/cooldown`
- Secondary goes to `/intel/rtp`
- Tertiary is a text link to `/extension`
- No zip button, no chat, no lounge
- HUD shows SPIN / 2s / On your list / Cooldown signed / devnet
- Scroll: three moves, AutoVault names Stake.us and nuts.gg, honesty names two casinos
- AutoVault CTA reaches `/tools/auto-vault` (no bounce to `/`)

- [ ] **Step 3: Mobile pass**

Viewport ~390px. Buttons stack. HUD sits under copy.

- [ ] **Step 4: Commit only if you had to fix CSS/markup**

If no code change, skip commit.

Do not push. Live tiltcheck.me stays stale until founder merges to `main`.

---

## Spec coverage (self-review)

| Spec requirement | Task |
| :--- | :--- |
| Brakes-only job, lounge off page | 1, 3, 5 |
| Kicker + DON'T FEED THE HOUSE + sus CTA + tertiary text | 1, 3, 5 |
| Fine print signs Cooldown, zip not on site | 1 |
| How-it-works three moves | 1, 3, 5 |
| AutoVault two casinos | 1, 3, 5 |
| AutoVault URL actually loads | 2 |
| Honesty four lines, no lounge | 1 |
| HUD not ticket, kill pit | 3, 4, 5 |
| Fonts not Inter on landing | 4, 5 |
| Glitter + readable H1 | 4, 5 |
| Pages twin lockstep | 5 |
| Zip gated | 1, 3, 5 |
| Tests | 1–5 |
| Browser | 7 |
| Changelog / spec Approved | 6 |
| No `main` push | 7 (explicit) |
