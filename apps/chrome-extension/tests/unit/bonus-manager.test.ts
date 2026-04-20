/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */
/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BonusManager } from '../../src/sidebar/bonuses.ts';

describe('BonusManager', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="tg-bonuses-toggle"></button>
      <button id="tg-bonuses-refresh"></button>
      <div id="tg-bonuses-body"></div>
      <div id="tg-bonuses-list"></div>
    `;
    vi.restoreAllMocks();
  });

  it('reads API data responses and shows suppression counts from the authenticated feed', async () => {
    const ui = {
      getStorage: vi.fn(async (keys: string[]) => (
        keys.includes('authToken')
          ? { authToken: 'jwt-123' }
          : {}
      )),
      setStorage: vi.fn(async () => undefined),
    };

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('https://api.tiltcheck.me/bonuses');
      expect(init?.headers).toEqual({ Authorization: 'Bearer jwt-123' });
      return {
        ok: true,
        json: async () => ({
          data: [
            {
              brand: 'McLuck',
              bonus: '100% match bonus',
              url: 'https://mcluck.com/promos/claim',
              code: 'DROP500',
            },
          ],
          suppression: {
            active: true,
            hiddenCount: 2,
          },
        }),
      } as Response;
    }) as any;

    const manager = new BonusManager(ui as any);
    await manager.loadBonuses(true);

    expect(document.getElementById('tg-bonuses-list')?.textContent).toContain('McLuck');
    expect(document.getElementById('tg-bonuses-list')?.textContent).toContain('2 hidden by your active filters.');
  });
});
