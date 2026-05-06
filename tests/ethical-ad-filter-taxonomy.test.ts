// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06

import { describe, expect, it } from 'vitest';

import {
  ETHICAL_AD_FILTER_CATEGORIES,
  ETHICAL_AD_FILTER_CATEGORY_DEFINITIONS,
  ETHICAL_AD_FILTER_TIERS,
  ETHICAL_AD_FILTER_TIER_DEFINITIONS,
} from '../packages/types/src/index.js';

describe('ethical ad filter taxonomy', () => {
  it('defines the v1 enforcement tiers', () => {
    expect(ETHICAL_AD_FILTER_TIERS).toEqual(['block', 'blur', 'allow_log']);
    expect(Object.keys(ETHICAL_AD_FILTER_TIER_DEFINITIONS)).toEqual([...ETHICAL_AD_FILTER_TIERS]);
  });

  it('defines 3 to 7 categories with definitions and examples', () => {
    expect(ETHICAL_AD_FILTER_CATEGORIES.length).toBeGreaterThanOrEqual(3);
    expect(ETHICAL_AD_FILTER_CATEGORIES.length).toBeLessThanOrEqual(7);
    expect(ETHICAL_AD_FILTER_CATEGORY_DEFINITIONS).toHaveLength(ETHICAL_AD_FILTER_CATEGORIES.length);

    for (const category of ETHICAL_AD_FILTER_CATEGORY_DEFINITIONS) {
      expect(ETHICAL_AD_FILTER_CATEGORIES).toContain(category.slug);
      expect(ETHICAL_AD_FILTER_TIERS).toContain(category.defaultTier);
      expect(category.definition.length).toBeGreaterThan(24);
      expect(category.examples.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('covers block, blur, and allow+log policy handling', () => {
    const defaultTiers = new Set(ETHICAL_AD_FILTER_CATEGORY_DEFINITIONS.map((category) => category.defaultTier));

    expect(defaultTiers).toEqual(new Set(ETHICAL_AD_FILTER_TIERS));
  });
});
