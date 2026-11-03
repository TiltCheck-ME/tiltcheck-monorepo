// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-01
import { describe, expect, it } from 'vitest';
import { NUDGE_CATALOG } from './nudge-catalog';

describe('NUDGE_CATALOG', () => {
  it('ships the live Chrome toast strings, not brochure copy', () => {
    const texts = NUDGE_CATALOG.groups.flatMap((group) => group.items.map((item) => item.text));
    expect(texts).toContain('No cap, the balance is still catching that last spin.');
    expect(texts).toContain("No cap, the last one lost and this stake is bigger. That's the chase.");
    expect(texts).toContain('Looks like a heater. Lock half of this win? Skip anytime.');
    expect(NUDGE_CATALOG.lede).toMatch(/rinse/i);
    expect(NUDGE_CATALOG.also ?? []).toEqual([]);
  });
});
