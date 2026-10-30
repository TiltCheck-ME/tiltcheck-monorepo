/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-28 */
/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { readPresenceGameTitle, sanitizePresenceTitle } from '../../src/presence-game-title.js';

describe('presence game title', () => {
  it('reads a slug from the URL and never keeps amounts', () => {
    const loc = { pathname: '/casino/slots/le-vampire', href: 'https://stake.com/casino/slots/le-vampire' } as Location;
    expect(readPresenceGameTitle(loc, document)).toBe('le vampire');
    expect(sanitizePresenceTitle('won $62 on Le Vampire')).toBeNull();
    expect(sanitizePresenceTitle('heater 1000x')).toBeNull();
  });
});
