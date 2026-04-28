// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-25

import type { RgsFingerprintProfile } from './types.js';

export const tarotBaselineProfile: RgsFingerprintProfile = {
  label: 'tarot-baseline',
  source: 'baseline',
  generatedAt: '2026-04-25T00:00:00.000Z',
  artifactHints: ['rgsservice.cjs'],
  assetSizeHints: [
    {
      label: 'math-file',
      sizeKb: 7.96,
      toleranceKb: 2.0,
    },
    {
      label: 'frontend-file',
      sizeKb: 225,
      toleranceKb: 35,
    },
  ],
  scriptAssets: [],
  conceptTokens: [
    'tarot',
    'card',
    'cards',
    'flip',
    'deck',
    'difficulty',
    'shuffle',
    'draw',
    'reveal',
    'spread',
  ],
  routeSignatures: [
    'GET /rgs/:id/config',
    'POST /rgs/:id/init',
    'POST /rgs/:id/play',
    'POST /rgs/:id/result',
    'GET /rgs/:id/state',
  ],
  requestBodyKeys: ['bet', 'coinValue', 'deck', 'difficulty', 'sessionId'],
  responseKeys: ['balance', 'cards', 'deck', 'difficulty', 'outcome', 'payout', 'result', 'state'],
  notes: [
    'Baseline uses known public metadata only: math size, frontend size, artifact name, and tarot/card/flip concepts.',
    'Route and payload expectations are generic RGS heuristics to support pattern similarity checks when the original artifact is not present.',
  ],
};
