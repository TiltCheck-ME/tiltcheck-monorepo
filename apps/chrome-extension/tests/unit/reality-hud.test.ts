/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04 */
/**
 * @vitest-environment jsdom
 * Reality-Grounding Wage-Hour Equivalence HUD tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clampHourlyWage,
  clampThresholdHours,
  computeWageEquivalence,
  DEFAULT_HOURLY_WAGE,
  DEFAULT_REALITY_THRESHOLD_HOURS,
  formatRealityMessage,
  installRealityHud,
  loadRealityHudOptions,
  REALITY_HUD_ID,
  TILTCHECK_HOURLY_WAGE_KEY,
  TILTCHECK_REALITY_HUD_ENABLED_KEY,
  TILTCHECK_REALITY_THRESHOLD_HOURS_KEY,
} from '../../src/reality-hud.js';

describe('Reality HUD wage equivalence and formatting', () => {
  it('computes wage equivalence correctly', () => {
    expect(computeWageEquivalence(100, 25)).toBe(4);
    expect(computeWageEquivalence(50, 20)).toBe(2.5);
    expect(computeWageEquivalence(0, 25)).toBe(0);
    expect(computeWageEquivalence(-50, 25)).toBe(0);
    expect(computeWageEquivalence(100, 0)).toBe(0);
    expect(computeWageEquivalence(100, -10)).toBe(0);
  });

  it('formats spotter copy for under 8 hours of work', () => {
    const msg = formatRealityMessage(50, 2);
    expect(msg).toBe(
      "Session Drawdown: -$50.00 (2.0 hrs of work torched). Step back."
    );
    expect(msg).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);
  });

  it('formats spotter copy for 8 or more hours of labor (full shift)', () => {
    const msg = formatRealityMessage(200, 8);
    expect(msg).toBe(
      "Session Drawdown: -$200.00 (8.0 hrs of labor torched). That's a full shift gone. Step away."
    );
    expect(msg).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);

    const msg10 = formatRealityMessage(250, 10);
    expect(msg10).toBe(
      "Session Drawdown: -$250.00 (10.0 hrs of labor torched). That's a full shift gone. Step away."
    );
  });

  it('clamps hourly wage between 5 and 2000', () => {
    expect(clampHourlyWage(25)).toBe(25);
    expect(clampHourlyWage(2)).toBe(5);
    expect(clampHourlyWage(5000)).toBe(2000);
    expect(clampHourlyWage('bad')).toBe(DEFAULT_HOURLY_WAGE);
  });

  it('clamps threshold hours between 0.5 and 24', () => {
    expect(clampThresholdHours(2)).toBe(2);
    expect(clampThresholdHours(0.1)).toBe(0.5);
    expect(clampThresholdHours(50)).toBe(24);
    expect(clampThresholdHours('bad')).toBe(DEFAULT_REALITY_THRESHOLD_HOURS);
  });
});

describe('loadRealityHudOptions', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
        },
      },
    });
  });

  it('returns default options when storage is empty', async () => {
    const opts = await loadRealityHudOptions();
    expect(opts.hourlyWage).toBe(DEFAULT_HOURLY_WAGE);
    expect(opts.enabled).toBe(true);
    expect(opts.thresholdHours).toBe(DEFAULT_REALITY_THRESHOLD_HOURS);
  });

  it('loads and clamps stored options', async () => {
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      [TILTCHECK_HOURLY_WAGE_KEY]: 50,
      [TILTCHECK_REALITY_HUD_ENABLED_KEY]: false,
      [TILTCHECK_REALITY_THRESHOLD_HOURS_KEY]: 3,
    });
    const opts = await loadRealityHudOptions();
    expect(opts.hourlyWage).toBe(50);
    expect(opts.enabled).toBe(false);
    expect(opts.thresholdHours).toBe(3);
  });
});

describe('installRealityHud DOM behavior', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('does not display HUD when drawdown is below threshold', () => {
    const balanceEl = document.createElement('div');
    balanceEl.setAttribute('data-test', 'balance');
    balanceEl.textContent = '$500.00';
    document.body.appendChild(balanceEl);

    const handle = installRealityHud(document, { hourlyWage: 25, thresholdHours: 2 });
    expect(handle.getBaseline()).toBe(500);
    expect(handle.isVisible()).toBe(false);
    expect(document.getElementById(REALITY_HUD_ID)).toBeNull();

    // Small drawdown: 500 -> 480 (drawdown 20, < 2 hours * 25 = 50)
    balanceEl.textContent = '$480.00';
    handle.check();
    expect(handle.isVisible()).toBe(false);
    expect(document.getElementById(REALITY_HUD_ID)).toBeNull();
    handle.stop();
  });

  it('displays floating reality HUD when drawdown hits threshold hours', () => {
    const balanceEl = document.createElement('div');
    balanceEl.setAttribute('data-test', 'balance');
    balanceEl.textContent = '$500.00';
    document.body.appendChild(balanceEl);

    const handle = installRealityHud(document, { hourlyWage: 25, thresholdHours: 2 });
    expect(handle.getBaseline()).toBe(500);

    // Large drawdown: 500 -> 440 (drawdown 60 = 2.4 hours >= 2 hours threshold)
    balanceEl.textContent = '$440.00';
    handle.check();

    const hud = document.getElementById(REALITY_HUD_ID);
    expect(hud).not.toBeNull();
    expect(handle.isVisible()).toBe(true);
    expect(hud?.textContent).toContain('Session Drawdown: -$60.00 (2.4 hrs of work torched). Step back.');

    // Verify dark terminal styling and dismiss button
    const dismissBtn = hud?.querySelector('.tiltcheck-reality-hud-dismiss') as HTMLButtonElement | null;
    expect(dismissBtn).not.toBeNull();
    expect(dismissBtn?.textContent).toBe('x');

    // Click dismiss button
    dismissBtn?.click();
    expect(handle.isVisible()).toBe(false);
    expect(hud?.style.display).toBe('none');

    // Slight further drawdown (e.g. 5 more dollars lost) does not re-alert immediately
    balanceEl.textContent = '$435.00';
    handle.check();
    expect(handle.isVisible()).toBe(false);

    // Escalated drawdown (+1 full hour of labor: 60 + 25 = 85 drawdown -> balance 415)
    balanceEl.textContent = '$410.00';
    handle.check();
    expect(handle.isVisible()).toBe(true);
    expect(hud?.style.display).toBe('flex');
    expect(hud?.textContent).toContain('Session Drawdown: -$90.00 (3.6 hrs of work torched). Step back.');

    handle.stop();
    expect(document.getElementById(REALITY_HUD_ID)).toBeNull();
  });

  it('displays full shift message when hours >= 8', () => {
    const handle = installRealityHud(document, { hourlyWage: 25, thresholdHours: 2 });
    handle.setBaseline(1000);

    handle.check(750); // drawdown 250 / 25 = 10.0 hours
    const hud = document.getElementById(REALITY_HUD_ID);
    expect(hud).not.toBeNull();
    expect(hud?.textContent).toContain("Session Drawdown: -$250.00 (10.0 hrs of labor torched). That's a full shift gone. Step away.");

    handle.stop();
  });

  it('raises baseline when player hits profit', () => {
    const handle = installRealityHud(document, { hourlyWage: 25, thresholdHours: 2 });
    handle.setBaseline(500);

    // Win brings balance to 600
    handle.check(600);
    expect(handle.getBaseline()).toBe(600);
    expect(handle.isVisible()).toBe(false);

    // Now drawdown is measured from 600: drop to 540 is 60 drawdown (2.4 hrs)
    handle.check(540);
    expect(handle.isVisible()).toBe(true);
    const hud = document.getElementById(REALITY_HUD_ID);
    expect(hud?.textContent).toContain('Session Drawdown: -$60.00 (2.4 hrs of work torched). Step back.');

    handle.stop();
  });

  it('respects enabled: false', () => {
    const handle = installRealityHud(document, { enabled: false, hourlyWage: 25, thresholdHours: 2 });
    handle.setBaseline(500);
    handle.check(200);
    expect(handle.isVisible()).toBe(false);
    expect(document.getElementById(REALITY_HUD_ID)).toBeNull();
    handle.stop();
  });

  it('updates options mid-session via updateOptions', () => {
    const handle = installRealityHud(document, { hourlyWage: 25, thresholdHours: 2 });
    handle.setBaseline(500);

    // 500 -> 450: drawdown 50, wage 25 => 2 hours => HUD visible
    handle.check(450);
    expect(handle.isVisible()).toBe(true);

    // Update hourly wage to 50: 50 drawdown / 50 wage = 1 hour (< 2 hours threshold) => HUD hides
    handle.updateOptions({ hourlyWage: 50 });
    expect(handle.getOptions().hourlyWage).toBe(50);
    expect(handle.isVisible()).toBe(false);

    // Update threshold to 1 hour: 1 hour >= 1 hour => HUD displays
    handle.updateOptions({ thresholdHours: 1 });
    expect(handle.isVisible()).toBe(true);

    handle.stop();
  });

  it('iterates through multiple candidate elements in readBalance', async () => {
    const { readBalance } = await import('../../src/reality-hud.js');
    const container = document.createElement('div');
    container.className = 'balance-container';
    container.textContent = 'Level 3 Balance Tracker';

    const child = document.createElement('span');
    child.className = 'balance-value';
    child.textContent = '$250.00';
    container.appendChild(child);
    document.body.appendChild(container);

    expect(readBalance(document)).toBe(250);
  });

  it('handles negative drawdown in formatRealityMessage without producing double minus', () => {
    expect(formatRealityMessage(-50, 2)).toBe('Session Drawdown: -$50.00 (2.0 hrs of work torched). Step back.');
  });
});
