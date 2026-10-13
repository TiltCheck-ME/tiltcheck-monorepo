// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-12
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  FORBIDDEN_BONUS_TRUST_PLACEHOLDERS,
  resolveBonusTrustBadge,
} from './bonus-trust-badge';

describe('bonus trust badge', () => {
  it('never uses loading placeholders in resolved labels', () => {
    const samples = [
      resolveBonusTrustBadge('Stake.us', []),
      resolveBonusTrustBadge('Totally Fake Casino', []),
      resolveBonusTrustBadge('Pulsz', [{ casinoName: 'Pulsz', currentScore: 88, riskLevel: 'low', events24h: 2 }]),
    ];

    for (const badge of samples) {
      for (const forbidden of FORBIDDEN_BONUS_TRUST_PLACEHOLDERS) {
        expect(badge.label).not.toContain(forbidden);
      }
    }
  });

  it('does not ship forbidden placeholder strings in BonusGrid source', () => {
    const source = readFileSync(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../components/BonusGrid.tsx'),
      'utf8',
    );
    for (const forbidden of FORBIDDEN_BONUS_TRUST_PLACEHOLDERS) {
      expect(source).not.toContain(forbidden);
    }
  });
});
