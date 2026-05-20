/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-20 */
import { describe, expect, it } from 'vitest';
import {
  addCustomSlug,
  clampDurationMs,
  clampRisk,
  formatDurationLabel,
  riskLabel,
  toggleSlugInList,
} from '../../src/popup-settings.js';

describe('popup-settings helpers', () => {
  it('clamps risk and duration', () => {
    expect(clampRisk(40)).toBe(50);
    expect(clampRisk(120)).toBe(100);
    expect(clampDurationMs(10_000)).toBe(30_000);
    expect(clampDurationMs(999_999)).toBe(300_000);
  });

  it('toggles slugs with normalization', () => {
    const first = toggleSlugInList([], 'Plinko');
    expect(first).toEqual(['plinko']);
    const second = toggleSlugInList(first, 'plinko');
    expect(second).toEqual([]);
  });

  it('adds custom slugs safely', () => {
    expect(addCustomSlug(['mines'], '  Keno  ')).toEqual(['mines', 'keno']);
    expect(addCustomSlug(['mines'], '!!!')).toEqual(['mines']);
  });

  it('formats labels', () => {
    expect(formatDurationLabel(90_000)).toBe('1m 30s');
    expect(riskLabel(55)).toBe('Strict');
  });
});
