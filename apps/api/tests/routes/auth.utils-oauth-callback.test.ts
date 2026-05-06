/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06 */
import { describe, expect, it } from 'vitest';
import {
  isExtensionOAuthCallbackSurface,
  resolveExtensionPostMessageTargetForCallback,
} from '../../src/routes/auth.utils.js';

describe('extension OAuth callback helpers', () => {
  it('resolves opener from oauth_opener_origin cookie', () => {
    const target = resolveExtensionPostMessageTargetForCallback(
      {
        cookies: { oauth_opener_origin: 'chrome-extension://abcdabcdabcdabcdabcdabcdabcdabcd' },
        query: {},
      },
      'ext_any',
    );
    expect(target).toBe('chrome-extension://abcdabcdabcdabcdabcdabcdabcdabcd');
  });

  it('detects extension surface from oauth_source cookie', () => {
    expect(
      isExtensionOAuthCallbackSurface({ cookies: { oauth_source: 'extension' } }, 'nope'),
    ).toBe(true);
  });

  it('detects extension surface from ext_ state prefix', () => {
    expect(isExtensionOAuthCallbackSurface({ cookies: {} }, 'ext_foo_bar')).toBe(true);
  });
});
