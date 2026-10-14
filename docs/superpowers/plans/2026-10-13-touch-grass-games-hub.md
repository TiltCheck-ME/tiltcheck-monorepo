<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13 -->

# Touch Grass games hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/touch-grass` with a two-game off-ramp hub (Live Trivia + Degens Against Decency), hide money CTAs in `?mode=pause`, and iframe that pause hub inside the Pro overlay without shortening or dismissing the cover.

**Architecture:** Next.js same-origin shells under `apps/web/src/app/touch-grass`. Round status is a pure mapper over existing `GET /arena/trivia/status` (`{ activeGame }`). Trivia practice uses `@tiltcheck/shared` `TRIVIA_QUESTION_BANK`. DA&D v1 is a local prompt deck plus an honest Discord card — do not vendor `TiltCheck-ME/DegensAgainstDecency` and do not block Trivia if DA&D has no web client. The Pro overlay in `touch-grass-timeout.ts` adds an iframe to `https://tiltcheck.me/touch-grass?mode=pause`; iframe failure falls back to local prompts; haze and timer stay.

**Tech Stack:** Next.js App Router, Vitest (pure functions + source scans + jsdom overlay), existing Next rewrite `/arena/:path*` → game-arena, Chrome extension content-script overlay.

**Spec:** `docs/superpowers/specs/2026-10-13-touch-grass-games-hub-design.md` (founder-approved 2026-10-13).

## Global Constraints

- Replace the crisis page. Do not stack crisis + games. Do not keep `/touch-grass` as Help.
- V1 titles only: Live Trivia and Degens Against Decency. No Royale, no dad-bot tile, no trivia.live PWA.
- LIVE DROP only when `activeGame` is non-null. Idle copy is honest. Down copy is "round status unknown." Never paint LIVE from stale copy. `soon™` is sarcasm for an empty feed, not a fake countdown.
- Same-origin embeds. Do not iframe Discord Activity on tiltcheck.me.
- Overlay iframes `/touch-grass?mode=pause` during the cover. Closing the iframe does not lift the haze. Duration stays `TOUCH_GRASS_DURATION_MS` (120000). Second trigger while covered still no-ops.
- Pause mode hides treasury, jackpot, `/pay/jackpot`, and join-drop CTAs. No 1-800-GAMBLER in the hub main column. No casino links.
- 1-800-GAMBLER stays on the site footer (`Footer.tsx` / `HOME_LAUNCH.footerDisclaimer`) and legal/how-it-works. Do not remove the footer hotline.
- Guests can land and watch. No new login. No wallet. No custody. No tip rail. No AutoClaimer.
- DA&D Discord-only is allowed: honest "open in Discord" card. Trivia still ships.
- `degens-activity` is not a Railway production surface. Do not rewrite `/touch-grass/trivia` to that Vite app. Port the *views* into Next, fetch status via the existing `/arena` rewrite.
- Fetch round status at `/arena/trivia/status` (Next rewrite to game-arena). Do not invent a second feed. Do not scrape Discord.
- Add `/touch-grass` to `STAY_PREFIXES` so `/touch-grass/trivia` and `/touch-grass/dad` are not 307'd home.
- `/tools/degens-arena` 307s to `/touch-grass/trivia`.
- Do not set `X-Frame-Options: DENY` or `frame-ancestors 'self'` on `/touch-grass*`. Overlay is a third-party iframe on casino origins; our hub must be frameable.
- Overlay iframe is untrusted to the casino. Do not forward casino DOM, cookies, balances, or click events into the hub.
- Core 2s spin lock, chase-warning wiring, Cooldown, `#541`, `#542`, `#555`, `#556`, `#558`, and `@solana/pay` 1.x are out of scope.
- Copyright header on every touched file: `© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13`.
- No emojis. Degen copy. `BrandTagline` on the public hub (not required inside pause chrome — pause hides site footer).
- Atomic docs: `CHANGELOG.md` Unreleased + `docs/SESSION_LOG.md` in the same commit as the code.

---

### Task 1: Round-status mapper (pure)

**Files:**
- Create: `apps/web/src/lib/touch-grass/map-trivia-status.ts`
- Create: `apps/web/src/lib/touch-grass/map-trivia-status.test.ts`

