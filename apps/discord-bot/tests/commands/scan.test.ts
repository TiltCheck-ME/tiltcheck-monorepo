import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tiltcheck/suslink', () => ({
  suslink: {
    scanUrl: vi.fn().mockResolvedValue({
      url: 'https://example.com',
      riskLevel: 'safe',
      reason: 'No suspicious patterns detected',
      scannedAt: new Date('2026-01-01T00:00:00.000Z'),
    }),
  },
}));

vi.mock('@tiltcheck/discord-utils', () => ({
  isValidUrl: vi.fn((url: string) => /^https?:\/\//.test(url)),
  errorEmbed: vi.fn((title: string, description: string) => ({ title, description })),
  linkScanEmbed: vi.fn((payload: unknown) => ({ payload })),
}));

import { scan } from '../../src/commands/scan.js';
import { suslink } from '@tiltcheck/suslink';

describe('Scan Command', () => {
  let interaction: any;

  beforeEach(() => {
    interaction = {
      user: { id: 'user-1' },
      options: {
        getString: vi.fn().mockReturnValue('https://example.com'),
      },
      deferReply: vi.fn().mockResolvedValue(undefined),
      editReply: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('registers scan command with required url option', () => {
    const json = scan.data.toJSON();
    expect(json.name).toBe('scan');
    expect(json.options?.[0]?.name).toBe('url');
    expect(json.options?.[0]?.required).toBe(true);
  });

  it('returns validation error embed for invalid URL input', async () => {
    interaction.options.getString.mockReturnValue('not-a-url');
    await scan.execute(interaction);

    expect(interaction.deferReply).toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith({
      embeds: [expect.objectContaining({ title: 'Invalid URL' })],
    });
  });

  it('scans valid URL via suslink and replies with scan embed', async () => {
    await scan.execute(interaction);

    expect((suslink as any).scanUrl).toHaveBeenCalledWith('https://example.com', 'user-1');
    expect(interaction.editReply).toHaveBeenCalledWith({
      embeds: [expect.objectContaining({ payload: expect.objectContaining({ url: 'https://example.com' }) })],
    });
  });
});
