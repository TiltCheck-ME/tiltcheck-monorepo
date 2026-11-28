/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-27 */

import { describe, expect, it } from 'vitest';
import { resolveExtensionSurface, surfaceFromLocation } from '../../src/extension-surface.js';

describe('extension surface', () => {
  it('reads the explicit window and side panel modes', () => {
    expect(surfaceFromLocation('?mode=window')).toBe('window');
    expect(surfaceFromLocation('?mode=sidepanel')).toBe('sidepanel');
    expect(surfaceFromLocation('')).toBeNull();
  });

  it('treats a matching side panel context as the docked surface', async () => {
    const href = 'chrome-extension://test/popup.html';
    const surface = await resolveExtensionSurface('', href, async () => [{ documentUrl: href }]);
    expect(surface).toBe('sidepanel');
  });

  it('stays a popup when no side panel context matches this document', async () => {
    const surface = await resolveExtensionSurface('', 'chrome-extension://test/popup.html', async () => [
      { documentUrl: 'chrome-extension://test/other.html' },
    ]);
    expect(surface).toBe('popup');
  });

  it('prefers an explicit mode over context detection', async () => {
    const surface = await resolveExtensionSurface('?mode=window', 'chrome-extension://test/popup.html', async () => [
      { documentUrl: 'chrome-extension://test/popup.html' },
    ]);
    expect(surface).toBe('window');
  });

  it('falls back to the popup when context lookup throws', async () => {
    const surface = await resolveExtensionSurface('', 'chrome-extension://test/popup.html', async () => {
      throw new Error('unavailable');
    });
    expect(surface).toBe('popup');
  });
});
