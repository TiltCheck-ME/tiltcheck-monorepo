// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-25

import { describe, expect, it } from 'vitest';

import { tarotBaselineProfile } from '../tools/rgs-pattern-comparator/baseline-tarot.js';
import {
  buildProfileFromCapture,
  compareProfiles,
  extractBodyKeys,
  normalizeRouteSignature,
} from '../tools/rgs-pattern-comparator/core.js';

describe('rgs pattern comparator', () => {
  it('normalizes route signatures with dynamic ids', () => {
    expect(normalizeRouteSignature('post', 'https://example.com/api/rgs/session/123456/play?mode=real')).toBe(
      'POST /api/rgs/session/:id/play',
    );
  });

  it('extracts nested JSON keys from request bodies', () => {
    expect(
      extractBodyKeys(JSON.stringify({
        sessionId: 'abc',
        wager: {
          difficulty: 'hard',
          deck: {
            cards: 3,
          },
        },
      })),
    ).toEqual(
      expect.arrayContaining([
        'sessionid',
        'wager',
        'wager.difficulty',
        'wager.deck',
        'wager.deck.cards',
        'difficulty',
        'deck',
        'cards',
      ]),
    );
  });

  it('scores a tarot-like capture above medium confidence', () => {
    const targetProfile = buildProfileFromCapture({
      label: 'public-target',
      url: 'https://example.com/tarot-original',
      scriptUrls: [
        'https://cdn.example.com/assets/rgsService.cjs',
        'https://cdn.example.com/assets/main.js',
      ],
      scriptAssets: [
        {
          url: 'https://cdn.example.com/assets/math.js',
          sizeKb: 8.4,
        },
        {
          url: 'https://cdn.example.com/assets/main.js',
          sizeKb: 219.5,
        },
      ],
      routeSignatures: [
        'GET /api/rgs/tarot/config',
        'POST /api/rgs/tarot/init',
        'POST /api/rgs/tarot/play',
        'GET /api/rgs/tarot/state',
      ],
      requestBodyKeys: ['bet', 'difficulty', 'deck', 'sessionId'],
      responseKeys: ['result', 'state', 'cards', 'balance', 'payout', 'difficulty'],
      rawText: 'Tarot Original card flip deck difficulty spread',
    });

    const report = compareProfiles(tarotBaselineProfile, targetProfile);

    expect(report.confidence).toBe('high');
    expect(report.overallScore).toBeGreaterThan(0.75);
    expect(report.matchedPatterns).toEqual(expect.arrayContaining([
      'artifacts:rgsservice.cjs',
      'concept-tokens:tarot',
      'request-body-keys:difficulty',
    ]));
  });

  it('flags weak matches when only cosmetic tarot tokens exist', () => {
    const targetProfile = buildProfileFromCapture({
      label: 'weak-target',
      url: 'https://example.com/tarot-original',
      scriptUrls: ['https://cdn.example.com/assets/frontend.js'],
      scriptAssets: [],
      routeSignatures: ['GET /games/lobby'],
      requestBodyKeys: [],
      responseKeys: [],
      rawText: 'Tarot theme landing page with card art only',
    });

    const report = compareProfiles(tarotBaselineProfile, targetProfile);

    expect(report.confidence).toBe('low');
    expect(report.overallScore).toBeLessThan(0.4);
    expect(report.missingPatterns).toEqual(expect.arrayContaining([
      'artifacts:rgsservice.cjs',
      'route-signatures:POST /rgs/:id/play',
    ]));
  });
});
