/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04 */
/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  calculateBonusProgress,
  calculateTargetWager,
  isBetExceedingMax,
  sanitizeBonusConfig,
  installBonusTracker,
  BONUS_HUD_ID,
  BONUS_TRAP_ALARM_ID,
  BONUS_COMPLETE_MODAL_ID,
  DEFAULT_BONUS_TRACKER_CONFIG,
  type BonusTrackerConfig,
} from '../../src/bonus-tracker.js';

describe('bonus-tracker calculations and sanitization', () => {
  it('calculates bonus progress and completion accurately', () => {
    expect(calculateBonusProgress(0, 1000)).toEqual({
      percent: 0,
      remaining: 1000,
      isComplete: false,
    });

    expect(calculateBonusProgress(500, 1000)).toEqual({
      percent: 50,
      remaining: 500,
      isComplete: false,
    });

    expect(calculateBonusProgress(725, 1000)).toEqual({
      percent: 72.5,
      remaining: 275,
      isComplete: false,
    });

    expect(calculateBonusProgress(1000, 1000)).toEqual({
      percent: 100,
      remaining: 0,
      isComplete: true,
    });

    expect(calculateBonusProgress(1200, 1000)).toEqual({
      percent: 100,
      remaining: 0,
      isComplete: true,
    });

    expect(calculateBonusProgress(100, 0)).toEqual({
      percent: 100,
      remaining: 0,
      isComplete: true,
    });
  });

  it('computes target wager from deposit, bonus, and multiplier', () => {
    // 100% match on $100 ($200 total) at 35x = $7,000
    expect(calculateTargetWager(100, 100, 35)).toBe(7000);

    // $50 deposit with no bonus, 1x rollover = $50
    expect(calculateTargetWager(50, 0, 1)).toBe(50);

    // Negative values handled gracefully
    expect(calculateTargetWager(-10, 50, 20)).toBe(1000);
  });

  it('detects when bet exceeds promotional max limit', () => {
    expect(isBetExceedingMax(4.5, 5)).toBe(false);
    expect(isBetExceedingMax(5.0, 5)).toBe(false);
    expect(isBetExceedingMax(5.01, 5)).toBe(true);
    expect(isBetExceedingMax(10.0, 5)).toBe(true);
    expect(isBetExceedingMax(10.0, 0)).toBe(false); // 0 = no limit
  });

  it('sanitizes bonus config safely', () => {
    expect(sanitizeBonusConfig(null)).toEqual(DEFAULT_BONUS_TRACKER_CONFIG);
    expect(sanitizeBonusConfig('invalid')).toEqual(DEFAULT_BONUS_TRACKER_CONFIG);

    const partial = {
      active: true,
      bonusName: 'Stake Welcome 200%',
      targetWager: 5000,
      currentWagered: 1250,
      maxBetLimit: 10,
    };
    const sanitized = sanitizeBonusConfig(partial);
    expect(sanitized.active).toBe(true);
    expect(sanitized.bonusName).toBe('Stake Welcome 200%');
    expect(sanitized.targetWager).toBe(5000);
    expect(sanitized.currentWagered).toBe(1250);
    expect(sanitized.maxBetLimit).toBe(10);
    expect(sanitized.blockExceededBets).toBe(true);
  });
});

describe('installBonusTracker DOM HUD and event interception', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('renders HUD when config.active is true and removes on stop()', () => {
    const config: BonusTrackerConfig = {
      active: true,
      bonusName: 'VIP Reload',
      targetWager: 2000,
      currentWagered: 400,
      maxBetLimit: 5,
      blockExceededBets: true,
    };

    const handle = installBonusTracker(document, config);
    const hud = document.getElementById(BONUS_HUD_ID);
    expect(hud).not.toBeNull();
    expect(hud?.textContent).toContain('VIP Reload');
    expect(hud?.textContent).toContain('20.0%');
    expect(hud?.textContent).toContain('$400.00 / $2000.00');
    expect(hud?.textContent).toContain('Max: $5.00');

    handle.stop();
    expect(document.getElementById(BONUS_HUD_ID)).toBeNull();
  });

  it('does not render HUD when config.active is false', () => {
    const handle = installBonusTracker(document, { active: false });
    expect(document.getElementById(BONUS_HUD_ID)).toBeNull();
    handle.stop();
  });

  it('accumulates wagered amount on recordBet and updates HUD', () => {
    const onUpdate = vi.fn();
    const handle = installBonusTracker(
      document,
      {
        active: true,
        targetWager: 100,
        currentWagered: 0,
        maxBetLimit: 5,
      },
      onUpdate
    );

    handle.recordBet(2.5);
    expect(handle.getConfig().currentWagered).toBe(2.5);
    expect(handle.getProgress().percent).toBe(2.5);
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ currentWagered: 2.5 }));

    handle.recordBet(2.5);
    expect(handle.getConfig().currentWagered).toBe(5.0);

    handle.stop();
  });

  it('triggers completion modal when rollover reaches 100%', () => {
    const handle = installBonusTracker(document, {
      active: true,
      targetWager: 100,
      currentWagered: 98,
      maxBetLimit: 5,
    });

    expect(document.getElementById(BONUS_COMPLETE_MODAL_ID)).toBeNull();

    handle.recordBet(2.5);
    expect(handle.getProgress().isComplete).toBe(true);

    const modal = document.getElementById(BONUS_COMPLETE_MODAL_ID);
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain('Rollover 100% Complete');
    expect(modal?.textContent).toContain('Bonus Cleared to Real Cash');

    handle.stop();
  });

  it('triggers max-bet trap alarm when bet exceeds limit', () => {
    const handle = installBonusTracker(document, {
      active: true,
      targetWager: 1000,
      currentWagered: 0,
      maxBetLimit: 5,
    });

    handle.recordBet(10); // Exceeds $5 limit
    expect(handle.getConfig().currentWagered).toBe(0); // Should not accumulate violating bet

    const alarm = document.getElementById(BONUS_TRAP_ALARM_ID);
    expect(alarm).not.toBeNull();
    expect(alarm?.textContent).toContain('Stake Exceeds Max Bet Limit');
    expect(alarm?.textContent).toContain('$10.00');
    expect(alarm?.textContent).toContain('$5.00');

    handle.stop();
  });

  it('intercepts spin button clicks when stake exceeds max bet and blockExceededBets is true', () => {
    const handle = installBonusTracker(document, {
      active: true,
      targetWager: 1000,
      currentWagered: 0,
      maxBetLimit: 5,
      blockExceededBets: true,
    });

    // Create bet input and spin button
    const betInput = document.createElement('input');
    betInput.className = 'bet-amount';
    betInput.value = '10.00';
    document.body.appendChild(betInput);

    const spinBtn = document.createElement('button');
    spinBtn.setAttribute('data-action', 'spin');
    document.body.appendChild(spinBtn);

    const clickSpy = vi.fn();
    spinBtn.addEventListener('click', clickSpy);

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    spinBtn.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(document.getElementById(BONUS_TRAP_ALARM_ID)).not.toBeNull();

    handle.stop();
  });

  it('resets progress on resetProgress()', () => {
    const handle = installBonusTracker(document, {
      active: true,
      targetWager: 1000,
      currentWagered: 450,
    });

    expect(handle.getConfig().currentWagered).toBe(450);
    handle.resetProgress();
    expect(handle.getConfig().currentWagered).toBe(0);
    expect(handle.getProgress().percent).toBe(0);

    handle.stop();
  });
});
