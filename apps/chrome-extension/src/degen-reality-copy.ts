/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13 */
/**
 * degen-reality-copy.ts
 * Culturally fluent, sharp, witty reality checks and spotter interventions.
 * Speaks the genuine language of players without corporate wellness filler.
 * Strictly non-custodial: purely client-side heuristic copy.
 */

import type { CashoutGoal } from './profit-lock.js';

const GAS_CHECKS = [
  'You just funded 15 gallons of Shell V-Power. Don\'t donate it back to the house on Chicken. Lock the profit and drive away.',
  'Gas tank is full. Cash it out or enjoy walking home when the algorithm regression hits.',
  'Fifty bucks of real unleaded secured. Stop feeding the spin button before you are running on fumes.',
];

const GROCERY_CHECKS = [
  'Real food in the fridge beats watching digital casino chips evaporate in four dead spins. Cash it out or eat instant ramen.',
  'Ribeyes and groceries funded by the casino. Take the bag before the machine reclaims its dinner.',
  'A full grocery run is in your pocket right now. Stop clicking and lock the W before the house eats it back.',
];

const UTILITY_CHECKS = [
  'The electric company doesn\'t accept "I had a gut feeling on Chicken". Pay the power bill or spin in the dark.',
  'Two hundred real dollars keeping the lights on and power bill paid. Lock the profit before 3am-you trades your air conditioning for dead spins.',
  'Power bill secured. The casino wants this back in eight minutes. Don\'t be the degen who gives it to them.',
];

const RENT_CHECKS = [
  'Your landlord does not give a single damn about your slot heater. Cash out before you are sleeping in your Honda.',
  'Rent and major bills funded by the house. 99% of degens rage-dump this back by midnight. Be the 1% who actually walks.',
  'Rent is safe right now. Hit cashout before your dopamine convinces you that you are "due" for a max win.',
];

const GENERAL_PROFIT_CHECKS = [
  'The house math is undefeated—take the profit and close the tab before the regression catches your stack.',
  'You are in profit right now. That win isn\'t skill, it\'s a loan from the casino. Pay yourself before they call in the debt.',
  'The house edge never sleeps, but right now you are up. Be the legend who actually cashes out.',
  '99% of players donate their heater straight back within 15 minutes. Break the cycle and take the W.',
  'The algorithm gave you a winning window. Cash out before the RTP math catches up to your ego.',
];

function pickCheck(options: string[], seedKey: string): string {
  // Deterministic rotation based on string hash to stay varied but stable per goal
  let hash = 0;
  for (let i = 0; i < seedKey.length; i++) {
    hash = (hash << 5) - hash + seedKey.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % options.length;
  return options[idx] ?? options[0]!;
}

/**
 * Returns a culturally fluent reality check tailored to the funded goal.
 */
export function getGoalRealityCheck(goal: CashoutGoal, balance: number): string {
  const normId = (goal.id || '').toLowerCase();
  const normName = (goal.name || '').toLowerCase();

  if (normId.includes('gas') || normName.includes('gas') || normName.includes('fuel')) {
    return pickCheck(GAS_CHECKS, `${goal.id}_${balance}`);
  }
  if (normId.includes('grocer') || normName.includes('grocer') || normName.includes('food')) {
    return pickCheck(GROCERY_CHECKS, `${goal.id}_${balance}`);
  }
  if (normId.includes('rent') || normName.includes('rent') || normName.includes('mortgage') || goal.targetAmount >= 500) {
    return pickCheck(RENT_CHECKS, `${goal.id}_${balance}`);
  }
  if (normId.includes('util') || normId.includes('power') || normName.includes('power') || normName.includes('electric') || normName.includes('util') || normName.includes('bill')) {
    return pickCheck(UTILITY_CHECKS, `${goal.id}_${balance}`);
  }

  const baseCheck = pickCheck(GENERAL_PROFIT_CHECKS, `${goal.id}_${balance}`);
  return `Balance reached $${balance.toFixed(2)}. ${baseCheck}`;
}

/**
 * Culturally fluent copy for the Ratchet Floor intervention modal.
 */
export function getRatchetFloorCopy(peak: number, floor: number, current: number): {
  tag: string;
  title: string;
  bodyHtml: string;
  cashoutBtn: string;
  ackBtn: string;
} {
  return {
    tag: 'Profit-Lock Ratchet Alert',
    title: 'Ratchet Floor Touched',
    bodyHtml: `You ran the bag up to <strong>$${peak.toFixed(2)}</strong> and gave back down to your floor of <strong>$${floor.toFixed(2)}</strong> (current: <strong>$${current.toFixed(2)}</strong>).<br/><br/>The heater is cooling off. 99% of degens rage-spin right here until the account reads zero. Cash out now while you are still ahead. One more spin below this floor drops the 60-second hard brake.`,
    cashoutBtn: 'Lock In Profit at Cashier &rarr;',
    ackBtn: 'I know I am risking it (Next spin drops Hard Brake)',
  };
}

/**
 * Loss-chasing warning copy.
 */
export function getLossChaseCopy(currentStake: number, lastLossStake: number): string {
  return `Last spin lost and you bumped stake from $${lastLossStake.toFixed(2)} to $${currentStake.toFixed(2)}. That is tilt talking, not strategy. The house loves when you double down on an L. Step back.`;
}

/**
 * Gambler's Fallacy due trap copy.
 */
export function getFallacyTrapCopy(deadSpins: number): string {
  return `Gambler's Fallacy Trap: ${deadSpins} dead spins and stake escalated. The RNG has no memory—it does not owe you a bonus. Step away from the button.`;
}

/**
 * Extreme cold streak copy.
 */
export function getExtremeColdCopy(deadSpins: number, hitRate: number): string {
  return `RNG Ice Age: ${deadSpins} consecutive dead spins (hit rate ${hitRate}%). The machine is eating you alive. Stop feeding the grinder.`;
}

/**
 * Consecutive heater alert copy.
 */
export function getHeaterCopy(consecutiveWins: number): string {
  return `Heater Alert: ${consecutiveWins} consecutive wins. The casino did not get sloppy, you just got lucky. Skim the profit before math catches up.`;
}

/**
 * Reality HUD wage-hour equivalence copy.
 */
export function getRealityDrawdownCopy(drawdown: number, hours: number): string {
  const absDrawdown = Math.abs(drawdown);
  if (hours >= 8) {
    return `Reality Check: -$${absDrawdown.toFixed(2)} (${hours.toFixed(1)} hrs of hard work torched). That is an entire damn shift gone to virtual pixels. Close the tab.`;
  }
  return `Reality Check: -$${absDrawdown.toFixed(2)} (${hours.toFixed(1)} hrs of labor torched). You just worked on the clock for the casino to eat it in minutes. Step back.`;
}
