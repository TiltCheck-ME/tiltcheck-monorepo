/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-28 */
import { describe, expect, it } from 'vitest';
import { matchExclusion } from '../../src/exclusion-taxonomy.js';

describe('exclusion taxonomy', () => {
  it('does not block anything until the user lists it', () => {
    expect(matchExclusion('/casino/games/chicken-road', [], [])).toBeNull();
    expect(matchExclusion('/casino/slots/sweet-bonanza', [], ['chicken_mines'])).toBeNull();
  });

  it('blocks chicken URLs when the chicken category is armed, and leaves slots alone', () => {
    expect(matchExclusion('/casino/games/chicken-road', [], ['chicken_mines'])).toEqual({
      kind: 'category',
      value: 'chicken_mines',
    });
    expect(matchExclusion('/casino/slots/sweet-bonanza', [], ['chicken_mines'])).toBeNull();
    expect(matchExclusion('/casino/slots/sweet-bonanza', [], ['slots'])).toEqual({
      kind: 'category',
      value: 'slots',
    });
  });

  it('matches a single game slug from user config', () => {
    expect(matchExclusion('/casino/games/le-vampire', ['le-vampire'], [])).toEqual({
      kind: 'slug',
      value: 'le-vampire',
    });
    expect(matchExclusion('/casino/games/le-vampire', ['plinko'], [])).toBeNull();
  });
});
