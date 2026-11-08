/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08 */
/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import {
  getGoalRealityCheck,
  getRatchetFloorCopy,
  getLossChaseCopy,
  getFallacyTrapCopy,
  getExtremeColdCopy,
  getHeaterCopy,
  getRealityDrawdownCopy,
} from '../../src/degen-reality-copy.js';
import type { CashoutGoal } from '../../src/profit-lock.js';

describe('degen-reality-copy culturally fluent wit and reality checking', () => {
  it('generates distinct, witty reality checks tailored to specific bills', () => {
    const gasGoal: CashoutGoal = {
      id: 'gas_50',
      name: 'Full Tank of Gas',
      targetAmount: 50,
      metric: 'balance',
      enabled: true,
    };
    const groceryGoal: CashoutGoal = {
      id: 'groceries_100',
      name: 'Groceries & Essentials',
      targetAmount: 100,
      metric: 'balance',
      enabled: true,
    };
    const utilityGoal: CashoutGoal = {
      id: 'utility_200',
      name: 'Utility / Power Bill',
      targetAmount: 200,
      metric: 'balance',
      enabled: true,
    };
    const rentGoal: CashoutGoal = {
      id: 'rent_600',
      name: 'Rent / Major Bill',
      targetAmount: 600,
      metric: 'balance',
      enabled: true,
    };

    const gasText = getGoalRealityCheck(gasGoal, 55);
    expect(gasText).toMatch(/gas|fuel|unleaded|chicken/i);
    expect(gasText).not.toContain('electronic casino chips into real-world peace of mind');

    const groceryText = getGoalRealityCheck(groceryGoal, 110);
    expect(groceryText).toMatch(/grocer|food|dinner|fridge/i);
    expect(groceryText).not.toContain('electronic casino chips into real-world peace of mind');

    const utilText = getGoalRealityCheck(utilityGoal, 220);
    expect(utilText).toMatch(/electric|power|bill|dark/i);
    expect(utilText).not.toContain('electronic casino chips into real-world peace of mind');

    const rentText = getGoalRealityCheck(rentGoal, 650);
    expect(rentText).toMatch(/rent|landlord|honda|car/i);
    expect(rentText).not.toContain('electronic casino chips into real-world peace of mind');
  });

  it('generates sharp degen reality checks for custom or unnamed goals', () => {
    const customGoal: CashoutGoal = {
      id: 'custom_heater',
      name: 'Weekend Stack',
      targetAmount: 300,
      metric: 'profit',
      enabled: true,
    };

    const customText = getGoalRealityCheck(customGoal, 350);
    expect(customText).toContain('Balance reached $350.00');
    expect(customText).toMatch(/house|degen|loan|math|profit/i);
  });

  it('provides punchy, degen-fluent copy for Ratchet Floor intervention modal', () => {
    const copy = getRatchetFloorCopy(500, 300, 290);
    expect(copy.title).toContain('Ratchet Floor Touched');
    expect(copy.bodyHtml).toContain('500.00');
    expect(copy.bodyHtml).toContain('300.00');
    expect(copy.bodyHtml).toContain('99% of degens rage-spin');
    expect(copy.cashoutBtn).toContain('Lock In Profit');
    expect(copy.ackBtn).toContain('I know I am risking it');
  });

  it('formats loss chasing escalation with real degen accountability', () => {
    const text = getLossChaseCopy(20, 10);
    expect(text).toContain('$10.00 to $20.00');
    expect(text).toContain('That is tilt talking');
    expect(text).toContain('double down on an L');
  });

  it('formats Gambler\'s Fallacy and streak alerts without emojis', () => {
    const fallacy = getFallacyTrapCopy(12);
    expect(fallacy).toContain('Gambler\'s Fallacy Trap: 12 dead spins');
    expect(fallacy).toContain('RNG has no memory');
    expect(fallacy).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);

    const cold = getExtremeColdCopy(20, 15);
    expect(cold).toContain('RNG Ice Age: 20 consecutive dead spins');
    expect(cold).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);

    const heater = getHeaterCopy(5);
    expect(heater).toContain('Heater Alert: 5 consecutive wins');
    expect(heater).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);
  });

  it('formats Reality HUD drawdown with labor shift reality checks', () => {
    const shortShift = getRealityDrawdownCopy(-75, 3);
    expect(shortShift).toContain('Reality Check: -$75.00 (3.0 hrs of labor torched)');
    expect(shortShift).toContain('Step back');

    const fullShift = getRealityDrawdownCopy(-250, 10);
    expect(fullShift).toContain('Reality Check: -$250.00 (10.0 hrs of hard work torched)');
    expect(fullShift).toContain('entire damn shift gone');
  });
});
