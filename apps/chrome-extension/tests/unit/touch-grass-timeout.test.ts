/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-03 */
/**
 * @vitest-environment jsdom
 * Touch Grass cover — pause-hub iframe + CSP fallback with blunt spotter tone.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BREAK_MESSAGES,
  CSP_FALLBACK_PROMPTS,
  HUB_IFRAME_ID,
  resetTouchGrassTimeoutForTests,
  resolveTouchGrassHubOrigin,
  resolveTouchGrassHubUrl,
  TOUCH_GRASS_DURATION_MS,
  TOUCH_GRASS_HUB_ORIGIN,
  triggerTouchGrassTimeout,
} from '../../src/touch-grass-timeout';

function dispatchHubReady(origin: string = resolveTouchGrassHubOrigin()): void {
  window.dispatchEvent(
    new MessageEvent('message', {
      origin,
      data: { source: 'TILTCHECK_TOUCH_GRASS', ready: true },
    })
  );
}

function fallbackList(): HTMLUListElement {
  return document.querySelector('.tiltcheck-csp-fallback') as HTMLUListElement;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
  resetTouchGrassTimeoutForTests();
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
    expect(iframe.hidden).toBe(true);
    expect(fallbackList().hidden).toBe(false);
    expect(document.getElementById('tiltcheck-lockdown-root')).toBeTruthy();
  });

  it('resolves pause-hub URL without casino payloads', () => {
    expect(resolveTouchGrassHubUrl()).toBe(`${TOUCH_GRASS_HUB_ORIGIN}/touch-grass?mode=pause`);
    expect(resolveTouchGrassHubUrl('http://127.0.0.1:3001')).toBe(
      'http://127.0.0.1:3001/touch-grass?mode=pause'
    );
  });

  it('sets hub iframe chrome without forwarding casino state', () => {
    triggerTouchGrassTimeout('Critical tilt detected.');
    const iframe = document.getElementById(HUB_IFRAME_ID) as HTMLIFrameElement;
    expect(iframe.title).toBe('Touch Grass games hub');
    expect(iframe.referrerPolicy).toBe('no-referrer');
    expect(iframe.src).not.toContain('cookie');
    expect(iframe.src).not.toContain('balance');
  });

  it('no-ops a second trigger while the cover is up', () => {
    triggerTouchGrassTimeout('Critical tilt detected.');
    const first = document.getElementById('tiltcheck-lockdown-root');
    triggerTouchGrassTimeout('Second call must not rebuild.');
    expect(document.getElementById('tiltcheck-lockdown-root')).toBe(first);
    expect(document.body.textContent).not.toContain('Second call must not rebuild.');
  });

  it('keeps the timer running after iframe error fallback', () => {
    triggerTouchGrassTimeout('Critical tilt detected.');
    const iframe = document.getElementById(HUB_IFRAME_ID) as HTMLIFrameElement;
    iframe.dispatchEvent(new Event('error'));
    expect(document.getElementById('lockdown-timer')).toBeTruthy();
    expect(iframe.hidden).toBe(true);
    expect(fallbackList().hidden).toBe(false);
    for (const prompt of CSP_FALLBACK_PROMPTS) {
      expect(fallbackList().textContent).toContain(prompt);
    }
  });

  it('does not treat iframe load as hub success after 4s', () => {
    vi.useFakeTimers();
    triggerTouchGrassTimeout('Critical tilt detected.');
    const iframe = document.getElementById(HUB_IFRAME_ID) as HTMLIFrameElement;
    iframe.dispatchEvent(new Event('load'));
    vi.advanceTimersByTime(4_000);
    expect(document.getElementById('tiltcheck-lockdown-root')).toBeTruthy();
    expect(document.getElementById('lockdown-timer')).toBeTruthy();
    expect(iframe.hidden).toBe(true);
    expect(fallbackList().hidden).toBe(false);
    for (const prompt of CSP_FALLBACK_PROMPTS) {
      expect(fallbackList().textContent).toContain(prompt);
    }
  });

  it('keeps the iframe when an origin-checked ready ping arrives within 4s', () => {
    vi.useFakeTimers();
    triggerTouchGrassTimeout('Critical tilt detected.');
    const iframe = document.getElementById(HUB_IFRAME_ID) as HTMLIFrameElement;
    iframe.dispatchEvent(new Event('load'));
    dispatchHubReady();
    vi.advanceTimersByTime(4_000);
    expect(iframe.hidden).toBe(false);
    expect(fallbackList().hidden).toBe(true);
    expect(document.getElementById('tiltcheck-lockdown-root')).toBeTruthy();
    expect(document.getElementById('lockdown-timer')).toBeTruthy();
  });

  it('rejects a ready ping from a non-hub origin and falls back after 4s', () => {
    vi.useFakeTimers();
    triggerTouchGrassTimeout('Critical tilt detected.');
    dispatchHubReady('https://evil.example');
    vi.advanceTimersByTime(4_000);
    const iframe = document.getElementById(HUB_IFRAME_ID) as HTMLIFrameElement;
    expect(iframe.hidden).toBe(true);
    expect(fallbackList().hidden).toBe(false);
  });

  it('forces fallback on iframe error even after a hub ready ping', () => {
    triggerTouchGrassTimeout('Critical tilt detected.');
    dispatchHubReady();
    const iframe = document.getElementById(HUB_IFRAME_ID) as HTMLIFrameElement;
    iframe.dispatchEvent(new Event('error'));
    expect(iframe.hidden).toBe(true);
    expect(fallbackList().hidden).toBe(false);
    expect(document.getElementById('tiltcheck-lockdown-root')).toBeTruthy();
    expect(document.getElementById('lockdown-timer')).toBeTruthy();
  });
});

describe('spotter tone and copy integrity', () => {
  it('delivers witty blunt spotter messages without moralizing lecture', () => {
    expect(BREAK_MESSAGES).toContain(
      "You are down 60% in 9 minutes. You are not on a heater, you're chasing. Close the tab."
    );
    expect(BREAK_MESSAGES).toContain(
      "Ed Craven doesn't need your rent money. Close the browser."
    );
    expect(BREAK_MESSAGES).toContain(
      "That's 14 dead spins on Hacksaw. You already know how this movie ends."
    );
    expect(BREAK_MESSAGES).toContain(
      "You're playing a 94.5% downgraded RTP tier on an offshore mirror thinking it's 96.5%."
    );

    // Verify absence of clinical/HR prefrontal cortex preaching
    for (const msg of BREAK_MESSAGES) {
      expect(msg).not.toMatch(/prefrontal cortex/i);
      expect(msg).not.toMatch(/amygdala/i);
      expect(msg).not.toMatch(/hijacked/i);
    }
  });

  it('renders spotter headline and spotter protocol footer', () => {
    triggerTouchGrassTimeout("You are down 60% in 9 minutes. You are not on a heater, you're chasing. Close the tab.");
    const root = document.getElementById('tiltcheck-lockdown-root');
    expect(root?.querySelector('.tiltcheck-lockdown-headline')?.textContent).toBe('Hold up. Recalibrate.');
    expect(root?.querySelector('.tiltcheck-signal-label')?.textContent).toBe('Spotter Signal');
    expect(root?.querySelector('.tiltcheck-lockdown-foot')?.textContent).toContain('Spotter protocol active.');
  });
});

