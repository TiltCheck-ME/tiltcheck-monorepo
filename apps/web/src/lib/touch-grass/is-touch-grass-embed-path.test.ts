// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13

import { describe, expect, it } from 'vitest';
import { isTouchGrassEmbedPath } from './is-touch-grass-embed-path';

describe('isTouchGrassEmbedPath', () => {
  it('treats pause mode as minimal chrome', () => {
    expect(isTouchGrassEmbedPath('/touch-grass', 'pause')).toBe(true);
  });

  it('treats unknown mode as minimal so the fallback cannot flash site chrome', () => {
    expect(isTouchGrassEmbedPath('/touch-grass')).toBe(true);
    expect(isTouchGrassEmbedPath('/touch-grass', undefined)).toBe(true);
  });

  it('lets hydrated public /touch-grass regain Header and Footer', () => {
    expect(isTouchGrassEmbedPath('/touch-grass', null)).toBe(false);
    expect(isTouchGrassEmbedPath('/touch-grass', 'public')).toBe(false);
  });

  it('always embeds trivia and dad shells', () => {
    expect(isTouchGrassEmbedPath('/touch-grass/trivia')).toBe(true);
    expect(isTouchGrassEmbedPath('/touch-grass/trivia', null)).toBe(true);
    expect(isTouchGrassEmbedPath('/touch-grass/dad', 'pause')).toBe(true);
  });

  it('leaves unrelated paths alone', () => {
    expect(isTouchGrassEmbedPath('/nuts')).toBe(false);
    expect(isTouchGrassEmbedPath('/')).toBe(false);
  });
});
