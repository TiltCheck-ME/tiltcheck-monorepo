// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-02
/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installLoungeOverlay } from '../../src/lounge-overlay.js';

function stubChromeStorage(data: Record<string, unknown> = {}) {
  (globalThis as unknown as { chrome: unknown }).chrome = {
    storage: {
      local: {
        get: vi.fn().mockImplementation((keys: string[]) => {
          const res: Record<string, unknown> = {};
          for (const k of keys) {
            res[k] = data[k];
          }
          return Promise.resolve(res);
        }),
        set: vi.fn().mockResolvedValue(undefined),
      },
    },
  };
}

describe('installLoungeOverlay (EXT-4)', () => {
  let doc: Document;
  let teardown: (() => void) | null = null;

  beforeEach(() => {
    stubChromeStorage();
    doc = document.implementation.createHTMLDocument('test');
    teardown = null;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (teardown) {
      teardown();
      teardown = null;
    }
    vi.restoreAllMocks();
  });

  it('does not mount into doc.body when the lounge server is offline', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    teardown = installLoungeOverlay(doc);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(doc.getElementById('tiltcheck-lounge-host')).toBeNull();
  });

  it('mounts into doc.body when the lounge server is online', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/lounge/state')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              tagline: 'Test room',
              messages: [],
              presence: [],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);
    });

    teardown = installLoungeOverlay(doc);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const host = doc.getElementById('tiltcheck-lounge-host');
    expect(host).not.toBeNull();
    expect(host?.isConnected).toBe(true);
  });
});
