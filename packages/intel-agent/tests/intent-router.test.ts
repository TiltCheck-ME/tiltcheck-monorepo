/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */

import { describe, expect, it } from 'vitest';
import { routeIntelIntent } from '../src/intent-router.js';

describe('routeIntelIntent', () => {
  it('routes scam lookup', () => {
    const intent = routeIntelIntent('is roobet a scam?');
    expect(intent).toEqual({ kind: 'lookup', name: 'roobet', checkScam: true });
  });

  it('routes US crypto list', () => {
    const intent = routeIntelIntent('list of us crypto casinos');
    expect(intent.kind).toBe('list');
    if (intent.kind === 'list') {
      expect(intent.filters.category).toBe('Crypto');
      expect(intent.filters.geo).toBe('us-crypto');
    }
  });

  it('routes personal bonus to login tier', () => {
    const intent = routeIntelIntent('what is my bonus status');
    expect(intent).toEqual({ kind: 'personal', topic: 'bonus' });
  });

  it('routes domain check', () => {
    const intent = routeIntelIntent('check domain stake.com');
    expect(intent).toEqual({ kind: 'domain', domain: 'stake.com' });
  });
});
