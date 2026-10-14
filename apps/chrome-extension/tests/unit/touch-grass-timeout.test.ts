/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13 */
/**
 * @vitest-environment jsdom
 * Pro Touch Grass cover — pause-hub iframe + CSP fallback. Timer still owns the leash.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
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