**Interfaces:**

```ts
export type TriviaLiveGame = {
  gameId: string;
  settings: {
    startTime: number;
    theme: string;
    prizePool: number;
  };
};

export type TriviaStatusInput =
  | { ok: false }
  | { ok: true; activeGame: TriviaLiveGame | null };

export type TriviaRoundStatus =
  | { kind: 'live'; drop: { gameId: string; theme: string; startTime: number; prizePool: number; joinHref: '/touch-grass/trivia' }; label: 'LIVE DROP' }
  | { kind: 'idle'; drop: null; label: 'No drop running. Play a practice table or wait.' }
  | { kind: 'unknown'; drop: null; label: 'round status unknown.' };

export function mapTriviaStatus(input: TriviaStatusInput): TriviaRoundStatus;
```

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/lib/touch-grass/map-trivia-status.test.ts
import { describe, expect, it } from 'vitest';
import { mapTriviaStatus } from './map-trivia-status';

describe('mapTriviaStatus', () => {
  it('paints LIVE DROP only when activeGame is present', () => {
    const status = mapTriviaStatus({
      ok: true,
      activeGame: {
        gameId: 'g1',
        settings: { startTime: 1_700_000_000_000, theme: 'RTP trivia', prizePool: 2 },
      },
    });
    expect(status).toEqual({
      kind: 'live',
      label: 'LIVE DROP',
      drop: {
        gameId: 'g1',
        theme: 'RTP trivia',
        startTime: 1_700_000_000_000,
        prizePool: 2,
        joinHref: '/touch-grass/trivia',
      },
    });
  });

  it('idles when the feed returns a null activeGame', () => {
    expect(mapTriviaStatus({ ok: true, activeGame: null }).kind).toBe('idle');
    expect(mapTriviaStatus({ ok: true, activeGame: null }).label).toBe(
      'No drop running. Play a practice table or wait.',
    );
  });

  it('does not invent LIVE when the feed is down', () => {
    const status = mapTriviaStatus({ ok: false });
    expect(status.kind).toBe('unknown');
    expect(status.label).toBe('round status unknown.');
    expect(status.drop).toBeNull();
  });
});
```

Run:

```bash
pnpm exec vitest --run apps/web/src/lib/touch-grass/map-trivia-status.test.ts
```

Expected: FAIL (module missing).

- [ ] **Step 2: Implement the mapper**

Live = `ok && activeGame`. Idle = `ok && activeGame === null`. Unknown = `!ok`. `joinHref` is always `'/touch-grass/trivia'`. Do not read prizePool into `label`.

- [ ] **Step 3: Re-run the test**

```bash
pnpm exec vitest --run apps/web/src/lib/touch-grass/map-trivia-status.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/touch-grass/map-trivia-status.ts apps/web/src/lib/touch-grass/map-trivia-status.test.ts
git commit -m "feat(web): map game-arena trivia status for the Touch Grass hub"
```

---

### Task 2: Nested `/touch-grass/*` must stay public

**Files:**
- Modify: `apps/web/src/lib/public-route-gate.ts`
- Modify: `apps/web/src/lib/public-route-gate.test.ts`

**Why:** `STAY_EXACT` has `/touch-grass` only. `/touch-grass/trivia` and `/touch-grass/dad` currently 307 to `/`.

- [ ] **Step 1: Extend the failing assertions** in `public-route-gate.test.ts`

Add `'/touch-grass/trivia'`, `'/touch-grass/dad'`, `'/touch-grass/trivia/'` to the keep-public list.

Run:

```bash
pnpm exec vitest --run apps/web/src/lib/public-route-gate.test.ts
```

Expected: FAIL on the new paths (redirect home).

- [ ] **Step 2: Add `'/touch-grass'` to `STAY_PREFIXES`**

Keep `STAY_EXACT` entry. Prefix match covers nested shells.

- [ ] **Step 3: Re-run**

```bash
pnpm exec vitest --run apps/web/src/lib/public-route-gate.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/public-route-gate.ts apps/web/src/lib/public-route-gate.test.ts
git commit -m "fix(web): keep nested Touch Grass shells on the public route gate"
```

---

### Task 3: Hub copy + pause-chrome helpers (no page yet)

**Files:**
- Create: `apps/web/src/lib/touch-grass/hub-copy.ts`
- Create: `apps/web/src/lib/touch-grass/hub-copy.test.ts`

**Interfaces:**

```ts
export type TouchGrassMode = 'public' | 'pause';

export function parseTouchGrassMode(search: { get(name: string): string | null }): TouchGrassMode {
  return search.get('mode') === 'pause' ? 'pause' : 'public';
}

export const TOUCH_GRASS_HUB = {
  title: 'Touch Grass',
  lede: 'Casino tab is cooked. Sit at a table that is not a spin.',
  idleSoon: 'No drop running. Play a practice table or wait. soon™',
  triviaPane: 'Live Trivia',
  dadPane: 'Degens Against Decency',
  dadDiscordOnly:
    'Live DA&D still lives in Discord. Practice prompts are here. Open Discord when you want a real table.',
} as const;

export const PAUSE_HIDDEN_CTA_HREFS = ['/pay/jackpot', '/tools/degens-arena'] as const;
export const PAUSE_HIDDEN_CTA_LABELS = ['treasury', 'jackpot', 'join drop', 'Join drop'] as const;

export function shouldShowMoneyCta(mode: TouchGrassMode): boolean {
  return mode === 'public';
}
```

- [ ] **Step 1: Write tests**

Cover: `mode=pause` → `'pause'`; missing/other → `'public'`; `shouldShowMoneyCta('pause') === false`; copy strings contain no `1-800-GAMBLER`; `idleSoon` includes `soon™`.

Run:

```bash
pnpm exec vitest --run apps/web/src/lib/touch-grass/hub-copy.test.ts
```

Expected: FAIL (module missing).

- [ ] **Step 2: Implement `hub-copy.ts`**

No hotline. No casino URLs. Degen, blunt.

- [ ] **Step 3: Re-run — Expected: PASS.**

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/touch-grass/hub-copy.ts apps/web/src/lib/touch-grass/hub-copy.test.ts
git commit -m "feat(web): Touch Grass hub copy and pause-mode flags"
```

---

### Task 4: Replace the crisis page with the hub

**Files:**
- Modify: `apps/web/src/app/touch-grass/page.tsx` (rewrite)
- Create: `apps/web/src/components/touch-grass/TouchGrassHub.tsx`
- Create: `apps/web/src/app/touch-grass/touch-grass-page.test.ts`
- Modify: `apps/web/src/components/SiteChrome.tsx`

**Hub layout (public):**
- Server page reads `searchParams.mode`, passes `parseTouchGrassMode`.
- Client hub fetches `GET /arena/trivia/status`, maps with `mapTriviaStatus`. Fetch throw / non-OK → `{ ok: false }`. JSON `{ activeGame: null }` → idle. JSON `{ activeGame: {...} }` → live.
- Two panes: iframes to `/touch-grass/trivia` and `/touch-grass/dad`. Pause iframes append `?mode=pause`.
- LIVE badge + join link (`status.drop.joinHref`) only when `kind === 'live'` **and** `shouldShowMoneyCta(mode)`.
- Pause: no join-drop, no treasury, no jackpot, no `/pay/jackpot`, no 1-800-GAMBLER.
- Public hub uses existing `SiteChrome` header/footer (footer already has the hotline). Pause hub must **not** render Header/Footer — extend `SiteChrome` with `useSearchParams`: if `pathname === '/touch-grass' && mode=pause` OR pathname is `/touch-grass/trivia` or `/touch-grass/dad`, use the same minimal chrome as `/nuts`.

**Do not** keep crisis tabs, "Stop Playing", "Tell Someone", or `1-800-GAMBLER` in `page.tsx` or `TouchGrassHub.tsx`.

- [ ] **Step 1: Source-scan test** `touch-grass-page.test.ts`

```ts
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const dir = path.dirname(fileURLToPath(import.meta.url));
const page = readFileSync(path.join(dir, 'page.tsx'), 'utf8');
const hub = readFileSync(
  path.resolve(dir, '../../components/touch-grass/TouchGrassHub.tsx'),
  'utf8',
);

describe('touch-grass hub source', () => {
  it('is a games hub, not crisis Help', () => {
    for (const source of [page, hub]) {
      expect(source).not.toContain('1-800-GAMBLER');
      expect(source).not.toContain('Crisis');
      expect(source).not.toContain('TOUCH GRASS PROTOCOL');
      expect(source).not.toContain('Stop Playing');
    }
    expect(hub).toContain('/touch-grass/trivia');
    expect(hub).toContain('/touch-grass/dad');
    expect(hub).toContain('/arena/trivia/status');
  });
});
```

Run:

```bash
pnpm exec vitest --run apps/web/src/app/touch-grass/touch-grass-page.test.ts
```

Expected: FAIL (crisis copy still in `page.tsx`, hub component missing).

- [ ] **Step 2: Implement page + hub + SiteChrome pause/embed chrome**

`page.tsx` can be a server component:

```tsx
import TouchGrassHub from '@/components/touch-grass/TouchGrassHub';
import { parseTouchGrassMode } from '@/lib/touch-grass/hub-copy';

export default async function TouchGrassPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const params = await searchParams;
  const mode = parseTouchGrassMode({ get: (name) => (name === 'mode' ? params.mode ?? null : null) });
  return <TouchGrassHub mode={mode} />;
}
```

Iframe `src` for trivia: `mode === 'pause' ? '/touch-grass/trivia?mode=pause' : '/touch-grass/trivia'`. Same for dad.

SiteChrome: `useSearchParams` is a client hook — already a client component. Hide chrome when:

```ts
function isTouchGrassEmbedPath(pathname: string, mode: string | null): boolean {
  if (pathname === '/touch-grass/trivia' || pathname === '/touch-grass/dad') return true;
  if (pathname === '/touch-grass' && mode === 'pause') return true;
  return false;
}
```

Public `/touch-grass` keeps Header + Footer.

- [ ] **Step 3: Re-run source scan — Expected: PASS.**

Also run:

```bash
pnpm exec vitest --run apps/web/src/lib/public-footer.test.ts
```

Expected: PASS (footer hotline untouched).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/touch-grass/page.tsx apps/web/src/app/touch-grass/touch-grass-page.test.ts apps/web/src/components/touch-grass/TouchGrassHub.tsx apps/web/src/components/SiteChrome.tsx
git commit -m "feat(web): replace Touch Grass crisis page with the games hub"
```

---

### Task 5: Trivia same-origin shell

**Files:**
- Create: `apps/web/src/app/touch-grass/trivia/page.tsx`
- Create: `apps/web/src/components/touch-grass/TriviaPractice.tsx`
- Create: `apps/web/src/lib/touch-grass/practice-deck.ts`
- Create: `apps/web/src/lib/touch-grass/practice-deck.test.ts`
- Create: `apps/web/src/app/touch-grass/trivia/trivia-page.test.ts`

**Behavior:**
- Practice table always works offline from `TRIVIA_QUESTION_BANK` (`@tiltcheck/shared`). Pick one question at a time. Show choices. Reveal. Next.
- If `/arena/trivia/status` is live **and** mode is public, show the LIVE DROP chrome + join copy. Do not add a tip rail or `/pay/jackpot`.
- Pause: practice table only. No join-drop. No prizePool display. No treasury.

Do not port the full degens-activity socket client in v1. Watch + practice is enough. Live answering stays in Discord/activity until a later task.

- [ ] **Step 1: Failing tests**

`practice-deck.test.ts`: `nextPracticeQuestion()` returns `{ id, question, choices }` with `choices.length >= 2`, never includes `answer` on the public object.

`trivia-page.test.ts` source scan: file contains `TriviaPractice`, does not contain `1-800-GAMBLER` or `/pay/jackpot`.

Run:

```bash
pnpm exec vitest --run apps/web/src/lib/touch-grass/practice-deck.test.ts apps/web/src/app/touch-grass/trivia/trivia-page.test.ts
```

Expected: FAIL.

- [ ] **Step 2: Implement deck + page**

Strip `answer` / `explanation` from the object handed to the UI until after submit. Pause uses `parseTouchGrassMode`.

- [ ] **Step 3: Re-run — Expected: PASS.**

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/touch-grass/trivia apps/web/src/components/touch-grass/TriviaPractice.tsx apps/web/src/lib/touch-grass/practice-deck.ts apps/web/src/lib/touch-grass/practice-deck.test.ts
git commit -m "feat(web): same-origin trivia practice shell on /touch-grass/trivia"
```

---

### Task 6: DA&D same-origin shell (Discord-honest)

**Files:**
- Create: `apps/web/src/app/touch-grass/dad/page.tsx`
- Create: `apps/web/src/components/touch-grass/DadPractice.tsx`
- Create: `apps/web/src/lib/touch-grass/dad-deck.ts`
- Create: `apps/web/src/lib/touch-grass/dad-deck.test.ts`
- Create: `apps/web/src/app/touch-grass/dad/dad-page.test.ts`

**Behavior:**
- Local prompt + four white cards. Pick one. Show a dry reveal. Next prompt. No socket. No custody.
- Always include `TOUCH_GRASS_HUB.dadDiscordOnly` and a link to `DISCORD_INVITE_URL` labeled `Open in Discord`. That outbound is not a money CTA; it is allowed in pause.
- No jackpot, no treasury, no `/pay/jackpot`.

- [ ] **Step 1: Failing tests**

Deck returns prompt + `cards.length === 4`. Page source contains `Open in Discord` and `DISCORD_INVITE_URL`, does not contain `1-800-GAMBLER` or `/pay/jackpot`.

- [ ] **Step 2: Implement** — 6–8 in-repo prompts, degen, no emoji.

- [ ] **Step 3: Re-run — Expected: PASS.**

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/touch-grass/dad apps/web/src/components/touch-grass/DadPractice.tsx apps/web/src/lib/touch-grass/dad-deck.ts apps/web/src/lib/touch-grass/dad-deck.test.ts
git commit -m "feat(web): DA&D practice pane with honest Discord outbound"
```

---

### Task 7: Rewire Help labels, sitemap, arena redirect

**Files:**
- Modify: `apps/web/src/app/getting-started/page.tsx`
- Create: `apps/web/src/app/getting-started/getting-started.test.ts` (source scan)
- Modify: `apps/web/src/lib/sitemap-entries.ts`
- Modify: `apps/web/src/lib/sitemap-entries.test.ts`
- Modify: `apps/web/src/lib/tool-registry.ts`
- Modify: `apps/web/next.config.mjs`
- Modify: `apps/web/src/app/pay/jackpot/page.tsx`
- Modify: `apps/web/src/app/legal/limit/page.tsx` (copy only; route still 307s home)
- Modify: `apps/discord-bot/src/commands/touchgrass.ts`

**Copy contracts:**
- Getting-started card that pointed at `/touch-grass`: tag `Play`, title `Touch Grass games hub`, body `Off-ramp tables when the casino tab needs to die. Trivia and DA&D. Not therapy.`, label `Open the hub`. No `Help`. No `Crisis resources`.
- Sitemap `/touch-grass` title can stay `Touch Grass`. Description: `Off-ramp games hub — Live Trivia and Degens Against Decency.` Must not say crisis/help/hotline.
- Tool registry Degens Arena `href` becomes `/touch-grass/trivia`. Description: `Skill-only trivia on the Touch Grass hub.`
- `next.config.mjs` `redirects`: `{ source: '/tools/degens-arena', destination: '/touch-grass/trivia', permanent: false }`.
- Jackpot page "Back to live trivia" → `/touch-grass/trivia`.
- Legal limit: drop "Touch Grass Protocol" as a crisis synonym. Point hotline at `tel:1-800-426-2537` only; if a hub link stays, label it `Touch Grass games hub`.
- Discord `/touchgrass` lockout command stays a 24h lockout. Change the link button label from `Responsible Gambling Resources` to `Touch Grass games hub`. URL stays `https://tiltcheck.me/touch-grass`.

- [ ] **Step 1: Write failing source scans**

`getting-started.test.ts`: source contains `Touch Grass games hub`, does not contain `Crisis resources` as a title.

`sitemap-entries.test.ts`: find `/touch-grass`, expect description match above, expect `description` not to match `/crisis|hotline|1-800/i`.

Run those plus existing sitemap test.

Expected: FAIL.

- [ ] **Step 2: Apply the rewires.** Do not add `/touch-grass` to retired paths.

- [ ] **Step 3: Re-run scans — Expected: PASS.**

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/getting-started apps/web/src/lib/sitemap-entries.ts apps/web/src/lib/sitemap-entries.test.ts apps/web/src/lib/tool-registry.ts apps/web/next.config.mjs apps/web/src/app/pay/jackpot/page.tsx apps/web/src/app/legal/limit/page.tsx apps/discord-bot/src/commands/touchgrass.ts
git commit -m "docs(web): point Help and arena links at the Touch Grass games hub"
```

---

### Task 8: Overlay iframe + CSP fallback

**Files:**
- Modify: `apps/chrome-extension/src/touch-grass-timeout.ts`
- Create: `apps/chrome-extension/tests/unit/touch-grass-timeout.test.ts`

**Contracts (do not change):**
- `TOUCH_GRASS_DURATION_MS === 120_000`
- `overlayActive` still blocks a second trigger
- Escape / overlay chrome clicks still `preventDefault` + `stopPropagation`
- `finish()` still removes the root, unblocks betting, sets `overlayActive = false`
- BREAK_MESSAGES rotation stays

**Add:**

```ts
export const TOUCH_GRASS_HUB_ORIGIN = 'https://tiltcheck.me';
export const TOUCH_GRASS_HUB_PAUSE_PATH = '/touch-grass?mode=pause';
export const HUB_IFRAME_ID = 'tiltcheck-lockdown-hub';

export const CSP_FALLBACK_PROMPTS: readonly string[] = [
  'Stand up. Two minutes of legs, not spins.',
  'Get water. The reel will still be there.',
  'Text a person who does not have a referral code.',
];

export function resolveTouchGrassHubUrl(origin: string = TOUCH_GRASS_HUB_ORIGIN): string {
  return `${origin}${TOUCH_GRASS_HUB_PAUSE_PATH}`;
}
```

Dev: if `globalThis.location?.hostname` is `localhost` or `127.0.0.1`, use `globalThis.location.origin` so local web (3001) works. Production stays `https://tiltcheck.me`.

Iframe: `id=HUB_IFRAME_ID`, `title="Touch Grass games hub"`, `src=resolveTouchGrassHubUrl(...)`, `referrerPolicy="no-referrer"`. Do not pass casino URL, cookies, or postMessage payloads.

On `error` **or** 4s load timeout without `load`: hide iframe, render `CSP_FALLBACK_PROMPTS` in the existing message region (or a dedicated fallback list). Do not call `finish()`. Do not clear the timer.

If the player deletes the iframe node: cover stays (`LOCKDOWN_ROOT_ID` still in DOM, `overlayActive` still true, interval still ticking).

Do not put `stopBlocking` on the iframe element itself in a way that breaks in-frame clicks. Parent chrome stays undismissable. Iframe document events do not bubble.

- [ ] **Step 1: jsdom test** (`@vitest-environment jsdom`)

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  HUB_IFRAME_ID,
  TOUCH_GRASS_DURATION_MS,
  triggerTouchGrassTimeout,
} from '../../src/touch-grass-timeout';

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('triggerTouchGrassTimeout hub iframe', () => {
  it('embeds pause mode and does not change duration', () => {
    expect(TOUCH_GRASS_DURATION_MS).toBe(120_000);
    triggerTouchGrassTimeout('Critical tilt detected.');
    const iframe = document.getElementById(HUB_IFRAME_ID) as HTMLIFrameElement;
    expect(iframe).toBeTruthy();
    expect(iframe.src).toContain('/touch-grass?mode=pause');
  });

  it('keeps the cover if the iframe is torn down', () => {
    triggerTouchGrassTimeout('Critical tilt detected.');
    document.getElementById(HUB_IFRAME_ID)?.remove();
    expect(document.getElementById('tiltcheck-lockdown-root')).toBeTruthy();
  });

  it('falls back to local prompts when the iframe errors', () => {
    triggerTouchGrassTimeout('Critical tilt detected.');
    const iframe = document.getElementById(HUB_IFRAME_ID) as HTMLIFrameElement;
    iframe.dispatchEvent(new Event('error'));
    expect(document.body.textContent).toMatch(/Stand up|Get water|Text a person/);
    expect(document.getElementById('tiltcheck-lockdown-root')).toBeTruthy();
  });
});
```

Run:

```bash
pnpm --filter @tiltcheck/chrome-extension test tests/unit/touch-grass-timeout.test.ts
```

Expected: FAIL (no iframe).

- [ ] **Step 2: Implement iframe + fallback in `triggerTouchGrassTimeout`.** Do not change duration, `overlayActive` short-circuit, or `finish()` dismiss rules.

- [ ] **Step 3: Re-run overlay tests + existing `tests/unit/content.test.ts`.**

Expected: PASS. `content.test.ts` still asserts Core content script does not import `triggerTouchGrassTimeout`.

- [ ] **Step 4: Commit**

```bash
git add apps/chrome-extension/src/touch-grass-timeout.ts apps/chrome-extension/tests/unit/touch-grass-timeout.test.ts
git commit -m "feat(extension): iframe pause hub during Pro Touch Grass cover"
```

---

### Task 9: Optional Playwright smoke

**Files:**
- Create: `tests/e2e/touch-grass-hub.spec.ts`

Only if Task 4–6 are green. Skip if `PLAYWRIGHT_WEB_LOCAL` is unset and you are not in PR e2e. Follow `tests/e2e/discord-login.spec.ts` local pattern.

- [ ] **Step 1: Spec**

Visit `/touch-grass`. Expect two iframes or two pane labels (`Live Trivia`, `Degens Against Decency`). Expect idle or unknown copy (do not stub a live drop). Expect page text not to include `1-800-GAMBLER` in main (footer may still have it on public mode — assert the hero/lede region, not `body`).

Visit `/touch-grass?mode=pause`. Expect no `treasury`, `jackpot`, `/pay/jackpot`, or `Join drop`.

- [ ] **Step 2: Run**

```bash
pnpm exec playwright test tests/e2e/touch-grass-hub.spec.ts
```

If browsers/webServer flake, do not block the feature. Note in the commit message. Source scans remain the gate.

- [ ] **Step 3: Commit if the spec file is useful even when skipped.**

---

### Task 10: Changelog + session log

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `docs/SESSION_LOG.md`

**CHANGELOG Unreleased — Added:**

- `/touch-grass` is the games hub (Live Trivia + Degens Against Decency). Crisis copy lives on the footer/legal only. Pro overlay iframes `?mode=pause` during the cover.

**SESSION_LOG** prepend a 2026-10-13 entry: hub replace, pause iframe, DA&D Discord-honest, no enforcement changes.

- [ ] **Step 1: Edit both files.** No emoji.

- [ ] **Step 2: Commit**

```bash
git add CHANGELOG.md docs/SESSION_LOG.md
git commit -m "docs: log Touch Grass games hub in changelog"
```

---

## Self-review vs spec

| Spec lock | Plan task |
| :--- | :--- |
| Replace crisis page, do not stack | Task 4 |
| Trivia + DA&D only | Tasks 5–6 |
| LIVE only when round is live | Task 1 + 4 |
| Same-origin shells | Tasks 5–6, no Discord Activity iframe |
| Overlay during cover, pause query | Task 8 |
| Pause hides money CTAs | Tasks 3–5 |
| Hotline off the hub, stays footer | Task 4 + footer test |
| DA&D Discord-honest if no web client | Task 6 |
| CSP fallback, cover never dies | Task 8 |
| Getting-started / sitemap / arena one story | Task 7 |
| Out of scope: Core 2s, chase, 541/542, solana/pay 1.x | Global Constraints |

Placeholders: none. `TODO`/`TBD` not used.

Threat notes (carry into PR body): overlay iframe is third-party on casino origins; no DOM/cookie/balance bridge; pause is not a payout surface; rollback = revert hub page + remove overlay iframe; duration/blockers stay.

---

## Execution

Do not start implementation in the same turn as this plan. Founder picks:

1. **Subagent-driven (recommended)** — `superpowers:subagent-driven-development`, one task per subagent, review before next.
2. **Inline** — `superpowers:executing-plans` in this session, task by task with checkpoints.
)
