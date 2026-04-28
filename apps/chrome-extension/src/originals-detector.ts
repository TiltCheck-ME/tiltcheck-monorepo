/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */
/**
 * Originals Mode — game-type-aware tilt detection layer.
 *
 * Detects when the player is inside an "Originals" game (Chicken, Crash/Pump,
 * Mines, Limbo, Plinko) from the page URL, pathname, and document title, then
 * returns a tighter set of tilt-detection thresholds for that game type.
 *
 * These games exploit the Illusion of Control: the player makes active decisions
 * (when to cash out, which tile to click) which tricks the brain into believing
 * skill is involved.  That produces:
 *   - Machine-gun click storms (< 200–400 ms between actions)
 *   - Greed creep (holding past the player's own historical average cash-out)
 *   - Martingale acceleration faster than in table games
 *
 * This module is intentionally side-effect-free — it reads the DOM but never
 * mutates it.  All threshold decisions stay in TiltDetector.
 */

export type OriginalsGameType =
  | 'chicken_mines'
  | 'crash_pump'
  | 'limbo'
  | 'plinko'
  | 'none';

export interface OriginalsConfig {
  gameType: OriginalsGameType;
  /** Click-Storm threshold: minimum ms between bet actions before Auto-Pilot fires */
  clickDeltaMs: number;
  /** Greed multiplier: how far above the player's avg cash-out before a greed warning */
  greedMultiplier: number;
  /** Martingale floor: minimum bet-increase ratio to count as a martingale step */
  martingaleFloor: number;
  /** Velocity factor: multiplier on velocity-spike threshold (lower = more sensitive) */
  velocityFactor: number;
}

export const ORIGINALS_CONFIGS: Record<OriginalsGameType, OriginalsConfig> = {
  chicken_mines: {
    gameType: 'chicken_mines',
    clickDeltaMs: 400,    // Chicken: clicks are slower (deliberate tile choice)
    greedMultiplier: 3.0, // Warn when multiplier > 3x user's average cash-out
    martingaleFloor: 1.5, // Chicken bets tend to creep slower
    velocityFactor: 0.7,  // 30% more sensitive velocity spike
  },
  crash_pump: {
    gameType: 'crash_pump',
    clickDeltaMs: 200,    // Pump: machine-gun clicking, < 200ms = trance state
    greedMultiplier: 2.5, // Crash: warn when holding past 2.5x avg cash-out
    martingaleFloor: 1.7,
    velocityFactor: 0.5,  // 50% more sensitive — crash games have zero cooldown
  },
  limbo: {
    gameType: 'limbo',
    clickDeltaMs: 250,
    greedMultiplier: 5.0, // Limbo targets are set higher
    martingaleFloor: 1.8,
    velocityFactor: 0.6,
  },
  plinko: {
    gameType: 'plinko',
    clickDeltaMs: 500,    // Plinko: ball-drop delay means slower clicks
    greedMultiplier: 4.0,
    martingaleFloor: 1.5,
    velocityFactor: 0.8,
  },
  none: {
    gameType: 'none',
    clickDeltaMs: 300,    // default (strategy doc baseline)
    greedMultiplier: 3.0,
    martingaleFloor: 1.7,
    velocityFactor: 1.0,  // standard sensitivity
  },
};

/**
 * URL/DOM keyword map per game type.
 * Order matters inside detectOriginalsGame: more-specific types are checked before
 * less-specific ones so "limbo" is not consumed by crash_pump's keyword list.
 */
const ORIGINALS_KEYWORDS: Array<[OriginalsGameType, string[]]> = [
  ['chicken_mines', ['chicken', 'mines', 'minefield']],
  ['plinko',        ['plinko']],
  ['limbo',         ['limbo']],
  ['crash_pump',    ['crash', 'pump', 'aviator', 'jetx', 'spaceman']],
];

/**
 * Detect which Originals game is currently active from the page URL and DOM title.
 * Returns 'none' when the current page is not a recognised Originals game.
 */
export function detectOriginalsGame(): OriginalsGameType {
  const searchable = (
    window.location.pathname +
    window.location.search +
    document.title
  ).toLowerCase();

  for (const [gameType, keywords] of ORIGINALS_KEYWORDS) {
    if (keywords.some((kw) => searchable.includes(kw))) {
      return gameType;
    }
  }
  return 'none';
}

/**
 * Return the full OriginalsConfig for the game that is currently active on this page.
 * Returns the 'none' config when the page is not an Originals game.
 */
export function getOriginalsConfig(): OriginalsConfig {
  return ORIGINALS_CONFIGS[detectOriginalsGame()];
}
