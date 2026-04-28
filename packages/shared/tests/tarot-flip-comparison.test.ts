/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-25 */

import { describe, expect, it } from 'vitest';
import {
  compareTarotFlipMechanics,
  parseTarotFlipMechanicsSnapshot,
} from '../src/tarot-flip-comparison.js';

describe('tarot flip comparison', () => {
  it('normalizes equivalent difficulty tables with different field aliases', () => {
    const baseline = {
      gameName: 'Tarot Flip',
      cardCount: 3,
      difficulties: {
        easy: {
          steps: [
            { step: 1, safeCards: 2, hazardCards: 1, multiplier: 1.2, winChance: 0.666667 },
            { step: 2, safeCards: 1, hazardCards: 2, multiplier: 2.1, winChance: 0.333333 },
          ],
        },
      },
    };
    const current = {
      title: 'Tarot Flip',
      deck: { totalCards: 3 },
      difficultyProfiles: [
        {
          id: 'easy',
          rows: [
            { row: 1, goodCards: 2, bombs: 1, payoutMultiplier: 1.2, probability: '66.6667%' },
            { row: 2, goodCards: 1, bombs: 2, payoutMultiplier: 2.1, probability: '33.3333%' },
          ],
        },
      ],
    };

    const result = compareTarotFlipMechanics(baseline, current);

    expect(result.exactMatch).toBe(true);
    expect(result.coverage).toBe('complete');
    expect(result.zeroTrustWarnings).toHaveLength(0);
  });

  it('flags mismatched safe-card and multiplier logic', () => {
    const result = compareTarotFlipMechanics(
      {
        deckSize: 4,
        difficulties: [
          {
            key: 'hard',
            steps: [
              { step: 1, totalCards: 4, safeCards: 1, hazardCards: 3, multiplier: 3.5 },
            ],
          },
        ],
      },
      {
        deckSize: 4,
        difficulties: [
          {
            key: 'hard',
            steps: [
              { step: 1, totalCards: 4, safeCards: 2, hazardCards: 2, multiplier: 2.6 },
            ],
          },
        ],
      },
    );

    expect(result.exactMatch).toBe(false);
    expect(result.differences.some((difference) => difference.path.endsWith('.safeCards'))).toBe(true);
    expect(result.differences.some((difference) => difference.path.endsWith('.multiplier'))).toBe(true);
  });

  it('surfaces zero-trust chance mismatches when declared odds do not match raw card math', () => {
    const snapshot = parseTarotFlipMechanicsSnapshot({
      cardCount: 3,
      difficulties: [
        {
          key: 'medium',
          steps: [
            { step: 1, safeCards: 2, hazardCards: 1, chance: 0.9 },
          ],
        },
      ],
    });

    const result = compareTarotFlipMechanics(snapshot, snapshot);

    expect(result.exactMatch).toBe(true);
    expect(result.zeroTrustWarnings.some((warning) => warning.includes('declared win chance'))).toBe(true);
  });
});
