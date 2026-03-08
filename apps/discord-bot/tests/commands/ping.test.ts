import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tiltcheck/discord-utils', () => ({
  successEmbed: vi.fn((title: string, description: string) => ({ title, description })),
}));

import { ping } from '../../src/commands/ping.js';

describe('Ping Command', () => {
  let interaction: any;
  let deferReply: any;
  let editReply: any;

  beforeEach(() => {
    deferReply = vi.fn().mockResolvedValue({
      createdTimestamp: 1050,
    });
    editReply = vi.fn().mockResolvedValue(undefined);
    interaction = {
      createdTimestamp: 1000,
      client: { ws: { ping: 42 } },
      deferReply,
      editReply,
    };
  });

  it('registers ping command metadata', () => {
    const json = ping.data.toJSON();
    expect(json.name).toBe('ping');
    expect(json.description).toMatch(/responsive/i);
  });

  it('defer replies and edits with pong embed', async () => {
    await ping.execute(interaction);

    expect(deferReply).toHaveBeenCalledWith({ fetchReply: true });
    expect(editReply).toHaveBeenCalledWith({
      embeds: [
        expect.objectContaining({
          title: '🏓 Pong!',
          description: expect.stringContaining('Bot latency: 50ms'),
        }),
      ],
    });
    expect(editReply.mock.calls[0][0].embeds[0].description).toContain('WebSocket: 42ms');
  });
});
