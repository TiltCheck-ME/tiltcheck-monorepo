// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13

import { describe, expect, it } from 'vitest';
import {
  PAUSE_HIDDEN_CTA_HREFS,
  PAUSE_HIDDEN_CTA_LABELS,
  TOUCH_GRASS_HUB,
  parseTouchGrassMode,
  shouldShowMoneyCta,
} from './hub-copy';

function searchParams(entries: Record<string, string | null>): { get(name: string): string | null } {
  return {
    get(name: string) {
      return entries[name] ?? null;
    },
  };
}

describe('parseTouchGrassMode', () => {
  it('returns pause when mode=pause', () => {
    expect(parseTouchGrassMode(searchParams({ mode: 'pause' }))).toBe('pause');
  });

  it('returns public when mode is missing', () => {
    expect(parseTouchGrassMode(searchParams({}))).toBe('public');
  });

  it('returns public for any other mode value', () => {
    expect(parseTouchGrassMode(searchParams({ mode: 'public' }))).toBe('public');
    expect(parseTouchGrassMode(searchParams({ mode: 'nonsense' }))).toBe('public');
  });
});

describe('shouldShowMoneyCta', () => {
  it('hides money CTAs in pause mode', () => {
    expect(shouldShowMoneyCta('pause')).toBe(false);
  });

  it('shows money CTAs in public mode', () => {
    expect(shouldShowMoneyCta('public')).toBe(true);
  });
});

describe('TOUCH_GRASS_HUB copy', () => {
  const allCopyStrings = Object.values(TOUCH_GRASS_HUB);

  it('idleSoon includes soon™', () => {
    expect(TOUCH_GRASS_HUB.idleSoon).toContain('soon™');
  });

  it('does not embed gambling hotline numbers in hub copy', () => {
    for (const line of allCopyStrings) {
      expect(line).not.toMatch(/1-800-GAMBLER/i);
    }
  });
});

describe('pause chrome constants', () => {
  it('exports hidden href and label lists for pause UI', () => {
    expect(PAUSE_HIDDEN_CTA_HREFS).toEqual(['/pay/jackpot', '/tools/degens-arena']);
    expect(PAUSE_HIDDEN_CTA_LABELS).toEqual(['treasury', 'jackpot', 'join drop', 'Join drop']);
  });
});
