/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12 */
/**
 * @vitest-environment jsdom
 * "Offer a break when I'm tilting": the extension asks first. No lock without the checkbox
 * ticked AND the lock button pressed; "Not now" buys a quiet period; an accepted offer is a
 * lockSource 'auto_tilt' lock that can only be extended.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveLockUpdate } from '../../src/cooldown-lock.js';

type Mod = typeof import('../../src/tilt-break-offer.js');

const ACTIVE = 'tiltcheck_cooldown_active_until';
const SOURCE = 'tiltcheck_cooldown_source';
const DISMISSED = 'tiltcheck_tilt_offer_dismissed';
const T0 = 1_700_000_000_000;
const MIN = 60_000;

let storage: Record<string, any>;
let sendMessage: ReturnType<typeof vi.fn>;
let mod: Mod;

function q(root: ShadowRoot, id: string) {
  return root.getElementById(id) as HTMLElement & HTMLInputElement & HTMLButtonElement;
}
const flush = () => new Promise((r) => setTimeout(r, 0));

async function offer(tiltRisk: number, at: number) {
  let handle: import('../../src/tilt-break-offer.js').TiltOfferHandle | null = null;
  const pending = mod.maybeOfferTiltBreak({ tiltRisk, now: () => at, onShown: (h) => { handle = h; } });
  for (let i = 0; i < 10 && !handle; i++) await flush();
  return { pending, handle: handle as import('../../src/tilt-break-offer.js').TiltOfferHandle | null };
}

beforeEach(async () => {
  vi.resetModules();
  document.body.innerHTML = '';
  storage = {
    tiltcheck_auto_lock_on_tilt: true,
    tiltcheck_auto_lock_threshold: 75,
    tiltcheck_auto_lock_duration: 86400,
  };
  sendMessage = vi.fn();
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn((keys: string[] | string) => {
          const list = Array.isArray(keys) ? keys : [keys];
          const out: Record<string, any> = {};
          for (const k of list) if (k in storage) out[k] = storage[k];
          return Promise.resolve(out);
        }),
        set: vi.fn((items: Record<string, any>) => { Object.assign(storage, items); return Promise.resolve(); }),
      },
    },
    runtime: { sendMessage },
  });
  mod = await import('../../src/tilt-break-offer.js');
});

describe('tilt break offer', () => {
  it('only offers: showing it writes no lock and sends nothing', async () => {
    const { handle } = await offer(82, T0);
    expect(handle).not.toBeNull();
    expect(document.getElementById(mod.TILT_OFFER_HOST_ID)).not.toBeNull();
    expect(storage[ACTIVE]).toBeUndefined();
    expect(sendMessage).not.toHaveBeenCalled();
    handle!.close();
  });

  it('does not offer below the trigger score or when the setting is off', async () => {
    expect((await mod.maybeOfferTiltBreak({ tiltRisk: 74, now: () => T0 })).outcome).toBe('not_offered');
    storage.tiltcheck_auto_lock_on_tilt = false;
    expect((await mod.maybeOfferTiltBreak({ tiltRisk: 99, now: () => T0 })).outcome).toBe('not_offered');
    expect(document.getElementById(mod.TILT_OFFER_HOST_ID)).toBeNull();
  });

  it('no lock without an explicit tick plus click', async () => {
    const { pending, handle } = await offer(88, T0);
    const root = handle!.root;
    const go = q(root, 'tc-offer-go');
    const check = q(root, 'tc-offer-check');

    // Button starts disabled and says the configured length.
    expect(go.disabled).toBe(true);
    expect(go.getAttribute('aria-disabled')).toBe('true');
    expect(go.textContent).toBe('Lock me out for 1 day');

    // Click without the tick: nothing.
    go.click();
    // Even with `disabled` stripped by something else, the click handler re-checks the box.
    go.disabled = false;
    go.click();
    await flush();
    expect(storage[ACTIVE]).toBeUndefined();
    expect(document.getElementById(mod.TILT_OFFER_HOST_ID)).not.toBeNull();

    // Tick alone: still nothing.
    check.click();
    await flush();
    expect(check.checked).toBe(true);
    expect(go.disabled).toBe(false);
    expect(storage[ACTIVE]).toBeUndefined();
    expect(sendMessage).not.toHaveBeenCalled();

    // Untick, then button: nothing.
    check.click();
    await flush();
    expect(go.disabled).toBe(true);
    go.disabled = false;
    go.click();
    expect(storage[ACTIVE]).toBeUndefined();

    // Tick + click: the lock.
    check.click();
    await flush();
    go.click();
    const res = await pending;
    expect(res.outcome).toBe('accepted');
    expect(storage[ACTIVE]).toBe(T0 + 86400 * 1000);
    expect(storage[SOURCE]).toBe('auto_tilt');
    expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'trigger_tilt_auto_lock',
      userConfirmed: true,
      duration: 86400,
      openPrompt: false,
    }));
    expect(document.getElementById(mod.TILT_OFFER_HOST_ID)).toBeNull();
  });

  it('an accepted offer uses the configured length and can only be extended', async () => {
    storage.tiltcheck_auto_lock_duration = 3 * 86400;
    const { pending, handle } = await offer(90, T0);
    q(handle!.root, 'tc-offer-check').click();
    await flush();
    expect(q(handle!.root, 'tc-offer-go').textContent).toBe('Lock me out for 3 days');
    q(handle!.root, 'tc-offer-go').click();
    await pending;
    const until = T0 + 3 * 86400 * 1000;
    expect(storage[ACTIVE]).toBe(until);
    expect(storage[SOURCE]).toBe('auto_tilt');

    // The page bridge (or anything else) can't shorten it...
    const shorter = resolveLockUpdate({ activeUntil: until, source: 'auto_tilt' }, { endTimeMs: T0 + 3600_000, source: 'dashboard' }, T0 + MIN);
    expect(shorter).toMatchObject({ accept: false, reason: 'cant_shorten', activeUntil: until });
    // ...but can make it longer.
    const longer = resolveLockUpdate({ activeUntil: until, source: 'auto_tilt' }, { endTimeMs: until + 86400_000, source: 'dashboard' }, T0 + MIN);
    expect(longer).toMatchObject({ accept: true, activeUntil: until + 86400_000 });

    // And while it runs, no new offer shows up.
    expect((await mod.maybeOfferTiltBreak({ tiltRisk: 99, now: () => T0 + MIN })).outcome).toBe('not_offered');
  });

  it('"Not now" closes without a lock and starts a 30-minute quiet period', async () => {
    const first = await offer(80, T0);
    q(first.handle!.root, 'tc-offer-not-now').click();
    const res = await first.pending;
    expect(res.outcome).toBe('dismissed');
    expect(storage[ACTIVE]).toBeUndefined();
    expect(storage[DISMISSED]).toEqual({ at: T0, score: 80 });
    expect(document.getElementById(mod.TILT_OFFER_HOST_ID)).toBeNull();

    // 5 and 29 minutes later at a similar score: quiet.
    expect((await mod.maybeOfferTiltBreak({ tiltRisk: 85, now: () => T0 + 5 * MIN })).outcome).toBe('not_offered');
    expect((await mod.maybeOfferTiltBreak({ tiltRisk: 89, now: () => T0 + 29 * MIN })).outcome).toBe('not_offered');
    expect(document.getElementById(mod.TILT_OFFER_HOST_ID)).toBeNull();

    // A new trigger 10+ points higher re-offers inside the quiet period.
    const higher = await offer(90, T0 + 6 * MIN);
    expect(higher.handle).not.toBeNull();
    higher.handle!.close();
    await higher.pending;
    expect(storage[DISMISSED]).toEqual({ at: T0 + 6 * MIN, score: 90 });

    // 30 minutes after the last dismissal, the same score offers again.
    const later = await offer(90, T0 + 36 * MIN);
    expect(later.handle).not.toBeNull();
    later.handle!.close();
    await later.pending;
  });

  it('Esc counts as Not now', async () => {
    const { pending } = await offer(80, T0);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect((await pending).outcome).toBe('dismissed');
    expect(storage[ACTIVE]).toBeUndefined();
  });

  it('is a labelled modal dialog the page cannot reach into, with dry copy', async () => {
    const { handle, pending } = await offer(81, T0);
    const host = document.getElementById(mod.TILT_OFFER_HOST_ID)!;
    expect(host.shadowRoot).toBeNull(); // closed shadow root
    const box = handle!.root.querySelector('[role="dialog"]')!;
    expect(box.getAttribute('aria-modal')).toBe('true');
    expect(box.getAttribute('aria-labelledby')).toBe('tc-offer-title');
    const text = box.textContent || '';
    expect(text).toContain("I know I'm the one choosing this, and I can't undo it.");
    expect(text).toContain('Not now');
    expect(text).toContain('81/100');
    expect(text).not.toMatch(/protect|for your own good|you should|shame|irresponsible|addict/i);
    handle!.close();
    await pending;
  });

  it('formats lengths plainly', () => {
    expect(mod.formatBreakLength(3600)).toBe('1 hour');
    expect(mod.formatBreakLength(12 * 3600)).toBe('12 hours');
    expect(mod.formatBreakLength(86400)).toBe('1 day');
    expect(mod.formatBreakLength(7 * 86400)).toBe('7 days');
    expect(mod.formatBreakLength(36 * 3600)).toBe('36 hours');
  });
});
