/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config.js', () => ({
  config: {
    backendUrl: 'https://api.tiltcheck.me',
    internalApiSecret: 'test-internal-secret',
  },
}));

import { bonuses } from '../../src/commands/bonuses.js';

describe('Bonuses command', () => {
  let interaction: any;
  let deferReply: any;
  let editReply: any;
  let getString: any;

  beforeEach(() => {
    deferReply = vi.fn().mockResolvedValue(undefined);
    editReply = vi.fn().mockResolvedValue(undefined);
    getString = vi.fn().mockReturnValue(null);
    interaction = {
      user: { id: 'discord-123' },
      options: { getString },
      deferReply,
      editReply,
    };
  });

  it('loads the user-scoped bonus feed and reports suppressed promos', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('https://api.tiltcheck.me/bonuses?discordId=discord-123');
      expect(init?.headers).toEqual({
        'Cache-Control': 'no-cache',
        'x-internal-secret': 'test-internal-secret',
      });
      return {
        ok: true,
        json: async () => ({
          data: [
            {
              brand: 'McLuck',
              bonus: '100% match bonus up to $500',
              url: 'https://mcluck.com/promos/claim',
              verified: '2026-04-19T12:00:00.000Z',
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

    await bonuses.execute(interaction);

    expect(deferReply).toHaveBeenCalled();
    expect(editReply).toHaveBeenCalled();
    const payload = editReply.mock.calls[0][0];
    expect(payload.embeds[0].data.description).toContain('2 hidden by your active filters.');
    expect(payload.embeds[0].data.fields[0].name).toBe('McLuck');
  });
});
