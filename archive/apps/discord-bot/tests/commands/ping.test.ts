/* Copyright (c) 2026 TiltCheck. All rights reserved. */
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
    expect(json.description).toMatch(/awake|face-down/i);
  });

  it('defer replies and edits with pong embed', async () => {
    await ping.execute(interaction);

    expect(deferReply).toHaveBeenCalledWith({ fetchReply: true });
    expect(editReply).toHaveBeenCalled();
    
    const callArg = editReply.mock.calls[0][0];
    expect(callArg.embeds).toBeDefined();
    expect(callArg.embeds[0].data.title).toBe('PONG');
    expect(callArg.embeds[0].data.description).toContain('Bot latency: 50ms');
    expect(callArg.embeds[0].data.description).toContain('WebSocket: 42ms');
  });
});
