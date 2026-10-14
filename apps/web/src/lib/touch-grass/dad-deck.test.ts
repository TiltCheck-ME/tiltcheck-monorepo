// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13

import { describe, expect, it } from 'vitest';
import { DAD_PROMPTS, nextDadHand } from './dad-deck';

describe('nextDadHand', () => {
  it('returns a prompt and four white cards', () => {
    const hand = nextDadHand();

    expect(hand.prompt).toEqual(expect.any(String));
    expect(hand.prompt.length).toBeGreaterThan(0);
    expect(hand.cards).toHaveLength(4);
    for (const card of hand.cards) {
      expect(card).toEqual(expect.any(String));
      expect(card.length).toBeGreaterThan(0);
    }
  });

  it('keeps six to eight in-repo prompts with no emoji', () => {
    expect(DAD_PROMPTS.length).toBeGreaterThanOrEqual(6);
    expect(DAD_PROMPTS.length).toBeLessThanOrEqual(8);
    for (const prompt of DAD_PROMPTS) {
      expect(prompt).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});
