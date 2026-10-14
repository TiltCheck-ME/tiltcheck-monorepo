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
  resolveTouchGrassHubUrl,
  TOUCH_GRASS_DURATION_MS,
  TOUCH_GRASS_HUB_ORIGIN,
  triggerTouchGrassTimeout,
} from '../../src/touch-grass-timeout';

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
    expect(document.body.textContent).toMatch(/Stand up|Get water|Text a person/);
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
    for (const prompt of CSP_FALLBACK_PROMPTS) {
      expect(document.body.textContent).toContain(prompt);
    }
  });

  it('does not dismiss the cover when the 4s hub load window elapses', () => {
    vi.useFakeTimers();
    triggerTouchGrassTimeout('Critical tilt detected.');
    vi.advanceTimersByTime(4_000);
    expect(document.getElementById('tiltcheck-lockdown-root')).toBeTruthy();
    expect(document.getElementById('lockdown-timer')).toBeTruthy();
    expect(document.getElementById(HUB_IFRAME_ID)).toBeTruthy();
  });
});
