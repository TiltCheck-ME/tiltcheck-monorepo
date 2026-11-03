/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-28 */
/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest';
import { detectHeater, installHeaterNudge, HEATER_TOAST_TEXT } from '../../src/heater-nudge.js';
import { installSpinPaceLock, PACE_HOST_ID } from '../../src/spin-pace-lock.js';

const stops: Array<() => void> = [];

describe('private heater nudge', () => {
  afterEach(() => {
    for (const stop of stops) stop();
    stops.length = 0;
    document.body.innerHTML = '';
  });

  it('detects a session uptick without publishing it', () => {
    expect(detectHeater(100, 106)).toBe(true);
    expect(detectHeater(100, 101)).toBe(false);
  });

  it('only arms after a spin click, not after typing, and stays skippable', () => {
    const pace = installSpinPaceLock();
    stops.push(pace.stop);
    const handle = installHeaterNudge();
    stops.push(handle.stop);
    const chat = document.createElement('textarea');
    document.body.appendChild(chat);
    chat.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'wen heater' }));
    expect(handle.armed()).toBe(false);

    const balance = document.createElement('div');
    balance.setAttribute('data-balance', '1');
    balance.textContent = '100';
    document.body.appendChild(balance);
    const spin = document.createElement('button');
    spin.className = 'spin-button';
    document.body.appendChild(spin);
    spin.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    balance.textContent = '200';
    spin.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById(PACE_HOST_ID)?.shadowRoot?.textContent).toContain(HEATER_TOAST_TEXT);
  });
});
